"""`k qa normalize`: apply the mechanical Bluebook text fixes (kimport.qa_normalize_text) to live,
student-visible questions IN PLACE, keeping every seal valid so each row stays served.

What covers a question's text, and what this does with it (read 2026-10-30):
- approved_tags.question_payload_sha256 (answer key evidence): catalogQuestionPayloadHash of the
  delivered payload (text, passages, choices, key, explanations, figures). The catalog lane, the
  delivery contract and the daily challenge compare it with the row. Recomputed for the changed
  row with the app's own function (ts/normalize-check.ts), as `k qa retag` does.
- numeric_answer_set.question_text_sha256 / raw_question_text_sha256: sha256 of question_text
  (raw_question_text when set). reviewedNumericAnswers throws when they differ, and the skill
  pool with it. Recomputed the same way and read back with the app's reviewedNumericAnswers.
- quiz_questions.content_hash_v2: import-core computeContentHashV2 (duplicate detection, the
  stage / publish / QA correction guards). Recomputed with the app's function, only for a row
  whose stored hash that function reproduces; the SQL refuses a hash another row holds.
- quiz_questions.comparison_key: kimport.keys.comparison_key (exact duplicates; publish refuses a
  key another non-archived row holds). Recomputed when stored; a stored key that is not the key
  of the row refuses it. A NULL key stays NULL.
- approved_tags.content_sha256 / student_content_sha256, evidence B_package_sha256 /
  B_student_sha256, D records, pilot_row_sha256: hashes of the reviewed SOURCE package, pinned
  by the frozen manifest at import. The app only checks that the stored copies agree (they still
  do); nothing recomputes them from the row. They name the source version and stay as they are;
  the change is recorded beside them (evidence text_normalizations), as label_retags records a
  retag. raw_question_text, raw_choice_text, explanations, keys and figures are never touched.
- content_hash (v1) belongs to the old (source_pdf, content_hash) import path and stays.

Per row (plan.json lists every refusal): student-visible (is_live, publish_ready*), not archived,
at most one answer key entry, every rule's words-and-numbers check holds (the words and numbers
in order are the same once the intended character swaps are set aside), the stored
comparison_key and content_hash_v2 are reproducible, the result is no new live duplicate
(kimport.bank_gate, the stage and publish gates' rule) and no hash another row holds, and the
app check passes (ts/normalize-check.ts: served now, resealed, same display).

normalize.sql (+ .dryrun.sql), in files of about 600 kB, one transaction each: a fingerprint guard
over every row this run does not change, then per row: lock it, require every guarded column,
the changed choices and the answer key evidence to equal the export, refuse a hash or key another
row holds, write. restore.sql puts every before value back, guarded on the after state.
Nothing here connects to a database (kimport.qa_run.run_normalize runs the files).
"""

import copy
import json
from collections import Counter
from pathlib import Path

from kimport import qa_normalize_text as nt
from kimport.answer_evidence import evidence_root, stable_question_id
from kimport.bank_gate import Bank
from kimport.export import FINGERPRINT_SQL, fingerprint
from kimport.keys import comparison_key, is_unkeyable
from kimport.qa_hide import FINGERPRINT_FAILED
from kimport.sqlutil import do_block, lit, uuid_literal
from kimport.sweep import PUBLISH_READY, record_from_row

TEXT = ("passage_intro", "passage", "passage_a", "passage_b", "question_text")
GUARD = ("is_live", "publish_status", "import_status", "archived_at", "content_hash_v2", "comparison_key",
         "subject", "domain", "answer_format", "correct_answer", "updated_at")
HASHES = ("content_hash_v2", "comparison_key")
TOOL = "k qa normalize"
_ROW_NOTE = "-- kimport qa normalize row "
MAX_FILE_BYTES = 600_000
IN_SCOPE_VIOLATIONS = ("en_dash", "ascii_dash_run", "spaced_em_dash", "straight_quotes", "whitespace",
                       "blank_marker_nonstandard", "notes_intro_wording", "notes_bullet_marker",
                       "thousands_comma_missing", "comma_number_in_math_spaced", "hyphen_as_minus",
                       "percent_or_dollar_spacing", "number_unit_glued", "fraction_not_typeset")


