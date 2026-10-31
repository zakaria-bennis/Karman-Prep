"""`k qa normalize` (kimport.qa_normalize_text, kimport.qa_normalize, qa_run.run_normalize). Synthetic rows only."""

import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from kimport import qa_normalize as qn
from kimport import qa_normalize_text as nt
from kimport import qa_run
from kimport.export import ExportDoc, fingerprint
from kimport.qa_legacy import content_hash_v2
from tests.export_fixtures import write_export
from tests.test_qa_retag import UUID, row as retag_row


def fix(text, subject="reading"):
    out, res = nt.normalize_field(text, subject)
    return out, res.counts, [r for r, _ in res.ambiguous]


class TransformCase(unittest.TestCase):
    def same(self, text, subject="reading", unsure=None):
        out, counts, amb = fix(text, subject)
        self.assertEqual(out, text)
        self.assertEqual(counts, {})
        if unsure:
            self.assertIn(unsure, amb)

    def becomes(self, text, want, rule, subject="reading"):
        out, counts, _ = fix(text, subject)
        self.assertEqual(out, want)
        self.assertIn(rule, counts)
        self.assertEqual(nt.words(out), nt.words(text))


class QuotesTest(TransformCase):
    def test_curly(self):
        self.becomes('He said "hi." It\'s the students\' \'best\' work of the \'60s.',
                     "He said “hi.” It’s the students’ ‘best’ work of the ’60s.", "quotes")
        self.becomes('the poem "<i>Fountain</i>" and "Shadow River,"', "the poem “<i>Fountain</i>” and “Shadow River,”",
                     "quotes")
        self.becomes("And 'tis my faith", "And ’tis my faith", "quotes")
        self.becomes("it's \\(x\\) and \\(y\\)", "it’s \\(x\\) and \\(y\\)", "quotes", "math")

    def test_left_alone(self):
        self.same('a 5\' 10" ledge', unsure="quotes")  # feet and inches are primes
        self.same('the chapter Be"ak and "more"', unsure="quotes")  # one unsure mark keeps every double quote
        self.same("The 'akiapola'au is a bird", unsure="quotes")  # an ʻokina, not a quotation
        self.same("the slope of \\(f'(x)\\)")  # inside math
        self.same("Points P' and Q' are", "math", unsure="quotes")  # primes in a math row


class DashTest(TransformCase):
    def test_closed_em_dash(self):
        self.becomes("particles --- variations", "particles—variations", "dashes")
        self.becomes("a lattice--and more", "a lattice—and more", "dashes")
        self.becomes("Quasars — such as CTA 102 — are", "Quasars—such as CTA 102—are", "dashes")
        self.becomes("respectively---", "respectively—", "dashes")  # a choice that ends at the dash
        self.becomes("from 1990--2000", "from 1990-2000", "dashes")  # a range takes a hyphen

    def test_left_alone(self):
        self.same("between plants and fungi --- ______ x", unsure="dashes")
        self.same("Of prancing Poetry ---\nThis Traverse", unsure="dashes")
        self.same("no title,— / No, not that name")
        self.same("suggests that ------\n\nWhich choice")
        self.same("a well-known, light-footed dancer")


class EnDashTest(TransformCase):
    def test_founder_rule(self):
        self.becomes("Merle Oberon (1911–1979)", "Merle Oberon (1911-1979)", "en_dash")
        self.becomes("the Smith–Jones model", "the Smith-Jones model", "en_dash")
        self.becomes("a value of –3 degrees", "a value of −3 degrees", "en_dash")
        self.becomes("the walls – no meaning", "the walls—no meaning", "en_dash")

    def test_left_alone(self):
        self.same("x (–) y", unsure="en_dash")


class MinusTest(TransformCase):
    def test_minus_sign(self):
        self.becomes("the solution is -91.", "the solution is −91.", "minus", "math")
        self.becomes("endpoints (8, -9) and (4,-2)", "endpoints (8, −9) and (4,−2)", "minus", "math")
        self.becomes("f(x) = (x - 9)(x - 6)", "f(x) = (x − 9)(x − 6)", "minus", "math")
        self.becomes("-3", "−3", "minus", "math")  # a choice that is a negative number
        self.becomes("Only Sk -69° 249 A", "Only Sk −69° 249 A", "minus")

    def test_left_alone(self):
        self.same("a 3-hour trip in the xy-plane", "math")
        self.same("\\(y = x - 9\\)", "math")  # math draws - as a minus already
        self.same("the rate - in dollars - is", "math")  # words, not operands
        self.same("Note: -3", "math", unsure="minus")
        self.same("well - known", "reading")


