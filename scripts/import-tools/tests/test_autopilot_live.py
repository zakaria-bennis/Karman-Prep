"""Live evidence corrections, duplicates of live rows and the corpus refresh (synthetic rows, fake bank)."""

import copy
import json
import unittest

from kimport import autopilot as ap
from kimport import autopilot_live as apl
from kimport import lane, live_fix, writer
from tests.test_autopilot import AutopilotCase, per_row_sealer
from tests.test_bulk import row


def corrected(n: int, **over) -> dict:
    """row(n) with the skill review record replaced, as a reviewer's fix batch writes it."""
    r = row(n, **over)
    ev = r["key"]["raw_model_response"]
    ev.pop("D_original_record")
    ev["independent_D_record"] = {"skill": "Command of Evidence", "domain": "Information and Ideas", "level": 1}
    ev["independent_D_review_sha256"] = "f" * 64
    ev["schema"] = "SYNTHETIC_FIX_V1"
    ev["approved_tags"]["pilot_row_sha256"] = "c" * 64
    return r


def intents(pipe):
    return [json.loads(x) for x in (pipe / "intents.jsonl").read_text().splitlines()]


class LiveCase(AutopilotCase):
    def publish_two(self):
        self.batch("syn-1", [row(1), row(2)])
        res = self.run_ap()
        self.assertEqual(res["result"], "published", res)
        self.bank.ran.clear()
        self.corpus_calls.clear()
        return res

    def evidence(self, n):
        sid = row(n)["stable_question_id"]
        return self.bank.rows[self.bank.by_stable(sid)]["keys"][0]["raw_model_response"]


class TestLiveCorrection(LiveCase):
    def test_corrects_live_rows_and_keeps_publication_and_seal(self):
        self.publish_two()
        before = {n: copy.deepcopy(self.evidence(n)) for n in (1, 2)}
        (self.pipe / "claims.json").write_text(json.dumps({"r2": {"claimed": [row(1)["stable_question_id"], "x"]}}))
        self.batch("syn-fix-1", [corrected(1), corrected(2)])
        n_rows = len(self.bank.rows)
        res = self.run_ap()
        self.assertEqual(res["result"], "evidence_corrected", res)
        self.assertEqual(len(self.bank.rows), n_rows)
        self.assertEqual(self.live(), 2)
        ran = self.bank.ran
        self.assertLess(ran.index("live-evidence-01.dryrun.sql"), ran.index("live-evidence-01.sql"))
        self.assertNotIn("stage.sql", ran)
        for n in (1, 2):
            ev = self.evidence(n)
            self.assertNotIn("D_original_record", ev)
            self.assertEqual(ev["independent_D_review_sha256"], "f" * 64)
            self.assertIs(ev["student_publication_allowed"], True)
            self.assertEqual(ev["approved_tags"]["question_payload_sha256"],
                             before[n]["approved_tags"]["question_payload_sha256"])
        last = intents(self.pipe)
        self.assertEqual(last[-2]["action"], "evidence_live")
        self.assertEqual(last[-1]["outcome"], "verified")
        self.assertEqual(writer.open_intents(self.pipe / "intents.jsonl"), [])
        state = self.state()
        self.assertEqual(state["batches"]["syn-fix-1"]["status"], "evidence_corrected")
        self.assertEqual(state["runs"][res["run"]]["evidence_corrected"], 2)
        self.assertEqual(self.status()["evidence_corrected_total"], 2)
        self.assertEqual(json.loads((self.pipe / "claims.json").read_text())["r2"]["claimed"], ["x"])
        self.assertEqual(self.corpus_calls, [])  # nothing published: no corpus refresh
        rollback = (self.pipe / res["run"] / "live" / "live-rollback-01.sql").read_text()
        self.assertIn("evidence is not the corrected evidence", rollback)

    def test_changed_question_text_is_refused(self):
        self.publish_two()
        self.batch("syn-fix-1", [corrected(1, question_text="A different made-up question about the cedar trail?")])
        res = self.run_ap()
        self.assertEqual(res["result"], "nothing_to_stage", res)
        pre = json.loads((self.pipe / res["run"] / "live" / "live-precheck.json").read_text())
        self.assertIn("question_text differs from the live row", pre["refused"][0]["reasons"][0])
        self.assertFalse(any(f.startswith("live-evidence") for f in self.bank.ran))
        self.assertEqual(self.state()["batches"]["syn-fix-1"]["status"], "refused")
        self.assertEqual(self.state()["runs"][res["run"]]["refused"], {"live_fix_refused": 1})

    def test_evidence_change_outside_the_skill_record_is_refused(self):
        self.publish_two()
        bad = corrected(1)
        bad["key"]["raw_model_response"]["B_teacher_sha256"] = "9" * 64
        self.batch("syn-fix-1", [bad, corrected(2)])
        res = self.run_ap()
        self.assertEqual(res["result"], "evidence_corrected", res)
        pre = json.loads((self.pipe / res["run"] / "live" / "live-precheck.json").read_text())
        self.assertEqual(pre["corrected_ids"], [row(2)["stable_question_id"]])
        self.assertIn("differs outside the skill review record: B_teacher_sha256", pre["refused"][0]["reasons"][0])
        self.assertIn("D_original_record", self.evidence(1))

    def test_new_evidence_the_scope_check_rejects_is_refused(self):
        self.publish_two()

        def sealer(path):
            rows = json.loads(path.read_text())["rows"]
            for r in rows:
                ev = r["snapshot"]["keys"][0]["raw_model_response"]
                if ev.get("independent_D_record", {}).get("skill") == "Wrong skill":
                    ev["skill_record_missing"] = True
            path.write_text(json.dumps({"rows": rows}))
            return per_row_sealer(path)
        self.sealer = sealer
        bad = corrected(1)
        bad["key"]["raw_model_response"]["independent_D_record"]["skill"] = "Wrong skill"
        self.batch("syn-fix-1", [bad])
        res = self.run_ap()
        pre = json.loads((self.pipe / res["run"] / "live" / "live-precheck.json").read_text())
        self.assertTrue(any("scope check rejects" in r for r in pre["refused"][0]["reasons"]), pre)

    def test_failed_chunk_is_rolled_back(self):
        self.publish_two()
        before = {n: copy.deepcopy(self.evidence(n)) for n in (1, 2)}
        self.batch("syn-fix-1", [corrected(1), corrected(2)])
        self.bank.fail["live-evidence-02.sql"] = [ap.DbError("ERROR: live question changed: x")]
        res = self.run_ap(chunk_size=1)
        self.assertEqual(res["result"], "stopped")
        ran = self.bank.ran
        self.assertLess(ran.index("live-rollback-01.dryrun.sql"), ran.index("live-rollback-01.sql"))
        self.assertEqual({n: self.evidence(n) for n in (1, 2)}, before)
        self.assertEqual(intents(self.pipe)[-1]["outcome"], "rolled_back")
        self.assertEqual(writer.open_intents(self.pipe / "intents.jsonl"), [])

    def test_dry_run_and_retry_of_a_refused_batch(self):
        self.publish_two()
        self.batch("syn-fix-1", [corrected(1)])
        self.state_batches_refused("syn-fix-1")
        self.assertEqual(self.run_ap()["result"], "no_new_batches")
        res = self.run_ap(dry=True, retry=["syn-fix-*"])
        self.assertEqual(res["result"], "dry_run_ok", res)
        self.assertTrue(all(f.endswith(".dryrun.sql") or "readback" in f for f in self.bank.ran))
        self.assertIn("D_original_record", self.evidence(1))
        res = self.run_ap(retry=["syn-fix-*"])
        self.assertEqual(res["result"], "evidence_corrected", res)
        self.assertNotIn("D_original_record", self.evidence(1))

    def state_batches_refused(self, folder):
        from kimport import autopilot_state as aps
        s = self.state()
        s["batches"][folder] = {"run": "old", "status": "refused"}
        aps.write_state(self.pipe, s)