# ---------------------------------------------------------------- proposing


def _texts(row: dict):
    for f in TEXT:
        if row.get(f):
            yield f, row[f]
    for c in row.get("answer_choices") or []:
        if c.get("choice_text"):
            yield f"choice {c['letter']}", c["choice_text"]


def propose(row: dict) -> tuple[dict | None, list, str | None]:
    """(change or None, ambiguous [(rule, field, excerpt)], why refused). A change is
    {"question": {field: text}, "choices": {letter: text}, "rules": {rule: n}}."""
    question, choices, rules, unsure = {}, {}, Counter(), []
    for name, text in _texts(row):
        new, res = nt.normalize_field(text, row.get("subject"))
        unsure += [(rule, name, ex) for rule, ex in res.ambiguous]
        if new == text:
            continue
        if nt.words(new) != nt.words(text):
            return None, unsure, f"{name}: the words and numbers would change (no row is changed that way)"
        rules.update(res.counts)
        if name.startswith("choice "):
            choices[name[-1]] = new
        else:
            question[name] = new
    if not question and not choices:
        return None, unsure, None
    return {"question": question, "choices": choices, "rules": dict(sorted(rules.items()))}, unsure, None


def after_row(row: dict, change: dict) -> dict:
    return {**row, **change["question"],
            "answer_choices": [{**c, "choice_text": change["choices"].get(c["letter"], c.get("choice_text"))}
                               for c in row.get("answer_choices") or []]}


def _slim(row: dict) -> dict:
    """A full row in the slim export shape kimport.sweep.record_from_row reads."""
    return {**row, "choices": row.get("answer_choices") or [], "question_format": row.get("answer_format")}


def key_of(row: dict) -> str | None:
    s = _slim(row)
    return None if is_unkeyable(s) else comparison_key(record_from_row(s))


def visible(row: dict) -> bool:
    return row.get("is_live") is True and row.get("archived_at") is None and row.get("publish_status") in PUBLISH_READY


def _root(raw):
    return evidence_root(raw)


def history_raw(row: dict, change: dict, now: str, run: str):
    """The answer key evidence with this change recorded (seal still to compute), or None."""
    keys = row.get("answer_key_entries") or []
    if not keys:
        return None
    raw = copy.deepcopy(keys[0].get("raw_model_response"))
    root = _root(raw)
    if not isinstance(root, dict):
        return raw
    entry = {"at": now, "by": TOOL, "run": run, "rules": change["rules"],
             "fields": sorted(change["question"]) + [f"choice {x}" for x in sorted(change["choices"])],
             "previous_question_payload_sha256": (root.get("approved_tags") or {}).get("question_payload_sha256")}
    s = (raw.get("evidence") if isinstance(raw.get("evidence"), dict) else raw).get("numeric_answer_set")
    if isinstance(s, dict):
        entry["previous_numeric_answer_set"] = {k: s.get(k) for k in ("question_text_sha256", "raw_question_text_sha256")}
    root["text_normalizations"] = list(root.get("text_normalizations") or []) + [entry]
    return raw


