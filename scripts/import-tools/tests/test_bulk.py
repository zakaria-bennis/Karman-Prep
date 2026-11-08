import hashlib
import json
import os
import re
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from kimport import bulk, stage
from kimport.export import fingerprint
from kimport.publish import RefuseToBuild, build_publish
from tests import publish_fixtures as pfx
from tests import stage_fixtures as fx
from tests.export_fixtures import current_shape, write_export

WORDS = ("alder", "birch", "cedar", "dogwood", "elm", "fir", "ginkgo", "hazel", "ironwood", "juniper")


def text(n: int) -> str:
    return (f"Which made-up choice best completes note {n} about the {WORDS[n % 10]} grove "
            f"and the {WORDS[(n // 10) % 10]} trail?")


def row(n: int, module: str = "M2", **over) -> dict:
    return fx.stage_row(n, text(n), source_module=module, **over)


class BulkCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)
        self.out = self.d / "bulk-1"
        self.docs = {}

    def tearDown(self):
        self.tmp.cleanup()

    def batch(self, name: str, rows: list[dict]) -> Path:
        d = fx.write_batch_dir(self.d / "batches" / name, name=name)
        self.docs[name] = fx.rows_doc(rows)
        return d

    def export(self, rows=(), name="export.json"):
        return write_export(self.d / name, list(rows))

    def build(self, dirs, export_rows=(), **kw):
        return bulk.build_bulk_stage(dirs, self.export(export_rows), "bulk-1", self.d, rows_docs=self.docs, **kw)

    def write(self, res):
        stage._write_all(self.out, res["files"])
        return res


