"""`k qa fix-legacy`: apply a QA reviewer's exact fix IN PLACE to an older question whose
answer key evidence names no stable question id (kimport.qa_ids status "legacy").

Such a row cannot go through a QA correction batch (kimport.qa_correct needs the evidence
to name the batch row's stable id, and has no source package to rebuild it from), so the
reviewer's line in pipeline/qa/fixes-<you>.jsonl is the correction. Only these change:
  question_text           from corrected_question_text;
  answer_choices          choice_text from corrected_choices {letter: text}; is_correct from
                          the key (multiple choice);
  the key                 correct_answer and verified_answer from corrected_key,
                          answer_key_status 'corrected_key_verified'. selected_official_answer
                          and the answer_key_entries row are left alone: the printed key stays
                          recorded as printed, and a reviewer's answer is never labelled official;
  content_hash_v2         recomputed (import-core computeContentHashV2, text-only form) when the
                          text or a choice changes. Only for a row whose stored hash that formula
                          reproduces and that has no figure data or choice tables; otherwise the
                          text change is refused (rebuild it with the normal builders).
A numeric answer set is bound to a source tuple (src/lib/question-bank/numeric-answer-set.ts),
so a set with more than the key itself is refused. A fix line that changes the passage or a
table is refused. Nothing changes publish_status, import_status, import_flag_reason or
archived_at: the row stays exactly as hidden as it was, and `k qa restore` republishes a
QA-hidden row once the results no longer call it unresolved.

Per row, from a fresh read-only snapshot (snapshot_sql): exactly one snapshot, not student
visible (publish_status not publish_ready / publish_ready_with_verified_repair: a QA-hidden
row, or a row that was never served), exactly one answer key row and its evidence names no
stable id, the fix line is a decision "fix", and it changes something. Two fix lines for one
id that disagree are refused.

fix-legacy.sql (+ .dryrun.sql): one transaction, the export fingerprint guard first, then per
row: lock it, require the row, its choices and its answer key to equal the snapshot exactly
and still be not visible with no stable id, refuse a content_hash_v2 another row has, update
the columns above, and check one choice is correct and it is the key. fix-legacy-rollback.sql
puts the old values back, only while the fixed values are still in place.
Nothing here connects to a database (kimport.qa_run.run_fix_legacy runs the files).
"""

import hashlib
import json
from fractions import Fraction
from pathlib import Path

from kimport import qa_hide as qh
from kimport.answer_evidence import sql_stable_question_id, stable_question_id
from kimport.export import _unwrap
from kimport.fix import _blob
from kimport.qa_correct import _lock_and_match
from kimport.sqlutil import do_block, dryrun_variant, uuid_literal
from kimport.sweep import PUBLISH_READY

LOG = "legacy-fixes.jsonl"
CORRECTED = "corrected_key_verified"
FIX_FIELDS = ("corrected_question_text", "corrected_choices", "corrected_key", "numeric_answer_set")
# A fix line may restate these; it may not change them (fix-legacy does not touch them).
UNCHANGED = {"corrected_passage": "passage", "corrected_figure_table_data": "figure_table_data"}
FIGURE_COLS = ("figure_table_data", "figure_chart_data", "figure_geometry_data", "figure_svg")
SET_COLS = ("question_text", "content_hash_v2", "correct_answer", "verified_answer", "answer_key_status")
_NOTE = "-- kimport qa legacy row "


# ---------------------------------------------------------------- inputs


def read_fixes(files) -> tuple[dict[str, dict], dict[str, str]]:
    """({id: fix line}, {id: why refused}) over decision "fix" lines; the same id in two lines
    must carry the same correction."""
    out, bad = {}, {}
    for f in files:
        for n, raw in enumerate(Path(f).read_text(encoding="utf-8").splitlines(), 1):
            if not raw.strip():
                continue
            try:
                line = json.loads(raw)
            except ValueError:
                raise ValueError(f"{f}:{n}: not a JSON line") from None
            if not isinstance(line, dict) or "id" not in line:
                raise ValueError(f"{f}:{n}: a fix line needs an id")
            uuid_literal(line["id"])
            if line.get("decision") != "fix":
                continue
            want = {k: line.get(k) for k in (*FIX_FIELDS, *UNCHANGED)}
            prev = out.get(line["id"])
            if prev is not None and {k: prev.get(k) for k in want} != want:
                bad[line["id"]] = "two fix lines for this id carry different corrections"
            out.setdefault(line["id"], line)
    return out, bad


