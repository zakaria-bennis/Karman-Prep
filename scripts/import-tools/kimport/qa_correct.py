"""QA corrections: a corrected version of a question QA took off the site goes
back on the site IN PLACE, on the same quiz_questions row.

Why in place, not a new row next to the archived one: the database has a
unique index on the source question (quiz_questions_source_identity_unique:
source_version, section, module, number, occurrence) that also covers archived
rows, and a unique (source_pdf, content_hash) index, so a second row for the
same source question cannot be inserted while the hidden one exists (the
whole stage chunk would abort). Student history (question_responses,
catalog_practice_responses, catalog_assignment_items) points at
quiz_questions.id without cascade, so the row must not be deleted either.
Updating it in place keeps the id, keeps that history attached, and leaves one
row per source question, so nothing else has to learn about replacements.

A row is a QA-hidden row when `k qa hide` took it off: archived_at set,
import_flag_reason starting 'qa:', publish_status needs_human_review,
import_status needs_review (so not live). A batch whose every row's source
question is a QA-hidden row is a QA correction batch (the reviewer rebuilt the
rows with the normal builders, same stable ids). A batch that mixes QA-hidden
and other rows is refused whole.

Per row, at build time (from a fresh read-only readback of the hidden row):
exactly one export row and one snapshot for its source question, the same id,
still QA-hidden, one answer key row naming the same stable id (read through
answer_evidence.stable_question_id, so a generated-key envelope counts), the same
source_occurrence, no source assets in the corrected payload (the row keeps
its own), the founder's figure gate passes (kimport.figure_gate, as stage and
publish apply it: a row that went live before the figure lane needs an
approved figure folder first), and the correction changes something (otherwise `k qa restore` is
the tool). Then the same duplicate checks as stage, against the bank without
this row and against every other row of the run.

qa-NN.sql: one BEGIN ... COMMIT per chunk, the run fingerprint guard first
(leaving out this run's staged rows and these rows), then per row: lock the
row, require it, its choices and its answer key to equal the snapshot exactly
and still be QA-hidden, the stage guards against every OTHER row, then turn
it back into a private draft exactly as stage would have inserted it: every
column from the corrected payload (question and mirror), every other column
back to its default (archived_at NULL, explanation and grader columns
cleared), comparison_key set; choices and the answer key replaced. Each has a
.dryrun.sql twin; qa-rollback-NN.sql puts the old row back (only while the
corrected content is still in place and not yet published). The rows then go
through readback, seal and publish with the run's staged rows, and after
publish the autopilot appends one line per row to pipeline/qa/corrections.jsonl.

Nothing here connects to a database; the SQL is text the autopilot runs only
after its dry-run twin passed.
"""

import json
from pathlib import Path

from kimport import bulk, qa_hide
from kimport import stage as st
from kimport.answer_evidence import GENERATED, stable_question_id
from kimport.export import fingerprint
from kimport.fix import _blob
from kimport.publish import STAGED_IMPORT, STAGED_STATUS, RefuseToBuild, duplicate_check
from kimport.sqlutil import do_block, dryrun_variant, lit

QA_PREFIX = "qa:"
KEEP_COLS = ("id", "created_at", "is_live", "comparison_key")  # is_live is generated; comparison_key set apart
CORRECTIONS = "corrections.jsonl"
NEW_TEXT = "v->'new'->'question'->>'question_text'"


def is_qa_hidden(q: dict) -> bool:
    return (q.get("archived_at") is not None and str(q.get("import_flag_reason") or "").startswith(QA_PREFIX)
            and q.get("publish_status") == STAGED_STATUS and q.get("import_status") == STAGED_IMPORT
            and q.get("is_live") is not True)


def hidden_sources(export_rows: list[dict]) -> set:
    return {st._source(r) for r in export_rows if is_qa_hidden(r)}