class TestBulkStage(BulkCase):
    def test_two_batches_one_stage_file(self):
        a = self.batch("syn-1", [row(1), row(2)])
        b = self.batch("syn-2", [row(3, "M1"), row(4, "M1")])
        (self.d / "batches" / "not-ready").mkdir()
        res = self.write(self.build([a, b, self.d / "batches" / "not-ready"]))
        sql = (self.out / "stage.sql").read_text()
        self.assertEqual(sql.count("BEGIN;"), 1)
        self.assertEqual(sql.count("\nCOMMIT;"), 1)
        self.assertEqual(len(re.findall(r"^DO \$kimport_stage_bulk_1_\d{4}\$", sql, re.M)), 4)
        self.assertIn("kimport_stage_bulk_1_c01_fingerprint", sql)
        self.assertIn(f"('{pfx.SOURCE}','reading','M1',3)", sql)  # run rows left out of the bank check
        self.assertIn("(batch syn-2; reading M1 Q3)", sql)
        self.assertTrue((self.out / "stage.dryrun.sql").read_text().rstrip().endswith("ROLLBACK;"))
        pre = json.loads((self.out / "precheck.json").read_text())
        self.assertTrue(pre["passed"])
        self.assertEqual(len(pre["staged_ids"]), 4)
        self.assertEqual(pre["stage_sql_sha256"], hashlib.sha256(sql.encode()).hexdigest())
        self.assertEqual(pre["chunks"][0]["sha256"], pre["stage_sql_sha256"])
        self.assertEqual({k: v["staged"] for k, v in pre["batches"].items()}, {"syn-1": 2, "syn-2": 2})
        prev = json.loads((self.out / "stage-preview.json").read_text())
        self.assertEqual(prev["batch"], "bulk-1")
        self.assertEqual([r["kimport_batch"] for r in prev["rows"]], ["syn-1", "syn-1", "syn-2", "syn-2"])
        rb = (self.out / "readback.sql").read_text()
        self.assertNotRegex(rb.upper(), r"\b(INSERT|UPDATE|DELETE)\b")
        self.assertEqual(len(res["staged"]), 4)

    def test_duplicate_between_batches_refused_and_skipped(self):
        dup = fx.stage_row(5, text(1), source_module="M1",
                           choices={"A": "first 1", "B": "second 1", "C": "third 1", "D": "fourth 1"})
        a = self.batch("syn-1", [row(1), row(2)])
        b = self.batch("syn-2", [dup, row(6, "M1")])
        res = self.build([a, b])
        self.assertNotIn("stage.sql", res["files"])
        ids = {r["id"] for r in res["precheck"]["refused"]}
        self.assertEqual(ids, {row(1)["stable_question_id"], dup["stable_question_id"]})
        reasons = " ".join(r for x in res["precheck"]["refused"] for r in x["reasons"])
        self.assertIn("same comparison key", reasons)
        self.assertIn("in this run", reasons)
        res = self.write(self.build([a, b], skip_refused=True))
        self.assertEqual([it["id"] for it in res["staged"]], [row(2)["stable_question_id"],
                                                             row(6)["stable_question_id"]])

    def test_same_source_question_in_two_batches_refused(self):
        a = self.batch("syn-1", [row(1)])
        b = self.batch("syn-2", [fx.stage_row(1, text(7), content_hash_v2=pfx.hexn(77, 1))])
        res = self.build([a, b])
        self.assertEqual(len(res["precheck"]["refused"]), 2)
        self.assertIn("same source question", " ".join(res["precheck"]["refused"][0]["reasons"]))

    def test_refused_against_export(self):
        r1 = row(1)
        live = pfx.live_row(60, r1["question"]["question_text"],
                            {c["letter"]: c["choice_text"] for c in r1["choices"]})
        res = self.build([self.batch("syn-1", [r1, row(2)])], [live], skip_refused=True)
        self.assertEqual([x["id"] for x in res["precheck"]["refused"]], [r1["stable_question_id"]])
        self.assertIn(live["id"], " ".join(res["precheck"]["refused"][0]["reasons"]))
        self.assertEqual(len(res["staged"]), 1)

    def test_bad_batch_listed_and_skipped(self):
        a = self.batch("syn-1", [row(1)])
        b = self.batch("syn-2", [row(2), row(3, "M1")])  # two modules: the whole batch is refused
        res = self.build([a, b])
        self.assertEqual(res["precheck"]["refused_batches"][0]["folder"], "syn-2")
        self.assertIn("modules", res["precheck"]["refused_batches"][0]["reason"])
        self.assertNotIn("stage.sql", res["files"])
        res = self.build([a, b], skip_refused=True)
        self.assertEqual(len(res["staged"]), 1)
        with self.assertRaisesRegex(RefuseToBuild, "no batch could be loaded"):
            self.build([b], skip_refused=True)

    def test_chunks_are_each_one_guarded_transaction(self):
        a = self.batch("syn-1", [row(1), row(2), row(3)])
        with mock.patch.object(bulk, "READBACK_ROWS", 2):
            res = self.write(self.build([a], chunk_size=2))
        names = sorted(p.name for p in self.out.glob("*.sql"))
        self.assertEqual(names, ["readback-01.sql", "readback-02.sql", "stage-01.dryrun.sql", "stage-01.sql",
                                 "stage-02.dryrun.sql", "stage-02.sql"])
        for k in (1, 2):
            sql = (self.out / f"stage-{k:02d}.sql").read_text()
            self.assertEqual(sql.count("BEGIN;"), 1)
            self.assertEqual(sql.count("\nCOMMIT;"), 1)
            self.assertIn(f"kimport_stage_bulk_1_c{k:02d}_fingerprint", sql)
            for n in (1, 2, 3):  # every chunk leaves out all of the run's rows
                self.assertIn(f"('{pfx.SOURCE}','reading','M2',{n})", sql)
        self.assertIn("$kimport_stage_bulk_1_0003$", (self.out / "stage-02.sql").read_text())
        pre = res["precheck"]
        both = (self.out / "stage-01.sql").read_text() + (self.out / "stage-02.sql").read_text()
        self.assertEqual(pre["stage_sql_sha256"], hashlib.sha256(both.encode()).hexdigest())
        self.assertEqual(pre["readback_files"], ["readback-01.sql", "readback-02.sql"])

    def test_rerun_removes_stale_chunk_files(self):
        a = self.batch("syn-1", [row(1), row(2), row(3)])
        export = self.export()
        bulk._clear(self.out, ())
        for size in (1, 0):
            res = bulk.build_bulk_stage([a], export, "bulk-1", self.d, rows_docs=self.docs, chunk_size=size)
            self.out.mkdir(exist_ok=True)
            bulk._clear(self.out, ("stage*.sql", "readback*.sql"))
            stage._write_all(self.out, res["files"])
        self.assertEqual(sorted(p.name for p in self.out.glob("stage*.sql")), ["stage.dryrun.sql", "stage.sql"])


