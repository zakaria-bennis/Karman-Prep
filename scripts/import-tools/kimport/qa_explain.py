"""`k qa explain`: replace explanation_text (and, when a line gives it, explanation_per_choice) on
LIVE questions in place, resealed, so every row stays live and served throughout (no hide).
`k qa explain-check` runs the same checks and writes no SQL (for the writers).

Input: JSON lines, one per question:
  {question_id, stable_question_id, explanation_text, explanation_sha256_before,
   explanation_per_choice: {letter: text} (optional)}
explanation_sha256_before is kimport.explanation_rules.sha256_text of the row's explanation_text
when the line was written (null when the row had none).

What covers an explanation (read 2026-11-08 on the live branch):
- approved_tags.question_payload_sha256 (answer key evidence): catalogQuestionPayloadHash covers
  explanation_text and explanation_per_choice, so the seal is recomputed with the app's own
  function (ts/explain-check.ts) and stored in the same statement as the text.
- content_hash_v2 (computeContentHashV2), comparison_key (kimport.keys) and the numeric answer set
  hashes (question text) do not cover explanations; they are guarded unchanged, and the app check
  confirms content_hash_v2 and the reviewed numeric answers stay the same.
- Saved practice sessions: a session whose questions are resealed fails its re-check. Since PR
  #244 (deployed) the open session is closed (scored when every answer was saved) and a fresh one
  starts; completed sessions show their frozen snapshot. So a student loses at most the unsaved
  part of one open session per run that touches it: run the chunks of a run back to back, and
  prefer few large runs to many small ones.

A line is refused (plan.json, nothing written for it) when: it is malformed; the text fails
kimport.explanation_rules (or the app's KaTeX / screen split / grader in ts/explain-check.ts);
several lines name one question; the row is not in the export, not live or archived; it has more
than one answer key entry or another stable id; explanation_sha256_before is not the row's
explanation now; the two exports disagree on the row; the app check refuses (the row is not
served as it is now, the reseal does not read back, the catalog lane would read it differently).
A line whose text the row already carries is skipped as unchanged, so the same file can be run
again after a partial run. --batch N takes the first N changeable rows (by id); the rest are
listed as deferred for the next run.

explain.sql (+ .dryrun.sql), in files of about --max-file-kb, one transaction each: the export
fingerprint guard (it does not cover explanations, so it holds in every file), then per row: lock
it, require every guarded column, explanation_text, explanation_per_choice and the answer key
evidence to equal the export, set explanation_text (and explanation_per_choice when given) and the
resealed evidence. Nothing else on the row changes. restore.sql puts every before value back,
guarded on the after state. Nothing here connects to a database (kimport.qa_run runs the files).
"""

import copy
import json
from collections import Counter

from kimport import explanation_rules as er
from kimport.answer_evidence import evidence_root, stable_question_id
from kimport.qa_hide import _fingerprint_block
from kimport.sqlutil import do_block, lit, uuid_literal

TOOL = "k qa explain"
GUARD = ("is_live", "publish_status", "import_status", "archived_at", "content_hash_v2", "comparison_key",
         "subject", "domain", "answer_format", "correct_answer", "updated_at")
_ROW_NOTE = "-- kimport qa explain row "
MAX_FILE_BYTES = 600_000
_KNOWN = {"question_id", "stable_question_id", "explanation_text", "explanation_sha256_before",
          "explanation_per_choice", "_line"}


