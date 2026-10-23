"""`k autopilot --resume <run>`: finish a run that stopped AFTER its rows were
written and read back but BEFORE anything was published.

Such a run (for example one whose publish build was stopped by the figure
gate) leaves its rows as hidden private drafts and every batch "stopped", so
the autopilot never takes them again by itself. Once a person has fixed the
cause, --resume finishes it under a new run id (auto-<time>-resume) with every
check run again against the bank as it is now:

  the old run stopped (result.json), every one of its batches is "stopped" in
  the ledger, its stage intent was closed "verified", no publish was built
  (no publish/precheck.json), no intent is open -> writer lock -> fresh export
  -> the old run's readback files run again (read-only) -> k seal --hold-failing
  against the old run's preview (the readback must still equal exactly what
  was written, still private drafts; the app's scope check and the seal run
  again) -> then exactly the normal publish sequence (fresh export, k publish
  --bulk with its duplicate checks and the founder's figure gate, publish
  intent, every dry run, publish files, visible count, ledger, claims, QA
  corrections recorded).

A run that stopped anywhere else (a stage that stopped part-way, a publish
that started) is refused: a person must look at it.
--dry runs every read-only step and the publish dry runs and writes nothing
outside its run folder.
"""

import json
import shutil
from pathlib import Path

from kimport import bulk, writer
from kimport import stage as st


def _load(path: Path):
    return json.loads(Path(path).read_text(encoding="utf-8")) if Path(path).exists() else None


def check_stopped(pipe: Path, state: dict, name: str) -> dict:
    """The old run's result, if it may be resumed; ValueError with the reason otherwise."""
    old = Path(pipe) / name
    res = _load(old / "result.json")
    if not isinstance(res, dict) or res.get("result") != "stopped" or res.get("dry"):
        raise ValueError(f"{name} is not a stopped (real) run")
    if (old / "publish" / "precheck.json").exists():
        raise ValueError(f"{name} built its publish files; a person must look at it")
    if not (old / "seal" / "run-preview.json").exists() or not (old / "seal" / "sealed-preview.json").exists():
        raise ValueError(f"{name} did not get through readback and seal")
    entries = writer._read(Path(pipe) / "intents.jsonl") if (Path(pipe) / "intents.jsonl").exists() else []
    mine = [e for e in entries if e.get("type") == "open" and e.get("batch") == name]
    closed = {e["intent_id"]: e.get("outcome") for e in entries if e.get("type") == "close"}
    if [e["action"] for e in mine] != ["stage"] or closed.get(mine[0]["intent_id"]) != "verified":
        raise ValueError(f"{name}: expected exactly one stage intent, closed verified "
                         f"(found {[(e['action'], closed.get(e['intent_id'])) for e in mine]})")
    bad = [b for b in res.get("batches") or [] if (state["batches"].get(b) or {}).get("status") != "stopped"
           or state["batches"][b].get("run") != name]
    if not res.get("batches") or bad:
        raise ValueError(f"{name}: {len(bad)} of its batches are no longer 'stopped' by this run "
                         f"(e.g. {', '.join(bad[:3])})")
    return res


def batch_dirs(pipe: Path, state: dict, name: str) -> list[Path]:
    res = check_stopped(pipe, state, name)
    root = Path(pipe) / "batches"
    dirs = [root / b for b in res["batches"]]
    missing = [d.name for d in dirs if not (d / "READY").is_file()]
    if missing:
        raise ValueError(f"{name}: batch folders missing: {', '.join(missing[:3])}")
    return dirs


def go(ap, name: str) -> str:
    """Autopilot.go for --resume (the caller holds the writer lock, unless dry)."""
    from kimport.autopilot import Stop
    old = ap.pipe / name
    if not ap.dry:
        writer.require_no_open_intents(ap.intents)
    check_stopped(ap.pipe, ap.state, name)
    ap.say(f"Resuming {name}: its rows were written and read back, nothing was published. "
           "Every check runs again against the bank as it is now.")
    doc, _ = ap.export("live-before.json")
    spre = _load(old / "stage" / "precheck.json") or {}
    fpre = _load(old / "fix" / "fix-precheck.json")
    qpre = _load(old / "qa" / "qa-precheck.json")
    preview_rows = _load(old / "seal" / "run-preview.json")["rows"]
    seal_dir = ap.run_dir / "seal"
    seal_dir.mkdir(parents=True, exist_ok=True)
    preview = seal_dir / "run-preview.json"
    shutil.copyfile(old / "seal" / "run-preview.json", preview)
    rb_dir = ap.run_dir / "readback"
    rb_dir.mkdir(parents=True, exist_ok=True)
    rb = []
    for sub, pre in (("stage", spre if spre.get("staged_ids") else None), ("fix", fpre), ("qa", qpre)):
        for f in (pre or {}).get("readback_files", []):
            dst = rb_dir / f"{sub}-{f}" if not f.startswith(sub) else rb_dir / f
            shutil.copyfile(old / sub / f, dst)
            rb.append(dst)
    n = len(preview_rows)
    if not rb:
        raise Stop(f"{name} has no readback files")
    fres = {"precheck": fpre, "preview_rows": [p for p in preview_rows if p.get("kimport_fix")]} if fpre else None
    qres = {"precheck": qpre, "preview_rows": [p for p in preview_rows if p.get("kimport_qa")]} if qpre else None
    ap.batch_info(spre, fres, {}, qres)
    ap.batch_of = {p["stable_question_id"]: p.get("kimport_batch") for p in preview_rows}
    ap.run["refused"] = {}  # counted in the stopped run already; the lane still gets them (all_refused)
    if ap.dry:
        return dry(ap, rb, preview, doc, n)
    return ap.seal_and_publish(rb, preview, preview_rows, qres, doc, None)


def dry(ap, rb: list[Path], preview: Path, doc, n: int) -> str:
    """Read-only: readback, seal (no lane), publish build and every publish dry run."""
    from kimport.autopilot import Stop
    from kimport.publish import RefuseToBuild
    raws = []
    for f in rb:
        out = f.with_name(f.name.replace(".sql", "") + "-raw.json")
        out.write_text(json.dumps(ap.read(f)))
        raws.append(out)
    sealed = ap.run_dir / "seal" / "sealed-preview.json"
    try:
        res = st.run_seal(raws, None, sealed, preview=preview, hold_failing=True, row_sealer=ap.d.row_sealer,
                          lane_path=None, now=ap.now())
    except RefuseToBuild as e:
        raise Stop(f"the readback does not match what was written: {e.reason}") from None
    held = json.loads((sealed.parent / "held.json").read_text())["held"]
    _, export2 = ap.export("live-after-stage.json")
    pub = ap.run_dir / "publish"
    bulk.run_bulk_publish(ap.run_id, sealed.parent / "private-readback.json", sealed, export2, ap.intents, pub,
                          ap.d.chunk_size)
    ppre = json.loads((pub / "precheck.json").read_text())
    for c in ppre["chunks"]:
        ap.read(pub / c["file"].replace(".sql", ".dryrun.sql"))
    ap.run["result"] = "dry_run_ok"
    return (f"Dry run passed: {n} rows read back as written, {res['rows']} sealed, {len(held)} would be held, "
            f"{len(ppre['question_ids'])} would be published. Nothing was written.")

