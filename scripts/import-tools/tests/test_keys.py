import unittest

from kimport.keys import QuestionRecord, answer_value, comparison_key, markup_spans
from kimport.normalize import BLANK
from tests.founder_fixtures import pair


def numeric(ref, text, answer):
    return QuestionRecord(ref=ref, text=text, choices=(), answer=answer, answer_format="numeric")


def mc(ref, text, choices, answer, **kw):
    return QuestionRecord(ref=ref, text=text, choices=tuple(choices), answer=answer, answer_format="mc", **kw)


class ComparisonKeyTests(unittest.TestCase):
    def test_key_format(self):
        a, _ = pair("shuffled_choices")
        key = comparison_key(a)
        self.assertTrue(key.startswith("kn-2:"))
        self.assertEqual(len(key), len("kn-2:") + 64)
        self.assertEqual(key, comparison_key(a))

    def test_shuffled_choices_same_key(self):
        a, b = pair("shuffled_choices")
        self.assertEqual(comparison_key(a), comparison_key(b))

    def test_fraction_notation_same_key(self):
        a, b = pair("fraction_notation")
        self.assertEqual(comparison_key(a), comparison_key(b))

    def test_sign_change_different(self):
        a, b = pair("sign_change")
        self.assertNotEqual(comparison_key(a), comparison_key(b))

    def test_shared_passage_different_question_not_typo(self):
        a, b = pair("shared_passage")
        self.assertNotEqual(comparison_key(a), comparison_key(b))

    def test_grammar_punctuation_different(self):
        for name in ("grammar_punctuation_in_span", "grammar_punctuation_plain"):
            a, b = pair(name)
            self.assertNotEqual(comparison_key(a), comparison_key(b), name)

    def test_numeric_answer_equivalence(self):
        stem = "What is the value of y when x = 3?"
        self.assertEqual(
            comparison_key(numeric("n1", stem, "0.5")),
            comparison_key(numeric("n2", stem, "1/2")),
        )
        self.assertNotEqual(
            comparison_key(numeric("n3", stem, "2.4")),
            comparison_key(numeric("n4", stem, "4.8")),
        )

    def test_repeated_choice_multiplicity(self):
        stem = "Which value satisfies the equation?"
        a = mc("r1", stem, ("5", "5", "6", "7"), "6")
        b = mc("r2", stem, ("5", "6", "6", "7"), "6")
        self.assertNotEqual(comparison_key(a), comparison_key(b))

    def test_domain_not_in_key(self):
        a, _ = pair("shuffled_choices")
        b = QuestionRecord(**{**a.__dict__, "ref": "other", "meta": {"domain": "Algebra"}})
        c = QuestionRecord(**{**a.__dict__, "meta": {"domain": "Advanced Math", "subject": "math"}})
        self.assertEqual(comparison_key(a), comparison_key(b))
        self.assertEqual(comparison_key(b), comparison_key(c))

    def test_ref_and_is_live_not_in_key(self):
        a, _ = pair("shuffled_choices")
        b = QuestionRecord(**{**a.__dict__, "ref": "live-1", "is_live": True})
        self.assertEqual(comparison_key(a), comparison_key(b))

    def test_underline_position_is_in_key(self):
        # The same repeated word, underlined at two different positions.
        a = mc("u1", "The <u>tree</u> grew fast, and the tree grew tall.", ("A", "B"), "A")
        b = mc("u2", "The tree grew fast, and the <u>tree</u> grew tall.", ("A", "B"), "A")
        c = mc("u3", "The tree grew fast, and the tree grew tall.", ("A", "B"), "A")
        self.assertEqual(len({comparison_key(a), comparison_key(b), comparison_key(c)}), 3)

    def test_underline_text_is_in_key(self):
        a = mc("u1", "The <u>tall</u> tree grew fast.", ("A", "B"), "A")
        b = mc("u2", "The tall tree <u>grew</u> fast.", ("A", "B"), "A")
        self.assertNotEqual(comparison_key(a), comparison_key(b))

    def test_markup_spans_carry_word_index(self):
        self.assertEqual(
            markup_spans("The tree grew, and the <u>tree</u> fell ____."),
            (("u", 5, "tree"), ("blank", 7, BLANK)),
        )

    def test_blank_length_same_key(self):
        a = mc("b1", "Its results ______ widely cited.", ("were", "was"), "were")
        b = mc("b2", "Its results ____ widely cited.", ("were", "was"), "were")
        c = mc("b3", "Its results __________ widely cited.", ("were", "was"), "were")
        self.assertEqual(len({comparison_key(a), comparison_key(b), comparison_key(c)}), 1)

    def test_empty_figure_signature_same_key(self):
        a = mc("f1", "Use the figure.", ("1", "2"), "1")
        for sig in ("", "  "):
            b = QuestionRecord(**{**a.__dict__, "figure_signature": sig})
            self.assertEqual(comparison_key(a), comparison_key(b), repr(sig))

    def test_answer_format_table_and_figure_in_key(self):
        base = mc("t1", "Use the table.", ("1", "2"), "1")
        keys = {
            comparison_key(base),
            comparison_key(QuestionRecord(**{**base.__dict__, "table_cells": (("x", "y"), ("1", "2"))})),
            comparison_key(QuestionRecord(**{**base.__dict__, "figure_signature": "fig:bar:3"})),
            comparison_key(QuestionRecord(**{**base.__dict__, "answer_format": "numeric"})),
        }
        self.assertEqual(len(keys), 4)

    def test_table_cells_normalized(self):
        a = mc("t1", "Use the table.", ("1", "2"), "1", table_cells=(("½", "x²"),))
        b = mc("t2", "Use the table.", ("1", "2"), "1", table_cells=(("1/2", "x^{2}"),))
        self.assertEqual(comparison_key(a), comparison_key(b))


class AnswerValueTests(unittest.TestCase):
    def test_numeric_forms(self):
        for form in ("0.5", "1/2", ".5", "(1)/(2)", r"\frac{1}{2}", "½", "2/4"):
            self.assertEqual(answer_value(numeric("n", "q", form)), "1/2", form)

    def test_numeric_integer_and_negative(self):
        self.assertEqual(answer_value(numeric("n", "q", "4.0")), "4")
        self.assertEqual(answer_value(numeric("n", "q", "−3/4")), "-3/4")
        self.assertEqual(answer_value(numeric("n", "q", "-0.75")), "-3/4")
        self.assertEqual(answer_value(numeric("n", "q", "1,000")), "1000")

    def test_numeric_unparseable_falls_back(self):
        self.assertEqual(answer_value(numeric("n", "q", "  X > 3 ")), "x>3")
        self.assertEqual(answer_value(numeric("n", "q", "1/0")), "(1)/(0)")
        # A mixed number must not be read as 11/2.
        self.assertEqual(answer_value(numeric("n", "q", "1 1/2")), "1(1)/(2)")
        self.assertEqual(answer_value(numeric("n", "q", "-(-3)")), "-(-3)")

    def test_mc_answer_is_normalized_text(self):
        self.assertEqual(answer_value(mc("m", "q", ("0.5", "1"), "0.5")), "0.5")
        self.assertEqual(answer_value(mc("m", "q", ("It’s  Fine",), "It’s  Fine")), "it's fine")


if __name__ == "__main__":
    unittest.main()
