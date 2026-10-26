"""Live-question QA audit: static checks and the full export (synthetic rows only)."""

import json
import re
import tempfile
import unittest
from pathlib import Path

from kimport import qa_export, qa_static

UUID = "00000000-0000-4000-8000-{:012d}"


def mc(n=1, stem="Which choice best describes the harbor?", choices=None, key="B", **extra):
    choices = choices if choices is not None else ["A calm bay.", "A busy dock.", "A dry lake.", "A tall hill."]
    row = {"id": UUID.format(n), "is_live": True, "subject": "reading", "answer_format": "multiple_choice",
           "question_text": stem, "correct_answer": key, "passage": None, "passage_a": None, "passage_b": None,
           "passage_intro": None, "image_url": None, "figure_kind": None,
           "answer_key_entries": [{"id": "k", "raw_model_response": {}}],
           "answer_choices": [{"letter": "ABCD"[i], "choice_text": t, "choice_table_data": None}
                              for i, t in enumerate(choices)]}
    row.update(extra)
    return row


def run(row, figure=None, choice_tables=0, ts_checks=None):
    ts = {row["id"]: {"checks": ts_checks or {}, "figure": figure, "choice_tables": choice_tables, "delivery": "served"}}
    return qa_static.audit_rows([row], ts, None)[row["id"]]["checks"]


class StructureTest(unittest.TestCase):
    def test_clean_row_has_no_findings(self):
        self.assertEqual(run(mc(passage="The harbor was quiet at dawn.")), {})

    def test_choice_count_letters_empty_and_key(self):
        f = run(mc(choices=["one", "two", "three"], key="E"))
        self.assertIn("mc_choice_count", f)
        self.assertIn("mc_key_not_letter", f)
        f = run(mc(choices=["one", "", "three", "four"]))
        self.assertIn("choice_empty", f)

    def test_identical_choices_ignore_spacing_but_not_punctuation(self):
        self.assertIn("choices_identical", run(mc(choices=["a  dock", "a dock", "c", "d"])))
        self.assertNotIn("choices_identical", run(mc(choices=["dock", "dock,", "dock;", "dock:"])))

    def test_table_choice_counts_as_content(self):
        row = mc(choices=["", "b", "c", "d"])
        row["answer_choices"][0]["choice_table_data"] = {"rows": [["1"]]}
        self.assertNotIn("choice_empty", run(row))

    def test_numeric_rows_skip_choice_checks(self):
        row = mc(answer_format="numeric_entry", correct_answer="12", choices=[])
        self.assertEqual(run(row), {})
        self.assertIn("numeric_has_choices", run(mc(answer_format="numeric_entry", correct_answer="3")))


class FormattingTest(unittest.TestCase):
    def test_markdown_and_figure_descriptions(self):
        f = run(mc(stem="The novel *Quiet Harbor* won. [Table: Columns: x | y.]\n| a | b |\n|---|---|\nWhich choice?"))
        for c in ("markdown_as_text", "figure_description_as_text", "markdown_table"):
            self.assertIn(c, f)

    def test_headers_page_numbers_and_question_numbers(self):
        f = run(mc(stem="Section 1, Module 2\nMark for Review\nWhich choice?"))
        self.assertEqual(len(f["header_footer_line"]), 2)
        self.assertIn("header_footer_line", run(mc(passage="A quiet harbor.\n\n7\n", stem="Which choice?")))
        self.assertIn("leading_question_number", run(mc(stem="12. Which choice best fits?")))

    def test_one_line_choices_are_not_page_numbers_or_footers(self):
        self.assertNotIn("header_footer_line", run(mc(choices=["153", "977", "55", "103"])))
        self.assertNotIn("header_footer_line", run(mc(choices=["continue", "has continued", "continues", "to continue"])))
        # a line that comes in addition to the choice is still caught
        self.assertIn("header_footer_line", run(mc(choices=["imposing\n12", "b", "c", "d"])))
        self.assertIn("header_footer_line", run(mc(choices=["a calm bay\nCONTINUE", "b", "c", "d"])))

    def test_text_is_judged_as_displayed(self):
        # qa-check.ts returns each field as main's MathText displays it; the Python checks read that.
        row = mc(stem="The harbor --- quiet at dawn --- woke. Which choice?")
        self.assertIn("ascii_dash", run(row))
        ts = {row["id"]: {"checks": {}, "figure": None, "choice_tables": 0, "delivery": "served",
                          "display": {"question_text": "The harbor—quiet at dawn—woke. Which choice?"}}}
        self.assertNotIn("ascii_dash", qa_static.audit_rows([row], ts, None)[row["id"]]["checks"])

    def test_encoding_problems_and_dashes(self):
        self.assertIn("replacement_char", run(mc(stem="The harbor � was quiet. Which?")))
        self.assertIn("mojibake", run(mc(stem="The PuertorriqueÃo museum. Which?")))
        self.assertIn("ascii_dash", run(mc(stem="The harbor --- quiet at dawn --- woke. Which?")))
        self.assertNotIn("ascii_dash", run(mc(stem="What is 3 --- 2?", subject="math")))
        self.assertIn("triple_newline", run(mc(stem="A harbor.\n\n\nWhich choice?")))

    def test_unbalanced_braces_in_math(self):
        self.assertIn("braces_unbalanced", run(mc(stem="What is $\\frac{1}{2$? ", subject="math")))
        self.assertNotIn("braces_unbalanced", run(mc(stem="What is $\\frac{1}{2}$?", subject="math")))


