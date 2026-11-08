import json
import random
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from kimport.keys import QuestionRecord
from kimport.typo import MAX_SPOT_CHARS, MAX_SPOTS, words_within_spots
from tests.export_fixtures import export_doc, write_export
from kimport.export import export_by_id, read_export
from kimport.evidence import near_prefilter as _near_prefilter
from kimport.sweep import (
    find_live_duplicates,
    record_from_row,
    report_md,
    republish_sql,
    unpublish_sql,
)

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "export_small.json"
CLI = Path(__file__).resolve().parent.parent / "kimport-cli.py"


def uid(n: int) -> str:
    return f"00000000-0000-4000-8000-{n:012d}"


def live(ref, text, created, choices=("2", "4", "6", "8"), answer="4", is_live=True):
    return QuestionRecord(ref=ref, text=text, choices=tuple(choices), answer=answer,
                          answer_format="mc", is_live=is_live, meta={"created_at": created})


def other(ref, text):
    """An unrelated non-live exported row: only its words matter."""
    return live(ref, text, "2020-01-01T00:00:00+00:00", choices=("q", "r", "s", "t"), answer="q", is_live=False)


def load_export(path):
    return [record_from_row(r) for r in read_export(path)]


def write_rows(d, rows):
    return write_export(Path(d) / "x.json", rows)


def groups():
    return find_live_duplicates(load_export(FIXTURE))


def group_with(gs, ref):
    found = [g for g in gs if g["keep"] == ref or ref in g["remove"]
             or any(e["id"] == ref for e in g["evidence"])]
    return found[0] if found else None


class LoadExportTests(unittest.TestCase):
    def test_mc_answer_is_choice_text_and_live_needs_publish_ready(self):
        recs = {r.ref: r for r in load_export(FIXTURE)}
        self.assertEqual(len(recs), 14)
        self.assertEqual(recs[uid(1)].answer, "4")
        self.assertEqual(recs[uid(1)].answer_format, "mc")
        self.assertEqual(recs[uid(1)].choices, ("2", "4", "6", "8"))
        self.assertEqual(recs[uid(12)].answer, "To describe a routine")
        self.assertTrue(recs[uid(1)].is_live)
        self.assertFalse(recs[uid(3)].is_live)
        self.assertEqual(recs[uid(26)].answer_format, "numeric")
        self.assertEqual(recs[uid(26)].answer, "4")

    def test_is_live_column_alone_is_not_enough(self):
        rows = read_export(FIXTURE)
        rows[0]["publish_status"] = "needs_human_review"  # is_live stays true
        with tempfile.TemporaryDirectory() as d:
            p = write_export(Path(d) / "x.json", rows)
            self.assertFalse({r.ref: r for r in load_export(p)}[uid(1)].is_live)

    def test_unwraps_connector_result_row(self):
        rows = read_export(FIXTURE)
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "wrapped.json"
            p.write_text(json.dumps([{"export": export_doc(rows)}]), encoding="utf-8")
            self.assertEqual(read_export(p), rows)

    def test_live_row_with_unknown_answer_letter_excluded_and_reported(self):
        rows = read_export(FIXTURE)
        rows[1]["correct_answer"] = "E"  # uid(2), the later exact copy
        with tempfile.TemporaryDirectory() as d:
            recs = {r.ref: r for r in load_export(write_rows(d, rows))}
            self.assertTrue(recs[uid(2)].meta["answer_problem"])
            self.assertIsNone(group_with(find_live_duplicates(recs.values()), uid(2)))
            out = Path(d) / "out"
            r = subprocess.run([sys.executable, "-I", str(CLI), "sweep", "--export", str(Path(d) / "x.json"),
                                "--out", str(out)], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stderr)
            report = (out / "report.md").read_text(encoding="utf-8")
            self.assertIn("## Broken answer key", report)
            self.assertIn(uid(2), report.split("## Broken answer key")[1])
            doc = json.loads((out / "groups.json").read_text(encoding="utf-8"))
            self.assertEqual(doc["broken_answer_key"], [uid(2)])

    def test_unknown_question_format_rejected(self):
        rows = read_export(FIXTURE)
        rows[0]["question_format"] = "essay"
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):
                load_export(write_rows(d, rows))

    def test_format_mismatch_excluded_and_reported(self):
        rows = read_export(FIXTURE)
        rows[1]["question_format"] = "numeric_entry"  # uid(2): live, has choices
        rows[2]["question_format"] = "numeric_entry"  # uid(3): not live, skipped quietly
        rows[10]["question_format"] = "multiple_choice"  # uid(26): live, no choices
        with tempfile.TemporaryDirectory() as d:
            recs = load_export(write_rows(d, rows))
            gs = find_live_duplicates(recs)
            self.assertIsNone(group_with(gs, uid(2)))
            self.assertIsNone(group_with(gs, uid(1)))  # its only live partner was excluded
            out = Path(d) / "out"
            r = subprocess.run([sys.executable, "-I", str(CLI), "sweep", "--export", str(Path(d) / "x.json"),
                                "--out", str(out)], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stderr)
            doc = json.loads((out / "groups.json").read_text(encoding="utf-8"))
            self.assertEqual(doc["format_mismatch"], [uid(2), uid(26)])
            self.assertEqual(doc["broken_answer_key"], [])
            section = (out / "report.md").read_text(encoding="utf-8").split("## Format mismatch")[1]
            self.assertIn(uid(2), section)
            self.assertIn(uid(26), section)
            self.assertNotIn(uid(3), section)