def build_plan(rows: list[dict], doc, checker, now: str, run: str) -> dict:
    """{"items", "refused", "skipped", "ambiguous", "candidates"}. `rows`: the full live export;
    `doc`: the slim export (fingerprint guard); `checker`: ts/normalize-check.ts over the items."""
    slim = {r["id"]: r for r in doc.rows}
    refused: dict[str, str] = {}
    ambiguous: list[dict] = []
    skipped = Counter()
    cand = []
    for row in sorted(rows, key=lambda r: r["id"]):
        if not visible(row):
            skipped["not student-visible (hidden, held or archived)"] += 1
            continue
        change, unsure, why = propose(row)
        ambiguous += [{"id": row["id"], "rule": r, "field": f, "excerpt": e} for r, f, e in unsure]
        if why:
            refused[row["id"]] = why
        elif change:
            cand.append((row, change))
    items = []
    for row, change in cand:
        rid = row["id"]
        s = slim.get(rid)
        if not s or any(s.get(c) != row.get(c) for c in ("content_hash_v2", "publish_status", "comparison_key")):
            refused[rid] = "the row differs between the two exports (changed meanwhile); run again"
            continue
        if len(row.get("answer_key_entries") or []) > 1:
            refused[rid] = "more than one answer key entry"
            continue
        stored = row.get("comparison_key")
        if stored is not None and key_of(row) != stored:
            refused[rid] = "the stored comparison_key is not the key of this row (kimport.keys)"
            continue
        after = after_row(row, change)
        items.append({"id": rid, "stable_question_id": stable_question_id(
            ((row.get("answer_key_entries") or [{}])[0]).get("raw_model_response")), "row": row,
            "change": change, "after": after, "key_after": key_of(after) if stored is not None else None,
            "raw_after": history_raw(row, change, now, run)})
    items = _no_new_duplicates(items, rows, refused)
    checked = {c["id"]: c for c in checker(items)["rows"]} if items else {}
    ok = []
    for it in items:
        c = checked.get(it["id"]) or {"ok": False, "error": "no check result"}
        if not c["ok"]:
            refused[it["id"]] = f"app check: {c['error']}"
            continue
        ok.append({**it, "raw_after": c["raw_after"], "seal_before": c["seal_before"], "seal_after": c["seal_after"],
                   "hash_after": c["content_hash_v2_after"], "served": c.get("served")})
    ok = _no_hash_collisions(ok, slim, refused)
    return {"items": ok, "refused": dict(sorted(refused.items())), "skipped": dict(skipped),
            "ambiguous": ambiguous, "candidates": len(cand)}


def _no_new_duplicates(items: list[dict], rows: list[dict], refused: dict) -> list[dict]:
    """Refuse a row that would be the same question as a live row it is not the same as now
    (kimport.bank_gate, against the live bank before and after every change of this run)."""
    if not items:
        return items
    changed = {it["id"]: it["after"] for it in items}
    before = Bank(rows)
    after = Bank([changed.get(r["id"], r) for r in rows])
    out = []
    for it in items:
        was = before.findings(it["row"])
        now = after.findings(it["after"])
        new = {c: [d for d in v if d not in was.get(c, [])] for c, v in now.items()}
        new = {c: v for c, v in new.items() if v}
        if new:
            refused[it["id"]] = "qa gate: " + "; ".join(f"{c}: {'; '.join(v)}" for c, v in sorted(new.items()))[:300]
        else:
            out.append(it)
    return out


def _no_hash_collisions(items: list[dict], slim: dict, refused: dict) -> list[dict]:
    mine = {it["id"] for it in items}
    for col, new in (("content_hash_v2", "hash_after"), ("comparison_key", "key_after")):
        taken = Counter(r.get(col) for i, r in slim.items() if i not in mine and r.get(col) is not None
                        and (col == "content_hash_v2" or r.get("archived_at") is None))
        taken.update(it[new] for it in items if it[new] is not None)
        for it in items:
            v = it[new]
            if v is not None and v != it["row"].get(col) and taken[v] > 1 and it["id"] not in refused:
                refused[it["id"]] = f"the new {col} is held by another row (a duplicate)"
    return [it for it in items if it["id"] not in refused]


# ---------------------------------------------------------------- SQL


def _cols(it: dict, after: bool) -> dict:
    """The quiz_questions columns this run writes, before or after."""
    q = it["after"] if after else it["row"]
    out = {f: q.get(f) for f in sorted(it["change"]["question"])}
    out["content_hash_v2"] = it["hash_after"] if after else it["row"].get("content_hash_v2")
    out["comparison_key"] = it["key_after"] if after else it["row"].get("comparison_key")
    return out