class CompletenessTest(unittest.TestCase):
    def test_truncated_passage_and_stem(self):
        f = run(mc(passage="The harbor was quiet until the", stem="Which choice best describes the"))
        self.assertIn("passage_truncated", f)
        self.assertIn("stem_truncated", f)
        self.assertEqual(run(mc(passage="It ended (as planned).", stem="What is x? (1 foot = 12 inches)")), {})

    def test_roman_numeral_list_ends_a_stem(self):
        self.assertNotIn("stem_truncated", run(mc(stem="Which must be true?\nI. a > 0\nII. b < 0", subject="math")))

    def test_figures_the_text_describes_need_no_drawing(self):
        for stem in ("A figure has an area of 4,608 square inches. What is the area, in square feet, of this figure?",
                     "In an application, the area of a figure on the screen increases. Which statement interprets "
                     "the area of the figure?",
                     "If f is graphed in the xy-plane, where y = f(x), what is the best interpretation of the point "
                     "(1, 495.95) on the graph?"):
            self.assertNotIn("figure_referenced_missing", run(mc(stem=stem, subject="math")), stem)
        choices = ["7 seconds after the area of the figure begins increasing", "b", "c", "d"]
        self.assertNotIn("figure_referenced_missing", run(mc(
            stem="The area of a figure on the screen increases. Which statement is best?", choices=choices)))
        self.assertIn("figure_referenced_missing", run(mc(stem="Which statement is best?", choices=choices)))
        for stem in ("A figure shows a triangle. What is the area of this figure?",
                     "If f is graphed in the xy-plane, which point is on the graph shown?",
                     "What is the area of the figure?", "Which point lies on the graph?"):
            self.assertIn("figure_referenced_missing", run(mc(stem=stem, subject="math")), stem)

    def test_figure_reference_without_a_figure(self):
        row = mc(stem="Which choice uses data from the table?")
        self.assertIn("figure_referenced_missing", run(row))
        self.assertNotIn("figure_referenced_missing", run(row, figure="table"))
        self.assertNotIn("figure_referenced_missing", run(mc(stem="The cup sat on the table. Which choice?")))


class TallyTest(unittest.TestCase):
    def test_levels_and_failing_ids(self):
        rows = [mc(1), mc(2, stem=""), mc(3, passage="It ended in the")]
        ts = {r["id"]: {"checks": {}, "figure": None, "choice_tables": 0, "delivery": "served"} for r in rows}
        ts[rows[0]["id"]]["checks"] = {"katex_error": ["question_text: \\frac{"]}
        t = qa_static.tally(qa_static.audit_rows(rows, ts, None))
        self.assertEqual(t["failing_ids"], [rows[0]["id"], rows[1]["id"]])
        self.assertEqual(t["review_only_ids"], [rows[2]["id"]])
        self.assertEqual(t["checks"]["katex_error"]["level"], "fail")

    def test_unreachable_image(self):
        row = mc(image_url="https://example.invalid/a.png", figure_kind="image")
        ts = {row["id"]: {"checks": {}, "figure": "image_url", "choice_tables": 0, "delivery": "served"}}
        per = qa_static.audit_rows([row], ts, {"https://example.invalid/a.png": "HTTP 404"})
        self.assertIn("image_unreachable", per[row["id"]]["checks"])

    def test_summary_lists_counts_and_ids(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d)
            report = {"export": "x.json", "exported_at": "2099-01-01", "totals": {"live_audited": 2, "failing": 1, "review_only": 0},
                      "checks": {"stem_empty": {"level": "fail", "count": 1, "ids": [UUID.format(1)]}},
                      "failing_ids": [UUID.format(1)], "review_only_ids": [], "delivery": {"served": 2}, "questions": {}}
            (out / "static-report.json").write_text(json.dumps(report))
            (out / "render-report.json").write_text(json.dumps({
                "totals": {"expected": 2, "rendered": 2, "render_failed": 0},
                "checks": {"page_overflow": {"count": 1, "ids": [UUID.format(2)]}},
                "questions": {UUID.format(2): {"failures": {"page_overflow": ["phone: wide"]}}}}))
            text = qa_static.write_summary(out)
            self.assertIn("Live questions audited: **2**", text)
            self.assertIn("at least one check (static fail level or any render check): **2**", text)
            self.assertIn("| page_overflow | 1 |", text)


