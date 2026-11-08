"""Automatic first pass over close-match pairs (made-up text only, never College Board text)."""

import json
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from kimport import autopairs, pairs_page
from kimport.normalize import NORMALIZER_VERSION
from tests.test_pairs_page import cluster_doc

CHOICES = ["It was rainy.", "It was sunny.", "It was windy.", "It was foggy."]


def q(text, choices=CHOICES, answer="It was sunny.", fmt="mc"):
    return {"text": text, "choices": list(choices), "answer": answer, "answer_format": fmt}


def group(a, b, vocab=None):
    return autopairs.classify(a, b, vocab)["group"]


BASE = "Mira walked her dog past the old mill on a Tuesday morning.\nWhich choice best describes the weather?"


class FormattingIsSame(unittest.TestCase):
    def test_identical(self):
        self.assertEqual(group(q(BASE), q(BASE)), "same")

    def test_quotes_italics_dashes_spacing(self):
        a = q("Mira’s dog—a terrier—ran past the <i>Old Mill</i> , then stopped.\nWhich choice is best?")
        b = q("Mira's dog --- a terrier --- ran past the Old Mill, then stopped.\n\nWhich choice is best?")
        self.assertEqual(group(a, b), "same")

    def test_question_number_and_section_lines(self):
        a = q("12\n\n" + BASE)
        b = q("Section 1, Module 2: Reading and Writing\n" + BASE + "\nAnswer:")
        self.assertEqual(group(a, b), "same")

    def test_latex_and_unicode_math(self):
        a = q(r"If \(x^{2} = 49\) and \(x > 0\), what is \(\frac{x}{7}\)?", ["1", "7", "14", "49"], "1")
        b = q("If x² = 49 and x > 0, what is x/7?", ["7", "1", "49", "14"], "1")
        self.assertEqual(group(a, b), "same")

    def test_underline_label_equals_tag(self):
        a = q("The pond froze early. <u>The ducks left the next day.</u> Which choice is best?")
        b = q("The pond froze early. [Underlined portion: The ducks left the next day.] Which choice is best?")
        c = q("The pond froze early. [[u]]The ducks left the next day.[[/u]] Which choice is best?")
        self.assertEqual(group(a, b), "same")
        self.assertEqual(group(a, c), "same")

    def test_blank_length_and_label(self):
        a = q("The baker was tired; ____ she kept working.\nWhich choice completes the text?")
        b = q("The baker was tired; ______ blank she kept working.\nWhich choice completes the text?")
        self.assertEqual(group(a, b), "same")

    def test_bullets_and_markdown_italics(self):
        a = q("Notes:\n• The kite is red.\n• It flew in *Spring Park*.\nWhich choice is best?")
        b = q("Notes:\n- The kite is red.\n- It flew in Spring Park.\nWhich choice is best?")
        self.assertEqual(group(a, b), "same")

    def test_prompt_printed_before_the_passage(self):
        prompt = "Which choice most logically completes the text?"
        passage = "The garden club planted tulips along the fence every autumn."
        self.assertEqual(group(q(prompt + "\n" + passage), q(passage + "\n" + prompt)), "same")

    def test_choice_order_ignored(self):
        self.assertEqual(group(q(BASE), q(BASE, list(reversed(CHOICES)))), "same")


class TyposAreSame(unittest.TestCase):
    def test_one_letter_scan_typo(self):
        a = q("Mira walked her dog past the old mill on a Tuesday morning. Which choice is best?")
        b = q("Mira walked her dog past the old mlll on a Tuesday morning. Which choice is best?")
        self.assertEqual(group(a, b), "same")

    def test_split_word(self):
        a = q("The notable painter lived by the sea. Which choice is best?")
        b = q("The not able painter lived by the sea. Which choice is best?")
        self.assertEqual(group(a, b), "same")

    def test_too_many_typo_spots_is_unclear(self):
        a = q("The quick fox jumped over the lazy hound beside the barn near the river.")
        b = q("The qulck fox jumped ovcr the lazy hound bes1de the barn ncar the river.")
        self.assertEqual(group(a, b), "unclear")


