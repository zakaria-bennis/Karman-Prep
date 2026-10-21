"""Stage builder: reviewed batch -> hidden private draft rows, readback, seal.

`k stage` turns one reviewed batch (READY + reviewed-import-ready json + frozen
manifest + tag binding) into stage.sql: ONE transaction that inserts every row
exactly as the app's importQuestion() would (the payload comes from
ts/stage-rows.ts, which runs the real importer against a recording client), as
a private draft (import_status needs_review, publish_status needs_human_review,
answer key student_publication_allowed false). Each row is guarded in the
database by: no row with the same source tuple, no row with the same
content_hash_v2, no other non-archived row with the same comparison_key
(skipped for rows the key cannot represent; their key stays NULL), and the old
normalized question_text guard. comparison_key is set on insert. stage.sql
opens with the export fingerprint block, so it stops if the bank changed since
the export the precheck read.

Before writing SQL, the precheck (kimport.publish.duplicate_check, the same
check publish runs) refuses rows whose key or typo-level text matches a
non-archived export row or another row of the batch, and rows whose source
tuple, content hash or normalized text is already in the export. Refused rows
are listed in precheck.json; nothing else is written unless --skip-refused.

readback.sql reads the staged rows back in the private-readback shape
kimport.publish needs. `k seal` then checks that readback against the stage
preview, seals each row from the database row (ts/seal-readback.ts, the app's
catalogQuestionPayloadHash) and writes private-readback.json, private-scope.json
and sealed-preview.json for `k publish`.

Nothing here connects to a database; the SQL is text for a human-approved run.
"""

import base64
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path

from kimport import figure_gate
from kimport.answer_evidence import ambiguous, evidence_root
from kimport.export import _unwrap, read_export_doc
from kimport.keys import PASSAGE_FIELDS, UNKEYED_FIGURE_FIELDS, comparison_key, is_unkeyable
from kimport.publish import (MAX_ROWS, STAGED_IMPORT, STAGED_STATUS, RefuseToBuild, _BATCH,
                             _fingerprint_block, duplicate_check, require_key_column)
from kimport.sqlutil import do_block, dryrun_variant, lit
from kimport.sweep import record_from_row
from kimport.writer import OpenIntent, require_no_open_intents

REPO = Path(__file__).resolve().parents[3]
STAGE_ROWS_TS = REPO / "scripts/import-tools/ts/stage-rows.ts"
SEAL_TS = REPO / "scripts/import-tools/ts/seal-readback.ts"
_IDENT = re.compile(r"[a-z_][a-z0-9_]{0,62}")
_HEX64 = re.compile(r"[0-9a-f]{64}")
_READY_KEYS = ("reviewed_file", "frozen_manifest", "frozen_manifest_sha256", "tag_binding", "batch")


# ---------------------------------------------------------------- inputs


def read_ready(batch_dir: Path) -> dict:
    """The READY file's paths and frozen manifest sha (top-level `key: value` lines)."""
    path = Path(batch_dir) / "READY"
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as e:
        raise RefuseToBuild(f"cannot read {path}: {e}") from None
    ready = {}
    for line in text.splitlines():
        m = re.match(r"([a-z0-9_]+):\s*(.*)$", line)
        if m and m.group(1) in _READY_KEYS and m.group(2).strip():
            ready.setdefault(m.group(1), m.group(2).strip())
    for need in ("reviewed_file", "frozen_manifest", "frozen_manifest_sha256", "batch"):
        if need not in ready:
            raise RefuseToBuild(f"{path}: no `{need}:` line")
    ready["batch"] = ready["batch"].split()[0]
    if not _BATCH.fullmatch(ready["batch"]):
        raise RefuseToBuild(f"{path}: batch name {ready['batch']!r} must be lowercase letters, digits and dashes")
    if not _HEX64.fullmatch(ready["frozen_manifest_sha256"]):
        raise RefuseToBuild(f"{path}: frozen_manifest_sha256 is not a sha256 hex string")
    if "tag_binding" not in ready:
        found = sorted(Path(batch_dir).glob("*tag-binding.json"))
        if len(found) != 1:
            raise RefuseToBuild(f"{path}: no `tag_binding:` line and {len(found)} *tag-binding.json files")
        ready["tag_binding"] = str(found[0])
    return ready


