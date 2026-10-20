import unittest

from kimport.keys import QuestionRecord
from kimport.typo import MAX_SPOT_CHARS, MAX_SPOTS, TypoResult, typo_match
from tests.founder_fixtures import pair


def mc(ref, text, choices=("2", "4", "6", "8"), answer="4"):
    return QuestionRecord(ref=ref, text=text, choices=tuple(choices), answer=answer, answer_format="mc")


class TypoRuleTests(unittest.TestCase):
    def test_constants(self):
        self.assertEqual(MAX_SPOTS, 2)
        self.assertEqual(MAX_SPOT_CHARS, 3)

    def test_ocr_typo_same(self):
        a, b = pair("ocr_typo")
        r = typo_match(a, b)
        self.assertIsInstance(r, TypoResult)
        self.assertTrue(r.same)
        self.assertEqual(r.spots, (("it", "in"),))
        self.assertEqual(r.reason, "ocr_typo")

    def test_sign_change_different(self):
        # Founder example 3 flips a sign inside a choice, so the choice check
        # (first in the rule order) rejects it before the math-token check.
        a, b = pair("sign_change")
        r = typo_match(a, b)
        self.assertFalse(r.same)
        self.assertEqual(r.reason, "choice_differs")

    def test_sign_change_in_text_math_token_differs(self):
        a = mc("s1", "A line has slope −3 and passes through (0, 1). What is y when x = 1?")
        b = mc("s2", "A line has slope 3 and passes through (0, 1). What is y when x = 1?")
        r = typo_match(a, b)
        self.assertFalse(r.same)
        self.assertEqual(r.reason, "math_token_differs")

    def test_digit_change_math_token_differs(self):
        r = typo_match(mc("d1", "How many hours did 12 trips take?"), mc("d2", "How many hours did 17 trips take?"))
        self.assertEqual((r.same, r.reason), (False, "math_token_differs"))

    def test_shared_passage_different_question_not_typo(self):
        a, b = pair("shared_passage")
        r = typo_match(a, b)
        self.assertFalse(r.same)
        self.assertIn(r.reason, ("too_many_spots", "spot_too_long"))

    def test_grammar_punctuation_different(self):
        a, b = pair("grammar_punctuation_in_span")
        r = typo_match(a, b)
        self.assertFalse(r.same)
        self.assertEqual(r.reason, "in_tested_span")

        a, b = pair("grammar_punctuation_plain")
        r = typo_match(a, b)
        self.assertFalse(r.same)
        self.assertEqual(r.reason, "punctuation_differs")

    def test_typo_in_blank_span(self):
        a = mc("b1", "Fill in: the cat ______ on the mat.")
        b = mc("b2", "Fill in: the cat _____ on the mat.")
        self.assertEqual(typo_match(a, b).reason, "in_tested_span")

    def test_typo_in_choice_never_same(self):
        a = mc("c1", "Which word fits?", ("effect", "result", "outcome", "impact"), "result")
        b = mc("c2", "Which word fits?", ("affect", "result", "outcome", "impact"), "result")
        r = typo_match(a, b)
        self.assertFalse(r.same)
        self.assertEqual(r.reason, "choice_differs")

    def test_different_answer_choice_differs(self):
        r = typo_match(mc("a1", "Pick one.", answer="4"), mc("a2", "Pick one.", answer="6"))
        self.assertEqual((r.same, r.reason), (False, "choice_differs"))

    def test_too_many_spots(self):
        a = mc("m1", "The farmer sold his corn at the market on Monday morning.")
        b = mc("m2", "The farmar sold his corm at the markot on Monday morning.")
        r = typo_match(a, b)
        self.assertEqual((r.same, r.reason), (False, "too_many_spots"))

    def test_two_spots_allowed(self):
        a = mc("m1", "The farmer sold his corn at the market on Monday morning.")
        b = mc("m2", "The farmar sold his corm at the market on Monday morning.")
        r = typo_match(a, b)
        self.assertTrue(r.same)
        self.assertEqual(r.spots, (("farmer", "farmar"), ("corn", "corm")))

    def test_spot_too_long(self):
        a = mc("l1", "The river flooded the valley.")
        b = mc("l2", "The river drained the valley.")
        r = typo_match(a, b)
        self.assertEqual((r.same, r.reason), (False, "spot_too_long"))

    def test_spot_at_limit_is_typo(self):
        a = mc("l1", "The kitten slept all afternoon.")
        b = mc("l2", "The kitxyz slept all afternoon.")
        self.assertTrue(typo_match(a, b).same)

    def test_identical(self):
        a, b = pair("fraction_notation")
        r = typo_match(a, b)
        self.assertEqual(r, TypoResult(True, (), "identical"))

    def test_markup_only_difference_not_same(self):
        a = mc("u1", "The <u>tall</u> tree grew fast.")
        b = mc("u2", "The tall tree grew fast.")
        r = typo_match(a, b)
        self.assertFalse(r.same)
        self.assertEqual(r.reason, "markup_differs")

    def test_table_or_figure_difference_not_same(self):
        a = mc("f1", "Use the figure.")
        b = QuestionRecord(**{**a.__dict__, "figure_signature": "fig:line:2"})
        r = typo_match(a, b)
        self.assertEqual((r.same, r.reason), (False, "table_or_figure_differs"))

    def test_symmetric(self):
        for name in ("ocr_typo", "grammar_punctuation_in_span", "grammar_punctuation_plain", "shared_passage"):
            a, b = pair(name)
            self.assertEqual(typo_match(a, b).reason, typo_match(b, a).reason, name)


if __name__ == "__main__":
    unittest.main()