class FractionTest(TransformCase):
    def test_stacked(self):
        self.becomes("\\(1/8\\)", "\\(\\frac{1}{8}\\)", "fractions", "math")
        self.becomes("\\(y = -(1/8)x - 11\\)", "\\(y = -\\frac{1}{8}x - 11\\)", "fractions", "math")
        self.becomes("\\(I = 600(0.5)^{x/17}\\)", "\\(I = 600(0.5)^{\\frac{x}{17}}\\)", "fractions", "math")
        self.becomes("\\(P = w / 185\\)", "\\(P = \\frac{w}{185}\\)", "fractions", "math")
        self.becomes("\\(f(1/2)\\)", "\\(f(\\frac{1}{2})\\)", "fractions", "math")  # a call keeps its parentheses
        self.becomes("\\(2(1/2)\\)", "\\(2(\\frac{1}{2})\\)", "fractions", "math")  # not a mixed number

    def test_left_alone(self):
        self.same("\\(5/6 - \\sqrt{85}/6\\)", "math", unsure="fractions")  # one unsure slash keeps the span
        self.same("\\(a=4b/49\\)", "math", unsure="fractions")
        self.same("\\(1.04/12\\)", "math", unsure="fractions")
        self.same("\\(5 m/s\\)", "math", unsure="fractions")
        self.same("\\(\\text{km/h}\\)", "math", unsure="fractions")
        self.same("so 3/4 of them", "math")  # prose: not this rule


class MathCommaTest(TransformCase):
    def test_braced(self):
        self.becomes("\\(950 + 50t = 1,150\\)", "\\(950 + 50t = 1{,}150\\)", "math_commas", "math")
        self.becomes("\\(y = 2(48,000)^t\\)", "\\(y = 2(48{,}000)^t\\)", "math_commas", "math")
        self.becomes("\\(\\frac{2,048\\pi}{81}\\)", "\\(\\frac{2{,}048\\pi}{81}\\)", "math_commas", "math")
        self.becomes("\\(3,500,000\\)", "\\(3{,}500{,}000\\)", "math_commas", "math")

    def test_left_alone(self):
        self.same("\\((1,600)\\)", "math", unsure="math_commas")  # could be a point
        self.same("\\(f(1,500)\\)", "math", unsure="math_commas")
        self.same("\\(1{,}150\\)", "math")
        self.same("about 1,150 people", "math")


class PercentUnitTest(TransformCase):
    def test_spacing(self):
        self.same("up to 30 percent of")  # the exam's wording is kept
        self.becomes("by 150 % of", "by 150% of", "percent_units", "math")
        self.becomes("worth $ 180 in all", "worth $180 in all", "percent_units", "math")
        self.becomes("was 2.29mm in October and 100g", "was 2.29 mm in October and 100 g", "percent_units")

    def test_left_alone(self):
        self.same("the percentage of")
        self.same("c=28m; c+m=3", "math")  # variables
        self.same("a 5G network and a 3m-long pole")


class WhitespaceTest(TransformCase):
    def test_spaces(self):
        self.becomes("a  2019 study", "a 2019 study", "whitespace")
        self.becomes("the value of \\(c\\) ?", "the value of \\(c\\)?", "whitespace", "math")
        self.becomes("data set A .", "data set A.", "whitespace", "math")
        self.becomes("line one   \nline two", "line one\nline two", "whitespace")

    def test_left_alone(self):
        self.same("a skill ... had all but died")
        self.same("word . . . more")
        self.same("         Once again")  # a poem's indentation
        self.same("0-9 years   10-19 years   20+ years", "math", unsure="whitespace")
        self.same("starts at .5 and ends")
        self.same("the ______ ?")


class BlankTest(TransformCase):
    def test_standard_blank(self):
        self.becomes("jazz ______blank larger", "jazz ______ larger", "blanks")
        self.becomes("was a ______ blank explosion", "was a ______ explosion", "blanks")
        self.becomes("the ____ of fashion", "the ______ of fashion", "blanks")
        self.becomes("the [blank] of", "the ______ of", "blanks")

    def test_left_alone(self):
        self.same("atmospheric $\\mathrm{NH}_{3}$ likely")
        self.same("the ______ of")
        self.same("a __ b", unsure=None)
        self.same("the _ _ of", unsure="blanks")