def kept_identities(export_rows: list[dict]) -> list[dict]:
    """The stored source tuples of the QA-hidden rows, for ts/stage-rows.ts <keep-identities.json>.

    A correction rewrites the hidden row in place, so it never creates an identity: a row
    whose identity the strict rule (math/reading, M1/M2) cannot read, such as the 2023-03 and
    2023-05 imports (module UNSPECIFIED, section writing), may keep one of these verbatim when
    it names it exactly (src/lib/question-bank/kept-source-identity.ts). The stable id is then
    checked against the hidden row's evidence by check_row; new rows stay strict."""
    names = ("source_version", "source_section", "source_module", "source_question_number")
    tuples = {s for s in hidden_sources(export_rows) if all(v not in (None, "") for v in s)}
    return [dict(zip(names, s)) for s in sorted(tuples, key=lambda s: tuple(map(str, s)))]


def split(dirs: list[Path], export_rows: list[dict], exams_dir: Path, rows_runner) -> tuple[list, list, dict]:
    """(QA correction batch folders, every other folder, {folder: reason} for batches that mix both)."""
    hidden = hidden_sources(export_rows)
    if not hidden or not dirs:
        return [], list(dirs), {}
    loaded, _ = bulk.load_batches(dirs, exams_dir, None, rows_runner)
    qa, mixed = set(), {}
    for b in loaded:
        hits = sum(1 for it in b["items"] if it["source"] in hidden)
        name = Path(b["dir"]).name
        if b["items"] and hits == len(b["items"]):
            qa.add(name)
        elif hits:
            mixed[name] = (f"{hits} of {len(b['items'])} rows correct questions QA hid; a QA correction batch "
                           "must hold only corrected rows")
    return ([d for d in dirs if d.name in qa],
            [d for d in dirs if d.name not in qa and d.name not in mixed], mixed)


def check_row(it: dict, export_rows: list[dict], snaps: list[dict]) -> tuple[dict | None, list[str]]:
    """(the hidden row's snapshot, reasons to refuse)."""
    if len(export_rows) != 1 or len(snaps) != 1:
        return None, [f"{len(export_rows)} bank rows and {len(snaps)} readback rows for its source question; "
                      "expected one"]
    snap, row = snaps[0], it["row"]
    q, out = snap.get("question") or {}, []
    if export_rows[0]["id"] != q.get("id"):
        out.append("the export and the readback name different rows")
    if not is_qa_hidden(q):
        out.append("the bank row is not a row QA hid (archived, qa: reason, private)")
    keys = snap.get("keys") or []
    if len(keys) != 1:
        out.append(f"{len(keys)} answer key rows on the hidden row; expected one")
    elif stable_question_id(keys[0].get("raw_model_response")) != it["id"]:
        out.append("the hidden row's evidence names another stable question id (or none: a legacy row is "
                   "fixed with k qa fix-legacy)")
    if row["question"].get("source_occurrence") != q.get("source_occurrence"):
        out.append("source_occurrence differs from the hidden row")
    if row.get("source_assets"):
        out.append("the corrected row carries source assets; a QA correction keeps the row's own")
    want = {**row["question"], **row["mirror"]}
    same_q = all(q.get(c) == v for c, v in want.items() if c not in ("import_status", "import_flag_reason",
                                                                       "publish_status"))
    have = sorted((c.get("letter"), c.get("choice_text"), c.get("is_correct")) for c in snap.get("choices") or [])
    same_c = have == sorted((c["letter"], c["choice_text"], c.get("is_correct")) for c in row["choices"])
    if same_q and same_c:
        out.append("the corrected row equals the hidden row; nothing was corrected (use k qa restore)")
    return snap, out


def _set_list(cols: list[str], payload_cols: set, keep: tuple) -> str:
    return ",".join(f"{c}=r.{c}" if c in payload_cols else f"{c}=DEFAULT" for c in cols if c not in keep)


def _norm_sql(expr: str) -> str:
    return (f"regexp_replace(translate(lower({expr}),'{st._SUPSUB_FROM}','{st._SUPSUB_TO}'),'[^a-z0-9]+','','g')")


