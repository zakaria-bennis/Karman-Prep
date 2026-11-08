"""Founder-approved figures of every kind through the real importer, stage, seal and publish
(synthetic rows and a made-up drawing only; no database).

The end-to-end case runs the app's own TypeScript: tests/ts/record-rows.ts (importQuestion()
against a recording client, as ts/stage-rows.ts does) builds the staged rows, and
ts/seal-readback.ts (catalogQuestionPayloadHash) seals the readback. It is skipped when the
repo's node_modules are not installed."""

import copy
import json
import os
import subprocess
import unittest
from pathlib import Path

from kimport import figure_gate as fg, lint, stage
from kimport.keys import is_unkeyable
from kimport.publish import RefuseToBuild, build_publish
from tests import figure_fixtures as ffx
from tests import publish_fixtures as pfx
from tests import stage_fixtures as sfx
from tests.export_fixtures import write_export
from tests.test_publish import payloads
from tests.test_stage import StageCase

REPO = Path(__file__).resolve().parents[3]
RECORD_TS = Path(__file__).resolve().parent / "ts" / "record-rows.ts"
HAS_TSX = (REPO / "node_modules" / ".bin" / "tsx").exists()
SERIF = "STIX Two Text, Times New Roman, serif"
SVG = ('<svg xmlns="http://www.w3.org/2000/svg" data-figure-theme="karman-v1" viewBox="0 0 200 120">'
       '<rect x="10" y="10" width="80" height="60" fill="none" stroke="#f3ecdd"/>'
       '<line x1="10" y1="70" x2="90" y2="10" stroke="#2fa8ff" stroke-width="2"/>'
       f'<text x="20" y="100" font-family="{SERIF}" font-size="14" fill="#f3ecdd">A made-up label</text></svg>')
CHART = {"kind": "scatterplot", "title": None, "show_grid": True,
         "x_axis": {"label": "Made-up x", "min": 0, "max": 10, "tick_step": 2, "categories": None},
         "y_axis": {"label": "Made-up y", "min": 0, "max": 10, "tick_step": 2, "categories": None},
         "series": [{"kind": "scatter", "label": None, "points": [[1, 2], [3, 5], [7, 8]]}],
         "confidence": 1, "extracted_by": "reviewer", "extracted_at": "2026-10-21", "extractor_note": None}


def reviewed_row(n: int, text: str, **figure) -> dict:
    """One reviewed batch row as the reviewed importer reads it (made-up content)."""
    stable = f"2099-01_SYN_V1_RW_{pfx.MODULE}_Q{n:02d}"
    evidence = {**pfx._evidence(n, sfx.BINDING_SHA), "stable_question_id": stable}
    return {
        "stable_question_id": stable, "question_text": text, "domain": "info_ideas",
        "choice_a": f"first {n}", "choice_b": f"second {n}", "choice_c": f"third {n}", "choice_d": f"fourth {n}",
        "correct_answer": "A", "question_format": "multiple_choice", "explanation_text": "Made-up explanation.",
        "source_section": pfx.SECTION, "source_module": pfx.MODULE, "source_question_number": n,
        "source_occurrence": n, "source_page": 10 + n, "source_document_id": "2099-01_SYN_V1",
        "import_status": "needs_review", "import_flag_reason": "Synthetic private draft",
        "reviewed_answer": {"printed_answer": "A", "independently_verified_answer": "A", "evidence": evidence},
        "difficulty_level": 3, "difficulty_rationale": "Made-up rationale.", "difficulty_confidence": 0.9,
        "difficulty_rubric_version": lint.RUBRIC_VERSION, "difficulty_solution_sha256": pfx.hexn(n, 11),
        "difficulty_content_sha256": pfx.hexn(n, 12), "difficulty_uncertain": False, "skill_uncertain": False,
        "difficulty_selectable_for_downstream": True, "skill_selectable_for_downstream": True,
        "source_exam_readiness_withdrawn": False, "source_quality_hold": False, "current_version": True,
        "website_import_ready": True, **figure,
    }


def record_rows(reviewed_file: Path) -> dict:
    done = subprocess.run(["npx", "--no-install", "tsx", str(RECORD_TS), str(reviewed_file), "synthetic_exam.pdf",
                           pfx.SOURCE], cwd=REPO, capture_output=True, text=True, timeout=300)
    if done.returncode != 0:
        raise AssertionError(done.stderr or done.stdout)
    return json.loads(done.stdout)


