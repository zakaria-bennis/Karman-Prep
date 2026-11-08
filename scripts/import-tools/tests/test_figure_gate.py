"""The founder's figure gate on stage, bulk stage and publish (synthetic rows only)."""

import json
import tempfile
import unittest
from pathlib import Path

from kimport import bulk, figure_gate as fg, stage
from kimport.autopilot_state import reason_kind
from kimport.publish import RefuseToBuild, build_publish
from tests import figure_fixtures as ffx
from tests import publish_fixtures as pfx
from tests import stage_fixtures as fx
from tests.export_fixtures import write_export

TABLE = {"header_row": ["Town", "Count"], "rows": [["Alder", "4"], ["Birch", "9"]]}
TEXT_T = "According to the made-up table, how many birds were counted in Birch?"
TEXT_P = "Which made-up choice best completes the text about the plain meadow?"


def table_row(n=3, table=TABLE):
    return fx.stage_row(n, TEXT_T, figure_kind="table", figure_table_data=table)


class StageGate(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)
        self.batch = fx.write_batch_dir(self.d / "batches" / "syn-1")
        self.figures = self.d / "figures"

    def tearDown(self):
        self.tmp.cleanup()

    def build(self, rows, **kw):
        export = write_export(self.d / "export.json", [])
        return stage.build_stage(self.batch, export, self.d / "x.pdf", rows_doc=fx.rows_doc(rows), **kw)

    def reviewed(self, rows):
        """The reviewed file only (no approval)."""
        flat = [{"stable_question_id": r["stable_question_id"], **r["question"]} for r in rows]
        (self.batch / "syn-1-reviewed-import-ready.json").write_text(json.dumps({"questions": flat}))
        return flat

    def reasons(self, res, occ):
        return next(r["reasons"] for r in res["precheck"]["refused"] if r["id"] == occ)

    def test_plain_rows_pass_without_any_figures_folder(self):
        rows = [fx.stage_row(1, TEXT_P)]
        self.reviewed(rows)
        res = self.build(rows)
        self.assertTrue(res["precheck"]["passed"])
        self.assertFalse(self.figures.exists())

    def test_unapproved_table_refused_rest_staged(self):
        rows = [fx.stage_row(1, TEXT_P), table_row()]
        self.reviewed(rows)
        res = self.build(rows, skip_refused=True)
        occ = rows[1]["stable_question_id"]
        self.assertEqual([it["id"] for it in res["staged"]], [rows[0]["stable_question_id"]])
        self.assertIn("figure not approved by the founder", self.reasons(res, occ)[0])
        self.assertEqual(reason_kind(self.reasons(res, occ)[0]), "figure_gate")

    def test_without_skip_nothing_written(self):
        rows = [table_row()]
        self.reviewed(rows)
        res = self.build(rows)
        self.assertEqual(list(res["files"]), ["precheck.json"])

    def test_approved_matching_table_staged(self):
        rows = [fx.stage_row(1, TEXT_P), table_row()]
        flat = self.reviewed(rows)
        ffx.approve_like(self.figures, rows[1]["stable_question_id"], flat[1])
        res = self.build(rows)
        self.assertTrue(res["precheck"]["passed"])
        self.assertEqual(len(res["staged"]), 2)

    def test_batch_row_differing_from_approved_refused(self):
        rows = [table_row()]
        flat = self.reviewed(rows)
        occ = rows[0]["stable_question_id"]
        other = {**flat[0], "figure_table_data": {"header_row": ["Town", "Count"], "rows": [["Alder", "4"], ["Birch", "8"]]}}
        ffx.approve_like(self.figures, occ, other)
        why = self.reasons(self.build(rows), occ)
        self.assertTrue(any("reviewed batch row differs" in r and "figure_table_data" in r for r in why), why)

    def test_null_and_absent_fields_are_equal(self):
        rows = [table_row(table={**TABLE, "caption": None, "footer_note": None})]
        flat = self.reviewed(rows)
        ffx.write_figure(self.figures, rows[0]["stable_question_id"],
                         {**ffx.figure_doc(rows[0]["stable_question_id"], flat[0]), "figure_table_data": TABLE})
        self.assertTrue(self.build(rows)["precheck"]["passed"])

    def test_figure_json_edited_after_approval_refused(self):
        rows = [table_row()]
        flat = self.reviewed(rows)
        occ = rows[0]["stable_question_id"]
        folder = ffx.approve_like(self.figures, occ, flat[0])
        doc = json.loads((folder / "figure.json").read_text())
        (folder / "figure.json").write_text(json.dumps(doc))  # same content, different bytes
        self.assertIn("changed after the founder approved", self.reasons(self.build(rows), occ)[0])

    def test_waiting_or_rejected_refused(self):
        rows = [table_row()]
        flat = self.reviewed(rows)
        occ = rows[0]["stable_question_id"]
        for status in ("ready_for_founder", "rejected", "drafting"):
            ffx.write_figure(self.figures, occ, ffx.figure_doc(occ, flat[0]), status=status)
            self.assertIn(f"status {status}", self.reasons(self.build(rows), occ)[0])

    def test_importer_dropping_svg_refused(self):
        svg = '<svg xmlns="http://www.w3.org/2000/svg" data-figure-theme="karman-v1"><rect x="1" y="1"/></svg>'
        rows = [fx.stage_row(3, TEXT_T, figure_kind="image", image_alt="A made-up figure.")]
        flat = self.reviewed(rows)
        occ = rows[0]["stable_question_id"]
        flat[0]["figure_svg"] = svg  # the reviewer's row carries it, the importer's row does not
        (self.batch / "syn-1-reviewed-import-ready.json").write_text(json.dumps({"questions": flat}))
        ffx.approve_like(self.figures, occ, flat[0])
        why = self.reasons(self.build(rows), occ)
        self.assertEqual(len(why), 1)
        self.assertIn("the row the importer builds differs", why[0])
        self.assertIn("figure_svg", why[0])

    def test_folder_without_figure_in_row_refused(self):
        rows = [fx.stage_row(1, TEXT_P)]
        self.reviewed(rows)
        occ = rows[0]["stable_question_id"]
        ffx.write_figure(self.figures, occ, ffx.figure_doc(occ, table_row()["question"]))
        why = self.reasons(self.build(rows), occ)
        self.assertTrue(any("differs" in r for r in why), why)

    def test_choice_tables_compared(self):
        row = fx.stage_row(5, TEXT_T)
        for i, c in enumerate(row["choices"]):
            c["choice_table_data"] = {"rows": [[str(i), str(2 * i)]]}
        fx.approve_figure_rows(self.batch, [row])
        self.assertTrue(self.build([row])["precheck"]["passed"])
        row["choices"][2]["choice_table_data"] = {"rows": [["9", "9"]]}
        why = self.reasons(self.build([row]), row["stable_question_id"])
        self.assertTrue(any("choice_tables" in r for r in why), why)