def _lock_and_match(v: str, which: str, still: str) -> list[str]:
    """Lock the row and require it (question, choices, the one key) to equal v->which."""
    return [
        f" SELECT * INTO q FROM public.quiz_questions WHERE id=({v}->'{which}'->'question'->>'id')::uuid FOR UPDATE;",
        " IF NOT FOUND THEN RAISE EXCEPTION 'QA row missing: %',v->>'stable_question_id'; END IF;",
        f" IF to_jsonb(q) IS DISTINCT FROM {v}->'{which}'->'question' OR NOT ({still})",
        "  OR coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.letter) FROM public.answer_choices c"
        f" WHERE c.question_id=q.id),'null'::jsonb) IS DISTINCT FROM {v}->'{which}'->'choices'",
        "  OR (SELECT count(*) FROM public.answer_key_entries k WHERE k.question_id=q.id)<>1",
        "  OR (SELECT to_jsonb(k) FROM public.answer_key_entries k WHERE k.question_id=q.id)"
        f" IS DISTINCT FROM {v}->'{which}'->'keys'->0",
        " THEN RAISE EXCEPTION 'QA row changed since the readback: %',v->>'stable_question_id'; END IF;",
    ]


def correct_block(tag: str, it: dict) -> list[str]:
    snap, row = it["snap"], it["row"]
    old_q = snap["question"]
    new_q = {**row["question"], **row["mirror"]}
    qcols = sorted(old_q)
    unknown = sorted(set(new_q) - set(qcols))
    if unknown:
        raise RefuseToBuild(f"{it['id']}: the corrected row writes columns the readback does not have: {unknown}")
    v = {"stable_question_id": it["id"], "key": it["key"],
         "old": {"question": old_q, "choices": snap.get("choices"), "keys": snap["keys"]},
         "new": {"question": new_q, "choices": row["choices"], "key": row["key"]}}
    still = (f"q.archived_at IS NOT NULL AND q.import_flag_reason LIKE '{QA_PREFIX}%'"
             f" AND q.publish_status='{STAGED_STATUS}' AND q.import_status='{STAGED_IMPORT}'")
    body = [f"DECLARE v jsonb:={_blob(v)}; q public.quiz_questions%rowtype; n int;", "BEGIN"]
    body += _lock_and_match("v", "old", still)
    src = ("o.id<>q.id AND o.source_version IS NOT DISTINCT FROM q.source_version AND o.source_section IS NOT DISTINCT"
           " FROM q.source_section AND o.source_module IS NOT DISTINCT FROM q.source_module"
           " AND o.source_question_number IS NOT DISTINCT FROM q.source_question_number")
    body += [
        f" IF EXISTS (SELECT 1 FROM public.quiz_questions o WHERE {src})"
        " THEN RAISE EXCEPTION 'source question already in the bank on another row: %',v->>'stable_question_id'; END IF;",
        " IF EXISTS (SELECT 1 FROM public.quiz_questions o WHERE o.id<>q.id"
        " AND o.content_hash_v2::text=v->'new'->'question'->>'content_hash_v2')"
        " THEN RAISE EXCEPTION 'content_hash_v2 already in the bank: %',v->>'stable_question_id'; END IF;",
    ]
    if it["key"]:
        body.append(f" IF EXISTS (SELECT 1 FROM public.quiz_questions o WHERE o.id<>q.id AND o.comparison_key="
                    f"{lit(it['key'])} AND o.archived_at IS NULL) THEN RAISE EXCEPTION 'duplicate comparison key: %',"
                    "v->>'stable_question_id'; END IF;")
    body += [
        f" IF EXISTS (SELECT 1 FROM public.quiz_questions o WHERE o.id<>q.id AND {_norm_sql('o.question_text')}"
        f"={_norm_sql(NEW_TEXT)})"
        " THEN RAISE EXCEPTION 'normalized question text already in the bank: %',v->>'stable_question_id'; END IF;",
        f" UPDATE public.quiz_questions t SET {_set_list(qcols, set(new_q), KEEP_COLS)},comparison_key=v->>'key'",
        "  FROM jsonb_populate_record(NULL::public.quiz_questions,v->'new'->'question') r WHERE t.id=q.id;",
        " GET DIAGNOSTICS n=ROW_COUNT;",
        " IF n<>1 THEN RAISE EXCEPTION 'QA row update count: %',v->>'stable_question_id'; END IF;",
        " DELETE FROM public.answer_choices WHERE question_id=q.id;",
    ]
    if row["choices"]:
        ccols = list(row["choices"][0])
        body += [
            f" INSERT INTO public.answer_choices(question_id,{','.join(ccols)})",
            f"  SELECT q.id,{','.join(ccols)} FROM jsonb_populate_recordset(NULL::public.answer_choices,v->'new'->'choices');",
            " GET DIAGNOSTICS n=ROW_COUNT;",
            f" IF n<>{len(row['choices'])} THEN RAISE EXCEPTION 'choice count: %',v->>'stable_question_id'; END IF;",
        ]
    nk = list(row["key"])
    body += [
        " DELETE FROM public.answer_key_entries WHERE question_id=q.id;",
        f" INSERT INTO public.answer_key_entries(question_id,{','.join(nk)})",
        f"  SELECT q.id,{','.join(nk)} FROM jsonb_populate_record(NULL::public.answer_key_entries,v->'new'->'key');",
    ]
    return do_block(tag, body)


