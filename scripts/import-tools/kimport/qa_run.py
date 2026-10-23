"""`k qa hide`, `k qa restore` and `k qa fix-legacy`: run the QA SQL end to end; `k qa ids`
builds the hidden id map (read-only).

Sequence (README "The sequence", same as the autopilot): writer lock, no open
intent, fresh export (or --export), build the SQL and its .dryrun.sql twin,
open an intent, run the dry run, run the real file, read the rows back, close
the intent, record the rows in pipeline/qa/hidden.jsonl (or restored.jsonl)
and rewrite pipeline/qa/restore.sql, the undo for every row QA still hides.

--dry: no lock, no intent, no log: export, build, run only the .dryrun.sql
(it rolls back), report the counts.

If the real file fails, the readback decides: every row in the new state ->
it went through; every row still as exported -> the intent is closed
not_applied; anything else -> the intent stays open for a person to look at.
"""

import json
import time
from pathlib import Path

from kimport import qa_hide as qh
from kimport import qa_ids, qa_legacy, writer
from kimport.autopilot import DbError, supabase_file_runner
from kimport.autopilot_live import LEDGER
from kimport.export import export_by_id, read_export_doc
from kimport.fetch import run_export
from kimport.sqlutil import dryrun_variant
from kimport.sweep import UNPUBLISHED_IMPORT, UNPUBLISHED_STATUS

TRIES = 4
HOLDER = "kimport-qa"


class Deps:
    def __init__(self, db=supabase_file_runner, exporter=None, sleep=time.sleep, log=print):
        self.db = db
        self.exporter = exporter or (lambda out: run_export(out, log=lambda m: None))
        self.sleep = sleep
        self.log = log


def _stamp(now: str) -> str:
    return "".join(ch for ch in now if ch.isalnum())


def _read(deps: Deps, path: Path):
    for attempt in range(1, TRIES + 1):
        try:
            return deps.db(path)
        except DbError as e:
            if not e.transient or attempt == TRIES:
                raise ValueError(f"{Path(path).name} failed: {e}") from None
            deps.sleep(min(30, 2 ** attempt))


def _export(deps: Deps, run_dir: Path, given: str | None):
    if given:
        doc = read_export_doc(Path(given))
    else:
        path = run_dir / "live-before.json"
        deps.exporter(path)
        doc = read_export_doc(path)
    return doc, export_by_id(doc.rows)


def _write_sql(run_dir: Path, name: str, sql: str) -> tuple[Path, Path]:
    real, dry = run_dir / f"{name}.sql", run_dir / f"{name}.dryrun.sql"
    real.write_text(sql, encoding="utf-8")
    dry.write_text(dryrun_variant(sql), encoding="utf-8")
    return real, dry


