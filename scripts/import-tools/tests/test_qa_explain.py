"""`k qa explain` / `k qa explain-check` (kimport.explanation_rules, kimport.qa_explain,
kimport.explain_live). Synthetic rows only; the app check is faked except in RealCheckTest."""

import copy
import json
import tempfile
import unittest
from pathlib import Path

from kimport import explain_live as el
from kimport import explanation_rules as er
from kimport import qa_explain as qe
from kimport import qa_run, writer
from kimport.export import ExportDoc, fingerprint
from tests.export_fixtures import write_export
from tests.test_qa_retag import SID, UUID, row as retag_row

NOW = "2099-01-02T00:00:00Z"
STEPS = ("Step 1: Read the sentence before the blank and the sentence after it. "
         "Step 2: The second sentence adds a result of the first, so the blank needs a word that shows a result. "
         "Step 3: Try each choice in the blank and keep the one that makes the logic hold. ")


def good(letter="A"):
    return STEPS + f"Choice {letter} is correct."


def math_good(value=r"\(\frac{3}{4}\)"):
    return (r"Step 1: Write the equation \(4x - 3 = 0\). Step 2: Add 3 to both sides, which gives \(4x = 3\). "
            r"Step 3: Divide both sides by 4, so \(x = \frac{3}{4}\). Check: \(4 \cdot \frac{3}{4} - 3 = 0\), "
            rf"which is true. The answer is {value}.")


def live(n, **kw):
    r = retag_row(n)
    r.update(import_status="ok", comparison_key=None, explanation_text=f"Old explanation {n}.")
    r.update(kw)
    return r


def numeric(n, key="3/4", **kw):
    return live(n, subject="math", domain="algebra", answer_format="numeric_entry", correct_answer=key,
                answer_choices=[], **kw)


def line(n, text=None, row=None, **kw):
    d = {"question_id": UUID.format(n), "stable_question_id": SID.format(n), "explanation_text": text or good(),
         "explanation_sha256_before": er.sha256_text((row or live(n))["explanation_text"]), "_line": n}
    d.update(kw)
    return d


class FakeCheck:
    def __init__(self, errors=None):
        self.errors, self.seen = errors or {}, []

    def __call__(self, items):
        out = []
        for it in items:
            self.seen.append(it["id"])
            raw = copy.deepcopy(it["raw_after"])
            raw["approved_tags"]["question_payload_sha256"] = "e" * 64
            out.append({"id": it["id"], "ok": it["id"] not in self.errors, "error": self.errors.get(it["id"]),
                        "raw_after": raw, "seal_before": "a" * 64, "seal_after": "e" * 64, "served": "served"})
        return {"rows": out}


def slim_of(rows):
    return [{k: r.get(k) for k in ("id", "content_hash_v2", "publish_status", "import_status", "comparison_key",
                                   "archived_at")} for r in rows]


def doc_of(rows):
    slim = slim_of(rows)
    return ExportDoc(rows=slim, exported_at="2099-01-01T00:00:00Z", row_count=len(slim), fingerprint=fingerprint(slim))


def plan(lines, rows, check=None, batch=None):
    return qe.build_plan(lines, {r["id"]: r for r in rows}, {s["id"]: s for s in slim_of(rows)},
                         check or FakeCheck(), NOW, "explain-test", batch)


