"""`k qa hide`, `k qa restore`, `k qa fix-legacy`, `k qa retag` and `k qa normalize`: run the QA SQL
end to end; `k qa ids`
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
from kimport import qa_export, qa_ids, qa_legacy, qa_normalize, qa_retag, writer
from kimport import stage as st
from kimport.autopilot import DbError, supabase_file_runner
from kimport.autopilot_live import LEDGER
from kimport.export import export_by_id, read_export_doc
from kimport.fetch import run_export
from kimport.sqlutil import dryrun_variant
from kimport.sweep import UNPUBLISHED_IMPORT, UNPUBLISHED_STATUS

TRIES = 4
HOLDER = "kimport-qa"


class Deps:
    def __init__(self, db=supabase_file_runner, exporter=None, sleep=time.sleep, log=print, full_exporter=None,
                 retag_checker=None, normalize_checker=None):
        self.db = db
        self.exporter = exporter or (lambda out: run_export(out, log=lambda m: None))
        # Every live row in full (REST, read-only) for `k qa retag`, which needs the evidence and the payload.
        self.full_exporter = full_exporter or (lambda out: qa_export.run_qa_export(
            out, Path(__file__).resolve().parents[3] / ".env.local", log=lambda m: None))
        self.retag_checker = retag_checker or qa_retag_check
        self.normalize_checker = normalize_checker or qa_normalize_check
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


def _write_chunks(run_dir: Path, name: str, files: list[str]) -> list[tuple[Path, Path]]:
    """name.sql (one file) or name-01.sql, name-02.sql ... with their .dryrun.sql twins."""
    if len(files) == 1:
        return [_write_sql(run_dir, name, files[0])]
    return [_write_sql(run_dir, f"{name}-{k:02d}", f) for k, f in enumerate(files, 1)]


def _write_sql(run_dir: Path, name: str, sql: str) -> tuple[Path, Path]:
    real, dry = run_dir / f"{name}.sql", run_dir / f"{name}.dryrun.sql"
    real.write_text(sql, encoding="utf-8")
    dry.write_text(dryrun_variant(sql), encoding="utf-8")
    return real, dry


def _apply(deps: Deps, pipe: Path, run_dir: Path, name: str, sql: str, after: dict, before: dict, now: str,
           readback: str | None = None) -> str:
    """Intent, dry run, real file, readback, close. Returns the readback sha256.
    `readback`: the read-only SQL whose rows `after` / `before` describe (default qa_hide.readback_sql)."""
    pairs = _write_chunks(run_dir, name, sql if isinstance(sql, list) else [sql])
    rb = run_dir / "readback.sql"
    rb.write_text(readback or qh.readback_sql(sorted(after)), encoding="utf-8")
    log = pipe / "intents.jsonl"
    iid = writer.write_intent(log, run_dir.name, f"qa_{name}", sorted(after),
                              qh.sha("".join(real.read_text(encoding="utf-8") for real, _ in pairs)), now)
    try:
        for _, dry in pairs:
            _read(deps, dry)
    except ValueError as e:
        writer.close_intent(log, iid, "not_applied", "", now)
        raise ValueError(f"the dry run failed, nothing was written: {e}") from None
    real = pairs[0][0] if len(pairs) == 1 else run_dir / f"{name}-*.sql"
    deps.log(f"qa {name}: dry run passed; running {real.name}")
    error = None
    for path, _ in pairs:
        try:
            deps.db(path)
        except DbError as e:
            error = f"{path.name}: {e}"
            break
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
        items, skipped = qh.plan_hide(want, rows, qh.corrected_hashes(qa_dir))
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


def restore_checks(ids: list[str], hidden: dict, results: dict, audit: set, rows: dict,
                   corrected: dict | None = None) -> dict[str, str]:
    """{id: why it cannot be republished}. A results line about a question's old text does not block it
    once the row's text is its reviewed correction (qh.is_corrected). A live row with the same
    comparison key, content hash or normalized text blocks it (a QA correction made the hidden
    duplicate twin's text live on its kept copy: two live copies are never allowed)."""
    bad = {}
    live_keys: dict = {}
    live_hash: dict = {}
    live_text: dict = {}
    for r in rows.values():
        if qh._is_live(r):
            if r.get("comparison_key"):
                live_keys.setdefault(r["comparison_key"], r["id"])
            if r.get("content_hash_v2"):
                live_hash.setdefault(r["content_hash_v2"], r["id"])
            if st._norm_text(r.get("question_text")):
                live_text.setdefault(st._norm_text(r.get("question_text")), r["id"])
    for qid in ids:
        rec, row = hidden.get(qid), rows.get(qid)
        if rec is None:
            bad[qid] = "not hidden by QA (not in hidden.jsonl, or already restored)"
        elif qid in results and qh.classify(results[qid])[0] and not qh.is_corrected(qid, row, corrected):
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
        elif live_hash.get(row.get("content_hash_v2"), qid) != qid:
            bad[qid] = (f"a live question has the same content hash ({live_hash[row['content_hash_v2']]}): its corrected "
                        "copy is live, so this twin stays hidden")
        elif live_text.get(st._norm_text(row.get("question_text")), qid) != qid:
            bad[qid] = (f"a live question has the same normalized text ({live_text[st._norm_text(row.get('question_text'))]}):"
                        " its corrected copy is live, so this twin stays hidden")
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
        bad = restore_checks(ids, hidden, res, audit, rows, qh.corrected_hashes(qa_dir))
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


def qa_retag_check(items: list[dict], work: Path) -> dict:
    """ts/retag-check.ts on the planned changes (the app's catalog scope reader and payload seal)."""
    import subprocess
    src = Path(work) / "retag-check-input.json"
    src.write_text(json.dumps({"rows": [{"row": it["row"], "question_after": it["question_after"],
                                         "raw_after": it["raw_after"]} for it in items]}, ensure_ascii=False),
                   encoding="utf-8")
    done = subprocess.run(["npx", "--no-install", "tsx", "scripts/import-tools/ts/retag-check.ts", str(src)],
                          cwd=qa_retag.REPO, capture_output=True, text=True, timeout=600)
    if done.returncode != 0:
        raise ValueError(f"retag-check.ts: {(done.stderr or done.stdout).strip()[-400:]}")
    return json.loads(done.stdout)


def run_retag(pipe: Path, decisions: str, now: str, dry: bool = False, export: str | None = None,
              live_rows: str | None = None, deps: Deps | None = None) -> dict:
    """`k qa retag`: change only skill / difficulty labels of live rows (kimport.qa_retag), in the
    qa hide sequence. --dry builds everything and runs only the .dryrun.sql (rolled back)."""
    pipe, deps = Path(pipe), deps or Deps()
    skills = qa_retag.catalog()
    lines = qa_retag.read_decisions(Path(decisions))

    def go():
        qa_dir = pipe / "qa"
        run_dir = qa_dir / f"retag-{_stamp(now)}{'-dry' if dry else ''}"
        run_dir.mkdir(parents=True, exist_ok=True)
        doc, _ = _export(deps, run_dir, export)
        full = Path(live_rows) if live_rows else run_dir / "live-full.json"
        if not live_rows:
            deps.full_exporter(full)
        rows = {r["id"]: r for r in json.loads(full.read_text(encoding="utf-8"))["rows"]}
        plan = qa_retag.build_plan(lines, rows, skills, lambda items: deps.retag_checker(items, run_dir))
        items = plan["items"]
        summary = {"run": str(run_dir), "export": doc.exported_at, "decisions": str(decisions),
                   "decision_lines": len(lines), "to_change": len(items), "refused": len(plan["refused"]),
                   "dropped": len(plan["dropped"]), "dry": dry,
                   "by_field": dict(sorted({f: sum(1 for it in items if f in it["decisions"])
                                            for f in qa_retag.FIELDS}.items()))}
        (run_dir / "plan.json").write_text(json.dumps({**summary, "rows": [
            {"id": it["id"], "stable_question_id": it["stable_question_id"],
             "changes": {f: {k: d[k] for k in ("live", "new", "reason", "by", "at")} for f, d in it["decisions"].items()},
             "columns": it["question_after"], "seal_before": it["seal_before"], "seal_after": it["seal_after"]}
            for it in items], "refused_rows": plan["refused"], "dropped_lines": plan["dropped"]},
            indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        md = Path(decisions).parent / "retag-plan.md"

        def write_md(**extra):
            md.write_text(qa_retag.plan_md(plan, {**summary, **extra}, now), encoding="utf-8")

        write_md()
        if not items:
            return {**summary, "result": "nothing to change", "plan_md": str(md)}
        sql = qa_retag.retag_sql(items, doc)
        _write_chunks(run_dir, "restore", qa_retag.restore_sql(items))
        summary["sql_files"] = len(sql)
        if dry:
            for _, drypath in _write_chunks(run_dir, "retag", sql):
                _read(deps, drypath)
            write_md(dry_passed=True)
            return {**summary, "result": "dry run passed (rolled back)", "plan_md": str(md)}
        digest = _apply(deps, pipe, run_dir, "retag", sql, qa_retag.expected(items, True),
                        qa_retag.expected(items, False), now, readback=qa_retag.readback_sql([it["id"] for it in items]))
        qh.append_log(qa_dir / "retags.jsonl", [
            {"id": it["id"], "stable_question_id": it["stable_question_id"], "at": now, "run": run_dir.name,
             "changes": {f: {k: d[k] for k in ("live", "new", "reason", "by")} for f, d in it["decisions"].items()},
             "columns_before": {c: it["row"].get(c) for c in it["question_after"]}, "columns_after": it["question_after"]}
            for it in items])
        return {**summary, "result": "changed", "readback_sha256": digest,
                "undo": str(run_dir / "restore.sql")}

    return _locked(pipe, now, dry, go)


def qa_normalize_check(items: list[dict], work: Path) -> dict:
    """ts/normalize-check.ts on the planned text fixes (the app's seals, hashes and display code)."""
    import subprocess
    src = Path(work) / "normalize-check-input.json"
    src.write_text(json.dumps({"rows": [{"row": it["row"], "question": it["change"]["question"],
                                         "choices": it["change"]["choices"], "raw_after": it["raw_after"]}
                                        for it in items]}, ensure_ascii=False), encoding="utf-8")
    done = subprocess.run(["npx", "--no-install", "tsx", "scripts/import-tools/ts/normalize-check.ts", str(src)],
                          cwd=qa_retag.REPO, capture_output=True, text=True, timeout=1800)
    if done.returncode != 0:
        raise ValueError(f"normalize-check.ts: {(done.stderr or done.stdout).strip()[-400:]}")
    return json.loads(done.stdout)


def run_normalize(pipe: Path, now: str, dry: bool = False, export: str | None = None,
                  live_rows: str | None = None, violations: str | None = None, deps: Deps | None = None) -> dict:
    """`k qa normalize`: the mechanical Bluebook text fixes on live rows in place (kimport.qa_normalize),
    in the qa hide sequence. --dry builds everything and runs only the .dryrun.sql (rolled back)."""
    pipe, deps = Path(pipe), deps or Deps()
    violations = Path(violations) if violations else pipe / "qa" / "bluebook-style" / "violations.json"

    def go():
        qa_dir = pipe / "qa"
        run_dir = qa_dir / f"normalize-{_stamp(now)}{'-dry' if dry else ''}"
        run_dir.mkdir(parents=True, exist_ok=True)
        doc, _ = _export(deps, run_dir, export)
        full = Path(live_rows) if live_rows else run_dir / "live-full.json"
        if not live_rows:
            deps.full_exporter(full)
        rows = json.loads(full.read_text(encoding="utf-8"))["rows"]
        plan = qa_normalize.build_plan(rows, doc, lambda items: deps.normalize_checker(items, run_dir), now, run_dir.name)
        items = plan["items"]
        summary = {"run": str(run_dir), "export": doc.exported_at, "live_rows": len(rows),
                   "candidates": plan["candidates"], "to_change": len(items), "refused": len(plan["refused"]),
                   "dry": dry}

        def write_plan(**extra):
            (run_dir / "plan.json").write_text(json.dumps(qa_normalize.plan_doc(plan, {**summary, **extra}, violations),
                                                          indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

        write_plan()
        if not items:
            return {**summary, "result": "nothing to change", "plan": str(run_dir / "plan.json")}
        sql = qa_normalize.normalize_sql(items, doc)
        _write_chunks(run_dir, "restore", qa_normalize.restore_sql(items))
        (run_dir / "readback.sql").write_text(qa_normalize.readback_sql([it["id"] for it in items]), encoding="utf-8")
        summary["sql_files"] = len(sql)
        per_rule = qa_normalize.plan_doc(plan, summary)["per_rule"]
        if dry:
            for _, drypath in _write_chunks(run_dir, "normalize", sql):
                _read(deps, drypath)
            write_plan(dry_passed=True)
            return {**summary, "per_rule": per_rule, "result": "dry run passed (rolled back)",
                    "plan": str(run_dir / "plan.json")}
        digest = _apply(deps, pipe, run_dir, "normalize", sql, qa_normalize.expected(items, True),
                        qa_normalize.expected(items, False), now,
                        readback=qa_normalize.readback_sql([it["id"] for it in items]))
        qh.append_log(qa_dir / "normalizations.jsonl", [
            {"id": it["id"], "stable_question_id": it["stable_question_id"], "at": now, "run": run_dir.name,
             "rules": it["change"]["rules"], "before": {**{f: it["row"].get(f) for f in it["change"]["question"]},
                                                        **{f"choice {x}": t for x, t in qa_normalize._choices(it, False).items()}},
             "after": {**it["change"]["question"], **{f"choice {x}": t for x, t in it["change"]["choices"].items()}}}
            for it in items])
        write_plan(applied=True, readback_sha256=digest)
        return {**summary, "per_rule": per_rule, "result": "changed", "readback_sha256": digest,
                "undo": str(run_dir / "restore.sql")}

    return _locked(pipe, now, dry, go)