def snapshot_sql(ids: list[str]) -> str:
    arr = ",".join(f"'{uuid_literal(i)}'" for i in sorted(ids)) or "NULL"
    return ("-- kimport qa legacy snapshot. Read-only, changes nothing.\n"
            "SELECT jsonb_build_object('rows', coalesce(jsonb_agg(jsonb_build_object('snapshot', jsonb_build_object(\n"
            "  'question', to_jsonb(q),\n"
            "  'choices', (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.letter) FROM public.answer_choices c"
            " WHERE c.question_id=q.id),\n"
            "  'keys', coalesce((SELECT jsonb_agg(to_jsonb(k) ORDER BY k.created_at, k.id) FROM public.answer_key_entries k"
            " WHERE k.question_id=q.id),'[]'::jsonb))) ORDER BY q.id), '[]'::jsonb)) AS readback\n"
            f"FROM public.quiz_questions q WHERE q.id = ANY (ARRAY[{arr}]::uuid[]);\n")


def read_snapshots(raw) -> list[dict]:
    data = _unwrap(raw)
    rows = data.get("rows") if isinstance(data, dict) else data
    if isinstance(rows, str):
        rows = json.loads(rows)
    if not isinstance(rows, list) or not all(isinstance(r, dict) and isinstance(r.get("snapshot"), dict)
                                             for r in rows):
        raise ValueError("legacy snapshot: expected {rows: [{snapshot: {question, choices, keys}}]}")
    return [r["snapshot"] for r in rows]


# ---------------------------------------------------------------- the content hash


def content_hash_v2(q: dict, choices: dict[str, str]) -> str:
    """import-core computeContentHashV2 for a row without tables or figures."""
    parts = [q.get("subject"), q.get("domain"), q.get("answer_format"), q.get("passage_intro") or "",
             q.get("passage") or "", q.get("passage_a") or "", q.get("passage_b") or "", q.get("question_text"),
             *(choices.get(letter) or "" for letter in "ABCD")]
    return hashlib.sha256("|".join(str(p).strip().lower() for p in parts).encode("utf-8")).hexdigest()


def _number(s) -> Fraction | None:
    try:
        return Fraction(str(s).strip().replace(",", ""))
    except (ValueError, ZeroDivisionError):
        return None


# ---------------------------------------------------------------- per row


