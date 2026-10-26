"""The checks added after the independent audit of 2026-10-26 (kimport.qa_bank_checks,
kimport.qa_dupes): plain-text math, money drawn as math, credit lines, live duplicates and typed
answers that refuse an SAT decimal; in the static audit, `k qa certify`, `k lint` (PF_QA) and the
stage prechecks. Synthetic rows only (the shapes of the audit's examples)."""

import json
import tempfile
import unittest
from pathlib import Path

from kimport import lint, qa_bank_checks as qb, qa_certify, qa_dupes, qa_gate, qa_static, stage
from tests import stage_fixtures as fx
from tests.export_fixtures import write_export
from tests.test_lint import clusters_for, make_row
from tests.test_qa_certify import Pipe, row as cert_row, snap
from tests.test_qa_static import UUID, mc


def math_row(n=1, stem="What is the value of x?", choices=None, key="B", **extra):
    choices = choices if choices is not None else ["1", "2", "3", "4"]
    return mc(n, stem=stem, choices=choices, key=key, subject="math", **extra)


def checks(row, prose=None):
    """The Python half of the audit on one row; `prose` stands in for qa-check.ts's prose runs."""
    ts = {row["id"]: {"checks": {}, "figure": None, "choice_tables": 0, "delivery": "served",
                      "display": {}, **({"prose": prose} if prose is not None else {})}}
    return qa_static.audit_rows([row], ts, None)[row["id"]]["checks"]


def real(row):
    """Both halves: ts/qa-check.ts --gate and the Python checks, split into fail and review."""
    return qa_gate.check_rows([row], qa_gate.ts_checker, reach=lambda u: None)[row["id"]]


class PlainTextMathTest(unittest.TestCase):
    def test_caret_root_and_fraction_written_as_text_fail(self):
        f = checks(math_row(stem="f(x) = k (1.85)^x\nThe function f is defined by the given equation. Which is g?",
                            choices=["g(x) = k(1.85)^(x-3)", "g(x) = x^2", "x", "y"]))
        self.assertIn("caret exponent", " ".join(f["plain_text_math"]))
        self.assertEqual(len(f["plain_text_math"]), 3)  # the stem and two choices
        self.assertIn("root", checks(math_row(stem="If √(x − 3) = 5, what is the value of x?"))["plain_text_math"][0])
        self.assertIn("fraction", checks(math_row(choices=["(11)/(2)", "b", "c", "d"]))["plain_text_math"][0])
        self.assertIn("fraction", checks(math_row(stem="g(x) = f(x)/(x + 6). What is g(2)?"))["plain_text_math"][0])
        self.assertEqual(qa_static.LEVELS["plain_text_math"], "fail")

    def test_prose_slashes_typeset_math_and_reading_rows_pass(self):
        for stem in ("The car went 60 km/h and/or 50 mi/h on 10/26/2026. What is x?",
                     "If \\(x^2 = 9\\) and $y^{3} = 8$, what is x + y?", "What is $$\\sqrt{x+1}$$ when x = 3?",
                     "If x² = 9, what is x?", "If √11 = x, what is x²?"):
            self.assertNotIn("plain_text_math", checks(math_row(stem=stem)), stem)
        self.assertNotIn("plain_text_math", checks(mc(stem="The poet wrote x^2 on the wall. Which choice?")))

    def test_a_currency_dollar_does_not_hide_or_fake_math(self):
        # "$6,000" is money; the math is in \( \): nothing is plain text (the audit's display trap).
        stem = "A deposit of $6,000 grows as f(t) = 6,000(1.01)\\(^{2t}\\). What is f(5)?"
        self.assertNotIn("plain_text_math", checks(math_row(stem=stem)))
        self.assertNotIn("plain_text_math", real(math_row(stem=stem))["fail"])

    def test_real_checker_reads_main_display(self):
        f = real(math_row(stem="I = 600(0.5)^(x/17). What is I when x = 17?"))
        self.assertIn("plain_text_math", f["fail"])
        # main's reviewed serialized function lines draw this one as math: not plain text
        f = real(math_row(stem="f(x) = 3(2)^(x/4)\nWhat is f(8)?"))
        self.assertNotIn("plain_text_math", f["fail"])


