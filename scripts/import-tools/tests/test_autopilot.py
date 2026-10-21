"""k autopilot end to end against a fake bank (synthetic rows, no database).

FakeBank stands in for `supabase db query`: it reads the generated SQL files'
row comments and source tuples, applies stage / evidence / publish / rollback
files to an in-memory bank, answers readbacks and visible counts, and records
every file it ran. ts/stage-rows.ts and ts/seal-readback.ts are replaced by
fixtures (rows docs and a per-row fake sealer).
"""

import copy
import hashlib
import json
import re
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from kimport import autopilot as ap
from kimport import autopilot_state as aps
from kimport import lane, writer
from kimport import stage as st
from tests import publish_fixtures as pfx
from tests import stage_fixtures as fx
from tests.export_fixtures import write_export
from tests.test_bulk import row

PDF = b"%PDF synthetic exam"
HELD_ERROR = "Reviewed skill evidence differs from the approved question version"
_ROW = re.compile(r"^-- row \d+: (\S+) ", re.M)
_TUPLE = re.compile(r"\('([0-9a-f]{64})','([^']*)','([^']*)',(\d+)\)")
_UUIDS = re.compile(r"'([0-9a-f]{8}-[0-9a-f-]{27})'")


def missing_skill_record(r: dict) -> dict:
    r = copy.deepcopy(r)
    r["key"]["raw_model_response"]["skill_record_missing"] = True
    return r


def per_row_sealer(path: Path):
    rows = json.loads(Path(path).read_text())["rows"]
    ok, failed = [], []
    for r in rows:
        ev = r["snapshot"]["keys"][0]["raw_model_response"]
        if ev.get("skill_record_missing"):
            failed.append({"question_id": r["snapshot"]["question"]["id"],
                           "stable_question_id": ev["approved_tags"]["stable_question_id"], "error": HELD_ERROR})
        else:
            ok.append(r)
    tmp = Path(path).with_name("ok-" + Path(path).name)
    tmp.write_text(json.dumps({"rows": ok}))
    return (fx.fake_sealer(tmp) if ok else []), failed


class FakeBank:
    def __init__(self, run_dir_of):
        self.rows = {}     # question id -> snapshot
        self.ran = []
        self.fail = {}     # file name -> list of errors to raise, in order
        self.n = 0
        self.run_dir_of = run_dir_of

    def by_stable(self, sid):
        return next(q for q, s in self.rows.items() if s["keys"][0]["raw_model_response"].get("stable_question_id") == sid)

    def __call__(self, path: Path):
        path = Path(path)
        self.ran.append(path.name)
        errs = self.fail.get(path.name)
        if errs:
            raise errs.pop(0)
        sql = path.read_text()
        name = path.name
        kind = re.match(r"(stage|evidence|publish|rollback)(-\d+)?\.sql$", name)
        kind = kind.group(1) if kind else None
        if name.endswith(".dryrun.sql"):
            return []
        live = re.match(r"live-(evidence|rollback)-\d+\.sql$", name)
        if live:
            expected = json.loads((path.parent / "live-expected.json").read_text())
            for sid in _ROW.findall(sql):
                want = expected[sid]
                self.rows[want["question"]["id"]]["keys"][0]["raw_model_response"] = copy.deepcopy(
                    want["key"]["raw_model_response"] if live.group(1) == "evidence" else want["old_evidence"])
            return []
        if "readback" in name:
            want = {(v, s, m, int(n)) for v, s, m, n in _TUPLE.findall(sql)}
            snaps = [s for s in self.rows.values() if st._source(s["question"]) in want]
            return [{"readback": {"rows": [{"snapshot": copy.deepcopy(s)} for s in snaps]}}]
        if kind == "stage":
            prev = {p["stable_question_id"]: p for p in
                    json.loads((path.parent / "stage-preview.json").read_text())["rows"]}
            for sid in _ROW.findall(sql):
                self.n += 1
                snap = fx.db_snapshot(prev[sid], 500 + self.n)
                self.rows[snap["question"]["id"]] = snap
            return []
        if kind == "evidence":
            prev = {p["stable_question_id"]: p for p in
                    json.loads((path.parents[1] / "seal" / "run-preview.json").read_text())["rows"]}
            for sid in _ROW.findall(sql):
                self.rows[self.by_stable(sid)]["keys"][0]["raw_model_response"] = \
                    copy.deepcopy(prev[sid]["stage_payload"]["key"]["raw_model_response"])
            return []
        if kind in ("publish", "rollback"):
            seals = {r["stable_question_id"]: r["question_payload_sha256"] for r in
                     json.loads((path.parents[1] / "seal" / "sealed-preview.json").read_text())["rows"]}
            for qid in _ROW.findall(sql):
                s = self.rows[qid]
                q, ev = s["question"], s["keys"][0]["raw_model_response"]
                if kind == "publish":
                    q.update(publish_status="publish_ready", import_status="ok", import_flag_reason=None, is_live=True)
                    ev["student_publication_allowed"] = True
                    ev["approved_tags"]["question_payload_sha256"] = seals[ev["stable_question_id"]]
                else:
                    q.update(publish_status="needs_human_review", import_status="needs_review", is_live=False,
                             import_flag_reason="Synthetic private draft")
                    ev["student_publication_allowed"] = False
                    ev["approved_tags"].pop("question_payload_sha256", None)
            return []
        if "visible" in sql:
            ids = set(_UUIDS.findall(sql))
            live = [q for q, s in self.rows.items() if s["question"]["is_live"]]
            return [{"visible": {"run_visible": sum(1 for q in live if q in ids), "bank_visible": len(live)}}]
        raise AssertionError(f"unexpected file {name}")

    def export(self, out: Path):
        write_export(out, [pfx.export_row(s) for s in self.rows.values()])


class AutopilotCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)
        self.pipe = self.d / "pipeline"
        (self.pipe / "batches").mkdir(parents=True)
        exams = self.d / "exams" / "2099-01_SYN_V1"
        exams.mkdir(parents=True)
        (exams / "original_exam.pdf").write_bytes(PDF)
        self.docs = {}
        self.bank = FakeBank(None)
        self.t = datetime(2026, 10, 21, 8, 0, 0, tzinfo=timezone.utc)
        self.logs = []
        self.corpus_calls = []
        self.corpus_roles = {}
        self.sealer = per_row_sealer

    def tearDown(self):
        self.tmp.cleanup()

    def clock(self):
        self.t += timedelta(seconds=1)
        return self.t

    def batch(self, name: str, rows: list[dict]) -> Path:
        d = fx.write_batch_dir(self.pipe / "batches" / name, name=name)
        ready = st.read_ready(d)
        Path(ready["frozen_manifest"]).write_text(json.dumps({"source_pdf_sha256": hashlib.sha256(PDF).hexdigest()}))
        Path(ready["reviewed_file"]).write_text(json.dumps({"questions": [
            {"stable_question_id": r["stable_question_id"], "source_document_id": "2099-01_SYN_V1"} for r in rows]}))
        self.docs[ready["reviewed_file"]] = fx.rows_doc(rows)
        return d

    def deps(self, chunk_size=200):
        return ap.Deps(db=self.bank, exporter=self.bank.export,
                       rows_runner=lambda reviewed, pdf, frozen, sha: copy.deepcopy(self.docs[str(reviewed)]),
                       row_sealer=self.sealer, clock=self.clock, sleep=lambda s: None, log=self.logs.append,
                       exams_dir=self.d / "exams", chunk_size=chunk_size, corpus_runner=self.fake_corpus)

    def fake_corpus(self, export, out_dir, lane_path):
        """Stands in for `k corpus`: records the call and writes a clusters.json with self.corpus_roles."""
        self.corpus_calls.append((Path(export).name, Path(out_dir), Path(lane_path)))
        Path(out_dir).mkdir(parents=True, exist_ok=True)
        (Path(out_dir) / "clusters.json").write_text(json.dumps({"roles": self.corpus_roles}))
        return {"unique": 7, "unique_not_live": 3, "live_unique": 4}

    def run_ap(self, dry=False, chunk_size=200, max_rows=None, retry=()):
        return ap.run_autopilot(self.pipe, dry, max_rows, self.deps(chunk_size), retry)

    def status(self):
        return json.loads((self.pipe / aps.STATUS).read_text())

    def state(self):
        return aps.read_state(self.pipe)

    def live(self):
        return sum(1 for s in self.bank.rows.values() if s["question"]["is_live"])


