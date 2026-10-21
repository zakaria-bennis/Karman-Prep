"""`k figures no-figure` and the one figure-question rule (figure_gate.is_figure_question),
on synthetic fixtures: a question whose original.png shows no figure goes back to the text lane."""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from kimport import figure_gate as fg, figures, lint, stage
from kimport.corpus import cluster
from kimport.corpus_load import IMAGE, VISUAL_REASON, record_from_question
from tests import stage_fixtures as fx
from tests.corpus_fixtures import mc, q
from tests.export_fixtures import write_export
from tests.test_lint import clusters_for, make_row

CLI = Path(__file__).resolve().parent.parent / "kimport-cli.py"
AT = "2026-10-21T18:00:00Z"
V1, V2 = "2099-01_SYN_V1_MATH_M1_Q10", "2099-01_SYN_V2_MATH_M1_Q10"


def sliced(figures_dir: Path, occ: str, group=None, status="drafting") -> Path:
    """A folder exactly as `k figures slice` leaves it (skeleton figure.json, status drafting)."""
    folder = Path(figures_dir) / occ
    folder.mkdir(parents=True)
    (folder / fg.ORIGINAL_FILE).write_bytes(b"\x89PNG synthetic")
    (folder / fg.FIGURE_FILE).write_text(json.dumps(figures._skeleton(occ)))
    (folder / fg.STATUS_FILE).write_text(json.dumps({
        "occurrence_id": occ, "status": status, "round": 1, "claimed_by": "r3", "group": group or [occ],
        "submitted_file_sha256": None, "approved_file_sha256": None,
        "history": [{"at": AT, "decision": "sliced", "note": "", "by": "r3"}]}))
    return folder


