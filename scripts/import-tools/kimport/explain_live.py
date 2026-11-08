"""`k qa explain` and `k qa explain-check` end to end (kimport.qa_explain).

explain follows the `k figures publish-specs` sequence (kimport.figure_live, kimport.qa_run): the
writer lock, no open intent, fresh exports (or --export / --live-rows), the plan, explain SQL with
.dryrun.sql twins, restore SQL, readback SQL; then an intent, the dry run, the real files, the
readback, the intent closed, and the rows recorded in pipeline/qa/explanations.jsonl (with the
text they had before). --dry builds everything and runs only the .dryrun.sql files (they roll
back); unlike the older routes it still takes and releases the writer lock, so a dry run never
reads the database while another writer (the autopilot) holds it.

explain-check is read-only and takes no lock: the same plan (every text rule, the app's KaTeX,
screen split, grader and reseal) over a saved or fresh full export, no SQL. It writes plan.json
and <run>/refused.jsonl ({question_id, why}) for the writers.
"""

import json
import subprocess
from pathlib import Path

from kimport import qa_explain as qe
from kimport import qa_hide as qh
from kimport import qa_run, writer
from kimport.export import export_by_id
from kimport.jsonio import write_text_atomic

REPO = Path(__file__).resolve().parents[3]
CHECK = "scripts/import-tools/ts/explain-check.ts"
HOLDER = "kimport-qa-explain"


def app_check(items: list[dict], work: Path) -> dict:
    """ts/explain-check.ts: the app's KaTeX, screen split, grader, payload seal and scope reader."""
    src = Path(work) / "explain-check-input.json"
    src.write_text(json.dumps({"rows": [{"row": it["row"], "explanation_text": it["explanation_text"],
                                         "explanation_per_choice": it["explanation_per_choice"],
                                         "set_per_choice": it["set_per_choice"], "stated": it["stated"],
                                         "raw_after": it["raw_after"]} for it in items]}, ensure_ascii=False),
                   encoding="utf-8")
    done = subprocess.run(["npx", "--no-install", "tsx", CHECK, str(src)], cwd=REPO, capture_output=True, text=True,
                          timeout=3600)
    if done.returncode != 0:
        raise ValueError(f"explain-check.ts: {(done.stderr or done.stdout).strip()[-400:]}")
    return json.loads(done.stdout.strip().splitlines()[-1])


class Deps(qa_run.Deps):
    """qa_run.Deps plus the app check (replaceable in tests)."""

    def __init__(self, explain_checker=None, **kw):
        super().__init__(**kw)
        self.explain_checker = explain_checker or app_check


def _locked(pipe: Path, now: str, fn):
    """The writer lock around the whole run, dry or not; no open intent may be pending."""
    lock = pipe / "writer.lock"
    writer.acquire_lock(lock, HOLDER, now)
    try:
        writer.require_no_open_intents(pipe / "intents.jsonl")
        return fn()
    finally:
        writer.release_lock(lock, HOLDER)


def _full_rows(deps: Deps, run_dir: Path, live_rows: str | None) -> dict[str, dict]:
    full = Path(live_rows) if live_rows else run_dir / "live-full.json"
    if not live_rows:
        deps.full_exporter(full)
    return {r["id"]: r for r in json.loads(full.read_text(encoding="utf-8"))["rows"]}


def _plan(deps: Deps, run_dir: Path, lines: list[dict], rows: dict, slim: dict, now: str, batch) -> dict:
    return qe.build_plan(lines, rows, slim, lambda items: deps.explain_checker(items, run_dir), now, run_dir.name,
                         batch)


