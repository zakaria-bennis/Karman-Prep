import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from kimport import lint
from kimport.normalize import NORMALIZER_VERSION

TAG_HASH = "a" * 64


def make_row(n=1):
    sid = f"SYN_TEST_Q{n:02d}"
    return {
        "stable_question_id": sid,
        "question_text": f"Synthetic stem number {n} about nothing real.",
        "choice_a": "one", "choice_b": "two", "choice_c": "three", "choice_d": "four",
        "correct_answer": "A",
        "figure_kind": None,
        "figure_table_data": None,
        "difficulty_level": 3,
        "difficulty_rationale": "Synthetic rationale.",
        "difficulty_rubric_version": "karman-legacy-1-7-v1",
        "difficulty_uncertain": False,
        "difficulty_content_sha256": "c" * 64,
        "source_version": {"content_sha256": "b" * 64, "student_content_sha256": "c" * 64},
        "reviewed_answer": {
            "kind": "official", "printed_answer": "A", "independently_verified_answer": "A",
            "evidence": {"approved_tags": {"tag_binding_manifest_sha256": TAG_HASH}},
        },
    }


def pin_for(row):
    return {
        "stable_question_id": row["stable_question_id"],
        "row_sha256": lint.row_sha256(row),
        "content_sha256": row["source_version"]["content_sha256"],
        "student_content_sha256": row["source_version"]["student_content_sha256"],
    }


def clusters_for(rows, role="canonical", version=NORMALIZER_VERSION):
    return {"normalizer_version": version, "export_sha256": "d" * 64,
            "roles": {r["stable_question_id"]: role for r in rows}, "clusters": []}


class LintTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())

    def run_lint(self, rows, frozen=True, clusters=None, pins=None):
        rp = self.tmp / "b-reviewed-import-ready.json"
        rp.write_text(json.dumps({"import_policy": "reviewed-difficulty", "questions": rows}))
        fp = None
        if frozen:
            fp = self.tmp / "b-frozen.json"
            fp.write_text(json.dumps({"schema_version": 1, "reviewed_json_sha256": "e" * 64,
                                      "source_pdf_sha256": "f" * 64,
                                      "rows": pins if pins is not None else [pin_for(r) for r in rows]}))
        cp = self.tmp / "clusters.json"
        cp.write_text(json.dumps(clusters if clusters is not None else clusters_for(rows)))
        return lint.lint_batch(rp, fp, cp)

    def codes(self, res):
        return sorted({p["code"] for p in res["pulled"]})

    def test_clean_row_passes(self):
        row = make_row()
        res = self.run_lint([row])
        self.assertEqual(res["passed"], [row["stable_question_id"]])
        self.assertEqual(res["pulled"], [])

    def test_clean_table_row_passes(self):
        row = make_row()
        row["figure_kind"] = "table"
        row["figure_table_data"] = [["a", "b"], ["1", "2"]]
        row["question_text"] = "The table shows synthetic data."
        self.assertEqual(self.run_lint([row])["pulled"], [])

    def test_pf_figure_unknown_kind(self):
        row = make_row(); row["figure_kind"] = "image"
        self.assertEqual(self.codes(self.run_lint([row])), ["PF_FIGURE"])

    def test_pf_figure_table_without_data(self):
        row = make_row(); row["figure_kind"] = "table"
        self.assertEqual(self.codes(self.run_lint([row])), ["PF_FIGURE"])

    def test_pf_figure_table_with_empty_data(self):
        row = make_row(); row["figure_kind"] = "table"; row["figure_table_data"] = []
        self.assertEqual(self.codes(self.run_lint([row])), ["PF_FIGURE"])

    def figure_codes(self, text, **extra):
        row = make_row(); row["question_text"] = text; row.update(extra)
        return self.codes(self.run_lint([row]))

    def test_visual_references_are_pulled(self):
        for text in ("Consider the graph shown. What is x?", "What is x in the figure?",
                     "Look at the scatterplot of synthetic data.", "Which graph has slope 2?",
                     "The table summarizes synthetic data.",
                     "A bar graph is used here.", "The Chart below lists items."):
            with self.subTest(text=text):
                self.assertEqual(self.figure_codes(text), ["PF_FIGURE"])

    def test_non_visual_uses_are_not_pulled(self):
        for text in ("What is the graph of y = 2x at x = 1?", "Studies have shown that x grows.",
                     "A book sits on a table.", "The Argand diagram is a tool.",
                     "A well known figure in history.", "It is shown that x is 2.",
                     "The values are shown to be equal.", "The data set shown has mean 3."):  # pinned: "data set shown" is not matched
            with self.subTest(text=text):
                self.assertEqual(self.figure_codes(text), [])

    def test_which_table_with_choice_tables_is_fine(self):
        self.assertEqual(self.figure_codes("Which table shows y = 2x?", choice_tables=[[["x"]]]), [])

    def test_table_data_counts_as_asset(self):
        self.assertEqual(self.figure_codes("In the figure, x is 2.", figure_table_data=[["a"]]), [])

    def test_visual_word_inside_underline_markup_still_counts(self):
        self.assertEqual(self.figure_codes("In the <u>figure</u>, x is 2."), ["PF_FIGURE"])

    def test_asset_field_counts_as_reviewed_asset(self):
        row = make_row(); row["question_text"] = "In the diagram, what is x?"
        row["figure_asset_path"] = "synthetic.png"
        self.assertEqual(self.run_lint([row])["pulled"], [])

    def test_pf_envelope_missing_tags(self):
        row = make_row(); del row["reviewed_answer"]["evidence"]["approved_tags"]
        self.assertEqual(self.codes(self.run_lint([row], frozen=False)), ["PF_ENVELOPE"])

    def test_pf_envelope_tags_also_at_top_level(self):
        row = make_row(); row["reviewed_answer"]["approved_tags"] = {"x": 1}
        self.assertEqual(self.codes(self.run_lint([row])), ["PF_ENVELOPE"])

    def test_pf_envelope_generated_kind_nested_evidence_ok(self):
        row = make_row(); row["reviewed_answer"]["kind"] = "independently_confirmed_generated"
        self.assertEqual(self.run_lint([row])["pulled"], [])

    def test_pf_envelope_evidence_not_object(self):
        row = make_row(); row["reviewed_answer"]["evidence"] = None
        self.assertEqual(self.codes(self.run_lint([row], frozen=False)), ["PF_ENVELOPE"])

    def test_pf_binding_row_hash_mismatch(self):
        row = make_row(); pins = [pin_for(row)]
        row["question_text"] += " edited"
        self.assertEqual(self.codes(self.run_lint([row], pins=pins)), ["PF_BINDING"])

    def test_pf_binding_content_hash_mismatch(self):
        row = make_row(); pin = pin_for(row); pin["content_sha256"] = "0" * 64
        self.assertEqual(self.codes(self.run_lint([row], pins=[pin])), ["PF_BINDING"])

    def test_pf_binding_not_in_manifest(self):
        row = make_row()
        self.assertEqual(self.codes(self.run_lint([row], pins=[])), ["PF_BINDING"])

    def test_pf_binding_difficulty_hash_differs(self):
        row = make_row(); row["difficulty_content_sha256"] = "9" * 64
        pins = [pin_for(row)]
        self.assertEqual(self.codes(self.run_lint([row], pins=pins)), ["PF_BINDING"])

    def test_pf_binding_duplicate_ids_both_pulled(self):
        a, b = make_row(), make_row()
        res = self.run_lint([a, b])
        self.assertEqual(self.codes(res), ["PF_BINDING"])
        self.assertEqual(len(res["pulled"]), 2)

    def test_duplicate_ids_pulled_even_without_frozen(self):
        res = self.run_lint([make_row(), make_row()], frozen=False)
        self.assertEqual(self.codes(res), ["PF_BINDING"])
        self.assertEqual(len(res["pulled"]), 2)

    def test_malformed_frozen_manifest_is_a_clear_error(self):
        row = make_row()
        rp = self.tmp / "r.json"; rp.write_text(json.dumps({"questions": [row]}))
        cp = self.tmp / "c.json"; cp.write_text(json.dumps(clusters_for([row])))
        fp = self.tmp / "f.json"
        for body in ({}, {"rows": [{"row_sha256": "x"}]}, {"rows": "no"}):
            fp.write_text(json.dumps(body))
            with self.subTest(body=body), self.assertRaisesRegex(lint.LintError, "frozen manifest"):
                lint.lint_batch(rp, fp, cp)

    def test_pf_binding_tag_hash_must_be_inside_approved_tags(self):
        row = make_row(); ev = row["reviewed_answer"]["evidence"]
        ev["tag_binding_manifest_sha256"] = TAG_HASH
        del ev["approved_tags"]["tag_binding_manifest_sha256"]
        self.assertEqual(self.codes(self.run_lint([row])), ["PF_BINDING"])

    def test_pf_binding_missing_tag_binding_hash(self):
        row = make_row(); del row["reviewed_answer"]["evidence"]["approved_tags"]["tag_binding_manifest_sha256"]
        self.assertEqual(self.codes(self.run_lint([row])), ["PF_BINDING"])

    def test_binding_skipped_without_frozen(self):
        row = make_row(); del row["reviewed_answer"]["evidence"]["approved_tags"]["tag_binding_manifest_sha256"]
        self.assertEqual(self.run_lint([row], frozen=False)["pulled"], [])

    def test_pf_difficulty_variants(self):
        for field, value in (("difficulty_level", 8), ("difficulty_level", 0), ("difficulty_level", "3"),
                             ("difficulty_level", True), ("difficulty_level", 3.5),
                             ("difficulty_rubric_version", "other"),
                             ("difficulty_uncertain", True), ("difficulty_rationale", "  ")):
            row = make_row(); row[field] = value
            with self.subTest(field=field, value=value):
                self.assertEqual(self.codes(self.run_lint([row], frozen=False)), ["PF_DIFFICULTY"])

    def test_pf_dedup_stale_variants(self):
        row = make_row()
        cases = {
            "missing": {**clusters_for([row]), "roles": {}},
            "member": clusters_for([row], role="member"),
        }
        for name, cl in cases.items():
            with self.subTest(name):
                self.assertEqual(self.codes(self.run_lint([row], clusters=cl)), ["PF_DEDUP_STALE"])

    def test_stale_normalizer_refuses_whole_run(self):
        row = make_row()
        with self.assertRaisesRegex(ValueError, "rebuild clusters"):
            self.run_lint([row], clusters=clusters_for([row], version="kn-0"))

    def test_missing_questions_key_and_missing_id_are_clear_errors(self):
        rp = self.tmp / "bad.json"; cp = self.tmp / "c.json"; cp.write_text(json.dumps(clusters_for([])))
        rp.write_text("{}")
        with self.assertRaisesRegex(lint.LintError, "questions"):
            lint.lint_batch(rp, None, cp)
        rp.write_text(json.dumps({"questions": [{"question_text": "x"}]}))
        with self.assertRaisesRegex(lint.LintError, "stable_question_id"):
            lint.lint_batch(rp, None, cp)

    def test_pulled_rows_dont_block_others(self):
        rows = [make_row(1), make_row(2), make_row(3)]
        rows[1]["difficulty_level"] = 9
        res = self.run_lint(rows)
        self.assertEqual(res["passed"], ["SYN_TEST_Q01", "SYN_TEST_Q03"])
        self.assertEqual([p["id"] for p in res["pulled"]], ["SYN_TEST_Q02"])

    def test_row_with_two_problems_listed_once_per_code_not_passed(self):
        row = make_row(); row["difficulty_level"] = 9; row["figure_kind"] = "image"
        res = self.run_lint([row])
        self.assertEqual(self.codes(res), ["PF_DIFFICULTY", "PF_FIGURE"])
        self.assertEqual(res["passed"], [])

    def test_row_sha256_matches_js_canonical_json(self):
        # canonicalJson: sorted keys, no spaces, integral floats print as ints, non-ASCII kept
        row = {"b": 1.0, "a": ["é", None, True], "c": {"z": 1, "y": "q\"x"}}
        expected = '{"a":["é",null,true],"b":1,"c":{"y":"q\\"x","z":1}}'
        self.assertEqual(lint.canonical_json(row), expected)
        self.assertEqual(lint.row_sha256(row), hashlib.sha256(expected.encode()).hexdigest())

    def test_lane_written_and_not_removed(self):
        lane = self.tmp / "lane.json"
        lane.write_text(json.dumps({"items": {"OLD": {"reason": "variant_review", "status": "open",
                                                      "detail": "x", "since": "t0", "attempts": []}}}))
        rows = [make_row(1), make_row(2), make_row(3)]
        rows[0]["figure_kind"] = "image"            # extraction_repair
        rows[1]["difficulty_uncertain"] = True      # classification_review
        cl = clusters_for(rows); cl["roles"]["SYN_TEST_Q03"] = "member"  # variant_review
        res = self.run_lint(rows, clusters=cl)
        lint.write_lane(lane, res["pulled"], "2026-10-20T10:00:00Z")
        items = json.loads(lane.read_text())["items"]
        self.assertIn("OLD", items)
        self.assertEqual(items["SYN_TEST_Q01"]["reason"], "extraction_repair")
        self.assertEqual(items["SYN_TEST_Q02"]["reason"], "classification_review")
        self.assertEqual(items["SYN_TEST_Q03"]["reason"], "variant_review")
        self.assertEqual(items["SYN_TEST_Q01"]["status"], "open")
        self.assertEqual(items["SYN_TEST_Q01"]["since"], "2026-10-20T10:00:00Z")
        self.assertEqual(items["SYN_TEST_Q01"]["attempts"], [])
        self.assertIn("PF_FIGURE", items["SYN_TEST_Q01"]["detail"])
        self.assertEqual(list(self.tmp.glob("lane.json.tmp*")), [])

    def test_lane_rerun_keeps_since_and_attempts(self):
        lane = self.tmp / "lane.json"
        pulled = [{"id": "X", "code": "PF_FIGURE", "detail": "d1"}]
        lint.write_lane(lane, pulled, "t1")
        data = json.loads(lane.read_text()); data["items"]["X"]["attempts"].append({"n": 1})
        lane.write_text(json.dumps(data))
        lint.write_lane(lane, [{"id": "X", "code": "PF_FIGURE", "detail": "d2"}], "t2")
        item = json.loads(lane.read_text())["items"]["X"]
        self.assertEqual((item["since"], item["detail"], len(item["attempts"])), ("t1", "PF_FIGURE: d2", 1))

    def test_lane_reopens_closed_item_with_attempt_and_keeps_other_fields(self):
        lane = self.tmp / "lane.json"
        lane.write_text(json.dumps({"items": {"X": {"reason": "variant_review", "status": "resolved",
                                                    "detail": "old", "since": "t0", "attempts": [{"n": 1}],
                                                    "note": "keep"}}}))
        lint.write_lane(lane, [{"id": "X", "code": "PF_FIGURE", "detail": "d"}], "t1")
        item = json.loads(lane.read_text())["items"]["X"]
        self.assertEqual((item["status"], item["reason"], item["since"], item["note"]),
                         ("open", "extraction_repair", "t0", "keep"))
        self.assertEqual(item["attempts"][0], {"n": 1})
        self.assertEqual(item["attempts"][1], {"method": "lint", "ok": False, "at": "t1",
                                               "detail": "PF_FIGURE: d"})

    def test_lane_corrupt_file_refuses(self):
        lane = self.tmp / "lane.json"; lane.write_text("{nope")
        with self.assertRaises(ValueError):
            lint.write_lane(lane, [{"id": "X", "code": "PF_FIGURE", "detail": "d"}], "t")