@unittest.skipUnless(HAS_TSX, "node_modules not installed")
class EndToEndFigures(StageCase):
    """reviewed row -> importQuestion() payload -> stage.sql -> readback -> real seal -> publish.sql."""

    def stage_figures(self, rows):
        reviewed = self.batch / "syn-1-reviewed-import-ready.json"
        reviewed.write_text(json.dumps({"questions": rows}), encoding="utf-8")
        for r in rows:
            ffx.approve_like(fg.figures_dir_for_batch(self.batch), r["stable_question_id"], r)
        rows_doc = record_rows(reviewed)
        res = stage.build_stage(self.batch, self.export([]), self.d / "x.pdf", rows_doc=rows_doc)
        stage._write_all(self.out, res["files"])
        return rows_doc, res

    def test_svg_chart_and_geometry_rows_stage_seal_and_publish(self):
        rows = [reviewed_row(1, "Which made-up label appears in the drawing?", figure_kind="image",
                             figure_svg=SVG, image_alt="A made-up rectangle with one diagonal."),
                reviewed_row(2, "Which made-up point lies highest on the scatterplot?", figure_kind="chart",
                             figure_chart_data=CHART)]
        rows_doc, res = self.stage_figures(rows)
        self.assertTrue(res["precheck"]["passed"], res["precheck"]["refused"])
        svg_q, chart_q = (r["question"] for r in rows_doc["rows"])
        # the importer's payload carries exactly the approved figure fields
        self.assertEqual((svg_q["figure_kind"], svg_q["figure_svg"], svg_q["image_alt"]),
                         ("image", SVG, "A made-up rectangle with one diagonal."))
        self.assertIsNone(svg_q["figure_chart_data"])
        self.assertEqual((chart_q["figure_kind"], chart_q["figure_chart_data"]), ("chart", CHART))
        self.assertIsNone(chart_q["figure_svg"])
        self.assertNotEqual(svg_q["content_hash_v2"], chart_q["content_hash_v2"])
        # figure questions keep a NULL comparison key; dedup for them is the founder's figure review
        self.assertEqual([it["key"] for it in res["staged"]], [None, None])
        stage_sql = (self.out / "stage.sql").read_text()
        blocks = payloads(stage_sql)
        self.assertEqual(blocks[0]["question"]["figure_svg"], SVG)
        self.assertIn("jsonb_populate_record(NULL::public.quiz_questions,v->'question')", stage_sql)

        prev = json.loads((self.out / "stage-preview.json").read_text())
        snaps = [sfx.db_snapshot(p, i) for i, p in enumerate(prev["rows"], 1)]
        raw = self.d / "readback-raw.json"
        raw.write_text(json.dumps({"rows": [{"snapshot": s} for s in snaps]}))
        sealed_path = self.out / "sealed-preview.json"
        res_seal = stage.run_seal(raw, self.batch, sealed_path)  # the real ts/seal-readback.ts
        self.assertEqual(res_seal["rows"], 2)
        seals = {r["source_question_number"]: r["question_payload_sha256"]
                 for r in json.loads(sealed_path.read_text())["rows"]}

        # the seal covers the SVG bytes: one changed byte in the stored SVG gives another seal
        tampered = copy.deepcopy(snaps)
        tampered[0]["question"]["figure_svg"] = SVG.replace("A made-up label", "A made-up labe1")
        alt = self.d / "readback-tampered.json"
        alt.write_text(json.dumps({"rows": [{"snapshot": s} for s in tampered]}))
        other = stage.seal_rows(alt)
        self.assertNotEqual(other[0]["question_payload_sha256"], seals[1])
        self.assertEqual(other[1]["question_payload_sha256"], seals[2])

        readback = self.out / "private-readback.json"
        export = self.d / "export-after.json"
        write_export(export, [pfx.export_row(s) for s in snaps])
        self.assertTrue(all(is_unkeyable(r) for r in json.loads(export.read_text())["rows"]))
        os.utime(export, (readback.stat().st_mtime + 10,) * 2)
        bundle = build_publish(readback, sealed_path, export, self.d / "intents.jsonl", "syn-1")
        self.assertTrue(bundle["precheck"]["passed"])
        items = [p[0] for p in payloads(bundle["publish_sql"]) if isinstance(p, list)]
        by_n = {it["question"]["source_question_number"]: it for it in items}
        # publish.sql compares the whole stored row (figure columns included) and writes the seal
        self.assertEqual(by_n[1]["question"]["figure_svg"], SVG)
        self.assertEqual(by_n[1]["seal"], seals[1])
        self.assertEqual(by_n[2]["question"]["figure_chart_data"], CHART)
        self.assertIn("IF to_jsonb(q) IS DISTINCT FROM v->'question'", bundle["publish_sql"])

        # a readback whose SVG drifted from the approved figure.json is refused at publish
        drift = json.loads(readback.read_text())
        drift["rows"][0]["snapshot"]["question"]["figure_svg"] = tampered[0]["question"]["figure_svg"]
        readback.write_text(json.dumps(drift))
        os.utime(export, (readback.stat().st_mtime + 10,) * 2)
        with self.assertRaisesRegex(RefuseToBuild, "figure_svg"):
            build_publish(readback, sealed_path, export, self.d / "intents.jsonl", "syn-1")

    def test_importer_refuses_an_unsafe_svg_even_when_approved(self):
        bad = SVG.replace("<rect", '<rect onload="alert(1)"')
        rows = [reviewed_row(1, "Which made-up label appears in the drawing?", figure_kind="image",
                             figure_svg=bad, image_alt="A made-up rectangle.")]
        with self.assertRaisesRegex(AssertionError, "figure_svg"):
            self.stage_figures(rows)

    def test_geometry_row_carried(self):
        geo = {"layout_version": "balanced-v1", "kind": "triangle", "notes": None,
               "shapes": [{"kind": "triangle", "label": None, "vertices_or_points": [
                   {"id": "A", "label": "A", "x": 0, "y": 0}, {"id": "B", "label": "B", "x": 4, "y": 0},
                   {"id": "C", "label": "C", "x": 0, "y": 3}]}],
               "angle_markings": [], "length_markings": []}
        rows = [reviewed_row(3, "In the made-up triangle, which side is longest?", figure_kind="geometric",
                             figure_geometry_data=geo)]
        rows_doc, res = self.stage_figures(rows)
        self.assertTrue(res["precheck"]["passed"], res["precheck"]["refused"])
        self.assertEqual(rows_doc["rows"][0]["question"]["figure_geometry_data"], geo)


class LintFigureKinds(unittest.TestCase):
    def test_every_rendered_kind_needs_its_column(self):
        for kind, field in lint.FIGURE_DATA.items():
            self.assertEqual(lint._check_figure({"figure_kind": kind, field: {"x": 1}}), [], kind)
            self.assertIn(field, lint._check_figure({"figure_kind": kind})[0])
        self.assertIn("is not null or one of", lint._check_figure({"figure_kind": "graph"})[0])


if __name__ == "__main__":
    unittest.main()