class TestDuplicatesOfLive(LiveCase):
    def test_refused_duplicate_goes_in_the_lane_and_corpus_is_refreshed(self):
        first = self.publish_two()
        self.assertEqual(self.state()["runs"][first["run"]]["corpus"]["unique_not_live"], 3)
        self.assertEqual(self.status()["corpus_unique_not_live"], 3)
        dup = row(5, question_text=row(1)["question"]["question_text"])
        dup_id = dup["stable_question_id"]
        self.corpus_roles = {row(6)["stable_question_id"]: "canonical", row(7)["stable_question_id"]: "member"}
        self.batch("syn-2", [dup, row(6), row(7)])
        (self.pipe / "claims.json").write_text(json.dumps({"r3": {"claimed": [dup_id]}}))
        res = self.run_ap()
        self.assertEqual(res["result"], "published", res)
        self.assertEqual([c[0] for c in self.corpus_calls], ["live-after-publish.json"])
        self.assertEqual(self.corpus_calls[0][1:], (self.pipe / "corpus", self.pipe / "lane.json"))
        items = json.loads((self.pipe / "lane.json").read_text())["items"]
        self.assertEqual(items[dup_id]["reason"], "already_live")
        self.assertEqual(items[dup_id]["status"], "resolved")
        self.assertEqual(items[dup_id]["live_row"], self.bank.by_stable(row(1)["stable_question_id"]))
        self.assertEqual(json.loads((self.pipe / "claims.json").read_text())["r3"]["claimed"], [])
        # published and still canonical after the refresh: recorded as already live too
        self.assertEqual(items[row(6)["stable_question_id"]]["reason"], "already_live")
        self.assertNotIn(row(7)["stable_question_id"], items)
        self.assertEqual(self.state()["runs"][res["run"]]["duplicates_of_live"], 1)

    def test_typo_and_in_run_matches_are_not_duplicates_of_live(self):
        refused = [{"id": "a", "reasons": ["typo-level match with 00000000-0000-4000-8000-000000000001"]},
                   {"id": "b", "reasons": ["same stable question id as x (syn-1) in this run"]},
                   {"id": "c", "reasons": ["same comparison key as 00000000-0000-4000-8000-000000000002"]},
                   {"id": "d", "reasons": ["live correction: same comparison key as "
                                           "00000000-0000-4000-8000-000000000001"]}]
        export = [{"id": "00000000-0000-4000-8000-000000000001", "is_live": True, "archived_at": None},
                  {"id": "00000000-0000-4000-8000-000000000002", "is_live": False, "archived_at": None}]
        self.assertEqual(apl.duplicates_of_live(refused, export), {})
        export[1]["is_live"] = True
        self.assertEqual(list(apl.duplicates_of_live(refused, export)), ["c"])