def stage_rows(reviewed: Path, pdf: Path, frozen: Path, frozen_sha: str) -> dict:
    """Run ts/stage-rows.ts (the app's importer, recording only) and return its JSON."""
    cmd = ["npx", "--no-install", "tsx", str(STAGE_ROWS_TS), str(reviewed), str(pdf), str(frozen), frozen_sha]
    try:
        done = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True, timeout=300)
    except (OSError, subprocess.TimeoutExpired) as e:
        raise RefuseToBuild(f"cannot run {STAGE_ROWS_TS.name}: {e}") from None
    if done.returncode != 0:
        raise RefuseToBuild(f"{STAGE_ROWS_TS.name}: {done.stderr.strip() or done.stdout.strip()}")
    return json.loads(done.stdout)


def _sha256_file(path: Path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def _source(q: dict) -> tuple:
    return (q.get("source_version"), q.get("source_section"), q.get("source_module"),
            q.get("source_question_number"))


def _norm_text(s) -> str:
    """Python twin of regexp_replace(lower(t),'[^[:alnum:]]+','','g')."""
    return "".join(ch for ch in str(s or "").lower() if ch.isalnum())


def export_like(stable_id: str, row: dict) -> dict:
    """A staged payload row in live_export.sql shape, so sweep.record_from_row maps it."""
    q = row["question"]
    return {
        "id": stable_id, "question_text": q.get("question_text"), "correct_answer": q.get("correct_answer"),
        "question_format": q.get("answer_format"), "figure_kind": q.get("figure_kind"),
        "figure_table_data": q.get("figure_table_data"), "publish_status": q.get("publish_status"),
        "is_live": False, "created_at": None, "archived_at": None,
        **{f: q.get(f) for f in PASSAGE_FIELDS + UNKEYED_FIGURE_FIELDS},
        "choices": sorted(({"letter": c.get("letter"), "choice_text": c.get("choice_text"),
                            "choice_table_data": c.get("choice_table_data")} for c in row["choices"]),
                          key=lambda c: c["letter"] or ""),
    }


def make_items(rows: list[dict]) -> list[dict]:
    """One precheck item per staged row; sets the row's comparison_key (None when unkeyable)."""
    items = []
    for row in rows:
        try:
            record = record_from_row(export_like(row["stable_question_id"], row))
        except ValueError as e:
            raise RefuseToBuild(str(e)) from None
        if record.meta.get("answer_problem") or record.meta.get("format_problem"):
            raise RefuseToBuild(f"{row['stable_question_id']}: answer letter or format does not fit the choices")
        full_key = comparison_key(record)
        key = None if is_unkeyable(record) else full_key
        row["question"]["comparison_key"] = key
        items.append({"id": row["stable_question_id"], "source": _source(row["question"]), "row": row,
                      "record": record, "full_key": full_key, "key": key})
    return items


def _check_payload(rows: list[dict], binding_sha: str) -> None:
    if not rows:
        raise RefuseToBuild("the reviewed batch has no rows")
    if len(rows) > MAX_ROWS:
        raise RefuseToBuild(f"{len(rows)} rows; a batch is at most {MAX_ROWS} rows (one module)")
    modules = {_source(r["question"])[:3] for r in rows}
    if len(modules) != 1:
        raise RefuseToBuild(f"rows span {len(modules)} source modules; a batch is one module")
    sources = [_source(r["question"]) for r in rows]
    if len(set(sources)) != len(sources):
        raise RefuseToBuild("two rows share a source question")
    for r in rows:
        q, key, sid = r["question"], r["key"], r["stable_question_id"]
        if q.get("import_status") != STAGED_IMPORT or q.get("publish_status") != STAGED_STATUS:
            raise RefuseToBuild(f"{sid}: the importer would not write a private draft "
                                f"({q.get('import_status')}, {q.get('publish_status')})")
        raw = key.get("raw_model_response")
        root = evidence_root(raw)  # raw, or raw["evidence"] for an independently confirmed generated key
        tags = root.get("approved_tags") if isinstance(root, dict) else None
        if ambiguous(raw):
            raise RefuseToBuild(f"{sid}: generated-key evidence carries approved_tags at the top as well (ambiguous)")
        if not isinstance(tags, dict) or root.get("student_publication_allowed") is not False:
            raise RefuseToBuild(f"{sid}: answer key evidence must carry approved_tags and "
                                "student_publication_allowed false")
        if "question_payload_sha256" in tags:
            raise RefuseToBuild(f"{sid}: answer key evidence already carries a seal")
        if tags.get("tag_binding_manifest_sha256") != binding_sha:
            raise RefuseToBuild(f"{sid}: tag_binding_manifest_sha256 is not the sha256 of the batch's tag binding")
        cols = list(q) + [c for ch in r["choices"] for c in ch] + list(key) + list(r["mirror"])
        bad = [c for c in cols if not _IDENT.fullmatch(c)]
        if bad:
            raise RefuseToBuild(f"{sid}: unexpected column name {bad[0]!r}")


def export_index(export_rows: list[dict]) -> dict:
    """Export rows by source tuple, content hash and normalized text, for _export_conflicts."""
    idx = {"source": {}, "hash": {}, "text": {}}
    for r in export_rows:
        idx["source"].setdefault(_source(r), []).append(r["id"])
        idx["hash"].setdefault(r.get("content_hash_v2"), []).append(r["id"])
        idx["text"].setdefault(_norm_text(r.get("question_text")), []).append(r["id"])
    return idx


def _export_conflicts(it: dict, index: dict) -> list[str]:
    """Python twins of the stage.sql guards, so a refusal shows up before the SQL runs."""
    q, out = it["row"]["question"], []
    src = index["source"].get(it["source"], [])
    if src:
        out.append(f"source question already in the bank as {', '.join(src)}")
    same_hash = index["hash"].get(q.get("content_hash_v2"), [])
    if same_hash:
        out.append(f"content_hash_v2 already in the bank on {', '.join(same_hash)}")
    same_text = index["text"].get(_norm_text(q.get("question_text")), [])
    if same_text:
        out.append(f"normalized question_text already in the bank on {', '.join(same_text)}")
    return out


# ---------------------------------------------------------------- SQL


def _cols(names) -> str:
    return ",".join(names)


def _stage_block(tag: str, it: dict) -> list[str]:
    row, key = it["row"], it["key"]
    q = row["question"]
    blob = base64.b64encode(json.dumps({"stable_question_id": row["stable_question_id"], **{
        k: row[k] for k in ("question", "choices", "key", "mirror", "source_assets")}},
        ensure_ascii=False, separators=(",", ":")).encode()).decode()
    qcols = list(q)
    body = [
        f"DECLARE v jsonb:=convert_from(decode('{blob}','base64'),'UTF8')::jsonb; qid uuid; n int;",
        "BEGIN",
        "  IF EXISTS (SELECT 1 FROM public.quiz_questions o WHERE o.source_version::text=v->'question'->>'source_version'"
        " AND o.source_section::text=v->'question'->>'source_section' AND o.source_module::text=v->'question'->>'source_module'"
        " AND o.source_question_number=(v->'question'->>'source_question_number')::int)"
        " THEN RAISE EXCEPTION 'source question already in the bank: %',v->>'stable_question_id'; END IF;",
        "  IF EXISTS (SELECT 1 FROM public.quiz_questions o WHERE o.content_hash_v2::text=v->'question'->>'content_hash_v2')"
        " THEN RAISE EXCEPTION 'content_hash_v2 already in the bank: %',v->>'stable_question_id'; END IF;",
    ]
    if key:
        body.append(f"  IF EXISTS (SELECT 1 FROM public.quiz_questions o WHERE o.comparison_key={lit(key)}"
                    " AND o.archived_at IS NULL) THEN RAISE EXCEPTION 'duplicate comparison key: %',"
                    "v->>'stable_question_id'; END IF;")
    body += [
        "  IF EXISTS (SELECT 1 FROM public.quiz_questions o WHERE regexp_replace(lower(o.question_text),'[^[:alnum:]]+','','g')"
        "=regexp_replace(lower(v->'question'->>'question_text'),'[^[:alnum:]]+','','g'))"
        " THEN RAISE EXCEPTION 'normalized question text already in the bank: %',v->>'stable_question_id'; END IF;",
        f"  INSERT INTO public.quiz_questions({_cols(qcols)})",
        f"   SELECT {_cols(qcols)} FROM jsonb_populate_record(NULL::public.quiz_questions,v->'question') RETURNING id INTO qid;",
    ]
    if row["choices"]:
        ccols = list(row["choices"][0])
        body += [
            f"  INSERT INTO public.answer_choices(question_id,{_cols(ccols)})",
            f"   SELECT qid,{_cols(ccols)} FROM jsonb_populate_recordset(NULL::public.answer_choices,v->'choices');",
            "  GET DIAGNOSTICS n=ROW_COUNT;",
            f"  IF n<>{len(row['choices'])} THEN RAISE EXCEPTION 'choice count: %',v->>'stable_question_id'; END IF;",
        ]
    kcols = list(row["key"])
    body += [
        f"  INSERT INTO public.answer_key_entries(question_id,{_cols(kcols)})",
        f"   SELECT qid,{_cols(kcols)} FROM jsonb_populate_record(NULL::public.answer_key_entries,v->'key');",
        "  UPDATE public.quiz_questions t SET " + ",".join(f"{c}=r.{c}" for c in row["mirror"]),
        "   FROM jsonb_populate_record(NULL::public.quiz_questions,v->'mirror') r WHERE t.id=qid;",
    ]
    for n, asset in enumerate(row["source_assets"]):
        acols = list(asset)
        body += [f"  INSERT INTO public.source_assets(question_id,{_cols(acols)})",
                 f"   SELECT qid,{_cols(acols)} FROM jsonb_populate_record(NULL::public.source_assets,v->'source_assets'->{n});"]
    return do_block(tag, body)


def _stage_sql(batch: str, items: list[dict], doc) -> str:
    slug = batch.replace("-", "_")
    out = [f"-- kimport stage: batch {batch} ({len(items)} rows) as hidden private drafts.",
           "-- Needs the founder's go-ahead before it runs. One transaction: any failed guard aborts every row.",
           "-- Needs migration 20261021000000 (comparison_key column). Writes quiz_questions, answer_choices,",
           "-- answer_key_entries; nothing is published (publish_status needs_human_review).",
           "BEGIN;", "",
           f"-- export {doc.exported_at}: {doc.row_count} rows, fingerprint {doc.fingerprint}"]
    out += _fingerprint_block(f"kimport_stage_{slug}_fingerprint", doc)
    for n, it in enumerate(items, 1):
        sec, mod, num = it["source"][1:]
        what = f"key {it['key']}" if it["key"] else "figure: no database key"
        out.append(f"-- row {n}: {it['id']} ({sec} {mod} Q{num}); {what}")
        out += _stage_block(f"kimport_stage_{slug}_{n:02d}", it)
    return "\n".join(out + ["COMMIT;", ""])


def readback_sql(batch: str, sources: list[tuple]) -> str:
    """Read-only: the batch's rows in the private-readback shape kimport.publish reads."""
    tuples = ",\n    ".join(f"({lit(v)},{lit(s)},{lit(m)},{int(n)})" for v, s, m, n in sources)
    return (f"-- kimport private readback: batch {batch} ({len(sources)} rows). Read-only, changes nothing.\n"
            "-- Save the result, then: k seal --readback <saved file> --batch <batch dir> --out <batch dir>/stage/sealed-preview.json\n"
            "SELECT jsonb_build_object('rows', coalesce(jsonb_agg(jsonb_build_object('snapshot', jsonb_build_object(\n"
            "  'question', to_jsonb(q),\n"
            "  'choices', (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.letter) FROM public.answer_choices c WHERE c.question_id=q.id),\n"
            "  'keys', coalesce((SELECT jsonb_agg(to_jsonb(k) ORDER BY k.created_at, k.id) FROM public.answer_key_entries k"
            " WHERE k.question_id=q.id),'[]'::jsonb)))\n"
            "  ORDER BY q.source_question_number, q.id), '[]'::jsonb)) AS readback\n"
            "FROM public.quiz_questions q\n"
            "WHERE (q.source_version::text, q.source_section::text, q.source_module::text, q.source_question_number) IN (\n"
            f"    {tuples});\n")


def preview_row(row: dict, key) -> dict:
    """One stage-preview row: what was inserted, in the sealed-preview layout publish reads."""
    q = row["question"]
    return {"stable_question_id": row["stable_question_id"], **q, "comparison_key": key,
            "choices": {c["letter"]: c["choice_text"] for c in row["choices"]},
            "raw_choice_texts": {c["letter"]: c.get("raw_choice_text") for c in row["choices"]},
            "printed_answer": row["key"].get("printed_answer"),
            "independently_verified_answer": q.get("verified_answer"),
            "answer_evidence": row["key"].get("raw_model_response"),
            "stage_payload": {k: row[k] for k in ("question", "choices", "key", "mirror", "source_assets")}}


# ---------------------------------------------------------------- entry points


def _write_all(out_dir: Path, files: dict, remove: tuple = ()) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for name in remove:
        (out_dir / name).unlink(missing_ok=True)
    staged = []
    for name, text in files.items():
        tmp = out_dir / f".{name}.tmp"
        tmp.write_text(text, encoding="utf-8")
        staged.append((tmp, out_dir / name))
    for tmp, final in staged:  # stage.sql is last in `files`
        os.replace(tmp, final)


def _dump(x) -> str:
    return json.dumps(x, indent=2, ensure_ascii=False, sort_keys=True) + "\n"


def build_stage(batch_dir: Path, export: Path, pdf: Path, rows_doc: dict | None = None,
                skip_refused: bool = False, intents: Path | None = None) -> dict:
    """Returns {"batch", "files": {name: text}, "precheck", "staged", "refused"}."""
    if intents is not None:
        try:
            require_no_open_intents(Path(intents))
        except OpenIntent as e:
            raise RefuseToBuild(str(e)) from None
    ready = read_ready(batch_dir)
    batch = ready["batch"]
    try:
        doc = read_export_doc(export)
    except (OSError, ValueError) as e:
        raise RefuseToBuild(f"cannot use the export: {e}") from None
    require_key_column(doc.rows)
    binding_sha = _sha256_file(ready["tag_binding"])
    if rows_doc is None:
        rows_doc = stage_rows(Path(ready["reviewed_file"]), Path(pdf), Path(ready["frozen_manifest"]),
                              ready["frozen_manifest_sha256"])
    rows = rows_doc["rows"]
    _check_payload(rows, binding_sha)

    items = make_items(rows)
    figure_gate.mark_batch(batch_dir, ready["reviewed_file"], items)
    report, _ = duplicate_check(items, doc.rows)
    index = export_index(doc.rows)
    reasons: dict[str, list[str]] = {}
    for it, rep in zip(items, report["rows"]):
        reasons[it["id"]] = (
            ([f"same comparison key as {', '.join(rep['exact_matches'])}"] if rep["exact_matches"] else [])
            + ([f"typo-level match with {', '.join(rep['typo_matches'])}"] if rep["typo_matches"] else [])
            + _export_conflicts(it, index) + it["figure_gate"])
    refused = {k: v for k, v in reasons.items() if v}
    staged = [it for it in items if it["id"] not in refused]
    precheck = {"batch": batch, **report, "passed": not refused,
                "refused": [{"id": k, "reasons": v} for k, v in refused.items()],
                "reviewed_json_sha256": rows_doc.get("reviewed_json_sha256"),
                "source_pdf_sha256": rows_doc.get("source_pdf_sha256"),
                "tag_binding_manifest_sha256": binding_sha}
    if refused and not skip_refused:
        return {"batch": batch, "files": {"precheck.json": _dump(precheck)}, "precheck": precheck,
                "staged": [], "refused": refused}
    if not staged:
        raise RefuseToBuild("every row was refused; nothing to stage")
    try:
        sql = _stage_sql(batch, staged, doc)
    except ValueError as e:
        raise RefuseToBuild(str(e)) from None
    precheck["stage_sql_sha256"] = hashlib.sha256(sql.encode("utf-8")).hexdigest()
    precheck["staged_ids"] = [it["id"] for it in staged]
    preview = {"source_pdf_sha256": rows_doc.get("source_pdf_sha256"),
               "rows": [preview_row(it["row"], it["key"]) for it in staged]}
    files = {"readback.sql": readback_sql(batch, [it["source"] for it in staged]),
             "stage-preview.json": _dump(preview), "precheck.json": _dump(precheck),
             "stage.dryrun.sql": dryrun_variant(sql), "stage.sql": sql}
    return {"batch": batch, "files": files, "precheck": precheck, "staged": staged, "refused": refused}


STAGE_FILES = ("readback.sql", "stage-preview.json", "precheck.json", "stage.dryrun.sql", "stage.sql")


def run_stage(batch_dir: Path, export: Path, pdf: Path, out_dir: Path, skip_refused: bool = False,
              intents: Path | None = None) -> dict:
    res = build_stage(Path(batch_dir), Path(export), Path(pdf), skip_refused=skip_refused, intents=intents)
    stale = tuple(n for n in STAGE_FILES if n not in res["files"])
    _write_all(Path(out_dir), res["files"], remove=stale)
    out = {"batch": res["batch"], "staged": len(res["staged"]), "refused": len(res["refused"]),
           "keyed": sum(1 for it in res["staged"] if it["key"])}
    if res["refused"] and not skip_refused:
        detail = "; ".join(f"{k}: {' / '.join(v)}" for k, v in res["refused"].items())
        raise RefuseToBuild(f"{len(res['refused'])} rows refused, no stage.sql written (see precheck.json): {detail}")
    return out


# ---------------------------------------------------------------- seal


def seal_rows(readback_file: Path) -> list[dict]:
    """Run ts/seal-readback.ts (the app's catalogQuestionPayloadHash) on a saved readback."""
    cmd = ["npx", "--no-install", "tsx", str(SEAL_TS), str(readback_file)]
    try:
        done = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True, timeout=300)
    except (OSError, subprocess.TimeoutExpired) as e:
        raise RefuseToBuild(f"cannot run {SEAL_TS.name}: {e}") from None
    if done.returncode != 0:
        raise RefuseToBuild(f"{SEAL_TS.name}: {done.stderr.strip() or done.stdout.strip()}")
    return json.loads(done.stdout)["rows"]


