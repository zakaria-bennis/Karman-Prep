"""k figures slice / submit / rework / status on synthetic fixtures."""

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from kimport import figure_gate as fg, figures
from tests import figure_fixtures as ffx

CLI = Path(__file__).resolve().parent.parent / "kimport-cli.py"
EXAM, VER, CAT = "2099-01_SYN_V1", "B-SYN-1", "Problems that passed"
SVG = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" data-figure-theme="karman-v1" role="img">'
       '<line x1="0" y1="0" x2="100" y2="0" stroke="#3b3426"/>'
       '<text x="5" y="20" font-family="STIX Two Text, Times New Roman, serif" fill="#f3ecdd">x</text></svg>')


def oid(n, sec="MATH", mod=1):
    return f"{EXAM}_{sec}_M{mod}_Q{n:02d}"


def fig_member(i, live=False, key=True, holds=0):
    return {"id": i, "source": "corpus", "is_live": live, "match": "figure_candidate", "spots": [],
            "printed_key": key, "holds": holds, "reason": "essential_visual_material_unreviewed"}


def table_doc(occ):
    return {"schema": fg.SCHEMA, "occurrence_id": occ, "figure_kind": "table",
            "figure_table_data": {"header_groups": [{"label": "", "span": 1}, {"label": "Grade", "span": 2}],
                                  "header_row": ["Subject", "Sixth", "Seventh"],
                                  "rows": [["Math", "4", "9"], ["Total", "4", "9"]]},
            "subject": "math", "question_text": "The made-up table shows counts. How many?",
            "answer_format": "multiple_choice",
            "answer_choices": [{"letter": letter, "choice_text": t, "choice_table_data": None}
                               for letter, t in zip("ABCD", ("1", "2", "3", "4"))],
            "correct_answer": "B"}


