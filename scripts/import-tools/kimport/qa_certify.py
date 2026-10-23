"""`k qa certify`: a certificate for every question students can see. Read-only on the database.

1. A fresh read-only export of every student-visible row (kimport.qa_export, visible=True:
   is_live and publish_status publish_ready / publish_ready_with_verified_repair, the rows
   quiz_questions_live serves), in full.
2. Static checks (kimport.qa_static with ts/qa-check.ts) under main's display rules.
3. Render: a throwaway git worktree of origin/main (current main code) gets the dev-only
   /dev/qa-render route copied in (never committed), a dev server on a free port, and
   qa/render-audit.mjs renders every row at laptop and phone size with all render checks.
   The server is stopped and the worktree removed afterwards.
4. Answer certification (kimport.qa_answers).

Writes the run's files to pipeline/qa/certify-<time>/ and the certificate to
pipeline/qa/certificate-<date>.md and .json: counts, and every visible id that fails a
fail-level static check or any render check, or whose answer is uncertified, with the reason;
and pipeline/qa/uncertified-<date>.json, the uncertified rows for a blind re-solve (no keys).
--reuse <certify folder> certifies the answers again on an earlier run's export, static
report and render.
"""

import json
import os
import shutil
import signal
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

from kimport import qa_answers, qa_export, qa_static
from kimport.jsonio import write_text_atomic

REPO = qa_static.REPO
# The dev-only render route and its one helper module (missing on main), copied into the worktree.
RENDER_FILES = ("src/app/dev/qa-render/QaQuestion.tsx", "src/app/dev/qa-render/page.tsx",
                "src/app/dev/qa-render/api/route.ts", "src/app/dev/qa-render/qa-data.ts",
                "src/app/dev/figure-review/review-data.ts")
READY_TIMEOUT = 900


def _git(*args, cwd=REPO) -> str:
    return subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, text=True).stdout.strip()


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _wait_ready(url: str, proc, timeout: int = READY_TIMEOUT) -> None:
    end = time.time() + timeout
    while time.time() < end:
        if proc.poll() is not None:
            raise RuntimeError(f"the main dev server exited ({proc.returncode}); see dev-server.log")
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                if r.status == 200:
                    return
        except Exception:  # noqa: BLE001 — still compiling
            pass
        time.sleep(3)
    raise RuntimeError(f"the main dev server did not serve {url} within {timeout}s")


def render_on_main(export: Path, out: Path, first_id: str, log=print) -> dict:
    """Render every row of the export on current origin/main code; returns render-report.json plus the commit."""
    _git("fetch", "-q", "origin", "main")
    commit = _git("rev-parse", "origin/main")
    tree = Path(tempfile.mkdtemp(prefix="karman-main-qa-"))
    proc = None
    try:
        _git("worktree", "add", "-q", "--detach", str(tree), commit)
        for rel in RENDER_FILES:
            if not (tree / rel).exists():
                (tree / rel).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(REPO / rel, tree / rel)
        for link in ("node_modules", ".env.local"):
            (tree / link).symlink_to((REPO / link).resolve())
        port = _free_port()
        env = {**os.environ, "QA_RENDER_EXPORT": str(Path(export).resolve()), "NEXT_TELEMETRY_DISABLED": "1"}
        with open(out / "dev-server.log", "w") as server_log:
            proc = subprocess.Popen(["npx", "next", "dev", "--webpack", "-H", "127.0.0.1", "-p", str(port)], cwd=tree,
                                    env=env, stdout=server_log, stderr=subprocess.STDOUT, start_new_session=True)
            base = f"http://127.0.0.1:{port}"
            log(f"  main {commit[:12]} dev server on {base}; waiting for /dev/qa-render")
            _wait_ready(f"{base}/dev/qa-render?id={first_id}", proc)
            with open(out / "render.log", "a") as render_log:
                subprocess.run(["node", str(REPO / "scripts/import-tools/qa/render-audit.mjs"), "--export", str(export),
                                "--out", str(out), "--base", base], cwd=REPO, check=True, stdout=render_log,
                               stderr=subprocess.STDOUT)
    finally:
        if proc is not None and proc.poll() is None:
            os.killpg(proc.pid, signal.SIGTERM)
            try:
                proc.wait(30)
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid, signal.SIGKILL)
        subprocess.run(["git", "worktree", "remove", "--force", str(tree)], cwd=REPO, capture_output=True)
        shutil.rmtree(tree, ignore_errors=True)
        subprocess.run(["git", "worktree", "prune"], cwd=REPO, capture_output=True)
    write_text_atomic(out / "render-meta.json", json.dumps({"main_commit": commit}))
    return read_render(out, commit)