class RulesTest(unittest.TestCase):
    def test_a_good_explanation_passes(self):
        self.assertEqual(er.text_problems(good()), [])
        self.assertEqual(er.text_problems(math_good()), [])
        self.assertEqual(er.text_problems(STEPS + "The value is −5, so choice B is correct."), [])

    def test_each_text_rule(self):
        cases = {
            "": "empty",
            "Choice A is correct.": "too short",
            STEPS * 20: "too long",
            good() + " Pages 3–4.": "en dash",
            good() + r" \[x = 2\]": "display math",
            good() + r" Then \(x = 2.": "unbalanced",
            good() + r" \( \)": "empty \\( \\) span",
            good() + " It costs $25.": "a $ outside math",
            good() + r" Use \frac{1}{2} here.": "LaTeX command outside",
            good() + " So x^2 is 4.": "^ outside",
            good() + " The value is -5.": "hyphen outside math",
            good() + " <b>bold</b>": "HTML tag",
            good() + " **Note** this.": "Markdown bold",
            "## Steps\n" + good(): "Markdown heading",
            good() + " Use `x`.": "backtick",
            good() + " [[u]]word[[/u]]": "display marker",
            good() + "\x07": "control character",
        }
        for text, want in cases.items():
            with self.subTest(want=want):
                got = er.text_problems(text)
                self.assertTrue(any(want in p for p in got), got)
        self.assertEqual(er.text_problems(good() + r" In math \(-5 + 2 = -3\) is fine."), [])
        self.assertEqual(er.text_problems(good() + " A 3-4 ratio and x-axis are fine."), [])

    def test_multiple_choice_answer_must_be_the_key(self):
        r = live(1, correct_answer="B")
        self.assertEqual(er.answer_problems(good("B"), r), ([], {"kind": "letter", "values": ["B"]}))
        self.assertIn("but the key is B", er.answer_problems(good("C"), r)[0][0])
        self.assertIn("states no final answer", er.answer_problems(STEPS, r)[0][0])
        both = STEPS + "Choice B is correct. The correct answer is (C)."
        self.assertIn("C but the key is B", er.answer_problems(both, r)[0][0])
        ok = STEPS + "Choice A is incorrect because it reverses the logic. The answer is B."
        self.assertEqual(er.answer_problems(ok, r)[1]["values"], ["B"])
        self.assertIn("no final answer", er.answer_problems(STEPS + "The answer is a word that shows a result.", r)[0][0])

    def test_numeric_stated_values(self):
        r = numeric(1)
        self.assertEqual(er.answer_problems(math_good(), r)[1], {"kind": "value", "values": ["3/4"]})
        self.assertEqual(er.stated_values(r"The answer is \(x = -\frac{12}{5}\)."), (["-12/5"], []))
        self.assertEqual(er.stated_values("so the answer is 1,250."), (["1250"], []))
        self.assertEqual(er.stated_values("The answer is −7."), (["-7"], []))
        self.assertEqual(er.stated_values(r"Answer: \(0.75\)"), (["0.75"], []))
        self.assertIn("not a number", er.answer_problems(math_good(r"\(\sqrt{2}\)"), r)[0][0])
        self.assertIn("no final answer", er.answer_problems(STEPS, r)[0][0])

    def test_per_choice(self):
        self.assertEqual(er.per_choice_problems({"A": "Choice A reverses the logic of the passage."}, {"A", "B"}), [])
        self.assertIn("no choice E", er.per_choice_problems({"E": "x" * 30}, {"A"})[0])
        self.assertIn("too short", er.per_choice_problems({"A": "No."}, {"A"})[0])
        self.assertIn("must map", er.per_choice_problems([], {"A"})[0])


class PlanTest(unittest.TestCase):
    def test_every_refusal(self):
        rows = [live(n) for n in range(1, 13)]
        rows[1]["is_live"] = False
        rows[2]["archived_at"] = "2099-01-01T00:00:00+00:00"
        rows[4]["answer_key_entries"].append(copy.deepcopy(rows[4]["answer_key_entries"][0]))
        lines = [
            {**line(1), "question_id": "NOT-A-UUID"},                           # malformed id
            line(2),                                                           # not live
            line(3),                                                           # archived
            line(4, explanation_sha256_before="0" * 64),                       # changed since written
            line(5),                                                           # two answer key entries
            line(6, stable_question_id=SID.format(42)),                        # another stable id
            line(7, text=good("C")),                                           # names another letter
            line(8, text=good() + " –"),                                  # en dash
            line(9), line(9),                                                  # two lines
            line(10, explanation_per_choice={"E": "Choice E is not a choice here at all."}),
            line(11),                                                          # app check refuses
            line(13),                                                          # not in the export
            {k: v for k, v in line(12).items() if k != "explanation_sha256_before"},
        ]
        check = FakeCheck({UUID.format(11): "explanation_text: KaTeX cannot parse"})
        res = plan(lines, rows, check)
        r = {int(k[-2:]) if k.startswith("0000") else k: v for k, v in res["refused"].items()}
        self.assertEqual(res["items"], [])
        self.assertIn("question_id is not a lowercase uuid", r["NOT-A-UUID"])
        self.assertEqual(r[2], "not live")
        self.assertEqual(r[3], "not live")
        self.assertIn("is not the row's explanation now", r[4])
        self.assertIn("2 answer key entries", r[5])
        self.assertIn("is not the row's", r[6])
        self.assertIn("C but the key is A", r[7])
        self.assertIn("en dash", r[8])
        self.assertIn("2 lines for one question", r[9])
        self.assertIn("no choice E", r[10])
        self.assertIn("app check: explanation_text: KaTeX", r[11])
        self.assertIn("not in the live export", r[13])
        self.assertIn("explanation_sha256_before missing", r[12])
        self.assertEqual(check.seen, [UUID.format(11)])

    def test_unchanged_rows_are_skipped_so_a_file_can_run_again(self):
        r = live(1)
        r["explanation_text"] = good()
        res = plan([line(1, row=live(1))], [r])  # its hash-before is the old text's: skipped, not refused
        self.assertEqual((res["items"], res["unchanged"], res["refused"]), ([], [UUID.format(1)], {}))

    def test_batch_defers_the_rest(self):
        rows = [live(n) for n in range(1, 6)]
        res = plan([line(n) for n in range(1, 6)], rows, batch=2)
        self.assertEqual([it["id"] for it in res["items"]], [UUID.format(1), UUID.format(2)])
        self.assertEqual(res["deferred"], [UUID.format(n) for n in (3, 4, 5)])

    def test_null_explanation_before(self):
        r = live(1, explanation_text=None)
        self.assertEqual(len(plan([line(1, explanation_sha256_before=None)], [r])["items"]), 1)
        self.assertEqual(len(plan([line(1, explanation_sha256_before=er.sha256_text(""))], [r])["items"]), 1)

    def test_history_is_recorded_in_the_evidence(self):
        it, = plan([line(1)], [live(1)])["items"]
        entry = it["raw_after"]["explanation_replacements"][-1]
        self.assertEqual(entry["set"], ["explanation_text"])
        self.assertEqual(entry["previous_explanation_sha256"], er.sha256_text("Old explanation 1."))
        self.assertEqual(entry["previous_question_payload_sha256"], "a" * 64)