class Command(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.figs = Path(self.tmp.name) / "pipeline" / "figures"

    def tearDown(self):
        self.tmp.cleanup()

    def test_marks_status_releases_claim_and_records_group(self):
        sliced(self.figs, V1, group=[V1, V2])
        entry = figures.no_figure(self.figs, V1, "r3", "  text, one equation and four choices ", AT)
        self.assertEqual(entry, {"id": V1, "covers": [V2], "by": "r3", "at": AT,
                                 "note": "text, one equation and four choices"})
        s = fg.read_status(self.figs / V1)
        self.assertEqual((s["status"], s["claimed_by"], s["released_by"]), (fg.NO_FIGURE, None, "r3"))
        self.assertEqual(s["history"][-1], {"at": AT, "decision": fg.NO_FIGURE, "by": "r3",
                                            "note": "text, one equation and four choices"})
        self.assertEqual(fg.read_no_figure(self.figs)["items"], [entry])
        self.assertEqual(fg.no_figure_ids(self.figs), {V1, V2})
        self.assertEqual(figures.summary(self.figs)["counts"][fg.NO_FIGURE], 1)
        with self.assertRaisesRegex(ValueError, "no_figure"):
            figures.submit(self.figs, V1, "r3", AT)
        with self.assertRaisesRegex(ValueError, "already marked"):
            figures.no_figure(self.figs, V1, "r3", "again", AT)

    def test_appends_in_order(self):
        other = "2099-01_SYN_V1_MATH_M2_Q08"
        sliced(self.figs, V1)
        sliced(self.figs, other)
        figures.no_figure(self.figs, V1, "r3", "text only", AT)
        figures.no_figure(self.figs, other, "r4", "text only", AT)
        self.assertEqual([it["id"] for it in fg.read_no_figure(self.figs)["items"]], [V1, other])

    def test_refusals(self):
        with self.assertRaisesRegex(ValueError, "not in the figure queue"):
            figures.no_figure(self.figs, V1, "r3", "text only", AT)
        sliced(self.figs, V1, status="approved")
        with self.assertRaisesRegex(ValueError, "approved"):
            figures.no_figure(self.figs, V1, "r3", "text only", AT)
        with self.assertRaisesRegex(ValueError, "--note"):
            figures.no_figure(self.figs, V1, "r3", "  ", AT)
        self.assertFalse(fg.no_figure_path(self.figs).exists())

    def test_unreadable_record_refuses(self):
        self.figs.mkdir(parents=True)
        fg.no_figure_path(self.figs).write_text("[1, 2]")
        with self.assertRaisesRegex(ValueError, "not readable no-figure JSON"):
            fg.no_figure_ids(self.figs)

    def test_cli(self):
        sliced(self.figs, V1)
        lane = self.figs.parent / "lane.json"
        out = subprocess.run([sys.executable, str(CLI), "figures", "no-figure", "--lane", str(lane), "--id", V1,
                              "--reviewer", "r3", "--note", "text and choices only", "--now", AT],
                             capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("back to the text lane", out.stdout)
        self.assertEqual(fg.no_figure_ids(self.figs), {V1})


class OneRule(unittest.TestCase):
    """corpus_load, corpus clustering and lint read the same no-figure.json through one helper."""

    def test_helper(self):
        self.assertTrue(fg.is_figure_question(V1, "ledger hold visual", frozenset()))
        self.assertFalse(fg.is_figure_question(V1, "ledger hold visual", {V1}))
        self.assertFalse(fg.is_figure_question(V1, None, frozenset()))

    def test_flagged_record_is_text_once_listed(self):
        x = q(1, mc("See figure. What is the slope of line k?"))
        flagged = record_from_question(x, V1)
        self.assertEqual((flagged.meta["status"], flagged.meta["reason"]), ("figure", VISUAL_REASON))
        cleared = record_from_question(x, V1, no_figure={V1})
        self.assertEqual(cleared.meta["status"], "ok")
        self.assertIn("no figure in original.png", cleared.meta["no_figure"])

    def test_ledger_or_cf_hold_cleared_too(self):
        x = q(1, mc("What is the slope of line k?"))
        meta = {"figure_reason": "CF essential visual (complete)"}
        self.assertEqual(record_from_question(x, V1, meta=meta).meta["status"], "figure")
        self.assertEqual(record_from_question(x, V1, meta=meta, no_figure={V1}).meta["status"], "ok")

    def test_cleared_question_without_a_key_is_unparsed_not_hidden(self):
        x = q(1, mc("See figure. What is the slope of line k?"), key="E")
        self.assertEqual(record_from_question(x, V1).meta["status"], "figure")
        r = record_from_question(x, V1, no_figure={V1})
        self.assertEqual((r.meta["status"], r.meta["reason"]), ("unparsed", "key_unmapped"))

    def test_twins_merge_and_cluster_by_text(self):
        text = mc("See figure. The made-up line k passes through (0, 2) and (3, 3). What is its slope?")
        recs = lambda nf: [record_from_question(q(1, text), V1, no_figure=nf),
                           record_from_question(q(2, text), V2, no_figure=nf)]
        before = cluster(recs(frozenset()))
        self.assertEqual(set(before.roles.values()), {"figure_review"})
        after = cluster(recs({V1, V2}))
        self.assertEqual(sorted(after.roles.values()), ["canonical", "member"])
        self.assertEqual([c["status"] for c in after.clusters], ["settled"])

    def test_lint_skips_visual_phrase_for_listed_id(self):
        tmp = Path(tempfile.mkdtemp())
        row = make_row()
        row["question_text"] = "Based on the graph shown, what is x?"
        rp, cp = tmp / "r.json", tmp / "c.json"
        rp.write_text(json.dumps({"questions": [row]}))
        cp.write_text(json.dumps(clusters_for([row])))
        self.assertEqual([p["code"] for p in lint.lint_batch(rp, None, cp)["pulled"]], ["PF_FIGURE"])
        self.assertEqual(lint.lint_batch(rp, None, cp, {row["stable_question_id"]})["pulled"], [])


class Gate(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)
        self.batch = fx.write_batch_dir(self.d / "batches" / "syn-1")
        self.figs = self.d / "figures"

    def tearDown(self):
        self.tmp.cleanup()

    def build(self, rows):
        flat = [{"stable_question_id": r["stable_question_id"], **r["question"]} for r in rows]
        (self.batch / "syn-1-reviewed-import-ready.json").write_text(json.dumps({"questions": flat}))
        return stage.build_stage(self.batch, write_export(self.d / "export.json", []), self.d / "x.pdf",
                                 rows_doc=fx.rows_doc(rows), skip_refused=True)

    def test_sliced_folder_blocks_until_marked_no_figure(self):
        rows = [fx.stage_row(1, "Which made-up choice best completes the plain text?"),
                fx.stage_row(2, "Which made-up choice best completes the other plain text?")]
        occ = rows[1]["stable_question_id"]
        sliced(self.figs, occ)
        refused = self.build(rows)["precheck"]["refused"]
        self.assertEqual([r["id"] for r in refused], [occ])
        self.assertTrue(any(r.startswith(fg.GATE) for r in refused[0]["reasons"]))
        figures.no_figure(self.figs, occ, "r3", "text and four choices", AT)
        res = self.build(rows)
        self.assertEqual(sorted(it["id"] for it in res["staged"]), sorted(r["stable_question_id"] for r in rows))

    def test_listed_id_whose_row_carries_a_figure_is_refused(self):
        row = fx.stage_row(2, "According to the made-up table, how many?", figure_kind="table",
                           figure_table_data={"rows": [["a", "1"]]})
        occ = row["stable_question_id"]
        sliced(self.figs, occ)
        figures.no_figure(self.figs, occ, "r3", "text only", AT)
        reasons = fg.gate_reasons(self.figs, occ, {"the row the importer builds": row})
        self.assertEqual(len(reasons), 1)
        self.assertIn("no-figure.json", reasons[0])

    def test_group_copy_without_folder_passes(self):
        sliced(self.figs, V1, group=[V1, V2])
        figures.no_figure(self.figs, V1, "r3", "text only", AT)
        self.assertEqual(fg.gate_reasons(self.figs, V2, {"row": {"question_text": "x"}}), [])


class SliceSkipsListed(unittest.TestCase):
    def test_candidates(self):
        tmp = Path(tempfile.mkdtemp())
        member = {"source": "corpus", "is_live": False, "match": "figure_candidate", "spots": [],
                  "printed_key": True, "holds": 0}
        (tmp / "clusters.json").write_text(json.dumps({"roles": {}, "clusters": [
            {"cluster_id": "kf-1", "status": "figure_review", "canonical": None, "is_live": False,
             "members": [dict(member, id=V1)]}]}))
        ledger = {V1: {"id": V1, "bucket": "held"}}
        self.assertEqual(figures.candidates(tmp / "clusters.json", tmp / "lane.json", ledger), [(V1, [V1])])
        self.assertEqual(figures.candidates(tmp / "clusters.json", tmp / "lane.json", ledger, {V1}), [])


class FigureFlagSource(unittest.TestCase):
    """The corpus figure flag (corpus_load.IMAGE): prose about a graph or an image is not a figure."""

    def flagged(self, text, choices=("1", "2", "3", "4")):
        return record_from_question(q(1, mc(text, choices)), V1).meta["status"] == "figure"

    def test_prose_mentions_are_not_figures(self):
        for text in ("For the linear function f, the graph of y = f(x) in the xy-plane passes through (0, 2).",
                     "What is the y-intercept of the graph of 3x + 2y = 96 in the xy-plane?",
                     "In the xy-plane, the graph of the given equation is a circle. Which point lies on it?",
                     "If this equation is graphed in the xy-plane, what does the x-intercept of the graph mean?",
                     "Researchers showed participants an unaltered image of a made-up logo. Which choice fits?"):
            self.assertFalse(self.flagged(text), text)

    def test_real_figures_still_flagged(self):
        for text in ("[Graph: two lines crossing at (3, 3).]\nWhich equation defines f?",
                     "[Coordinate graph: a dashed line through (0, 10).]\nWhich inequality is shown?",
                     "The graph of the function f shown estimates the balance. What was the deposit?",
                     "The shaded region represents the solutions. What is r?",
                     "See figure. What is x?", "The scatterplot of made-up data has which slope?",
                     "<img src=x> What is x?"):
            self.assertTrue(self.flagged(text), text)

    def test_graph_in_a_choice_is_a_figure(self):
        self.assertTrue(self.flagged("Which of the following could be the graph of the system?",
                                     ("[Graph: two lines]", "[Graph: one line]", "[Graph: no line]", "[Graph: x]")))

    def test_pattern_is_the_loaders(self):
        self.assertIsNone(IMAGE.search("the graph of y = 2x + 3"))
