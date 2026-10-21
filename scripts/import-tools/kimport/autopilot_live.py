"""Two autopilot steps kept out of kimport.autopilot (file size):

live_phase: corrected batches for rows that are already LIVE (kimport.live_fix).
  fresh read-only readback of the live rows -> build -> every .dryrun.sql ->
  intent (action evidence_live) -> chunks (a chunk that fails part-way is rolled
  back, rollback dry run first) -> readback -> verify (exact rows, the app's
  scope check, the stored seal recomputed) -> intent closed verified -> the
  corrected rows' claims released. A readback that differs leaves the intent
  open for a person. Runs before any stage file, so the stage and publish
  fingerprint guards are unaffected (it changes no quiz_questions row).

after_run: rows refused because they duplicate a LIVE row (same comparison
  key, content hash, normalized text or source question as a live export row;
  typo-level and in-run matches are not counted) are recorded in the lane as
  already_live (resolved, never sliced again) and dropped from every claim.
  When the run published anything, a fresh export is taken and `k corpus` is
  re-run with it (same C index, ledger, lane; the founder decision log in
  corpus/ is re-applied), so occurrences duplicating newly live questions
  become members and are not sliced; a published occurrence that still comes
  out canonical (its reviewed text differs from the C text) is recorded as
  already_live too. A failed refresh is logged and does not fail the run.
"""

import hashlib
import json
import re
from pathlib import Path

from kimport import lane, live_fix
from kimport import stage as st
from kimport.export import _unwrap

C_INDEX = Path("/Users/zakariabennis/Documents/Codex/2026-10-05/task-4/agent-c-output/"
               "final-current-plus-partial-question-records-20261007.json")
LEDGER = Path("/Users/zakariabennis/Documents/Codex/2026-10-11/task-3/current-readiness-ledger.json")
REASON_PREFIX = "live correction: "
_UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
_DUP = ("same comparison key as", "content_hash_v2 already in the bank", "normalized question_text already in",
        "source question already in the bank")


def run_corpus(export: Path, out_dir: Path, lane_path: Path) -> dict:
    from kimport import corpus
    return corpus.run_corpus(C_INDEX, LEDGER, Path(export), Path(out_dir), None, Path(lane_path))


# ---------------------------------------------------------------- live corrections


def live_phase(ap, dirs: list[Path], doc, rows_runner) -> dict:
    from kimport import bulk
    from kimport.autopilot import Stop
    out_dir = ap.run_dir / "live"
    out_dir.mkdir(parents=True, exist_ok=True)
    loaded, _ = bulk.load_batches(dirs, ap.d.exams_dir, None, rows_runner)
    sources = [it["source"] for b in loaded for it in b["items"]]
    snaps = []
    if sources:
        (out_dir / "live-before-readback.sql").write_text(st.readback_sql(f"{ap.run_id} live rows", sources))
        raw = ap.read(out_dir / "live-before-readback.sql")
        (out_dir / "live-before-readback.json").write_text(json.dumps(raw))
        snaps = [r["snapshot"] for r in _unwrap(raw)["rows"]]
    res = live_fix.build(dirs, doc, ap.run_id, snaps, ap.d.row_sealer, ap.d.exams_dir, ap.d.chunk_size,
                         rows_runner=rows_runner)
    st._write_all(out_dir, res["files"])
    pre = res["precheck"]
    refused = [{**r, "reasons": [REASON_PREFIX + x for x in r["reasons"]]} for r in pre["refused"]]
    ap.live_res = {"refused": refused, "refused_batches": pre["refused_batches"], "corrected": 0,
               "would_correct": len(res["items"])}
    chunks = pre["chunks"]
    ap.say(f"Live corrections: {len(res['items'])} live rows get corrected evidence in {len(chunks)} file(s), "
           f"{len(refused)} refused. Dry runs first.")
    for c in chunks:
        ap.read(out_dir / c["file"].replace(".sql", ".dryrun.sql"))
    if ap.dry or not chunks:
        _record_batches(ap, pre, ok=False if ap.dry else True)
        return ap.live_res
    qids = [it["snap"]["question"]["id"] for it in res["items"]]
    from kimport import writer
    iid = writer.write_intent(ap.intents, ap.run_id, "evidence_live", qids, pre["evidence_sql_sha256"], ap.now())
    ap.open_intent = (iid, "evidence_live")
    expected = json.loads((out_dir / "live-expected.json").read_text())
    done = []
    for c in chunks:
        f = out_dir / c["file"]
        part = {i: expected[i] for i in c["ids"]}
        try:
            ap.write(f, f.with_name(f.name.replace(".sql", ".dryrun.sql")),
                     landed=lambda c=c, part=part: not _check(ap, out_dir, c, part))
            done.append(c)
        except Stop as e:
            _roll_back(ap, out_dir, done, str(e))
            raise
    raws = []
    problems = []
    for c in chunks:
        raw = _unwrap(ap.read(out_dir / c["readback"]))
        p = out_dir / c["readback"].replace(".sql", "-raw.json")
        p.write_text(json.dumps(raw))
        raws.append(p)
        problems += live_fix.verify_readback({i: expected[i] for i in c["ids"]}, [raw], ap.d.row_sealer)
    if problems:
        raise Stop("the live rows read back differ from the correction: " + "; ".join(problems[:5]))
    ap.close("verified", _sha_files(raws))
    ap.live_res["corrected"] = len(res["items"])
    ap.run["evidence_corrected"] = len(res["items"])
    corrected = pre["corrected_ids"]
    released = lane.release_ids(lane.claims_path_for(ap.lane), corrected)
    _record_batches(ap, pre, ok=True)
    ap.say(f"Live corrections verified: {len(corrected)} rows; {len(released)} finished claims released.")
    return ap.live_res


