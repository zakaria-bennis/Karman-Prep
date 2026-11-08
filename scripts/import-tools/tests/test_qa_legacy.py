"""k qa ids and k qa fix-legacy against synthetic rows (no database)."""

import copy
import json
import re
import tempfile
import unittest
from pathlib import Path

from kimport import qa_ids, qa_legacy, qa_run, writer
from kimport import qa_hide as qh
from kimport.answer_evidence import GENERATED, stable_question_id
from kimport.autopilot import DbError
from kimport.export import ExportDoc, fingerprint
from tests.export_fixtures import export_doc, write_export

NOW = "2026-10-23T10:00:00Z"
_FP = re.compile(r"^-- export \S+: (\d+) rows, fingerprint ([0-9a-f]{32})$", re.M)
QA = "qa:key_wrong: key A->C"


def uid(n: int) -> str:
    return f"00000000-0000-4000-8000-{n:012d}"


def official(sid):
    return {"approved_tags": {"stable_question_id": sid}, "student_publication_allowed": True}


def generated(sid):
    return {"kind": GENERATED, "evidence": {"approved_tags": {"stable_question_id": sid}}}


def question(n: int, **kw) -> dict:
    q = {"id": uid(n), "subject": "reading", "domain": "conventions", "answer_format": "multiple_choice",
         "passage_intro": None, "passage": f"passage {n}", "passage_a": None, "passage_b": None,
         "question_text": f"Which choice completes text {n}?", "correct_answer": "A", "verified_answer": None,
         "selected_official_answer": "A", "answer_key_status": "printed_key_used_no_correction",
         "publish_status": "needs_human_review", "import_status": "needs_review", "import_flag_reason": QA,
         "archived_at": "2026-10-23T01:00:00+00:00", "is_live": False, "comparison_key": None,
         "source_version": None, "source_section": None, "source_module": None, "source_question_number": None,
         "figure_table_data": None, "figure_chart_data": None, "figure_geometry_data": None, "figure_svg": None,
         "created_at": "2026-06-01T00:00:00+00:00"}
    q.update(kw)
    return q


def entry(n: int, **kw) -> dict:
    q = question(n, **{k: v for k, v in kw.items() if k not in ("raw", "choices")})
    if "choices" in kw:
        texts = kw["choices"]
    else:
        texts = {} if q["answer_format"] == "numeric_entry" else {x: f"choice {x}{n}" for x in "ABCD"}
    choices = [{"id": uid(1000 + 10 * n + i), "question_id": q["id"], "letter": x, "choice_text": t,
                "is_correct": x == q["correct_answer"], "raw_choice_text": t, "choice_table_data": None}
               for i, (x, t) in enumerate(sorted(texts.items()))] or None
    q["content_hash_v2"] = qa_legacy.content_hash_v2(q, {c["letter"]: c["choice_text"] for c in choices or []})
    keys = [{"id": uid(5000 + n), "question_id": q["id"], "raw_model_response": kw.get("raw"),
             "created_at": "2026-06-01T00:00:00+00:00"}]
    return {"question": q, "choices": choices, "keys": keys}


def fix(n: int, key="C", **kw) -> dict:
    return {"id": uid(n), "decision": "fix", "verdict": "key_wrong", "corrected_key": key, **kw}