class RealDifferences(unittest.TestCase):
    def test_number(self):
        a = q("A box holds 5 apples. How many apples are in 3 boxes?", ["8", "15", "20", "25"], "15")
        b = q("A box holds 11 apples. How many apples are in 3 boxes?", ["8", "15", "20", "25"], "15")
        self.assertEqual(group(a, b), "different")

    def test_name(self):
        a = q("Biologist Tara Venn studied the almond moth in Spain. Which choice is best?")
        b = q("Biologist Tara Venn studied the oyster moth in Spain. Which choice is best?")
        self.assertEqual(group(a, b), "different")

    def test_species_name(self):
        a = q("The parasite Zorvex sp. lives in the gut of the fish. Which choice is best?")
        b = q("The parasite Quandelia sp. lives in the gut of the fish. Which choice is best?")
        self.assertEqual(group(a, b), "different")

    def test_variable(self):
        a = q("If 2x + 3 = 11, what is the value of x?", ["2", "4", "6", "8"], "4")
        b = q("If 2y + 3 = 11, what is the value of x?", ["2", "4", "6", "8"], "4")
        self.assertEqual(group(a, b), "different")

    def test_meaning_word(self):
        a = q("Prices tend to increase in winter. Which choice is best?")
        b = q("Prices tend to decrease in winter. Which choice is best?")
        self.assertEqual(group(a, b), "different")

    def test_choice_differs(self):
        other = ["It was rainy.", "It was sunny.", "It was snowy and cold.", "It was foggy."]
        self.assertEqual(group(q(BASE), q(BASE, other)), "different")

    def test_different_correct_answer(self):
        self.assertEqual(group(q(BASE), q(BASE, answer="It was rainy.")), "different")

    def test_underline_moved(self):
        a = q("<u>The pond froze early.</u> The ducks left the next day. Which choice is best?")
        b = q("The pond froze early. <u>The ducks left the next day.</u> Which choice is best?")
        self.assertEqual(group(a, b), "different")


class Unclear(unittest.TestCase):
    def test_blank_on_one_side(self):
        a = q("The baker was tired; ______ she kept working.")
        b = q("The baker was tired; she kept working.")
        self.assertEqual(group(a, b), "unclear")

    def test_missing_sentence(self):
        a = q("The pond froze early. The ducks left the next day. Which choice is best?")
        b = q("The pond froze early. Which choice is best?")
        self.assertEqual(group(a, b), "unclear")

    def test_extra_choice(self):
        self.assertEqual(group(q(BASE), q(BASE, CHOICES[:3])), "unclear")

    def test_punctuation_only(self):
        a = q("The baker was tired, she kept working.")
        b = q("The baker was tired; she kept working.")
        self.assertEqual(group(a, b), "unclear")

    def test_two_real_words(self):
        vocab = autopairs.Words({"small": 9, "smell": 9})
        a = q("The small shop sold bread. Which choice is best?")
        b = q("The smell shop sold bread. Which choice is best?")
        self.assertEqual(group(a, b, vocab), "unclear")
        self.assertEqual(group(a, b, autopairs.Words()), "same")  # without the word list it reads as a typo

    def test_superscript_lost_is_not_same(self):
        a = q("What is x² when x = 3?", ["6", "9", "12", "27"], "9")
        b = q("What is x 2 when x = 3?", ["6", "9", "12", "27"], "9")
        self.assertEqual(group(a, b), "unclear")

    def test_typo_inside_underline(self):
        a = q("The pond froze. <u>The ducks left early.</u> Which choice is best?")
        b = q("The pond froze. <u>The ducks lcft early.</u> Which choice is best?")
        self.assertEqual(group(a, b), "unclear")

    def test_text_relies_on_a_table(self):
        t = "The table shows the rainfall in four towns. Which choice best describes data from the table?"
        self.assertEqual(group(q(t), q(t)), "unclear")

    def test_format_mismatch(self):
        self.assertEqual(group(q("What is 2 + 2?", [], "4", "numeric"), q("What is 2 + 2?", ["4", "5"], "4")), "unclear")


def side(n, cid, text, choices=CHOICES, answer="It was sunny.", live=False):
    return {"id": f"x{n}", "cluster_id": cid, "is_live": live, "text": text, "choices": list(choices),
            "answer": answer, "answer_format": "mc"}


def fpair(pid, a, b, ca, cb, ta, tb):
    return {"pair_id": pid, "ratio": 0.95, "answer": "it was sunny.",
            "canonical": side(a, ca, ta), "member": side(b, cb, tb)}


