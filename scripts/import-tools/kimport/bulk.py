"""Bulk stage and publish: many reviewed batches in one run.

`k stage --batches <dir> <dir> ... --name <run>` builds the stage SQL for every
ready row of every batch at once: each batch is checked exactly as single-batch
`k stage` checks it (READY, tag binding, frozen manifest, the batch's own exam
PDF, the 27-row one-module payload rules), and every row then goes through the
same precheck against the export plus a check across the whole run (no two
rows of the run share a source question, content hash, normalized text,
comparison key or typo-level text). With --skip-refused, refused rows and
refused batches are listed in precheck.json and left out; the rest is staged.

`k publish --bulk` takes the run's combined private readback and sealed preview
and keeps every per-row guard of single-batch publish; only the 27-row and
one-module limits are lifted.

Chunks. A run may be written as several files of --chunk-size rows (each its
own BEGIN ... COMMIT), because the Management API limits request size and
time. Every chunk opens with a run fingerprint guard: the bank, leaving out
this run's own rows, must still be exactly the exported bank. For stage the
run's rows are found by source question (none is in the export: the precheck
refuses those), for publish by question id (all are in the export). So the
guard holds before, between and after chunks, chunks may run in any order, a
failed chunk can be re-run on its own, and each chunk's .dryrun.sql works
against the bank as it is now. Any other change to the bank stops every chunk
not yet run. Rows of the run are covered by their own per-row guards.

Nothing here connects to a database; the SQL is text for a human-approved run.
"""

import hashlib
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from kimport import bank_gate, figure_gate, qa_gate
from kimport.answer_evidence import evidence_root
from kimport import stage as st
from kimport.export import FINGERPRINT_SQL, fingerprint, read_export_doc
from kimport.publish import (FINGERPRINT_FAILED, RefuseToBuild, _BATCH, _publish_block, _rollback_block,
                             _row_note, duplicate_check, prepare_publish, require_key_column)
from kimport.sqlutil import do_block, dryrun_variant, lit, uuid_literal
from kimport.writer import OpenIntent, require_no_open_intents

EXAMS = Path("/Users/zakariabennis/Documents/Codex/2026-10-05/task/agent-a-output/exams")
READBACK_ROWS = 100  # rows per readback file: a whole run's readback is too large for one result
WORKERS = 6


# ---------------------------------------------------------------- inputs