class FakeBank:
    """Answers the export, snapshot and readback queries and applies fix-legacy files from their notes."""

    def __init__(self, entries):
        self.rows = {e["question"]["id"]: copy.deepcopy(e) for e in entries}
        self.ran = []

    def export_rows(self):
        return [{**e["question"], "choices": e["choices"]} for e in self.rows.values()]

    def db(self, path):
        text = Path(path).read_text(encoding="utf-8")
        self.ran.append(Path(path).name)
        ids = re.findall(r"'([0-9a-f-]{36})'", text.split("\n", 1)[-1]) if "ANY (ARRAY" in text else []
        if "kimport qa legacy snapshot" in text:
            return [{"readback": {"rows": [{"snapshot": copy.deepcopy(self.rows[i])} for i in sorted(ids)
                                           if i in self.rows]}}]
        if "kimport qa readback (legacy fix)" in text:
            out = []
            for i in sorted(ids):
                e = self.rows[i]
                out.append({"id": i, **{c: e["question"].get(c) for c in (*qa_legacy.SET_COLS, "publish_status",
                                                                         "import_status", "import_flag_reason")},
                            "choices": {c["letter"]: [c["choice_text"], c["is_correct"]] for c in e["choices"]}
                            if e["choices"] else None})
            return [{"rows": out}]
        fp = _FP.search(text)
        if fp and (int(fp.group(1)) != len(self.rows) or fp.group(2) != fingerprint(self.export_rows())):
            raise DbError(qh.FINGERPRINT_FAILED, False)
        new = copy.deepcopy(self.rows)
        for line in text.splitlines():
            if line.startswith("-- kimport qa legacy row "):
                note = json.loads(line[len("-- kimport qa legacy row "):])
                e = new[note["id"]]
                if qa_legacy._sha({"question": e["question"], "choices": e["choices"], "keys": e["keys"]}) \
                        != note["expect_sha256"]:
                    raise DbError(f"QA row changed since the readback: {note['id']}", False)
                e["question"].update(note["set"])
                for c in e["choices"] or []:
                    c.update(note["choices"].get(c["letter"], {}))
        if text.rstrip().endswith("COMMIT;"):
            self.rows = new
        return []


