"""Evidence update for corrected batches ("fix batches").

A row held at seal (kimport.stage.run_seal --hold-failing) is already in the
bank as a private draft. When a reviewer writes a corrected batch for it (same
stable ids, READY as usual), staging it again would be refused (its source
question is already in the bank). Instead this module builds a guarded UPDATE
that replaces only the draft's answer_key_entries.raw_model_response with the
corrected evidence, computed by ts/stage-rows.ts exactly as stage computes it.

A batch is a fix batch when every one of its stable ids was held by an earlier
run (autopilot-state.json). Each row must find exactly one export row and one
fresh read-only snapshot of its draft, and that draft must be exactly what the
corrected row would insert: every question, mirror, choice and answer key
column equal except raw_model_response (so text, choices and answer are
unchanged), still a private draft (needs_review, needs_human_review, not live,
not archived, student_publication_allowed false, no seal yet). Rows that fail
are refused with the reason and left out.

evidence-NN.sql: one BEGIN ... COMMIT per chunk, the run fingerprint guard
first (kimport.bulk), then per row: lock the question and its one answer key
row, require both (and its choices) to equal the snapshot exactly, and update
the evidence. Each has a .dryrun.sql twin. The rows then go through readback,
seal and publish with the run's newly staged rows.

Nothing here connects to a database; the SQL is text the autopilot runs only
after its dry-run twin passed.
"""

import base64
import json
import tempfile
from pathlib import Path

from kimport import bulk
from kimport import stage as st
from kimport.publish import STAGED_IMPORT, STAGED_STATUS, RefuseToBuild, duplicate_check
from kimport.sqlutil import do_block, dryrun_variant

EVIDENCE = "raw_model_response"


def reviewed_ids(batch_dir: Path) -> list[str]:
    """Stable ids of a batch's reviewed rows ([] when the file cannot be read)."""
    try:
        ready = st.read_ready(batch_dir)
        doc = json.loads(Path(ready["reviewed_file"]).read_text(encoding="utf-8"))
        return [q.get("stable_question_id") for q in doc.get("questions") or [] if isinstance(q, dict)]
    except (RefuseToBuild, OSError, ValueError, AttributeError):
        return []


def classify(dirs: list[Path], held_ids: set) -> tuple[list[Path], list[Path], dict]:
    """(fix batch folders, normal batch folders, {folder: reason} for batches that mix both)."""
    fix, normal, refused = [], [], {}
    for d in dirs:
        ids = reviewed_ids(d)
        hits = [i for i in ids if i in held_ids]
        if ids and len(hits) == len(ids):
            fix.append(d)
        elif hits:
            refused[Path(d).name] = (f"{len(hits)} of {len(ids)} rows correct rows held earlier; a corrected "
                                     "batch must hold only corrected rows")
        else:
            normal.append(d)
    return fix, normal, refused


def _private_draft(q: dict) -> bool:
    return (q.get("publish_status") == STAGED_STATUS and q.get("import_status") == STAGED_IMPORT
            and q.get("is_live") is False and q.get("archived_at") is None)


def _differs(want: dict, have: dict, skip=()) -> str | None:
    for col, v in want.items():
        if col in skip:
            continue
        if col not in have:
            return f"the draft has no {col} column"
        if have[col] != v:
            return f"{col} differs from the private draft"
    return None


def check_row(it: dict, export_rows: list[dict], snaps: list[dict]) -> tuple[dict | None, list[str]]:
    """(the draft snapshot, reasons to refuse)."""
    if len(export_rows) != 1 or len(snaps) != 1:
        return None, [f"{len(export_rows)} bank rows and {len(snaps)} drafts for its source question; expected one"]
    snap, row = snaps[0], it["row"]
    q = snap.get("question") or {}
    out = []
    if export_rows[0]["id"] != q.get("id"):
        out.append("the export and the draft readback name different rows")
    if not _private_draft(q):
        out.append("the bank row is no longer a private draft")
    bad = _differs({**row["question"], **row["mirror"]}, q)
    if bad:
        out.append(bad)
    have = snap.get("choices") or []
    want = sorted(row["choices"], key=lambda c: c["letter"])
    if [c.get("letter") for c in have] != [c["letter"] for c in want]:
        out.append("the choices differ from the private draft")
    else:
        for w, h in zip(want, have):
            bad = _differs(w, h)
            if bad:
                out.append(f"choice {w['letter']}: {bad}")
    keys = snap.get("keys") or []
    if len(keys) != 1:
        out.append(f"{len(keys)} answer key rows on the draft; expected one")
    else:
        bad = _differs(row["key"], keys[0], skip=(EVIDENCE,))
        if bad:
            out.append(f"answer key: {bad}")
        old = keys[0].get(EVIDENCE)
        tags = old.get("approved_tags") if isinstance(old, dict) else None
        if not isinstance(old, dict) or old.get("student_publication_allowed") is not False:
            out.append("the draft's evidence is not unpublished evidence")
        elif isinstance(tags, dict) and "question_payload_sha256" in tags:
            out.append("the draft's evidence already carries a seal")
        if old == row["key"][EVIDENCE]:
            out.append("the corrected evidence equals the draft's evidence")
    return snap, out