def _diff(where: str, expected: dict, stored: dict) -> None:
    for col, want in expected.items():
        if col not in stored:
            raise RefuseToBuild(f"{where}: the readback has no {col} column")
        if stored[col] != want:
            raise RefuseToBuild(f"{where}: {col} in the database differs from what stage.sql inserted")


def check_readback(readback: dict, preview: dict) -> list[dict]:
    """The readback must hold exactly the staged rows, as inserted. Returns the snapshots
    in stage-preview order."""
    try:
        snaps = [x["snapshot"] for x in readback["rows"]]
        prows = list(preview["rows"])
    except (KeyError, TypeError):
        raise RefuseToBuild("readback or stage preview is not in the {\"rows\": [...]} shape") from None
    if len(snaps) != len(prows):
        raise RefuseToBuild(f"{len(snaps)} readback rows but {len(prows)} staged rows")
    by_source = {}
    for s in snaps:
        q = s.get("question") if isinstance(s, dict) else None
        if not isinstance(q, dict):
            raise RefuseToBuild("a readback row has no question")
        by_source.setdefault(_source(q), []).append(s)
    ordered = []
    for p in prows:
        sid, payload = p["stable_question_id"], p["stage_payload"]
        found = by_source.get(_source(payload["question"]), [])
        if len(found) != 1:
            raise RefuseToBuild(f"{sid}: {len(found)} database rows for its source question; expected one")
        snap = found[0]
        q = snap["question"]
        _diff(sid, {**payload["question"], **payload["mirror"]}, q)
        if not (q.get("is_live") is False and q.get("archived_at") is None):
            raise RefuseToBuild(f"{sid}: the staged row is live or archived")
        choices = snap.get("choices") or []
        if [c.get("letter") for c in choices] != sorted(c["letter"] for c in payload["choices"]):
            raise RefuseToBuild(f"{sid}: the database choices differ from the staged choices")
        if payload["choices"] == [] and snap.get("choices") is not None:
            raise RefuseToBuild(f"{sid}: a {q.get('answer_format')} row has choices")
        for want, got in zip(sorted(payload["choices"], key=lambda c: c["letter"]), choices):
            _diff(f"{sid} choice {want['letter']}", want, got)
            if got.get("question_id") != q.get("id"):
                raise RefuseToBuild(f"{sid}: choice {want['letter']} belongs to another question")
        keys = snap.get("keys") or []
        if len(keys) != 1:
            raise RefuseToBuild(f"{sid}: {len(keys)} answer key rows; expected one")
        _diff(f"{sid} answer key", payload["key"], keys[0])
        ordered.append(snap)
    return ordered