def _check(ap, out_dir: Path, c: dict, part: dict) -> list[str]:
    try:
        raw = _unwrap(ap.read(out_dir / c["readback"]))
    except Exception as e:  # noqa: BLE001 - "did it land" is only a yes when the readback proves it
        return [str(e)]
    return live_fix.verify_readback(part, [raw], ap.d.row_sealer)


def _roll_back(ap, out_dir: Path, done: list[dict], why: str) -> None:
    from kimport.autopilot import Stop
    if not done:
        ap.close("not_applied", hashlib.sha256(why.encode()).hexdigest())
        return
    ap.say(f"Live corrections stopped after {len(done)} file(s); putting the old evidence back (dry run first).")
    try:
        for c in reversed(done):
            r = out_dir / c["rollback"]
            ap.read(r.with_name(r.name.replace(".sql", ".dryrun.sql")))
            ap.write(r, r.with_name(r.name.replace(".sql", ".dryrun.sql")))
    except Stop as e:
        ap.say(f"  rollback stopped: {e}; the evidence_live intent stays open for a person")
        return
    ap.close("rolled_back", hashlib.sha256(why.encode()).hexdigest())


def _record_batches(ap, pre: dict, ok: bool) -> None:
    if ap.dry:
        return
    by_batch: dict = {}
    for r in pre["refused"]:
        by_batch[r["batch"]] = by_batch.get(r["batch"], 0) + 1
    for name, b in pre["batches"].items():
        n = b["corrected"] if ok else 0
        ap.state["batches"][b["folder"]] = {"run": ap.run_id, "status": "evidence_corrected" if n else "refused",
                                            "rows": b["rows"], "staged": 0, "published": 0, "held": 0,
                                            "refused": by_batch.get(name, 0), "evidence_corrected": n,
                                            "at": ap.run["at"], "live_fix": True}
    for rb in pre["refused_batches"]:
        ap.state["batches"][rb["folder"]] = {"run": ap.run_id, "status": "refused", "rows": None, "staged": 0,
                                             "published": 0, "held": 0, "refused": None, "at": ap.run["at"],
                                             "reason": rb["reason"], "live_fix": True}


def _sha_files(paths) -> str:
    h = hashlib.sha256()
    for p in paths:
        h.update(Path(p).read_bytes())
    return h.hexdigest()


# ---------------------------------------------------------------- after the run


def duplicates_of_live(refused: list[dict], export_rows: list[dict]) -> dict:
    """{stable id: (live row id, reason)} for refused rows that duplicate a live export row."""
    live = {r["id"] for r in export_rows if r.get("is_live") is True and r.get("archived_at") is None}
    out = {}
    for r in refused:
        for reason in r.get("reasons") or []:
            if reason.startswith(REASON_PREFIX) or not reason.startswith(_DUP):
                continue
            hit = next((u for u in _UUID.findall(reason) if u in live), None)
            if hit:
                out[r["id"]] = (hit, reason)
                break
    return out


def mark_duplicates(lane_path: Path, refused: list[dict], export_rows: list[dict], run_id: str, now: str) -> dict:
    dups = duplicates_of_live(refused, export_rows)
    entries = {sid: (row, f"refused in {run_id}: {why}") for sid, (row, why) in dups.items()}
    marked = lane.mark_already_live(lane_path, entries, now, "duplicate_of_live") if entries else []
    released = lane.release_ids(lane.claims_path_for(lane_path), sorted(dups))
    return {"duplicates_of_live": len(dups), "marked": len(marked), "released": len(released)}


