"""`k autopilot`: publish every newly reviewed batch end to end, unattended.

The founder gave a standing OK to publish rows that pass every automatic
check. This runs the sequence of pipeline/bulk-1/RUN.md with no prompts:

  writer lock -> no open intent -> export -> k stage (bulk, skip refused) and,
  for corrected batches of rows held earlier, an evidence update (kimport.fix)
  -> every .dryrun.sql -> stage intent -> stage/evidence chunks -> readback ->
  k seal --hold-failing -> close intent -> fresh export -> k publish --bulk ->
  publish intent -> every publish .dryrun.sql -> publish chunks -> visible
  count -> close intent -> claims of published rows released -> ledger and
  status written.

Database writes are only the files the builders generate, each only after its
.dryrun.sql twin passed in this run. A transient connection error is retried
(a write is retried only after its dry-run twin shows it did not land). Any
other error stops the run: a publish that stopped part-way is rolled back
(rollback dry-run first) and its intent closed as rolled_back; an intent whose
write never ran is closed as not_applied; anything a person must look at
(a stage that stopped part-way, a readback that differs) leaves its intent
open, so the next run refuses to start until someone has looked. The writer
lock is released at the end, on error too. Every run's files are in
pipeline/auto-<timestamp>/, with run.log in plain English.

A corrected batch for questions `k qa hide` took off the site (kimport.qa_correct)
turns each hidden row back into a private draft with the corrected content, in
place (same id), with the stage files; the rows are then read back, sealed and
published like staged rows, and each published one is appended to
pipeline/qa/corrections.jsonl.

A corrected batch for rows that are already LIVE (kimport.live_fix) is an
evidence-only correction of those live rows, run before any stage file
(kimport.autopilot_live.live_phase). At the end, rows refused as duplicates of
a live row go in the lane as already_live, every other refused row (and each
row of a batch refused whole) goes in as extraction_repair, and after a run that published
anything the corpus duplicate map is rebuilt from a fresh export
(kimport.autopilot_live.after_run).

--retry <folder pattern> takes batch folders the ledger lists as refused or published again
(for example after a builder learned a new kind of correction).

--dry does every read-only step (export, build, every stage and evidence
dry-run) and writes nothing outside its run folder: no lock, intent, lane,
claims, ledger or status. With no new READY batch it returns at once.
"""

import fnmatch
import hashlib
import json
import re
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

from kimport import autopilot_live as apl
from kimport import autopilot_state as aps
from kimport import bulk, fix, lane, live_fix, qa_correct, writer
from kimport import stage as st
from kimport.export import _unwrap, read_export_doc
from kimport.fetch import ExportFailed, run_export
from kimport.publish import RefuseToBuild
from kimport.sqlutil import uuid_literal

REPO = Path(__file__).resolve().parents[3]
CHUNK = 50  # each staged row scans the bank for normalized text; 200 rows hit the 100 s gateway limit (524)
RETRYABLE = ("refused", "published")  # --retry never takes a stopped batch: a person must look at it first
TRIES = 4
VISIBLE = "('publish_ready','publish_ready_with_verified_repair')"
_TRANSIENT = re.compile(r"connection reset|reset by peer|timed? ?out|timeout|unexpected eof|\bEOF\b|connection refused|"
                        r"temporar|\b50[234]\b|\b429\b|too many requests|bad gateway|service unavailable|"
                        r"network|tls handshake|broken pipe|no such host|i/o timeout|connection closed", re.I)


class DbError(Exception):
    def __init__(self, msg: str, transient: bool | None = None):
        super().__init__(msg)
        self.transient = bool(_TRANSIENT.search(msg)) if transient is None else transient


class Stop(Exception):
    """A non-transient problem: the run stops here."""


def _parse(out: str):
    lines = out.splitlines()
    for n, line in enumerate(lines):
        if line.lstrip().startswith(("[", "{")):
            return json.loads("\n".join(lines[n:]))
    raise ValueError("no JSON in the output")


def supabase_file_runner(path: Path):
    """Run one SQL file on the linked project; the parsed JSON result (CLI noise lines dropped)."""
    try:
        done = subprocess.run(["supabase", "db", "query", "--linked", "--agent=no", "-o", "json", "-f", str(path)],
                              cwd=REPO, capture_output=True, text=True, timeout=1800)
    except subprocess.TimeoutExpired:
        raise DbError(f"{Path(path).name}: timed out", True) from None
    except OSError as e:
        raise DbError(f"{Path(path).name}: {e}", False) from None
    if done.returncode != 0:
        raise DbError(f"{Path(path).name}: {(done.stderr or done.stdout).strip()[-800:]}")
    try:
        return _parse(done.stdout)
    except ValueError as e:
        raise DbError(f"{Path(path).name}: {e}: {done.stdout[:200]!r}", False) from None


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