class NotesTest(TransformCase):
    def test_intro_and_bullets(self):
        self.becomes("While researching a topic, a student has taken the following notes.\n- One.\n•Two.\n"
                     "The student wants to x. Which choice?",
                     f"{nt.NOTES_INTRO}\n• One.\n• Two.\nThe student wants to x. Which choice?", "notes")
        self.becomes(f"{nt.NOTES_INTRO}\nA note.\n\nAnother note.", f"{nt.NOTES_INTRO}\n• A note.\n\n• Another note.", "notes")
        self.becomes("While researching a topic, a student took the following notes:\n• One.",
                     f"{nt.NOTES_INTRO}\n• One.", "notes")

    def test_left_alone(self):
        self.same(f"{nt.NOTES_INTRO}\n• One.\n• Two.")
        self.same(f"{nt.NOTES_INTRO}\n- One.\nA bare line.", unsure="notes")  # mixed: a person decides
        self.same(f"{nt.NOTES_INTRO}\n         to dissolve the powder.", unsure="notes")
        self.same(f"{nt.NOTES_INTRO} Pistol shrimp hunt.", unsure="notes")


class ThousandsTest(TransformCase):
    def test_commas(self):
        self.becomes("from around 27000 years ago", "from around 27,000 years ago", "thousands")
        self.becomes("18068 square inches", "18,068 square inches", "thousands", "math")
        self.becomes("costs $1500.50 now", "costs $1,500.50 now", "thousands")
        self.becomes("about 7100 feet high", "about 7,100 feet high", "thousands")

    def test_left_alone(self):
        self.same("such as 31824 Elatus, a centaur")  # a minor planet number
        self.same("remembered “12345.” Which")
        self.same("such as APM 08279+5255")
        self.same("in 1990 and in 2016 the")
        self.same("ZIP 02139 area")
        self.same("from 7100 to 5950 BCE")


class WordsTest(unittest.TestCase):
    def test_swaps_keep_the_words(self):
        pairs = [("1,150", "1{,}150"), ("1/8", "\\frac{1}{8}"), ("100g", "100 g"),
                 ("a ______blank b", "a ______ b"), ("27000", "27,000"),
                 ("While researching a topic, a student took the following notes:", nt.NOTES_INTRO)]
        for a, b in pairs:
            self.assertEqual(nt.words(a), nt.words(b), (a, b))

    def test_a_changed_word_shows(self):
        self.assertNotEqual(nt.words("the cat"), nt.words("the dog"))
        self.assertNotEqual(nt.words("3 to 4"), nt.words("3 to 5"))
        self.assertNotEqual(nt.words("ab"), nt.words("a b"))

    def test_split_keeps_every_byte(self):
        t = "a <i>b</i> \\(x\\) $5 and $y$ $$z$$ [[u]]w[[/u]]"
        self.assertEqual("".join(s for _, s in nt.split(t)), t)
        self.assertEqual([k for k, _ in nt.split(t)].count("math"), 3)


# ---------------------------------------------------------------- plan and SQL


def live_row(n, text='The "synthetic" text --- here?', **kw):
    r = retag_row(n)
    r.update(question_text=text, comparison_key=None, import_status="published", publish_status="publish_ready")
    r.update(kw)
    r["content_hash_v2"] = content_hash_v2(r, {c["letter"]: c["choice_text"] for c in r["answer_choices"]})
    return r


def doc_of(rows):
    slim = [{k: r.get(k) for k in ("id", "content_hash_v2", "publish_status", "import_status", "comparison_key",
                                   "archived_at")} for r in rows]
    return ExportDoc(rows=slim, exported_at="2099-01-01T00:00:00Z", row_count=len(slim), fingerprint=fingerprint(slim))


def fake_checker(items):
    out = []
    for it in items:
        raw = copy.deepcopy(it["raw_after"])
        raw["approved_tags"]["question_payload_sha256"] = "e" * 64
        out.append({"id": it["id"], "ok": True, "raw_after": raw, "seal_before": "a" * 64, "seal_after": "e" * 64,
                    "content_hash_v2_after": content_hash_v2(it["after"], {c["letter"]: c["choice_text"]
                                                                           for c in it["after"]["answer_choices"]}),
                    "served": "served"})
    return {"rows": out}