class TestRefreshNow(LiveCase):
    def test_refresh_for_an_earlier_run(self):
        first = self.publish_two()
        live_id = self.bank.by_stable(row(1)["stable_question_id"])
        pre = self.pipe / first["run"] / "stage" / "precheck.json"
        pre.write_text(json.dumps({"refused": [{"id": "2099-01_SYN_V1_RW_M2_Q09", "batch": "syn-9",
                                                "reasons": [f"same comparison key as {live_id}"]}]}))
        self.corpus_roles = {row(2)["stable_question_id"]: "canonical"}
        res = apl.refresh_now(self.pipe, first["run"], self.bank.export, "2026-10-21T09:00:00Z", self.fake_corpus)
        self.assertEqual((res["duplicates_of_live"], res["published_still_canonical"]), (1, 1))
        self.assertEqual(self.corpus_calls[-1][0], "live-refresh.json")
        items = json.loads((self.pipe / "lane.json").read_text())["items"]
        self.assertEqual(items["2099-01_SYN_V1_RW_M2_Q09"]["live_row"], live_id)
        self.assertEqual(self.status()["corpus_unique_not_live"], 3)
        self.assertFalse((self.pipe / "writer.lock").exists())


class TestLaneAlreadyLive(LiveCase):
    def test_already_live_items_are_never_sliced(self):
        p = self.pipe
        ids = ["2099-01_SYN_V1_RW_M1_Q01", "2099-01_SYN_V1_RW_M1_Q02"]
        (p / "clusters.json").write_text(json.dumps({"roles": {i: "canonical" for i in ids}}))
        (p / "ledger.json").write_text(json.dumps({"items": [{"id": i, "bucket": "awaiting_evidence"} for i in ids]}))
        lane.add_open(p / "lane.json", {ids[0]: ("extraction_repair", "x")}, "2026-10-21T00:00:00", "seal")
        self.assertEqual(lane.mark_already_live(p / "lane.json", {ids[0]: ("u", "dup")}, "2026-10-21T01:00:00",
                                                "duplicate_of_live"), [ids[0]])
        item = json.loads((p / "lane.json").read_text())["items"][ids[0]]
        self.assertEqual((item["reason"], item["status"]), ("already_live", "resolved"))
        self.assertIn("[was extraction_repair open]", item["detail"])
        self.assertEqual(len(item["attempts"]), 1)
        got = lane.next_slice(p / "clusters.json", p / "lane.json", p / "ledger.json", "r9", now="t")
        self.assertEqual(got, [ids[1]])


class TestCheckEvidence(unittest.TestCase):
    def live_and_new(self):
        new = corrected(1)["key"]["raw_model_response"]
        old = copy.deepcopy(row(1)["key"]["raw_model_response"])
        old["student_publication_allowed"] = True
        old["approved_tags"]["question_payload_sha256"] = "a" * 64
        return old, new

    def test_only_the_skill_record_and_batch_bookkeeping_may_change(self):
        old, new = self.live_and_new()
        sid = row(1)["stable_question_id"]
        self.assertEqual(live_fix.check_evidence(sid, old, new), [])
        final = live_fix.new_evidence(old, new)
        self.assertIs(final["student_publication_allowed"], True)
        self.assertEqual(final["approved_tags"]["question_payload_sha256"], "a" * 64)
        new["approved_tags"]["catalog_skill_id"] = "rw-skill-other"
        self.assertIn("approved_tags.catalog_skill_id", live_fix.check_evidence(sid, old, new)[0])

    def test_unchanged_skill_record_and_unsealed_live_evidence_are_refused(self):
        old, _ = self.live_and_new()
        sid = row(1)["stable_question_id"]
        same = copy.deepcopy(old)
        same["student_publication_allowed"] = False
        same["approved_tags"].pop("question_payload_sha256")
        self.assertIn("the corrected skill review record equals the live one", live_fix.check_evidence(sid, old, same))
        old["approved_tags"].pop("question_payload_sha256")
        self.assertIn("the live evidence is not sealed, published evidence",
                      live_fix.check_evidence(sid, old, corrected(1)["key"]["raw_model_response"]))


if __name__ == "__main__":
    unittest.main()