class Deps:
    """Everything that touches the world, injectable for tests."""

    def __init__(self, db=supabase_file_runner, exporter=None, rows_runner=st.stage_rows,
                 row_sealer=st.seal_rows_per_row, clock=None, sleep=time.sleep, log=print,
                 exams_dir: Path = bulk.EXAMS, chunk_size: int = CHUNK, corpus_runner=apl.run_corpus):
        self.db = db
        self.exporter = exporter or (lambda out: run_export(out, log=lambda m: None))
        self.rows_runner = rows_runner
        self.row_sealer = row_sealer
        self.clock = clock or (lambda: datetime.now(timezone.utc))
        self.sleep = sleep
        self.log = log
        self.exams_dir = Path(exams_dir)
        self.chunk_size = chunk_size
        self.corpus_runner = corpus_runner


def _sha_files(paths) -> str:
    h = hashlib.sha256()
    for p in paths:
        h.update(Path(p).read_bytes())
    return h.hexdigest()


def _cap(dirs: list[Path], max_rows: int | None) -> list[Path]:
    if not max_rows:
        return dirs
    out, total = [], 0
    for d in dirs:
        n = len(fix.reviewed_ids(d))
        if total + n > max_rows:
            break
        out.append(d)
        total += n
    return out


def visible_sql(ids: list[str]) -> str:
    arr = ",".join(f"'{uuid_literal(i)}'" for i in ids) or "NULL"
    live = f"q.is_live AND q.publish_status IN {VISIBLE} AND q.archived_at IS NULL"
    return ("-- kimport autopilot visible count. Read-only, changes nothing.\n"
            "SELECT jsonb_build_object(\n"
            f"  'run_visible', (SELECT count(*) FROM public.quiz_questions q WHERE q.id = ANY (ARRAY[{arr}]::uuid[])"
            f" AND {live}),\n"
            f"  'bank_visible', (SELECT count(*) FROM public.quiz_questions q WHERE {live})) AS visible;\n")