def _blob(x) -> str:
    raw = json.dumps(x, ensure_ascii=False, separators=(",", ":")).encode()
    return f"convert_from(decode('{base64.b64encode(raw).decode()}','base64'),'UTF8')::jsonb"


def evidence_block(tag: str, it: dict) -> list[str]:
    snap = it["snap"]
    v = {"question": snap["question"], "choices": snap.get("choices"), "key": snap["keys"][0],
         "evidence": it["row"]["key"][EVIDENCE], "stable_question_id": it["id"]}
    return do_block(tag, [
        f"DECLARE v jsonb:={_blob(v)}; q public.quiz_questions%rowtype; k public.answer_key_entries%rowtype; n int;",
        "BEGIN",
        " SELECT * INTO q FROM public.quiz_questions WHERE id=(v->'question'->>'id')::uuid FOR UPDATE;",
        " IF NOT FOUND THEN RAISE EXCEPTION 'private draft missing: %',v->>'stable_question_id'; END IF;",
        " IF to_jsonb(q) IS DISTINCT FROM v->'question'",
        f"  OR q.publish_status<>'{STAGED_STATUS}' OR q.import_status<>'{STAGED_IMPORT}'"
        " OR q.is_live IS DISTINCT FROM false OR q.archived_at IS NOT NULL",
        "  OR coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.letter) FROM public.answer_choices c"
        " WHERE c.question_id=q.id),'null'::jsonb) IS DISTINCT FROM v->'choices'",
        " THEN RAISE EXCEPTION 'private draft changed: %',v->>'stable_question_id'; END IF;",
        " SELECT count(*) INTO n FROM public.answer_key_entries WHERE question_id=q.id;",
        " IF n<>1 THEN RAISE EXCEPTION 'answer key rows: %',v->>'stable_question_id'; END IF;",
        " SELECT * INTO STRICT k FROM public.answer_key_entries WHERE question_id=q.id FOR UPDATE;",
        " IF to_jsonb(k) IS DISTINCT FROM v->'key'",
        "  OR k.raw_model_response->>'student_publication_allowed'<>'false'",
        "  OR k.raw_model_response->'approved_tags' ? 'question_payload_sha256'",
        "  OR v->'evidence'->>'student_publication_allowed'<>'false'",
        " THEN RAISE EXCEPTION 'private answer changed: %',v->>'stable_question_id'; END IF;",
        " UPDATE public.answer_key_entries SET raw_model_response=v->'evidence' WHERE id=k.id;",
        " GET DIAGNOSTICS n=ROW_COUNT;",
        " IF n<>1 THEN RAISE EXCEPTION 'evidence update count: %',v->>'stable_question_id'; END IF;",
    ])


def _chunk_sql(name: str, k: int, total: int, rows_total: int, items: list, start: int, doc, exclude: str) -> str:
    slug = name.replace("-", "_")
    out = [f"-- kimport evidence update: run {name}, chunk {k} of {total} ({len(items)} of {rows_total} rows).",
           "-- Replaces only answer_key_entries.raw_model_response of private drafts held at seal earlier.",
           "-- One transaction: any failed guard aborts every row of this chunk. Nothing is published.",
           "BEGIN;", "",
           f"-- export {doc.exported_at}: {doc.row_count} rows, fingerprint {doc.fingerprint}"]
    out += bulk.run_fingerprint_block(f"kimport_evidence_{slug}_c{k:02d}_fingerprint", doc.row_count,
                                      doc.fingerprint, exclude)
    for n, it in enumerate(items, start):
        sec, mod, num = it["source"][1:]
        out.append(f"-- row {n}: {it['id']} (batch {it['batch']}; {sec} {mod} Q{num}); corrected evidence")
        out += evidence_block(f"kimport_evidence_{slug}_{n:04d}", it)
    return "\n".join(out + ["COMMIT;", ""])


def _predict(items: list[dict], sealer) -> dict:
    """{stable id: error} for rows the app's scope check would still reject once updated."""
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "predicted-readback.json"
        rows = [{"snapshot": {**it["snap"], "keys": [{**it["snap"]["keys"][0], EVIDENCE: it["row"]["key"][EVIDENCE]}]}}
                for it in items]
        path.write_text(json.dumps({"rows": rows}, ensure_ascii=False), encoding="utf-8")
        _, failed = sealer(path)
    qid_to_sid = {it["snap"]["question"]["id"]: it["id"] for it in items}
    return {qid_to_sid.get(f.get("question_id"), f.get("stable_question_id")): str(f.get("error")) for f in failed}