class TestAutopilot(AutopilotCase):
    def test_no_new_batches_is_a_quick_no_op(self):
        res = self.run_ap()
        self.assertEqual(res["result"], "no_new_batches")
        self.assertEqual(self.bank.ran, [])
        self.assertEqual(self.status()["last_result"], "no_new_batches")
        self.assertFalse((self.pipe / "writer.lock").exists())

    def test_publishes_holds_and_then_publishes_the_corrected_rows(self):
        self.batch("syn-1", [row(1), row(2), missing_skill_record(row(3))])
        self.batch("syn-2", [row(4, "M1")])
        res = self.run_ap(chunk_size=2)
        self.assertEqual(res["result"], "published", res)
        self.assertEqual(self.live(), 3)
        self.assertFalse((self.pipe / "writer.lock").exists())
        run = self.pipe / res["run"]
        held = json.loads((run / "seal" / "held.json").read_text())["held"]
        self.assertEqual([h["reason"] for h in held], [HELD_ERROR])
        held_id = held[0]["stable_question_id"]
        # dry runs before writes, in order
        ran = self.bank.ran
        self.assertLess(ran.index("stage-01.dryrun.sql"), ran.index("stage-01.sql"))
        self.assertLess(ran.index("stage-02.dryrun.sql"), ran.index("stage-01.sql"))
        self.assertLess(ran.index("publish-02.dryrun.sql"), ran.index("publish-01.sql"))
        self.assertEqual(writer.open_intents(self.pipe / "intents.jsonl"), [])
        outcomes = [json.loads(x)["outcome"] for x in (self.pipe / "intents.jsonl").read_text().splitlines()
                    if '"close"' in x]
        self.assertEqual(outcomes, ["verified", "verified"])
        lane_items = json.loads((self.pipe / "lane.json").read_text())["items"]
        self.assertEqual(lane_items[held_id]["reason"], "classification_review")
        state = self.state()
        self.assertEqual(state["batches"]["syn-1"]["status"], "published")
        self.assertEqual(state["batches"]["syn-1"]["held"], 1)
        self.assertIn(held_id, state["held"])
        s = self.status()
        self.assertEqual(s["published_total_by_run"], {res["run"]: 3})
        self.assertEqual(s["visible_after"], 3)
        self.assertEqual(s["staged_held"], 1)
        self.assertEqual(s["batches_waiting"], [])

        # nothing new: no-op
        self.bank.ran.clear()
        self.assertEqual(self.run_ap()["result"], "no_new_batches")
        self.assertEqual(self.bank.ran, [])

        # the reviewer's corrected batch for the held row: an evidence update, then publish
        fixed = row(3)
        fixed["key"]["raw_model_response"]["independent_D_record"] = {"uncertain": False}
        self.batch("syn-fix-1", [fixed])
        before = len(self.bank.rows)
        res2 = self.run_ap()
        self.assertEqual(res2["result"], "published", res2)
        self.assertEqual(len(self.bank.rows), before)  # updated in place, nothing inserted
        self.assertEqual(self.live(), 4)
        self.assertIn("evidence.sql", self.bank.ran)
        self.assertNotIn("stage.sql", self.bank.ran[self.bank.ran.index("evidence.sql"):])
        self.assertLess(self.bank.ran.index("evidence.dryrun.sql"), self.bank.ran.index("evidence.sql"))
        state = self.state()
        self.assertEqual(state["held"], {})
        self.assertEqual(state["runs"][res2["run"]]["fixed"], 1)
        self.assertEqual(state["batches"]["syn-fix-1"]["status"], "published")
        self.assertEqual(json.loads((self.pipe / "lane.json").read_text())["items"][held_id]["status"], "resolved")
        self.assertEqual(self.status()["published_total_by_run"], {res["run"]: 3, res2["run"]: 1})

    def test_corrected_batch_with_changed_text_is_refused(self):
        self.batch("syn-1", [row(1), missing_skill_record(row(3))])
        self.run_ap()
        bad = row(3, question_text="A different made-up question about the cedar trail?")
        self.batch("syn-fix-1", [bad])
        res = self.run_ap()
        self.assertEqual(res["result"], "nothing_to_stage", res)
        pre = json.loads((self.pipe / res["run"] / "fix" / "fix-precheck.json").read_text())
        self.assertIn("question_text differs from the private draft", pre["refused"][0]["reasons"][0])
        self.assertNotIn("evidence.sql", self.bank.ran)
        self.assertEqual(self.state()["batches"]["syn-fix-1"]["status"], "refused")

    def test_dry_run_writes_nothing(self):
        self.batch("syn-1", [row(1), row(2)])
        res = self.run_ap(dry=True)
        self.assertEqual(res["result"], "dry_run_ok", res)
        self.assertTrue(all(f.endswith(".dryrun.sql") for f in self.bank.ran))
        self.assertEqual(self.bank.rows, {})
        for f in (aps.STATE, aps.STATUS, "intents.jsonl", "lane.json", "writer.lock"):
            self.assertFalse((self.pipe / f).exists(), f)

    def test_failed_publish_chunk_is_rolled_back(self):
        self.batch("syn-1", [row(1), row(2)])
        self.bank.fail["publish-02.sql"] = [ap.DbError("ERROR: duplicate comparison key: x")]
        res = self.run_ap(chunk_size=1)
        self.assertEqual(res["result"], "stopped")
        self.assertIn("publish-02.sql failed", res["error"])
        self.assertEqual(self.live(), 0)
        ran = self.bank.ran
        self.assertLess(ran.index("rollback-01.dryrun.sql"), ran.index("rollback-01.sql"))
        self.assertEqual(writer.open_intents(self.pipe / "intents.jsonl"), [])
        last = json.loads((self.pipe / "intents.jsonl").read_text().splitlines()[-1])
        self.assertEqual(last["outcome"], "rolled_back")
        self.assertFalse((self.pipe / "writer.lock").exists())
        s = self.status()
        self.assertEqual(s["last_result"], "stopped")
        self.assertIn("duplicate comparison key", s["last_error"])
        self.assertEqual(self.state()["batches"]["syn-1"]["status"], "stopped")

    def test_failed_dry_run_writes_nothing_and_retries_next_time(self):
        self.batch("syn-1", [row(1)])
        self.bank.fail["stage.dryrun.sql"] = [ap.DbError("ERROR: bank changed since export")]
        res = self.run_ap()
        self.assertEqual(res["result"], "stopped")
        self.assertEqual(self.bank.rows, {})
        self.assertNotIn("syn-1", self.state()["batches"])
        self.assertIn("syn-1", self.status()["batches_waiting"])
        self.assertEqual(self.run_ap()["result"], "published")

    def test_transient_error_is_retried(self):
        self.batch("syn-1", [row(1), row(2)])
        self.bank.fail["stage.sql"] = [ap.DbError("connection reset by peer")]
        self.bank.fail["readback.sql"] = [ap.DbError("Gateway Timeout 504")]
        res = self.run_ap()
        self.assertEqual(res["result"], "published", res)
        self.assertEqual(self.bank.ran.count("stage.sql"), 2)
        self.assertEqual(self.live(), 2)

    def test_lock_held_by_someone_else(self):
        self.batch("syn-1", [row(1)])
        writer.acquire_lock(self.pipe / "writer.lock", "someone", "2026-10-21T07:00:00Z")
        res = self.run_ap()
        self.assertEqual(res["result"], "lock_held")
        self.assertEqual(self.bank.ran, [])
        self.assertEqual(json.loads((self.pipe / "writer.lock").read_text())["holder"], "someone")

    def test_open_intent_stops_before_anything(self):
        self.batch("syn-1", [row(1)])
        writer.write_intent(self.pipe / "intents.jsonl", "old", "publish", ["x"], "0" * 64, "2026-10-20T00:00:00Z")
        res = self.run_ap()
        self.assertEqual(res["result"], "stopped")
        self.assertEqual(self.bank.ran, [])
        self.assertFalse((self.pipe / "writer.lock").exists())

    def test_max_rows_takes_whole_batches(self):
        self.batch("syn-1", [row(1), row(2)])
        self.batch("syn-2", [row(3, "M1"), row(4, "M1")])
        res = self.run_ap(max_rows=3)
        self.assertEqual(res["batches"], ["syn-1"])
        self.assertEqual(self.status()["batches_waiting"], ["syn-2"])