class SqlTest(unittest.TestCase):
    def items(self, n=1, **kw):
        rows = [live(k) for k in range(1, n + 1)]
        return plan([line(k, **kw) for k in range(1, n + 1)], rows)["items"], rows

    def test_guards_and_writes_only_the_explanation_and_the_seal(self):
        items, rows = self.items()
        sql, = qe.explain_sql(items, doc_of(rows))
        self.assertEqual((sql.count("BEGIN;"), sql.count("\nCOMMIT;")), (1, 1))
        self.assertIn("bank changed since export", sql)
        self.assertIn("q.explanation_text IS DISTINCT FROM 'Old explanation 1.'", sql)
        self.assertIn("coalesce(q.explanation_per_choice <> 'null'::jsonb, false)", sql)
        self.assertIn("q.updated_at IS DISTINCT FROM '2099-01-01T00:00:00+00:00'::timestamptz", sql)
        self.assertIn("q.is_live IS DISTINCT FROM true", sql)
        self.assertIn("answer key evidence changed since the export", sql)
        sets = [x for x in sql.splitlines() if " SET " in x]
        self.assertEqual(len(sets), 2)
        self.assertTrue(sets[0].startswith(" UPDATE public.quiz_questions SET explanation_text = 'Step 1:"))
        self.assertNotIn("explanation_per_choice =", sets[0])
        self.assertNotIn(",", sets[0].split("SET", 1)[1].split("' WHERE")[0].replace(", ", ""))
        self.assertTrue(sets[1].startswith(" UPDATE public.answer_key_entries SET raw_model_response = '{"))
        self.assertIn('"explanation_replacements"', sets[1])
        self.assertNotIn("is_live =", sql)
        undo, = qe.restore_sql(items)
        self.assertIn("SET explanation_text = 'Old explanation 1.'", undo)
        self.assertIn("q.explanation_text IS DISTINCT FROM 'Step 1:", undo)
        self.assertNotIn("q.updated_at", undo)
        self.assertNotIn("explanation_replacements", undo.split("UPDATE public.answer_key_entries", 1)[1])

    def test_per_choice_is_set_only_when_given(self):
        epc = {"B": "Choice B reverses the cause and the effect in the passage."}
        items, rows = self.items(explanation_per_choice=epc)
        sql, = qe.explain_sql(items, doc_of(rows))
        self.assertIn(", explanation_per_choice = '{\"B\":\"Choice B reverses", sql)
        self.assertEqual(qe.expected(items, True)[UUID.format(1)]["explanation_per_choice"], epc)

    def test_chunks_hold_the_fingerprint_and_one_commit_each(self):
        items, rows = self.items(n=6)
        files = qe.explain_sql(items, doc_of(rows), max_bytes=6000)
        self.assertGreater(len(files), 1)
        self.assertEqual(sum(f.count(qe._ROW_NOTE) for f in files), 6)
        for f in files:
            self.assertEqual((f.count("BEGIN;"), f.count("\nCOMMIT;")), (1, 1))
            self.assertIn("bank changed since export", f)
        self.assertEqual(len(qe.restore_sql(items, max_bytes=6000)), len(files))

    def test_expected_readback(self):
        items, _ = self.items()
        after, before = qe.expected(items, True)[UUID.format(1)], qe.expected(items, False)[UUID.format(1)]
        self.assertEqual((after["explanation_text"], before["explanation_text"]), (good(), "Old explanation 1."))
        self.assertTrue(after["is_live"] and before["is_live"])
        self.assertEqual(after["raw_model_response"]["approved_tags"]["question_payload_sha256"], "e" * 64)
        self.assertEqual(before["raw_model_response"]["approved_tags"]["question_payload_sha256"], "a" * 64)


