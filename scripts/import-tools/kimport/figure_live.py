"""`k figures convert-live` and `k figures publish-specs` end to end (kimport.figure_publish).

publish-specs follows the `k qa normalize` sequence (kimport.qa_run): writer lock, no open
intent, fresh exports (or --export / --live-rows), the plan, publish SQL with .dryrun.sql twins,
restore SQL, readback SQL; then an intent, the dry run, the real files, the readback, the intent
closed, and the rows recorded in pipeline/qa/figure-specs.jsonl. --dry: no lock, no intent, no
log; it builds everything and runs only the .dryrun.sql files (they roll back).

convert-live is read-only: for every live row whose figure is a table (figure_table_data,
choice_table_data) or a chart (figure_chart_data), the engine's own conversion of that data
(ts/figure-engine-tool.ts convert, in the engine checkout), checked by check-spec.ts, written as
publish-specs lines marked visual_verdict "mechanical". Rows it cannot convert or whose
conversion has check issues go to <out>.refused.jsonl with the reason.

The engine side runs in kimport.figures.engine_dir() (FIGURE_ENGINE_DIR); the seals run in this
checkout (ts/figure-seal-check.ts), whose catalogQuestionPayloadHash is main's.
"""

import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from kimport import figure_gate as fg
from kimport import figure_publish as fp
from kimport import figures, qa_run
from kimport import qa_hide as qh
from kimport.answer_evidence import stable_question_id
from kimport.jsonio import write_text_atomic

REPO = Path(__file__).resolve().parents[3]
ENGINE_TOOL = REPO / "scripts/import-tools/ts/figure-engine-tool.ts"
SEAL_CHECK = "scripts/import-tools/ts/figure-seal-check.ts"
WORKERS = 6


# ---------------------------------------------------------------- the engine and the app


def _tsx(args: list[str], cwd: Path, what: str, timeout: int = 1800) -> dict:
    done = subprocess.run(["npx", "--no-install", "tsx", *args], cwd=cwd, capture_output=True, text=True,
                          timeout=timeout)
    if done.returncode != 0:
        raise ValueError(f"{what}: {(done.stderr or done.stdout).strip()[-400:]}")
    return json.loads(done.stdout.strip().splitlines()[-1])


def engine_convert(rows: list[dict], work: Path) -> dict[str, dict]:
    """{row id: conversion} from figure-engine-tool.ts convert (tableDataToSpec, chartDataToSpec)."""
    src = Path(work) / "convert-input.json"
    src.write_text(json.dumps({"rows": rows}, ensure_ascii=False), encoding="utf-8")
    out = _tsx([str(ENGINE_TOOL), "convert", str(src)], figures.engine_dir(), "figure-engine-tool.ts convert")
    return {r["id"]: r for r in out["rows"]}


def engine_draws(items: list[dict], work: Path) -> dict[str, dict]:
    src = Path(work) / "draws-input.json"
    src.write_text(json.dumps({"rows": [{"id": it["id"], "row": it["row"], "figure_spec": it["figure_spec"],
                                         "choice_specs": it["choice_specs"]} for it in items]}, ensure_ascii=False),
                   encoding="utf-8")
    out = _tsx([str(ENGINE_TOOL), "draws", str(src)], figures.engine_dir(), "figure-engine-tool.ts draws")
    return {r["id"]: r for r in out["rows"]}


def app_seal(items: list[dict], work: Path) -> dict:
    """ts/figure-seal-check.ts: the app's payload seal, scope reader and display check."""
    src = Path(work) / "figure-seal-input.json"
    src.write_text(json.dumps({"rows": [{"row": it["row"], "figure_spec": it["figure_spec"],
                                         "set_figure": it["figure_spec"] is not None,
                                         "choice_specs": it["choice_specs"], "raw_after": it["raw_after"]}
                                        for it in items]}, ensure_ascii=False), encoding="utf-8")
    return _tsx([SEAL_CHECK, str(src)], REPO, "figure-seal-check.ts")


def _jobs(d: dict) -> list[tuple[str, dict]]:
    """The figure.json files check-spec.ts checks for one line: one per figure of a list (a
    figure list is checked figure by figure), the choices together (one shared frame)."""
    spec, choices = d.get("figure_spec"), d.get("choice_specs") or {}
    labels = d.get("choice_labels") or {}
    answer_choices = [{"letter": x, "choice_figure_spec": s, "transcribed_labels": labels.get(x)}
                      for x, s in sorted(choices.items())]
    figs = fp.figures_of(spec)
    if isinstance(spec, list):
        jobs = [(f"figure {n}", {"figure_spec": f, "transcribed_labels": d["transcribed_labels"][n]})
                for n, f in enumerate(figs)]
        return jobs + ([("choices", {"answer_choices": answer_choices})] if answer_choices else [])
    doc = {"answer_choices": answer_choices}
    if figs:
        doc.update(figure_spec=spec, transcribed_labels=d.get("transcribed_labels"))
    return [("figure", doc)]