class MoneyAsMathTest(unittest.TestCase):
    def test_two_prices_paired_as_math_fail(self):
        stem = ("Marketing research recognizes three types of price endings: round (like $25.00), just-below "
                "(like $24.99), and precise (like $24.63). Which choice best states the main purpose of the text?")
        f = checks(mc(stem=stem))
        self.assertIn("money_as_math", f)
        self.assertIn("25.00), just-below (like", f["money_as_math"][0])
        self.assertIn("money_as_math", real(mc(stem=stem))["fail"])

    def test_currency_main_reads_as_prose_and_real_math_pass(self):
        for stem in ("Tickets cost $6 to $24 at the fair. Which choice?",  # one joining word: prose on main
                     "She paid $49 at a book sale and then $3 each for two more. Which choice?",
                     "Which is $\\$80$ on sale for $25\\%$ off?", "If $3x + 5 = 20$, what is x?",
                     "The item costs $5. Which choice?"):
            self.assertNotIn("money_as_math", checks(mc(stem=stem)), stem)

    def test_port_matches_main_currency_rule(self):
        cur = qb.currency_dollar_delimiters
        self.assertEqual(cur("$6 to $24"), {0, 6})
        self.assertEqual(cur("$49 at a book sale for $3 each"), {0, 23})
        self.assertEqual(cur("$3 sin x $4"), set())
        self.assertEqual(cur("$3 for x $4"), set())  # one word that is not a joining word
        self.assertEqual(cur("$5 + y $6"), set())


class CopyrightLineTest(unittest.TestCase):
    def test_credit_lines_fail(self):
        for passage in ("The rain fell all night.\n\n©2023 by Mick Herron",
                        "The rain fell all night. ©1956 by James Baldwin",
                        "The rain fell all night.\n<i>©2018 by Adib Khorram</i>",
                        "The rain fell all night.\nCopyright 2004 Harbor Press.", "The rain fell.\n(c) 2010 Harbor Press"):
            self.assertIn("copyright_line", checks(mc(passage=passage)), passage)
        f = checks(mc(stem="The rain fell.\n©2021 by Angeline Boulley\n\nWhich choice best describes the rain?"))
        self.assertIn("©2021 by Angeline Boulley", f["copyright_line"][0])

    def test_the_word_copyright_in_prose_passes(self):
        for passage in ("Copyright law protects authors for decades.", "The museum bought the copyright in 1990.",
                        "Section (c) of the rule applies.", "Circle C has radius 2."):
            self.assertNotIn("copyright_line", checks(mc(passage=passage)), passage)


def numeric(n=1, key="2/7", tolerance=0, answers=None):
    raw = {"evidence": {"numeric_answer_set": {"answers": answers}}} if answers else {}
    return mc(n, answer_format="numeric_entry", correct_answer=key, numeric_tolerance=tolerance, choices=[],
              subject="math", stem="What is the value of x?", answer_key_entries=[{"raw_model_response": raw}])


class NumericGradingTest(unittest.TestCase):
    def test_fraction_key_without_decimals_is_a_review_finding(self):
        f = checks(numeric(key="2/7"))
        self.assertIn(".2857, 0.285, 0.286", f["numeric_rejects_sat_decimal"][0])
        self.assertEqual(qa_static.LEVELS["numeric_rejects_sat_decimal"], "review")
        self.assertIn("-.3333, -0.333", checks(numeric(key="-1/3"))["numeric_rejects_sat_decimal"][0])
        self.assertIn("4.666, 4.667", checks(numeric(key="14/3"))["numeric_rejects_sat_decimal"][0])
        f = real(numeric(key="2/7"))
        self.assertIn("numeric_rejects_sat_decimal", f["review"])
        self.assertNotIn("numeric_rejects_sat_decimal", f["fail"])

    def test_repeating_and_long_decimal_keys(self):
        self.assertIn("1/3", checks(numeric(key="0.333"))["numeric_rejects_sat_decimal"][0])
        self.assertIn("0.555, 0.556", checks(numeric(key=".5555", answers=[".5555", "5/9", ".5556"]))[
            "numeric_rejects_sat_decimal"][0])
        self.assertIn("3.120, 3.121", checks(numeric(key="3.1205"))["numeric_rejects_sat_decimal"][0])

    def test_accepted_sets_tolerance_and_plain_keys_pass(self):
        ok = (numeric(key="2/7", answers=["2/7", ".2857", "0.285", "0.286"]), numeric(key="2/7", tolerance=0.001),
              numeric(key="14/3", tolerance="0.001"), numeric(key="3/4"), numeric(key="12"), numeric(key="0.75"),
              numeric(key="1.414"), numeric(key="-12.5"), numeric(key="1/64", answers=["1/64", ".0156", ".0157", "0.015", "0.016"]))
        for r in ok:
            self.assertNotIn("numeric_rejects_sat_decimal", checks(r), r["correct_answer"])
        self.assertNotIn("numeric_rejects_sat_decimal", checks(mc()))


