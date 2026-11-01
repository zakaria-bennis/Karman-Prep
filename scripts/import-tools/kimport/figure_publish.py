"""`k figures publish-specs`: put new figures (FigureSpecs) on LIVE questions in place, keeping
every seal valid so each row stays served. `k figures convert-live` writes its input for the
live tables and charts (kimport.figure_live).

Input: JSON lines, one per question:
  {question_id, stable_question_id, kind: "figure" | "table" | "chart",
   figure_spec: <FigureSpec | ordered list of FigureSpecs | null>,
   choice_specs: {letter: FigureSpec} (optional),
   transcribed_labels: [text, ...] (for a list: one such list per figure),
   choice_labels: {letter: [text, ...]},
   check_ok: true,
   visual_verdict_path: <visual-verdict.json>  |  visual_verdict: "mechanical"}

A line goes live only when (founder, 2026-11-01; kimport.figure_gate has his words):
- (a) the engine's checks pass with no issues: scripts/figures/check-spec.ts runs again here on
  every figure of the line (each figure of a list on its own), whatever the line's check_ok says;
  the sampled specs it returns are what is stored;
- (b) its visual verdict says "match" and was taken on exactly these specs (figure_sha256 =
  figure_gate.spec_sha256 of the line's figure_spec and choice_specs) for this question
  (figure_gate.verdict_problems); or, for kind table or chart only, it is "mechanical": the
  specs must then equal the engine's own conversion of the row's live figure_table_data,
  figure_chart_data and choice_table_data (tableDataToSpec, chartDataToSpec), which is what
  students already see drawn;
- (c) the row is live (is_live, not archived), its evidence is served as it is now, and after
  the change the app's own code (ts/figure-seal-check.ts) reseals it, reads it the same way and
  finds nothing new; the student screen draws the new spec (ts/figure-engine-tool.ts draws).

What changes: quiz_questions.figure_spec, the named answer_choices.choice_figure_spec, and the
answer key evidence (approved_tags.question_payload_sha256, the catalog payload seal: figure_spec
is in the payload, choice_figure_spec in the choice mapping only when set; and a history entry
under figure_spec_publications). Nothing else: the older figure fields (figure_kind,
figure_table_data, figure_chart_data, figure_geometry_data, figure_svg, image_url,
choice_table_data) are guarded unchanged, so undoing it means clearing figure_spec again
(restore.sql puts every before value back). content_hash_v2, comparison_key and the numeric
answer set hashes do not cover figure_spec and stay as they are.

Refused (plan.json, nothing written for that question): a malformed line, check_ok not true,
any check-spec issue, a verdict that is missing, not "match", for another question or other
specs, "mechanical" for a figure kind or for specs that are not the conversion of the live data,
a row that is not live or not in the export, a stable id that is not the row's, a choice letter
the row lacks, several lines for one question, more than one answer key entry, a spec the screen
would not draw, and any refusal of the app check. A line whose specs the row already carries is
skipped (nothing to change).
"""

import copy
import hashlib
import json
from pathlib import Path

from kimport import figure_gate as fg
from kimport.answer_evidence import evidence_root, stable_question_id
from kimport.qa_hide import _fingerprint_block
from kimport.sqlutil import do_block, lit, uuid_literal

TOOL = "k figures publish-specs"
KINDS = ("figure", "table", "chart")
MECHANICAL = "mechanical"
MECHANICAL_KINDS = ("table", "chart")
LETTERS = ("A", "B", "C", "D")
GUARD = ("is_live", "publish_status", "import_status", "archived_at", "content_hash_v2", "comparison_key",
         "subject", "answer_format", "correct_answer", "figure_kind", "figure_svg", "image_url",
         "image_storage_path", "updated_at")
LEGACY_JSON = ("figure_table_data", "figure_chart_data", "figure_geometry_data")
_ROW_NOTE = "-- kimport figures publish-specs row "
MAX_FILE_BYTES = 600_000
_EMPTY = (None, "", [], {})


# ---------------------------------------------------------------- lines


def read_lines(path: Path) -> list[dict]:
    out = []
    for n, raw in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip():
            continue
        try:
            line = json.loads(raw)
        except ValueError:
            raise ValueError(f"{path}:{n}: not a JSON line") from None
        if not isinstance(line, dict):
            raise ValueError(f"{path}:{n}: not an object")
        out.append({**line, "_line": n})
    return out


def figures_of(spec) -> list:
    """The figures of a figure_spec: [] for none, [spec] for one, the list for an ordered list."""
    if spec in _EMPTY:
        return []
    return list(spec) if isinstance(spec, list) else [spec]