def seal_rows_per_row(readback_file: Path) -> tuple[list[dict], list[dict]]:
    """ts/seal-readback.ts --per-row: (seals for the rows that pass, [{question_id,
    stable_question_id, error}] for the rows the app's scope check rejects)."""
    cmd = ["npx", "--no-install", "tsx", str(SEAL_TS), str(readback_file), "--per-row"]
    try:
        done = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True, timeout=300)
    except (OSError, subprocess.TimeoutExpired) as e:
        raise RefuseToBuild(f"cannot run {SEAL_TS.name}: {e}") from None
    if done.returncode != 0:
        raise RefuseToBuild(f"{SEAL_TS.name}: {done.stderr.strip() or done.stdout.strip()}")
    doc = json.loads(done.stdout)
    return doc["rows"], doc.get("failed", [])


HELD_REASON = "classification_review"


def _seal_fits(p: dict, q: dict, seal: dict) -> bool:
    return (seal.get("question_id") == q["id"] and seal.get("stable_question_id") == p["stable_question_id"]
            and seal.get("content_hash_v2") == q.get("content_hash_v2")
            and seal.get("publication_allowed_in_snapshot") is False
            and bool(_HEX64.fullmatch(str(seal.get("question_payload_sha256")))))


def _hold(prev_rows, snaps, row_sealer, tmp: Path):
    """Seal row by row; returns (kept preview rows, kept snaps, seals, held entries)."""
    seals, failed = row_sealer(tmp)
    by_qid = {s.get("question_id"): s for s in seals}
    why = {f.get("question_id"): str(f.get("error") or "cannot be sealed") for f in failed}
    if len(seals) + len(failed) != len(snaps) or set(by_qid) & set(why):
        raise RefuseToBuild(f"{len(seals)} seals and {len(failed)} held rows for {len(snaps)} rows")
    kept_p, kept_s, kept_seals, held = [], [], [], []
    for p, snap in zip(prev_rows, snaps):
        qid = snap["question"]["id"]
        if qid in why:
            held.append({"stable_question_id": p["stable_question_id"], "question_id": qid,
                         "batch": p.get("kimport_batch"), "reason": why[qid]})
        elif qid in by_qid:
            kept_p.append(p)
            kept_s.append(snap)
            kept_seals.append(by_qid[qid])
        else:
            raise RefuseToBuild(f"{p['stable_question_id']}: neither sealed nor held")
    return kept_p, kept_s, kept_seals, held