def live(n, stem, choices, key="B", passage=None, **extra):
    r = mc(n, stem=stem, choices=choices, key=key, passage=passage, publish_status="publish_ready", archived_at=None)
    r.update(extra)
    return r


CHOICES = ["evident", "obscure", "minor", "hidden"]
PASSAGE = "The [[i]]Paxillus[[/i]] fungus grows on trees, which it ______ helps."


class DuplicatesTest(unittest.TestCase):
    def ids(self, *rows):
        return qa_dupes.groups(list(rows))

    def test_formatting_order_and_typo_copies_group(self):
        a = live(1, "Which choice completes the text?", CHOICES, key="A", passage=PASSAGE)
        b = live(2, "Which choice completes the text?", ["obscure", "hidden", "evident", "minor."], key="C",
                 passage="The Paxillus  fungus grows on trees, which it _____ blank helps.")
        c = live(3, "", ["minor", "obscure", "evident", "hidden"], key="C",  # question written before the passage
                 passage="Which choice completes the text?\n\nThe “Paxillus” fungus grows on trees, which it\n______\nhelps.")
        d = live(4, "Which choice completes the text?", CHOICES, key="A",  # a one-letter typo
                 passage="The Paxillus fungus grows on tres, which it ______ helps.")
        self.assertEqual(self.ids(a, b, c, d), [[a["id"], b["id"], c["id"], d["id"]]])
        m1 = math_row(5, stem="The zeros are −2, −7 and 3. What is a?", choices=["−42", "−6", "6", "42"], key="C",
                      publish_status="publish_ready_with_verified_repair")
        m2 = math_row(6, stem="The zeros are -2, -7 and 3.\n\nWhat is a?", choices=["- 42", "- 6", "6", "42"], key="C",
                      publish_status="publish_ready")
        self.assertEqual(self.ids(m1, m2), [[m1["id"], m2["id"]]])

    def test_different_questions_do_not_group(self):
        a = live(1, "Which choice completes the text?", CHOICES, key="A", passage=PASSAGE)
        other_answer = live(2, "Which choice completes the text?", CHOICES, key="B", passage=PASSAGE)
        other_wrong_choice = live(3, "Which choice completes the text?", ["evident", "obscure", "minor", "vast"],
                                  key="A", passage=PASSAGE)
        other_name = live(4, "Which choice completes the text?", CHOICES, key="A",
                          passage="The Armillaria fungus grows on trees, which it ______ helps.")
        hidden = live(5, "Which choice completes the text?", CHOICES, key="A", passage=PASSAGE,
                      publish_status="needs_human_review")
        archived = live(6, "Which choice completes the text?", CHOICES, key="A", passage=PASSAGE,
                        archived_at="2099-01-01T00:00:00Z")
        self.assertEqual(self.ids(a, other_answer, other_wrong_choice, other_name, hidden, archived), [])
        m1 = math_row(7, stem="If 3x + 5 = 20, what is x?", publish_status="publish_ready")
        m2 = math_row(8, stem="If 3x + 5 = 23, what is x?", publish_status="publish_ready")
        m3 = math_row(9, stem="If 5x + 3 = 20, what is x?", publish_status="publish_ready")
        self.assertEqual(self.ids(m1, m2, m3), [])
        t1 = math_row(10, stem="Based on the table, what is x?", publish_status="publish_ready",
                      figure_table_data={"rows": [["1", "2"]]})
        t2 = math_row(11, stem="Based on the table, what is x?", publish_status="publish_ready",
                      figure_table_data={"rows": [["3", "4"]]})
        self.assertEqual(self.ids(t1, t2), [])
        n1 = numeric(12, key="2/7")
        n2 = numeric(13, key="4/14")  # the same value
        n3 = numeric(14, key="3/7")
        for r in (n1, n2, n3):
            r.update(publish_status="publish_ready", archived_at=None)
        self.assertEqual(self.ids(n1, n2, n3), [[n1["id"], n2["id"]]])