def read_render(out: Path, commit: str) -> dict:
    """render-report.json of a render run, with the ids that have a result and the main commit."""
    report = json.loads((out / "render-report.json").read_text())
    done = set()
    for line in (out / "render-results.jsonl").read_text().splitlines():
        try:
            done.add(json.loads(line)["id"])
        except (ValueError, KeyError):
            pass  # a line cut off by a stopped run
    return {**report, "main_commit": commit, "rendered_ids": sorted(done)}


def _reused_commit(pipe: Path, work: Path) -> str:
    """The main commit an earlier run in `work` rendered on (render-meta.json, else its certificate)."""
    meta = work / "render-meta.json"
    if meta.exists():
        return json.loads(meta.read_text())["main_commit"]
    for c in sorted((pipe / "qa").glob("certificate-*.json")):
        try:
            d = json.loads(c.read_text())
        except ValueError:
            continue
        if d.get("work_dir") == str(work) and d.get("main_commit"):
            return d["main_commit"]
    raise ValueError(f"{work} has no render-meta.json and no certificate names it; cannot reuse its render")


def build_certificate(rows: list[dict], static: dict, render: dict, rec: qa_answers.QaRecords, meta: dict) -> dict:
    static_q = static.get("questions") or {}
    render_q = render.get("questions") or {}
    rendered = set(render.get("rendered_ids") or [])
    failing, uncertified, per_reason, bases = [], [], {}, {}
    review_only = 0
    for row in sorted(rows, key=lambda r: str(r["id"])):
        rid = str(row["id"])
        checks = (static_q.get(rid) or {}).get("checks") or {}
        fails = {c: d for c, d in checks.items() if qa_static.LEVELS.get(c, "review") == "fail"}
        review_only += bool(checks) and not fails
        renders = (render_q.get(rid) or {}).get("failures") or {}
        if rid not in rendered:
            renders = {**renders, "render_missing": ["no render result"]}
        answer = qa_answers.certify_row(row, rec)
        if fails or renders:
            failing.append({"id": rid, "static": fails, "render": renders})
        if answer["status"] != "certified":
            uncertified.append({"id": rid, **answer})
            per_reason[answer["reason"]] = per_reason.get(answer["reason"], 0) + 1
        else:
            bases[answer["basis"]] = bases.get(answer["basis"], 0) + 1
    bad = {f["id"] for f in failing} | {u["id"] for u in uncertified}
    return {**meta,
            "totals": {"visible": len(rows), "certified": len(rows) - len(bad), "failing": len(failing),
                       "failing_static": sum(1 for f in failing if f["static"]),
                       "failing_render": sum(1 for f in failing if f["render"]),
                       "uncertified": len(uncertified), "uncertified_by_reason": dict(sorted(per_reason.items())),
                       "answer_basis": dict(sorted(bases.items())), "review_only_static": review_only},
            "rendered": {k: render.get("totals", {}).get(k) for k in ("expected", "rendered", "render_failed")},
            "failing": failing, "uncertified": uncertified}


def _detail(d: dict) -> str:
    return "; ".join(f"{c}: {' / '.join(v)[:160]}" for c, v in d.items())


def certificate_md(cert: dict) -> str:
    t = cert["totals"]
    lines = [f"# Question certificate, {cert['date']}", "",
             f"Export: {cert['export']} (exported {cert['exported_at']}, {t['visible']} student-visible questions: "
             "is_live and publish_status publish_ready or publish_ready_with_verified_repair).",
             f"Rendered on main {cert['main_commit'][:12]} at 1280x800 and 390x844 "
             f"({cert['rendered']['rendered']} of {cert['rendered']['expected']} rendered, "
             f"{cert['rendered']['render_failed']} failed to render).", "",
             "| | questions |", "|---|---|",
             f"| visible | {t['visible']} |", f"| certified (no failing check, answer certified) | {t['certified']} |",
             f"| failing a check (static fail level or render) | {t['failing']} |",
             f"| ... static | {t['failing_static']} |", f"| ... render | {t['failing_render']} |",
             f"| answer uncertified | {t['uncertified']} |"]
    lines += [f"| ... {k} | {v} |" for k, v in t["uncertified_by_reason"].items()]
    lines += ["", "Answers certified by: " + ", ".join(f"{k} {v}" for k, v in t["answer_basis"].items()) + ".",
              f"Review-level static findings only (not counted as failing): {t['review_only_static']}.", "",
              "Answer rule: a QA verdict clean or key_ok on the text and key still live; or a QA correction (still as "
              "corrected), or a question published after the QA snapshot (evidence in its own batch folders), whose "
              "evidence holds: the official printed key plus at least one other agreeing independent solver, or (a "
              "generated or overridden key) at least two agreeing independent solvers. Anything else is uncertified "
              "(listed for a blind re-solve in uncertified-<date>.json).", ""]
    lines += ["## Failing a check", ""] + ([f"- `{f['id']}`: " + "; ".join(
        x for x in (_detail(f["static"]), _detail(f["render"])) if x) for f in cert["failing"]] or ["None."])
    lines += ["", "## Answer uncertified", ""] + ([f"- `{u['id']}`: {u['reason']}" + (
        f" ({str(u.get('detail'))[:200]})" if u.get("detail") else "")
        + (f" [agreeing: {', '.join(u['agreeing']) or 'none'}]" if "agreeing" in u else "")
        for u in cert["uncertified"]] or ["None."])
    return "\n".join(lines) + "\n"