class RunTest(unittest.TestCase):
    def setup(self, d):
        pipe = Path(d)
        rows = [live(1)]
        lines = pipe / "lines.jsonl"
        ln = line(1)
        ln.pop("_line")
        lines.write_text(json.dumps(ln) + "\n")
        calls = []
        seen_lock = []

        def db(p):
            seen_lock.append((pipe / "writer.lock").exists())
            calls.append(Path(p).name)
            if Path(p).name == "readback.sql":
                back = [{"id": UUID.format(1), **qe.expected(self.items, True)[UUID.format(1)]}]
                return [{"rows": back}]
            return [{"rows": []}]

        def check(items, work):
            res = FakeCheck()(items)
            self.items = [{**it, "raw_after": c["raw_after"], "seal_before": c["seal_before"],
                           "seal_after": c["seal_after"]} for it, c in zip(items, res["rows"])]
            return res

        deps = el.Deps(db=db, log=lambda m: None, sleep=lambda s: None,
                       exporter=lambda out: write_export(Path(out), slim_of(rows)),
                       full_exporter=lambda out: Path(out).write_text(json.dumps({"rows": rows})),
                       explain_checker=check)
        return pipe, lines, calls, seen_lock, deps

    def test_dry_takes_and_releases_the_lock_and_runs_only_the_dry_twins(self):
        with tempfile.TemporaryDirectory() as d:
            pipe, lines, calls, seen_lock, deps = self.setup(d)
            res = el.run_explain(pipe, str(lines), NOW, dry=True, deps=deps)
            self.assertEqual((res["to_change"], res["result"]), (1, "dry run passed (rolled back)"))
            self.assertEqual(calls, ["explain.dryrun.sql"])
            self.assertEqual(seen_lock, [True])
            self.assertFalse((pipe / "writer.lock").exists())
            self.assertFalse((pipe / "intents.jsonl").exists())
            run = pipe / "qa" / "explain-20990102T000000Z-dry"
            for f in ("plan.json", "explain.sql", "explain.dryrun.sql", "restore.sql", "readback.sql"):
                self.assertTrue((run / f).exists(), f)
            self.assertTrue(json.loads((run / "plan.json").read_text())["dry_passed"])
            self.assertFalse((pipe / "qa" / "explanations.jsonl").exists())

    def test_a_held_lock_stops_even_a_dry_run_before_any_read(self):
        with tempfile.TemporaryDirectory() as d:
            pipe, lines, calls, _, deps = self.setup(d)
            writer.acquire_lock(pipe / "writer.lock", "autopilot auto-x", NOW)
            with self.assertRaises(writer.LockHeld):
                el.run_explain(pipe, str(lines), NOW, dry=True, deps=deps)
            self.assertEqual(calls, [])
            self.assertFalse((pipe / "qa").exists())
            self.assertIn("autopilot", (pipe / "writer.lock").read_text())

    def test_real_run_closes_its_intent_and_logs_the_before_text(self):
        with tempfile.TemporaryDirectory() as d:
            pipe, lines, calls, _, deps = self.setup(d)
            res = el.run_explain(pipe, str(lines), NOW, deps=deps)
            self.assertEqual(res["result"], "changed")
            self.assertEqual(calls, ["explain.dryrun.sql", "explain.sql", "readback.sql"])
            self.assertEqual(writer.open_intents(pipe / "intents.jsonl"), [])
            log, = [json.loads(x) for x in (pipe / "qa" / "explanations.jsonl").read_text().splitlines()]
            self.assertEqual((log["id"], log["explanation_before"]), (UUID.format(1), "Old explanation 1."))
            self.assertEqual(log["explanation_sha256_after"], er.sha256_text(good()))
            self.assertFalse((pipe / "writer.lock").exists())

    def test_check_only_writes_no_sql(self):
        with tempfile.TemporaryDirectory() as d:
            pipe, lines, calls, _, deps = self.setup(d)
            with open(lines, "a") as f:
                f.write(json.dumps({k: v for k, v in line(2).items() if k != "_line"}) + "\n")
            res = el.run_check(pipe, str(lines), NOW, deps=deps)
            self.assertEqual((res["would_change"], res["refused"]), (1, 1))
            self.assertEqual(calls, [])
            run = Path(res["run"])
            self.assertEqual(sorted(p.name for p in run.glob("*.sql")), [])
            self.assertIn("not in the live export", (run / "refused.jsonl").read_text())