class Queue(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)
        self.pipe = self.d / "pipeline"
        (self.pipe / "corpus").mkdir(parents=True)
        self.figs = self.pipe / "figures"
        self.b_root = self.d / "b"
        self.clusters, self.lane, self.ledger = self.pipe / "corpus/clusters.json", self.pipe / "lane.json", self.d / "ledger.json"
        ids = [oid(n) for n in range(1, 9)]
        items = []
        for n, i in enumerate(ids, 1):
            png = f"png {n}".encode()
            p = self.b_root / EXAM / VER / CAT / i / "original.png"
            p.parent.mkdir(parents=True)
            p.write_bytes(png)
            items.append({"id": i, "exam": EXAM, "B_output_version": VER, "B_category": CAT, "bucket": "held",
                          "A_png_sha256": hashlib.sha256(png).hexdigest()})
        items[6]["bucket"] = "already_live"
        items[7]["A_png_sha256"] = "0" * 64  # crop on disk does not match the ledger
        self.ledger.write_text(json.dumps({"items": items}))
        groups = [
            {"cluster_id": "kf-1", "status": "figure_review", "canonical": None, "is_live": False,
             "members": [fig_member(ids[0], key=False), fig_member(ids[1])]},          # one of two: Q02 (printed key)
            {"cluster_id": "kf-2", "status": "figure_review", "canonical": None, "is_live": True,
             "members": [fig_member(ids[2], live=True)]},                              # live group: never
            {"cluster_id": "kf-3", "status": "figure_review", "canonical": None, "is_live": False,
             "members": [fig_member(ids[3])]},                                          # lane answer_dispute: never
            {"cluster_id": "kf-4", "status": "figure_review", "canonical": None, "is_live": False,
             "members": [fig_member(ids[6])]},                                          # ledger live: never
            {"cluster_id": "kf-5", "status": "figure_review", "canonical": None, "is_live": False,
             "members": [fig_member(ids[7])]},                                          # no matching crop
            {"cluster_id": "kc-6", "status": "settled", "canonical": ids[5], "is_live": False,
             "members": [dict(fig_member(ids[5]), match="canonical")]},
        ]
        self.clusters.write_text(json.dumps({"roles": {}, "clusters": groups}))
        self.lane.write_text(json.dumps({"items": {
            ids[3]: {"reason": "answer_dispute", "status": "open", "since": "t", "attempts": []},
            ids[4]: {"reason": "needs_figure", "status": "open", "since": "t", "attempts": []},
            ids[5]: {"reason": "needs_figure", "status": "resolved", "since": "t", "attempts": []}}}))
        self.ids = ids

    def tearDown(self):
        self.tmp.cleanup()

    def slice(self, who="r1", size=10):
        return figures.next_slice(self.figs, self.clusters, self.lane, self.ledger, who, "2026-10-21T10:00:00Z",
                                  size, [], self.b_root)

    def status(self, occ):
        return json.loads((self.figs / occ / "status.json").read_text())

    def test_slice_one_per_group_plus_lane_needs_figure(self):
        got = self.slice()
        self.assertEqual([g["id"] for g in got], [self.ids[1], self.ids[4], self.ids[7]])
        s = self.status(self.ids[1])
        self.assertEqual((s["status"], s["round"], s["claimed_by"]), ("drafting", 1, "r1"))
        self.assertEqual(s["group"], [self.ids[0], self.ids[1]])
        self.assertEqual((self.figs / self.ids[1] / "original.png").read_bytes(), b"png 2")
        self.assertEqual(json.loads((self.figs / self.ids[1] / "figure.json").read_text())["occurrence_id"], self.ids[1])
        self.assertIsNone(got[2]["original"])
        self.assertFalse((self.figs / self.ids[7] / "original.png").exists())

    def test_never_reissued_and_group_stays_taken(self):
        self.assertEqual(len(self.slice("r1", size=1)), 1)
        second = [g["id"] for g in self.slice("r2")]
        self.assertNotIn(self.ids[1], second)
        self.assertNotIn(self.ids[0], second)  # same figure group as an item already out
        self.assertEqual(self.slice("r3"), [])
        self.assertEqual(self.status(self.ids[1])["claimed_by"], "r1")

    def test_submit_validates_then_ready(self):
        occ = self.slice(size=1)[0]["id"]
        with self.assertRaisesRegex(ValueError, "figure_kind must be one of"):
            figures.submit(self.figs, occ, "r1", "2026-10-21T10:05:00Z")
        (self.figs / occ / "figure.json").write_text(json.dumps(table_doc(occ)))
        s = figures.submit(self.figs, occ, "r1", "2026-10-21T10:05:00Z")
        self.assertEqual((s["status"], s["round"]), ("ready_for_founder", 1))
        self.assertEqual(s["submitted_file_sha256"], fg.file_sha256(self.figs / occ / "figure.json"))
        self.assertEqual(s["history"][-1]["decision"], "submitted")

    def test_rejected_resubmit_is_next_round_and_rework_lists_note(self):
        occ = self.ids[1]
        folder = ffx.write_figure(self.figs, occ, table_doc(occ), status="rejected")
        s = json.loads((folder / "status.json").read_text())
        s["history"][-1]["note"] = "Grade header should span both grade columns only"
        (folder / "status.json").write_text(json.dumps(s))
        ffx.write_figure(self.figs, self.ids[4], table_doc(self.ids[4]), status="ready_for_founder")
        items = figures.rework(self.figs)
        self.assertEqual([(i["id"], i["note"]) for i in items],
                         [(occ, "Grade header should span both grade columns only")])
        self.assertEqual(figures.rework(self.figs, "someone-else"), [])
        self.assertEqual(figures.submit(self.figs, occ, "r9", "2026-10-21T11:00:00Z")["round"], 2)
        self.assertEqual(figures.rework(self.figs), [])

    def test_approved_not_resubmitted_and_original_required(self):
        ffx.write_figure(self.figs, self.ids[1], table_doc(self.ids[1]))
        with self.assertRaisesRegex(ValueError, "already approved"):
            figures.submit(self.figs, self.ids[1], "r1", "t")
        folder = ffx.write_figure(self.figs, self.ids[4], table_doc(self.ids[4]), status="drafting")
        (folder / "original.png").unlink()
        with self.assertRaisesRegex(ValueError, "no original.png"):
            figures.submit(self.figs, self.ids[4], "r1", "t")
        with self.assertRaisesRegex(ValueError, "not in the figure queue"):
            figures.submit(self.figs, self.ids[5], "r1", "t")

    def test_summary_counts(self):
        ffx.write_figure(self.figs, self.ids[1], table_doc(self.ids[1]))
        ffx.write_figure(self.figs, self.ids[4], table_doc(self.ids[4]), status="drafting")
        s = figures.summary(self.figs)
        self.assertEqual(s["counts"]["approved"], 1)
        self.assertEqual(s["drafting_by_reviewer"], {"r9": 1})

    def test_cli_status_submit_rework(self):
        occ = self.ids[1]
        ffx.write_figure(self.figs, occ, table_doc(occ), status="drafting")

        def k(*args):
            return subprocess.run([sys.executable, "-I", str(CLI), "figures", *args], capture_output=True, text=True)
        done = k("submit", "--figures", str(self.figs), "--id", occ, "--by", "r1", "--now", "2026-10-21T12:00:00Z")
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertIn("ready for the founder (round 1)", done.stdout)
        self.assertIn("1 ready_for_founder", k("status", "--figures", str(self.figs)).stdout)
        bad = k("submit", "--figures", str(self.figs), "--id", "../x", "--by", "r1", "--now", "t")
        self.assertEqual(bad.returncode, 1)
        self.assertEqual(k("rework", "--figures", str(self.figs)).returncode, 0)