def _labels_ok(v) -> bool:
    return isinstance(v, list) and all(isinstance(t, str) for t in v)


def line_problem(d: dict) -> str | None:
    try:
        uuid_literal(d.get("question_id"))
    except (ValueError, TypeError):
        return "question_id is not a uuid"
    if not isinstance(d.get("stable_question_id"), str) or not d["stable_question_id"].strip():
        return "stable_question_id missing"
    if d.get("check_ok") is not True:
        return "check_ok is not true (its check-spec run was not clean)"
    kind = d.get("kind", "figure")
    if kind not in KINDS:
        return f"kind {kind!r} is not one of {', '.join(KINDS)}"
    spec, choices = d.get("figure_spec"), d.get("choice_specs") or {}
    figs = figures_of(spec)
    if not all(isinstance(f, dict) for f in figs):
        return "figure_spec must be a FigureSpec object or a list of them"
    if not isinstance(choices, dict) or not all(k in LETTERS and isinstance(v, dict) for k, v in choices.items()):
        return "choice_specs must map A-D to FigureSpec objects"
    if not figs and not choices:
        return "no figure_spec and no choice_specs"
    labels = d.get("transcribed_labels")
    if figs:
        if isinstance(spec, list):
            if not (isinstance(labels, list) and len(labels) == len(figs) and all(_labels_ok(x) for x in labels)):
                return "a figure list needs transcribed_labels: one list of texts per figure"
        elif not _labels_ok(labels):
            return "transcribed_labels must be the list of every text printed in the original figure"
    cl = d.get("choice_labels") or {}
    if any(not _labels_ok(cl.get(k)) for k in choices):
        return "choice_labels needs the list of texts printed in each choice's original figure"
    if d.get("visual_verdict") == MECHANICAL:
        if kind not in MECHANICAL_KINDS:
            return f"visual_verdict mechanical is only for {' and '.join(MECHANICAL_KINDS)}, not {kind}"
    elif d.get("visual_verdict") is not None:
        return f"visual_verdict {d.get('visual_verdict')!r}: give visual_verdict_path (or mechanical for a table or chart)"
    elif not isinstance(d.get("visual_verdict_path"), str) or not d["visual_verdict_path"].strip():
        return "visual_verdict_path missing"
    return None