def rollback_block(tag: str, it: dict) -> list[str]:
    """Put the hidden row back exactly as the readback had it, only while the corrected private draft is in place."""
    snap, row = it["snap"], it["row"]
    old_q = snap["question"]
    new_q = {**row["question"], **row["mirror"]}
    v = {"stable_question_id": it["id"], "key": it["key"],
         "old": {"question": old_q, "choices": snap.get("choices"), "keys": snap["keys"]}, "new": new_q,
         "new_choices": len(row["choices"])}
    want = " AND ".join(
        [f"q.archived_at IS NULL AND q.publish_status='{STAGED_STATUS}' AND q.import_status='{STAGED_IMPORT}'",
         "q.content_hash_v2 IS NOT DISTINCT FROM v->'new'->>'content_hash_v2'",
         "q.question_text IS NOT DISTINCT FROM v->'new'->>'question_text'",
         "q.correct_answer IS NOT DISTINCT FROM v->'new'->>'correct_answer'",
         "(SELECT count(*) FROM public.answer_choices c WHERE c.question_id=q.id)=(v->>'new_choices')::int",
         "(SELECT count(*) FROM public.answer_key_entries k WHERE k.question_id=q.id)=1",
         # sealed = published: either envelope (a generated key keeps approved_tags under "evidence");
         # coalesce so an envelope without approved_tags reads as unsealed, never as NULL (which IF NOT skips)
         "NOT coalesce((SELECT CASE WHEN k.raw_model_response->>'kind'="
         f"'{GENERATED}' THEN k.raw_model_response->'evidence'->'approved_tags' ELSE"
         " k.raw_model_response->'approved_tags' END ? 'question_payload_sha256'"
         " FROM public.answer_key_entries k WHERE k.question_id=q.id),false)"])
    old_cols = sorted(old_q)
    body = [f"DECLARE v jsonb:={_blob(v)}; q public.quiz_questions%rowtype; n int;", "BEGIN",
            " SELECT * INTO q FROM public.quiz_questions WHERE id=(v->'old'->'question'->>'id')::uuid FOR UPDATE;",
            " IF NOT FOUND THEN RAISE EXCEPTION 'QA row missing: %',v->>'stable_question_id'; END IF;",
            f" IF NOT ({want}) THEN RAISE EXCEPTION 'QA row is not the corrected private draft: %',"
            "v->>'stable_question_id'; END IF;",
            f" UPDATE public.quiz_questions t SET {_set_list(old_cols, set(old_cols), ('id', 'is_live'))}",
            "  FROM jsonb_populate_record(NULL::public.quiz_questions,v->'old'->'question') r WHERE t.id=q.id;",
            " DELETE FROM public.answer_choices WHERE question_id=q.id;"]
    if snap.get("choices"):
        ccols = sorted(snap["choices"][0])
        body.append(f" INSERT INTO public.answer_choices({','.join(ccols)}) SELECT {','.join(ccols)}"
                    " FROM jsonb_populate_recordset(NULL::public.answer_choices,v->'old'->'choices');")
    kcols = sorted(snap["keys"][0])
    body += [" DELETE FROM public.answer_key_entries WHERE question_id=q.id;",
             f" INSERT INTO public.answer_key_entries({','.join(kcols)}) SELECT {','.join(kcols)}"
             " FROM jsonb_populate_record(NULL::public.answer_key_entries,v->'old'->'keys'->0);"]
    return do_block(tag, body)