class TestRecordManualRun(AutopilotCase):
    def test_bulk_run_is_entered_in_the_ledger(self):
        run = self.pipe / "bulk-9" / "stage"
        run.mkdir(parents=True)
        sids = [f"2099-01_SYN_V1_RW_M2_Q{n:02d}" for n in (1, 2, 3)]
        (run / "precheck.json").write_text(json.dumps({
            "staged_ids": sids, "refused": [{"id": "z", "batch": "syn-2", "reasons": ["typo-level match with q"]}],
            "refused_batches": [{"folder": "syn-3", "reason": "bad figure"}],
            "batches": {"syn-1": {"folder": "syn-1", "rows": 3, "staged": 3},
                        "syn-2": {"folder": "syn-2", "rows": 1, "staged": 0}}}))
        (run / "stage-preview.json").write_text(json.dumps({"rows": [
            {"stable_question_id": s, "kimport_batch": "syn-1"} for s in sids]}))
        held = self.d / "held.json"
        held.write_text(json.dumps([sids[2]]))
        (self.pipe / "claims.json").write_text(json.dumps({"r1": {"claimed": sids + ["other"]}}))
        res = aps.record_manual_run(self.pipe, "bulk-9", 2, 100, "2026-10-21T07:00:00Z", held)
        self.assertEqual(res, {"batches": 3, "held": 1, "published": 2, "released": 2})
        state = self.state()
        self.assertEqual(state["batches"]["syn-1"]["published"], 2)
        self.assertEqual(state["batches"]["syn-2"]["status"], "refused")
        self.assertEqual(state["batches"]["syn-3"]["status"], "refused")
        self.assertEqual(list(state["held"]), [sids[2]])
        self.assertEqual(state["runs"]["bulk-9"]["refused"], {"typo_match": 1, "batch_refused": 1})
        self.assertEqual(json.loads((self.pipe / "claims.json").read_text())["r1"]["claimed"], [sids[2], "other"])
        self.assertEqual(lane.blocked_ids(self.pipe / "lane.json"), {sids[2]})
        with self.assertRaisesRegex(ValueError, "is not 5 published"):
            aps.record_manual_run(self.pipe, "bulk-9", 5, 100, "2026-10-21T07:00:00Z", held)


