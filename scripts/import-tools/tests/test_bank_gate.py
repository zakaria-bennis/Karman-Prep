"""The gaps the second audit of 2026-10-26 found (pipeline/audit-20261026b): a row that is the
same question as a live row (kimport.qa_dupes with the founder's spelling rule, kimport.bank_gate
in stage, QA corrections, publish and lint), a generated key against a printed-key twin
(kimport.qa_keys), and the wider plain-text math rule. Synthetic rows only."""

import json
import tempfile
import unittest
from pathlib import Path

from kimport import bank_gate, lint, publish, qa_dupes as qd, qa_keys, qa_static, stage
from kimport.answer_evidence import GENERATED
from kimport.keys import comparison_key
from kimport.sweep import record_from_row
from tests import stage_fixtures as fx
from tests.export_fixtures import write_export
from tests.test_lint import clusters_for, make_row
from tests.test_qa_bank_checks import checks, math_row, real
from tests.test_qa_static import UUID, mc

QUOTES = ["“The train engines of this valley have a whistle.”", "“I sang, with a strange quiver in my voice.”",
          "“The young trees had not outgrown their boxes then.”", "“And when the wind is from the South, soil falls.”"]
STEM = "Toomer uses language to connect the urban and the rural South, writing ______\n\nWhich quotation from Cane most effectively illustrates the claim?"


def live(n, stem=STEM, choices=QUOTES, key="D", **extra):
    return mc(n, stem=stem, choices=list(choices), key=key, **{"publish_status": "publish_ready", "archived_at": None, **extra})


def generated(row):
    row["answer_key_entries"] = [{"raw_model_response": {"kind": GENERATED, "evidence": {}}}]
    row["answer_key_status"] = "missing_answer_key"
    return row