def run_explain(pipe: Path, lines_path: str, now: str, dry: bool = False, export: str | None = None,
                live_rows: str | None = None, batch: int | None = None, max_file_kb: int | None = None,
                deps: Deps | None = None) -> dict:
    pipe, deps = Path(pipe), deps or Deps()
    lines = qe.read_lines(Path(lines_path))
    max_bytes = (max_file_kb * 1000) if max_file_kb else qe.MAX_FILE_BYTES

    def go():
        qa_dir = pipe / "qa"
        run_dir = qa_dir / f"explain-{qa_run._stamp(now)}{'-dry' if dry else ''}"
        run_dir.mkdir(parents=True, exist_ok=True)
        doc, slim = qa_run._export(deps, run_dir, export)
        rows = _full_rows(deps, run_dir, live_rows)
        plan = _plan(deps, run_dir, lines, rows, slim, now, batch)
        items = plan["items"]
        summary = {"run": str(run_dir), "export": doc.exported_at, "lines_file": str(lines_path),
                   "lines": len(lines), "to_change": len(items), "refused": len(plan["refused"]),
                   "unchanged": len(plan["unchanged"]), "deferred": len(plan["deferred"]), "batch": batch,
                   "dry": dry}

        def write_plan(**extra):
            (run_dir / "plan.json").write_text(json.dumps(qe.plan_doc(plan, {**summary, **extra}), indent=2,
                                                          ensure_ascii=False) + "\n", encoding="utf-8")

        write_plan()
        if not items:
            return {**summary, "result": "nothing to change", "plan": str(run_dir / "plan.json")}
        sql = qe.explain_sql(items, doc, max_bytes)
        qa_run._write_chunks(run_dir, "restore", qe.restore_sql(items, max_bytes))
        readback = qe.readback_sql([it["id"] for it in items])
        (run_dir / "readback.sql").write_text(readback, encoding="utf-8")
        summary["sql_files"] = len(sql)
        if dry:
            for _, drypath in qa_run._write_chunks(run_dir, "explain", sql):
                qa_run._read(deps, drypath)
            write_plan(dry_passed=True)
            return {**summary, "result": "dry run passed (rolled back)", "plan": str(run_dir / "plan.json")}
        digest = qa_run._apply(deps, pipe, run_dir, "explain", sql, qe.expected(items, True),
                               qe.expected(items, False), now, readback=readback)
        qh.append_log(qa_dir / "explanations.jsonl", [
            {"id": it["id"], "stable_question_id": it["stable_question_id"], "at": now, "run": run_dir.name,
             "seal_before": it["seal_before"], "seal_after": it["seal_after"],
             "set": ["explanation_text"] + (["explanation_per_choice"] if it["set_per_choice"] else []),
             "explanation_sha256_before": qe.er.sha256_text(it["row"].get("explanation_text")),
             "explanation_sha256_after": qe.er.sha256_text(it["explanation_text"]),
             "explanation_before": it["row"].get("explanation_text"),
             **({"explanation_per_choice_before": it["row"].get("explanation_per_choice")}
                if it["set_per_choice"] else {})} for it in items])
        write_plan(applied=True, readback_sha256=digest)
        return {**summary, "result": "changed", "readback_sha256": digest, "undo": str(run_dir / "restore.sql")}

    return _locked(pipe, now, go)


def run_check(pipe: Path, lines_path: str, now: str, live_rows: str | None = None, export: str | None = None,
              deps: Deps | None = None) -> dict:
    """Read-only: every check `k qa explain` makes, no SQL, no lock. With --export the two exports
    are compared as in the real run; without it the full export stands in for the slim one."""
    pipe, deps = Path(pipe), deps or Deps()
    lines = qe.read_lines(Path(lines_path))
    run_dir = pipe / "qa" / f"explain-check-{qa_run._stamp(now)}"
    run_dir.mkdir(parents=True, exist_ok=True)
    rows = _full_rows(deps, run_dir, live_rows)
    slim = qa_run._export(deps, run_dir, export)[1] if export else export_by_id(list(rows.values()))
    plan = _plan(deps, run_dir, lines, rows, slim, now, None)
    summary = {"run": str(run_dir), "lines_file": str(lines_path), "lines": len(lines),
               "would_change": len(plan["items"]), "refused": len(plan["refused"]),
               "unchanged": len(plan["unchanged"]), "check_only": True}
    (run_dir / "plan.json").write_text(json.dumps(qe.plan_doc(plan, summary), indent=2, ensure_ascii=False) + "\n",
                                       encoding="utf-8")
    refused = run_dir / "refused.jsonl"
    write_text_atomic(refused, "".join(json.dumps({"question_id": k, "why": v}, ensure_ascii=False) + "\n"
                                       for k, v in plan["refused"].items()))
    return {**summary, "refused_by_reason": qe.plan_doc(plan, {})["refused_by_reason"],
            "plan": str(run_dir / "plan.json"), "refused_lines": str(refused)}
