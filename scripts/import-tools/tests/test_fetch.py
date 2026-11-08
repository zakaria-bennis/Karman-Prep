import json
import re
import tempfile
import unittest
from pathlib import Path

from kimport import fetch
from kimport.export import fingerprint, read_export_doc
from tests import publish_fixtures as pfx
from tests.export_fixtures import current_shape

LIVE_EXPORT = Path(__file__).resolve().parent.parent / "sql" / "live_export.sql"


def bank(n: int) -> list[dict]:
    return current_shape([pfx.live_row(i, f"Made-up question number {i} about a quiet harbor.",
                                       {"A": "w", "B": "x", "C": "y", "D": "z"},
                                       created_at=f"2026-09-{1 + i % 28:02d}T09:00:00+00:00")
                          for i in range(1, n + 1)])


class FakeDb:
    """Answers state_sql and page_sql from a list of rows; `fail` decides which page calls raise."""

    def __init__(self, rows, fail=lambda after, limit, calls: False, change_after_pages=None):
        self.rows, self.fail, self.calls, self.pages = rows, fail, [], 0
        self.change_after_pages = change_after_pages

    def __call__(self, sql: str):
        self.calls.append(sql)
        if "SELECT to_jsonb(now())" in sql:
            return [{"exported_at": "2026-10-21T06:00:00+00:00", "row_count": len(self.rows),
                     "fingerprint": fingerprint(self.rows)}]
        after = re.search(r"q\.id > '([0-9a-f-]+)'::uuid", sql).group(1)
        limit = int(re.findall(r"LIMIT (\d+)", sql)[-1])
        if self.fail(after, limit, len(self.calls)):
            raise fetch.ExportFailed("connection reset by peer")
        self.pages += 1
        if self.change_after_pages and self.pages == self.change_after_pages:
            self.rows = self.rows[:-1] + [{**self.rows[-1], "publish_status": "needs_human_review"}]
        got = [r for r in sorted(self.rows, key=lambda r: r["id"]) if r["id"] > after][:limit]
        return [{"rows": json.loads(json.dumps(got))}]


class TestFetch(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_page_columns_match_live_export(self):
        sql = LIVE_EXPORT.read_text()
        for line in fetch.ROW_COLUMNS.splitlines():
            self.assertIn(line, sql)
        self.assertIn("raw_model_response", fetch.page_sql(fetch._ZERO, 10))
        self.assertNotRegex(fetch.page_sql(fetch._ZERO, 10).upper(), r"\b(INSERT|UPDATE|DELETE)\b")
        self.assertIn(fetch.FINGERPRINT_SQL, fetch.state_sql())

    def test_assembles_a_valid_export(self):
        rows = bank(25)
        db = FakeDb(rows)
        res = fetch.run_export(self.d / "e.json", run=db, page=10, fallback=3, sleep=lambda s: None,
                               log=lambda m: None)
        self.assertEqual(res["rows"], 25)
        doc = read_export_doc(self.d / "e.json")
        self.assertEqual(sorted(r["id"] for r in doc.rows), sorted(r["id"] for r in rows))
        self.assertEqual(doc.exported_at, "2026-10-21T06:00:00+00:00")
        created = [(r["created_at"], r["id"]) for r in doc.rows]
        self.assertEqual(created, sorted(created))

    def test_exact_multiple_of_page_size(self):
        db = FakeDb(bank(20))
        doc = fetch.assemble(db, page=10, fallback=3, sleep=lambda s: None)
        self.assertEqual(doc["row_count"], 20)

    def test_failing_page_falls_back_to_small_pages(self):
        rows = bank(25)
        second = sorted(r["id"] for r in rows)[9]
        db = FakeDb(rows, fail=lambda after, limit, calls: after == second and limit == 10)
        doc = fetch.assemble(db, page=10, fallback=3, sleep=lambda s: None)
        self.assertEqual(doc["row_count"], 25)
        self.assertTrue(any("LIMIT 3" in c for c in db.calls))

    def test_transient_failure_retried(self):
        db = FakeDb(bank(5), fail=lambda after, limit, calls: calls == 2)
        self.assertEqual(fetch.assemble(db, page=10, fallback=3, sleep=lambda s: None)["row_count"], 5)

    def test_bank_change_mid_export_retries(self):
        db = FakeDb(bank(25), change_after_pages=2)
        doc = fetch.assemble(db, page=10, fallback=3, sleep=lambda s: None)
        self.assertEqual(doc["fingerprint"], fingerprint(db.rows))
        self.assertEqual(sum("SELECT to_jsonb(now())" in c for c in db.calls), 4)

    def test_bank_that_keeps_changing_refused(self):
        class Moving(FakeDb):
            def __call__(self, sql):
                out = super().__call__(sql)
                if "SELECT to_jsonb(now())" not in sql:
                    self.rows = self.rows[:-1] + [{**self.rows[-1], "import_status": f"x{len(self.calls)}"}]
                return out
        with self.assertRaisesRegex(fetch.ExportFailed, "bank changed during the export"):
            fetch.assemble(Moving(bank(5)), page=10, fallback=3, sleep=lambda s: None)


if __name__ == "__main__":
    unittest.main()