def _chunk_sql(kind: str, name: str, k: int, total: int, rows_total: int, items: list, start: int, doc,
               fp_rows: tuple[int, str], exclude: str) -> str:
    slug = name.replace("-", "_")
    head = {"qa": f"-- kimport QA correction: run {name}, chunk {k} of {total} ({len(items)} of {rows_total} rows).\n"
                  "-- Turns questions QA hid back into private drafts with the reviewer's corrected content, in place"
                  " (same id).",
            "qa-rollback": f"-- kimport QA correction rollback: run {name}, chunk {k} of {total} ({len(items)} rows).\n"
                           "-- Puts the hidden rows back as they were, only while the correction is unpublished."}[kind]
    out = [head, "-- One transaction: any failed guard aborts every row of this chunk. Nothing is published.",
           "BEGIN;", ""]
    if kind == "qa":
        out.append(f"-- export {doc.exported_at}: {doc.row_count} rows, fingerprint {doc.fingerprint}; "
                   f"without this run's QA rows: {fp_rows[0]} rows, fingerprint {fp_rows[1]}")
        out += bulk.run_fingerprint_block(f"kimport_qa_{slug}_c{k:02d}_fingerprint", fp_rows[0], fp_rows[1],
                                          exclude)
    for n, it in enumerate(items, start):
        sec, mod, num = it["source"][1:]
        out.append(f"-- row {n}: {it['id']} (batch {it['batch']}; {sec} {mod} Q{num}); QA correction of "
                   f"{it['snap']['question']['id']}")
        tag = f"kimport_{kind.replace('-', '_')}_{slug}_{n:04d}"
        out += correct_block(tag, it) if kind == "qa" else rollback_block(tag, it)
    return "\n".join(out + ["COMMIT;", ""])