REAL = Path("/Users/zakariabennis/Documents/Codex/2026-10-11/task-3")


class RealFileTests(unittest.TestCase):
    """Reads a real workspace file at runtime; skipped when it is not there (ruling R2)."""

    @unittest.skipUnless((REAL / "asia23decv2-reviewed-import-ready.json").exists(), "workspace file missing")
    def test_row_hashes_match_real_frozen_manifest(self):
        rows = json.loads((REAL / "asia23decv2-reviewed-import-ready.json").read_text())["questions"]
        pins = json.loads((REAL / "asia23decv2-frozen-inputs-import-ready.json").read_text())["rows"]
        self.assertEqual([lint.row_sha256(r) for r in rows], [p["row_sha256"] for p in pins])
        tmp = Path(tempfile.mkdtemp())
        cl = tmp / "c.json"
        cl.write_text(json.dumps(clusters_for(rows)))
        res = lint.lint_batch(REAL / "asia23decv2-reviewed-import-ready.json",
                              REAL / "asia23decv2-frozen-inputs-import-ready.json", cl)
        self.assertEqual([p for p in res["pulled"] if p["code"] in ("PF_BINDING", "PF_ENVELOPE", "PF_DIFFICULTY")], [])

    @unittest.skipUnless(list(REAL.glob("*-reviewed-import-ready.json")), "workspace files missing")
    def test_real_data_has_no_figure_pulls(self):
        tmp = Path(tempfile.mkdtemp())
        pulled = 0
        for rp in REAL.glob("*-reviewed-import-ready.json"):
            rows = json.loads(rp.read_text())["questions"]
            cl = tmp / "c.json"; cl.write_text(json.dumps(clusters_for(rows)))
            pulled += sum(p["code"] == "PF_FIGURE" for p in lint.lint_batch(rp, None, cl)["pulled"])
        self.assertEqual(pulled, 0)


