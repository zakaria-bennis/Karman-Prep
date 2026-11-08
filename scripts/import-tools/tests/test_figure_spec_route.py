"""The checked-spec route through the figure gate (founder, 2026-11-01), and stage / publish carrying
figure_spec and choice_figure_spec. Synthetic rows only; check-spec.ts is faked."""

import json
import tempfile
import unittest
from pathlib import Path

from kimport import figure_gate as fg, lint, stage
from kimport.publish import RefuseToBuild, _check_row
from tests import figure_fixtures as ffx
from tests import publish_fixtures as pfx
from tests import stage_fixtures as fx
from tests.export_fixtures import write_export
from tests.test_figure_publish import spec

TEXT = "In the made-up figure, which point is labeled P1?"


def clean(path):
    return {"ok": True, "issues": [], "spec": {}, "choices": []}


def dirty(path):
    return {"ok": False, "issues": [{"code": "clipped", "detail": "off the edge"}], "spec": None, "choices": []}


def spec_doc(occ, figure_spec=None, choices=None):
    doc = ffx.figure_doc(occ, {"question_text": TEXT})
    doc.update(figure_spec=figure_spec, transcribed_labels=["P1"])
    for c in doc["answer_choices"]:
        if choices and c["letter"] in choices:
            c.update(choice_figure_spec=choices[c["letter"]], transcribed_labels=["P3"])
    return doc


def submit(figures_dir: Path, occ: str, doc: dict, verdict="match", bind=True) -> Path:
    folder = ffx.write_figure(figures_dir, occ, doc, status="ready_for_founder")
    figure = doc.get("figure_spec") if bind else spec(99)
    v = {"schema": fg.VERDICT_SCHEMA, "verdict": verdict, "occurrence_id": occ,
         "figure_sha256": fg.spec_sha256(figure, fg.choice_specs(doc)),
         "original_sha256": fg.file_sha256(folder / fg.ORIGINAL_FILE), "reviewer": "v1", "at": ffx.AT}
    (folder / fg.VERDICT_FILE).write_text(json.dumps(v))
    return folder


class RouteTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.figs = Path(self.tmp.name) / "figures"
        self.occ = "2099-01_SYN_V1_RW_M1_Q03"

    def tearDown(self):
        self.tmp.cleanup()

    def row(self, figure_spec, choices=None):
        return {"question_text": TEXT, "figure_spec": figure_spec, "choice_figure_specs": choices or {}}

    def reasons(self, row, checker=clean):
        return fg.gate_reasons(self.figs, self.occ, {"the reviewed batch row": row}, frozenset(), checker)

    def test_a_checked_spec_with_a_match_verdict_passes_in_place_of_approval(self):
        for figure in (spec(), [spec(1), spec(2)]):
            submit(self.figs, self.occ, spec_doc(self.occ, figure, {"A": spec(3)}))
            self.assertEqual(self.reasons(self.row(figure, {"A": spec(3)})), [])
            self.assertIn(self.occ, fg.publishable_ids(self.figs))

    def test_each_condition_is_needed(self):
        doc = spec_doc(self.occ, spec())
        cases = {
            "the engine checks found 1 issue": dict(checker=dirty),
            "not 'match'": dict(verdict="mismatch"),
            "judged other specs": dict(bind=False),
        }
        for want, kw in cases.items():
            checker = kw.pop("checker", clean)
            submit(self.figs, self.occ, doc, **kw)
            why = self.reasons(self.row(spec()), checker)
            self.assertEqual(len(why), 1)
            self.assertIn("not cleared by the checked-spec route", why[0])
            self.assertIn(want, why[0])
        folder = submit(self.figs, self.occ, doc)
        (folder / fg.ORIGINAL_FILE).write_bytes(b"another crop")
        self.assertIn("compared another original.png", self.reasons(self.row(spec()))[0])
        folder = submit(self.figs, self.occ, doc)
        (folder / fg.FIGURE_FILE).write_text(json.dumps(doc))  # edited after submit
        self.assertIn("changed after it was submitted", self.reasons(self.row(spec()))[0])
        (folder / fg.VERDICT_FILE).unlink()
        self.assertNotIn(self.occ, fg.publishable_ids(self.figs))

    def test_old_figure_fields_and_drafts_still_need_the_founder(self):
        table = ffx.figure_doc(self.occ, {"question_text": TEXT, "figure_kind": "table",
                                          "figure_table_data": {"rows": [["1", "2"]]}})
        submit(self.figs, self.occ, table)
        self.assertIn("no FigureSpec", self.reasons({"figure_kind": "table", "figure_table_data": {"rows": [["1", "2"]]}})[0])
        ffx.write_figure(self.figs, self.occ, spec_doc(self.occ, spec()), status="drafting")
        self.assertIn("not a submitted figure", self.reasons(self.row(spec()))[0])

    def test_the_row_must_carry_the_cleared_specs(self):
        submit(self.figs, self.occ, spec_doc(self.occ, spec(), {"B": spec(3)}))
        why = self.reasons(self.row(spec(), {"B": spec(4)}))
        self.assertIn("choice_figure_specs", why[0])
        why = self.reasons(self.row(spec(2), {"B": spec(3)}))
        self.assertIn("figure_spec", why[0])

    def test_the_founders_approval_still_works(self):
        ffx.write_figure(self.figs, self.occ, spec_doc(self.occ, spec()), status="approved")
        self.assertEqual(self.reasons(self.row(spec()), checker=dirty), [])  # his approval needs no engine run

    def test_lint_lets_a_cleared_figure_group_copy_through(self):
        submit(self.figs, self.occ, spec_doc(self.occ, spec()))
        clusters = {"roles": {self.occ: "figure_review"}}
        self.assertEqual(lint._check_dedup({"stable_question_id": self.occ}, clusters,
                                           fg.publishable_ids(self.figs)), [])


class StageCarryTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)
        self.batch = fx.write_batch_dir(self.d / "batches" / "syn-1")

    def tearDown(self):
        self.tmp.cleanup()

    def test_stage_carries_the_specs_and_the_gate_checks_them(self):
        plain, fig = fx.stage_row(1, "Which made-up choice completes the plain text?"), fx.stage_row(3, TEXT)
        occ = fig["stable_question_id"]
        flat = [{"stable_question_id": r["stable_question_id"], **r["question"]} for r in (plain, fig)]
        flat[1].update(figure_spec=[spec(1), spec(2)], choice_figure_specs={"C": spec(3)})
        (self.batch / "syn-1-reviewed-import-ready.json").write_text(json.dumps({"questions": flat}))
        submit(self.d / "figures", occ, spec_doc(occ, [spec(1), spec(2)], {"C": spec(3)}))
        import kimport.figures as kf
        real, kf.spec_check = kf.spec_check, clean
        try:
            res = stage.build_stage(self.batch, write_export(self.d / "e.json", []), self.d / "x.pdf",
                                    rows_doc=fx.rows_doc([plain, fig]))
        finally:
            kf.spec_check = real
        self.assertTrue(res["precheck"]["passed"], res["precheck"]["refused"])
        sql = res["files"]["stage.sql"]
        staged = {it["id"]: it["row"] for it in res["staged"]}
        self.assertEqual(staged[occ]["question"]["figure_spec"], [spec(1), spec(2)])
        self.assertEqual([c["choice_figure_spec"] for c in staged[occ]["choices"]], [None, None, spec(3), None])
        self.assertNotIn("figure_spec", staged[plain["stable_question_id"]]["question"])  # untouched
        inserts = [ln for ln in sql.split("row 2:", 1)[1].splitlines() if ln.lstrip().startswith("INSERT INTO")]
        self.assertIn("figure_spec", inserts[0])  # quiz_questions
        self.assertIn("choice_figure_spec", inserts[1])  # answer_choices
        self.assertNotIn("figure_spec", sql.split("row 2:", 1)[0].split("row 1:", 1)[1])
        preview = json.loads(res["files"]["stage-preview.json"])["rows"][1]
        self.assertEqual(preview["choice_figure_specs"], {"C": spec(3)})

    def test_a_choice_spec_for_a_missing_choice_refuses(self):
        row = fx.stage_row(3, TEXT)
        flat = [{"stable_question_id": row["stable_question_id"], **row["question"], "choice_figure_specs": {"E": spec()}}]
        (self.batch / "syn-1-reviewed-import-ready.json").write_text(json.dumps({"questions": flat}))
        with self.assertRaisesRegex(RefuseToBuild, "names E"):
            stage.carry_figure_specs([row], self.batch / "syn-1-reviewed-import-ready.json")


class PublishCheckTest(unittest.TestCase):
    def test_choice_specs_must_match_the_sealed_preview(self):
        snap = pfx.snapshot(1, "Which made-up choice completes the plain text?")
        seal = pfx.sealed(snap)
        _check_row(snap, seal)
        snap["choices"][1]["choice_figure_spec"] = spec()
        with self.assertRaisesRegex(RefuseToBuild, "choice_figure_spec differs"):
            _check_row(snap, seal)
        _check_row(snap, {**seal, "choice_figure_specs": {"B": spec()}})
        snap["question"]["figure_spec"] = spec()
        with self.assertRaisesRegex(RefuseToBuild, "figure_spec is set in the database"):
            _check_row(snap, {**seal, "choice_figure_specs": {"B": spec()}})
        with self.assertRaisesRegex(RefuseToBuild, "figure_spec differs"):
            _check_row(snap, {**seal, "choice_figure_specs": {"B": spec()}, "figure_spec": spec(2)})
        _check_row(snap, {**seal, "choice_figure_specs": {"B": spec()}, "figure_spec": spec()})


if __name__ == "__main__":
    unittest.main()
