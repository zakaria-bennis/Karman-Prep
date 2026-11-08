import hashlib
import json
import os
import re
import tempfile
import unittest
from pathlib import Path

from kimport import stage
from kimport.publish import RefuseToBuild, build_publish
from tests import publish_fixtures as pfx
from tests import stage_fixtures as fx
from tests.export_fixtures import write_export

TEXT1 = "Which made-up choice best completes the note about the alder grove?"
TEXT2 = "According to the invented survey, what did most of the birch owners report?"


class StageCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)
        self.batch = fx.write_batch_dir(self.d / "syn-1")
        self.out = self.batch / "stage"

    def tearDown(self):
        self.tmp.cleanup()

    def export(self, rows, name="export.json"):
        return write_export(self.d / name, rows)

    def build(self, rows, export_rows=(), approve_figures=True, **kw):
        if approve_figures:
            fx.approve_figure_rows(self.batch, rows)
        return stage.build_stage(self.batch, self.export(list(export_rows)), self.d / "x.pdf",
                                 rows_doc=fx.rows_doc(rows), **kw)

    def run_stage(self, rows, export_rows=(), **kw):
        res = self.build(rows, export_rows, **kw)
        stage._write_all(self.out, res["files"])
        return res

    def staged_readback(self, rows):
        self.run_stage(rows)
        prev = json.loads((self.out / "stage-preview.json").read_text())
        snaps = [fx.db_snapshot(p, i) for i, p in enumerate(prev["rows"], 1)]
        path = self.d / "readback-raw.json"
        # the CLI result shape: one row wrapping the object
        path.write_text(json.dumps([{"readback": {"rows": [{"snapshot": s} for s in reversed(snaps)]}}]))
        return path, snaps


class TestReady(StageCase):
    def test_reads_paths_and_batch_name(self):
        ready = stage.read_ready(self.batch)
        self.assertEqual(ready["batch"], "syn-1")
        self.assertEqual(ready["frozen_manifest_sha256"], "e" * 64)

    def test_finds_tag_binding_without_a_line(self):
        b = fx.write_batch_dir(self.d / "syn-2", name="syn-2", tag_line=False)
        self.assertTrue(stage.read_ready(b)["tag_binding"].endswith("syn-2-tag-binding.json"))

    def test_missing_manifest_sha_refused(self):
        (self.batch / "READY").write_text("batch: syn-1\nreviewed_file: a\nfrozen_manifest: b\n")
        with self.assertRaisesRegex(RefuseToBuild, "frozen_manifest_sha256"):
            stage.read_ready(self.batch)