def uncertified_list(cert: dict) -> dict:
    """The uncertified rows for reviewers to re-solve blind: ids, batch, reason and which solvers are on
    record, but no key or answer (so the re-solve stays blind)."""
    return {"date": cert["date"], "certificate": cert["work_dir"], "count": len(cert["uncertified"]),
            "rows": [{"id": u["id"], "stable_question_id": u.get("stable_question_id"), "batch": u.get("batch"),
                      "reason": u["reason"], "basis": u.get("basis"), "printed_key_on_record": u.get("printed_key") is not None,
                      "agreeing_solvers": u.get("agreeing", []), "disagreeing_solvers": u.get("disagreeing", []),
                      "solvers_needed": u.get("needed_solvers"),
                      # a QA verdict's note can name the key ("key B->A"): only the folder lookup detail is kept
                      "detail": u.get("detail") if u["reason"] == "post_qa_no_batch_folder" else None}
                     for u in cert["uncertified"]]}


def run_certify(pipe: Path, now: str, export: Path | None = None, env_file: Path = REPO / ".env.local",
                log=print, render=render_on_main, exporter=qa_export.run_qa_export, reuse: Path | None = None) -> dict:
    """reuse: an earlier run's certify-<time> folder; its export, static report and render are used
    as they are and only the answers are certified again."""
    pipe = Path(pipe)
    if reuse is not None:
        work, export = Path(reuse), Path(reuse) / "visible.json"
    else:
        stamp = now.replace("-", "").replace(":", "")[:15] + "Z"
        work = pipe / "qa" / f"certify-{stamp}"
    work.mkdir(parents=True, exist_ok=True)
    if export is None:
        export = work / "visible.json"
        log("export: student-visible rows (read-only)")
        exporter(export, Path(env_file), log=log, visible=True)
    doc = json.loads(Path(export).read_text())
    rows = [r for r in doc["rows"] if r.get("is_live") is True
            and r.get("publish_status") in qa_export.VISIBLE_STATUSES]
    if len(rows) != len(doc["rows"]):
        raise ValueError(f"{export} holds rows students cannot see; use a visible export")
    if reuse is not None:
        log(f"reusing the static report and render of {work}")
        static = json.loads((work / "static-report.json").read_text())
        rend = read_render(work, _reused_commit(pipe, work))
    else:
        log(f"static checks: {len(rows)} rows")
        static = qa_static.run_static(Path(export), work)
        log("render on main")
        rend = render(Path(export), work, str(rows[0]["id"]), log)
    rec = qa_answers.QaRecords(pipe)
    cert = build_certificate(rows, static, rend, rec, {
        "date": now[:10], "now": now, "export": str(export), "exported_at": doc.get("exported_at"),
        "fingerprint": doc.get("fingerprint"), "main_commit": rend.get("main_commit", ""), "work_dir": str(work)})
    date = now[:10]
    write_text_atomic(pipe / "qa" / f"certificate-{date}.json", json.dumps(cert, indent=1, ensure_ascii=False))
    write_text_atomic(pipe / "qa" / f"certificate-{date}.md", certificate_md(cert))
    write_text_atomic(pipe / "qa" / f"uncertified-{date}.json", json.dumps(uncertified_list(cert), indent=1, ensure_ascii=False))
    return {"certificate": str(pipe / "qa" / f"certificate-{date}.md"),
            "uncertified_list": str(pipe / "qa" / f"uncertified-{date}.json"), **cert["totals"]}