class TestFindPdf(BulkCase):
    def setup_exam(self, pdf_bytes: bytes, manifest_sha: str):
        exams = self.d / "exams"
        (exams / "2099-01_SYN_V1").mkdir(parents=True)
        (exams / "2099-01_SYN_V1" / "original_exam.pdf").write_bytes(pdf_bytes)
        reviewed, frozen = self.d / "reviewed.json", self.d / "frozen.json"
        reviewed.write_text(json.dumps({"questions": [{"source_document_id": "2099-01_SYN_V1"}] * 2}))
        frozen.write_text(json.dumps({"source_pdf_sha256": manifest_sha}))
        return exams, {"reviewed_file": str(reviewed), "frozen_manifest": str(frozen)}

    def test_finds_the_exam_pdf(self):
        exams, ready = self.setup_exam(b"%PDF made-up", hashlib.sha256(b"%PDF made-up").hexdigest())
        self.assertEqual(bulk.find_pdf(ready, exams), exams / "2099-01_SYN_V1" / "original_exam.pdf")

    def test_wrong_pdf_refused(self):
        exams, ready = self.setup_exam(b"%PDF made-up", "0" * 64)
        with self.assertRaisesRegex(RefuseToBuild, "does not match"):
            bulk.find_pdf(ready, exams)


NEW_PDF = b"%PDF made-up new-exam form"
NEW_SHA = hashlib.sha256(NEW_PDF).hexdigest()
NEW_NAME = "abc123def456-209901syn.pdf"