def spec_checks(lines: list[dict], work: Path, checker=None, workers: int = WORKERS) -> dict[str, dict]:
    """{question id: {ok, issues, figures: [sampled spec], choices: {letter: sampled spec}}}: every
    figure of every line through check-spec.ts (kimport.figures.spec_check)."""
    checker = checker or figures.spec_check
    folder = Path(work) / "check-spec"
    folder.mkdir(parents=True, exist_ok=True)
    tasks = []
    for d in lines:
        for n, (what, doc) in enumerate(_jobs(d)):
            path = folder / f"{d['question_id']}-{n}.json"
            path.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
            tasks.append((d["question_id"], what, path))

    def run(task):
        qid, what, path = task
        try:
            return qid, what, checker(path), None
        except ValueError as e:
            return qid, what, None, str(e)

    with ThreadPoolExecutor(max_workers=workers) as pool:
        results = list(pool.map(run, tasks))
    out: dict[str, dict] = {d["question_id"]: {"ok": True, "issues": [], "figures": [], "choices": {}} for d in lines}
    for qid, what, res, err in results:
        o = out[qid]
        if err:
            o["ok"] = False
            o["issues"].append(f"{what}: {err.splitlines()[0][:200]}")
            continue
        issues = figures._issue_lines(res)
        if issues or not res.get("ok"):
            o["ok"] = False
            o["issues"] += [f"{what}: {i}" for i in issues or ["the checks did not pass"]]
            continue
        if res.get("spec") is not None:
            o["figures"].append(res["spec"])
        o["choices"].update({c["letter"]: c["spec"] for c in res.get("choices") or []})
    return out


class Deps(qa_run.Deps):
    """qa_run.Deps plus the figure checks (each replaceable in tests)."""

    def __init__(self, spec_checker=None, converter=None, draws=None, sealer=None, **kw):
        super().__init__(**kw)
        self.spec_checker = spec_checker or spec_checks
        self.converter = converter or engine_convert
        self.draws = draws or engine_draws
        self.sealer = sealer or app_seal


class _Bound:
    def __init__(self, deps: Deps, work: Path):
        self.spec_checker = lambda lines: deps.spec_checker(lines, work)
        self.converter = lambda rows: deps.converter(rows, work)
        self.draws = lambda items: deps.draws(items, work)
        self.sealer = lambda items: deps.sealer(items, work)


def _full_rows(deps: Deps, run_dir: Path, live_rows: str | None) -> dict[str, dict]:
    full = Path(live_rows) if live_rows else run_dir / "live-full.json"
    if not live_rows:
        deps.full_exporter(full)
    return {r["id"]: r for r in json.loads(full.read_text(encoding="utf-8"))["rows"]}


# ---------------------------------------------------------------- convert-live


def _has(row: dict, kind: str) -> bool:
    if kind == "chart":
        return row.get("figure_chart_data") is not None
    return row.get("figure_chart_data") is None and (
        row.get("figure_table_data") is not None
        or any(c.get("choice_table_data") is not None for c in row.get("answer_choices") or []))


def convert_lines(rows: dict[str, dict], kind: str, deps: Deps, work: Path) -> dict:
    """{"lines": [...clean publish-specs lines], "refused": [{question_id, ..., why}], "counts"}."""
    if kind not in fp.MECHANICAL_KINDS:
        raise ValueError(f"--kind must be {' or '.join(fp.MECHANICAL_KINDS)}")
    bound = _Bound(deps, work)
    want = [r for _, r in sorted(rows.items()) if r.get("is_live") is True and r.get("archived_at") is None
            and _has(r, kind)]
    refused, todo = [], []
    for r in want:
        keys = r.get("answer_key_entries") or []
        sid = stable_question_id(keys[0].get("raw_model_response")) if len(keys) == 1 else None
        why = ("already has a figure_spec (that is what students see now)" if r.get("figure_spec") is not None
               else "already has a choice_figure_spec" if any(c.get("choice_figure_spec") is not None
                                                             for c in r.get("answer_choices") or [])
               else "no stable question id in its answer key evidence" if sid is None else None)
        if why:
            refused.append({"question_id": r["id"], "stable_question_id": sid, "kind": kind, "why": why})
        else:
            todo.append((r, sid))
    conv = bound.converter([r for r, _ in todo]) if todo else {}
    lines = []
    for r, sid in todo:
        c = conv.get(r["id"]) or {"ok": False, "error": "no conversion result"}
        if not c.get("ok"):
            refused.append({"question_id": r["id"], "stable_question_id": sid, "kind": kind,
                            "why": f"conversion: {c.get('error')}"})
            continue
        line = {"question_id": r["id"], "stable_question_id": sid, "kind": c["kind"],
                "figure_spec": c["figure_spec"], "choice_specs": c["choice_specs"] or {},
                "transcribed_labels": c["transcribed_labels"], "choice_labels": c["choice_labels"] or {},
                "visual_verdict": fp.MECHANICAL, "check_ok": True,
                "figure_sha256": fg.spec_sha256(c["figure_spec"], c["choice_specs"])}
        if line["transcribed_labels"] is None:
            del line["transcribed_labels"]
        lines.append(line)
    checked = bound.spec_checker(lines) if lines else {}
    clean = []
    for line in lines:
        res = checked.get(line["question_id"]) or {"ok": False, "issues": ["no check result"]}
        if res["ok"] and not res["issues"]:
            clean.append(line)
        else:
            refused.append({"question_id": line["question_id"], "stable_question_id": line["stable_question_id"],
                            "kind": line["kind"], "why": "check-spec: " + "; ".join(res["issues"][:5]),
                            "check_ok": False})
    return {"lines": clean, "refused": refused,
            "counts": {"live_rows_with_data": len(want), "converted_clean": len(clean), "refused": len(refused)}}