def find_pdf(ready: dict, exams_dir: Path, new_exams_dir: Path | None = None) -> Path:
    """The batch's exam PDF, under the file name its reviewed rows give in source_pdf
    (stage-rows' preflight requires that name to match the file it is handed).

    New-exam forms were copied to <pipeline>/new-exams/<exam>/source/<source_pdf>;
    ledger exams sit at exams/<exam>/original_exam.pdf. The new-exam copy is looked
    for first, then exams/<exam>/<source_pdf>. The file must match the frozen
    manifest's source_pdf_sha256 and every row's sourceVersion.sha256."""
    try:
        reviewed = json.loads(Path(ready["reviewed_file"]).read_text(encoding="utf-8"))
        manifest = json.loads(Path(ready["frozen_manifest"]).read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        raise RefuseToBuild(f"cannot read the reviewed file or frozen manifest: {e}") from None
    qs = [q for q in (reviewed.get("questions") if isinstance(reviewed, dict) else None) or []
          if isinstance(q, dict)]
    docs = {q.get("source_document_id") for q in qs}
    if len(docs) != 1 or not isinstance(next(iter(docs)), str):
        raise RefuseToBuild(f"reviewed rows name {len(docs)} source documents; expected one exam")
    doc = next(iter(docs))
    if "/" in doc or doc.startswith("."):
        raise RefuseToBuild(f"unexpected source_document_id {doc!r}")
    names = {q.get("source_pdf") or "original_exam.pdf" for q in qs}
    if len(names) != 1 or not isinstance(next(iter(names)), str):
        raise RefuseToBuild(f"reviewed rows name {len(names)} source PDF files; expected one")
    name = next(iter(names))
    if "/" in name or "\\" in name or name.startswith("."):
        raise RefuseToBuild(f"unexpected source_pdf {name!r}")
    want = manifest.get("source_pdf_sha256")
    row_shas = {(q.get("sourceVersion") or {}).get("sha256") for q in qs} - {None}
    if row_shas - {want}:
        raise RefuseToBuild("reviewed rows' sourceVersion.sha256 differs from the frozen manifest's "
                            "source_pdf_sha256")
    candidates = ([Path(new_exams_dir) / doc / "source" / name] if new_exams_dir else []) \
        + [Path(exams_dir) / doc / name]
    found = [p for p in candidates if p.is_file()]
    if not found:
        raise RefuseToBuild(f"no exam PDF named {name} at {' or '.join(str(p) for p in candidates)}")
    for pdf in found:
        if st._sha256_file(pdf) == want:
            return pdf
    raise RefuseToBuild(f"{found[0]} does not match the frozen manifest's source_pdf_sha256")


def new_exams_dir_for(batch_dir: Path) -> Path:
    """<pipeline>/new-exams for a batch folder at <pipeline>/batches/<name>."""
    return Path(batch_dir).resolve().parent.parent / "new-exams"


def ready_dirs(paths) -> list[Path]:
    """The given batch folders that have a READY file, in name order, each once."""
    return [p for p in sorted({Path(p).resolve() for p in paths}, key=lambda p: _natural(p.name))
            if (p / "READY").is_file()]


def _natural(name: str):
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", name)]


def _load_batch(d: Path, exams_dir: Path, rows_doc, rows_runner) -> dict:
    ready = st.read_ready(d)
    binding_sha = st._sha256_file(ready["tag_binding"])
    if rows_doc is None:
        pdf = find_pdf(ready, exams_dir, new_exams_dir_for(d))
        rows_doc = rows_runner(Path(ready["reviewed_file"]), pdf, Path(ready["frozen_manifest"]),
                               ready["frozen_manifest_sha256"])
    rows = rows_doc["rows"]
    st._check_payload(rows, binding_sha)
    items = st.make_items(rows)
    figure_gate.mark_batch(d, ready["reviewed_file"], items)
    for it in items:
        it["batch"] = ready["batch"]
    return {"batch": ready["batch"], "dir": str(d), "items": items, "binding_sha": binding_sha,
            "source_pdf_sha256": rows_doc.get("source_pdf_sha256"),
            "reviewed_json_sha256": rows_doc.get("reviewed_json_sha256")}


def load_batches(dirs: list[Path], exams_dir: Path, rows_docs: dict | None = None,
                 rows_runner=st.stage_rows, workers: int = WORKERS) -> tuple[list[dict], dict]:
    """(loaded batches, {batch folder name: refusal reason})."""
    def one(d):
        try:
            return _load_batch(d, exams_dir, (rows_docs or {}).get(d.name), rows_runner)
        except RefuseToBuild as e:
            return {"refused": e.reason, "dir": d}
    with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        results = list(pool.map(one, dirs))
    loaded = [r for r in results if "refused" not in r]
    refused = {r["dir"].name: r["refused"] for r in results if "refused" in r}
    qa_gate.mark_items([it for b in loaded for it in b["items"]])  # the import publish gate, one run for all
    names = [b["batch"] for b in loaded]
    for b in loaded:
        if names.count(b["batch"]) > 1:
            refused[Path(b["dir"]).name] = f"batch name {b['batch']} is used by more than one folder"
    return [b for b in loaded if Path(b["dir"]).name not in refused], refused


# ---------------------------------------------------------------- precheck


def _run_conflicts(items: list[dict]) -> dict[int, list[str]]:
    """Rows of the run that share a stable id, source question, content hash or
    normalized text with another row of the run (the stage.sql guards would stop
    the later one at run time). Keyed by position in `items`."""
    out: dict[int, list[str]] = {}
    tests = (("stable question id", lambda it: it["id"]),
             ("source question", lambda it: it["source"]),
             ("content_hash_v2", lambda it: it["row"]["question"].get("content_hash_v2")),
             ("normalized question_text", lambda it: st._norm_text(it["row"]["question"].get("question_text"))))
    for what, fn in tests:
        groups: dict = {}
        for n, it in enumerate(items):
            groups.setdefault(fn(it), []).append(n)
        # Identical content (same hash or same normalized text): keep the first copy and refuse the rest,
        # otherwise no copy is ever published. Conflicting claims to one question (same stable id or
        # same source question with different content) stay refused on every side: we can't tell which is right.
        keep_first = what in ("content_hash_v2", "normalized question_text")
        for members in groups.values():
            if len(members) > 1:
                for n in (members[1:] if keep_first else members):
                    others = [m for m in members if m != n] if not keep_first else [members[0]]
                    names = ", ".join(f"{items[m]['id']} ({items[m]['batch']})" for m in others)
                    out.setdefault(n, []).append(f"same {what} as {names} in this run")
    return out


# ---------------------------------------------------------------- SQL


def _chunks(seq: list, size: int) -> list[list]:
    if not size or size >= len(seq):
        return [seq]
    return [seq[i:i + size] for i in range(0, len(seq), size)]


def _names(prefix: str, n: int) -> list[str]:
    return [f"{prefix}.sql"] if n == 1 else [f"{prefix}-{i:02d}.sql" for i in range(1, n + 1)]


def run_fingerprint_block(tag: str, row_count: int, fp: str, exclude: str) -> list[str]:
    """The bank, leaving out this run's own rows (`exclude`, a condition on q), must
    still be exactly the exported bank (same fingerprint formula as the export)."""
    return do_block(tag, [
        "DECLARE n bigint; f text;",
        "BEGIN",
        f" SELECT count(*), {FINGERPRINT_SQL} INTO n, f FROM public.quiz_questions q WHERE {exclude};",
        f" IF n <> {int(row_count)} OR f IS DISTINCT FROM {lit(fp)}",
        f" THEN RAISE EXCEPTION {lit(FINGERPRINT_FAILED)}; END IF;",
    ])


def _source_exclude(sources: list[tuple]) -> str:
    values = ",".join(f"({lit(v)},{lit(s)},{lit(m)},{int(n)})" for v, s, m, n in sources)
    return ("NOT EXISTS (SELECT 1 FROM (VALUES " + values + ") r(v,s,m,n) WHERE r.v=q.source_version::text"
            " AND r.s=q.source_section::text AND r.m=q.source_module::text AND r.n=q.source_question_number)")


def _id_exclude(ids: list[str]) -> str:
    return "q.id <> ALL (ARRAY[" + ",".join(f"'{uuid_literal(i)}'" for i in ids) + "]::uuid[])"


def _stage_chunk(name: str, k: int, total: int, rows_total: int, items: list[dict], start: int, doc,
                 exclude: str) -> str:
    slug = name.replace("-", "_")
    out = [f"-- kimport bulk stage: run {name}, chunk {k} of {total} ({len(items)} of {rows_total} rows) "
           "as hidden private drafts.",
           "-- Needs the founder's go-ahead before it runs. One transaction: any failed guard aborts every row "
           "of this chunk.",
           "-- Chunks are independent: each checks the bank minus this run's rows against the export, so they "
           "may run in any order.",
           "-- Writes quiz_questions, answer_choices, answer_key_entries; nothing is published.",
           "BEGIN;", "",
           f"-- export {doc.exported_at}: {doc.row_count} rows, fingerprint {doc.fingerprint}"]
    out += run_fingerprint_block(f"kimport_stage_{slug}_c{k:02d}_fingerprint", doc.row_count, doc.fingerprint,
                                 exclude)
    for n, it in enumerate(items, start):
        sec, mod, num = it["source"][1:]
        what = f"key {it['key']}" if it["key"] else "figure: no database key"
        out.append(f"-- row {n}: {it['id']} (batch {it['batch']}; {sec} {mod} Q{num}); {what}")
        out += st._stage_block(f"kimport_stage_{slug}_{n:04d}", it)
    return "\n".join(out + ["COMMIT;", ""])


def _sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------- stage


def build_bulk_stage(batch_dirs, export: Path, name: str, exams_dir: Path = EXAMS, skip_refused: bool = False,
                     intents: Path | None = None, chunk_size: int = 0, rows_docs: dict | None = None,
                     rows_runner=st.stage_rows) -> dict:
    """Returns {"files": {name: text}, "precheck", "staged", "refused", "refused_batches"}."""
    if not isinstance(name, str) or not _BATCH.fullmatch(name):
        raise RefuseToBuild(f"run name {name!r} must be lowercase letters, digits and dashes")
    if intents is not None:
        try:
            require_no_open_intents(Path(intents))
        except OpenIntent as e:
            raise RefuseToBuild(str(e)) from None
    try:
        doc = read_export_doc(export)
    except (OSError, ValueError) as e:
        raise RefuseToBuild(f"cannot use the export: {e}") from None
    require_key_column(doc.rows)
    dirs = ready_dirs(batch_dirs)
    if not dirs:
        raise RefuseToBuild("no batch folder with a READY file")
    batches, refused_batches = load_batches(dirs, exams_dir, rows_docs, rows_runner)
    items = [it for b in batches for it in b["items"]]
    if not items:
        err = RefuseToBuild("no batch could be loaded: " + "; ".join(f"{k}: {v}" for k, v in refused_batches.items()))
        err.precheck = {"batch": name, "bulk": True, "batches": {}, "refused": [],
                        "refused_batches": [{"folder": k, "reason": v} for k, v in sorted(refused_batches.items())]}
        raise err

    report, _ = duplicate_check(items, doc.rows)
    index = st.export_index(doc.rows)
    inside = _run_conflicts(items)
    live = bank_gate.staged_reasons(items, doc.rows)  # the same question as a live row, a printed twin's key
    refused: dict[int, list[str]] = {}
    for n, (it, rep) in enumerate(zip(items, report["rows"])):
        reasons = (([f"same comparison key as {', '.join(rep['exact_matches'])}"] if rep["exact_matches"] else [])
                   + ([f"typo-level match with {', '.join(rep['typo_matches'])}"] if rep["typo_matches"] else [])
                   + st._export_conflicts(it, index) + inside.get(n, []) + it.get("figure_gate", [])
                   + it.get("qa_gate", []) + live.get(it["id"], []))
        rep["batch"] = it["batch"]
        if reasons:
            refused[n] = reasons
    staged = [it for n, it in enumerate(items) if n not in refused]
    if any(it["source"] in index["source"] for it in staged):  # the stage guard relies on this
        raise RefuseToBuild("a staged row's source question is in the export")
    per_batch = {b["batch"]: {"folder": Path(b["dir"]).name, "rows": len(b["items"]),
                              "staged": sum(1 for it in staged if it["batch"] == b["batch"]),
                              "source_pdf_sha256": b["source_pdf_sha256"],
                              "reviewed_json_sha256": b["reviewed_json_sha256"],
                              "tag_binding_manifest_sha256": b["binding_sha"]} for b in batches}
    precheck = {"batch": name, "bulk": True, **report, "passed": not refused and not refused_batches,
                "batches": per_batch,
                "refused_batches": [{"folder": k, "reason": v} for k, v in sorted(refused_batches.items())],
                "refused": [{"id": items[n]["id"], "batch": items[n]["batch"], "reasons": r}
                            for n, r in refused.items()]}
    res = {"precheck": precheck, "staged": [], "refused": refused, "refused_batches": refused_batches}
    if (refused or refused_batches) and not skip_refused:
        return {**res, "files": {"precheck.json": st._dump(precheck)}}
    if not staged:
        err = RefuseToBuild("every row was refused; nothing to stage")
        err.precheck = precheck  # the autopilot records the reasons
        raise err

    exclude = _source_exclude([it["source"] for it in staged])
    parts = _chunks(staged, chunk_size)
    names = _names("stage", len(parts))
    files: dict[str, str] = {}
    chunks, start = [], 1
    try:
        for k, (fname, part) in enumerate(zip(names, parts), 1):
            sql = _stage_chunk(name, k, len(parts), len(staged), part, start, doc, exclude)
            start += len(part)
            files[fname.replace(".sql", ".dryrun.sql")] = dryrun_variant(sql)
            files[fname] = sql
            chunks.append({"file": fname, "rows": len(part), "sha256": _sha(sql),
                           "first_id": part[0]["id"], "last_id": part[-1]["id"]})
    except ValueError as e:
        raise RefuseToBuild(str(e)) from None
    rb_parts = _chunks(staged, READBACK_ROWS)
    rb_names = _names("readback", len(rb_parts))
    for k, (fname, part) in enumerate(zip(rb_names, rb_parts), 1):
        files[fname] = st.readback_sql(f"{name} part {k} of {len(rb_parts)}", [it["source"] for it in part])
    precheck.update({
        "chunks": chunks, "readback_files": rb_names,
        "stage_sql_sha256": _sha("".join(files[c["file"]] for c in chunks)),
        "staged_ids": [it["id"] for it in staged]})
    preview = {"batch": name, "source_pdf_sha256": None,
               "rows": [{**st.preview_row(it["row"], it["key"]), "kimport_batch": it["batch"]} for it in staged]}
    files = {"stage-preview.json": st._dump(preview), "precheck.json": st._dump(precheck), **files}
    return {**res, "files": files, "staged": staged}


def _clear(out_dir: Path, patterns: tuple) -> None:
    for pat in patterns:
        for f in Path(out_dir).glob(pat):
            f.unlink()


def run_bulk_stage(batch_dirs, export: Path, name: str, out_dir: Path, exams_dir: Path = EXAMS,
                   skip_refused: bool = False, intents: Path | None = None, chunk_size: int = 0) -> dict:
    res = build_bulk_stage(batch_dirs, Path(export), name, Path(exams_dir), skip_refused,
                           Path(intents) if intents else None, chunk_size)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    _clear(out_dir, ("stage*.sql", "readback*.sql", "stage-preview.json", "precheck.json"))
    st._write_all(out_dir, res["files"])
    out = {"batch": name, "staged": len(res["staged"]), "refused": len(res["refused"]),
           "refused_batches": len(res["refused_batches"]), "chunks": len(res["precheck"].get("chunks", [])),
           "keyed": sum(1 for it in res["staged"] if it["key"])}
    if (res["refused"] or res["refused_batches"]) and not skip_refused:
        raise RefuseToBuild(f"{out['refused']} rows and {out['refused_batches']} batches refused, no stage SQL "
                            "written (see precheck.json); rerun with --skip-refused to stage the rest")
    return out


# ---------------------------------------------------------------- publish


def _publish_chunk(kind: str, name: str, k: int, total: int, rows_total: int, numbered: list, doc,
                   fp_rows: tuple[int, str], exclude: str) -> str:
    slug = name.replace("-", "_")
    head = {"publish": f"-- kimport bulk publish: run {name}, chunk {k} of {total} "
                       f"({len(numbered)} of {rows_total} rows).",
            "rollback": f"-- kimport bulk rollback: undo the publish of run {name}, chunk {k} of {total} "
                        f"({len(numbered)} rows)."}[kind]
    out = [head,
           "-- Needs the founder's go-ahead before it runs. One transaction: any failed guard aborts every row "
           "of this chunk.",
           "-- Chunks are independent and may run in any order. No row is ever deleted.",
           "BEGIN;", ""]
    if kind == "publish":
        out.append(f"-- export {doc.exported_at}: {doc.row_count} rows, fingerprint {doc.fingerprint}; "
                   f"without this run's rows: {fp_rows[0]} rows, fingerprint {fp_rows[1]}")
        out += run_fingerprint_block(f"kimport_publish_{slug}_c{k:02d}_fingerprint", fp_rows[0], fp_rows[1],
                                     exclude)
    order = list(numbered)
    if kind == "rollback":
        order.reverse()
    for n, it in order:
        out.append(_row_note(n, it) + f" [batch {it.get('batch') or '?'}]")
        tag = f"kimport_{kind}_{slug}_{n:04d}"
        out += _publish_block(tag, it) if kind == "publish" else _rollback_block(tag, it)
    return "\n".join(out + ["COMMIT;", ""])


def build_bulk_publish(name: str, readback: Path, sealed: Path, export: Path, intents: Path,
                       chunk_size: int = 0, twins: dict | None = None) -> dict:
    items, doc, precheck = prepare_publish(Path(readback), Path(sealed), Path(export), Path(intents), name,
                                           bulk=True, twins=twins)
    try:
        batch_of = {r.get("stable_question_id"): r.get("kimport_batch")
                    for r in json.loads(Path(sealed).read_text(encoding="utf-8"))["rows"]}
    except (OSError, ValueError, KeyError, TypeError):
        batch_of = {}
    for it in items:
        ev = evidence_root(it["snap"]["keys"][0].get("raw_model_response")) or {}
        it["batch"] = batch_of.get((ev.get("approved_tags") or {}).get("stable_question_id"))
    ids = {it["id"] for it in items}
    rest = [r for r in doc.rows if r["id"] not in ids]
    fp_rows = (len(rest), fingerprint(rest))
    exclude = _id_exclude(sorted(ids))
    numbered = list(enumerate(items, 1))
    parts = _chunks(numbered, chunk_size)
    files, chunks = {}, []
    try:
        for kind in ("rollback", "publish"):
            for k, (fname, part) in enumerate(zip(_names(kind, len(parts)), parts), 1):
                sql = _publish_chunk(kind, name, k, len(parts), len(items), part, doc, fp_rows, exclude)
                files[fname.replace(".sql", ".dryrun.sql")] = dryrun_variant(sql)
                files[fname] = sql
                if kind == "publish":
                    chunks.append({"file": fname, "rows": len(part), "sha256": _sha(sql)})
    except ValueError as e:
        raise RefuseToBuild(str(e)) from None
    precheck.update({"bulk": True, "chunks": chunks,
                     "hidden_twins_allowed": {it["id"]: sorted(it["twin_rows"]) for it in items if it.get("twin_rows")},
                     "publish_sql_sha256": _sha("".join(files[c["file"]] for c in chunks)),
                     "question_ids": [it["id"] for it in items]})
    keys = {it["id"]: it["key"] for it in items}
    return {"files": files, "keys": keys, "precheck": precheck}


def run_bulk_publish(name: str, readback: Path, sealed: Path, export: Path, intents: Path, out_dir: Path,
                     chunk_size: int = 0, twins: dict | None = None) -> dict:
    res = build_bulk_publish(name, readback, sealed, export, intents, chunk_size, twins)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    _clear(out_dir, ("publish*.sql", "rollback*.sql", "keys.json", "precheck.json"))
    files = {"keys.json": json.dumps(res["keys"], indent=2, sort_keys=True) + "\n",
             "precheck.json": json.dumps(res["precheck"], indent=2, ensure_ascii=False, sort_keys=True) + "\n"}
    # rollback files land before publish files, as in single-batch publish
    order = sorted(res["files"], key=lambda f: (not f.startswith("rollback"), f))
    st._write_all(out_dir, {**files, **{f: res["files"][f] for f in order}})
    keyed = sum(1 for k in res["keys"].values() if k)
    return {"rows": len(res["keys"]), "keyed": keyed, "figure_no_key": len(res["keys"]) - keyed,
            "chunks": len(res["precheck"]["chunks"])}