def refresh_corpus(export: Path, pipe: Path, published_ids: list[str], run_id: str, now: str,
                   runner=run_corpus) -> dict:
    """Re-run `k corpus` with `export`; published ids still canonical afterwards go in the lane as already_live."""
    pipe = Path(pipe)
    counts = runner(Path(export), pipe / "corpus", pipe / "lane.json")
    roles = json.loads((pipe / "corpus" / "clusters.json").read_text(encoding="utf-8"))["roles"]
    still = {i: (None, f"published (in {run_id} or earlier); its reviewed text is not merged with the live row "
                       "by the corpus") for i in published_ids if roles.get(i) == "canonical"}
    marked = lane.mark_already_live(pipe / "lane.json", still, now, "published") if still else []
    return {"unique": counts.get("unique"), "unique_not_live": counts.get("unique_not_live"),
            "live_unique": counts.get("live_unique"), "published_still_canonical": len(marked),
            "export": str(export)}


def after_run(ap, published: bool, published_ids: list[str], export_rows: list[dict]) -> None:
    """Never raises: what it did goes in run.log and the run record."""
    try:
        res = mark_duplicates(ap.lane, ap.all_refused, export_rows, ap.run_id, ap.now())
        ap.run["duplicates_of_live"] = res["duplicates_of_live"]
        if res["duplicates_of_live"]:
            ap.say(f"{res['duplicates_of_live']} refused rows duplicate a live question: recorded in the lane as "
                   f"already live, {res['released']} claims released.")
    except Exception as e:  # noqa: BLE001
        ap.say(f"  could not record the duplicates of live rows: {type(e).__name__}: {e}")
    if not published:
        return
    try:
        _, export = ap.export("live-after-publish.json")
        c = refresh_corpus(export, ap.pipe, published_ids, ap.run_id, ap.now(), ap.d.corpus_runner)
        ap.run["corpus"] = c
        ap.say(f"Duplicate map refreshed from the new export: {c['unique']} unique, {c['unique_not_live']} not "
               f"yet live; {c['published_still_canonical']} published rows recorded as already live.")
    except Exception as e:  # noqa: BLE001
        ap.run["corpus"] = {"error": f"{type(e).__name__}: {e}"}
        ap.say(f"  could not refresh the duplicate map: {type(e).__name__}: {e}")


def published_ids(pipe: Path) -> list[str]:
    """Every stable id sealed for publish in the pipeline's run folders (autopilot, bulk and batch runs)."""
    pipe = Path(pipe)
    out = set()
    for f in list(pipe.glob("*/seal/sealed-preview.json")) + list(pipe.glob("*/stage/sealed-preview.json")) + \
            list(pipe.glob("batches/*/stage/sealed-preview.json")):
        try:
            out |= {r["stable_question_id"] for r in json.loads(f.read_text(encoding="utf-8"))["rows"]}
        except (OSError, ValueError, KeyError, TypeError):
            continue
    return sorted(out)


def refresh_now(pipe: Path, run: str, exporter, now: str, runner=run_corpus) -> dict:
    """`k autopilot-refresh`: the after-run step for an earlier run, by hand. Takes a fresh export into the run
    folder, records that run's refused duplicates of live rows, re-runs the corpus and records every published
    occurrence still canonical. Holds the writer lock; updates the run's ledger record and the status file."""
    from kimport import autopilot_state as aps
    from kimport import writer
    from kimport.export import read_export_doc
    pipe = Path(pipe)
    run_dir = pipe / run
    if not run_dir.is_dir():
        raise ValueError(f"no run folder {run_dir}")
    lock = pipe / "writer.lock"
    writer.acquire_lock(lock, f"autopilot-refresh {run}", now)
    try:
        writer.require_no_open_intents(pipe / "intents.jsonl")
        export = run_dir / "live-refresh.json"
        exporter(export)
        rows = read_export_doc(export).rows
        refused = []
        for f in ("stage/precheck.json", "fix/fix-precheck.json", "live/live-precheck.json"):
            p = run_dir / f
            if p.exists():
                refused += json.loads(p.read_text(encoding="utf-8")).get("refused", [])
        dups = mark_duplicates(pipe / "lane.json", refused, rows, run, now)
        c = refresh_corpus(export, pipe, published_ids(pipe), run, now, runner)
        state = aps.read_state(pipe)
        if run in state["runs"]:
            state["runs"][run].update(corpus=c, duplicates_of_live=dups["duplicates_of_live"])
            aps.write_state(pipe, state)
        msg = (f"Refreshed after {run}: {dups['duplicates_of_live']} refused rows recorded as duplicates of live rows "
               f"({dups['released']} claims released); corpus {c['unique']} unique, {c['unique_not_live']} not yet "
               f"live; {c['published_still_canonical']} published rows recorded as already live.")
        status = json.loads((pipe / aps.STATUS).read_text()) if (pipe / aps.STATUS).exists() else {}
        last = {"id": status.get("last_run"), "at": status.get("last_run_at"),
                "result": status.get("last_result", "no_new_batches"),
                "refused": status.get("last_run_refused_by_reason") or {}}
        aps.write_status(pipe, state, last, status.get("message") or msg, status.get("last_error"))
        return {**dups, **c, "message": msg}
    finally:
        writer.release_lock(lock, f"autopilot-refresh {run}")