class Files(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.pairs = [
            fpair("fp-1", 1, 2, "kc-1", "kc-2", BASE, BASE.replace("’", "'")),
            fpair("fp-2", 3, 4, "kc-3", "kc-4", "A box holds 5 apples.", "A box holds 11 apples."),
            fpair("fp-3", 5, 6, "kc-5", "kc-6", "The baker was tired; ______ she kept working.",
                  "The baker was tired; she kept working."),
            fpair("fp-4", 7, 8, "kc-7", "kc-8", "Kites fly high in spring.", "Kites fly high in spring."),
        ]
        self.pairs_json = self.write("founder_pairs.json", {"normalizer_version": NORMALIZER_VERSION,
                                                            "ratio_threshold": 0.9, "pair_count": 4,
                                                            "pairs": self.pairs})
        self.clusters = self.write("clusters.json", cluster_doc(
            {f"kc-{n}": [n] for n in range(1, 9)},
            {"kc-1": ["fp-1"], "kc-2": ["fp-1"], "kc-3": ["fp-2"], "kc-4": ["fp-2"], "kc-5": ["fp-3"],
             "kc-6": ["fp-3"], "kc-7": ["fp-4"], "kc-8": ["fp-4"]}))
        self.log = self.write("founder_decisions.json", {"x7|x8": {"decision": "same", "at": "2026-10-20T00:00:00Z"}})

    def write(self, name, obj):
        p = self.dir / name
        p.write_text(json.dumps(obj), encoding="utf-8")
        return p

    def test_outputs_and_apply_format(self):
        out = self.dir / "auto-pairs"
        res = autopairs.write_outputs(self.pairs_json, out, self.clusters, self.log, n_sample=8, seed=1)
        self.assertEqual(res["counts"], {"same": 1, "different": 1, "unclear": 1})
        self.assertEqual(res["skipped"], 1)  # fp-4 is already in the log
        proposed = json.loads((out / "decisions-proposed.json").read_text(encoding="utf-8"))
        self.assertEqual(proposed, {"fp-1": "same", "fp-2": "different"})
        for g in autopairs.GROUPS:
            rows = json.loads((out / f"{g}.json").read_text(encoding="utf-8"))
            self.assertEqual(set(rows[0]) >= {"pair_id", "key", "canonical_id", "member_id", "ratio", "diff"}, True)
        self.assertEqual(res["released"]["both"]["member_ids"], 2)
        md = (out / "sample.md").read_text(encoding="utf-8")
        self.assertIn("| same | 1 | 1 |", md)
        self.assertIn("“5” vs “11”", md)
        # the proposal file is exactly what `k pairs apply` reads (run here on the made-up copy only)
        pairs_page.apply_decisions(self.pairs_json, out / "decisions-proposed.json", self.clusters, self.log,
                                   "2026-10-22T00:00:00Z")
        log = json.loads(self.log.read_text(encoding="utf-8"))
        self.assertEqual({k: v["decision"] for k, v in log.items()},
                         {"x1|x2": "same", "x3|x4": "different", "x7|x8": "same"})

    def test_contradicting_proposals_move_to_unclear(self):
        rows = {"same": [{"canonical_id": "a", "member_id": "b", "reason": "r"},
                         {"canonical_id": "b", "member_id": "c", "reason": "r"}],
                "different": [{"canonical_id": "a", "member_id": "c", "reason": "r"},
                              {"canonical_id": "d", "member_id": "e", "reason": "r"}], "unclear": []}
        self.assertEqual(autopairs._resolve_conflicts(rows), 3)
        self.assertEqual([len(rows[g]) for g in autopairs.GROUPS], [0, 1, 3])

    def test_vocab_counts_each_occurrence_once(self):
        pairs = [fpair("fp-1", 1, 2, "k1", "k2", "red kite", "red kite"),
                 fpair("fp-2", 1, 3, "k1", "k3", "red kite", "blue kite")]
        v = autopairs.build_vocab(pairs, word_list=None)
        self.assertEqual((v["red"], v["blue"], v["kite"]), (2, 1, 3))
        self.assertIsInstance(v, Counter)


if __name__ == "__main__":
    unittest.main()