def run_seal(readback, batch_dir: Path | None, out: Path, preview: Path | None = None,
             sealer=seal_rows, hold_failing: bool = False, row_sealer=None, lane_path: Path | None = None,
             now: str | None = None) -> dict:
    """Check a saved stage readback, seal it, and write private-readback.json,
    private-scope.json and sealed-preview.json (the last at `out`).

    `readback` is one saved file or a list of them (a bulk run reads back in
    chunks); their rows are joined. Without `batch_dir`, `preview` is required
    and the run name comes from its "batch" field (kimport.bulk).

    hold_failing: a row the app's catalog scope check rejects (for example
    evidence without the skill review record) is held instead of stopping the
    seal: it is listed with the reason in held.json beside `out`, added to the
    lane (`lane_path`) as classification_review, and left out of every file
    publish reads. Every other check still refuses the whole seal."""
    if batch_dir is None and preview is None:
        raise RefuseToBuild("seal needs a batch folder or a stage preview")
    if hold_failing and lane_path is not None and not now:
        raise RefuseToBuild("--hold-failing with a lane needs --now")
    preview = Path(preview) if preview else Path(batch_dir) / "stage" / "stage-preview.json"
    files = [Path(readback)] if isinstance(readback, (str, Path)) else [Path(f) for f in readback]
    try:
        prev = json.loads(preview.read_text(encoding="utf-8"))
        parts = [_unwrap(json.loads(f.read_text(encoding="utf-8"))) for f in files]
    except (OSError, ValueError) as e:
        raise RefuseToBuild(f"cannot read the readback or stage preview: {e}") from None
    if not files or not all(isinstance(x, dict) and isinstance(x.get("rows"), list) for x in parts):
        raise RefuseToBuild("the readback is not one {\"rows\": [...]} object")
    batch = read_ready(batch_dir)["batch"] if batch_dir is not None else prev.get("batch")
    if not isinstance(batch, str) or not _BATCH.fullmatch(batch):
        raise RefuseToBuild(f"stage preview {preview} has no usable batch name")
    raw = {"rows": [r for x in parts for r in x["rows"]]}
    snaps = check_readback(raw, prev)
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    private = out.parent / "private-readback.json"
    tmp = out.parent / ".private-readback.json.tmp"

    def write_tmp(rows):
        tmp.write_text(json.dumps({"rows": [{"snapshot": s} for s in rows]}, ensure_ascii=False, indent=1) + "\n",
                       encoding="utf-8")

    write_tmp(snaps)
    prows, held = list(prev["rows"]), []
    try:
        if hold_failing:
            prows, snaps, seals, held = _hold(prows, snaps, row_sealer or seal_rows_per_row, tmp)
            write_tmp(snaps)
        else:
            seals = sealer(tmp)
        if len(seals) != len(snaps):
            raise RefuseToBuild(f"{len(seals)} seals for {len(snaps)} rows")
        sealed_rows = []
        for p, snap, seal in zip(prows, snaps, seals):
            if not _seal_fits(p, snap["question"], seal):
                raise RefuseToBuild(f"{p['stable_question_id']}: seal does not fit the row (or the row is publishable)")
            row = {k: v for k, v in p.items() if k != "stage_payload"}
            sealed_rows.append({**row, "question_payload_sha256": seal["question_payload_sha256"]})
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise
    if hold_failing:
        _write_all(out.parent, {"held.json": _dump({"batch": batch, "held": held})})
        if held and lane_path is not None:
            from kimport.lane import add_open
            add_open(Path(lane_path), {h["stable_question_id"]: (HELD_REASON, f"held at seal in {batch}: {h['reason']}")
                                       for h in held}, now, "seal")
    os.replace(tmp, private)
    _write_all(out.parent, {"private-scope.json": _dump({"batch": batch, "rows": seals})})
    _write_all(out.parent, {out.name: _dump({"source_pdf_sha256": prev.get("source_pdf_sha256"),
                                             "rows": sealed_rows})})
    return {"batch": batch, "rows": len(sealed_rows), "held": len(held), "readback": str(private),
            "sealed": str(out)}
