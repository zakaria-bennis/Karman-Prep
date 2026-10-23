"""Import publish gate (kimport.qa_gate): the QA audit's fail-level checks refuse a row before any
write, in lint (PF_QA, to the lane) and in the stage prechecks. Synthetic rows only."""

import json
import tempfile
import unittest
from pathlib import Path

from kimport import autopilot_state, bulk, lane, lint, qa_gate, stage
from tests import stage_fixtures as fx
from tests.export_fixtures import write_export
from tests.test_lint import clusters_for, make_row

TEXT = "Which made-up choice best completes the note about the alder grove?"


class RealCheckerTest(unittest.TestCase):
    """ts/qa-check.ts --gate itself, judged under main's display rules."""

    def found(self, **row):
        base = {"id": "SYN_1", "subject": "reading", "answer_format": "multiple_choice", "correct_answer": "A",
                "question_text": TEXT, "answer_key_entries": [],
                "answer_choices": [{"letter": L, "choice_text": f"choice {L}", "choice_table_data": None} for L in "ABCD"]}
        base.update(row)
        return qa_gate.check_rows([base], qa_gate.ts_checker, reach=lambda u: None)["SYN_1"]

    def test_clean_row_and_display_fixed_artifacts_pass(self):
        self.assertEqual(self.found()["fail"], {})
        # Hyphen runs show as an em dash and "______ blank" as one blank on main: not counted.
        f = self.found(passage="The grove --- old and quiet --- stood. It was ______ blank by noon.")
        self.assertEqual(f["fail"], {})

    def test_fail_checks_from_both_halves(self):
        f = self.found(question_text="Which is $\\frac{1}{$ of the <b>grove</b>?")
        self.assertIn("katex_error", f["fail"])  # app code (qa-check.ts)
        self.assertIn("markup_as_text", f["fail"])
        f = self.found(question_text="Section 1, Module 2\nWhich made-up choice fits?")
        self.assertIn("header_footer_line", f["fail"])  # Python half (qa_static)
        f = self.found(passage="The ranger left a blank space on the map.")
        self.assertIn("word_blank_drawn_as_line", f["fail"])

    def test_review_checks_are_not_refusals(self):
        f = self.found(question_text="Which made-up choice best completes the")
        self.assertEqual(f["fail"], {})
        self.assertIn("stem_truncated", f["review"])

    def test_unreachable_image_fails(self):
        row = {"id": "SYN_1", "subject": "math", "answer_format": "numeric_entry", "correct_answer": "3",
               "question_text": "What is x?", "figure_kind": "image", "image_url": "https://x.test/a.png",
               "answer_choices": [], "answer_key_entries": []}
        f = qa_gate.check_rows([row], qa_gate.ts_checker, reach=lambda u: "HTTP 404")["SYN_1"]
        self.assertIn("image_unreachable", f["fail"])


class LintGateTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())

    def lint(self, rows, checker=None):
        rp, cp = self.tmp / "b-reviewed-import-ready.json", self.tmp / "clusters.json"
        rp.write_text(json.dumps({"import_policy": "reviewed-difficulty", "questions": rows}))
        cp.write_text(json.dumps(clusters_for(rows)))
        return lint.run_lint(rp, None, cp, self.tmp / "lane.json", "2099-01-01T00:00:00Z", qa_checker=checker)

    def test_failing_row_is_pulled_to_the_lane_with_the_check_name(self):
        bad = make_row(1)
        bad["choice_c"] = "three ï»¿"
        res = self.lint([bad, make_row(2)])
        self.assertEqual(res["passed"], 1)
        self.assertEqual([(p["id"], p["code"]) for p in res["pulled"]], [("SYN_TEST_Q01", "PF_QA")])
        self.assertTrue(res["pulled"][0]["detail"].startswith("mojibake: choice C"))
        item = lane._read_lane(self.tmp / "lane.json")["items"]["SYN_TEST_Q01"]
        self.assertEqual(item["reason"], "extraction_repair")
        self.assertIn("PF_QA: mojibake", item["detail"])

    def test_review_findings_are_warnings_only(self):
        row = make_row(1)
        row["question_text"] = "Which synthetic stem number 1 is about the"
        res = self.lint([row])
        self.assertEqual((res["passed"], res["pulled"]), (1, []))
        self.assertEqual([(w["id"], w["check"]) for w in res["warnings"]], [("SYN_TEST_Q01", "stem_truncated")])

    def test_real_checker_on_a_reviewed_row(self):
        row = make_row(1)
        row["question_text"] = "Which is $\\frac{1}{$ here?"
        row["domain"] = "algebra"
        res = self.lint([row], checker=qa_gate.ts_checker)
        self.assertEqual(res["pulled"][0]["code"], "PF_QA")
        self.assertIn("katex_error", res["pulled"][0]["detail"])


class StageGateTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_stage_refuses_a_failing_row_before_any_sql(self):
        batch = fx.write_batch_dir(self.d / "syn-1")
        rows = [fx.stage_row(1, "Page 3 of 9\n" + TEXT), fx.stage_row(2, TEXT.replace("alder", "birch"))]
        res = stage.build_stage(batch, write_export(self.d / "e.json", []), self.d / "x.pdf", rows_doc=fx.rows_doc(rows))
        self.assertEqual(list(res["files"]), ["precheck.json"])  # no stage.sql
        (rid, why), = res["refused"].items()
        self.assertEqual(rid, rows[0]["stable_question_id"])
        self.assertTrue(why[0].startswith("qa gate: header_footer_line: question_text"))
        self.assertEqual(autopilot_state.reason_kind(why[0]), "qa_gate")
        res = stage.build_stage(batch, write_export(self.d / "e.json", []), self.d / "x.pdf",
                                rows_doc=fx.rows_doc(rows), skip_refused=True)
        self.assertEqual([it["id"] for it in res["staged"]], [rows[1]["stable_question_id"]])
        self.assertNotIn("Page 3 of 9", res["files"]["stage.sql"])

    def test_stage_twin_uses_the_app_code_checks(self):
        batch = fx.write_batch_dir(self.d / "syn-1")
        rows = [fx.stage_row(1, TEXT + " <s>old</s>")]
        items = stage.make_items(fx.rows_doc(rows)["rows"])
        qa_gate.mark_items(items, qa_gate.ts_checker)
        self.assertTrue(items[0]["qa_gate"][0].startswith("qa gate: markup_as_text"))
        self.assertTrue(batch.exists())

    def test_bulk_stage_refuses_the_row_and_keeps_the_rest(self):
        a = fx.write_batch_dir(self.d / "batches" / "syn-1", name="syn-1")
        rows = [fx.stage_row(1, TEXT, choices={"A": "one", "B": "one", "C": "three", "D": "four"}),
                fx.stage_row(2, TEXT.replace("alder", "birch"))]
        res = bulk.build_bulk_stage([a], write_export(self.d / "e.json", []), "bulk-1", self.d,
                                    rows_docs={"syn-1": fx.rows_doc(rows)}, skip_refused=True)
        refused = res["precheck"]["refused"]
        self.assertEqual([r["id"] for r in refused], [rows[0]["stable_question_id"]])
        self.assertTrue(refused[0]["reasons"][0].startswith("qa gate: choices_identical"))
        self.assertEqual(len(res["staged"]), 1)


if __name__ == "__main__":
    unittest.main()