def _choices(it: dict, after: bool) -> dict:
    src = it["after"] if after else it["row"]
    return {c["letter"]: c.get("choice_text") for c in src.get("answer_choices") or [] if c["letter"] in it["change"]["choices"]}


def _raw(it: dict, after: bool):
    keys = it["row"].get("answer_key_entries") or []
    if not keys:
        return None
    return it["raw_after"] if after else keys[0].get("raw_model_response")


def _guard(col: str, v) -> str:
    if v is None:
        return f"q.{col} IS NOT NULL"
    if isinstance(v, bool):
        return f"q.{col} IS DISTINCT FROM {'true' if v else 'false'}"
    cast = "::timestamptz" if col in ("updated_at", "archived_at") else ""
    return f"q.{col} IS DISTINCT FROM {lit(v)}{cast}"


def _row_block(tag: str, it: dict, undo: bool) -> list[str]:
    qid = uuid_literal(it["id"])
    expect_cols = {**{c: it["row"].get(c) for c in GUARD}, **_cols(it, after=undo)}
    put_cols = _cols(it, after=not undo)
    expect_choices, put_choices = _choices(it, after=undo), _choices(it, after=not undo)
    expect_raw, put_raw = _raw(it, after=undo), _raw(it, after=not undo)
    n_choices = len(it["row"].get("answer_choices") or [])
    guard = [_guard(c, v) for c, v in expect_cols.items()]
    guard.append(f"(SELECT count(*) FROM public.answer_choices c WHERE c.question_id = q.id) <> {n_choices}")
    guard += [f"(SELECT c.choice_text FROM public.answer_choices c WHERE c.question_id = q.id AND c.letter = {lit(x)})"
              f" IS DISTINCT FROM {lit(t)}" for x, t in sorted(expect_choices.items())]
    body = ["DECLARE q public.quiz_questions%rowtype; n int;", "BEGIN",
            f" SELECT * INTO STRICT q FROM public.quiz_questions WHERE id = '{qid}'::uuid FOR UPDATE;",
            " IF " + "\n   OR ".join(guard),
            " THEN RAISE EXCEPTION 'question changed since the export: %', q.id; END IF;"]
    if expect_raw is not None:
        body += [" SELECT count(*) INTO n FROM public.answer_key_entries WHERE question_id = q.id;",
                 " IF n <> 1 OR NOT EXISTS (SELECT 1 FROM public.answer_key_entries WHERE question_id = q.id"
                 f" AND raw_model_response = {lit(json.dumps(expect_raw, ensure_ascii=False))}::jsonb)",
                 " THEN RAISE EXCEPTION 'answer key evidence changed since the export: %', q.id; END IF;"]
    if not undo:
        if put_cols["content_hash_v2"] != expect_cols["content_hash_v2"]:
            body.append(f" IF EXISTS (SELECT 1 FROM public.quiz_questions o WHERE o.id <> q.id AND o.content_hash_v2 ="
                        f" {lit(put_cols['content_hash_v2'])}) THEN RAISE EXCEPTION"
                        " 'content_hash_v2 already in the bank: %', q.id; END IF;")
        if put_cols["comparison_key"] is not None and put_cols["comparison_key"] != expect_cols["comparison_key"]:
            body.append(f" IF EXISTS (SELECT 1 FROM public.quiz_questions o WHERE o.id <> q.id AND o.archived_at IS NULL"
                        f" AND o.comparison_key = {lit(put_cols['comparison_key'])}) THEN RAISE EXCEPTION"
                        " 'comparison_key already in the bank: %', q.id; END IF;")
    sets = ", ".join(f"{c} = {lit(v)}" for c, v in put_cols.items())
    body.append(f" UPDATE public.quiz_questions SET {sets} WHERE id = q.id;")
    for x, t in sorted(put_choices.items()):
        body += [f" UPDATE public.answer_choices SET choice_text = {lit(t)} WHERE question_id = q.id AND letter = {lit(x)};",
                 " GET DIAGNOSTICS n = ROW_COUNT;",
                 f" IF n <> 1 THEN RAISE EXCEPTION 'choice {x} update count: %', q.id; END IF;"]
    if put_raw is not None:
        body.append(f" UPDATE public.answer_key_entries SET raw_model_response = "
                    f"{lit(json.dumps(put_raw, ensure_ascii=False))}::jsonb WHERE question_id = q.id;")
    note = json.dumps({"id": it["id"], "rules": it["change"]["rules"], "set": sorted(put_cols) +
                       [f"choice {x}" for x in sorted(put_choices)]}, sort_keys=True)
    return [_ROW_NOTE + note] + do_block(tag, body)