class TestStageSql(StageCase):
    def test_clean_batch(self):
        res = self.run_stage([fx.stage_row(1, TEXT1), fx.stage_row(2, TEXT2)])
        sql = (self.out / "stage.sql").read_text()
        self.assertEqual(sql.count("BEGIN;"), 1)
        self.assertEqual(sql.count("\nCOMMIT;"), 1)
        self.assertIn("kimport_stage_syn_1_fingerprint", sql)
        self.assertEqual(len(re.findall(r"^DO \$kimport_stage_syn_1_\d\d\$", sql, re.M)), 2)
        for guard in ("source question already in the bank", "content_hash_v2 already in the bank",
                      "duplicate comparison key", "normalized question text already in the bank",
                      "jsonb_populate_record(NULL::public.quiz_questions,v->'question')",
                      "jsonb_populate_recordset(NULL::public.answer_choices,v->'choices')",
                      "jsonb_populate_record(NULL::public.answer_key_entries,v->'key')"):
            self.assertEqual(sql.count(guard), 2, guard)
        self.assertRegex(sql, r"INSERT INTO public\.quiz_questions\([a-z0-9_,]*comparison_key")
        dry = (self.out / "stage.dryrun.sql").read_text()
        self.assertTrue(dry.rstrip().endswith("ROLLBACK;"))
        self.assertNotIn("\nCOMMIT;", dry)
        pre = json.loads((self.out / "precheck.json").read_text())
        self.assertTrue(pre["passed"])
        self.assertEqual(pre["refused"], [])
        self.assertEqual(pre["stage_sql_sha256"], hashlib.sha256(sql.encode()).hexdigest())
        self.assertEqual(len(res["staged"]), 2)
        self.assertTrue(all(it["key"] for it in res["staged"]))

    def test_payload_round_trips_through_base64(self):
        row = fx.stage_row(1, TEXT1)
        self.run_stage([row])
        blob = re.search(r"decode\('([A-Za-z0-9+/=]+)','base64'\)", (self.out / "stage.sql").read_text()).group(1)
        import base64
        v = json.loads(base64.b64decode(blob))
        self.assertEqual(v["question"]["question_text"], TEXT1)
        self.assertEqual(v["question"]["comparison_key"][:3], "kn-")
        self.assertEqual(len(v["choices"]), 4)
        self.assertEqual(v["key"]["raw_model_response"]["student_publication_allowed"], False)

    def test_readback_sql_is_read_only_and_scoped(self):
        self.run_stage([fx.stage_row(1, TEXT1), fx.stage_row(2, TEXT2)])
        sql = (self.out / "readback.sql").read_text()
        self.assertNotRegex(sql.upper(), r"\b(INSERT|UPDATE|DELETE)\b")
        self.assertIn(f"('{pfx.SOURCE}','reading','M2',1)", sql)
        self.assertIn(f"('{pfx.SOURCE}','reading','M2',2)", sql)

    def test_numeric_row_has_no_choice_insert(self):
        res = self.run_stage([fx.stage_row(3, "What made-up count does the clerk record?", answer="12",
                                           fmt="numeric_entry")])
        sql = (self.out / "stage.sql").read_text()
        self.assertNotIn("INSERT INTO public.answer_choices", sql)
        self.assertTrue(res["staged"][0]["key"])

    def test_unkeyable_row_gets_null_key_and_no_key_guard(self):
        res = self.run_stage([fx.stage_row(4, TEXT1, figure_kind="image", image_url="https://example.test/a.png")])
        self.assertIsNone(res["staged"][0]["key"])
        sql = (self.out / "stage.sql").read_text()
        self.assertNotIn("duplicate comparison key", sql)
        prev = json.loads((self.out / "stage-preview.json").read_text())
        self.assertIsNone(prev["rows"][0]["comparison_key"])

    def test_tag_binding_mismatch_refused(self):
        with self.assertRaisesRegex(RefuseToBuild, "tag binding"):
            self.build([fx.stage_row(1, TEXT1, manifest="f" * 64)])

    def test_publishable_evidence_refused(self):
        row = fx.stage_row(1, TEXT1)
        row["key"]["raw_model_response"]["student_publication_allowed"] = True
        with self.assertRaisesRegex(RefuseToBuild, "student_publication_allowed"):
            self.build([row])

    def test_two_modules_refused(self):
        with self.assertRaisesRegex(RefuseToBuild, "modules"):
            self.build([fx.stage_row(1, TEXT1), fx.stage_row(2, TEXT2, source_module="M1")])

    def test_export_without_key_column_refused(self):
        live = pfx.live_row(50, "An unrelated made-up question.", {"A": "x", "B": "y", "C": "z", "D": "w"})
        del live["comparison_key"]
        with self.assertRaisesRegex(RefuseToBuild, "comparison_key"):
            self.build([fx.stage_row(1, TEXT1)], [live])


class TestPrecheck(StageCase):
    def live_copy(self, row, n=60, text=None, **over):
        choices = {c["letter"]: c["choice_text"] for c in row["choices"]}
        return pfx.live_row(n, text or row["question"]["question_text"], choices, row["question"]["correct_answer"],
                            **over)

    def test_exact_duplicate_of_live_row_refused(self):
        row = fx.stage_row(1, TEXT1)
        live = self.live_copy(row)
        res = self.run_stage([row, fx.stage_row(2, TEXT2)], [live])
        self.assertFalse((self.out / "stage.sql").exists())
        pre = json.loads((self.out / "precheck.json").read_text())
        self.assertFalse(pre["passed"])
        self.assertEqual([r["id"] for r in pre["refused"]], [row["stable_question_id"]])
        self.assertIn(live["id"], " ".join(pre["refused"][0]["reasons"]))
        self.assertEqual(res["staged"], [])

    def test_typo_duplicate_refused(self):
        row = fx.stage_row(1, TEXT1)
        live = self.live_copy(row, text=TEXT1.replace("alder", "aldr"))
        res = self.build([row], [live])
        self.assertIn("typo-level match", " ".join(res["refused"][row["stable_question_id"]]))

    def test_duplicate_inside_the_batch_refused(self):
        a, b = fx.stage_row(1, TEXT1), fx.stage_row(2, TEXT1, choices={"A": "first 1", "B": "second 1",
                                                                      "C": "third 1", "D": "fourth 1"})
        res = self.build([a, b])
        self.assertEqual(set(res["refused"]), {a["stable_question_id"], b["stable_question_id"]})

    def test_archived_duplicate_ignored(self):
        row = fx.stage_row(1, TEXT1)
        live = self.live_copy(row, text=TEXT1 + " Archived wording.", archived_at="2026-05-28T00:00:00+00:00")
        live["question_text"] = TEXT1 + " (old)"
        res = self.build([row], [live])
        self.assertEqual(res["refused"], {})

    def test_source_tuple_and_hash_already_in_bank_refused(self):
        row = fx.stage_row(1, TEXT1)
        other = pfx.live_row(70, "A different made-up question about cedar.", {"A": "1", "B": "2", "C": "3", "D": "4"},
                             source_version=pfx.SOURCE, source_section="reading", source_module="M2",
                             source_question_number=1, content_hash_v2=row["question"]["content_hash_v2"])
        res = self.build([row], [other])
        reasons = " ".join(res["refused"][row["stable_question_id"]])
        self.assertIn("source question already in the bank", reasons)
        self.assertIn("content_hash_v2 already in the bank", reasons)

    def test_skip_refused_stages_the_rest(self):
        row, ok = fx.stage_row(1, TEXT1), fx.stage_row(2, TEXT2)
        res = self.run_stage([row, ok], [self.live_copy(row)], skip_refused=True)
        sql = (self.out / "stage.sql").read_text()
        self.assertEqual(len(re.findall(r"^DO \$kimport_stage_syn_1_\d\d\$", sql, re.M)), 1)
        self.assertIn(ok["stable_question_id"], sql)
        self.assertNotIn(row["stable_question_id"], sql)
        self.assertEqual([r["id"] for r in res["precheck"]["refused"]], [row["stable_question_id"]])

    def test_run_stage_refusal_removes_stale_sql(self):
        row = fx.stage_row(1, TEXT1)
        self.run_stage([row])
        self.assertTrue((self.out / "stage.sql").exists())
        res = self.build([row], [self.live_copy(row)])
        stale = tuple(n for n in stage.STAGE_FILES if n not in res["files"])
        stage._write_all(self.out, res["files"], remove=stale)
        self.assertFalse((self.out / "stage.sql").exists())
        self.assertFalse((self.out / "readback.sql").exists())