class FindDuplicatesTests(unittest.TestCase):
    def test_exact_and_reordered_grouped(self):
        gs = groups()
        exact = group_with(gs, uid(1))
        self.assertEqual((exact["keep"], exact["remove"], exact["relation"]), (uid(1), [uid(2)], "exact"))
        reordered = group_with(gs, uid(11))
        # uid(12) was created first, so it is the keeper.
        self.assertEqual((reordered["keep"], reordered["remove"], reordered["relation"]),
                         (uid(12), [uid(11)], "exact"))

    def test_typo_pair_grouped_keep_clean_copy(self):
        g = group_with(groups(), uid(21))
        # uid(21) is the earliest but carries the typo; the two clean copies outvote it.
        self.assertEqual(g["keep"], uid(22))
        self.assertEqual(g["remove"], [uid(21), uid(23)])
        self.assertEqual(g["relation"], "ocr_typo")
        typo = [e for e in g["evidence"] if e["id"] == uid(21)][0]
        self.assertEqual(typo["match"], "ocr_typo")
        self.assertEqual(typo["spots"], [["gardener", "gardner"]])

    def test_typo_tie_goes_to_review(self):
        a = live("a", "On a calm grey morning the old fisherman tied the rope to the mast.", "2026-01-02T00:00:00+00:00")
        b = live("b", "On a calm grey morning the old fisherman tied the rops to the mast.", "2026-01-01T00:00:00+00:00")
        [g] = find_live_duplicates([a, b])
        self.assertEqual((g["keep"], g["remove"], g["relation"], g["keeper_tie"]), ("b", [], "typo_review", True))
        report = report_md([g], {}, 2)
        self.assertIn("## Needs a person to pick the copy to keep", report)
        self.assertIn("`b`, `a`; differing words: rops / rope", report)

    def test_repeated_typo_does_not_outvote_single_clean_copy(self):
        clean = "The farmer watered the young trees each evening during the dry summer months."
        typo = clean.replace("watered", "watcred")
        for n in (2, 3):
            recs = [live(f"t{i}", typo, f"2026-01-0{i + 1}T00:00:00+00:00") for i in range(n)]
            recs += [live("cl", clean, "2026-01-09T00:00:00+00:00"), other("o", "Rain watered the fields overnight.")]
            [g] = find_live_duplicates(recs)
            self.assertEqual((g["keep"], sorted(g["remove"]), g["relation"]),
                             ("cl", [f"t{i}" for i in range(n)], "ocr_typo"), n)

    def test_non_live_copies_of_typo_do_not_count(self):
        clean = "The farmer watered the young trees each evening during the dry summer months."
        typo = clean.replace("watered", "watcred")
        recs = [live("t", typo, "2026-01-01T00:00:00+00:00"), live("cl", clean, "2026-01-02T00:00:00+00:00"),
                live("h1", typo, "2025-01-01T00:00:00+00:00", is_live=False),  # held copies of the typo
                live("h2", typo.replace("young", "yuung"), "2025-01-02T00:00:00+00:00", is_live=False),
                other("o", "Rain watered the fields overnight.")]
        [g] = find_live_duplicates(recs)
        self.assertEqual((g["keep"], g["remove"]), ("cl", ["t"]))

    def _typo_text_elsewhere(self, extra):
        """Live typo + live clean + `extra` (the same typo text in another block)."""
        clean = "The farmer watered the young trees each evening during the dry summer months."
        typo = clean.replace("watered", "watcred")
        recs = [live("t", typo, "2026-01-01T00:00:00+00:00"), live("cl", clean, "2026-01-02T00:00:00+00:00"),
                extra(typo)]
        [g] = find_live_duplicates(recs)
        self.assertNotIn("cl", g["remove"])
        self.assertTrue(g["keep"] == "cl" or g["relation"] == "typo_review", g)
        [g] = find_live_duplicates(recs + [other("o", "Rain watered the fields overnight.")])
        self.assertEqual((g["keep"], g["remove"], g["relation"]), ("cl", ["t"], "ocr_typo"))

    def test_typo_copy_with_broken_key_is_not_outside_evidence(self):  # H1
        def broken(text):
            r = live("tb", text, "2026-01-01T01:00:00+00:00", answer="")
            r.meta["answer_problem"] = True
            return r
        self._typo_text_elsewhere(broken)

    def test_held_typo_copy_with_other_answer_is_not_outside_evidence(self):  # H2
        self._typo_text_elsewhere(lambda text: live("th", text, "2025-01-01T00:00:00+00:00", answer="6", is_live=False))

    def test_near_copy_with_other_choices_is_not_outside_evidence(self):
        # A held copy with a second typo and different choices: still within spot limits of a candidate.
        self._typo_text_elsewhere(lambda text: live("th", text.replace("young", "yuung"), "2025-01-01T00:00:00+00:00",
                                                    choices=("1", "3", "5", "7"), answer="3", is_live=False))

    def _held_near_copy(self, clean, word, typo_word, edit, outside):
        """Live typo + live clean + a held copy of the typo text changed by `edit`
        (still within spot limits of the typo). The held copy is never outside evidence."""
        typo = clean.replace(word, typo_word)
        held = live("h", edit(typo), "2025-01-01T00:00:00+00:00", answer="6", is_live=False)
        recs = [live("t", typo, "2026-01-01T00:00:00+00:00"), live("cl", clean, "2026-01-02T00:00:00+00:00"), held]
        [g] = find_live_duplicates(recs)
        self.assertNotIn("cl", g["remove"], g)
        self.assertTrue(g["keep"] == "cl" or g["relation"] == "typo_review", g)
        [g] = find_live_duplicates(recs + [other("o", outside)])
        self.assertEqual((g["keep"], g["remove"], g["relation"]), ("cl", ["t"], "ocr_typo"))

    def test_short_stem_7_words_held_copy_with_more_typos(self):
        self._held_near_copy("The farmer watered the young trees daily.", "watered", "watcred",
                             lambda t: t.replace("young", "yuung").replace("daily", "dailv"),
                             "Rain watered the fields overnight.")

    def test_short_stem_9_words_held_copy_with_more_typos(self):
        self._held_near_copy("Which choice best describes the function of the sentence?", "describes", "descrlbes",
                             lambda t: t.replace("function", "functlon").replace("sentence", "sentenco"),
                             "The writer describes a garden.")

    def test_held_copy_with_words_inserted_twice(self):
        self._held_near_copy(
            "The farmer watered the young trees each evening during the dry summer months near the old red barn.",
            "watered", "watcred", lambda t: t.replace("young trees", "young a b trees").replace("old red", "old a b red"),
            "Rain watered the fields overnight.")

    def test_prefilter_never_rejects_a_spot_match(self):
        rnd = random.Random(20261020)

        def mutate(s):
            s = list(s)
            for _ in range(rnd.randint(0, MAX_SPOT_CHARS)):
                i, c = rnd.randrange(len(s) + 1), rnd.choice("ab  ")
                op = rnd.randrange(3)
                if op == 0 or not s:
                    s.insert(i, c)
                elif op == 1:
                    del s[min(i, len(s) - 1)]
                else:
                    s[min(i, len(s) - 1)] = c
            return "".join(s)

        accepted = 0
        for _ in range(2000):
            a = " ".join("".join(rnd.choice("abc") for _ in range(rnd.randint(1, 3))) for _ in range(rnd.randint(1, 12)))
            b = a
            for _ in range(MAX_SPOTS):  # mutate up to two short regions
                lo = rnd.randint(0, len(b))
                hi = min(len(b), lo + rnd.randint(0, 6))
                b = b[:lo] + mutate(b[lo:hi]) + b[hi:]
            for _ in range(rnd.randint(0, 2)):  # join adjacent words / split a word (OCR spacing damage)
                ws = b.split()
                if len(ws) > 1 and rnd.random() < 0.5:
                    i = rnd.randrange(len(ws) - 1)
                    ws[i:i + 2] = [ws[i] + ws[i + 1]]
                elif ws:
                    i = rnd.randrange(len(ws))
                    k = rnd.randint(0, len(ws[i]))
                    ws[i:i + 1] = [w for w in (ws[i][:k], ws[i][k:]) if w]
                b = " ".join(ws)
            ta, tb = tuple(a.split()), tuple(b.split())
            if words_within_spots(ta, tb):
                accepted += 1
                self.assertTrue(_near_prefilter(ta, tb), (ta, tb))
        self.assertGreater(accepted, 1000)

    def test_prefilter_accepts_joined_and_split_word_runs(self):
        a = tuple("x1 a b c d e f mid gh ij kl end".split())
        b = tuple("x1 ab cd ef mid g h i j k l end".split())
        self.assertTrue(words_within_spots(a, b))
        self.assertTrue(_near_prefilter(a, b))

    def test_clean_copy_survives_held_copy_with_joined_and_split_words(self):
        clean = ("Researchers is shown in a field of study while a farmer watered young trees "
                 "with understanding each evening.")
        typo = clean.replace("watered", "watcred")
        held_text = typo.replace("is shown in a field of", "isshown ina fieldof").replace(
            "understanding", "un der stand ing")
        held = live("h", held_text, "2025-01-01T00:00:00+00:00", answer="6", is_live=False)
        recs = [live("t", typo, "2026-01-01T00:00:00+00:00"), live("cl", clean, "2026-01-02T00:00:00+00:00"), held,
                other("o", "Rain watered the fields overnight.")]
        for g in find_live_duplicates(recs[:3]):  # no outside evidence: never removes the clean copy
            self.assertNotIn("cl", g["remove"])
        [g] = [g for g in find_live_duplicates(recs) if "t" in (g["keep"], *g["remove"])]
        self.assertEqual(g["keep"], "cl")

    def test_equal_copies_without_outside_evidence_go_to_review(self):
        clean = "The farmer watered the young trees each evening during the dry summer months."
        typo = clean.replace("watered", "watcred")
        recs = [live("t1", typo, "2026-01-01T00:00:00+00:00"), live("t2", typo, "2026-01-02T00:00:00+00:00"),
                live("c1", clean, "2026-01-03T00:00:00+00:00"), live("c2", clean, "2026-01-04T00:00:00+00:00")]
        [g] = find_live_duplicates(recs)
        self.assertEqual((g["relation"], g["remove"], g["keeper_tie"]), ("typo_review", [], True))

    def test_clean_word_found_nowhere_else_goes_to_review(self):
        clean = "The quartermaster inventoried the barrels each evening during the dry summer months."
        recs = [live("ty", clean.replace("inventoried", "inventorled"), "2026-01-01T00:00:00+00:00"),
                live("cl", clean, "2026-01-02T00:00:00+00:00"), other("o", "The barrels were dry.")]
        [g] = find_live_duplicates(recs)
        self.assertEqual((g["relation"], g["remove"]), ("typo_review", []))

    def test_no_typo_chaining(self):
        base = "On a calm grey morning the old fisherman tied the rope around the mast while the wind pushed the boat toward the harbor."
        a = live("a", base, "2026-01-01T00:00:00+00:00")
        b = live("b", base.replace("rope", "rops").replace("mast", "masl"), "2026-01-02T00:00:00+00:00")
        c = live("c", b.text.replace("harbor", "harbar"), "2026-01-03T00:00:00+00:00")
        extra = [other(f"o{i}", "A rope and a mast lay on the dock.") for i in range(2)]
        gs = find_live_duplicates([a, b, c, *extra])
        self.assertEqual([(g["keep"], g["remove"]) for g in gs], [("a", ["b"])])

    def test_older_typo_copy_loses_to_common_spelling(self):
        clean = "The farmer watered the young trees each evening during the dry summer months."
        old = live("old", clean.replace("watered", "watcred"), "2026-01-01T00:00:00+00:00")
        new = live("new", clean, "2026-01-05T00:00:00+00:00")
        [g] = find_live_duplicates([old, new, other("o", "Rain watered the fields overnight.")])
        self.assertEqual((g["keep"], g["remove"], g["relation"]), ("new", ["old"], "ocr_typo"))
        self.assertEqual(g["evidence"][0]["spots"], [["watered", "watcred"]])

    def test_typo_in_first_word_found(self):
        clean = "The farmer watered the young trees each evening during the dry summer months."
        a = live("a", "Thc" + clean[3:], "2026-01-01T00:00:00+00:00")
        b = live("b", clean, "2026-01-02T00:00:00+00:00")
        [g] = find_live_duplicates([a, b, other("o", "The fields were dry.")])
        self.assertEqual((g["keep"], g["remove"], g["relation"]), ("b", ["a"], "ocr_typo"))

    def test_typo_into_existing_word_does_not_win(self):
        clean = "At low tide the old fisherman tied the rope to the mast before the storm arrived."
        gs = find_live_duplicates([
            live("clean", clean, "2026-01-01T00:00:00+00:00"),
            live("typo", clean.replace("tied", "tide"), "2026-01-02T00:00:00+00:00"),
            other("o1", "He tied a knot."), other("o2", "She tied it."),
        ])
        self.assertEqual([(g["keep"], g["remove"], g["keeper_tie"]) for g in gs], [("clean", ["typo"], False)])

    def test_three_copies_clean_one_kept(self):
        clean = "The farmer watered the young trees each evening during the dry summer months."
        gs = find_live_duplicates([
            live("t1", clean.replace("watered", "watcred"), "2026-01-01T00:00:00+00:00"),
            live("t2", clean.replace("young", "yuung"), "2026-01-02T00:00:00+00:00"),
            live("cl", clean, "2026-01-03T00:00:00+00:00"),
            other("o", "Rain watered the young plants."),
        ])
        self.assertEqual([(g["keep"], g["remove"]) for g in gs], [("cl", ["t1", "t2"])])

    def test_bucket_matching_keeper_but_not_first_joins(self):
        clean = "The farmer watered the young trees each evening during the dry summer months."
        first = live("first", clean.replace("watered", "watcred"), "2026-01-01T00:00:00+00:00")
        keeper = live("keeper", clean, "2026-01-02T00:00:00+00:00")
        # Two spots from the keeper, three from first: joins only via the keeper.
        late = live("late", clean.replace("young", "yuung").replace("evening", "evenirg"), "2026-01-03T00:00:00+00:00")
        gs = find_live_duplicates([first, keeper, late, other("o", "Rain watered the fields overnight.")])
        self.assertEqual([(g["keep"], g["remove"]) for g in gs], [("keeper", ["first", "late"])])

    def test_sign_change_not_grouped(self):
        gs = groups()
        self.assertIsNone(group_with(gs, uid(24)))
        self.assertIsNone(group_with(gs, uid(25)))

    def test_non_live_not_removed(self):
        gs = groups()
        self.assertIsNone(group_with(gs, uid(3)))  # earliest copy, but not live
        self.assertNotIn(uid(3), unpublish_sql(gs, export_by_id(read_export(FIXTURE))))

    def test_figure_group_needs_review_and_removes_nothing(self):
        g = group_with(groups(), uid(32))
        self.assertEqual((g["keep"], g["remove"], g["relation"]), (uid(31), [], "figure_review"))
        self.assertEqual([e["id"] for e in g["evidence"]], [uid(32)])

    def test_group_count(self):
        self.assertEqual([g["relation"] for g in groups()], ["exact", "exact", "ocr_typo", "figure_review"])