class Case(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pipe = Path(self.tmp.name)
        (self.pipe / "qa").mkdir()

    def tearDown(self):
        self.tmp.cleanup()

    def write_fixes(self, lines, name="fixes-r2.jsonl"):
        p = self.pipe / "qa" / name
        p.write_text("".join(json.dumps(x) + "\n" for x in lines), encoding="utf-8")
        return p


class StableIdReaderTest(unittest.TestCase):
    def test_both_envelopes(self):
        self.assertEqual(stable_question_id(official("s1")), "s1")
        self.assertEqual(stable_question_id(generated("s2")), "s2")
        self.assertIsNone(stable_question_id({"kind": GENERATED, "approved_tags": {"stable_question_id": "top"},
                                              "evidence": {}}))
        self.assertIsNone(stable_question_id(None))
        self.assertIsNone(stable_question_id({}))


class IdsTest(Case):
    LEDGER = [{"id": "2024-08_US_V4_RW_M2_Q19", "exam": "2024-08_US_V4", "source_sha256": "pdf1"},
              {"id": "2024-08_US_V4_RW_M2_Q20", "exam": "2024-08_US_V4", "source_sha256": "pdf1"},
              {"id": "2023-12_X_RW_M1_Q05", "exam": "2023-12_X", "source_sha256": "pdf9"}]

    def rows(self):
        tup = {"source_version": "pdf1", "source_section": "reading", "source_module": "M2"}
        return [
            {"id": uid(1), **tup, "source_question_number": 19, "answer_key_entries": [
                {"raw_model_response": generated("2024-08_US_V4_RW_M2_Q19")}]},       # generated envelope
            {"id": uid(2), "answer_key_entries": [{"raw_model_response": None}]},      # legacy
            {"id": uid(3), **tup, "source_question_number": 20, "answer_key_entries": [
                {"raw_model_response": official("2024-08_US_V4_RW_M2_Q21")}]},        # tuple says Q20
            {"id": uid(4), "answer_key_entries": [{"raw_model_response": official("dup")}]},
            {"id": uid(5), "answer_key_entries": [{"raw_model_response": official("dup")}]},
            {"id": uid(6), "answer_key_entries": [{"raw_model_response": official("2023-12_Y_RW_M1_Q05")}]},
        ]

    def test_derive(self):
        clusters = {"clusters": [{"members": [{"id": uid(6)}, {"id": "2023-12_X_RW_M1_Q05"}]}]}
        res = qa_ids.derive([uid(n) for n in range(1, 8)], qa_ids.read_rows({"rows": self.rows()}), self.LEDGER,
                            clusters)
        st = {k: v["status"] for k, v in res["rows"].items()}
        self.assertEqual(st, {uid(1): "evidence", uid(2): "legacy", uid(3): "ambiguous", uid(4): "ambiguous",
                              uid(5): "ambiguous", uid(6): "ambiguous", uid(7): "not_found"})
        self.assertEqual(res["map"][uid(1)], "2024-08_US_V4_RW_M2_Q19")
        self.assertEqual(res["rows"][uid(1)]["from_source_tuple"], ["2024-08_US_V4_RW_M2_Q19"])
        self.assertIn("the source tuple reads 2024-08_US_V4_RW_M2_Q20", res["rows"][uid(3)]["why"])
        self.assertTrue(any("another bank row" in w for w in res["rows"][uid(4)]["why"]))
        self.assertTrue(any("corpus cluster holds 2023-12_X_RW_M1_Q05" in w for w in res["rows"][uid(6)]["why"]))
        self.assertEqual(res["stable_ids"], ["2024-08_US_V4_RW_M2_Q19"])

    def test_ids_sql_is_read_only_and_reads_both_envelopes(self):
        sql = qa_ids.ids_sql()
        self.assertNotRegex(sql.upper(), r"\b(UPDATE|INSERT|DELETE|ALTER|BEGIN)\b")
        self.assertIn("->'evidence'->'approved_tags'->>'stable_question_id'", sql)
        rows = qa_ids.read_rows([{"ids": {"rows": [{"id": uid(1), "stable_ids": ["a"]}]}}])
        self.assertEqual(rows[0]["stable_ids"], ["a"])

    def test_run_ids_and_write_approved_keeps_undecided_rows(self):
        qa = self.pipe / "qa"
        qh.append_log(qa / "hidden.jsonl", [{"id": uid(n), "at": NOW} for n in (1, 2, 3)])
        (qa / "hidden-id-map.json").write_text(json.dumps({uid(1): None, uid(3): "kept-before"}))
        rows = self.pipe / "rows.json"
        rows.write_text(json.dumps({"rows": self.rows()}))
        ledger = self.pipe / "ledger.json"
        ledger.write_text(json.dumps({"items": self.LEDGER}))
        clusters = self.pipe / "clusters.json"
        clusters.write_text(json.dumps({"clusters": []}))
        res = qa_run.run_ids(self.pipe, [], NOW, str(rows), [str(ledger)], str(clusters))
        self.assertEqual(res["counts"], {"ambiguous": 1, "evidence": 1, "legacy": 1})
        self.assertEqual(res["legacy"], [uid(2)])
        out = qa_run.run_ids(self.pipe, [], NOW, write_approved=True)
        self.assertEqual(out["kept_as_before"], {uid(3): "kept-before"})
        self.assertEqual(json.loads((qa / "hidden-id-map.json").read_text()),
                         {uid(1): "2024-08_US_V4_RW_M2_Q19", uid(2): None, uid(3): "kept-before"})
        self.assertEqual(json.loads((qa / "hidden-stable-ids.json").read_text()),
                         ["2024-08_US_V4_RW_M2_Q19", "kept-before"])


class CheckTest(unittest.TestCase):
    def check(self, e, line, other=frozenset()):
        return qa_legacy.check(line, [e], set(other))

    def test_key_fix_moves_is_correct_and_leaves_official_alone(self):
        it, why = self.check(entry(1), fix(1))
        self.assertEqual(why, [])
        self.assertEqual(it["set"], {"correct_answer": "C", "verified_answer": "C",
                                     "answer_key_status": "corrected_key_verified"})
        self.assertEqual(it["choices"], {"A": {"choice_text": "choice A1", "is_correct": False},
                                         "C": {"choice_text": "choice C1", "is_correct": True}})
        self.assertNotIn("selected_official_answer", it["set"])

    def test_text_fix_recomputes_the_hash(self):
        e = entry(1)
        it, why = self.check(e, fix(1, key="A", corrected_question_text="Fixed?", corrected_choices={"B": "b!"}))
        self.assertEqual(why, [])
        self.assertEqual(it["set"]["question_text"], "Fixed?")
        texts = {c["letter"]: c["choice_text"] for c in e["choices"]}
        self.assertEqual(it["set"]["content_hash_v2"],
                         qa_legacy.content_hash_v2({**e["question"], "question_text": "Fixed?"}, {**texts, "B": "b!"}))
        self.assertNotIn("correct_answer", it["set"])  # the key did not change
        self.assertEqual(it["choices"], {"B": {"choice_text": "b!", "is_correct": False}})

    def test_hash_formula_must_reproduce_and_no_figures(self):
        e = entry(1)
        e["question"]["content_hash_v2"] = "f" * 64
        self.assertIn("text-only formula", self.check(e, fix(1, key="A", corrected_question_text="x"))[1][0])
        self.assertEqual(self.check(e, fix(1))[1], [])  # a key-only fix needs no hash
        e = entry(2, figure_table_data={"rows": [["1"]]})
        self.assertIn("figure or table", self.check(e, fix(2, corrected_question_text="x"))[1][0])

    def test_duplicate_content_is_refused(self):
        e = entry(1)
        texts = {c["letter"]: c["choice_text"] for c in e["choices"]}
        h = qa_legacy.content_hash_v2({**e["question"], "question_text": "x"}, texts)
        self.assertIn("another bank row", self.check(e, fix(1, corrected_question_text="x"), {h})[1][0])

    def test_refusals(self):
        cases = [
            (entry(1, publish_status="publish_ready"), fix(1), "student-visible"),
            (entry(1, raw=generated("s1")), fix(1), "names s1"),
            (entry(1, raw=official("s1")), fix(1), "names s1"),
            (entry(1), fix(1, corrected_passage="other"), "corrected_passage differs"),
            (entry(1), fix(1, key="E"), "not one of the row's choices"),
            (entry(1), fix(1, key="A"), "changes nothing"),
            (entry(1, answer_format="numeric_entry", correct_answer="25014"),
             fix(1, key="6", numeric_answer_set=["6", "10"]), "needs a source tuple"),
            (entry(1, answer_format="numeric_entry", correct_answer="25014"), fix(1, key="abc"), "not a number"),
            (entry(1), fix(1, key=None), "no corrected_key"),
        ]
        for e, line, want in cases:
            with self.subTest(want=want):
                why = self.check(e, line)[1]
                self.assertTrue(any(want in w for w in why), why)

    def test_numeric_key_and_restated_fields_pass(self):
        e = entry(1, answer_format="numeric_entry", correct_answer="25014")
        it, why = self.check(e, fix(1, key="11094", numeric_answer_set=["11094"],
                                    corrected_passage=e["question"]["passage"]))
        self.assertEqual(why, [])
        self.assertEqual(it["set"]["correct_answer"], "11094")
        self.assertEqual(it["choices"], {})

    def test_conflicting_fix_lines_are_refused(self):
        with tempfile.TemporaryDirectory() as d:
            a, b = Path(d) / "a.jsonl", Path(d) / "b.jsonl"
            a.write_text(json.dumps(fix(1)) + "\n" + json.dumps({"id": uid(2), "decision": "retire"}) + "\n")
            b.write_text(json.dumps(fix(1, key="D")) + "\n")
            fixes, bad = qa_legacy.read_fixes([a, b])
            self.assertEqual(set(fixes), {uid(1)})
            self.assertIn("different corrections", bad[uid(1)])

    def test_sql_guards(self):
        it, _ = self.check(entry(1), fix(1))
        d = export_doc([entry(1)["question"]])
        doc = ExportDoc(d["rows"], d["exported_at"], d["row_count"], d["fingerprint"])
        res = qa_legacy.build({uid(1): fix(1)}, {}, doc, [entry(1)])
        sql = res["files"]["fix-legacy.sql"]
        self.assertEqual(res["files"]["fix-legacy.dryrun.sql"], sql.replace("\nCOMMIT;\n", "\nROLLBACK;\n"))
        self.assertIn(qh.FINGERPRINT_FAILED, sql)
        self.assertIn("FOR UPDATE", sql)
        self.assertIn("IS DISTINCT FROM v->'old'->'question'", sql)
        self.assertIn("coalesce(q.publish_status,'') NOT IN ('publish_ready','publish_ready_with_verified_repair')", sql)
        self.assertIn("the key is not the one correct choice", sql)
        for col in ("publish_status", "import_status", "archived_at", "import_flag_reason", "selected_official_answer"):
            self.assertNotIn(f"{col}=r.", sql)
        self.assertNotIn("answer_key_entries SET", sql)
        self.assertNotIn("DELETE", sql)
        rb = res["files"]["fix-legacy-rollback.sql"]
        self.assertIn("the row no longer holds the legacy fix", rb)
        self.assertNotRegex(res["files"]["readback.sql"].upper(), r"\b(UPDATE|INSERT|DELETE)\b")


class RunFixLegacyTest(Case):
    def setUp(self):
        super().setUp()
        self.bank = FakeBank([entry(1), entry(2, answer_format="numeric_entry", correct_answer="25014"),
                              entry(3, raw=generated("s3"))])
        self.fixes = self.write_fixes([fix(1), fix(2, key="11094"), fix(3)])

    def deps(self):
        def exporter(out):
            write_export(out, self.bank.export_rows())
        return qa_run.Deps(db=self.bank.db, exporter=exporter, sleep=lambda s: None, log=lambda m: None)

    def run_fix(self, **kw):
        return qa_run.run_fix_legacy(self.pipe, [self.fixes], NOW, deps=self.deps(), **kw)

    def test_plan_runs_nothing_but_the_read_only_snapshot(self):
        res = self.run_fix(plan=True)
        self.assertEqual((res["to_fix"], res["result"]), (2, "planned (nothing ran)"))
        self.assertIn("names s3", res["refused"][uid(3)])
        self.assertEqual(self.bank.ran, ["snapshot.sql"])
        self.assertFalse((self.pipe / "intents.jsonl").exists())

    def test_dry_runs_only_the_twin(self):
        before = copy.deepcopy(self.bank.rows)
        self.assertEqual(self.run_fix(dry=True)["result"], "dry run passed (rolled back)")
        self.assertEqual(self.bank.ran, ["snapshot.sql", "fix-legacy.dryrun.sql"])
        self.assertEqual(self.bank.rows, before)

    def test_fix_applies_in_place_and_the_row_stays_hidden(self):
        res = self.run_fix()
        self.assertEqual(res["result"], "fixed (still hidden)", res)
        self.assertEqual(self.bank.ran[-3:], ["fix-legacy.dryrun.sql", "fix-legacy.sql", "readback.sql"])
        q = self.bank.rows[uid(1)]["question"]
        self.assertEqual((q["correct_answer"], q["verified_answer"], q["selected_official_answer"]), ("C", "C", "A"))
        self.assertEqual((q["publish_status"], q["import_flag_reason"], q["is_live"]), ("needs_human_review", QA, False))
        self.assertEqual([c["letter"] for c in self.bank.rows[uid(1)]["choices"] if c["is_correct"]], ["C"])
        self.assertEqual(self.bank.rows[uid(2)]["question"]["correct_answer"], "11094")
        self.assertEqual(self.bank.rows[uid(3)]["question"]["correct_answer"], "A")  # refused, untouched
        self.assertEqual(writer.open_intents(self.pipe / "intents.jsonl"), [])
        log = qh.read_log(self.pipe / "qa" / qa_legacy.LOG)
        self.assertEqual([e["id"] for e in log], [uid(1), uid(2)])
        self.assertEqual(log[0]["before"]["correct_answer"], "A")
        self.assertFalse((self.pipe / "writer.lock").exists())
        # a second run: nothing left to change on the fixed rows
        again = self.run_fix(dry=True)
        self.assertIn("changes nothing", again["refused"][uid(1)])

    def test_bank_changed_after_the_snapshot_writes_nothing(self):
        stale = self.pipe / "snap.json"
        stale.write_text(json.dumps([{"readback": {"rows": [{"snapshot": e} for e in self.bank.rows.values()]}}]))
        self.bank.rows[uid(1)]["choices"][0]["choice_text"] = "edited meanwhile"
        with self.assertRaisesRegex(ValueError, "dry run failed"):
            self.run_fix(snapshot=str(stale))
        self.assertEqual(self.bank.rows[uid(1)]["question"]["correct_answer"], "A")
        self.assertEqual(writer.open_intents(self.pipe / "intents.jsonl"), [])

    def test_lock_held(self):
        writer.acquire_lock(self.pipe / "writer.lock", "someone", NOW)
        with self.assertRaises(writer.LockHeld):
            self.run_fix()

    def test_restore_after_fix_needs_the_results_resolved(self):
        """The fix leaves the row QA-hidden; k qa restore still refuses while the results call it unresolved."""
        self.run_fix()
        rows = {e["question"]["id"]: e["question"] for e in self.bank.rows.values()}
        hidden = {uid(1): {"id": uid(1), "reason": QA}}
        bad = qa_run.restore_checks([uid(1)], hidden, {uid(1): {"id": uid(1), "verdict": "key_wrong"}}, set(), rows)
        self.assertIn("still unresolved", bad[uid(1)])
        self.assertEqual(qa_run.restore_checks([uid(1)], hidden, {}, set(), rows), {})


if __name__ == "__main__":
    unittest.main()