def canonical(v) -> str:
    return json.dumps(v, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def file_sha(path: Path) -> str | None:
    try:
        return hashlib.sha256(Path(path).read_bytes()).hexdigest()
    except OSError:
        return None


def verdict_problem(d: dict, expected: dict | None) -> str | None:
    """Why this line's figures are not cleared by their verdict (None = they are). `expected`:
    the engine's conversion of the row's live data (convert mode), for a mechanical line."""
    if d.get("visual_verdict") == MECHANICAL:
        if not expected or not expected.get("ok"):
            return "mechanical: the live data does not convert (" + str((expected or {}).get("error")) + ")"
        if expected.get("kind") != d.get("kind"):
            return f"mechanical: the live data is a {expected.get('kind')}, the line says {d.get('kind')}"
        if canonical(d.get("figure_spec")) != canonical(expected.get("figure_spec")) or \
                canonical(d.get("choice_specs") or {}) != canonical(expected.get("choice_specs") or {}):
            return "mechanical: the specs are not the engine's conversion of the live data"
        return None
    path = Path(d["visual_verdict_path"])
    original = path.parent / fg.ORIGINAL_FILE
    why = fg.verdict_problems(fg.read_verdict(path), {d["stable_question_id"]},
                              fg.spec_sha256(d.get("figure_spec"), d.get("choice_specs") or {}),
                              file_sha(original) if original.is_file() else None)
    return "visual verdict: " + "; ".join(why) if why else None


def resolve(lines: list[dict]) -> tuple[dict, dict]:
    """({question id: line}, {key: why refused}). Several lines for one question refuse it."""
    refused: dict[str, str] = {}
    by_id: dict[str, list[dict]] = {}
    for d in lines:
        why = line_problem(d)
        key = d.get("question_id") if isinstance(d.get("question_id"), str) else f"line {d['_line']}"
        if why:
            refused.setdefault(key, f"line {d['_line']}: {why}")
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


def row_problem(d: dict, row: dict | None) -> str | None:
    if row is None:
        return "not in the live export (not live)"
    if not (row.get("is_live") is True and row.get("archived_at") is None):
        return "not live"
    keys = row.get("answer_key_entries") or []
    if len(keys) > 1:
        return f"{len(keys)} answer key entries (expected at most one)"
    sid = stable_question_id(keys[0].get("raw_model_response")) if keys else None
    if sid is not None and sid != d["stable_question_id"]:
        return f"stable id {d['stable_question_id']} is not the row's {sid}"
    letters = {c.get("letter") for c in row.get("answer_choices") or []}
    missing = sorted(set(d.get("choice_specs") or {}) - letters)
    if missing:
        return f"the row has no choice {', '.join(missing)}"
    return None


def checked_specs(d: dict, result: dict) -> tuple[object, dict]:
    """(figure_spec, {letter: spec}) as check-spec.ts sampled them, in the line's shape."""
    figs = result["figures"]
    spec = None if d.get("figure_spec") in _EMPTY else (figs if isinstance(d["figure_spec"], list) else figs[0])
    return spec, dict(result["choices"])


def history_raw(row: dict, d: dict, spec, choices: dict, now: str, run: str):
    keys = row.get("answer_key_entries") or []
    if not keys:
        return None
    raw = copy.deepcopy(keys[0].get("raw_model_response"))
    root = evidence_root(raw)
    if not isinstance(root, dict):
        return raw
    path = d.get("visual_verdict_path")
    entry = {"at": now, "by": TOOL, "run": run, "kind": d.get("kind", "figure"),
             "verdict": MECHANICAL if d.get("visual_verdict") == MECHANICAL else fg.MATCH,
             "verdict_path": path, "verdict_sha256": file_sha(Path(path)) if path else None,
             "figure_sha256": fg.spec_sha256(d.get("figure_spec"), d.get("choice_specs") or {}),
             "stored_sha256": fg.spec_sha256(spec, choices),
             "set": (["figure_spec"] if spec is not None else []) + [f"choice {x}" for x in sorted(choices)],
             "previous_question_payload_sha256": (root.get("approved_tags") or {}).get("question_payload_sha256"),
             "previous_figure_spec": row.get("figure_spec"),
             "previous_choice_figure_specs": {c["letter"]: c.get("choice_figure_spec")
                                              for c in row.get("answer_choices") or [] if c["letter"] in choices}}
    root["figure_spec_publications"] = list(root.get("figure_spec_publications") or []) + [entry]
    return raw


def _unchanged(row: dict, spec, choices: dict) -> bool:
    if spec is not None and canonical(row.get("figure_spec")) != canonical(spec):
        return False
    have = {c["letter"]: c.get("choice_figure_spec") for c in row.get("answer_choices") or []}
    return all(canonical(have.get(x)) == canonical(s) for x, s in choices.items())


def build_plan(lines: list[dict], rows: dict[str, dict], deps, now: str, run: str) -> dict:
    """{"items", "refused", "unchanged", "lines"}. `deps`: spec_checker(lines) -> {qid: result},
    converter(rows) -> {qid: conversion}, draws(items) -> {qid: {ok, error}}, sealer(items) -> {rows}."""
    decided, refused = resolve(lines)
    ok: dict[str, dict] = {}
    for qid, d in sorted(decided.items()):
        why = row_problem(d, rows.get(qid))
        if why:
            refused[qid] = why
        else:
            ok[qid] = d
    mech = [qid for qid, d in ok.items() if d.get("visual_verdict") == MECHANICAL]
    converted = deps.converter([rows[q] for q in mech]) if mech else {}
    for qid in list(ok):
        why = verdict_problem(ok[qid], converted.get(qid))
        if why:
            refused[qid] = why
            del ok[qid]
    checked = deps.spec_checker(list(ok.values())) if ok else {}
    items, unchanged = [], []
    for qid, d in ok.items():
        res = checked.get(qid) or {"ok": False, "issues": ["no check result"]}
        if not res.get("ok") or res.get("issues"):
            refused[qid] = "check-spec: " + "; ".join(map(str, (res.get("issues") or ["the checks did not pass"])[:3]))
            continue
        spec, choices = checked_specs(d, res)
        row = rows[qid]
        if _unchanged(row, spec, choices):
            unchanged.append(qid)
            continue
        items.append({"id": qid, "stable_question_id": d["stable_question_id"], "kind": d.get("kind", "figure"),
                      "verdict": MECHANICAL if d.get("visual_verdict") == MECHANICAL else fg.MATCH,
                      "row": row, "line": d, "figure_spec": spec, "choice_specs": choices,
                      "raw_after": history_raw(row, d, spec, choices, now, run)})
    drawn = deps.draws(items) if items else {}
    kept = []
    for it in items:
        r = drawn.get(it["id"]) or {"ok": False, "error": "no draw result"}
        if r.get("ok"):
            kept.append(it)
        else:
            refused[it["id"]] = f"the screen would not draw it: {r.get('error')}"
    sealed = {c["id"]: c for c in deps.sealer(kept)["rows"]} if kept else {}
    out = []
    for it in kept:
        c = sealed.get(it["id"]) or {"ok": False, "error": "no check result"}
        if not c["ok"]:
            refused[it["id"]] = f"app check: {c['error']}"
            continue
        out.append({**it, "raw_after": c["raw_after"], "seal_before": c["seal_before"], "seal_after": c["seal_after"],
                    "served": c.get("served")})
    return {"items": out, "refused": dict(sorted(refused.items())), "unchanged": sorted(unchanged),
            "lines": len(lines)}


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
    """`expr` differs from v. The REST export reads a SQL NULL and a stored JSON null alike as None,
    so None means either (some rows store figure_table_data as JSON null)."""
    if v is None:
        return f"coalesce({expr} <> 'null'::jsonb, false)"
    return f"{expr} IS DISTINCT FROM {_j(v)}"


def _state(it: dict, after: bool) -> tuple:
    """(figure_spec or the keep marker, {letter: choice spec}, evidence) before or after."""
    row = it["row"]
    keys = row.get("answer_key_entries") or []
    raw = (it["raw_after"] if after else keys[0].get("raw_model_response")) if keys else None
    have = {c["letter"]: c.get("choice_figure_spec") for c in row.get("answer_choices") or []}
    spec = it["figure_spec"] if after else row.get("figure_spec")
    choices = {x: (s if after else have.get(x)) for x, s in it["choice_specs"].items()}
    return spec, choices, raw


def _row_block(tag: str, it: dict, undo: bool) -> list[str]:
    row, qid = it["row"], uuid_literal(it["id"])
    e_spec, e_choices, e_raw = _state(it, after=undo)
    p_spec, p_choices, p_raw = _state(it, after=not undo)
    sets_figure = it["figure_spec"] is not None
    guard = [_guard(c, row.get(c)) for c in GUARD if not (undo and c == "updated_at")]
    guard += [_jguard(f"q.{c}", row.get(c)) for c in LEGACY_JSON]
    if sets_figure:
        guard.append(_jguard("q.figure_spec", e_spec))
    guard.append(f"(SELECT count(*) FROM public.answer_choices c WHERE c.question_id = q.id) <> "
                 f"{len(row.get('answer_choices') or [])}")
    tables = {c["letter"]: c.get("choice_table_data") for c in row.get("answer_choices") or []}
    for x in sorted(e_choices):
        sel = f"(SELECT c.{{}} FROM public.answer_choices c WHERE c.question_id = q.id AND c.letter = {lit(x)})"
        guard.append(_jguard(sel.format("choice_figure_spec"), e_choices[x]))
        guard.append(_jguard(sel.format("choice_table_data"), tables.get(x)))
    body = ["DECLARE q public.quiz_questions%rowtype; n int;", "BEGIN",
            f" SELECT * INTO STRICT q FROM public.quiz_questions WHERE id = '{qid}'::uuid FOR UPDATE;",
            " IF " + "\n   OR ".join(guard),
            " THEN RAISE EXCEPTION 'question changed since the export: %', q.id; END IF;"]
    if e_raw is not None:
        body += [" SELECT count(*) INTO n FROM public.answer_key_entries WHERE question_id = q.id;",
                 " IF n <> 1 OR NOT EXISTS (SELECT 1 FROM public.answer_key_entries WHERE question_id = q.id"
                 f" AND raw_model_response = {_j(e_raw)})",
                 " THEN RAISE EXCEPTION 'answer key evidence changed since the export: %', q.id; END IF;"]
    if sets_figure:
        body.append(f" UPDATE public.quiz_questions SET figure_spec = {_j(p_spec)} WHERE id = q.id;")
    for x in sorted(p_choices):
        body += [f" UPDATE public.answer_choices SET choice_figure_spec = {_j(p_choices[x])}"
                 f" WHERE question_id = q.id AND letter = {lit(x)};",
                 " GET DIAGNOSTICS n = ROW_COUNT;",
                 f" IF n <> 1 THEN RAISE EXCEPTION 'choice {x} update count: %', q.id; END IF;"]
    if p_raw is not None:
        body.append(f" UPDATE public.answer_key_entries SET raw_model_response = {_j(p_raw)} WHERE question_id = q.id;")
    note = json.dumps({"id": it["id"], "stable_question_id": it["stable_question_id"], "kind": it["kind"],
                       "verdict": it["verdict"], "set": (["figure_spec"] if sets_figure else []) +
                       [f"choice {x}" for x in sorted(p_choices)]}, sort_keys=True)
    return [_ROW_NOTE + note] + do_block(tag, body)


def _files(title: str, items: list[dict], doc, undo: bool, max_bytes: int) -> list[str]:
    slug = "figure_specs_undo" if undo else "figure_specs"
    rendered = [_row_block(f"kimport_{slug}_{n:04d}", it, undo) for n, it in enumerate(items, 1)]
    chunks, cur, size = [], [], 0
    for r in rendered:
        n = sum(len(x) + 1 for x in r)
        if cur and size + n > max_bytes:
            chunks.append(cur)
            cur, size = [], 0
        cur.append(r)
        size += n
    chunks.append(cur)
    files = []
    for k, chunk in enumerate(chunks, 1):
        out = [f"-- kimport figures publish-specs: {title} (file {k} of {len(chunks)}, {len(chunk)} of {len(items)} rows). "
               "figure_spec / choice_figure_spec and the payload seal only; the older figure fields do not change.",
               "-- One transaction: any failed guard stops every row of this file. Run the .dryrun.sql twin first.",
               "BEGIN;", ""]
        if doc is not None:
            # figure_spec is not in the fingerprint (id, content hash, statuses, key): it holds in every file.
            out.append(f"-- export {doc.exported_at}: {doc.row_count} rows, fingerprint {doc.fingerprint}")
            out += _fingerprint_block(f"kimport_{slug}_fingerprint_{k:02d}", doc)
        for r in chunk:
            out += r
        files.append("\n".join(out + ["COMMIT;", ""]))
    return files


def publish_sql(items: list[dict], doc, max_bytes: int = MAX_FILE_BYTES) -> list[str]:
    return _files("draw these live questions' figures with the figure engine", items, doc, False, max_bytes)


def restore_sql(items: list[dict], max_bytes: int = MAX_FILE_BYTES) -> list[str]:
    """Every before value back (figure_spec, choice_figure_spec, evidence), guarded on the after state."""
    return _files("undo (put figure_spec, choice_figure_spec and the evidence back exactly)", items, None, True,
                  max_bytes)


def readback_sql(ids: list[str]) -> str:
    arr = ",".join(f"'{uuid_literal(i)}'" for i in sorted(ids)) or "NULL"
    return ("-- kimport figures publish-specs readback. Read-only.\n"
            "SELECT coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'figure_spec', q.figure_spec, 'choice_figure_specs',"
            " (SELECT jsonb_object_agg(c.letter, c.choice_figure_spec) FROM public.answer_choices c WHERE c.question_id"
            " = q.id), 'raw_model_response', (SELECT k.raw_model_response FROM public.answer_key_entries k WHERE"
            " k.question_id = q.id LIMIT 1)) ORDER BY q.id), '[]'::jsonb) AS rows FROM public.quiz_questions q"
            f" WHERE q.id = ANY (ARRAY[{arr}]::uuid[]);\n")


def expected(items: list[dict], after: bool) -> dict[str, dict]:
    """{id: columns} the readback should show after (or before) the write."""
    out = {}
    for it in items:
        spec, choices, raw = _state(it, after)
        have = {c["letter"]: c.get("choice_figure_spec") for c in it["row"].get("answer_choices") or []}
        out[it["id"]] = {"figure_spec": spec if it["figure_spec"] is not None else it["row"].get("figure_spec"),
                         "choice_figure_specs": ({**have, **choices} or None), "raw_model_response": raw}
    return out


# ---------------------------------------------------------------- plan.json


def plan_doc(plan: dict, summary: dict) -> dict:
    from collections import Counter

    def group(why: str) -> str:
        for head in ("app check: ", "check-spec: ", "visual verdict: ", "mechanical: ", "the screen would not draw"):
            if why.startswith(head) or why.split(": ", 1)[-1].startswith(head):
                return head.rstrip(": ")
        return why.split(": ", 1)[-1] if why.startswith("line ") else why
    items = plan["items"]
    return {**summary,
            "by_kind": dict(Counter(it["kind"] for it in items)),
            "by_verdict": dict(Counter(it["verdict"] for it in items)),
            "choice_specs": sum(len(it["choice_specs"]) for it in items),
            "refused_by_reason": dict(Counter(group(w) for w in plan["refused"].values()).most_common()),
            "refused_rows": plan["refused"], "unchanged_rows": plan["unchanged"],
            "rows": [{"id": it["id"], "stable_question_id": it["stable_question_id"], "kind": it["kind"],
                      "verdict": it["verdict"], "served": it.get("served"), "seal_before": it["seal_before"],
                      "seal_after": it["seal_after"], "figures": len(figures_of(it["figure_spec"])),
                      "choices": sorted(it["choice_specs"])} for it in items]}