def check(line: dict, snaps: list[dict], other_hashes: set) -> tuple[dict | None, list[str]]:
    """(the plan for this row, reasons to refuse)."""
    if len(snaps) != 1:
        return None, [f"{len(snaps)} rows in the snapshot for this id; expected one"]
    snap = snaps[0]
    q, out = snap["question"], []
    choices = {c["letter"]: c for c in snap.get("choices") or []}
    keys = snap.get("keys") or []
    if q.get("publish_status") in PUBLISH_READY:
        out.append(f"the row is student-visible (publish_status {q.get('publish_status')}); hide it first (k qa hide)")
    if len(keys) != 1:
        out.append(f"{len(keys)} answer key rows; expected one")
    elif stable_question_id(keys[0].get("raw_model_response")):
        out.append(f"the answer key evidence names {stable_question_id(keys[0].get('raw_model_response'))}; "
                   "correct it with a QA correction batch (README QA corrections)")
    for field, col in UNCHANGED.items():
        if line.get(field) is not None and line[field] != q.get(col):
            out.append(f"{field} differs from the row; fix-legacy changes only question text, choices and the key")
    fmt, key = q.get("answer_format"), line.get("corrected_key")
    key = None if key is None else str(key).strip()
    new_choices = line.get("corrected_choices") or {}
    if not isinstance(new_choices, dict) or not all(isinstance(v, str) for v in new_choices.values()):
        out.append("corrected_choices is not {letter: text}")
        new_choices = {}
    if not key:
        out.append("the fix line has no corrected_key")
    elif fmt == "multiple_choice":
        if key not in choices:
            out.append(f"corrected_key {key!r} is not one of the row's choices ({''.join(sorted(choices))})")
        if set(new_choices) - set(choices):
            out.append(f"corrected_choices names letters the row does not have: {sorted(set(new_choices) - set(choices))}")
        if line.get("numeric_answer_set"):
            out.append("a numeric answer set on a multiple-choice row")
    elif fmt == "numeric_entry":
        if _number(key) is None:
            out.append(f"corrected_key {key!r} is not a number")
        if new_choices:
            out.append("corrected_choices on a numeric-entry row")
        accepted = {_number(a) for a in line.get("numeric_answer_set") or []}
        if accepted - {_number(key)}:
            out.append("a numeric answer set beyond the key needs a source tuple (numeric-answer-set.ts); "
                       "a legacy row cannot carry one")
    else:
        out.append(f"answer_format {fmt!r}: fix-legacy handles multiple_choice and numeric_entry")
    if out:
        return snap, out
    text = line.get("corrected_question_text")
    text = q.get("question_text") if text is None else text
    texts = {letter: new_choices.get(letter, c.get("choice_text")) for letter, c in choices.items()}
    put = {}
    if text != q.get("question_text") or any(texts[x] != choices[x].get("choice_text") for x in choices):
        old_texts = {x: c.get("choice_text") for x, c in choices.items()}
        if any(q.get(c) is not None for c in FIGURE_COLS) or any(c.get("choice_table_data") is not None
                                                                   for c in choices.values()):
            return snap, ["the row has figure or table data; its text is rebuilt with the normal builders"]
        if content_hash_v2(q, old_texts) != q.get("content_hash_v2"):
            return snap, ["the stored content_hash_v2 is not the text-only formula of this row; "
                          "its text cannot be changed here"]
        new_hash = content_hash_v2({**q, "question_text": text}, texts)
        if new_hash in other_hashes:
            return snap, ["the corrected content has the content_hash_v2 of another bank row (a duplicate)"]
        put.update(question_text=text, content_hash_v2=new_hash)
    if key != q.get("correct_answer"):
        put.update(correct_answer=key, verified_answer=key, answer_key_status=CORRECTED)
    choice_put = {}
    for letter, c in choices.items():
        want = {"choice_text": texts[letter], "is_correct": letter == key}
        if fmt == "multiple_choice" and want != {"choice_text": c.get("choice_text"), "is_correct": c.get("is_correct")}:
            choice_put[letter] = want
    if not put and not choice_put:
        return snap, ["the fix changes nothing on this row (use k qa restore once it is re-checked)"]
    undo = {c: q.get(c) for c in put}
    choice_undo = {x: {"choice_text": choices[x].get("choice_text"), "is_correct": choices[x].get("is_correct")}
                   for x in choice_put}
    after_choices = {x: [choice_put.get(x, {}).get("choice_text", c.get("choice_text")),
                         choice_put.get(x, {}).get("is_correct", c.get("is_correct"))] for x, c in choices.items()}
    return {"id": q["id"], "snap": snap, "set": put, "undo": undo, "choices": choice_put, "choices_undo": choice_undo,
            "multiple_choice": fmt == "multiple_choice", "after_choices": after_choices or None,
            "before_choices": {x: [c.get("choice_text"), c.get("is_correct")] for x, c in choices.items()} or None,
            "reason": q.get("import_flag_reason")}, []


# ---------------------------------------------------------------- SQL


def _still() -> str:
    visible = ",".join(f"'{s}'" for s in PUBLISH_READY)
    return (f"coalesce(q.publish_status,'') NOT IN ({visible})"
            f" AND (SELECT {sql_stable_question_id('k.raw_model_response')} FROM public.answer_key_entries k"
            " WHERE k.question_id=q.id) IS NULL")


def _choice_updates(which: str, letters) -> list[str]:
    out = []
    for x in sorted(letters):
        out += [f" UPDATE public.answer_choices t SET choice_text=r.choice_text,is_correct=r.is_correct"
                f" FROM jsonb_populate_record(NULL::public.answer_choices,v->'{which}'->'{x}') r"
                f" WHERE t.question_id=q.id AND t.letter='{x}';",
                " GET DIAGNOSTICS n=ROW_COUNT;",
                f" IF n<>1 THEN RAISE EXCEPTION 'choice {x} update count: %',q.id; END IF;"]
    return out


