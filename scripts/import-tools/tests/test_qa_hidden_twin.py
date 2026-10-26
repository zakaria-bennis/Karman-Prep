"""A QA correction whose fixed text now equals its QA-hidden duplicate twin (kimport.qa_correct),
and `k qa restore` refusing that twin while the corrected copy is live (kimport.qa_run). Synthetic
rows, no database."""

import copy
import json

from kimport import qa_correct as qc
from kimport import qa_run
from kimport.export import read_export_doc
from kimport.sweep import UNPUBLISHED_IMPORT, UNPUBLISHED_STATUS
from tests.test_autopilot import AutopilotCase
from tests.test_bulk import row
from tests.test_qa_correct import QA_REASON, QaBank, hide

TWIN_REASON = "qa:audit: Same text and choices, both key A; b flagged"


class TestHiddenTwin(AutopilotCase):
    def two(self, twin_state="hidden"):
        """row(1) and row(2) published; row(1) QA-hidden; row(2), its twin, in `twin_state`."""
        self.bank = QaBank(None)
        self.batch("syn-1", [row(1), row(2), row(3)])
        self.assertEqual(self.run_ap()["result"], "published")
        qid = self.bank.by_stable(row(1)["stable_question_id"])
        twin = self.bank.by_stable(row(2)["stable_question_id"])
        canonical = self.bank.by_stable(row(3)["stable_question_id"])  # the sweep kept this one
        hide(self.bank, qid)
        if twin_state == "hidden":
            hide(self.bank, twin, TWIN_REASON)
        elif twin_state.startswith("swept"):  # un-published by the sweep: not archived, not a qa: reason
            self.bank.rows[twin]["question"].update(import_flag_reason=f"duplicate of {canonical}; un-published by sweep",
                                                    publish_status="needs_human_review", import_status="needs_review",
                                                    is_live=False)
            if twin_state == "swept":  # its group has no live row: the canonical was hidden by QA too
                hide(self.bank, canonical, TWIN_REASON)
        self.canonical = canonical
        return qid, twin

    def correct(self, hidden_ids=frozenset()):
        """A correction of row(1) whose text is now row(2)'s text."""
        dup = row(1, question_text=row(2)["question"]["question_text"])
        d = self.batch("syn-1-qa-1", [dup])
        self.bank.export(self.d / "export.json")
        res = qc.build_correct([d], read_export_doc(self.d / "export.json"), "auto-syn",
                               [copy.deepcopy(s) for s in self.bank.rows.values()], self.d / "exams",
                               rows_runner=lambda r, p, f, s, **kw: copy.deepcopy(self.docs[str(r)]),
                               hidden_ids=frozenset(hidden_ids))
        return res, dup["stable_question_id"]

    def test_a_qa_hidden_twin_does_not_block_the_correction(self):
        qid, twin = self.two()
        res, sid = self.correct({qid, twin})
        self.assertEqual(res["refused"], {})
        self.assertEqual(res["precheck"]["hidden_twins_allowed"], {sid: {twin: "qa"}})
        sql = res["files"]["qa.sql"]
        # the guard lets exactly the twin through, and only while it is still QA-hidden and not live
        self.assertIn(f"AND NOT ((o.id='{twin}'::uuid AND o.archived_at IS NOT NULL AND o.import_flag_reason LIKE"
                      " 'qa:%' AND o.publish_status='needs_human_review' AND o.import_status='needs_review'"
                      " AND o.is_live IS NOT TRUE))", sql)
        self.assertEqual(sql.count(f"'{twin}'::uuid"), 3)  # the hash, comparison key and text guards
        self.assertIn("THEN RAISE EXCEPTION 'normalized question text already in the bank", sql)

    def test_the_twin_still_blocks_when_qa_does_not_list_it(self):
        qid, _ = self.two()
        res, sid = self.correct({qid})  # the twin is archived but not in qa/hidden.jsonl
        self.assertTrue(any("already in the bank" in w for w in res["refused"][sid]))
        self.assertNotIn("qa.sql", res["files"])

    def blocked(self, state):
        qid, twin = self.two(state)
        res, sid = self.correct({qid, twin})  # listed, but not QA-hidden in the bank
        self.assertTrue(any("already in the bank" in w for w in res["refused"][sid]), res["refused"])
        self.assertNotIn("qa.sql", res["files"])

    def test_a_live_twin_still_blocks(self):
        self.blocked("live")

    def test_a_twin_the_sweep_unpublished_does_not_block_when_its_group_has_no_live_row(self):
        qid, twin = self.two("swept")
        res, sid = self.correct({qid, self.canonical})  # the sweep's twin is not in qa/hidden.jsonl
        self.assertEqual(res["refused"], {})
        self.assertEqual(res["precheck"]["hidden_twins_allowed"], {sid: {twin: "sweep"}})
        sql = res["files"]["qa.sql"]
        reason = f"duplicate of {self.canonical}; un-published by sweep"
        self.assertIn(f"(o.id='{twin}'::uuid AND o.archived_at IS NULL AND o.import_flag_reason='{reason}'"
                      " AND o.publish_status='needs_human_review' AND o.import_status='needs_review'"
                      " AND o.is_live IS NOT TRUE AND NOT EXISTS (SELECT 1 FROM public.quiz_questions g"
                      f" WHERE g.is_live IS TRUE AND (g.id='{self.canonical}'::uuid OR g.import_flag_reason='{reason}')))",
                      sql)

    def test_a_sweep_twin_whose_canonical_is_live_still_blocks_and_says_so(self):
        qid, twin = self.two("swept-live")
        res, sid = self.correct({qid})
        why = res["refused"][sid]
        self.assertTrue(any("already in the bank" in w for w in why), why)
        self.assertIn(f"its group has a live row ({self.canonical})", why[-1])
        self.assertNotIn("qa.sql", res["files"])

    def test_a_changed_accepted_answer_list_is_a_correction(self):
        self.two("live")
        same = row(1)
        same["key"]["raw_model_response"] = copy.deepcopy(same["key"]["raw_model_response"])
        same["key"]["raw_model_response"]["numeric_answer_set"] = {"answers": ["116.82", "116.8"]}
        d = self.batch("syn-1-qa-1", [same])
        self.bank.export(self.d / "export.json")
        snaps = [copy.deepcopy(s) for s in self.bank.rows.values()]
        build = lambda: qc.build_correct([d], read_export_doc(self.d / "export.json"), "auto-syn", snaps,
                                         self.d / "exams", rows_runner=lambda r, p, f, s, **kw: copy.deepcopy(self.docs[str(r)]))
        self.assertEqual(build()["refused"], {})
        old = next(s for s in snaps if s["question"]["id"] == self.bank.by_stable(row(1)["stable_question_id"]))
        old["keys"][0]["raw_model_response"]["numeric_answer_set"] = {"answers": ["116.8", "116.82"]}
        self.assertIn("nothing was corrected", build()["refused"][same["stable_question_id"]][0])
        self.assertEqual(qc.key_answers({"evidence": {"numeric_answer_set": {"answers": ["2/7", ".2857"]}}}),
                         [".2857", "2/7"])
        self.assertIsNone(qc.key_answers({"approved_tags": {}}))

    def test_autopilot_reads_the_hidden_log(self):
        qid, twin = self.two()
        (self.pipe / "qa").mkdir(parents=True, exist_ok=True)
        (self.pipe / "qa" / "hidden.jsonl").write_text("".join(  # what k qa hide records
            json.dumps({"id": i, "reason": r, "at": "2026-10-22T21:00:00Z", "label": "audit", "run": "hide-1",
                        "content_hash_v2": self.bank.rows[i]["question"]["content_hash_v2"],
                        "previous_publish_status": "publish_ready", "previous_import_status": "imported",
                        "previous_import_flag_reason": None, "previous_archived_at": None}) + "\n"
            for i, r in ((qid, QA_REASON), (twin, TWIN_REASON))))
        self.batch("syn-1-qa-1", [row(1, question_text=row(2)["question"]["question_text"])])
        res = self.run_ap()
        self.assertEqual(res["result"], "published", res)
        self.assertEqual(self.bank.rows[qid]["question"]["is_live"], True)
        self.assertEqual(self.bank.rows[twin]["question"]["is_live"], False)


