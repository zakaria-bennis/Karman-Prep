"""Corpus clustering. Ports every case of task-6 test_dedup.py and
parallel-g/test_matching_boundary.py (+ matching-boundary-cases.json), all with
made-up text. Where kimport's one normalizer or typo rule (spec 5.1 / 5.2)
deliberately decides differently from dedup.py, the test says so."""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from kimport import lint
from kimport.corpus import GOAL, ROLES, check_certified, cluster, report_md, run_corpus, write_outputs
from kimport.corpus_load import VISUAL_REASON, load_corpus, parse_text, record_from_question
from kimport.normalize import NORMALIZER_VERSION
from kimport.sweep import record_from_row
from tests.corpus_fixtures import build_tree, mc, q, rec, ref
from tests.export_fixtures import write_export

CLI = Path(__file__).resolve().parent.parent / "kimport-cli.py"
CASES = Path(__file__).resolve().parent / "fixtures" / "matching_boundary_cases.json"


def run(questions, live=None):
    return cluster([record_from_question(x, ref=f"{x['exam_id']}_{x['question_id']}") for x in questions], live)


def members(res) -> int:
    """dedup.py's safe_duplicate_occurrences: copies merged beyond one per cluster."""
    return sum(1 for r in res.roles.values() if r == "member")


def disputes(res) -> int:
    return sum(1 for c in res.clusters if c["status"] == "answer_dispute")


def cluster_of(res, r):
    found = [c["cluster_id"] for c in res.clusters if r in [m["id"] for m in c["members"]]]
    return found[0] if found else None


def same(res, a, b) -> bool:
    return cluster_of(res, a) is not None and cluster_of(res, a) == cluster_of(res, b)


def uid(n: int) -> str:
    return f"00000000-0000-4000-8000-{n:012d}"


def live_row(n, text, choices=("alpha", "beta", "gamma", "delta"), answer="A", **kw):
    row = {"id": uid(n), "question_text": text, "correct_answer": answer, "question_format": "multiple_choice",
           "figure_kind": None, "figure_table_data": None, "publish_status": "publish_ready",
           "import_status": "ok", "is_live": True, "created_at": f"2026-01-{n:02d}T00:00:00+00:00",
           "choices": [{"letter": "ABCD"[i], "choice_text": c} for i, c in enumerate(choices)]}
    row.update(kw)
    return row


# ------------------------------------------------------------------ ported: test_dedup.DedupTests


class DedupTests(unittest.TestCase):
    def test_shuffled_choices_and_key_content(self):
        a = q(1, "Passage.\nQuestion?\nA) 2\nB) 3", "A")
        b = q(2, "Passage.\nQuestion?\nA) 3\nB) 2", "B")
        r = run([a, b])
        self.assertEqual(members(r), 1)
        self.assertTrue(same(r, "exam1_q1", "exam2_q2"))

    def test_reused_passage_and_meaningful_difference(self):
        a = q(1, "Passage.\nWhich is true?\nA) yes\nB) no")
        b = q(2, "Passage.\nWhich is NOT true?\nA) yes\nB) no")
        c = q(3, "Passage.\nWhich is true?\nA) yes\nB) no", "A", reviewed_material_signature="figure 1")
        r = run([a, b, c])
        self.assertEqual(len(r.clusters), 3)
        self.assertEqual(members(r), 0)

    def test_conflicting_key_and_duplicate_options(self):
        a = q(1, "Question?\nA) yes\nB) yes\nC) no", "A")
        b = q(2, "Question?\nA) yes\nB) yes\nC) no", "C")
        r = run([a, b])
        self.assertEqual(disputes(r), 1)

    def test_numeric_and_visual_hold(self):
        a = q(1, "What is x?", numeric_answer="0.5", question_type="numeric_response")
        b = q(2, "What is x?", numeric_answer="1/2", question_type="numeric_response")
        c = q(3, "See figure. What is x?", numeric_answer="1/2", question_type="numeric_response")
        r = run([a, b, c])
        self.assertEqual(members(r), 1)
        self.assertEqual(r.roles["exam3_q3"], "figure_review")
        fig = [c for c in r.clusters if c["status"] == "figure_review"][0]
        self.assertEqual(fig["members"][0]["reason"], VISUAL_REASON)