class TestFindNewExamPdf(BulkCase):
    """New-exam forms: the rows name the copied PDF (source_pdf) and its sha256; the
    PDF lives at <pipeline>/new-exams/<exam>/source/<source_pdf>."""

    def setup(self, rows=None, manifest_sha=NEW_SHA, old_bytes=None, new_bytes=NEW_PDF):
        exams, new_exams = self.d / "exams", self.d / "pipe" / "new-exams"
        if old_bytes is not None:
            (exams / "2099-01_SYN_V1").mkdir(parents=True)
            (exams / "2099-01_SYN_V1" / "original_exam.pdf").write_bytes(old_bytes)
        if new_bytes is not None:
            (new_exams / "2099-01_SYN_V1" / "source").mkdir(parents=True)
            (new_exams / "2099-01_SYN_V1" / "source" / NEW_NAME).write_bytes(new_bytes)
        one = {"source_document_id": "2099-01_SYN_V1", "source_pdf": NEW_NAME, "sourceVersion": {"sha256": NEW_SHA}}
        reviewed, frozen = self.d / "reviewed.json", self.d / "frozen.json"
        reviewed.write_text(json.dumps({"questions": rows if rows is not None else [one, one]}))
        frozen.write_text(json.dumps({"source_pdf_sha256": manifest_sha}))
        return exams, new_exams, {"reviewed_file": str(reviewed), "frozen_manifest": str(frozen)}

    def test_finds_the_copied_pdf_by_name(self):
        exams, new_exams, ready = self.setup()
        pdf = bulk.find_pdf(ready, exams, new_exams)
        self.assertEqual(pdf, new_exams / "2099-01_SYN_V1" / "source" / NEW_NAME)
        self.assertEqual(pdf.name, NEW_NAME)  # the name stage-rows' preflight compares with source_pdf

    def test_same_bytes_as_old_original_exam_still_uses_the_named_copy(self):
        # the failure seen in auto-20261021-165536: the old original_exam.pdf has the same
        # bytes, but handing it over under that name fails the source_pdf preflight
        exams, new_exams, ready = self.setup(old_bytes=NEW_PDF)
        self.assertEqual(bulk.find_pdf(ready, exams, new_exams).name, NEW_NAME)

    def test_falls_back_to_the_exams_folder_under_the_row_name(self):
        exams, new_exams, ready = self.setup(new_bytes=None)
        (exams / "2099-01_SYN_V1").mkdir(parents=True)
        (exams / "2099-01_SYN_V1" / NEW_NAME).write_bytes(NEW_PDF)
        self.assertEqual(bulk.find_pdf(ready, exams, new_exams), exams / "2099-01_SYN_V1" / NEW_NAME)

    def test_only_an_original_exam_pdf_is_not_used_for_another_name(self):
        exams, new_exams, ready = self.setup(old_bytes=NEW_PDF, new_bytes=None)
        with self.assertRaisesRegex(RefuseToBuild, f"no exam PDF named {NEW_NAME}"):
            bulk.find_pdf(ready, exams, new_exams)

    def test_copy_with_other_bytes_refused(self):
        exams, new_exams, ready = self.setup(new_bytes=b"%PDF something else")
        with self.assertRaisesRegex(RefuseToBuild, "does not match"):
            bulk.find_pdf(ready, exams, new_exams)

    def test_row_sha_differing_from_manifest_refused(self):
        exams, new_exams, ready = self.setup(manifest_sha="0" * 64)
        with self.assertRaisesRegex(RefuseToBuild, "sourceVersion.sha256"):
            bulk.find_pdf(ready, exams, new_exams)

    def test_two_pdf_names_in_one_batch_refused(self):
        a = {"source_document_id": "2099-01_SYN_V1", "source_pdf": NEW_NAME}
        b = {"source_document_id": "2099-01_SYN_V1", "source_pdf": "other.pdf"}
        exams, new_exams, ready = self.setup(rows=[a, b])
        with self.assertRaisesRegex(RefuseToBuild, "2 source PDF files"):
            bulk.find_pdf(ready, exams, new_exams)

    def test_path_like_name_refused(self):
        a = {"source_document_id": "2099-01_SYN_V1", "source_pdf": "../x.pdf"}
        exams, new_exams, ready = self.setup(rows=[a])
        with self.assertRaisesRegex(RefuseToBuild, "unexpected source_pdf"):
            bulk.find_pdf(ready, exams, new_exams)

    def test_load_batches_hands_stage_rows_the_copied_pdf(self):
        exams, new_exams, _ = self.setup()
        d = fx.write_batch_dir(self.d / "pipe" / "batches" / "r9-ne-1", name="r9-ne-1")
        ready = stage.read_ready(d)
        one = {"source_document_id": "2099-01_SYN_V1", "source_pdf": NEW_NAME, "sourceVersion": {"sha256": NEW_SHA}}
        Path(ready["reviewed_file"]).write_text(json.dumps({"questions": [one, one]}))
        Path(ready["frozen_manifest"]).write_text(json.dumps({"source_pdf_sha256": NEW_SHA}))
        seen = []

        def runner(reviewed, pdf, frozen, sha):
            seen.append(Path(pdf))
            return fx.rows_doc([row(1), row(2)])
        loaded, refused = bulk.load_batches([d], exams, None, runner, workers=1)
        self.assertEqual(refused, {})
        self.assertEqual(len(loaded), 1)
        self.assertEqual(seen, [(new_exams / "2099-01_SYN_V1" / "source" / NEW_NAME).resolve()])