class SqlTests(unittest.TestCase):
    def setUp(self):
        self.gs = groups()
        self.rows = export_by_id(read_export(FIXTURE))
        self.removed = [r for g in self.gs for r in g["remove"]]

    def test_unpublish_sql_has_guard_per_row(self):
        sql = unpublish_sql(self.gs, self.rows)
        self.assertEqual(sorted(self.removed), sorted([uid(2), uid(11), uid(21), uid(23)]))
        self.assertEqual(sql.count("RAISE EXCEPTION 'published state changed"), len(self.removed))
        self.assertEqual(len(re.findall(r"^DO \$", sql, re.M)), len(self.removed))
        self.assertNotIn("DELETE", sql.upper())
        for rid in self.removed:
            self.assertIn(f"WHERE id = '{rid}'::uuid FOR UPDATE", sql)

    def test_unpublish_sql_guard_and_update_values(self):
        sql = unpublish_sql(self.gs, self.rows)
        block = [b for b in sql.split("\nDO ") if f"'{uid(2)}'" in b and "SET import_status" in b][0]
        self.assertIn(f"q.content_hash_v2 IS DISTINCT FROM '{2:064x}'", block)
        self.assertIn("q.is_live IS DISTINCT FROM true", block)
        self.assertIn("q.publish_status IS DISTINCT FROM 'publish_ready'", block)
        self.assertIn("q.import_status IS DISTINCT FROM 'ok'", block)
        self.assertIn("NOT IN ('publish_ready', 'publish_ready_with_verified_repair')", block)
        self.assertIn(f"import_flag_reason = 'duplicate of {uid(1)}; un-published by sweep'", block)
        self.assertIn("publish_status = 'needs_human_review'", block)
        self.assertIn("import_status = 'needs_review'", block)
        self.assertIn("jsonb_set(raw_model_response, '{student_publication_allowed}', 'false'::jsonb)", block)
        self.assertIn("'keeper not live", block)
        self.assertNotRegex(sql, r"is_live\s*=\s*(true|false)\s*[,W]")  # generated column: never assigned

    def test_unpublish_guards_flag_reason_and_locks_key_row(self):
        for sql in (unpublish_sql(self.gs, self.rows), republish_sql(self.gs, self.rows)):
            for block in sql.split("\nDO ")[1:]:
                self.assertIn("FROM public.answer_key_entries WHERE question_id = q.id FOR UPDATE;", block)
        un = unpublish_sql(self.gs, self.rows)
        self.assertEqual(un.count("q.import_flag_reason IS DISTINCT FROM NULL"), len(self.removed))

    def test_json_null_and_missing_flag_handled_exactly(self):
        rows = {k: dict(v) for k, v in self.rows.items()}
        rows[uid(2)]["raw_model_response"] = {"student_publication_allowed": None}
        rows[uid(11)]["raw_model_response"] = {"approved_tags": {}}
        un, re_ = unpublish_sql(self.gs, rows), republish_sql(self.gs, rows)
        block = lambda sql, n: [b for b in sql.split("\nDO ") if f"'{uid(n)}'::uuid FOR UPDATE" in b][0]
        self.assertIn("IS DISTINCT FROM 'null'::jsonb", block(un, 2))
        self.assertIn("'{student_publication_allowed}', 'null'::jsonb)", block(re_, 2))
        self.assertRegex(block(un, 11), r"->'student_publication_allowed' FROM public.answer_key_entries WHERE question_id = q.id\) IS DISTINCT FROM NULL")
        self.assertIn("raw_model_response - 'student_publication_allowed'", block(re_, 11))

    def test_dollar_in_interpolated_value_rejected(self):
        rows = {k: dict(v) for k, v in self.rows.items()}
        for kind, build in (("unpublish", unpublish_sql), ("republish", republish_sql)):
            rows[uid(2)]["import_flag_reason"] = f"x $kimport_{kind}_{uid(2).replace('-', '')}$; DROP TABLE t; --"
            with self.assertRaises(ValueError, msg=kind):
                build(self.gs, rows)

    def test_plain_dollar_in_value_allowed(self):
        rows = {k: dict(v) for k, v in self.rows.items()}
        rows[uid(2)]["import_flag_reason"] = "answer $5"
        self.assertIn("IS DISTINCT FROM 'answer $5'", unpublish_sql(self.gs, rows))
        self.assertIn("import_flag_reason = 'answer $5'", republish_sql(self.gs, rows))

    def test_unpublish_rejects_non_uuid_id(self):
        gs = [dict(self.gs[0], remove=["x'; DROP TABLE t; --"])]
        with self.assertRaises(ValueError):
            unpublish_sql(gs, self.rows)

    def test_republish_inverts_unpublish(self):
        un = unpublish_sql(self.gs, self.rows)
        re_ = republish_sql(self.gs, self.rows)
        ids = lambda s: sorted(re.findall(r"WHERE id = '([0-9a-f-]{36})'::uuid FOR UPDATE", s))
        self.assertEqual(ids(un), ids(re_))
        self.assertEqual(re_.count("RAISE EXCEPTION 'sweep state changed"), len(self.removed))
        self.assertNotIn("DELETE", re_.upper())
        block = [b for b in re_.split("\nDO ") if f"'{uid(2)}'::uuid FOR UPDATE" in b][0]
        # Guards: the row is exactly as unpublish left it.
        self.assertIn("q.publish_status IS DISTINCT FROM 'needs_human_review'", block)
        self.assertIn("q.import_status IS DISTINCT FROM 'needs_review'", block)
        self.assertIn(f"q.import_flag_reason IS DISTINCT FROM 'duplicate of {uid(1)}; un-published by sweep'", block)
        self.assertIn("q.is_live IS DISTINCT FROM false", block)
        # Updates: back to the exported values.
        self.assertIn("publish_status = 'publish_ready'", block)
        self.assertIn("import_status = 'ok'", block)
        self.assertIn("import_flag_reason = NULL", block)
        self.assertIn("jsonb_set(raw_model_response, '{student_publication_allowed}', 'true'::jsonb)", block)