# ------------------------------------------------------------------ ported: test_dedup.CriticalCases


class CriticalCases(unittest.TestCase):
    def test_textual_differences(self):
        base = "Passage.\nWhich value is underlined?\nA) 2\nB) 3"
        variants = [base.replace("underlined", "NOT underlined"), base.replace("underlined", "underlined!"),
                    base.replace("2", "4"), base.replace("Passage.", "Passage!"),
                    base.replace("underlined", "blank")]
        for i, v in enumerate(variants):
            with self.subTest(i=i):
                self.assertEqual(members(run([q(1, base), q(2, v)])), 0)

    def test_which_to_what_is_a_typo_level_match(self):
        # dedup.py kept these apart; spec 5.2 (one 3-character spot, no meaning
        # word, no math token) makes it a typo-level match, merged automatically.
        base = "Passage.\nWhich value is underlined?\nA) 2\nB) 3"
        r = run([q(1, base), q(2, base.replace("Which value", "What value"))])
        self.assertEqual(members(r), 1)
        self.assertEqual([m["match"] for m in r.clusters[0]["members"]], ["canonical", "ocr_typo"])

    def test_duplicate_choice_multiset(self):
        a = q(1, "Stem?\nA) 2\nB) 2\nC) 3")
        b = q(2, "Stem?\nA) 2\nB) 3\nC) 2")
        c = q(3, "Stem?\nA) 2\nB) 3\nC) 3")
        self.assertEqual(members(run([a, b])), 1)
        self.assertEqual(members(run([a, c])), 0)

    def test_table_and_figure_data(self):
        a = q(1, "| x | y |\n| 1 | 2 |\nStem?\nA) 2\nB) 3")
        b = q(2, "| x | y |\n| 1 | 4 |\nStem?\nA) 2\nB) 3")
        self.assertEqual(members(run([a, b])), 0)
        f1 = q(3, "See figure. Stem?\nA) 2\nB) 3", reviewed_material_signature="axes x=1,y=2")
        f2 = q(4, "See figure. Stem?\nA) 2\nB) 3", reviewed_material_signature="axes x=1,y=4")
        self.assertEqual(members(run([f1, f2])), 0)

    def test_harmless_math_format(self):
        a = q(1, "Evaluate \\dfrac{1}{2}.\nA) 1\nB) 2")
        b = q(2, "Evaluate  \\frac{1}{2}.\nA) 1\nB) 2")
        self.assertEqual(members(run([a, b])), 1)

    def test_unicode_math_notation_is_not_collapsed(self):
        for left, right in [("x²", "x2"), ("x₂", "x2"), ("x²", "x₂"), ("m²", "m2"), ("x³", "x²")]:
            with self.subTest(left=left, right=right):
                a = q(1, f"Evaluate {left}.\nA) 4\nB) 8")
                b = q(2, f"Evaluate {right}.\nA) 4\nB) 8")
                self.assertEqual(members(run([a, b])), 0)

    def test_other_semantic_boundaries(self):
        for left, right in [("not valid", "valid"), ("4 meters", "5 meters"), ("<u>first</u>", "<u>second</u>"),
                            ("x^2", "x^3")]:
            with self.subTest(left=left, right=right):
                a = q(1, f"Which is {left}?\nA) yes\nB) no")
                b = q(2, f"Which is {right}?\nA) yes\nB) no")
                self.assertEqual(members(run([a, b])), 0)

    def test_blank_length_is_one_token(self):
        # dedup.py treated a 5- and an 11-underscore blank as different; kimport's
        # normalizer compares every blank (4+ underscores) as one token.
        a = q(1, "Which is _____?\nA) yes\nB) no")
        b = q(2, "Which is ___________?\nA) yes\nB) no")
        self.assertEqual(members(run([a, b])), 1)

    def test_numeric_prompt_and_answer(self):
        a = q(1, "Find x.", question_type="numeric_response", numeric_answer="0.5")
        b = q(2, "Find x.", question_type="numeric_response", numeric_answer="1/2")
        c = q(3, "Find y.", question_type="numeric_response", numeric_answer="1/2")
        d = q(4, "Find x.", question_type="numeric_response", numeric_answer="2")
        self.assertEqual(members(run([a, b])), 1)
        self.assertEqual(members(run([a, c])), 0)
        self.assertEqual(disputes(run([a, d])), 1)