class RealCheckTest(unittest.TestCase):
    """ts/explain-check.ts: KaTeX, the screen's split, the grader and the app's own seal."""

    def sealed(self, r, work):
        r["answer_key_entries"][0]["raw_model_response"]["approved_tags"]["question_payload_sha256"] = \
            qa_run.qa_retag_check([{"row": r, "question_after": {}, "raw_after": {}}], work)["rows"][0]["seal_before"]
        return r

    def run_check(self, rows, lines, work):
        res = qe.build_plan(lines, {r["id"]: r for r in rows}, {s["id"]: s for s in slim_of(rows)},
                            lambda items: el.app_check(items, work), NOW, "explain-real")
        return res

    def test_reseal_katex_split_and_grader(self):
        with tempfile.TemporaryDirectory() as d:
            work = Path(d)
            mc = self.sealed(live(1), work)
            num = self.sealed(numeric(2), work)
            bad_tex = self.sealed(live(3), work)
            dollar = self.sealed(live(4), work)
            wrong_num = self.sealed(numeric(5, key="0.8"), work)
            stale = live(6)  # its stored seal is "a" * 64: not served as it is
            lines = [line(1, row=mc), line(2, text=math_good(), row=num),
                     line(3, text=STEPS + r"So \(\frac{1}{2\) holds. Choice A is correct.", row=bad_tex),
                     line(4, text=STEPS + r"Both \(x\) values $5 and $6 cost less. Choice A is correct.", row=dollar),
                     line(5, text=math_good(), row=wrong_num), line(6, row=stale)]
            res = self.run_check([mc, num, bad_tex, dollar, wrong_num, stale], lines, work)
            ok = {it["id"]: it for it in res["items"]}
            self.assertEqual(sorted(ok), [UUID.format(1), UUID.format(2)], res["refused"])
            r = res["refused"]
            self.assertIn("KaTeX cannot parse", r[UUID.format(3)])
            self.assertIn("a $ outside math", r[UUID.format(4)])
            self.assertIn("not accepted for the key 0.8", r[UUID.format(5)])
            self.assertIn("not served as it is", r[UUID.format(6)])
            it = ok[UUID.format(1)]
            after = copy.deepcopy(mc)
            after["explanation_text"] = good()
            want = qa_run.qa_retag_check([{"row": after, "question_after": {}, "raw_after": {}}],
                                         work)["rows"][0]["seal_before"]
            self.assertEqual(it["seal_after"], want)
            self.assertNotEqual(it["seal_after"], it["seal_before"])
            self.assertEqual(it["raw_after"]["approved_tags"]["question_payload_sha256"], want)
            self.assertEqual(it["raw_after"]["explanation_replacements"][-1]["by"], "k qa explain")

    def test_the_screen_split_is_checked_even_where_the_rules_would_pass(self):
        with tempfile.TemporaryDirectory() as d:
            r = self.sealed(live(1), Path(d))
            text = STEPS + r"Here \(\$5\) is money. Choice A is correct."
            out = el.app_check([{"row": r, "explanation_text": text, "explanation_per_choice": None,
                                 "set_per_choice": False, "stated": {"kind": "letter", "values": ["A"]},
                                 "raw_after": copy.deepcopy(r["answer_key_entries"][0]["raw_model_response"])}],
                               Path(d))["rows"][0]
            self.assertTrue(out["ok"], out.get("error"))


if __name__ == "__main__":
    unittest.main()