def build_fix(fix_dirs: list[Path], doc, name: str, snaps: list[dict], exams_dir: Path = bulk.EXAMS,
              exclude: str = "true", chunk_size: int = 0, rows_docs: dict | None = None,
              rows_runner=st.stage_rows, predict_sealer=None) -> dict:
    """Returns {"files", "preview_rows", "items", "refused", "refused_batches", "precheck"}.

    `snaps` is a fresh read-only readback of the drafts (st.readback_sql over
    the fix rows' sources); `exclude` is the run fingerprint exclusion of the
    run's newly staged rows ("true" when there are none)."""
    batches, refused_batches = bulk.load_batches(fix_dirs, exams_dir, rows_docs, rows_runner)
    items = [it for b in batches for it in b["items"]]
    by_source_export, by_source_snap = {}, {}
    for r in doc.rows:
        by_source_export.setdefault(st._source(r), []).append(r)
    for s in snaps:
        by_source_snap.setdefault(st._source(s.get("question") or {}), []).append(s)
    refused: dict[str, list[str]] = {}
    own_ids = set()
    for it in items:
        it["snap"], why = check_row(it, by_source_export.get(it["source"], []), by_source_snap.get(it["source"], []))
        if why:
            refused[it["id"]] = why
        elif it["snap"]:
            own_ids.add(it["snap"]["question"]["id"])
    others = [r for r in doc.rows if r["id"] not in own_ids]
    ok = [it for it in items if it["id"] not in refused]
    report, _ = duplicate_check(ok, others) if ok else ({"rows": []}, None)
    index = st.export_index(others)
    inside = bulk._run_conflicts(ok)
    for n, (it, rep) in enumerate(zip(ok, report["rows"])):
        why = (([f"same comparison key as {', '.join(rep['exact_matches'])}"] if rep["exact_matches"] else [])
               + ([f"typo-level match with {', '.join(rep['typo_matches'])}"] if rep["typo_matches"] else [])
               + st._export_conflicts(it, index) + inside.get(n, []))
        if why:
            refused[it["id"]] = why
    ok = [it for it in ok if it["id"] not in refused]
    if ok and predict_sealer is not None:
        for sid, err in _predict(ok, predict_sealer).items():
            refused.setdefault(sid, []).append(f"would still be held at seal: {err}")
        ok = [it for it in ok if it["id"] not in refused]
    files: dict[str, str] = {}
    chunks = []
    parts = bulk._chunks(ok, chunk_size) if ok else []
    names = bulk._names("evidence", len(parts)) if ok else []
    start = 1
    try:
        for k, (fname, part) in enumerate(zip(names, parts), 1):
            sql = _chunk_sql(name, k, len(parts), len(ok), part, start, doc, exclude)
            start += len(part)
            files[fname.replace(".sql", ".dryrun.sql")] = dryrun_variant(sql)
            files[fname] = sql
            chunks.append({"file": fname, "rows": len(part), "sha256": bulk._sha(sql)})
    except ValueError as e:
        raise RefuseToBuild(str(e)) from None
    rb_parts = bulk._chunks(ok, bulk.READBACK_ROWS) if ok else []
    rb_names = [f"fix-{n}" for n in bulk._names("readback", len(rb_parts))] if ok else []
    for k, (fname, part) in enumerate(zip(rb_names, rb_parts), 1):
        files[fname] = st.readback_sql(f"{name} corrected rows, part {k} of {len(rb_parts)}",
                                       [it["source"] for it in part])
    precheck = {"batch": name, "fix": True, "chunks": chunks, "readback_files": rb_names,
                "evidence_sql_sha256": bulk._sha("".join(files[c["file"]] for c in chunks)),
                "fixed_ids": [it["id"] for it in ok],
                "refused": [{"id": k, "reasons": v} for k, v in refused.items()],
                "refused_batches": [{"folder": k, "reason": v} for k, v in sorted(refused_batches.items())],
                "batches": {b["batch"]: {"folder": Path(b["dir"]).name, "rows": len(b["items"]),
                                         "fixed": sum(1 for it in ok if it["batch"] == b["batch"])}
                            for b in batches}}
    preview_rows = [{**st.preview_row(it["row"], it["key"]), "kimport_batch": it["batch"], "kimport_fix": True}
                    for it in ok]
    files = {"fix-precheck.json": st._dump(precheck), **files}
    return {"files": files, "preview_rows": preview_rows, "items": ok, "refused": refused,
            "refused_batches": refused_batches, "precheck": precheck}