class TestSealAndPublish(StageCase):
    def test_seal_writes_publish_inputs_that_publish_accepts(self):
        rows = [fx.stage_row(1, TEXT1), fx.stage_row(2, TEXT2),
                fx.stage_row(3, "What made-up count does the clerk record?", answer="12", fmt="numeric_entry")]
        raw, snaps = self.staged_readback(rows)
        out = self.out / "sealed-preview.json"
        res = stage.run_seal(raw, self.batch, out, sealer=fx.fake_sealer)
        self.assertEqual(res["rows"], 3)
        sealed = json.loads(out.read_text())
        self.assertNotIn("stage_payload", sealed["rows"][0])
        self.assertTrue(all(re.fullmatch(r"[0-9a-f]{64}", r["question_payload_sha256"]) for r in sealed["rows"]))
        scope = json.loads((self.out / "private-scope.json").read_text())
        self.assertEqual(len(scope["rows"]), 3)
        readback = self.out / "private-readback.json"
        export = self.d / "export-after.json"
        write_export(export, [pfx.export_row(s) for s in snaps])
        os.utime(export, (readback.stat().st_mtime + 10,) * 2)
        intents = self.d / "intents.jsonl"
        bundle = build_publish(readback, out, export, intents, "syn-1")
        self.assertEqual(len(bundle["keys"]), 3)
        self.assertTrue(all(bundle["keys"].values()))
        self.assertTrue(bundle["precheck"]["passed"])

    def test_seal_refuses_a_changed_database_row(self):
        raw, snaps = self.staged_readback([fx.stage_row(1, TEXT1)])
        doc = json.loads(raw.read_text())
        doc[0]["readback"]["rows"][0]["snapshot"]["question"]["question_text"] = "Edited after staging."
        raw.write_text(json.dumps(doc))
        with self.assertRaisesRegex(RefuseToBuild, "question_text in the database differs"):
            stage.run_seal(raw, self.batch, self.out / "sealed-preview.json", sealer=fx.fake_sealer)
        self.assertFalse((self.out / "sealed-preview.json").exists())

    def test_seal_refuses_missing_or_extra_rows(self):
        raw, snaps = self.staged_readback([fx.stage_row(1, TEXT1), fx.stage_row(2, TEXT2)])
        doc = json.loads(raw.read_text())
        doc[0]["readback"]["rows"].pop()
        raw.write_text(json.dumps(doc))
        with self.assertRaisesRegex(RefuseToBuild, "1 readback rows but 2 staged rows"):
            stage.run_seal(raw, self.batch, self.out / "sealed-preview.json", sealer=fx.fake_sealer)

    def test_seal_refuses_publishable_scope(self):
        raw, _ = self.staged_readback([fx.stage_row(1, TEXT1)])

        def sealer(p):
            return [{**s, "publication_allowed_in_snapshot": True} for s in fx.fake_sealer(p)]
        with self.assertRaisesRegex(RefuseToBuild, "publishable"):
            stage.run_seal(raw, self.batch, self.out / "sealed-preview.json", sealer=sealer)


if __name__ == "__main__":
    unittest.main()


class NormTextTest(unittest.TestCase):
    def test_exponents_are_kept(self):
        from kimport.stage import _norm_text
        self.assertNotEqual(_norm_text("Which expression is equivalent to x⁶(x³)?"),
                            _norm_text("Which expression is equivalent to x²⁰(x⁴)"))
        self.assertEqual(_norm_text("x²⁰(x⁴)"), _norm_text("X20 (x4)"))
        self.assertEqual(_norm_text("H₂O, café!"), "h2ocaf")