class CliTests(unittest.TestCase):
    def run_sweep(self, out: Path):
        return subprocess.run([sys.executable, "-I", str(CLI), "sweep", "--export", str(FIXTURE), "--out", str(out)],
                              capture_output=True, text=True)

    def test_sweep_deterministic(self):
        with tempfile.TemporaryDirectory() as d:
            a, b = Path(d) / "a", Path(d) / "b"
            ra, rb = self.run_sweep(a), self.run_sweep(b)
            self.assertEqual(ra.returncode, 0, ra.stderr)
            self.assertEqual(rb.returncode, 0, rb.stderr)
            for name in ("groups.json", "report.md", "unpublish.sql", "republish.sql"):
                self.assertEqual((a / name).read_bytes(), (b / name).read_bytes(), name)
            data = json.loads((a / "groups.json").read_text(encoding="utf-8"))
            self.assertEqual(len(data["groups"]), 4)

    def test_report_plain_english(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "s"
            self.assertEqual(self.run_sweep(out).returncode, 0)
            report = (out / "report.md").read_text(encoding="utf-8")
            self.assertIn("4 duplicate groups", report)
            self.assertIn("4 questions would be un-published", report)
            self.assertIn(uid(22), report)
            self.assertIn("The gardener planted rows of beans along the fence. According to the text, why", report)
            self.assertIn("check by eye", report)
            self.assertNotIn("Needs a person", report)  # the fixture's typo group is decided by outside evidence

    def test_bad_export_fails_cleanly(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "bad.json"
            p.write_text('{"not": "an export"}', encoding="utf-8")
            r = subprocess.run([sys.executable, "-I", str(CLI), "sweep", "--export", str(p), "--out", str(Path(d) / "o")],
                               capture_output=True, text=True)
            self.assertEqual(r.returncode, 1)
            self.assertIn("error:", r.stderr)


if __name__ == "__main__":
    unittest.main()