class Autopilot:
    def __init__(self, pipe: Path, deps: Deps, dry: bool = False, max_rows: int | None = None, retry=()):
        self.pipe, self.d, self.dry, self.max_rows, self.retry = Path(pipe), deps, dry, max_rows, tuple(retry)
        self.intents = self.pipe / "intents.jsonl"
        self.lane = self.pipe / "lane.json"
        self.lock = self.pipe / "writer.lock"
        self.open_intent = None   # (id, kind) while an intent of ours is open
        self.wrote = False        # any database write committed in this run
        self.live_res = None      # kimport.autopilot_live.live_phase result
        self.all_refused = []     # every refused row of the run (precheck shape)

    # ------------------------------------------------------------ helpers

    def say(self, msg: str) -> None:
        self.d.log(msg)
        if getattr(self, "run_dir", None):
            self.run_dir.mkdir(parents=True, exist_ok=True)
            with open(self.run_dir / "run.log", "a", encoding="utf-8") as f:
                f.write(f"{_iso(self.d.clock())} {msg}\n")

    def now(self) -> str:
        return _iso(self.d.clock())

    def read(self, path: Path):
        """A read-only query, retried on transient errors."""
        for attempt in range(1, TRIES + 1):
            try:
                return self.d.db(path)
            except DbError as e:
                if not e.transient or attempt == TRIES:
                    raise Stop(f"{Path(path).name} failed: {e}") from None
                self.say(f"  {Path(path).name}: passing connection error, trying again ({attempt}/{TRIES - 1})")
                self.d.sleep(min(30, 2 ** attempt))

    def write(self, path: Path, dryrun: Path, landed=None) -> None:
        """A database write. After a transient error the dry-run twin tells whether it landed:
        the twin passes -> it did not, run it again; the twin fails -> `landed()` decides."""
        for attempt in range(1, TRIES + 1):
            try:
                self.d.db(path)
                self.wrote = True
                return
            except DbError as e:
                if not e.transient or attempt == TRIES:
                    raise Stop(f"{Path(path).name} failed: {e}") from None
                self.say(f"  {Path(path).name}: passing connection error; checking whether it went through")
                self.d.sleep(min(30, 2 ** attempt))
                try:
                    self.read(dryrun)
                    continue  # the twin still applies cleanly: the write did not land
                except Stop:
                    if landed is not None and landed():
                        self.wrote = True
                        self.say(f"  {Path(path).name}: it had gone through")
                        return
                    raise Stop(f"{Path(path).name}: a connection error, and its dry run no longer passes") from None

    def export(self, name: str):
        path = self.run_dir / name
        try:
            self.d.exporter(path)
            return read_export_doc(path), path
        except (ExportFailed, OSError, ValueError) as e:
            raise Stop(f"the export failed: {e}") from None

    def close(self, outcome: str, sha: str) -> None:
        iid, _ = self.open_intent
        writer.close_intent(self.intents, iid, outcome, sha, self.now())
        self.open_intent = None

    # ------------------------------------------------------------ run

    def start(self) -> dict:
        state = aps.read_state(self.pipe)
        new = [d for d in aps.ready_folders(self.pipe) if d.name not in state["batches"]
               or (state["batches"][d.name].get("status") in RETRYABLE
                   and any(fnmatch.fnmatchcase(d.name, pat) for pat in self.retry))]
        if not new:
            msg = "Nothing new: every reviewed batch has already been handled."
            if not self.dry:
                aps.write_status(self.pipe, state, {"id": None, "at": self.now(), "result": "no_new_batches"}, msg)
            self.d.log(msg)
            return {"result": "no_new_batches", "message": msg, "batches": [], "run": None}
        dirs = _cap(new, self.max_rows)
        if not dirs:
            msg = f"{len(new)} batches wait, but the first one is larger than --max-rows {self.max_rows}."
            self.d.log(msg)
            return {"result": "nothing_fits", "message": msg, "batches": [], "run": None}
        stamp = self.d.clock().strftime("%Y%m%d-%H%M%S")
        self.run_id = f"auto-{stamp}" + ("-dry" if self.dry else "")
        self.run_dir = self.pipe / self.run_id
        self.run = {"id": self.run_id, "at": self.now(), "result": None, "published": 0, "held": 0, "fixed": 0,
                    "evidence_corrected": 0, "qa_corrected": 0, "refused": {}, "visible_after": None, "batches": [d.name for d in dirs], "dry": self.dry}
        self.state, self.dirs = state, dirs
        if not self.dry:
            try:
                writer.acquire_lock(self.lock, f"autopilot {self.run_id}", self.now())
            except writer.LockHeld as e:
                msg = f"Did not start: another session holds the writer lock ({e})."
                aps.write_status(self.pipe, state, {**self.run, "result": "lock_held"}, msg, str(e))
                self.d.log(msg)
                return {"result": "lock_held", "message": msg, "batches": [], "run": None}
        try:
            self.say(f"{self.run_id}: {len(dirs)} new batches ({', '.join(d.name for d in dirs)})")
            message = self.go()
            error = None
        except Exception as e:  # noqa: BLE001 - every failure must still release the lock and write the status
            error = str(getattr(e, "reason", "") or e) if isinstance(e, (Stop, RefuseToBuild)) else f"{type(e).__name__}: {e}"
            message = self.stopped(error)
        finally:
            if not self.dry:
                try:
                    writer.release_lock(self.lock, f"autopilot {self.run_id}")
                except (writer.NoLock, writer.WrongHolder, writer.CorruptLock) as e:
                    self.say(f"  could not release the writer lock: {e}")
        if not self.dry:
            self.state["runs"][self.run_id] = {k: v for k, v in self.run.items() if k not in ("id", "dry")}
            aps.write_state(self.pipe, self.state)
            aps.write_status(self.pipe, self.state, self.run, message, error)
        self.say(message)
        (self.run_dir / "result.json").write_text(json.dumps({**self.run, "message": message, "error": error},
                                                             indent=2) + "\n", encoding="utf-8")
        return {"result": self.run["result"], "message": message, "batches": self.run["batches"],
                "run": self.run_id, "error": error}

    def stopped(self, error: str) -> str:
        self.run["result"] = "stopped"
        extra = ""
        if self.open_intent and not self.dry:
            iid, kind = self.open_intent
            extra = (f" The {kind} intent {iid} is still open, so the next run will not start until a person "
                     "has checked the bank and closed it.")
        if self.wrote and not self.dry:
            for name in self.run["batches"]:
                self.state["batches"].setdefault(name, {"run": self.run_id, "status": "stopped", "at": self.run["at"]})
            extra += " Rows already written stay hidden private drafts; these batches will not be retried by themselves."
        else:
            extra += " Nothing was written to the bank; the batches will be tried again next run."
        return f"Stopped: {error}.{extra}"

    def go(self) -> str:
        if not self.dry:
            writer.require_no_open_intents(self.intents)
        self.say("Taking the export (read-only).")
        doc, export_path = self.export("live-before.json")
        held_ids = set(self.state["held"])
        fix_dirs, normal_dirs, mixed = fix.classify(self.dirs, held_ids)
        cache: dict = {}

        def rows_runner(reviewed, pdf, frozen, sha):
            key = str(reviewed)
            if key not in cache:
                cache[key] = self.d.rows_runner(reviewed, pdf, frozen, sha)
            return cache[key]

        qa_dirs, normal_dirs, qa_mixed = qa_correct.split(normal_dirs, doc.rows, self.d.exams_dir, rows_runner)
        mixed = {**mixed, **qa_mixed}
        live_dirs, normal_dirs = live_fix.split(normal_dirs, doc.rows, self.d.exams_dir, rows_runner)
        if live_dirs:
            apl.live_phase(self, live_dirs, doc, rows_runner)
        n_live = (self.live_res or {}).get("corrected" if not self.dry else "would_correct", 0)

        stage_dir, fix_dir = self.run_dir / "stage", self.run_dir / "fix"
        sres, spre = None, {"refused": [], "refused_batches": [], "batches": {}, "staged_ids": [], "chunks": [],
                            "readback_files": []}
        if normal_dirs:
            try:
                sres = bulk.build_bulk_stage(normal_dirs, export_path, self.run_id, self.d.exams_dir, True,
                                             None if self.dry else self.intents, self.d.chunk_size,
                                             rows_runner=rows_runner)
                spre = sres["precheck"]
                st._write_all(stage_dir, sres["files"])
            except RefuseToBuild as e:
                if not hasattr(e, "precheck"):
                    raise
                spre = {**spre, **e.precheck}
                st._write_all(stage_dir, {"precheck.json": st._dump(e.precheck)})
        staged = sres["staged"] if sres else []
        fres = None
        if fix_dirs:
            loaded, _ = bulk.load_batches(fix_dirs, self.d.exams_dir, None, rows_runner)
            sources = [it["source"] for b in loaded for it in b["items"]]
            snaps = []
            if sources:
                fix_dir.mkdir(parents=True, exist_ok=True)
                (fix_dir / "drafts-readback.sql").write_text(st.readback_sql(f"{self.run_id} drafts", sources))
                raw = self.read(fix_dir / "drafts-readback.sql")
                (fix_dir / "drafts-readback.json").write_text(json.dumps(raw))
                snaps = [r["snapshot"] for r in _unwrap(raw)["rows"]]
            exclude = bulk._source_exclude([it["source"] for it in staged]) if staged else "true"
            fres = fix.build_fix(fix_dirs, doc, self.run_id, snaps, self.d.exams_dir, exclude, self.d.chunk_size,
                                 rows_runner=rows_runner, predict_sealer=self.d.row_sealer)
            st._write_all(fix_dir, fres["files"])
        fixed = fres["items"] if fres else []
        qres = self.qa_build(qa_dirs, doc, staged, rows_runner) if qa_dirs else None
        corrected = qres["items"] if qres else []
        self.batch_info(spre, fres, mixed, qres)
        live_note = f" {n_live} live rows {'would get' if self.dry else 'got'} corrected evidence." if live_dirs else ""
        if not staged and not fixed and not corrected:
            self.finish_batches({}, set(), set())
            if self.dry:
                self.run["result"] = "dry_run_ok" if n_live else "nothing_to_stage"
                return f"Dry run passed: nothing to stage.{live_note} Nothing was written."
            self.run["result"] = "evidence_corrected" if n_live else "nothing_to_stage"
            apl.after_run(self, False, [], doc.rows)
            return (f"No row of the {len(self.dirs)} new batches could be staged; the reasons are in "
                    f"{self.run_id}/stage/precheck.json, fix/fix-precheck.json, qa/qa-precheck.json and "
                    "live/live-precheck.json."
                    + live_note)

        chunks = [stage_dir / c["file"] for c in spre.get("chunks", [])]
        chunks += [fix_dir / c["file"] for c in (fres["precheck"]["chunks"] if fres else [])]
        chunks += [self.run_dir / "qa" / c["file"] for c in (qres["precheck"]["chunks"] if qres else [])]
        self.say(f"Built {len(staged)} new rows, {len(fixed)} corrected rows and {len(corrected)} QA corrections "
                 f"in {len(chunks)} file(s). Running every dry run (each rolls back).")
        for c in chunks:
            self.read(c.with_name(c.name.replace(".sql", ".dryrun.sql")))
        if self.dry:
            self.run["result"] = "dry_run_ok"
            return (f"Dry run passed: {len(staged)} new rows, {len(fixed)} corrected rows and {len(corrected)} "
                    "QA corrections would be staged, "
                    f"{self.refused_total()} refused.{live_note} Nothing was written.")

        preview_rows = json.loads((stage_dir / "stage-preview.json").read_text())["rows"] if staged else []
        preview_rows += fres["preview_rows"] if fres else []
        preview_rows += qres["preview_rows"] if qres else []
        preview = self.run_dir / "seal" / "run-preview.json"
        preview.parent.mkdir(parents=True, exist_ok=True)
        preview.write_text(st._dump({"batch": self.run_id, "source_pdf_sha256": None, "rows": preview_rows}))
        all_ids = [p["stable_question_id"] for p in preview_rows]
        iid = writer.write_intent(self.intents, self.run_id, "stage", all_ids, _sha_files(chunks), self.now())
        self.open_intent = (iid, "stage")
        self.say(f"Writing {len(chunks)} stage file(s): hidden private drafts.")
        for n, c in enumerate(chunks):
            try:
                self.write(c, c.with_name(c.name.replace(".sql", ".dryrun.sql")), landed=lambda: True)
            except Exception:
                if n == 0 and not self.wrote:
                    self.close("not_applied", hashlib.sha256(b"not applied").hexdigest())
                raise

        rb = [stage_dir / f for f in spre.get("readback_files", [])] if staged else []
        rb += [fix_dir / f for f in (fres["precheck"]["readback_files"] if fres else [])]
        rb += [self.run_dir / "qa" / f for f in (qres["precheck"]["readback_files"] if qres else [])]
        raws = []
        for f in rb:
            out = f.with_name(f.name.replace(".sql", "") + "-raw.json")
            out.write_text(json.dumps(self.read(f)))
            raws.append(out)
        sealed = self.run_dir / "seal" / "sealed-preview.json"
        try:
            res = st.run_seal(raws, None, sealed, preview=preview, hold_failing=True, row_sealer=self.d.row_sealer,
                              lane_path=self.lane, now=self.now())
        except RefuseToBuild as e:
            raise Stop(f"the readback does not match what was written: {e.reason}") from None
        self.close("verified", _sha_files(raws))
        held = json.loads((sealed.parent / "held.json").read_text())["held"]
        self.run["held"] = len(held)
        for h in held:
            self.state["held"][h["stable_question_id"]] = {"run": self.run_id, "batch": h.get("batch"),
                                                           "reason": h["reason"]}
        self.say(f"Readback matches. {res['rows']} rows sealed, {len(held)} held for review.")
        if res["rows"] == 0:
            self.run["result"] = "held_all"
            self.finish_batches({}, {h["stable_question_id"] for h in held}, set())
            apl.after_run(self, False, [], doc.rows)
            return f"Every staged row ({len(held)}) was held at seal; nothing was published.{live_note}"

        doc2, export2 = self.export("live-after-stage.json")
        if doc2.row_count != doc.row_count + len(staged):
            raise Stop(f"the bank has {doc2.row_count} rows after staging; expected {doc.row_count + len(staged)}")
        pub = self.run_dir / "publish"
        bulk.run_bulk_publish(self.run_id, sealed.parent / "private-readback.json", sealed, export2, self.intents,
                              pub, self.d.chunk_size)
        ppre = json.loads((pub / "precheck.json").read_text())
        qids = ppre["question_ids"]
        files = [pub / c["file"] for c in ppre["chunks"]]
        iid = writer.write_intent(self.intents, self.run_id, "publish", qids, ppre["publish_sql_sha256"], self.now())
        self.open_intent = (iid, "publish")
        self.say(f"Publishing {len(qids)} rows in {len(files)} file(s); dry runs first.")
        try:
            for f in files:
                self.read(f.with_name(f.name.replace(".sql", ".dryrun.sql")))
        except Stop:
            self.close("not_applied", hashlib.sha256(b"not applied").hexdigest())
            raise
        ranges, at = [], 0
        for c in ppre["chunks"]:
            ranges.append(qids[at:at + c["rows"]])
            at += c["rows"]
        done = []
        for f, ids in zip(files, ranges):
            try:
                self.write(f, f.with_name(f.name.replace(".sql", ".dryrun.sql")), landed=lambda ids=ids: self.live(ids))
                done.append(f)
            except Stop as e:
                self.roll_back(done, str(e))
                raise
        vis = self.run_dir / "visible.sql"
        vis.write_text(visible_sql(qids))
        counts = self.visible(vis)
        if counts["run_visible"] != len(qids):
            raise Stop(f"{counts['run_visible']} of {len(qids)} published rows are visible")
        self.close("verified", _sha_files([self.run_dir / "visible-after.json"]))
        self.run.update({"published": len(qids), "visible_after": counts["bank_visible"], "result": "published"})
        sealed_ids = [r["stable_question_id"] for r in json.loads(sealed.read_text())["rows"]]
        fixed_ids = {p["stable_question_id"] for p in preview_rows if p.get("kimport_fix")} & set(sealed_ids)
        self.run["fixed"] = len(fixed_ids)
        for i in fixed_ids:
            self.state["held"].pop(i, None)
        lane.resolve_ids(self.lane, sorted(fixed_ids), "autopilot_fix", self.now(), f"published in {self.run_id}")
        if qres:
            qa_ids = {p["stable_question_id"] for p in preview_rows if p.get("kimport_qa")} & set(sealed_ids)
            self.run["qa_corrected"] = qa_correct.record_corrections(
                self.pipe / "qa", qres["precheck"]["corrections"], qa_ids, self.run_id, self.now())
        released = lane.release_ids(lane.claims_path_for(self.lane), sealed_ids)
        self.finish_batches({i: True for i in sealed_ids}, {h["stable_question_id"] for h in held}, fixed_ids)
        self.say(f"Visible now: {counts['bank_visible']}. {len(released)} finished claims released.")
        apl.after_run(self, True, sealed_ids, doc2.rows)
        return (f"Published {len(qids)} questions ({len(fixed_ids)} of them corrected rows held earlier, "
                f"{self.run['qa_corrected']} QA corrections back on the site); "
                f"{counts['bank_visible']} visible to students now. {len(held)} held for review, "
                f"{self.refused_total()} refused (reasons in the run folder).{live_note}")

    # ------------------------------------------------------------ steps

    def qa_build(self, qa_dirs: list[Path], doc, staged: list[dict], rows_runner) -> dict:
        """Read the hidden rows back (read-only) and build the in-place QA corrections (kimport.qa_correct)."""
        qa_dir = self.run_dir / "qa"
        loaded, _ = bulk.load_batches(qa_dirs, self.d.exams_dir, None, rows_runner)
        sources = [it["source"] for b in loaded for it in b["items"]]
        snaps = []
        if sources:
            qa_dir.mkdir(parents=True, exist_ok=True)
            (qa_dir / "hidden-readback.sql").write_text(st.readback_sql(f"{self.run_id} QA-hidden rows", sources))
            raw = self.read(qa_dir / "hidden-readback.sql")
            (qa_dir / "hidden-readback.json").write_text(json.dumps(raw))
            snaps = [r["snapshot"] for r in _unwrap(raw)["rows"]]
        qres = qa_correct.build_correct(qa_dirs, doc, self.run_id, snaps, self.d.exams_dir, staged,
                                        self.d.chunk_size, rows_runner=rows_runner)
        st._write_all(qa_dir, qres["files"])
        return qres

    def live(self, ids: list[str]) -> bool:
        f = self.run_dir / "publish" / "landed-check.sql"
        f.write_text(visible_sql(ids))
        try:
            got = _unwrap(self.read(f))
            got = json.loads(got) if isinstance(got, str) else got
            return int(got["run_visible"]) == len(ids)
        except (Stop, KeyError, TypeError, ValueError):
            return False

    def visible(self, path: Path) -> dict:
        raw = self.read(path)
        (self.run_dir / "visible-after.json").write_text(json.dumps(raw, indent=2) + "\n")
        got = _unwrap(raw)
        got = json.loads(got) if isinstance(got, str) else got
        try:
            return {"run_visible": int(got["run_visible"]), "bank_visible": int(got["bank_visible"])}
        except (KeyError, TypeError, ValueError):
            raise Stop(f"unexpected visible-count result: {str(raw)[:200]}") from None

    def roll_back(self, done: list[Path], why: str) -> None:
        if not done:
            self.close("not_applied", hashlib.sha256(why.encode()).hexdigest())
            return
        self.say(f"Publish stopped after {len(done)} file(s); rolling those back (dry run first).")
        try:
            for f in reversed(done):
                r = f.with_name(f.name.replace("publish", "rollback", 1))
                self.read(r.with_name(r.name.replace(".sql", ".dryrun.sql")))
                self.write(r, r.with_name(r.name.replace(".sql", ".dryrun.sql")))
        except Stop as e:
            self.say(f"  rollback stopped: {e}; the publish intent stays open for a person")
            return
        self.close("rolled_back", hashlib.sha256(why.encode()).hexdigest())

    def refused_total(self) -> int:
        return sum(self.run["refused"].values())

    def batch_info(self, spre: dict, fres: dict | None, mixed: dict, qres: dict | None = None) -> None:
        """Per-batch counts and refusal reasons, kept for the ledger."""
        live = self.live_res or {}
        refused = (list(spre.get("refused", [])) + (fres["precheck"]["refused"] if fres else [])
                   + (qres["precheck"]["refused"] if qres else []) + live.get("refused", []))
        self.all_refused = refused
        rbatches = list(spre.get("refused_batches", [])) + (fres["precheck"]["refused_batches"] if fres else [])
        rbatches += qres["precheck"]["refused_batches"] if qres else []
        rbatches += [{"folder": k, "reason": v} for k, v in mixed.items()]
        self.run["refused"] = aps.refused_by_reason(refused, rbatches)
        info = {}
        for name, b in spre.get("batches", {}).items():
            info[b["folder"]] = {"batch": name, "rows": b["rows"], "staged": b["staged"]}
        for name, b in (fres["precheck"]["batches"] if fres else {}).items():
            info[b["folder"]] = {"batch": name, "rows": b["rows"], "staged": b["fixed"], "fix": True}
        for name, b in (qres["precheck"]["batches"] if qres else {}).items():
            info[b["folder"]] = {"batch": name, "rows": b["rows"], "staged": b["corrected"], "qa": True}
        by_batch: dict = {}
        for r in refused:
            by_batch[r.get("batch")] = by_batch.get(r.get("batch"), 0) + 1
        for i in info.values():
            i["refused"] = by_batch.get(i["batch"], 0)
        self.info, self.rbatches = info, rbatches
        self.batch_of = {}
        for f in ("stage/stage-preview.json",):
            p = self.run_dir / f
            if p.exists():
                self.batch_of.update({r["stable_question_id"]: r.get("kimport_batch")
                                      for r in json.loads(p.read_text())["rows"]})
        for p in (fres["preview_rows"] if fres else []) + (qres["preview_rows"] if qres else []):
            self.batch_of[p["stable_question_id"]] = p.get("kimport_batch")

    def finish_batches(self, published: dict, held: set, fixed: set) -> None:
        at = self.run["at"]
        for folder, i in self.info.items():
            ids = [s for s, b in self.batch_of.items() if b == i["batch"]]
            n_pub = sum(1 for s in ids if s in published)
            n_held = sum(1 for s in ids if s in held)
            status = "published" if n_pub else ("held" if n_held else "refused")
            self.state["batches"][folder] = {"run": self.run_id, "status": status, "rows": i["rows"],
                                             "staged": i["staged"], "published": n_pub, "held": n_held,
                                             "refused": i["refused"], "at": at, **({"fix": True} if i.get("fix") else {}),
                                             **({"qa": True} if i.get("qa") else {})}
        for rb in self.rbatches:
            self.state["batches"][rb["folder"]] = {"run": self.run_id, "status": "refused", "rows": None,
                                                   "staged": 0, "published": 0, "held": 0, "refused": None,
                                                   "at": at, "reason": rb["reason"]}


def run_autopilot(pipe: Path, dry: bool = False, max_rows: int | None = None, deps: Deps | None = None,
                  retry=()) -> dict:
    return Autopilot(Path(pipe), deps or Deps(), dry, max_rows, retry).start()