def _apply(deps: Deps, pipe: Path, run_dir: Path, name: str, sql: str, after: dict, before: dict, now: str,
           readback: str | None = None) -> str:
    """Intent, dry run, real file, readback, close. Returns the readback sha256.
    `readback`: the read-only SQL whose rows `after` / `before` describe (default qa_hide.readback_sql)."""
    real, dry = _write_sql(run_dir, name, sql)
    rb = run_dir / "readback.sql"
    rb.write_text(readback or qh.readback_sql(sorted(after)), encoding="utf-8")
    log = pipe / "intents.jsonl"
    iid = writer.write_intent(log, run_dir.name, f"qa_{name}", sorted(after),
                              qh.sha(real.read_text(encoding="utf-8")), now)
    try:
        _read(deps, dry)
    except ValueError as e:
        writer.close_intent(log, iid, "not_applied", "", now)
        raise ValueError(f"the dry run failed, nothing was written: {e}") from None
    deps.log(f"qa {name}: dry run passed; running {real.name}")
    error = None
    try:
        deps.db(real)
    except DbError as e:
        error = str(e)
    back = qh.parse_readback(_read(deps, rb))
    (run_dir / "readback.json").write_text(json.dumps(back, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    digest = qh.sha(back)
    if not qh.matches(back, after):
        if error:
            deps.log(f"qa {name}: {real.name} reported an error but the readback shows it went through ({error})")
        writer.close_intent(log, iid, "verified", digest, now)
        return digest
    if error and not qh.matches(back, before):
        writer.close_intent(log, iid, "not_applied", digest, now)
        raise ValueError(f"{real.name} failed and nothing changed: {error}")
    raise ValueError(f"the readback does not match ({len(qh.matches(back, after))} rows differ); intent {iid} "
                     f"stays open, see {run_dir / 'readback.json'}" + (f"; error: {error}" if error else ""))


def _locked(pipe: Path, now: str, dry: bool, fn):
    if dry:
        return fn()
    lock = pipe / "writer.lock"
    writer.acquire_lock(lock, HOLDER, now)
    try:
        writer.require_no_open_intents(pipe / "intents.jsonl")
        return fn()
    finally:
        writer.release_lock(lock, HOLDER)


def run_hide(pipe: Path, results: list, ids_files: list, now: str, dry: bool = False,
             export: str | None = None, deps: Deps | None = None) -> dict:
    pipe, deps = Path(pipe), deps or Deps()
    res = qh.read_results(results)
    unknown = qh.unknown_verdicts(res)
    if unknown and not dry:
        raise ValueError("verdicts not in the QA policy: " + ", ".join(f"{v} ({n})" for v, n in unknown.items())
                         + "; decide hide or keep for them first (kimport/qa_hide.py), nothing was written")
    want = qh.wanted(res, {k: v for f in ids_files for k, v in qh.read_ids(f).items()})

    def go():
        qa_dir = pipe / "qa"
        run_dir = qa_dir / f"hide-{_stamp(now)}{'-dry' if dry else ''}"
        run_dir.mkdir(parents=True, exist_ok=True)
        doc, rows = _export(deps, run_dir, export)
        items, skipped = qh.plan_hide(want, rows)
        summary = {"run": str(run_dir), "export": doc.exported_at, "wanted": len(want), "to_hide": len(items),
                   "by_reason": qh.counts(items), "skipped": dict(sorted(_count(skipped.values()).items())),
                   "unknown_verdicts_not_hidden": unknown, "dry": dry}
        (run_dir / "plan.json").write_text(json.dumps({**summary, "rows": [
            {"id": it["id"], "label": it["label"], "reason": it["reason"]} for it in items],
            "skipped_rows": skipped}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        if not items:
            return {**summary, "result": "nothing to hide"}
        sql = qh.hide_sql(items, doc)
        if dry:
            _, drypath = _write_sql(run_dir, "hide", sql)
            _read(deps, drypath)
            return {**summary, "result": "dry run passed (rolled back)"}
        after = {it["id"]: it["set"] for it in items}
        before = {it["id"]: {c: it["row"].get(c) for c in qh._COLS} for it in items}
        digest = _apply(deps, pipe, run_dir, "hide", sql, after, before, now)
        records = [{"id": it["id"], "reason": it["reason"], "label": it["label"], "at": now, "run": run_dir.name,
                    "content_hash_v2": it["row"].get("content_hash_v2"),
                    **{f"previous_{c}": it["row"].get(c) for c in qh._COLS}} for it in items]
        qh.append_log(qa_dir / "hidden.jsonl", records)
        _write_sql(run_dir, "restore", qh.undo_sql(records))
        undo = qh.write_undo(qa_dir)
        return {**summary, "result": "hidden", "readback_sha256": digest, "undo_rows": undo}

    return _locked(pipe, now, dry, go)


def _count(values) -> dict:
    out: dict = {}
    for v in values:
        k = v.split(" (")[0]
        out[k] = out.get(k, 0) + 1
    return out


def restore_checks(ids: list[str], hidden: dict, results: dict, audit: set, rows: dict) -> dict[str, str]:
    """{id: why it cannot be republished}."""
    bad = {}
    live_keys: dict = {}
    for r in rows.values():
        if r.get("comparison_key") and qh._is_live(r):
            live_keys.setdefault(r["comparison_key"], r["id"])
    for qid in ids:
        rec, row = hidden.get(qid), rows.get(qid)
        if rec is None:
            bad[qid] = "not hidden by QA (not in hidden.jsonl, or already restored)"
        elif qid in results and qh.classify(results[qid])[0]:
            bad[qid] = f"still unresolved in the results ({qh.classify(results[qid])[1]})"
        elif qid in audit:
            bad[qid] = "still listed by the automated audit"
        elif row is None:
            bad[qid] = "not in the export"
        elif (row.get("publish_status"), row.get("import_status"), row.get("import_flag_reason")) != (
                UNPUBLISHED_STATUS, UNPUBLISHED_IMPORT, rec["reason"]) or row.get("archived_at") is None:
            bad[qid] = "its state changed since QA hid it"
        elif row.get("comparison_key") in live_keys and live_keys[row["comparison_key"]] != qid:
            bad[qid] = f"a live question has the same comparison key ({live_keys[row['comparison_key']]}): a replacement?"
    return bad


def run_restore(pipe: Path, ids_file: str, results: list, audit_files: list, now: str, dry: bool = False,
                export: str | None = None, skip_refused: bool = False, deps: Deps | None = None) -> dict:
    pipe, deps = Path(pipe), deps or Deps()
    ids = sorted(qh.read_ids(ids_file))
    res = qh.read_results(results)
    audit = {k for f in audit_files for k in qh.read_ids(f)}

    def go():
        qa_dir = pipe / "qa"
        hidden = qh.currently_hidden(qa_dir)
        run_dir = qa_dir / f"restore-{_stamp(now)}{'-dry' if dry else ''}"
        run_dir.mkdir(parents=True, exist_ok=True)
        doc, rows = _export(deps, run_dir, export)
        bad = restore_checks(ids, hidden, res, audit, rows)
        ok = [hidden[i] for i in ids if i not in bad]
        summary = {"run": str(run_dir), "asked": len(ids), "to_restore": len(ok), "refused": bad, "dry": dry}
        (run_dir / "plan.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
        if bad and not skip_refused:
            raise ValueError(f"{len(bad)} of {len(ids)} rows cannot be republished (see {run_dir / 'plan.json'}); "
                             "nothing was written. Use --skip-refused to republish the rest.")
        if not ok:
            return {**summary, "result": "nothing to restore"}
        sql = qh.restore_sql(ok, rows, doc)
        if dry:
            _, drypath = _write_sql(run_dir, "restore-fixed", sql)
            _read(deps, drypath)
            return {**summary, "result": "dry run passed (rolled back)"}
        after = {r["id"]: {c: r[f"previous_{c}"] for c in qh._COLS} for r in ok}
        before = {r["id"]: {c: rows[r["id"]].get(c) for c in qh._COLS} for r in ok}
        digest = _apply(deps, pipe, run_dir, "restore-fixed", sql, after, before, now)
        qh.append_log(qa_dir / "restored.jsonl", [{"id": r["id"], "at": now, "run": run_dir.name} for r in ok])
        undo = qh.write_undo(qa_dir)
        return {**summary, "result": "restored", "readback_sha256": digest, "undo_rows": undo}

    return _locked(pipe, now, dry, go)


def run_fix_legacy(pipe: Path, fixes_files: list, now: str, ids_file: str | None = None, dry: bool = False,
                   plan: bool = False, export: str | None = None, snapshot: str | None = None,
                   deps: Deps | None = None) -> dict:
    """Apply reviewers' fixes to legacy rows in place (kimport.qa_legacy). --plan builds the files only
    (with --export and --snapshot: no database at all); --dry also runs the .dryrun.sql."""
    pipe, deps = Path(pipe), deps or Deps()
    fixes, conflicts = qa_legacy.read_fixes(fixes_files)
    if ids_file:
        keep = set(qh.read_ids(ids_file))
        fixes = {k: v for k, v in fixes.items() if k in keep}
        conflicts = {k: v for k, v in conflicts.items() if k in keep}

    def go():
        qa_dir = pipe / "qa"
        run_dir = qa_dir / f"fix-legacy-{_stamp(now)}{'-plan' if plan else '-dry' if dry else ''}"
        run_dir.mkdir(parents=True, exist_ok=True)
        doc, _ = _export(deps, run_dir, export)
        if snapshot:
            raw = json.loads(Path(snapshot).read_text(encoding="utf-8"))
        else:
            (run_dir / "snapshot.sql").write_text(qa_legacy.snapshot_sql(sorted(fixes)), encoding="utf-8")
            raw = _read(deps, run_dir / "snapshot.sql")
            (run_dir / "snapshot.json").write_text(json.dumps(raw) + "\n", encoding="utf-8")
        res = qa_legacy.build(fixes, conflicts, doc, qa_legacy.read_snapshots(raw))
        for fname, text in res["files"].items():
            (run_dir / fname).write_text(text, encoding="utf-8")
        summary = {"run": str(run_dir), "export": doc.exported_at, "fix_lines": len(fixes), "to_fix": len(res["items"]),
                   "refused": res["refused"], "dry": dry, "plan": plan}
        (run_dir / "plan.json").write_text(json.dumps({**summary, "rows": res["plan"]["rows"]}, indent=2,
                                                      ensure_ascii=False) + "\n", encoding="utf-8")
        if not res["items"]:
            return {**summary, "result": "nothing to fix"}
        if plan:
            return {**summary, "result": "planned (nothing ran)"}
        if dry:
            _read(deps, run_dir / "fix-legacy.dryrun.sql")
            return {**summary, "result": "dry run passed (rolled back)"}
        after, before = qa_legacy.expected(res["items"])
        digest = _apply(deps, pipe, run_dir, "fix-legacy", res["files"]["fix-legacy.sql"], after, before, now,
                        readback=res["files"]["readback.sql"])
        qh.append_log(qa_dir / qa_legacy.LOG, qa_legacy.log_entries(res["items"], now, run_dir.name))
        return {**summary, "result": "fixed (still hidden)", "readback_sha256": digest}

    return _locked(pipe, now, dry or plan, go)


def run_ids(pipe: Path, ids_files: list, now: str, rows: str | None = None, ledgers: list | None = None,
            clusters: str | None = None, write_approved: bool = False, deps: Deps | None = None) -> dict:
    """The candidate hidden id map (kimport.qa_ids) for every id QA hid plus --ids; read-only."""
    pipe, deps = Path(pipe), deps or Deps()
    qa_dir = pipe / "qa"
    if write_approved:
        return qa_ids.write_approved(qa_dir)
    ids = {e["id"] for e in qh.read_log(qa_dir / "hidden.jsonl")}
    for f in ids_files:
        ids |= set(qh.read_ids(f))
    if rows:
        raw = json.loads(Path(rows).read_text(encoding="utf-8"))
    else:
        path = qa_dir / f"ids-{_stamp(now)}.sql"
        path.write_text(qa_ids.ids_sql(), encoding="utf-8")
        raw = _read(deps, path)
    ledgers = ledgers or [str(LEDGER), str(pipe / "corpus" / "new-exam-ledger.json")]
    clusters = clusters or str(pipe / "corpus" / "clusters.json")
    res = qa_ids.derive(ids, qa_ids.read_rows(raw), qa_ids.ledger_items(ledgers),
                        json.loads(Path(clusters).read_text(encoding="utf-8")))
    out = qa_ids.write_candidate(qa_dir, res, {"rows": rows or "ids_sql (read-only)", "ledgers": ledgers,
                                               "clusters": clusters, "at": now})
    return {"candidate": str(out), "ids": len(ids), "counts": res["counts"],
            "ambiguous": {k: v["why"] for k, v in res["rows"].items() if v["status"] == "ambiguous"},
            "legacy": sorted(k for k, v in res["rows"].items() if v["status"] == "legacy")}