class FounderSpellingRuleTest(unittest.TestCase):
    def same(self, a, b):
        return qd.near(qd.Info(a), qd.Info(b))

    def test_spelling_and_suffix_variants_are_the_same_question(self):
        a = live(1)
        self.assertTrue(self.same(a, live(2, stem=STEM.replace("illustrates", "illustrate"))))
        self.assertTrue(self.same(live(3, stem="Chloé wrote ______. Which choice?"), live(4, stem="Chloe wrote ______. Which choice?")))
        # choices in another order, a "Notes:" heading dropped, the question before the notes, a bullet style
        notes = "Notes:\n- Ballard was a composer.\n- He used a log drum.\nWhich choice uses the notes?"
        moved = "Which choice uses the notes?\n• Ballard was a composer.\n• He used a log drum."
        self.assertTrue(self.same(live(5, stem=notes), live(6, stem=moved, choices=QUOTES[::-1], key="A")))
        # up to three words in all, over the text and the choices
        b = live(7, stem=STEM.replace("illustrates", "illustrate").replace("connect", "connects"),
                 choices=[QUOTES[0].replace("engines", "engine")] + QUOTES[1:])
        self.assertTrue(self.same(a, b))

    def test_up_to_three_words_added_or_left_out_are_the_same_question(self):
        # founder, 2026-10-26: near-identical versions are the same question
        a = live(1, stem="A survey of students ______ found a trend. Which choice completes the text?")
        b = live(2, stem="A survey of students at Fairmont University ______ found a trend. Which choice completes the text?")
        self.assertTrue(self.same(a, b))
        c = live(3, choices=[QUOTES[0]] + [QUOTES[1]] + ["“The young trees had not outgrown their [planter] boxes then.”"]
                 + [QUOTES[3]])
        self.assertTrue(self.same(live(4), c))
        m1 = math_row(5, stem="The function g is defined by g(x) = (x + 17)(t - x), where t is a constant. What is g(0)?",
                      publish_status="publish_ready")
        m2 = math_row(6, stem="g(x) = (x + 17)(t - x)\nThe function g is defined by the equation shown, where t is a "
                              "constant. What is g(0)?", publish_status="publish_ready")
        self.assertTrue(self.same(m1, m2))

    def test_four_words_added_a_number_or_the_keyed_answer_changed_are_not(self):
        a = live(1, stem="A survey of students ______ found a trend. Which choice completes the text?")
        four = live(2, stem="A survey of students at the Fairmont University ______ found a trend. Which choice completes the text?")
        self.assertFalse(self.same(a, four))
        self.assertFalse(self.same(live(3), live(4, choices=QUOTES[:3] + ["“And when the wind is from the South, all soil falls.”"])))
        m1 = math_row(5, stem="If 3x + 5 = 20, what is the value of x?", publish_status="publish_ready")
        self.assertFalse(self.same(m1, math_row(6, stem="If 3x + 5 = 20 + 2, what is the value of x?", publish_status="publish_ready")))
        self.assertFalse(self.same(m1, math_row(7, stem="If 3x - 5 = 20, what is the value of x?", publish_status="publish_ready")))
        # another word in place of a word, even with the words moved, is a different question
        self.assertFalse(self.same(live(8, stem="Notes on Florida.\nWhich choice uses the notes?"),
                                   live(9, stem="Which choice uses the notes?\nNotes on Illinois.")))

    def test_a_few_marks_in_a_long_passage_are_formatting(self):
        text = ("Text 1 is adapted from E.M. Forster's 1910 novel Howards End. King's Cross and St. Pancras are "
                "adjacent railway terminals in London, from which trains travel north; the station suggested Infinity.")
        other = text.replace("E.M.", "E M,").replace("St.", "St,")
        self.assertTrue(self.same(live(1, stem=text + " Which choice?"), live(2, stem=other + " Which choice?",
                                                                            choices=QUOTES[::-1], key="A")))

    def test_other_words_numbers_or_marks_are_a_different_question(self):
        a = live(1)
        self.assertFalse(self.same(a, live(2, stem=STEM.replace("rural South", "rural North"))))  # another word
        four = STEM.replace("illustrates", "illustrate").replace("connect", "connects").replace("uses", "use")
        self.assertFalse(self.same(a, live(3, stem=four, choices=[QUOTES[0].replace("engines", "engine")] + QUOTES[1:])))
        self.assertFalse(self.same(a, live(4, choices=QUOTES[:3] + ["“And when the wind is from the North, soil falls.”"])))
        m = math_row(5, stem="If 3x + 5 = 20, what is the value of x?", publish_status="publish_ready")
        self.assertFalse(self.same(m, math_row(6, stem="If 3x + 5 = 23, what is the value of x?", publish_status="publish_ready")))
        # a punctuation question: short choices must keep their marks
        p1 = live(7, stem="The bridge ______ opened in 1937. Which choice conforms?", choices=["bridge,", "bridge;", "bridge:", "bridge"], key="D")
        p2 = live(8, stem="The bridge ______ opened in 1937. Which choice conforms?", choices=["bridge,", "bridge;", "bridge—", "bridge"], key="D")
        self.assertFalse(self.same(p1, p2))
        self.assertFalse(qd.spelling_variant("grove", "river"))
        self.assertTrue(qd.spelling_variant("solpe", "slope"))

    def test_certify_groups_a_spelling_copy(self):
        a, b = live(1), live(2, stem=STEM.replace("illustrates", "illustrate"), choices=QUOTES[::-1], key="A")
        self.assertEqual(qd.groups([a, b, live(3, stem="Something else entirely. Which choice?")]), [[a["id"], b["id"]]])


def export_row(r: dict) -> dict:
    """A live row in the slim live-export shape (k export), with the comparison key it would carry."""
    e = {"id": r["id"], "question_text": r["question_text"], "correct_answer": r["correct_answer"],
         "question_format": r["answer_format"], "is_live": r.get("is_live", True), "archived_at": r.get("archived_at"),
         "publish_status": r.get("publish_status", "publish_ready"), "import_status": "ok", "created_at": "2026-01-01",
         "source_version": "v", "source_section": r.get("source_section", "reading_writing"), "source_module": "M1",
         "source_question_number": int(r["id"][-3:]), "content_hash_v2": f"h{r['id'][-4:]}",
         "choices": [{"letter": c["letter"], "choice_text": c["choice_text"]} for c in r["answer_choices"]],
         "raw_model_response": (r.get("answer_key_entries") or [{}])[0].get("raw_model_response") or {}}
    e["comparison_key"] = comparison_key(record_from_row({**{f: None for f in ("passage", "passage_a", "passage_b",
                                                                               "passage_intro", "figure_kind",
                                                                               "figure_table_data")}, **e}))
    return e


class StageAndQaCorrectionTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def stage_against(self, live_rows, rows):
        batch = fx.write_batch_dir(self.d / "syn-1")
        return stage.build_stage(batch, write_export(self.d / "e.json", [export_row(r) for r in live_rows]),
                                 self.d / "x.pdf", rows_doc=fx.rows_doc(rows))

    def test_stage_refuses_the_same_question_as_a_live_row(self):
        text = "Which made-up choice best completes the note about the alder grove?"
        live_row = live(901, stem=text.replace("completes", "complete"),
                        choices=["third 1", "first 1", "fourth 1", "second 1"], key="B")
        rows = [fx.stage_row(1, text), fx.stage_row(2, "Which made-up choice best describes the birch grove?")]
        res = self.stage_against([live_row], rows)
        (rid, why), = res["refused"].items()
        self.assertEqual(rid, rows[0]["stable_question_id"])
        self.assertIn(f"qa gate: live_duplicate: same question as live {live_row['id']}", why)
        # the same question that is no longer live does not block it
        hidden = {**live_row, "is_live": False, "archived_at": "2026-10-26T00:00:00Z", "publish_status": "needs_human_review"}
        self.assertEqual(self.stage_against([hidden], rows)["refused"], {})

    def test_stage_refuses_a_generated_key_against_a_printed_twin(self):
        text = "The lighthouse keeper ______ stayed for fifty-four years. Which choice conforms?"
        printed = live(902, stem=text.replace("fifty-four", "twenty-two"), choices=["first 1", "second 1", "third 1", "fourth 1"],
                       key="B")
        row = fx.stage_row(1, text)
        row["key"]["raw_model_response"] = {"kind": GENERATED, "evidence": row["key"]["raw_model_response"]}
        found = bank_gate.Bank([export_row(printed)]).findings(
            {**row["question"], "id": "x", "answer_choices": row["choices"], "answer_key_entries": [row["key"]]})
        self.assertIn("key_conflicts_printed_twin", found)
        self.assertIn("keys 'second 1'", found["key_conflicts_printed_twin"][0])
        # its own printed key, or the same keyed text: nothing
        same = {**row["question"], "id": "x", "correct_answer": "B", "answer_choices": row["choices"],
                "answer_key_entries": [row["key"]]}
        self.assertNotIn("key_conflicts_printed_twin", bank_gate.Bank([export_row(printed)]).findings(same))

    def test_qa_correction_precheck_uses_the_bank_gate(self):
        # the corrected row's own hidden row is left out; a live copy refuses it (kimport.qa_correct)
        from tests.test_qa_hidden_twin import TwinCase  # noqa: F401  (exercised end to end there)
        text = "Which made-up choice best completes the note about the alder grove?"
        live_row = live(903, stem=text, choices=["first 1", "second 1", "third 1", "fourth 1"], key="A")
        item = {"id": "s1", "row": fx.stage_row(1, text.replace("completes", "complete")), "snap": {"question": {"id": "own"}}}
        got = bank_gate.staged_reasons([item], [export_row(live_row)], lambda it: [it["snap"]["question"]["id"]])
        self.assertTrue(got["s1"][0].startswith("qa gate: live_duplicate: same question as live"))
        self.assertEqual(bank_gate.staged_reasons([item], [export_row(live_row)], lambda it: [live_row["id"]]), {})


class PublishTest(unittest.TestCase):
    def test_publish_refuses_a_row_that_is_the_same_question_as_a_live_row(self):
        a = live(904)
        draft = live(905, stem=STEM.replace("illustrates", "illustrate"), choices=QUOTES[::-1], key="A",
                     publish_status="needs_human_review", is_live=False)
        snap = {"question": {k: v for k, v in draft.items() if k not in ("answer_choices", "answer_key_entries")},
                "choices": draft["answer_choices"], "keys": draft["answer_key_entries"]}
        items = [{"id": draft["id"], "snap": snap}]
        self.assertEqual(publish._live_duplicates(items, [export_row(a)]),
                         [f"{draft['id']} duplicate: same question as live {a['id']}"])
        self.assertEqual(publish._live_duplicates(items, [export_row({**a, "is_live": False})]), [])