class TestSealHoldFailing(unittest.TestCase):
    def test_without_hold_failing_a_bad_seal_still_refuses(self):
        with tempfile.TemporaryDirectory() as t:
            d = Path(t)
            prev = {"batch": "bulk-1", "rows": [st.preview_row(r, None) for r in [row(1)]]}
            prev["rows"][0]["kimport_batch"] = "syn-1"
            (d / "p.json").write_text(json.dumps(prev))
            (d / "rb.json").write_text(json.dumps({"rows": [{"snapshot": fx.db_snapshot(prev["rows"][0], 1)}]}))

            def boom(path):
                raise st.RefuseToBuild("seal-readback.ts: " + HELD_ERROR)
            with self.assertRaisesRegex(st.RefuseToBuild, "differs from the approved"):
                st.run_seal([d / "rb.json"], None, d / "s.json", preview=d / "p.json", sealer=boom)
            prev["rows"][0]["answer_evidence"]["skill_record_missing"] = True
            snap = fx.db_snapshot(prev["rows"][0], 1)
            snap["keys"][0]["raw_model_response"]["skill_record_missing"] = True
            (d / "rb.json").write_text(json.dumps({"rows": [{"snapshot": snap}]}))
            prev["rows"][0]["stage_payload"]["key"]["raw_model_response"]["skill_record_missing"] = True
            (d / "p.json").write_text(json.dumps(prev))
            res = st.run_seal([d / "rb.json"], None, d / "s.json", preview=d / "p.json", hold_failing=True,
                              row_sealer=per_row_sealer, lane_path=d / "lane.json", now="2026-10-21T07:00:00Z")
            self.assertEqual((res["rows"], res["held"]), (0, 1))
            self.assertEqual(json.loads((d / "held.json").read_text())["held"][0]["batch"], "syn-1")
            self.assertEqual(json.loads((d / "private-readback.json").read_text())["rows"], [])
            self.assertEqual(len(lane.blocked_ids(d / "lane.json")), 1)


if __name__ == "__main__":
    unittest.main()