class BulkGate(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_bulk_refuses_unapproved_figure_row_only(self):
        rows = [fx.stage_row(1, TEXT_P, source_module="M2"), table_row()]
        b = fx.write_batch_dir(self.d / "batches" / "syn-1")
        fx.approve_figure_rows(b, rows[:1])
        flat = [{"stable_question_id": r["stable_question_id"], **r["question"]} for r in rows]
        (b / "syn-1-reviewed-import-ready.json").write_text(json.dumps({"questions": flat}))
        res = bulk.build_bulk_stage([b], write_export(self.d / "e.json", []), "bulk-1", self.d,
                                    skip_refused=True, rows_docs={"syn-1": fx.rows_doc(rows)})
        self.assertEqual([it["id"] for it in res["staged"]], [rows[0]["stable_question_id"]])
        self.assertTrue(res["precheck"]["refused"][0]["reasons"][0].startswith(fg.GATE))
        ffx.approve_like(self.d / "figures", rows[1]["stable_question_id"], flat[1])
        res = bulk.build_bulk_stage([b], write_export(self.d / "e.json", []), "bulk-1", self.d,
                                    rows_docs={"syn-1": fx.rows_doc(rows)})
        self.assertEqual(len(res["staged"]), 2)


class PublishGate(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def paths(self, snaps, approve):
        return pfx.write_batch(self.d, snaps, [pfx.export_row(s) for s in snaps], approve_figures=approve)

    def test_unapproved_table_refused(self):
        snaps = [pfx.snapshot(1, "Which made-up choice completes the plain text?"), pfx.table_snapshot()]
        p = self.paths(snaps, approve=False)
        with self.assertRaisesRegex(RefuseToBuild, "figure gate: figure not approved"):
            build_publish(p["readback"], p["sealed"], p["export"], p["intents"], "syn-batch")

    def test_approved_table_builds(self):
        snaps = [pfx.table_snapshot()]
        p = self.paths(snaps, approve=True)
        bundle = build_publish(p["readback"], p["sealed"], p["export"], p["intents"], "syn-batch")
        self.assertEqual(len(bundle["keys"]), 1)

    def test_drift_after_stage_refused(self):
        snaps = [pfx.table_snapshot()]
        p = self.paths(snaps, approve=True)
        sid = snaps[0]["keys"][0]["raw_model_response"]["approved_tags"]["stable_question_id"]
        changed = {**snaps[0], "question": {**snaps[0]["question"], "figure_table_data": TABLE}}
        ffx.approve_like(self.d / "figures", sid, changed)
        with self.assertRaisesRegex(RefuseToBuild, "private readback row differs"):
            build_publish(p["readback"], p["sealed"], p["export"], p["intents"], "syn-batch")

    def test_plain_rows_unaffected(self):
        snaps = [pfx.snapshot(1, "Which made-up choice completes the plain text?")]
        p = self.paths(snaps, approve=False)
        build_publish(p["readback"], p["sealed"], p["export"], p["intents"], "syn-batch")
        self.assertFalse((self.d / "figures").exists())


if __name__ == "__main__":
    unittest.main()
