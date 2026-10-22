"""Refused rows reach the problem lane (synthetic rows only).

A whole batch refused at stage, and every refused row that is not a duplicate,
goes in the lane as extraction_repair so a reviewer is told. Duplicate refusals,
live corrections, live rows and published lane items are never touched.
"""

import copy
import json
from pathlib import Path

from kimport import autopilot_live as apl
from kimport import stage as st
from kimport.publish import RefuseToBuild
from tests.test_autopilot import AutopilotCase
from tests.test_bulk import row

NOW = "2026-10-22T09:00:00Z"
NUMERIC = ("stage-rows.ts: Reviewed numeric answer set must contain the stored key and distinct answers\n"
           "    at importQuestion (synthetic trace)")


class TestRunPutsRefusalsInTheLane(AutopilotCase):
    def setUp(self):
        super().setUp()
        self.failing = {}

    def deps(self, chunk_size=200):
        d = super().deps(chunk_size)

        def runner(reviewed, pdf, frozen, sha):
            if str(reviewed) in self.failing:
                raise RefuseToBuild(self.failing[str(reviewed)])
            return copy.deepcopy(self.docs[str(reviewed)])
        d.rows_runner = runner
        return d

    def test_refused_batch_rows_go_in_the_lane_and_published_rows_do_not(self):
        self.batch("syn-1", [row(1), row(2)])
        bad = self.batch("syn-bad", [row(5), row(6)])
        self.failing[st.read_ready(bad)["reviewed_file"]] = NUMERIC
        res = self.run_ap()
        self.assertEqual(res["result"], "published", res)
        items = json.loads((self.pipe / "lane.json").read_text())["items"]
        for n in (5, 6):
            it = items[row(n)["stable_question_id"]]
            self.assertEqual((it["reason"], it["status"]), ("extraction_repair", "open"))
            self.assertEqual(it["detail"], "stage refused (syn-bad): stage-rows.ts: Reviewed numeric answer set "
                                           "must contain the stored key and distinct answers at importQuestion "
                                           "(synthetic trace)")
        for n in (1, 2):
            self.assertNotIn(row(n)["stable_question_id"], items)
        self.assertEqual(self.state()["runs"][res["run"]]["refused_to_lane"], 2)
        self.assertEqual(self.state()["batches"]["syn-bad"]["status"], "refused")

    def test_nothing_staged_still_reports_the_refused_batch(self):
        bad = self.batch("syn-bad", [row(5)])
        self.failing[st.read_ready(bad)["reviewed_file"]] = "preflight: missing stable source identity"
        res = self.run_ap()
        self.assertEqual(res["result"], "nothing_to_stage", res)
        it = json.loads((self.pipe / "lane.json").read_text())["items"][row(5)["stable_question_id"]]
        self.assertEqual(it["detail"], "stage refused (syn-bad): preflight: missing stable source identity")

    def test_dry_run_writes_no_lane(self):
        bad = self.batch("syn-bad", [row(5)])
        self.failing[st.read_ready(bad)["reviewed_file"]] = NUMERIC
        self.batch("syn-1", [row(1)])
        self.run_ap(dry=True)
        self.assertFalse((self.pipe / "lane.json").exists())