class Validation(unittest.TestCase):
    def ok(self, doc):
        return fg.validate_figure(doc, doc["occurrence_id"])

    def test_table_ok_and_spans_checked(self):
        doc = table_doc("X_Q01")
        self.assertEqual(self.ok(doc), [])
        doc["figure_table_data"]["header_groups"][1]["span"] = 3
        self.assertTrue(any("spans add up to 4, not 3" in p for p in self.ok(doc)))
        doc = table_doc("X_Q01")
        doc["figure_table_data"]["rows"][0].append("x")
        self.assertTrue(any("needs 3 cells" in p for p in self.ok(doc)))

    def svg_doc(self, svg):
        return {**table_doc("X_Q01"), "figure_kind": "image", "figure_table_data": None, "figure_svg": svg,
                "image_alt": "A made-up line."}

    def test_svg_pilot_standard(self):
        self.assertEqual(self.ok(self.svg_doc(SVG)), [])
        no_theme = SVG.replace(' data-figure-theme="karman-v1"', "")
        self.assertTrue(any("data-figure-theme" in p for p in self.ok(self.svg_doc(no_theme))))
        sans = SVG.replace("STIX Two Text, Times New Roman, serif", "Arial")
        self.assertTrue(any("figure serif" in p for p in self.ok(self.svg_doc(sans))))
        for bad in ("<script>1</script>", '<image href="https://x.test/a.png"/>', '<rect onclick="x"/>',
                    '<rect fill="url(#g)"/>'):
            self.assertTrue(self.ok(self.svg_doc(SVG.replace("</svg>", bad + "</svg>"))), bad)
        self.assertTrue(any("image_alt" in p for p in self.ok({**self.svg_doc(SVG), "image_alt": " "})))

    def test_geometry_needs_balanced_layout(self):
        doc = {**table_doc("X_Q01"), "figure_kind": "geometric", "figure_table_data": None,
               "figure_geometry_data": {"kind": "triangle", "shapes": [
                   {"kind": "triangle", "vertices_or_points": [{"label": "A", "x": 1, "y": 2}]}]}}
        self.assertTrue(any("balanced-v1" in p for p in self.ok(doc)))
        doc["figure_geometry_data"]["layout_version"] = "balanced-v1"
        self.assertEqual(self.ok(doc), [])

    def test_chart_and_question_fields(self):
        doc = {**table_doc("X_Q01"), "figure_kind": "chart", "figure_table_data": None,
               "figure_chart_data": {"kind": "histogram", "x_axis": {}, "series": []}}
        probs = self.ok(doc)
        for want in ("figure_chart_data.kind", "y_axis", "series"):
            self.assertTrue(any(want in p for p in probs), want)
        doc = {**table_doc("X_Q01"), "correct_answer": "(1, 7)", "question_text": "", "occurrence_id": "Y"}
        probs = fg.validate_figure(doc, "X_Q01")
        for want in ("letter A, B, C or D", "question_text is empty", "occurrence_id must be X_Q01"):
            self.assertTrue(any(want in p for p in probs), want)
        self.assertTrue(any("is set but figure_kind" in p for p in self.ok({**table_doc("X_Q01"), "figure_svg": SVG})))


if __name__ == "__main__":
    unittest.main()


class RenderabilityTests(unittest.TestCase):
    """submit refuses what the real renderers cannot draw; the sweep returns such figures."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.figs = Path(self.tmp.name)
        self.addCleanup(self.tmp.cleanup)

    def bad_doc(self, occ):
        doc = table_doc(occ)
        doc.update({"figure_kind": "geometric", "figure_table_data": None, "figure_geometry_data": {
            "layout_version": "balanced-v1", "kind": "geometric",
            "shapes": [{"kind": "triangle", "label": "RST", "vertices_or_points": [
                {"label": "R", "x": 255, "y": 170}, {"label": "S", "x": 430, "y": 80}, {"label": "T", "x": 425, "y": 170}]}],
            "angle_markings": [{"at_vertex": "T", "between_vertices": ["R", "S"], "right_angle": True}],
            "length_markings": []}})
        return doc

    def test_submit_refuses_unrenderable_geometry(self):
        occ = "2023-03_UNSPECIFIED_V1_Math_MUNSPECIFIED_Q01"
        ffx.write_figure(self.figs, occ, self.bad_doc(occ), status="drafting")
        with self.assertRaisesRegex(ValueError, "unresolved_angle_mark"):
            figures.submit(self.figs, occ, "r1", "2026-10-21T10:05:00Z")
        self.assertEqual(fg.read_status(self.figs / occ)["status"], "drafting")

    def test_sweep_returns_only_unrenderable_ready_figures(self):
        bad, good = ("2023-03_UNSPECIFIED_V1_Math_MUNSPECIFIED_Q01", "2023-03_UNSPECIFIED_V1_Math_MUNSPECIFIED_Q02")
        ffx.write_figure(self.figs, bad, self.bad_doc(bad), status="ready_for_founder")
        ffx.write_figure(self.figs, good, table_doc(good), status="ready_for_founder")
        got = figures.return_unrenderable(self.figs, "2026-10-21T12:00:00Z")
        self.assertEqual([g["id"] for g in got], [bad])
        s = fg.read_status(self.figs / bad)
        self.assertEqual(s["status"], "drafting")
        self.assertEqual(s["history"][-1]["decision"], "returned")
        self.assertEqual(s["history"][-1]["by"], "coordinator")
        self.assertTrue(s["history"][-1]["note"].startswith("renders blank: "))
        self.assertEqual(fg.read_status(self.figs / good)["status"], "ready_for_founder")
        self.assertEqual([i["id"] for i in figures.rework(self.figs)], [bad])