def _fingerprint_block(tag: str, doc, ids: list[str]) -> list[str]:
    """The export fingerprint over every row this run does not touch (its own rows are guarded
    one by one), so each file holds whether or not the files before it ran."""
    skip = set(ids)
    arr = ",".join(f"'{uuid_literal(i)}'" for i in sorted(skip)) or "NULL"
    return do_block(tag, [
        "DECLARE n bigint; f text;",
        "BEGIN",
        " SELECT count(*) INTO n FROM public.quiz_questions;",
        f" SELECT {FINGERPRINT_SQL} INTO f FROM public.quiz_questions q WHERE q.id <> ALL (ARRAY[{arr}]::uuid[]);",
        f" IF n <> {int(doc.row_count)} OR f IS DISTINCT FROM {lit(fingerprint([r for r in doc.rows if r['id'] not in skip]))}",
        f" THEN RAISE EXCEPTION {lit(FINGERPRINT_FAILED)}; END IF;",
    ])


def _files(title: str, items: list[dict], doc, undo: bool, max_bytes: int) -> list[str]:
    slug = "normalize_undo" if undo else "normalize"
    rendered = [_row_block(f"kimport_qa_{slug}_{n:04d}", it, undo) for n, it in enumerate(items, 1)]
    ids = [it["id"] for it in items]
    head_size = 0 if doc is None else len(ids) * 41 + 2000
    chunks, cur, size = [], [], head_size
    for r in rendered:
        n = sum(len(x) + 1 for x in r)
        if cur and size + n > max_bytes:
            chunks.append(cur)
            cur, size = [], head_size
        cur.append(r)
        size += n
    chunks.append(cur)
    files = []
    for k, chunk in enumerate(chunks, 1):
        out = [f"-- kimport qa normalize: {title} (file {k} of {len(chunks)}, {len(chunk)} of {len(items)} rows). "
               "Text formatting only; words, numbers, keys and figures do not change.",
               "-- One transaction: any failed guard stops every row of this file. Run the .dryrun.sql twin first.",
               "BEGIN;", ""]
        if doc is not None:
            out.append(f"-- export {doc.exported_at}: {doc.row_count} rows; fingerprint of the rows this run leaves alone")
            out += _fingerprint_block(f"kimport_qa_{slug}_fingerprint_{k:02d}", doc, ids)
        for r in chunk:
            out += r
        files.append("\n".join(out + ["COMMIT;", ""]))
    return files


def normalize_sql(items: list[dict], doc, max_bytes: int = MAX_FILE_BYTES) -> list[str]:
    return _files("Bluebook text fixes", items, doc, False, max_bytes)


def restore_sql(items: list[dict], max_bytes: int = MAX_FILE_BYTES) -> list[str]:
    """Every before value back (text, choices, hashes, evidence), guarded on the after state."""
    return _files("undo the text fixes (put every field back exactly)", items, None, True, max_bytes)


def readback_sql(ids: list[str]) -> str:
    arr = ",".join(f"'{uuid_literal(i)}'" for i in sorted(ids)) or "NULL"
    cols = ", ".join(f"'{c}', q.{c}" for c in (*TEXT, *HASHES))
    return ("-- kimport qa normalize readback. Read-only.\n"
            f"SELECT coalesce(jsonb_agg(jsonb_build_object('id', q.id, {cols}, 'choices', (SELECT jsonb_object_agg("
            "c.letter, c.choice_text) FROM public.answer_choices c WHERE c.question_id = q.id), 'raw_model_response',"
            " (SELECT k.raw_model_response FROM public.answer_key_entries k WHERE k.question_id = q.id LIMIT 1))"
            f" ORDER BY q.id), '[]'::jsonb) AS rows FROM public.quiz_questions q WHERE q.id = ANY (ARRAY[{arr}]::uuid[]);\n")