class TestRefusalsToLane(AutopilotCase):
    def lane_items(self):
        return json.loads((self.pipe / "lane.json").read_text())["items"]

    def seed(self, items):
        (self.pipe / "lane.json").write_text(json.dumps({"items": items}))

    def test_duplicates_and_live_corrections_are_never_touched(self):
        refused = [
            {"id": "dup-key", "batch": "b1", "reasons": ["same comparison key as 00000000-0000-4000-8000-000000000001"]},
            {"id": "dup-run", "batch": "b1", "reasons": ["same stable question id as x (b1) in this run"]},
            {"id": "dup-typo", "batch": "b1", "reasons": ["typo-level match with 00000000-0000-4000-8000-000000000002"]},
            {"id": "dup-late", "batch": "b1", "reasons": ["figure gate: not approved",
                                                          "normalized question_text already in the bank"]},
            {"id": "live-fix", "batch": "b1", "reasons": ["live correction: question_text differs"]},
            {"id": "fig", "batch": "b1", "reasons": ["figure gate: status.json is drafting", "second"]},
            {"id": "held", "batch": "b2", "reasons": ["would still be held at seal: no skill record"]},
            {"id": "odd", "batch": "b2", "reasons": []},
        ]
        res = apl.refusals_to_lane(self.pipe / "lane.json", refused, [], [], NOW)
        items = self.lane_items()
        self.assertEqual(sorted(items), ["fig", "held", "odd"])
        self.assertEqual(res["added"], 3)
        self.assertEqual(items["fig"]["detail"], "stage refused (b1): figure gate: status.json is drafting")
        self.assertEqual(items["odd"]["detail"], "stage refused (b2): no reason given")
        self.assertTrue(all(i["reason"] == "extraction_repair" and i["status"] == "open" for i in items.values()))

    def test_lane_semantics_are_respected(self):
        old = "2026-10-01T00:00:00Z"
        self.seed({
            "live": {"reason": "already_live", "status": "resolved", "detail": "x", "since": old, "attempts": []},
            "pub": {"reason": "classification_review", "status": "resolved", "detail": "x", "since": old,
                    "attempts": [{"method": "autopilot_fix", "ok": True, "at": old, "detail": "published in auto-1"}]},
            "fixed": {"reason": "extraction_repair", "status": "resolved", "detail": "x", "since": old,
                      "attempts": [{"method": "reviewer", "ok": True, "at": old, "detail": "re-read"}]},
            "parked": {"reason": "needs_figure", "status": "parked", "detail": "x", "since": old, "attempts": []},
            "open": {"reason": "needs_figure", "status": "open", "detail": "keep me", "since": old, "attempts": []},
        })
        refused = [{"id": i, "batch": "b1", "reasons": ["figure gate: synthetic"]}
                   for i in ("live", "pub", "fixed", "parked", "open", "in-export")]
        export = [{"id": "00000000-0000-4000-8000-000000000009", "is_live": True, "archived_at": None,
                   "raw_model_response": {"approved_tags": {"stable_question_id": "in-export"}}}]
        res = apl.refusals_to_lane(self.pipe / "lane.json", refused, [], export, NOW)
        items = self.lane_items()
        self.assertEqual(res, {"added": 2, "skipped": 4, "unreadable_batches": []})
        self.assertEqual(items["live"]["detail"], "x")
        self.assertEqual(items["pub"]["status"], "resolved")
        self.assertEqual(items["open"], {"reason": "needs_figure", "status": "open", "detail": "keep me",
                                         "since": old, "attempts": []})
        self.assertNotIn("in-export", items)
        self.assertEqual((items["fixed"]["status"], items["fixed"]["reason"]), ("open", "extraction_repair"))
        self.assertEqual(items["fixed"]["attempts"][-1]["method"], "autopilot_stage")
        self.assertEqual((items["parked"]["status"], items["parked"]["reason"]), ("parked", "needs_figure"))
        self.assertFalse(items["parked"]["attempts"][-1]["ok"])

    def test_refused_batch_folder_rows_and_an_unreadable_batch(self):
        d = self.batch("b9", [row(7), row(8)])
        (self.pipe / "batches" / "b-gone").mkdir()
        rb = [{"folder": "b9", "reason": "reviewed rows name 2 source documents; expected one exam"},
              {"folder": "b-gone", "reason": "no READY"}]
        refused = [{"id": row(7)["stable_question_id"], "batch": "b9", "reasons": ["figure gate: other"]}]
        res = apl.refusals_to_lane(self.pipe / "lane.json", refused, rb, [], NOW, [d])
        items = self.lane_items()
        self.assertEqual(res["unreadable_batches"], ["b-gone"])
        self.assertEqual(sorted(items), sorted([row(7)["stable_question_id"], row(8)["stable_question_id"]]))
        self.assertEqual(items[row(7)["stable_question_id"]]["detail"],
                         "stage refused (b9): reviewed rows name 2 source documents; expected one exam")

    def test_nothing_to_add_writes_no_lane(self):
        refused = [{"id": "d", "batch": "b", "reasons": ["source question already in the bank"]}]
        self.assertEqual(apl.refusals_to_lane(self.pipe / "lane.json", refused, [], [], NOW)["added"], 0)
        self.assertFalse(Path(self.pipe / "lane.json").exists())