def plan(rows, checker=fake_checker):
    return qn.build_plan(rows, doc_of(rows), checker, "2099-01-02T00:00:00Z", "normalize-test")


class PlanTest(unittest.TestCase):
    def test_plan_changes_text_records_history_and_refuses(self):
        rows = [live_row(1), live_row(2, publish_status="needs_human_review"), live_row(3, text="Plain text?"),
                live_row(4)]
        rows[3]["answer_key_entries"].append(copy.deepcopy(rows[3]["answer_key_entries"][0]))
        res = plan(rows)
        it, = res["items"]
        self.assertEqual(it["after"]["question_text"], "The “synthetic” text—here?")
        self.assertEqual(it["change"]["rules"], {"dashes": 1, "quotes": 2})
        hist, = it["raw_after"]["text_normalizations"]
        self.assertEqual((hist["by"], hist["fields"], hist["previous_question_payload_sha256"]),
                         ("k qa normalize", ["question_text"], "a" * 64))
        self.assertNotIn("text_normalizations", rows[0]["answer_key_entries"][0]["raw_model_response"])
        self.assertEqual(res["refused"], {UUID.format(4): "more than one answer key entry"})
        self.assertEqual(res["skipped"], {"not student-visible (hidden, held or archived)": 1})

    def test_a_word_change_is_refused(self):
        real = nt.normalize_field
        try:
            nt.normalize_field = lambda text, subject: (text.replace("synthetic", "made-up"), nt.Result())
            res = plan([live_row(1)])
        finally:
            nt.normalize_field = real
        self.assertIn("the words and numbers would change", res["refused"][UUID.format(1)])

    def test_comparison_key_recomputed_or_refused(self):
        r = live_row(1)
        r["comparison_key"] = qn.key_of(r)
        bad = live_row(2)
        bad["comparison_key"] = "kn-2:" + "0" * 64
        res = plan([r, bad])
        it, = res["items"]
        self.assertEqual(it["key_after"], qn.key_of(it["after"]))
        self.assertIn("comparison_key is not the key", res["refused"][UUID.format(2)])

    def test_a_new_live_duplicate_is_refused(self):
        a = live_row(1, text="What is \\(\\frac{1}{8}\\) of 40?", subject="math")
        b = live_row(2, text="What is \\(1/8\\) of 40?", subject="math")  # the same question once stacked
        b["answer_choices"] = [{**c, "choice_text": t} for c, t in zip(b["answer_choices"], ["5", "6", "7", "8"])]
        a["answer_choices"] = [{**c, "choice_text": t} for c, t in zip(a["answer_choices"], ["6", "5", "8", "7"])]
        a["correct_answer"], b["correct_answer"] = "B", "A"
        b["passage"] = a["passage"]
        for r in (a, b):
            r["content_hash_v2"] = content_hash_v2(r, {c["letter"]: c["choice_text"] for c in r["answer_choices"]})
        c = live_row(3, text="Another 'odd' question?")
        res = plan([a, b, c])
        self.assertIn("qa gate: live_duplicate: same question as live " + UUID.format(1), res["refused"][UUID.format(2)])
        self.assertEqual([it["id"] for it in res["items"]], [UUID.format(3)])

    def test_the_same_text_as_another_row_is_refused(self):
        a = live_row(1, text="The “synthetic” text—here?")
        b = live_row(2)  # becomes a's text and content hash
        b["answer_choices"], b["passage"] = copy.deepcopy(a["answer_choices"]), a["passage"]
        res = plan([a, b])
        self.assertEqual(res["refused"], {UUID.format(2): "the new content_hash_v2 is held by another row (a duplicate)"})

    def test_hash_held_by_another_row_is_refused(self):
        a = live_row(1)
        after_hash = content_hash_v2({**a, "question_text": "The “synthetic” text—here?"},
                                     {c["letter"]: c["choice_text"] for c in a["answer_choices"]})
        other = live_row(5, text="Unrelated question?")
        other["content_hash_v2"] = after_hash
        res = plan([a, other])
        self.assertIn("content_hash_v2 is held by another row", res["refused"][UUID.format(1)])

    def test_app_check_refusal(self):
        res = plan([live_row(1)], checker=lambda items: {"rows": [{"id": items[0]["id"], "ok": False,
                                                                   "error": "display check: x"}]})
        self.assertEqual(res["refused"], {UUID.format(1): "app check: display check: x"})


