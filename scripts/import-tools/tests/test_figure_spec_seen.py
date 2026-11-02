"""An engine-drawn figure (figure_spec, one FigureSpec or a list of up to 4) counts as the
question's figure everywhere the tools ask "does this row have a figure": the QA audit and the
import publish gate (ts/qa-check.ts, kimport.qa_static, kimport.qa_gate), lint (PF_FIGURE), and
the batch builders' figure hand-off (figure_gate.cleared_figure / row_figure_fields). A text
that points at a figure it does not have is still refused. Synthetic rows only."""

import json
import re
import tempfile
import unittest
from pathlib import Path

from kimport import figure_gate as fg, figures, lint, qa_gate, stage
from tests import figure_fixtures as ffx
from tests import stage_fixtures as fx
from tests.export_fixtures import write_export
from tests.test_figure_publish import spec
from tests.test_figure_spec_route import clean, dirty, spec_doc, submit
from tests.test_lint import make_row

STEM = "The graph shown models the made-up height of a plant. What is the height after 3 days?"
DOT = {"version": "figure-spec/1", "type": "dot_plot", "parts": [], "labels": [], "marks": []}


def mc_row(**over):
    row = {"id": "SYN_1", "subject": "math", "answer_format": "multiple_choice", "correct_answer": "A",
           "question_text": STEM, "answer_key_entries": [],
           "answer_choices": [{"letter": L, "choice_text": f"{n} cm", "choice_table_data": None}
                              for L, n in zip("ABCD", (2, 4, 6, 8))]}
    row.update(over)
    return row


class RealCheckerTest(unittest.TestCase):
    """ts/qa-check.ts --gate and the Python half together, on one export-shaped row."""

    def found(self, row):
        return qa_gate.check_rows([row], qa_gate.ts_checker, reach=lambda u: None)["SYN_1"]

    def test_a_valid_figure_spec_is_the_figure(self):
        for figure in (spec(), [DOT, {**DOT, "title": "Class B"}], [spec(n) for n in range(4)]):
            f = self.found(mc_row(figure_spec=figure))
            self.assertEqual(f["fail"], {}, figure)

    def test_a_text_that_needs_a_missing_figure_is_still_refused(self):
        self.assertIn("figure_referenced_missing", self.found(mc_row())["fail"])
        for bad, why in (([spec(n) for n in range(5)], "at most 4"), ([], "empty list"),
                         ({"type": "pie"}, "known type"), ([spec(), "x"], "figure 2"), ("<svg/>", "known type")):
            f = self.found(mc_row(figure_spec=bad))["fail"]
            self.assertIn("figure_referenced_missing", f, bad)
            self.assertIn(why, " ".join(f["figure_invalid"]), bad)

    def test_figure_choices_count_and_a_spec_beside_a_leftover_kind_draws(self):
        choices = [{"letter": L, "choice_text": "", "choice_table_data": None, "choice_figure_spec": spec(i)}
                   for i, L in enumerate("ABCD")]
        f = self.found(mc_row(question_text="Which graph shows the made-up plant's height?", answer_choices=choices))
        self.assertEqual(f["fail"], {})
        f = self.found(mc_row(figure_kind="image", figure_spec=spec()))
        self.assertEqual((f["fail"], f["review"].get("figure_kind_without_figure")), ({}, None))

    def test_the_copies_of_the_engine_rules_match(self):
        ts = (Path(qa_gate.__file__).parents[1] / "ts/qa-check.ts").read_text()
        types = re.search(r"SPEC_TYPES = \[(.*?)\]", ts, re.S).group(1)
        self.assertEqual(tuple(re.findall(r'"(\w+)"', types)), fg.SPEC_TYPES)
        self.assertIn(f"MAX_FIGURES = {fg.MAX_FIGURES};", ts)
        engine = figures.engine_dir() / "src/lib/figures/engine"
        if not (engine / "spec-types.ts").is_file():
            self.skipTest("the figure engine worktree is not here")
        main_types = re.search(r"FIGURE_TYPES = \[(.*?)\]", (engine / "spec-types.ts").read_text(), re.S).group(1)
        self.assertEqual(tuple(re.findall(r'"(\w+)"', main_types)), fg.SPEC_TYPES)
        self.assertIn(f"MAX_FIGURES = {fg.MAX_FIGURES};", (engine / "spec.ts").read_text())


class RowShapeTest(unittest.TestCase):
    def test_reviewed_and_staged_rows_carry_their_specs_to_the_checker(self):
        row = {**make_row(1), "figure_spec": [DOT, DOT], "choice_figure_specs": {"B": spec()}}
        shaped = qa_gate.row_from_reviewed(row)
        self.assertEqual(shaped["figure_spec"], [DOT, DOT])
        self.assertEqual([c["choice_figure_spec"] for c in shaped["answer_choices"]], [None, spec(), None, None])
        item = stage.make_items([fx.stage_row(1, STEM)])[0]
        item["row"]["question"]["figure_spec"] = spec()
        item["row"]["choices"][2]["choice_figure_spec"] = spec(2)
        staged = qa_gate.row_from_staged(item)
        self.assertEqual(staged["figure_spec"], spec())
        self.assertEqual(staged["answer_choices"][2]["choice_figure_spec"], spec(2))

    def test_a_choice_with_only_a_spec_is_kept(self):
        row = {**make_row(1), "choice_a": None, "choice_figure_specs": {"A": spec()}}
        self.assertEqual(qa_gate.row_from_reviewed(row)["answer_choices"][0]["letter"], "A")