def expected(items: list[dict], after: bool) -> dict[str, dict]:
    """{id: columns} the readback should show after (or before) the write."""
    out = {}
    for it in items:
        q = it["after"] if after else it["row"]
        cols = {c: q.get(c) for c in TEXT}
        cols.update({c: v for c, v in _cols(it, after).items() if c in HASHES})
        cols["choices"] = {c["letter"]: c.get("choice_text") for c in q.get("answer_choices") or []} or None
        cols["raw_model_response"] = _raw(it, after)
        out[it["id"]] = cols
    return out


# ---------------------------------------------------------------- plan.json


def out_of_scope(violations: Path | None) -> dict:
    """Counts from the style audit (violations.json) of the rules this tool does not apply."""
    if not violations or not Path(violations).exists():
        return {}
    data = json.loads(Path(violations).read_text(encoding="utf-8"))
    return {k: {"count": v.get("count"), "mechanical": v.get("mechanical")}
            for k, v in sorted(data.items()) if k not in IN_SCOPE_VIOLATIONS}


def _excerpts(before: str, after: str) -> list[list[str]]:
    import difflib
    out = []
    for op, a, b, c, d in difflib.SequenceMatcher(None, before or "", after or "", autojunk=False).get_opcodes():
        if op != "equal":
            out.append([before[max(0, a - 20):b + 20], after[max(0, c - 20):d + 20]])
    return out[:6]


def plan_doc(plan: dict, summary: dict, violations: Path | None = None) -> dict:
    items = plan["items"]
    rows_by_rule, occ = Counter(), Counter()
    for it in items:
        for rule, n in it["change"]["rules"].items():
            rows_by_rule[rule] += 1
            occ[rule] += n
    amb = {}
    for a in plan["ambiguous"]:
        e = amb.setdefault(a["rule"], {"rows": set(), "places": 0, "examples": []})
        e["rows"].add(a["id"])
        e["places"] += 1
        if len(e["examples"]) < 15:
            e["examples"].append(a)
    def group(why: str) -> str:
        for head in ("app check: ", "qa gate: "):
            if why.startswith(head):
                return head + why[len(head):].split(":")[0]
        return why.split(": ", 1)[-1] if why.startswith(("question_text", "passage", "choice")) else why
    groups = Counter(group(why) for why in plan["refused"].values())
    return {**summary,
            "per_rule": {r: {"rows": rows_by_rule[r], "changes": occ[r]} for r in nt.RULES},
            "refused_by_reason": dict(groups.most_common()),
            "skipped": plan["skipped"],
            "ambiguous_left_as_is": {r: {"rows": len(e["rows"]), "places": e["places"], "examples": e["examples"]}
                                     for r, e in sorted(amb.items())},
            "out_of_scope_counts": out_of_scope(violations),
            "refused_rows": plan["refused"],
            "rows": [{"id": it["id"], "stable_question_id": it["stable_question_id"], "rules": it["change"]["rules"],
                      "served": it.get("served"), "seal_before": it["seal_before"], "seal_after": it["seal_after"],
                      "content_hash_v2": [it["row"].get("content_hash_v2"), it["hash_after"]],
                      "comparison_key": [it["row"].get("comparison_key"), it["key_after"]],
                      "changes": {**{f: _excerpts(it["row"].get(f), t) for f, t in it["change"]["question"].items()},
                                  **{f"choice {x}": _excerpts(next(c.get("choice_text") for c in it["row"]["answer_choices"]
                                                                  if c["letter"] == x), t)
                                     for x, t in it["change"]["choices"].items()}}}
                     for it in items]}