def build_correct(qa_dirs: list[Path], doc, name: str, snaps: list[dict], exams_dir: Path = bulk.EXAMS,
                  staged: list[dict] = (), chunk_size: int = 0, rows_docs: dict | None = None,
                  rows_runner=st.stage_rows) -> dict:
    """Returns {"files", "preview_rows", "items", "refused", "refused_batches", "precheck"}.

    `snaps` is a fresh read-only readback (st.readback_sql over the batches' sources);
    `staged` are the run's newly staged items (checked against these rows and left out
    of the fingerprint, as are these rows)."""
    batches, refused_batches = bulk.load_batches(qa_dirs, exams_dir, rows_docs, rows_runner)
    items = [it for b in batches for it in b["items"]]
    by_export, by_snap = {}, {}
    for r in doc.rows:
        by_export.setdefault(st._source(r), []).append(r)
    for s in snaps:
        by_snap.setdefault(st._source(s.get("question") or {}), []).append(s)
    refused: dict[str, list[str]] = {}
    for it in items:
        it["snap"], why = check_row(it, by_export.get(it["source"], []), by_snap.get(it["source"], []))
        why = why + it.get("figure_gate", [])  # the founder's figure gate, as stage and publish apply it
        why = why + it.get("qa_gate", [])  # the import publish gate (QA audit fail-level checks), as stage applies it
        if why:
            refused[it["id"]] = why
    ok = [it for it in items if it["id"] not in refused]
    own = {it["snap"]["question"]["id"] for it in ok}
    others = [r for r in doc.rows if r["id"] not in own]
    report, _ = duplicate_check(ok, others) if ok else ({"rows": []}, None)
    index = st.export_index(others)
    run = list(staged) + ok
    inside = bulk._run_conflicts(run)
    for n, (it, rep) in enumerate(zip(ok, report["rows"])):
        why = (([f"same comparison key as {', '.join(rep['exact_matches'])}"] if rep["exact_matches"] else [])
               + ([f"typo-level match with {', '.join(rep['typo_matches'])}"] if rep["typo_matches"] else [])
               + st._export_conflicts(it, index) + inside.get(len(staged) + n, []))
        if why:
            refused[it["id"]] = why
    ok = [it for it in ok if it["id"] not in refused]
    # The fingerprint covers the bank without this run's rows: the staged ones (not in the export, left out
    # by source) and these (in the export, left out by id, so the fingerprint is over the export without them).
    own = sorted(it["snap"]["question"]["id"] for it in ok)
    rest = [r for r in doc.rows if r["id"] not in set(own)]
    fp_rows = (len(rest), fingerprint(rest))
    exclude = " AND ".join(([bulk._source_exclude([it["source"] for it in staged])] if staged else [])
                           + ([bulk._id_exclude(own)] if own else [])) or "true"
    files: dict[str, str] = {}
    chunks = []
    parts = bulk._chunks(ok, chunk_size) if ok else []
    try:
        for kind in ("qa-rollback", "qa"):
            start = 1
            for k, (fname, part) in enumerate(zip(bulk._names(kind, len(parts)), parts), 1):
                sql = _chunk_sql(kind, name, k, len(parts), len(ok), part, start, doc, fp_rows, exclude)
                start += len(part)
                files[fname.replace(".sql", ".dryrun.sql")] = dryrun_variant(sql)
                files[fname] = sql
                if kind == "qa":
                    chunks.append({"file": fname, "rows": len(part), "sha256": bulk._sha(sql)})
    except ValueError as e:
        raise RefuseToBuild(str(e)) from None
    rb_parts = bulk._chunks(ok, bulk.READBACK_ROWS) if ok else []
    rb_names = [f"qa-{n}" for n in bulk._names("readback", len(rb_parts))] if ok else []
    for k, (fname, part) in enumerate(zip(rb_names, rb_parts), 1):
        files[fname] = st.readback_sql(f"{name} QA corrections, part {k} of {len(rb_parts)}",
                                       [it["source"] for it in part])
    corrections = [{"question_id": it["snap"]["question"]["id"], "stable_question_id": it["id"],
                    "batch": it["batch"], "qa_reason": it["snap"]["question"].get("import_flag_reason"),
                    "before_content_hash_v2": it["snap"]["question"].get("content_hash_v2"),
                    "after_content_hash_v2": it["row"]["question"].get("content_hash_v2"),
                    "before_correct_answer": it["snap"]["question"].get("correct_answer"),
                    "after_correct_answer": it["row"]["question"].get("correct_answer")} for it in ok]
    precheck = {"batch": name, "qa_correction": True, "chunks": chunks, "readback_files": rb_names,
                "qa_sql_sha256": bulk._sha("".join(files[c["file"]] for c in chunks)),
                "corrected_ids": [it["id"] for it in ok], "corrections": corrections,
                "refused": [{"id": k, "batch": next((i["batch"] for i in items if i["id"] == k), None),
                             "reasons": v} for k, v in refused.items()],
                "refused_batches": [{"folder": k, "reason": v} for k, v in sorted(refused_batches.items())],
                "batches": {b["batch"]: {"folder": Path(b["dir"]).name, "rows": len(b["items"]),
                                         "corrected": sum(1 for it in ok if it["batch"] == b["batch"])}
                            for b in batches}}
    preview_rows = [{**st.preview_row(it["row"], it["key"]), "kimport_batch": it["batch"], "kimport_qa": True}
                    for it in ok]
    files = {"qa-precheck.json": st._dump(precheck), **files}
    return {"files": files, "preview_rows": preview_rows, "items": ok, "refused": refused,
            "refused_batches": refused_batches, "precheck": precheck}


def record_corrections(qa_dir: Path, corrections: list[dict], published_ids: set, run: str, at: str) -> int:
    """Append one line per published correction to pipeline/qa/corrections.jsonl (the row keeps its id),
    then rewrite qa/restore.sql, which no longer lists the corrected rows (kimport.qa_hide.currently_hidden)."""
    rows = [{**c, "run": run, "at": at} for c in corrections if c["stable_question_id"] in published_ids]
    if not rows:
        return 0
    Path(qa_dir).mkdir(parents=True, exist_ok=True)
    with open(Path(qa_dir) / CORRECTIONS, "a", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, sort_keys=True, ensure_ascii=False) + "\n")
    if (Path(qa_dir) / "hidden.jsonl").exists():
        qa_hide.write_undo(Path(qa_dir))
    return len(rows)