class TestBulkSealAndPublish(BulkCase):
    def stage_and_seal(self, groups: dict, readback_parts: int = 2):
        dirs = [self.batch(name, rows) for name, rows in groups.items()]
        self.write(self.build(dirs))
        prev = json.loads((self.out / "stage-preview.json").read_text())
        snaps = [fx.db_snapshot(p, i) for i, p in enumerate(prev["rows"], 1)]
        files = []
        for k in range(readback_parts):
            part = snaps[k::readback_parts]
            f = self.d / f"readback-raw-{k}.json"
            f.write_text(json.dumps([{"readback": {"rows": [{"snapshot": s} for s in part]}}]))
            files.append(f)
        sealed = self.out / "sealed-preview.json"
        res = stage.run_seal(files, None, sealed, preview=self.out / "stage-preview.json", sealer=fx.fake_sealer)
        self.assertEqual(res["batch"], "bulk-1")
        readback = self.out / "private-readback.json"
        live = pfx.live_row(900, "An unrelated made-up question about the quarry.",
                            {"A": "w", "B": "x", "C": "y", "D": "z"})
        export_rows = [pfx.export_row(s) for s in snaps] + [live]
        export = write_export(self.d / "export-after.json", export_rows)
        os.utime(export, (readback.stat().st_mtime + 10,) * 2)
        return readback, sealed, export, snaps, live

    def test_more_than_one_module_and_27_rows_in_one_publish(self):
        rows_a = [row(n) for n in range(1, 21)]
        rows_b = [row(n, "M1") for n in range(21, 41)]
        readback, sealed, export, snaps, live = self.stage_and_seal({"syn-1": rows_a, "syn-2": rows_b})
        intents = self.d / "intents.jsonl"
        with self.assertRaisesRegex(RefuseToBuild, "at most 27 rows"):
            build_publish(readback, sealed, export, intents, "bulk-1")
        out = self.d / "publish"
        res = bulk.run_bulk_publish("bulk-1", readback, sealed, export, intents, out, chunk_size=15)
        self.assertEqual(res, {"rows": 40, "keyed": 40, "figure_no_key": 0, "chunks": 3})
        rest = current_shape([live])
        for k in (1, 2, 3):
            sql = (out / f"publish-{k:02d}.sql").read_text()
            self.assertEqual(sql.count("BEGIN;"), 1)
            self.assertEqual(sql.count("\nCOMMIT;"), 1)
            self.assertIn(f"IF n <> 1 OR f IS DISTINCT FROM '{fingerprint(rest)}'", sql)
            self.assertIn("private question changed", sql)
            self.assertIn("duplicate comparison key", sql)
            self.assertTrue((out / f"publish-{k:02d}.dryrun.sql").read_text().rstrip().endswith("ROLLBACK;"))
            self.assertIn("published state changed", (out / f"rollback-{k:02d}.sql").read_text())
        self.assertEqual(len(re.findall(r"^DO \$kimport_publish_bulk_1_\d{4}\$",
                                        "".join((out / f"publish-{k:02d}.sql").read_text() for k in (1, 2, 3)),
                                        re.M)), 40)
        pre = json.loads((out / "precheck.json").read_text())
        self.assertTrue(pre["passed"])
        self.assertEqual(len(pre["question_ids"]), 40)
        self.assertIn("[batch syn-2]", (out / "publish-03.sql").read_text())

    def test_bulk_publish_keeps_row_guards(self):
        readback, sealed, export, snaps, live = self.stage_and_seal({"syn-1": [row(1), row(2)]})
        doc = json.loads(sealed.read_text())
        doc["rows"][0]["question_text"] = "Edited after sealing."
        sealed.write_text(json.dumps(doc))
        os.utime(export, (readback.stat().st_mtime + 10,) * 2)
        with self.assertRaisesRegex(RefuseToBuild, "question_text differs"):
            bulk.build_bulk_publish("bulk-1", readback, sealed, export, self.d / "intents.jsonl")

    def test_seal_refuses_missing_readback_part(self):
        dirs = [self.batch("syn-1", [row(1), row(2)])]
        self.write(self.build(dirs))
        prev = json.loads((self.out / "stage-preview.json").read_text())
        f = self.d / "part.json"
        f.write_text(json.dumps({"rows": [{"snapshot": fx.db_snapshot(prev["rows"][0], 1)}]}))
        with self.assertRaisesRegex(RefuseToBuild, "1 readback rows but 2 staged rows"):
            stage.run_seal([f], None, self.out / "sealed.json", preview=self.out / "stage-preview.json",
                           sealer=fx.fake_sealer)


if __name__ == "__main__":
    unittest.main()


class RunConflictKeepFirstTest(unittest.TestCase):
    def test_identical_text_keeps_first_copy(self):
        from kimport import bulk
        items = [{"id": f"q{i}", "batch": f"b{i}", "source": ("x", "S", "M1", i),
                  "row": {"question": {"content_hash_v2": f"h{i}", "question_text": "Same words here."}}}
                 for i in range(3)]
        out = bulk._run_conflicts(items)
        self.assertNotIn(0, out)
        self.assertEqual(sorted(out), [1, 2])

    def test_same_source_question_refuses_both(self):
        from kimport import bulk
        items = [{"id": f"q{i}", "batch": f"b{i}", "source": ("x", "S", "M1", 1),
                  "row": {"question": {"content_hash_v2": f"h{i}", "question_text": f"Text {i}"}}}
                 for i in range(2)]
        self.assertEqual(sorted(bulk._run_conflicts(items)), [0, 1])