def bank_row(n, text, live, comparison_key=None, content_hash="h"):
    r = {"id": f"00000000-0000-4000-8000-{n:012d}", "question_text": text, "content_hash_v2": f"{content_hash}{n}",
         "comparison_key": comparison_key, "is_live": live,
         "publish_status": "publish_ready" if live else UNPUBLISHED_STATUS,
         "import_status": "imported" if live else UNPUBLISHED_IMPORT,
         "import_flag_reason": None if live else TWIN_REASON, "archived_at": None if live else "2026-10-22T21:00:00Z"}
    return r


class TestRestoreRefusesATwin(AutopilotCase):
    def check(self, rows):
        twin = rows[0]
        hidden = {twin["id"]: {"id": twin["id"], "reason": TWIN_REASON}}
        return qa_run.restore_checks([twin["id"]], hidden, {}, set(), {r["id"]: r for r in rows})

    def test_twin_of_a_live_corrected_copy_stays_hidden(self):
        text = "Which made-up choice best describes the willow oak?"
        bad = self.check([bank_row(1, text, False), bank_row(2, "Which made-up choice best describes the willow  oak ?", True)])
        self.assertIn("same normalized text", list(bad.values())[0])
        twin, copy_ = bank_row(1, text, False), bank_row(2, "Other words entirely.", True)
        copy_["content_hash_v2"] = twin["content_hash_v2"]
        self.assertIn("same content hash", list(self.check([twin, copy_]).values())[0])
        twin, copy_ = bank_row(1, text, False, "k1"), bank_row(2, "Other words entirely.", True, "k1")
        self.assertIn("same comparison key", list(self.check([twin, copy_]).values())[0])

    def test_twin_whose_copy_is_not_live_can_come_back(self):
        text = "Which made-up choice best describes the willow oak?"
        self.assertEqual(self.check([bank_row(1, text, False), bank_row(2, text, False)]), {})
        self.assertEqual(self.check([bank_row(1, text, False), bank_row(2, "Other words entirely.", True)]), {})