class LintCliTests(unittest.TestCase):
    def test_cli_pulls_and_writes_lane(self):
        import subprocess, sys
        tmp = Path(tempfile.mkdtemp())
        rows = [make_row(1), make_row(2)]
        rows[1]["difficulty_level"] = 9
        (tmp / "r.json").write_text(json.dumps({"questions": rows}))
        (tmp / "c.json").write_text(json.dumps(clusters_for(rows)))
        cli = Path(__file__).resolve().parent.parent / "kimport-cli.py"
        r = subprocess.run([sys.executable, "-I", str(cli), "lint", "--reviewed", str(tmp / "r.json"),
                            "--clusters", str(tmp / "c.json"), "--lane", str(tmp / "lane.json"),
                            "--now", "2026-10-20T00:00:00Z"], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("1 passed, 1 rows pulled", r.stdout)
        self.assertEqual(json.loads((tmp / "lane.json").read_text())["items"]["SYN_TEST_Q02"]["reason"],
                         "classification_review")


if __name__ == "__main__":
    unittest.main()


class ApprovedFigureRoleTest(unittest.TestCase):
    def test_figure_review_copy_with_approved_figure_passes_dedup(self):
        from kimport.lint import _check_dedup
        clusters = {"roles": {"syn-q1": "figure_review", "syn-q2": "figure_review"}}
        self.assertEqual(_check_dedup({"stable_question_id": "syn-q1"}, clusters, frozenset({"syn-q1"})), [])
        self.assertTrue(_check_dedup({"stable_question_id": "syn-q2"}, clusters, frozenset({"syn-q1"})))

    def test_member_with_approved_figure_still_pulled(self):
        from kimport.lint import _check_dedup
        clusters = {"roles": {"syn-q3": "member"}}
        self.assertTrue(_check_dedup({"stable_question_id": "syn-q3"}, clusters, frozenset({"syn-q3"})))