def run_convert_live(pipe: Path, kind: str, now: str, out: str | None = None, live_rows: str | None = None,
                     deps: Deps | None = None) -> dict:
    pipe, deps = Path(pipe), deps or Deps()
    run_dir = pipe / "qa" / f"convert-live-{kind}-{qa_run._stamp(now)}"
    run_dir.mkdir(parents=True, exist_ok=True)
    rows = _full_rows(deps, run_dir, live_rows)
    res = convert_lines(rows, kind, deps, run_dir)
    target = Path(out) if out else run_dir / f"publish-specs-{kind}.jsonl"
    write_text_atomic(target, "".join(json.dumps(x, ensure_ascii=False, sort_keys=True) + "\n" for x in res["lines"]))
    refused_path = target.with_suffix(".refused.jsonl")
    write_text_atomic(refused_path, "".join(json.dumps(x, ensure_ascii=False, sort_keys=True) + "\n"
                                            for x in res["refused"]))
    from collections import Counter
    reasons = Counter(r["why"].split(":")[0] if r["why"].startswith(("check-spec", "conversion")) else r["why"]
                      for r in res["refused"])
    return {"kind": kind, **res["counts"], "refused_by_reason": dict(reasons.most_common()), "lines": str(target),
            "refused_lines": str(refused_path), "run": str(run_dir)}


# ---------------------------------------------------------------- publish-specs


def run_publish_specs(pipe: Path, lines_path: str, now: str, dry: bool = False, export: str | None = None,
                      live_rows: str | None = None, deps: Deps | None = None) -> dict:
    pipe, deps = Path(pipe), deps or Deps()
    lines = fp.read_lines(Path(lines_path))

    def go():
        qa_dir = pipe / "qa"
        run_dir = qa_dir / f"figure-specs-{qa_run._stamp(now)}{'-dry' if dry else ''}"
        run_dir.mkdir(parents=True, exist_ok=True)
        doc, _ = qa_run._export(deps, run_dir, export)
        rows = _full_rows(deps, run_dir, live_rows)
        plan = fp.build_plan(lines, rows, _Bound(deps, run_dir), now, run_dir.name)
        items = plan["items"]
        summary = {"run": str(run_dir), "export": doc.exported_at, "lines_file": str(lines_path),
                   "lines": len(lines), "to_change": len(items), "refused": len(plan["refused"]),
                   "unchanged": len(plan["unchanged"]), "dry": dry}

        def write_plan(**extra):
            (run_dir / "plan.json").write_text(json.dumps(fp.plan_doc(plan, {**summary, **extra}), indent=2,
                                                          ensure_ascii=False) + "\n", encoding="utf-8")

        write_plan()
        if not items:
            return {**summary, "result": "nothing to change", "plan": str(run_dir / "plan.json")}
        sql = fp.publish_sql(items, doc)
        qa_run._write_chunks(run_dir, "restore", fp.restore_sql(items))
        readback = fp.readback_sql([it["id"] for it in items])
        (run_dir / "readback.sql").write_text(readback, encoding="utf-8")
        summary["sql_files"] = len(sql)
        counts = {k: v for k, v in fp.plan_doc(plan, summary).items() if k in ("by_kind", "by_verdict", "choice_specs")}
        if dry:
            for _, drypath in qa_run._write_chunks(run_dir, "publish-specs", sql):
                qa_run._read(deps, drypath)
            write_plan(dry_passed=True)
            return {**summary, **counts, "result": "dry run passed (rolled back)", "plan": str(run_dir / "plan.json")}
        digest = qa_run._apply(deps, pipe, run_dir, "publish-specs", sql, fp.expected(items, True),
                               fp.expected(items, False), now, readback=readback)
        qh.append_log(qa_dir / "figure-specs.jsonl", [
            {"id": it["id"], "stable_question_id": it["stable_question_id"], "at": now, "run": run_dir.name,
             "kind": it["kind"], "verdict": it["verdict"], "seal_before": it["seal_before"],
             "seal_after": it["seal_after"], "set": (["figure_spec"] if it["figure_spec"] is not None else [])
             + [f"choice {x}" for x in sorted(it["choice_specs"])]} for it in items])
        write_plan(applied=True, readback_sha256=digest)
        return {**summary, **counts, "result": "changed", "readback_sha256": digest,
                "undo": str(run_dir / "restore.sql")}

    return qa_run._locked(pipe, now, dry, go)