class KeyConsistencyTest(unittest.TestCase):
    CHOICES = ["example, with", "example. With", "example with", "example; with"]

    def rows(self, gen_key="A", printed_key="B", printed_choices=None, subject="reading"):
        g = generated(live(1, stem="Ballet dancers train hard. For ______ dancers rehearse daily. Which choice conforms?",
                           choices=self.CHOICES, key=gen_key, subject=subject))
        p = live(2, stem="Ballet dancers train hard. For ______ students rehearse weekly. Which choice conforms?",
                 choices=printed_choices or self.CHOICES, key=printed_key, subject=subject)
        return g, p

    def test_a_generated_key_that_disagrees_with_a_printed_twin_fails(self):
        g, p = self.rows()
        found = qa_keys.bank_findings([g, p])
        self.assertEqual(list(found), [g["id"]])
        self.assertIn("printed-key twin", found[g["id"]][0])
        self.assertEqual(qa_static.LEVELS["key_conflicts_printed_twin"], "fail")

    def test_agreeing_keys_two_printed_keys_other_choices_and_math_pass(self):
        self.assertEqual(qa_keys.bank_findings(list(self.rows(gen_key="B"))), {})
        g, p = self.rows()
        p["answer_key_entries"] = g["answer_key_entries"] = [{"raw_model_response": {}}]
        g.pop("answer_key_status")
        self.assertEqual(qa_keys.bank_findings([g, p]), {})  # both printed: nothing to compare against
        self.assertEqual(qa_keys.bank_findings(list(self.rows(printed_choices=["one", "two", "three", "four"]))), {})
        self.assertEqual(qa_keys.bank_findings(list(self.rows(subject="math"))), {})

    def test_lint_with_an_export_pulls_the_row(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            row = make_row(1)
            row["reviewed_answer"]["kind"] = GENERATED
            row["domain"] = "conventions"
            twin = live(906, stem=row["question_text"].replace("number 1", "number one"),
                        choices=["one", "two", "three", "four"], key="B")
            rp, cp = d / "b-reviewed-import-ready.json", d / "clusters.json"
            rp.write_text(json.dumps({"import_policy": "reviewed-difficulty", "questions": [row]}))
            cp.write_text(json.dumps(clusters_for([row])))
            export = write_export(d / "e.json", [export_row(twin)])
            res = lint.run_lint(rp, None, cp, d / "lane.json", "2099-01-01T00:00:00Z", export=export)
            self.assertEqual([(p["code"], p["detail"].split(":")[0]) for p in res["pulled"]],
                             [("PF_QA", "key_conflicts_printed_twin")])
            res = lint.run_lint(rp, None, cp, d / "lane2.json", "2099-01-01T00:00:00Z")  # no export: not checked
            self.assertEqual(res["pulled"], [])


class WiderPlainTextMathTest(unittest.TestCase):
    def test_slash_fractions_hyphen_minus_star_and_glued_numbers_fail(self):
        for stem, what in (("If g = 14 − x/23, what is g when x = 46?", "slash"),
                           ("The line y = (5/16)x passes through the origin. What is y?", "slash"),
                           ("Segment BD is 2/3 of AB. What is BD?", "slash"),
                           ("If x/y = 76, what is y?", "slash"),
                           ("If y = -2x + 3, what is y when x = 1?", "minus"),
                           ("The parabola has x-intercepts (-9, 0) and (6, 0). What is its vertex?", "minus"),
                           ("If p(x) = 3-x, what is p(1)?", "minus"),
                           ("A square has area 68*68 square inches. What is its side?", "star")):
            f = checks(math_row(stem=stem))
            self.assertIn("plain_text_math", f, stem)
        self.assertIn("slash", checks(math_row(choices=["−11/8", "8/11", "1", "2"]))["plain_text_math"][0])
        f = real(math_row(choices=["f(x) = 172,000\\((0.035)^x\\)", "b", "c", "d"]))
        self.assertTrue(any("glued" in d for d in f["fail"]["plain_text_math"]))

    def test_prose_slashes_units_dates_and_typeset_math_pass(self):
        for stem in ("The car went 60 km/h, and/or 50 mi/h. What is x?", "A molar mass of 170.33 g/mol. What is x?",
                     "A cart moves at 5 m/s and its momentum is in kg·m/s. What is x?",
                     "On 10/26/2026 a 3-hour trip began on the x-axis. What is x?",
                     "If \\(g = 14 - x/23\\) and $y = -2x$, what is g?", "If 36\\(x^2\\)(x + 12) = 0, what is x?"):
            self.assertNotIn("plain_text_math", real(math_row(stem=stem))["fail"], stem)


if __name__ == "__main__":
    unittest.main()