# ------------------------------------------------------------------ ported: test_dedup.VersionInvalidation


class VersionInvalidation(unittest.TestCase):
    def tree(self, d, **kw):
        return build_tree(Path(d), [{"id": "SYN_V1_MATH_M1_Q01", "text": mc("Pick one."), **kw}])

    def test_changed_c_hash_invalidates(self):
        with tempfile.TemporaryDirectory() as d:
            ip, lp = self.tree(d)
            folder = Path(json.loads(ip.read_text())[0]["C_output_path"])
            (folder / "corrected.txt").write_text(mc("Pick two.") + "\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "C content changed"):
                load_corpus(ip, lp)

    def test_changed_b_version_invalidates(self):
        with tempfile.TemporaryDirectory() as d:
            ip, lp = self.tree(d)
            (Path(d) / "B" / "SYN_V1_MATH_M1_Q01" / "version.json").write_text(
                json.dumps({"final_version_sha256": "0" * 64}), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "B pointer changed"):
                load_corpus(ip, lp)


# ------------------------------------------------------------------ ported: test_dedup.TrailingMetadata


class TrailingMetadata(unittest.TestCase):
    def test_page_and_none_notes_after_choices(self):
        base = "Which word?\nA. was\nB. were"
        for i, tail in enumerate(["\n[Page number at bottom: 35.]", "\nPrinted page number: 20.",
                                  "\nFigures/tables: none."]):
            with self.subTest(tail=tail):
                self.assertEqual(members(run([q(1, base, key="A"), q(i + 2, base + tail, key="A")])), 1)

    def test_underlining_note_is_not_discarded(self):
        base = "Which word?\nA. was\nB. were"
        note = "\nFigures/tables: none. The word “was” is underlined."
        r = run([q(1, base), q(2, base + note)])
        self.assertEqual(r.roles["exam2_q2"], "unparsed")
        self.assertEqual(r.unparsed[0]["reason"], "choice_parse_ambiguous")


# ------------------------------------------------------------------ ported: parallel-g boundary cases


class MatchingBoundary(unittest.TestCase):
    def test_saved_boundary_cases(self):
        cases = json.loads(CASES.read_text(encoding="utf-8"))
        r = cluster([record_from_question(x, ref=x["question_id"]) for x in cases])
        self.assertEqual(len(r.roles), 14)
        self.assertNotIn("unparsed", r.roles.values())
        self.assertTrue(same(r, "exact_A", "exact_B") and same(r, "exact_A", "stem_A"))
        self.assertTrue(same(r, "shuffle_A", "shuffle_B"))
        self.assertTrue(same(r, "numeric_A", "numeric_B"))
        for a, b in [("stem_A", "stem_B"), ("number_A", "number_B"), ("figure_A", "figure_B")]:
            self.assertFalse(same(r, a, b), (a, b))
        # dedup.py kept "points"/"point" apart; under spec 5.2 it is a typo-level match.
        self.assertTrue(same(r, "wording_A", "wording_B"))
        self.assertEqual(len(r.clusters), 9)


# ------------------------------------------------------------------ new clustering rules


TYPO_A = mc("Rainfall over the coastal valley gathered slowly during the warm seasonal months of the year.")
TYPO_B = TYPO_A.replace("coastal", "costal").replace("slowly", "slowy")
TYPO_C = TYPO_B.replace("months", "monts")
LONG = ("The committee reviewed the annual budget report and found that the {} expensive program was the "
        "library renovation project in the downtown district near the old river bridge.")


class ClusterRules(unittest.TestCase):
    def mixed(self):
        return [
            rec(1, mc("Which tool cuts wood?")),
            rec(2, mc("Which tool cuts wood?")),
            rec(3, TYPO_A), rec(4, TYPO_B),
            rec(5, mc("Same text, two keys?"), key="A"), rec(6, mc("Same text, two keys?"), key="B"),
            rec(7, mc("The graph shows a line. Which value?")),
            rec(8, "Broken\nA) one\nA) two"),
            rec(9, mc(LONG.format("most"))), rec(10, mc(LONG.format("least"))),
        ]

    def test_one_role_per_occurrence(self):
        recs = self.mixed()
        r = cluster(recs)
        self.assertEqual(set(r.roles), {x.ref for x in recs})
        self.assertTrue(set(r.roles.values()) <= set(ROLES))
        listed = [m["id"] for c in r.clusters for m in c["members"]] + [u["id"] for u in r.unparsed]
        self.assertEqual(sorted(listed), sorted(x.ref for x in recs))
        self.assertEqual(r.roles[ref(8)], "unparsed")
        self.assertEqual(r.roles[ref(7)], "figure_review")
        self.assertEqual({r.roles[ref(5)], r.roles[ref(6)]}, {"pending_answer_dispute"})
        self.assertEqual({r.roles[ref(9)], r.roles[ref(10)]}, {"founder_review"})

    def test_no_cluster_two_canonicals(self):
        recs = self.mixed() + [rec(11, mc("Which tool cuts wood?"), is_live=True),
                               rec(12, mc("Which tool cuts wood?"), is_live=True)]
        r = cluster(recs)
        for c in r.clusters:
            canon = [m["id"] for m in c["members"] if r.roles[m["id"]] in ("canonical", "founder_review")
                     and m["id"] == c["canonical"]]
            self.assertLessEqual(len([m for m in c["members"] if r.roles[m["id"]] == "canonical"]), 1, c)
            self.assertLessEqual(len(canon), 1)
        self.assertEqual(sum(v == "canonical" for v in r.roles.values()),
                         sum(1 for c in r.clusters if c["canonical"] and r.roles[c["canonical"]] == "canonical"))

    def test_live_member_is_canonical(self):
        r = cluster([rec(1, mc("Name the color.")), rec(2, mc("Name the color."), meta={"holds": []}),
                     rec(3, mc("Name the color."), is_live=True, meta={"holds": ["x", "y", "z"]})])
        self.assertEqual(r.roles[ref(3)], "canonical")
        self.assertEqual([r.roles[ref(1)], r.roles[ref(2)]], ["member", "member"])
        # a live export row beats a live-linked occurrence
        row = record_from_row(live_row(1, "Name the color."))
        r = cluster([rec(1, mc("Name the color."), is_live=True)], [row])
        self.assertEqual(r.roles[uid(1)], "canonical")
        self.assertEqual(r.roles[ref(1)], "member")

    def test_near_never_chains(self):
        # close but not typo-level (a meaning word differs): three founder pairs, no merge
        r = cluster([rec(1, mc(LONG.format("most"))), rec(2, mc(LONG.format("least"))),
                     rec(3, mc(LONG.format("more")))])
        self.assertEqual(len(r.clusters), 3)
        self.assertEqual(len(r.founder_pairs), 3)
        self.assertEqual(members(r), 0)
        # typo chain A~B, B~C, A not~ C: C never joins A's cluster through B
        r = cluster([rec(1, TYPO_A), rec(2, TYPO_B), rec(3, TYPO_C)])
        self.assertTrue(same(r, ref(1), ref(2)))
        self.assertFalse(same(r, ref(1), ref(3)))
        self.assertEqual([(p["canonical"]["id"], p["member"]["id"]) for p in r.founder_pairs], [(ref(1), ref(3))])

    def test_key_conflict_goes_to_dispute(self):
        r = cluster([rec(1, mc("Pick the tree.")), rec(2, mc("Pick the tree.")),
                     rec(3, mc("Pick the tree."), key="C")])
        self.assertEqual(disputes(r), 1)
        self.assertEqual({r.roles[ref(n)] for n in (1, 2, 3)}, {"pending_answer_dispute"})
        self.assertEqual(r.founder_pairs, [])
        # a live copy in a dispute stays canonical; the others wait
        r = cluster([rec(1, mc("Pick the tree."), is_live=True), rec(3, mc("Pick the tree."), key="C")])
        self.assertEqual((r.roles[ref(1)], r.roles[ref(3)]), ("canonical", "pending_answer_dispute"))

    def test_election_order(self):
        gen, off = {"kind": "independently_confirmed_generated"}, {"kind": "official"}
        r = cluster([rec(1, mc("Count the hens."), meta={"reviewed_answer": gen}),
                     rec(2, mc("Count the hens."), meta={"reviewed_answer": off, "holds": ["a", "b"]}),
                     rec(3, mc("Count the hens."), meta={"reviewed_answer": off, "holds": ["a"]})])
        self.assertEqual(r.clusters[0]["canonical"], ref(3))
        r = cluster([rec(5, mc("Count the hens.")), rec(4, mc("Count the hens."))])
        self.assertEqual(r.clusters[0]["canonical"], ref(4))
        self.assertEqual([m["id"] for m in r.clusters[0]["members"]], [ref(4), ref(5)])

    def test_typo_copies_cannot_outvote_clean_copy(self):
        clean = mc("The river carried sediment toward the delta every spring season.")
        typo = clean.replace("river", "rivar")
        outside = rec(9, mc("A river of numbers flows through every city at night.", ("p", "q", "r", "s")))
        r = cluster([rec(1, typo), rec(2, typo), rec(3, typo), rec(4, clean), outside])
        c = [c for c in r.clusters if ref(4) in [m["id"] for m in c["members"]]][0]
        self.assertEqual(c["canonical"], ref(4))
        self.assertEqual(len(c["members"]), 4)
        # no outside evidence: a tie, recorded, lowest id wins
        r = cluster([rec(1, typo), rec(4, clean)])
        self.assertTrue(r.clusters[0]["keeper_tie"])

    def test_figure_never_merges(self):
        r = cluster([rec(1, mc("The graph shows a line. Which slope?")),
                     rec(2, mc("The graph shows a line. Which slope?"))])
        self.assertEqual(len(r.clusters), 1)
        self.assertEqual(r.clusters[0]["status"], "figure_review")
        self.assertIsNone(r.clusters[0]["canonical"])
        self.assertEqual({r.roles[ref(1)], r.roles[ref(2)]}, {"figure_review"})
        row = record_from_row(live_row(1, "Which slope?", figure_kind="graph"))
        r = cluster([rec(1, mc("Which slope?"))], [row])
        self.assertEqual(r.roles[uid(1)], "canonical")
        self.assertEqual(r.roles[ref(1)], "canonical")  # never merged with the figure row
        self.assertFalse(same(r, ref(1), uid(1)))

    def test_founder_pair_needs_same_answer_and_no_figure(self):
        r = cluster([rec(1, mc(LONG.format("most"))), rec(2, mc(LONG.format("least")), key="B")])
        self.assertEqual(r.founder_pairs, [])
        r = cluster([rec(1, mc(LONG.format("most") + " See figure.")), rec(2, mc(LONG.format("least")))])
        self.assertEqual(r.founder_pairs, [])

    def test_members_match_their_canonical(self):
        r = cluster([rec(1, TYPO_A), rec(2, TYPO_B), rec(3, TYPO_C), rec(4, TYPO_A)])
        for c in r.clusters:
            for m in c["members"][1:]:
                self.assertIn(m["match"], ("exact", "ocr_typo"))

    def test_counts_and_report(self):
        recs = [rec(1, mc("Which tool cuts wood?"), is_live=True), rec(2, mc("Which tool cuts wood?")),
                rec(3, mc("Which bird sings?")), rec(4, mc("The graph shows a bird. Which?")),
                rec(5, "Broken\nA) one\nA) two")]
        r = cluster(recs)
        self.assertEqual((r.counts["occurrences"], r.counts["unique"], r.counts["live_unique"],
                          r.counts["unique_not_live"], r.counts["unparsed"]), (5, 3, 1, 2, 1))
        text = report_md(r)
        self.assertIn("10,000", text)
        self.assertIn(f"{GOAL - 3:,}", text)

    def test_outputs_feed_lint(self):
        r = cluster([rec(1, mc("Which tool cuts wood?")), rec(2, mc("Which tool cuts wood?"))])
        with tempfile.TemporaryDirectory() as d:
            write_outputs(r, Path(d))
            doc = json.loads((Path(d) / "clusters.json").read_text(encoding="utf-8"))
            self.assertEqual(doc["normalizer_version"], NORMALIZER_VERSION)
            self.assertIn("export_sha256", doc)
            self.assertTrue((Path(d) / "founder_pairs.json").exists() and (Path(d) / "report.md").exists())
            self.assertEqual(lint._check_dedup({"stable_question_id": ref(1)}, doc), [])
            self.assertEqual(lint._check_dedup({"stable_question_id": ref(2)}, doc),
                             ["cluster role is 'member', not canonical"])


# ------------------------------------------------------------------ loader + end to end


SYN = "SYN_V{}_MATH_M1_Q{:02d}"


class LoaderTests(unittest.TestCase):
    def test_loads_ledger_universe(self):
        with tempfile.TemporaryDirectory() as d:
            ip, lp = build_tree(Path(d), [
                {"id": SYN.format(1, 1), "text": mc("Pick the oak."), "key": "C", "live_rows": [uid(1)],
                 "holds": ["h1"]},
                {"id": SYN.format(2, 1), "text": mc("Pick the elm."), "acceptance": "generated", "key": "B",
                 "strip_newline_hash": True},
                {"id": SYN.format(3, 1), "text": mc("Pick the ash."), "ledger_b_version": "newer"},
                {"id": SYN.format(4, 1), "text": mc("The value is shown. Pick it.")},
            ], extra_ledger=[{"id": SYN.format(5, 1)}])
            recs = {r.ref: r for r in load_corpus(ip, lp)}
        self.assertEqual(len(recs), 5)
        a = recs[SYN.format(1, 1)]
        self.assertEqual((a.answer, a.answer_format, a.is_live), ("gamma", "mc", True))
        self.assertEqual((a.meta["holds"], a.meta["reviewed_answer"]["kind"]), (["h1"], "official"))
        b = recs[SYN.format(2, 1)]
        self.assertEqual((b.answer, b.meta["reviewed_answer"]["kind"]), ("beta", "independently_confirmed_generated"))
        self.assertEqual(recs[SYN.format(3, 1)].meta["reason"], "corrected_text_for_older_b_version")
        self.assertEqual(recs[SYN.format(4, 1)].meta["status"], "figure")
        self.assertEqual(recs[SYN.format(5, 1)].meta["reason"], "no_corrected_text")

    def test_parse_text_strips_question_number_and_notes(self):
        p = parse_text("12\nStem here?\nA) one\nB) two\nPrinted page number: 3.")
        self.assertEqual((p["body"], p["choices"]), ("Stem here?", [("A", "one"), ("B", "two")]))


class CertifiedAndCli(unittest.TestCase):
    def tree(self, d, dup_text):
        return build_tree(Path(d), [
            {"id": SYN.format(1, 1), "text": mc("Which shape has four equal sides?"), "live_rows": [uid(1)]},
            {"id": SYN.format(2, 1), "text": dup_text, "certified": uid(1)},
        ])

    def test_certified_duplicate_lands_with_partner(self):
        with tempfile.TemporaryDirectory() as d:
            ip, lp = self.tree(d, mc("Which shape has four equal sides?"))
            r = cluster(load_corpus(ip, lp))
        self.assertEqual(r.roles[SYN.format(2, 1)], "member")
        self.assertEqual([c["ok"] for c in check_certified(r)], [True])

    def test_certified_duplicate_lands_with_live_row(self):
        with tempfile.TemporaryDirectory() as d:
            ip, lp = self.tree(d, mc("Which shape has four equal sides?"))
            row = record_from_row(live_row(1, "Which shape has four equal sides?"))
            r = cluster(load_corpus(ip, lp), [row])
        self.assertEqual(r.roles[uid(1)], "canonical")
        self.assertEqual(check_certified(r)[0]["target"], uid(1))
        self.assertTrue(check_certified(r)[0]["ok"])

    def test_certified_mismatch_is_reported(self):
        with tempfile.TemporaryDirectory() as d:
            ip, lp = self.tree(d, mc("Which shape has five equal sides?"))
            r = cluster(load_corpus(ip, lp))
        res = check_certified(r)
        self.assertFalse(res[0]["ok"])
        self.assertIn("meaning_word", res[0]["reason"])
        self.assertIn(SYN.format(2, 1), report_md(r))

    def test_certified_partner_not_read_is_reported(self):
        with tempfile.TemporaryDirectory() as d:
            ip, lp = build_tree(Path(d), [
                {"id": SYN.format(1, 1), "text": "Broken\nA) one\nA) two", "live_rows": [uid(1)]},
                {"id": SYN.format(2, 1), "text": mc("Which shape is round?"), "certified": uid(1)},
            ])
            r = cluster(load_corpus(ip, lp))
        res = check_certified(r)
        self.assertEqual((res[0]["ok"], res[0]["target"]), (False, SYN.format(1, 1)))
        self.assertIn("target not read: choice_parse_ambiguous", res[0]["reason"])

    def test_live_rows_with_problems(self):
        rows = [live_row(1, "Pick one.", answer="E"), live_row(2, "Pick two.", figure_kind="table"),
                live_row(3, "The scatterplot is shown. Pick three."), live_row(4, "Pick four.")]
        r = cluster([], [record_from_row(x) for x in rows])
        self.assertEqual([r.roles[uid(n)] for n in (1, 2, 3, 4)], ["unparsed", "canonical", "canonical", "canonical"])
        self.assertEqual(r.unparsed[0]["reason"], "broken_answer_key")
        status = {c["members"][0]["id"]: c["status"] for c in r.clusters}
        self.assertEqual([status[uid(n)] for n in (2, 3, 4)], ["figure_review", "figure_review", "settled"])

    def test_export_decides_liveness(self):
        with tempfile.TemporaryDirectory() as d:
            ip, lp = self.tree(d, mc("Which shape has four equal sides?"))
            row = record_from_row(live_row(1, "Something else entirely.", is_live=False))
            r = cluster(load_corpus(ip, lp), [row])
        self.assertNotIn(uid(1), r.roles)
        self.assertEqual(r.counts["live_unique"], 0)

    def test_cli_corpus(self):
        with tempfile.TemporaryDirectory() as d:
            ip, lp = self.tree(d, mc("Which shape has four equal sides?"))
            exp = write_export(Path(d) / "live.json", [live_row(1, "Which shape has four equal sides?")])
            out = Path(d) / "out"
            p = subprocess.run([sys.executable, "-I", str(CLI), "corpus", "--c-index", str(ip), "--ledger", str(lp),
                                "--export", str(exp), "--out", str(out)], capture_output=True, text=True)
            self.assertEqual(p.returncode, 0, p.stderr)
            self.assertIn("corpus: 2 occurrences", p.stdout)
            doc = json.loads((out / "clusters.json").read_text(encoding="utf-8"))
            self.assertEqual(len(doc["export_sha256"]), 64)
            self.assertEqual(doc["roles"][SYN.format(2, 1)], "member")
            res = run_corpus(ip, lp, None, Path(d) / "out2")
            self.assertEqual(res["unique"], 1)


REAL_INDEX = Path("/Users/zakariabennis/Documents/Codex/2026-10-05/task-4/agent-c-output/"
                  "final-current-plus-partial-question-records-20261007.json")
REAL_LEDGER = Path("/Users/zakariabennis/Documents/Codex/2026-10-11/task-3/current-readiness-ledger.json")


@unittest.skipUnless(REAL_INDEX.exists() and REAL_LEDGER.exists(), "real task-3/task-4 inputs not present")
class RealDataSmoke(unittest.TestCase):
    def test_loader_reads_a_real_slice(self):
        items = json.loads(REAL_LEDGER.read_text(encoding="utf-8"))["items"][:40]
        with tempfile.TemporaryDirectory() as d:
            lp = Path(d) / "ledger.json"
            lp.write_text(json.dumps({"items": items}), encoding="utf-8")
            recs = load_corpus(REAL_INDEX, lp)
        self.assertEqual(len(recs), 40)
        self.assertTrue(any(r.meta["status"] == "ok" for r in recs))


if __name__ == "__main__":
    unittest.main()