class SqlTest(unittest.TestCase):
    def items(self, n=1):
        rows = [live_row(k) for k in range(1, n + 1)]
        for r in rows:
            r["answer_choices"][0]["choice_text"] = "it's A"
        return plan(rows)["items"], rows

    def test_guards_writes_and_exact_undo(self):
        items, rows = self.items()
        doc = doc_of(rows + [{"id": UUID.format(9), "content_hash_v2": "x", "publish_status": "publish_ready"}])
        sql, = qn.normalize_sql(items, doc)
        self.assertEqual((sql.count("BEGIN;"), sql.count("\nCOMMIT;")), (1, 1))
        self.assertIn("WHERE q.id <> ALL (ARRAY['" + UUID.format(1) + "']::uuid[])", sql)
        self.assertIn(fingerprint([r for r in doc.rows if r["id"] != UUID.format(1)]), sql)
        self.assertIn("q.question_text IS DISTINCT FROM 'The \"synthetic\" text --- here?'", sql)
        self.assertIn("c.letter = 'A') IS DISTINCT FROM 'it''s A'", sql)
        self.assertIn("SET choice_text = 'it’s A' WHERE question_id = q.id AND letter = 'A'", sql)
        self.assertIn("'content_hash_v2 already in the bank", sql)
        self.assertIn("answer key evidence changed since the export", sql)
        self.assertIn("SET question_text = 'The “synthetic” text—here?', content_hash_v2 = ", sql)
        undo, = qn.restore_sql(items)
        self.assertIn("SET question_text = 'The \"synthetic\" text --- here?'", undo)
        self.assertIn("SET choice_text = 'it''s A'", undo)
        self.assertIn("q.question_text IS DISTINCT FROM 'The “synthetic” text—here?'", undo)
        self.assertIn('"text_normalizations"', undo.split("NOT EXISTS", 1)[1].split("THEN", 1)[0])
        self.assertNotIn("text_normalizations", undo.split("UPDATE public.answer_key_entries", 1)[1])

    def test_files_split_each_with_the_guard(self):
        items, rows = self.items(6)
        files = qn.normalize_sql(items, doc_of(rows), max_bytes=12000)
        self.assertGreater(len(files), 1)
        self.assertTrue(all(f.count("BEGIN;") == 1 and "bank changed since export" in f for f in files))
        self.assertEqual(sum(f.count(qn._ROW_NOTE) for f in files), 6)

    def test_expected_readback(self):
        items, _ = self.items()
        after, before = qn.expected(items, True), qn.expected(items, False)
        self.assertEqual(after[UUID.format(1)]["choices"]["A"], "it’s A")
        self.assertEqual(before[UUID.format(1)]["choices"]["A"], "it's A")
        self.assertIn("text_normalizations", after[UUID.format(1)]["raw_model_response"])


class RunTest(unittest.TestCase):
    def test_dry_runs_only_the_dry_twins_and_writes_the_plan(self):
        with tempfile.TemporaryDirectory() as d:
            pipe = Path(d)
            rows = [live_row(1)]
            calls = []

            def db(path):
                calls.append(Path(path).name)
                return [{"rows": []}]

            deps = qa_run.Deps(db=db, log=lambda m: None, sleep=lambda s: None,
                               exporter=lambda out: write_export(Path(out), [{k: rows[0][k] for k in (
                                   "id", "content_hash_v2", "publish_status", "import_status", "comparison_key")}]),
                               full_exporter=lambda out: Path(out).write_text(json.dumps({"rows": rows})),
                               normalize_checker=lambda items, work: fake_checker(items))
            res = qa_run.run_normalize(pipe, "2099-01-02T00:00:00Z", dry=True, deps=deps)
            self.assertEqual((res["to_change"], res["result"]), (1, "dry run passed (rolled back)"))
            self.assertEqual(calls, ["normalize.dryrun.sql"])
            run = pipe / "qa" / "normalize-20990102T000000Z-dry"
            doc = json.loads((run / "plan.json").read_text())
            self.assertEqual(doc["per_rule"]["quotes"], {"rows": 1, "changes": 2})
            self.assertTrue(doc["dry_passed"])
            for f in ("restore.sql", "normalize.sql", "readback.sql"):
                self.assertTrue((run / f).exists(), f)
            self.assertFalse((pipe / "writer.lock").exists())
            self.assertFalse((pipe / "intents.jsonl").exists())