def _set_question(which: str, cols) -> list[str]:
    sets = ",".join(f"{c}=r.{c}" for c in sorted(cols))
    return [f" UPDATE public.quiz_questions t SET {sets}"
            f"  FROM jsonb_populate_record(NULL::public.quiz_questions,v->'{which}') r WHERE t.id=q.id;",
            " GET DIAGNOSTICS n=ROW_COUNT;",
            " IF n<>1 THEN RAISE EXCEPTION 'question update count: %',q.id; END IF;"]


def _key_check(it: dict) -> list[str]:
    if not it["multiple_choice"]:
        return []
    return [" IF (SELECT count(*) FROM public.answer_choices c WHERE c.question_id=q.id AND c.is_correct)<>1"
            " OR NOT EXISTS (SELECT 1 FROM public.answer_choices c, public.quiz_questions t WHERE c.question_id=q.id"
            " AND t.id=q.id AND c.is_correct AND c.letter=t.correct_answer)"
            " THEN RAISE EXCEPTION 'the key is not the one correct choice: %',q.id; END IF;"]


def _sha(x) -> str:
    return hashlib.sha256(json.dumps(x, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()


def fix_block(tag: str, it: dict) -> list[str]:
    snap = it["snap"]
    v = {"stable_question_id": it["id"], "old": {"question": snap["question"], "choices": snap.get("choices"),
                                                 "keys": snap["keys"]}, "set": it["set"], "choices": it["choices"]}
    note = {"id": it["id"], "expect_sha256": _sha(v["old"]), "set": it["set"], "choices": it["choices"]}
    body = [f"DECLARE v jsonb:={_blob(v)}; q public.quiz_questions%rowtype; n int;", "BEGIN"]
    body += _lock_and_match("v", "old", _still())
    if "content_hash_v2" in it["set"]:
        body.append(" IF EXISTS (SELECT 1 FROM public.quiz_questions o WHERE o.id<>q.id"
                    " AND o.content_hash_v2::text=v->'set'->>'content_hash_v2')"
                    " THEN RAISE EXCEPTION 'content_hash_v2 already in the bank: %',q.id; END IF;")
    if it["set"]:
        body += _set_question("set", it["set"])
    body += _choice_updates("choices", it["choices"]) + _key_check(it)
    return [_NOTE + json.dumps(note, sort_keys=True, ensure_ascii=False)] + do_block(tag, body)


def rollback_block(tag: str, it: dict) -> list[str]:
    v = {"set": it["set"], "undo": it["undo"], "choices": it["choices"], "choices_undo": it["choices_undo"]}
    now = [f"to_jsonb(q)->'{c}' IS NOT DISTINCT FROM v->'set'->'{c}'" for c in sorted(it["set"])]
    now += [f"(SELECT jsonb_build_object('choice_text',c.choice_text,'is_correct',c.is_correct)"
            f" FROM public.answer_choices c WHERE c.question_id=q.id AND c.letter='{x}')"
            f" IS NOT DISTINCT FROM v->'choices'->'{x}'" for x in sorted(it["choices"])]
    body = [f"DECLARE v jsonb:={_blob(v)}; q public.quiz_questions%rowtype; n int;", "BEGIN",
            f" SELECT * INTO q FROM public.quiz_questions WHERE id='{uuid_literal(it['id'])}'::uuid FOR UPDATE;",
            " IF NOT FOUND THEN RAISE EXCEPTION 'legacy row missing'; END IF;",
            f" IF NOT coalesce({' AND '.join([_still()] + now)},false)"
            " THEN RAISE EXCEPTION 'the row no longer holds the legacy fix: %',q.id; END IF;"]
    if it["undo"]:
        body += _set_question("undo", it["undo"])
    body += _choice_updates("choices_undo", it["choices_undo"])
    return do_block(tag, body)


def _sql(kind: str, items: list[dict], doc) -> str:
    head = {"fix": "apply QA reviewers' fixes to legacy rows in place (same id; nothing is published)",
            "rollback": "put the legacy rows back as they were before the fix"}[kind]
    out = [f"-- kimport qa fix-legacy: {head} ({len(items)} rows).",
           "-- One transaction: any failed guard stops every row. Run the .dryrun.sql twin first.", "BEGIN;", ""]
    if kind == "fix":
        out.append(f"-- export {doc.exported_at}: {doc.row_count} rows, fingerprint {doc.fingerprint}")
        out += qh._fingerprint_block("kimport_qa_legacy_fingerprint", doc)
    for n, it in enumerate(items, 1):
        out.append(f"-- row {n}: {it['id']}: " + ", ".join(sorted(it["set"]) + [f"choice {x}" for x in sorted(it["choices"])]))
        tag = f"kimport_qa_legacy_{kind}_{n:04d}"
        out += fix_block(tag, it) if kind == "fix" else rollback_block(tag, it)
    return "\n".join(out + ["COMMIT;", ""])


def readback_sql(ids: list[str]) -> str:
    arr = ",".join(f"'{uuid_literal(i)}'" for i in sorted(ids)) or "NULL"
    cols = ", ".join(f"'{c}', q.{c}" for c in (*SET_COLS, "publish_status", "import_status", "import_flag_reason",
                                                 "archived_at"))
    return ("-- kimport qa readback (legacy fix). Read-only.\n"
            f"SELECT coalesce(jsonb_agg(jsonb_build_object('id', q.id, {cols}, 'choices', (SELECT jsonb_object_agg("
            "c.letter, jsonb_build_array(c.choice_text, c.is_correct)) FROM public.answer_choices c"
            f" WHERE c.question_id=q.id)) ORDER BY q.id), '[]'::jsonb) AS rows FROM public.quiz_questions q"
            f" WHERE q.id = ANY (ARRAY[{arr}]::uuid[]);\n")


def expected(items: list[dict]) -> tuple[dict, dict]:
    """({id: columns after}, {id: columns before}) in the readback_sql shape (for qa_hide.matches)."""
    after, before = {}, {}
    for it in items:
        q = it["snap"]["question"]
        keep = {c: q.get(c) for c in ("publish_status", "import_status", "import_flag_reason")}
        after[it["id"]] = {**keep, **it["set"], "choices": it["after_choices"]}
        before[it["id"]] = {**keep, **it["undo"], "choices": it["before_choices"]}
    return after, before


def build(fixes: dict[str, dict], conflicts: dict[str, str], doc, snaps: list[dict]) -> dict:
    """{"files", "items", "refused", "plan"} for every id with a fix line."""
    by_id: dict = {}
    for s in snaps:
        by_id.setdefault((s.get("question") or {}).get("id"), []).append(s)
    own = set(fixes)
    other_hashes = {r.get("content_hash_v2") for r in doc.rows if r["id"] not in own} - {None}
    items, refused = [], dict(conflicts)
    for qid in sorted(fixes):
        if qid in refused:
            continue
        it, why = check(fixes[qid], by_id.get(qid, []), other_hashes)
        if why:
            refused[qid] = "; ".join(why)
        else:
            items.append(it)
    files = {}
    if items:
        for kind, name in (("rollback", "fix-legacy-rollback"), ("fix", "fix-legacy")):
            sql = _sql(kind, items, doc)
            files[f"{name}.sql"], files[f"{name}.dryrun.sql"] = sql, dryrun_variant(sql)
        files["readback.sql"] = readback_sql([it["id"] for it in items])
    plan = {"to_fix": len(items), "refused": refused,
            "rows": [{"id": it["id"], "qa_reason": it["reason"], "before": it["undo"], "after": it["set"],
                      "choices_before": it["choices_undo"], "choices_after": it["choices"]} for it in items]}
    return {"files": files, "items": items, "refused": refused, "plan": plan}


def log_entries(items: list[dict], now: str, run: str) -> list[dict]:
    return [{"id": it["id"], "at": now, "run": run, "qa_reason": it["reason"], "before": it["undo"],
             "after": it["set"], "choices_before": it["choices_undo"], "choices_after": it["choices"]} for it in items]