class FakeRest:
    """Answers the export's GET queries from a list of rows."""

    def __init__(self, rows):
        self.rows, self.calls = rows, []

    def __call__(self, query):
        self.calls.append(query)
        after = re.search(r"id=gt\.([0-9a-f-]+)", query).group(1)
        limit = int(re.search(r"limit=(\d+)", query).group(1))
        got = [dict(r) for r in self.rows if r["id"] > after][:limit]
        if query.startswith("quiz_questions?select=id,content_hash_v2,publish_status"):
            return [{k: r[k] for k in ("id", "content_hash_v2", "publish_status")} for r in got]
        return got


class ExportTest(unittest.TestCase):
    def rows(self):
        return [{"id": UUID.format(i), "content_hash_v2": f"h{i}", "publish_status": "publish_ready", "is_live": True,
                 "grader_votes": {"x": 1}, "answer_choices": [], "answer_key_entries": [{"id": "k", "raw_model_response": {}, "created_at": "t"}]}
                for i in range(1, 8)]

    def test_queries_are_live_only_gets(self):
        q = qa_export.rest_page_query(UUID.format(0), 50)
        self.assertIn("is_live=eq.true", q)
        self.assertIn("answer_key_entries(id,raw_model_response,created_at)", q)
        with self.assertRaises(ValueError):
            qa_export.rest_page_query("1;drop", 5)

    def test_export_assembles_all_pages_and_slims_rows(self):
        db = FakeRest(self.rows())
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "live-full.json"
            res = qa_export.run_qa_export(out, Path(d) / "unused.env", get=db, page=3, sleep=lambda s: None, log=lambda m: None)
            self.assertEqual(res["rows"], 7)
            doc = json.loads(out.read_text())
            self.assertEqual([r["id"] for r in doc["rows"]], [UUID.format(i) for i in range(1, 8)])
            self.assertNotIn("grader_votes", doc["rows"][0])
            self.assertEqual(doc["rows"][0]["answer_key_entries"], [{"id": "k", "raw_model_response": {}}])

    def test_bank_changing_mid_export_is_refused(self):
        db = FakeRest(self.rows())
        real = db.__call__

        def changing(query):
            if "select=*" in query:
                db.rows[0]["publish_status"] = "needs_human_review" if db.rows[0]["publish_status"] == "publish_ready" else "publish_ready"
            return real(query)
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(qa_export.ExportFailed):
                qa_export.run_qa_export(Path(d) / "x.json", Path(d) / "e", get=changing, page=50, sleep=lambda s: None, log=lambda m: None)

    def test_read_env(self):
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / ".env"
            f.write_text("# c\nNEXT_PUBLIC_SUPABASE_URL=https://x.test\nSUPABASE_SERVICE_ROLE_KEY='k'\n")
            self.assertEqual(qa_export.read_env(f)["SUPABASE_SERVICE_ROLE_KEY"], "k")


if __name__ == "__main__":
    unittest.main()


class FormattingNoteTests(unittest.TestCase):
    def test_notes_describing_underlines_or_answer_boxes_fail(self):
        from kimport import qa_static as qs
        for text in ["The poet writes [The word \u201crecall\u201d is underlined.] here.",
                     "[Underlined sentence:] The tide rose.", "Enter your answer. [Free-response answer box.]",
                     "[The phrase 'hew out' is underlined in the passage.]"]:
            self.assertTrue(qs._FIG_DESC.search(text), text)
        for text in ["[a British newspaper] reported", "[The] committee", "[that is]"]:
            self.assertFalse(qs._FIG_DESC.search(text), text)

    def test_three_digit_leading_number_fails(self):
        from kimport import qa_static as qs
        self.assertTrue(qs._LEADING_NUMBER.match("211. Which choice best describes"))
        self.assertFalse(qs._LEADING_NUMBER.match("2110 people live there."))