class LintTest(unittest.TestCase):
    def test_pf_figure_counts_a_valid_spec_and_refuses_a_bad_one(self):
        row = {**make_row(1), "question_text": STEM}
        self.assertIn("refers to a visual", lint._check_figure(row)[0])
        self.assertEqual(lint._check_figure({**row, "figure_spec": spec()}), [])
        self.assertEqual(lint._check_figure({**row, "figure_spec": [DOT, DOT]}), [])
        self.assertEqual(lint._check_figure({**row, "choice_figure_specs": {"A": spec()}}), [])
        self.assertIn("at most 4", lint._check_figure({**row, "figure_spec": [DOT] * 5})[0])
        self.assertIn("known type", lint._check_figure({**row, "figure_spec": {"kind": "x"}})[0])
        self.assertIn("choice B", lint._check_figure({**row, "choice_figure_specs": {"B": "x"}})[0])

    def test_figure_json_refuses_a_bad_spec_shape(self):
        doc = spec_doc("2099-01_SYN_V1_RW_M1_Q03", [DOT] * 5)
        self.assertTrue(any("at most 4" in p for p in fg.validate_figure(doc, doc["occurrence_id"])))
        self.assertEqual(fg.validate_figure(spec_doc(doc["occurrence_id"], [DOT, DOT]), doc["occurrence_id"]), [])


class StageTest(unittest.TestCase):
    """The stage precheck on a row whose stem points at its engine-drawn figure (461 of the held
    ready_for_founder figures read like this)."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)
        self.batch = fx.write_batch_dir(self.d / "batches" / "syn-1")

    def tearDown(self):
        self.tmp.cleanup()

    def build(self, figure):
        row = fx.stage_row(3, STEM)
        occ = row["stable_question_id"]
        flat = [{"stable_question_id": occ, **row["question"], **({"figure_spec": figure} if figure else {})}]
        (self.batch / "syn-1-reviewed-import-ready.json").write_text(json.dumps({"questions": flat}))
        if figure:
            submit(self.d / "figures", occ, spec_doc(occ, figure))
        real, figures.spec_check = figures.spec_check, clean
        try:
            return stage.build_stage(self.batch, write_export(self.d / "e.json", []), self.d / "x.pdf",
                                     rows_doc=fx.rows_doc([row]))
        finally:
            figures.spec_check = real

    def test_a_cleared_spec_list_stages_and_no_figure_is_refused(self):
        for figure in (spec(), [DOT, {**DOT, "title": "B"}]):
            res = self.build(figure)
            self.assertTrue(res["precheck"]["passed"], res["precheck"]["refused"])
        res = self.build(None)
        (why,) = res["refused"].values()
        self.assertTrue(any(w.startswith("qa gate: figure_referenced_missing") for w in why), why)


class BuilderHandOffTest(unittest.TestCase):
    """figure_gate.cleared_figure and row_figure_fields: what a batch builder reads from figure.json."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.figs = Path(self.tmp.name) / "figures"
        self.occ = "2099-01_SYN_V1_RW_M1_Q03"

    def tearDown(self):
        self.tmp.cleanup()

    def test_only_an_approved_or_route_cleared_figure_is_handed_out(self):
        doc = spec_doc(self.occ, [DOT, DOT], {"A": spec(3)})
        submit(self.figs, self.occ, doc)
        self.assertEqual(fg.cleared_figure(self.figs, self.occ, clean), doc)
        with self.assertRaisesRegex(ValueError, "engine checks found"):
            fg.cleared_figure(self.figs, self.occ, dirty)
        ffx.write_figure(self.figs, self.occ, doc, status="drafting")
        with self.assertRaisesRegex(ValueError, "not a submitted figure"):
            fg.cleared_figure(self.figs, self.occ, clean)
        folder = ffx.write_figure(self.figs, self.occ, doc, status="approved")
        self.assertEqual(fg.cleared_figure(self.figs, self.occ, dirty), doc)  # his approval needs no engine run
        (folder / fg.FIGURE_FILE).write_text(json.dumps({**doc, "notes": "edited"}))
        with self.assertRaisesRegex(ValueError, "changed after the founder approved"):
            fg.cleared_figure(self.figs, self.occ, clean)

    def test_the_row_fields_are_exactly_what_the_gate_compares(self):
        table = ffx.figure_doc(self.occ, {"question_text": STEM, "figure_kind": "table",
                                          "figure_table_data": {"rows": [["1", ""]]}, "image_alt": "x"})
        table["answer_choices"][1]["choice_table_data"] = {"rows": [["", "2"]]}
        for doc in (spec_doc(self.occ, [DOT, DOT], {"C": spec(3)}), spec_doc(self.occ, spec()), table):
            fields = fg.row_figure_fields(doc)
            self.assertEqual(fg.figure_fields(fields), fg.figure_fields(doc))
            self.assertNotIn("answer_choices", fields)
        self.assertEqual(fg.row_figure_fields(spec_doc(self.occ, [DOT, DOT]))["figure_spec"], [DOT, DOT])
        self.assertEqual(fg.row_figure_fields(table)["choice_tables"], {"B": {"rows": [["", "2"]]}})


if __name__ == "__main__":
    unittest.main()