def canonical(v) -> str:
    return json.dumps(v, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


# ---------------------------------------------------------------- lines


def read_lines(path) -> list[dict]:
    from kimport.figure_publish import read_lines as read
    return read(path)


def line_problems(d: dict) -> list[str]:
    """Shape and text rules of one line, without its row."""
    try:
        uuid_literal(d.get("question_id"))
    except (ValueError, TypeError):
        return ["question_id is not a lowercase uuid"]
    if not isinstance(d.get("stable_question_id"), str) or not d["stable_question_id"].strip():
        return ["stable_question_id missing"]
    before = d.get("explanation_sha256_before", "missing")
    if before == "missing":
        return ["explanation_sha256_before missing (null when the row had no explanation)"]
    if before is not None and not (isinstance(before, str) and len(before) == 64
                                   and all(ch in "0123456789abcdef" for ch in before)):
        return ["explanation_sha256_before must be a lowercase sha256 hex or null"]
    extra = sorted(set(d) - _KNOWN)
    if extra:
        return [f"unknown field {extra[0]!r}"]
    if "explanation_per_choice" in d and d["explanation_per_choice"] is None:
        return ["explanation_per_choice is null (omit it to keep the row's)"]
    return er.text_problems(d.get("explanation_text"))


def resolve(lines: list[dict]) -> tuple[dict, dict]:
    """({question id: line}, {key: why refused})."""
    refused: dict[str, str] = {}
    by_id: dict[str, list[dict]] = {}
    for d in lines:
        why = line_problems(d)
        key = d.get("question_id") if isinstance(d.get("question_id"), str) else f"line {d['_line']}"
        if why:
            refused.setdefault(key, f"line {d['_line']}: " + "; ".join(why))
        else:
            by_id.setdefault(d["question_id"], []).append(d)
    out = {}
    for qid, group in by_id.items():
        if len(group) > 1:
            refused[qid] = f"{len(group)} lines for one question (lines {', '.join(str(d['_line']) for d in group)})"
        elif qid not in refused:
            out[qid] = group[0]
    return out, refused


# ---------------------------------------------------------------- plan


def row_problems(d: dict, row: dict | None, slim: dict | None) -> list[str]:
    if row is None:
        return ["not in the live export (not live)"]
    if not (row.get("is_live") is True and row.get("archived_at") is None):
        return ["not live"]
    if slim is None or any(slim.get(c) != row.get(c) for c in ("content_hash_v2", "publish_status", "comparison_key")):
        return ["the row differs between the two exports (changed meanwhile); run again"]
    keys = row.get("answer_key_entries") or []
    if len(keys) > 1:
        return [f"{len(keys)} answer key entries (expected at most one)"]
    sid = stable_question_id(keys[0].get("raw_model_response")) if keys else None
    if sid is not None and sid != d["stable_question_id"]:
        return [f"stable id {d['stable_question_id']} is not the row's {sid}"]
    now = er.sha256_text(row.get("explanation_text"))
    before = d["explanation_sha256_before"]
    if before != now and not (before == er.sha256_text("") and row.get("explanation_text") is None):
        return ["explanation_sha256_before is not the row's explanation now (it changed since the line was written)"]
    out = []
    if "explanation_per_choice" in d:
        letters = {c.get("letter") for c in row.get("answer_choices") or []}
        if row.get("answer_format") == "numeric_entry" or not letters:
            return ["explanation_per_choice given for a question without answer choices"]
        out += er.per_choice_problems(d["explanation_per_choice"], letters)
    problems, _ = er.answer_problems(d["explanation_text"], row)
    return out + problems


def unchanged(d: dict, row: dict) -> bool:
    if d["explanation_text"] != row.get("explanation_text"):
        return False
    return "explanation_per_choice" not in d or canonical(d["explanation_per_choice"]) == canonical(
        row.get("explanation_per_choice"))


def history_raw(row: dict, d: dict, now: str, run: str):
    """The answer key evidence with this replacement recorded (seal still to compute), or None."""
    keys = row.get("answer_key_entries") or []
    if not keys:
        return None
    raw = copy.deepcopy(keys[0].get("raw_model_response"))
    root = evidence_root(raw)
    if not isinstance(root, dict):
        return raw
    entry = {"at": now, "by": TOOL, "run": run,
             "set": ["explanation_text"] + (["explanation_per_choice"] if "explanation_per_choice" in d else []),
             "previous_explanation_sha256": er.sha256_text(row.get("explanation_text")),
             "explanation_sha256": er.sha256_text(d["explanation_text"]),
             "previous_question_payload_sha256": (root.get("approved_tags") or {}).get("question_payload_sha256")}
    if "explanation_per_choice" in d:
        entry["previous_explanation_per_choice_sha256"] = er.sha256_text(canonical(row.get("explanation_per_choice")))
    root["explanation_replacements"] = list(root.get("explanation_replacements") or []) + [entry]
    return raw


def build_plan(lines: list[dict], rows: dict[str, dict], slim: dict[str, dict], checker, now: str, run: str,
               batch: int | None = None) -> dict:
    """{"items", "refused", "unchanged", "deferred", "lines"}. `rows`: the full live export by id;
    `slim`: the fingerprint export by id; `checker(items)`: ts/explain-check.ts over the items."""
    decided, refused = resolve(lines)
    items, same = [], []
    for qid, d in sorted(decided.items()):
        row = rows.get(qid)
        if row is not None and row.get("is_live") is True and unchanged(d, row):
            same.append(qid)
            continue
        why = row_problems(d, row, slim.get(qid))
        if why:
            refused[qid] = "; ".join(why)
            continue
        _, stated = er.answer_problems(d["explanation_text"], row)
        items.append({"id": qid, "stable_question_id": d["stable_question_id"], "row": row, "line": d,
                      "explanation_text": d["explanation_text"], "set_per_choice": "explanation_per_choice" in d,
                      "explanation_per_choice": d.get("explanation_per_choice", row.get("explanation_per_choice")),
                      "stated": stated, "raw_after": history_raw(row, d, now, run)})
    checked = {c["id"]: c for c in checker(items)["rows"]} if items else {}
    out = []
    for it in items:
        c = checked.get(it["id"]) or {"ok": False, "error": "no check result"}
        if not c["ok"]:
            refused[it["id"]] = f"app check: {c['error']}"
            continue
        out.append({**it, "raw_after": c["raw_after"], "seal_before": c["seal_before"], "seal_after": c["seal_after"],
                    "served": c.get("served")})
    deferred = []
    if batch is not None and batch >= 0 and len(out) > batch:
        out, deferred = out[:batch], [it["id"] for it in out[batch:]]
    return {"items": out, "refused": dict(sorted(refused.items())), "unchanged": sorted(same),
            "deferred": deferred, "lines": len(lines)}


# ---------------------------------------------------------------- SQL


def _j(v) -> str:
    return "NULL" if v is None else f"{lit(canonical(v))}::jsonb"


def _guard(col: str, v) -> str:
    if v is None:
        return f"q.{col} IS NOT NULL"
    if isinstance(v, bool):
        return f"q.{col} IS DISTINCT FROM {'true' if v else 'false'}"
    cast = "::timestamptz" if col in ("updated_at", "archived_at") else ""
    return f"q.{col} IS DISTINCT FROM {lit(v)}{cast}"


def _jguard(expr: str, v) -> str:
    """`expr` differs from v (None: a SQL NULL or a stored JSON null, which the export reads alike)."""
    if v is None:
        return f"coalesce({expr} <> 'null'::jsonb, false)"
    return f"{expr} IS DISTINCT FROM {_j(v)}"


def _state(it: dict, after: bool) -> tuple:
    """(explanation_text, explanation_per_choice, evidence) before or after."""
    row = it["row"]
    keys = row.get("answer_key_entries") or []
    raw = (it["raw_after"] if after else keys[0].get("raw_model_response")) if keys else None
    if after:
        return it["explanation_text"], it["explanation_per_choice"], raw
    return row.get("explanation_text"), row.get("explanation_per_choice"), raw


def _row_block(tag: str, it: dict, undo: bool) -> list[str]:
    row, qid = it["row"], uuid_literal(it["id"])
    e_text, e_epc, e_raw = _state(it, after=undo)
    p_text, p_epc, p_raw = _state(it, after=not undo)
    guard = [_guard(c, row.get(c)) for c in GUARD if not (undo and c == "updated_at")]
    guard.append(f"q.explanation_text IS NOT NULL" if e_text is None else
                 f"q.explanation_text IS DISTINCT FROM {lit(e_text)}")
    guard.append(_jguard("q.explanation_per_choice", e_epc))
    body = ["DECLARE q public.quiz_questions%rowtype; n int;", "BEGIN",
            f" SELECT * INTO STRICT q FROM public.quiz_questions WHERE id = '{qid}'::uuid FOR UPDATE;",
            " IF " + "\n   OR ".join(guard),
            " THEN RAISE EXCEPTION 'question changed since the export: %', q.id; END IF;"]
    if e_raw is not None:
        body += [" SELECT count(*) INTO n FROM public.answer_key_entries WHERE question_id = q.id;",
                 " IF n <> 1 OR NOT EXISTS (SELECT 1 FROM public.answer_key_entries WHERE question_id = q.id"
                 f" AND raw_model_response = {_j(e_raw)})",
                 " THEN RAISE EXCEPTION 'answer key evidence changed since the export: %', q.id; END IF;"]
    sets = f"explanation_text = {lit(p_text)}"
    if it["set_per_choice"]:
        sets += f", explanation_per_choice = {_j(p_epc)}"
    body += [f" UPDATE public.quiz_questions SET {sets} WHERE id = q.id;",
             " GET DIAGNOSTICS n = ROW_COUNT;",
             " IF n <> 1 THEN RAISE EXCEPTION 'question update count: %', q.id; END IF;"]
    if p_raw is not None:
        body += [f" UPDATE public.answer_key_entries SET raw_model_response = {_j(p_raw)} WHERE question_id = q.id;",
                 " GET DIAGNOSTICS n = ROW_COUNT;",
                 " IF n <> 1 THEN RAISE EXCEPTION 'answer key update count: %', q.id; END IF;"]
    note = json.dumps({"id": it["id"], "stable_question_id": it["stable_question_id"],
                       "set": ["explanation_text"] + (["explanation_per_choice"] if it["set_per_choice"] else [])},
                      sort_keys=True)
    return [_ROW_NOTE + note] + do_block(tag, body)


def _files(title: str, items: list[dict], doc, undo: bool, max_bytes: int) -> list[str]:
    slug = "explain_undo" if undo else "explain"
    rendered = [_row_block(f"kimport_qa_{slug}_{n:05d}", it, undo) for n, it in enumerate(items, 1)]
    chunks, cur, size = [], [], 0
    for r in rendered:
        n = sum(len(x.encode("utf-8")) + 1 for x in r)
        if cur and size + n > max_bytes:
            chunks.append(cur)
            cur, size = [], 0
        cur.append(r)
        size += n
    chunks.append(cur)
    files = []
    for k, chunk in enumerate(chunks, 1):
        out = [f"-- kimport qa explain: {title} (file {k} of {len(chunks)}, {len(chunk)} of {len(items)} rows). "
               "explanation_text (explanation_per_choice when given) and the payload seal only; the rows stay live.",
               "-- One transaction: any failed guard stops every row of this file. Run the .dryrun.sql twin first.",
               "BEGIN;", ""]
        if doc is not None:
            out.append(f"-- export {doc.exported_at}: {doc.row_count} rows, fingerprint {doc.fingerprint}")
            out += _fingerprint_block(f"kimport_qa_{slug}_fingerprint_{k:03d}", doc)
        for r in chunk:
            out += r
        files.append("\n".join(out + ["COMMIT;", ""]))
    return files


def explain_sql(items: list[dict], doc, max_bytes: int = MAX_FILE_BYTES) -> list[str]:
    return _files("step-by-step explanations on live questions", items, doc, False, max_bytes)


def restore_sql(items: list[dict], max_bytes: int = MAX_FILE_BYTES) -> list[str]:
    """Every before value back (explanation_text, explanation_per_choice, evidence), guarded on the after state."""
    return _files("undo (put the explanations and the evidence back exactly)", items, None, True, max_bytes)


def readback_sql(ids: list[str]) -> str:
    arr = ",".join(f"'{uuid_literal(i)}'" for i in sorted(ids)) or "NULL"
    return ("-- kimport qa explain readback. Read-only.\n"
            "SELECT coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'explanation_text', q.explanation_text,"
            " 'explanation_per_choice', q.explanation_per_choice, 'is_live', q.is_live, 'raw_model_response',"
            " (SELECT k.raw_model_response FROM public.answer_key_entries k WHERE k.question_id = q.id LIMIT 1))"
            f" ORDER BY q.id), '[]'::jsonb) AS rows FROM public.quiz_questions q WHERE q.id = ANY (ARRAY[{arr}]::uuid[]);\n")


def expected(items: list[dict], after: bool) -> dict[str, dict]:
    """{id: columns} the readback should show after (or before) the write."""
    out = {}
    for it in items:
        text, epc, raw = _state(it, after)
        out[it["id"]] = {"explanation_text": text, "explanation_per_choice": epc, "is_live": True,
                         "raw_model_response": raw}
    return out


# ---------------------------------------------------------------- plan.json


def plan_doc(plan: dict, summary: dict) -> dict:
    def group(why: str) -> str:
        why = why.split(": ", 1)[1] if why.startswith("line ") else why
        if why.startswith("app check: "):
            return "app check: " + why[len("app check: "):].split(":")[0].split(" (")[0]
        return why.split("; ")[0].split(" (")[0]
    items = plan["items"]
    return {**summary,
            "refused_by_reason": dict(Counter(group(w) for w in plan["refused"].values()).most_common()),
            "refused_rows": plan["refused"], "unchanged_rows": plan["unchanged"], "deferred_rows": plan["deferred"],
            "rows": [{"id": it["id"], "stable_question_id": it["stable_question_id"], "served": it.get("served"),
                      "seal_before": it["seal_before"], "seal_after": it["seal_after"],
                      "chars": len(it["explanation_text"]), "per_choice": it["set_per_choice"],
                      "stated": it["stated"]} for it in items]}
