import unittest

from kimport.normalize import (
    NORMALIZER_VERSION,
    math_tokens,
    normalize_text,
    strip_markup,
)


class NormalizeTextTests(unittest.TestCase):
    def test_version(self):
        self.assertEqual(NORMALIZER_VERSION, "kn-1")

    def test_fraction_forms_equal(self):
        forms = [
            "½ of 18",
            "1/2 of 18",
            r"\frac{1}{2} of 18",
            r"\dfrac{1}{2} of 18",
            r"\tfrac{1}{2} of 18",
        ]
        self.assertEqual(len({normalize_text(f) for f in forms}), 1)

    def test_other_fractions_and_non_fractions(self):
        self.assertEqual(normalize_text("¾"), normalize_text("3/4"))
        self.assertNotEqual(normalize_text("1/2"), normalize_text("1/3"))
        # words and dates are not fractions
        self.assertEqual(normalize_text("and/or"), "and/or")
        self.assertEqual(normalize_text("10/12/2020"), "10/12/2020")

    def test_superscript_forms_equal_but_x2_differs(self):
        a = normalize_text("x²")
        self.assertEqual(a, normalize_text("x^{2}"))
        self.assertEqual(a, normalize_text("$x^2$"))
        self.assertNotEqual(a, normalize_text("x2"))

    def test_multi_digit_superscript(self):
        self.assertEqual(normalize_text("x¹⁰"), normalize_text("x^{10}"))

    def test_mixed_unicode_latex(self):
        self.assertEqual(
            normalize_text("x² + 3 \\times 4"), normalize_text("x^{2} + 3 × 4")
        )

    def test_operators_and_relations(self):
        self.assertEqual(normalize_text(r"a \cdot b"), normalize_text("a × b"))
        self.assertEqual(normalize_text(r"a \div b"), normalize_text("a ÷ b"))
        self.assertEqual(normalize_text(r"x \le 3"), normalize_text("x ≤ 3"))
        self.assertEqual(normalize_text(r"x \geq 3"), normalize_text("x ≥ 3"))
        self.assertEqual(normalize_text(r"x \ne 3"), normalize_text("x ≠ 3"))
        self.assertEqual(normalize_text(r"\sqrt{x}"), normalize_text("√(x)"))

    def test_latex_wrappers_removed(self):
        self.assertEqual(
            normalize_text(r"\(\left(x+1\right)\)"), normalize_text("(x+1)")
        )

    def test_minus_and_dashes(self):
        self.assertEqual(normalize_text("−3"), normalize_text("-3"))
        self.assertEqual(normalize_text("a – b — c"), normalize_text("a - b - c"))

    def test_quotes_case_whitespace(self):
        self.assertEqual(
            normalize_text("“The  Study”\n"), normalize_text('"the study"')
        )
        self.assertEqual(normalize_text("it’s…"), "it's...")

    def test_idempotent(self):
        samples = [
            "½ of 18",
            r"\frac{1}{2} + \dfrac{3}{4}",
            "x² + 3 \\times 4",
            "$x^{2}$ and x2",
            "−3 ≤ x ≤ 3",
            "“Quoted” text — with dashes…",
            r"\sqrt{x+1} \cdot 2",
            "a/b and 3/4 and and/or",
            "y_{1} + x₂",
            "  Mixed\tWhitespace\n\nhere ",
        ]
        for s in samples:
            once = normalize_text(s)
            self.assertEqual(normalize_text(once), once, s)


    def test_operator_spacing_equal(self):
        groups = [
            ["3*4", "3 * 4", r"3 \times 4"],
            ["1/2", "1 / 2"],
            ["x^2", "x ^ 2"],
            ["x+1", "x + 1"],
            [r"x\ge 3", "x ≥ 3", "x>=3"],
            ["(x+1)", "( x + 1 )"],
        ]
        for forms in groups:
            self.assertEqual(len({normalize_text(f) for f in forms}), 1, forms)

    def test_prose_hyphen_untouched(self):
        self.assertEqual(normalize_text("well - known"), "well - known")
        self.assertEqual(normalize_text("a well - known fact"), "a well - known fact")

    def test_thin_space_is_space(self):
        self.assertEqual(normalize_text("A\u2009B"), "a b")
        self.assertEqual(normalize_text(r"A\,B"), "a b")
        self.assertEqual(normalize_text(r"A\;B\:C\ D"), "a b c d")

    def test_paren_fraction_equal(self):
        self.assertEqual(normalize_text("(x+1)/2"), normalize_text(r"\frac{x+1}{2}"))
        self.assertEqual(normalize_text("2/(x+1)"), normalize_text(r"\frac{2}{x+1}"))
        self.assertEqual(normalize_text(r"\frac{(x+1)}{2}"), normalize_text("(x+1)/2"))
        self.assertNotIn("((", normalize_text("(x+1)/2"))
        # function call is not a fraction operand
        self.assertEqual(normalize_text("f(x)/2"), "f(x)/2")

    def test_mixed_number_equal(self):
        self.assertEqual(normalize_text("1½"), normalize_text("1 1/2"))
        self.assertNotEqual(normalize_text("1½"), normalize_text("½"))

    def test_latex_aliases(self):
        pairs = [
            (r"\frac12", r"\frac{1}{2}"),
            (r"\sqrt2", r"\sqrt{2}"),
            (r"x \lt 3", "x < 3"),
            (r"x \gt 3", "x > 3"),
            ("x>=3", "x ≥ 3"),
            ("x<=3", "x ≤ 3"),
            (r"\pi r^2", "π r²"),
            (r"50\%", "50%"),
            (r"\$5", "5"),
        ]
        for a, b in pairs:
            self.assertEqual(normalize_text(a), normalize_text(b), (a, b))

    def test_idempotent_malformed(self):
        for s in [r"\sqrt${x}", r"\frac${1}{2}", r"\sqrt{\sqrt${x}}", "x^${2}"]:
            once = normalize_text(s)
            self.assertEqual(normalize_text(once), once, s)
        self.assertEqual(normalize_text(r"\sqrt${x}"), normalize_text("√(x)"))


