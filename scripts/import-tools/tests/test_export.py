import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from kimport.backfill import run_backfill
from kimport.export import FINGERPRINT_SQL, fingerprint, read_export, read_export_doc
from kimport.sweep import run_sweep
from tests.export_fixtures import export_doc, write_export

EXPORT_SQL = Path(__file__).resolve().parent.parent / "sql" / "live_export.sql"
FIXTURE = Path(__file__).resolve().parent / "fixtures" / "export_small.json"


def row(n, key=None, **over):
    r = {"id": f"00000000-0000-4000-8000-{n:012d}", "content_hash_v2": f"{n:064x}", "publish_status": "publish_ready",
         "import_status": "ok"}
    if key is not None:
        r["comparison_key"] = key
    r.update(over)
    return r


class ExportDocTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.d = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def test_sql_uses_the_same_fingerprint_expression(self):
        sql = EXPORT_SQL.read_text(encoding="utf-8")
        self.assertIn(f"'fingerprint', (SELECT {FINGERPRINT_SQL} FROM public.quiz_questions q)", sql)
        self.assertIn("'exported_at', now()", sql)
        self.assertIn("'row_count', (SELECT count(*) FROM public.quiz_questions)", sql)
        self.assertNotIn(" ? ", sql)  # no jsonb ? operator (client placeholder clash)

    def test_fingerprint_matches_sql_definition(self):
        rows = [row(2, publish_status=None), row(1, "kn-2:" + "a" * 64)]
        parts = [f"{rows[1]['id']}:{1:064x}:publish_ready:ok:kn-2:{'a' * 64}", f"{rows[0]['id']}:{2:064x}::ok:"]
        self.assertEqual(fingerprint(rows), hashlib.md5(",".join(parts).encode()).hexdigest())
        self.assertEqual(fingerprint([]), hashlib.md5(b"").hexdigest())

    def test_reads_doc_and_connector_wrapping(self):
        rows = read_export(FIXTURE)
        p = self.d / "w.json"
        p.write_text(json.dumps([{"export": export_doc(rows)}]))
        doc = read_export_doc(p)
        self.assertEqual(doc.rows, rows)
        self.assertEqual(doc.row_count, len(rows))

    def test_rejects_bare_array(self):
        p = self.d / "old.json"
        p.write_text(json.dumps(read_export(FIXTURE)))
        with self.assertRaisesRegex(ValueError, "run sql/live_export.sql again"):
            read_export(p)

    def test_rejects_truncated_or_edited(self):
        rows = read_export(FIXTURE)
        doc = export_doc(rows)
        doc["rows"] = rows[:-1]
        p = self.d / "cut.json"
        p.write_text(json.dumps(doc))
        with self.assertRaisesRegex(ValueError, "row_count"):
            read_export(p)
        doc = export_doc(rows)
        doc["rows"][0]["content_hash_v2"] = "f" * 64
        p.write_text(json.dumps(doc))
        with self.assertRaisesRegex(ValueError, "fingerprint"):
            read_export(p)

    def test_pre_migration_export_works_for_sweep_and_backfill(self):
        rows = read_export(FIXTURE)
        self.assertFalse(any("comparison_key" in r for r in rows))
        self.assertGreater(run_sweep(FIXTURE, self.d / "sweep")["live"], 0)
        out = self.d / "backfill.sql"
        run_backfill(FIXTURE, out)
        self.assertIn("UPDATE public.quiz_questions q SET comparison_key", out.read_text())
        dry = (self.d / "backfill.dryrun.sql").read_text()
        self.assertNotIn("COMMIT;", dry)
        self.assertIn("\nROLLBACK;\n", dry)
        for name in ("unpublish", "republish"):
            d = (self.d / "sweep" / f"{name}.dryrun.sql").read_text()
            self.assertNotIn("COMMIT;", d)
            self.assertTrue(d.rstrip().endswith("ROLLBACK;"))
            self.assertTrue((self.d / "sweep" / f"{name}.sql").read_text().rstrip().endswith("COMMIT;"))

    def test_dryrun_variant_needs_exactly_one_commit(self):
        from kimport.sqlutil import dryrun_variant
        self.assertEqual(dryrun_variant("BEGIN;\nCOMMIT;\n-- x\n"), "BEGIN;\nROLLBACK;\n-- x\n")
        for bad in ("BEGIN;\n", "COMMIT;\nCOMMIT;\n"):
            with self.assertRaises(ValueError):
                dryrun_variant(bad)

    def test_sweep_cli_reads_new_shape(self):
        p = write_export(self.d / "e.json", read_export(FIXTURE))
        r = subprocess.run([sys.executable, "-I", str(Path(__file__).resolve().parent.parent / "kimport-cli.py"),
                            "sweep", "--export", str(p), "--out", str(self.d / "o")], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)


if __name__ == "__main__":
    unittest.main()