class RealCheckerTest(unittest.TestCase):
    """ts/normalize-check.ts: the seals come from the app's own functions."""

    def sealed(self, r, work):
        seal = qa_run.qa_retag_check([{"row": r, "question_after": {}, "raw_after": {}}], work)["rows"][0]["seal_before"]
        r["answer_key_entries"][0]["raw_model_response"]["approved_tags"]["question_payload_sha256"] = seal
        return seal

    def test_payload_seal_and_content_hash_match_the_app(self):
        with tempfile.TemporaryDirectory() as d:
            work = Path(d)
            r = live_row(1)
            first = plan([r], checker=lambda items: qa_run.qa_normalize_check(items, work))
            self.assertIn("payload seal does not match", first["refused"][UUID.format(1)])
            seal = self.sealed(r, work)
            res = plan([r], checker=lambda items: qa_run.qa_normalize_check(items, work))
            self.assertEqual(res["refused"], {})
            it, = res["items"]
            self.assertEqual(it["seal_before"], seal)
            app_after = qa_run.qa_retag_check([{"row": it["after"], "question_after": {}, "raw_after": {}}],
                                              work)["rows"][0]["seal_before"]
            self.assertEqual(it["seal_after"], app_after)  # catalogQuestionPayloadHash of the changed row
            self.assertNotEqual(it["seal_after"], seal)
            self.assertEqual(it["raw_after"]["approved_tags"]["question_payload_sha256"], app_after)
            self.assertEqual(it["hash_after"], content_hash_v2(it["after"], {c["letter"]: c["choice_text"]
                                                                            for c in it["after"]["answer_choices"]}))
            self.assertEqual(it["raw_after"]["text_normalizations"][0]["previous_question_payload_sha256"], seal)

    def test_numeric_answer_set_hashes_follow_the_text(self):
        with tempfile.TemporaryDirectory() as d:
            work = Path(d)
            r = live_row(1, text="What is the value of x ?", subject="math", domain="algebra", topic_cluster="Algebra",
                         answer_format="numeric_entry", correct_answer="4", source_version="v" * 64,
                         source_section="math", source_module="M1", source_question_number=3, source_occurrence=1,
                         raw_question_text="What is x?")
            r["answer_choices"] = []
            raw = r["answer_key_entries"][0]["raw_model_response"]
            tags = raw["approved_tags"]
            tags.update(catalog_skill_id="ma-skill-linear-equations-in-one-variable", catalog_domain_id="algebra",
                        domain_label="Algebra", skill_label="Linear equations in one variable")
            raw["independent_D_record"].update(skill="Linear equations in one variable", domain="Algebra")
            raw["numeric_answer_set"] = {
                "version": 1, "answers": ["4"], "question_text_sha256": hashlib.sha256(r["question_text"].encode()).hexdigest(),
                "raw_question_text_sha256": hashlib.sha256(b"What is x?").hexdigest(), "source_version": "v" * 64,
                "source_section": "math", "source_module": "M1", "source_question_number": 3, "source_occurrence": 1,
                "answer_key_artifact_sha256": "f" * 64, "independent_review_sha256s": ["1" * 64, "2" * 64],
                "rationale": "synthetic"}
            r["content_hash_v2"] = content_hash_v2(r, {})
            self.sealed(r, work)
            res = plan([r], checker=lambda items: qa_run.qa_normalize_check(items, work))
            self.assertEqual(res["refused"], {})
            it, = res["items"]
            self.assertEqual(it["after"]["question_text"], "What is the value of x?")
            s = it["raw_after"]["numeric_answer_set"]
            self.assertEqual(s["question_text_sha256"], hashlib.sha256("What is the value of x?".encode()).hexdigest())
            self.assertEqual(s["raw_question_text_sha256"], hashlib.sha256(b"What is x?").hexdigest())  # raw stays

    def test_a_display_change_is_refused(self):
        with tempfile.TemporaryDirectory() as d:
            work = Path(d)
            r = live_row(1, text="Is \\(x\\) here?")
            self.sealed(r, work)
            item = {"id": r["id"], "row": r, "change": {"question": {"question_text": "Is x\\) here?"}, "choices": {}},
                    "raw_after": copy.deepcopy(r["answer_key_entries"][0]["raw_model_response"])}
            out, = qa_run.qa_normalize_check([item], work)["rows"]
            self.assertFalse(out["ok"])
            self.assertIn("display check", out["error"])


if __name__ == "__main__":
    unittest.main()