class StripMarkupTests(unittest.TestCase):
    def test_strip_markup_spans(self):
        text, spans = strip_markup("a <u>bc</u> d ______")
        self.assertEqual(text, "a bc d ______")
        self.assertEqual(spans, ((2, 4, "u"), (7, 13, "blank")))

    def test_italic_span(self):
        text, spans = strip_markup("the <i>Odyssey</i> ends")
        self.assertEqual(text, "the Odyssey ends")
        self.assertEqual(spans, ((4, 11, "i"),))

    def test_blank_is_fixed_token(self):
        self.assertEqual(strip_markup("a ____ b __________ c"), ("a ______ b ______ c", ((2, 8, "blank"), (11, 17, "blank"))))
        self.assertEqual(normalize_text("x ____ y"), normalize_text("x ________ y"))

    def test_short_underscore_run_is_not_blank(self):
        self.assertEqual(strip_markup("a ___ b"), ("a ___ b", ()))

    def test_no_markup(self):
        self.assertEqual(strip_markup("plain"), ("plain", ()))


class MathTokensTests(unittest.TestCase):
    def test_math_tokens(self):
        self.assertEqual(math_tokens("slope is −3"), ("-", "3"))
        self.assertEqual(math_tokens("slope is 3"), ("3",))

    def test_decimal_one_token(self):
        self.assertEqual(math_tokens("2.4 cm"), ("2.4",))

    def test_variables_and_operators(self):
        self.assertEqual(math_tokens("x² = 4"), ("x", "^", "2", "=", "4"))
        self.assertNotEqual(math_tokens("x2"), math_tokens("x²"))

    def test_words_are_not_tokens(self):
        self.assertEqual(math_tokens("the quick fox"), ())


if __name__ == "__main__":
    unittest.main()