class GateTest(unittest.TestCase):
    """k lint pulls a reviewed row (PF_QA) and the stage prechecks refuse it."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def lint(self, rows):
        rp, cp = self.d / "b-reviewed-import-ready.json", self.d / "clusters.json"
        rp.write_text(json.dumps({"import_policy": "reviewed-difficulty", "questions": rows}))
        cp.write_text(json.dumps(clusters_for(rows)))
        return lint.run_lint(rp, None, cp, self.d / "lane.json", "2099-01-01T00:00:00Z")

    def test_lint_pulls_each_fail_class(self):
        caret, money, credit = make_row(1), make_row(2), make_row(3)
        caret.update(domain="algebra", question_text="If y = x^2 + 1, what is y when x = 2?")
        money["question_text"] = "Prices are round (like $25.00), just-below (like $24.99). Which choice fits?"
        credit["question_text"] = "The rain fell.\n©2003 by Jhumpa Lahiri\nWhich choice best fits?"
        res = self.lint([caret, money, credit, make_row(4)])
        self.assertEqual(res["passed"], 1)
        pulled = {p["id"]: (p["code"], p["detail"].split(":")[0]) for p in res["pulled"]}
        self.assertEqual(pulled, {"SYN_TEST_Q01": ("PF_QA", "plain_text_math"), "SYN_TEST_Q02": ("PF_QA", "money_as_math"),
                                  "SYN_TEST_Q03": ("PF_QA", "copyright_line")})

    def test_stage_refuses_a_credit_line(self):
        batch = fx.write_batch_dir(self.d / "syn-1")
        rows = [fx.stage_row(1, "The rain fell.\n©2003 by Jhumpa Lahiri\nWhich made-up choice best fits?"),
                fx.stage_row(2, "Which made-up choice best completes the note about the birch grove?")]
        res = stage.build_stage(batch, write_export(self.d / "e.json", []), self.d / "x.pdf", rows_doc=fx.rows_doc(rows))
        self.assertEqual(list(res["files"]), ["precheck.json"])
        (rid, why), = res["refused"].items()
        self.assertEqual(rid, rows[0]["stable_question_id"])
        self.assertTrue(why[0].startswith("qa gate: copyright_line: question_text"))


class CertifyTest(unittest.TestCase):
    def test_certify_fails_every_copy_and_lists_the_groups(self):
        with tempfile.TemporaryDirectory() as d:
            p = Pipe(Path(d))
            a = cert_row(1, stem="Which made-up choice best describes the  grove?")
            b = cert_row(2, stem="Which made-up choice best describes the grove ?")
            c = cert_row(3, stem="Which made-up choice best describes the river?")
            p.jsonl("results-r1.jsonl", [{"id": r["id"], "verdict": "clean", "stored_answer": "B"} for r in (a, b, c)])
            p.json("qa/blind-live-r1.json", [snap(r) for r in (a, b, c)])

            def exporter(out, env, log, visible):
                Path(out).write_text(json.dumps({"exported_at": "2099-01-01T00:00:00Z", "fingerprint": "f",
                                                 "rows": [a, b, c]}))

            def render(export, out, first, log):
                return {"main_commit": "c" * 40, "totals": {"expected": 3, "rendered": 3, "render_failed": 0},
                        "questions": {}, "rendered_ids": [a["id"], b["id"], c["id"]]}

            res = qa_certify.run_certify(p.d, "2099-01-02T03:04:05Z", render=render, exporter=exporter, log=lambda m: None)
            self.assertEqual((res["certified"], res["failing"]), (1, 2))
            cert = json.loads((p.qa / "certificate-2099-01-02.json").read_text())
            self.assertEqual(cert["duplicate_groups"], [[a["id"], b["id"]]])
            by_id = {f["id"]: f for f in cert["failing"]}
            self.assertIn(f"same question as {b['id']}", by_id[a["id"]]["static"]["live_duplicate"][0])
            md = (p.qa / "certificate-2099-01-02.md").read_text()
            self.assertIn(f"- `{a['id']}`, `{b['id']}`", md)
            static = json.loads((p.qa / "certify-20990102T030405Z" / "static-report.json").read_text())
            self.assertEqual(static["totals"]["duplicate_groups"], 1)


if __name__ == "__main__":
    unittest.main()
