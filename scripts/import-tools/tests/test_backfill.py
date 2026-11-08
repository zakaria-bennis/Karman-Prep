import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from kimport.backfill import backfill_sql
from kimport.keys import QuestionRecord, comparison_key
from kimport.export import export_by_id
from tests.export_fixtures import write_export

CLI = Path(__file__).resolve().parent.parent / "kimport-cli.py"
MIGRATION = Path(__file__).resolve().parents[3] / "supabase" / "migrations" / "20261021000000_question_comparison_key.sql"


def uid(n: int) -> str:
    return f"00000000-0000-4000-8000-{n:012d}"


def rec(n, text="Which value is the sum?", **meta):
    return QuestionRecord(ref=uid(n), text=text, choices=("2", "4"), answer="4", answer_format="mc",
                          is_live=True, meta=meta)


def rows_for(recs):
    return export_by_id([{"id": r.ref, "content_hash_v2": f"{i:064x}"} for i, r in enumerate(recs, 1)])


class BackfillTests(unittest.TestCase):
    def test_backfill_guards_on_hash(self):
        r = rec(1)
        sql = backfill_sql([r], rows_for([r]))
        self.assertIn(f"('{uid(1)}'::uuid, '{comparison_key(r)}'::text, '{1:064x}'::text, NULL::text, NULL::jsonb)", sql)
        self.assertIn("q.content_hash_v2 IS NOT DISTINCT FROM v.hash", sql)
        self.assertIn("q.id = v.id", sql)

    def test_backfill_chunks_500(self):
        recs = [rec(i, f"Question number {i}?") for i in range(1, 1202)]
        sql = backfill_sql(recs, rows_for(recs))
        self.assertEqual(sql.count("UPDATE public.quiz_questions"), 3)
        self.assertEqual(sql.count("::uuid,"), 1201)

    def test_backfill_never_overwrites(self):
        r = rec(1)
        sql = backfill_sql([r], rows_for([r]))
        self.assertIn("q.comparison_key IS NULL", sql)
        self.assertIn("SET comparison_key = v.key", sql)

    def test_wrapped_and_counts_remaining_nulls(self):
        r = rec(1)
        sql = backfill_sql([r], rows_for([r]))
        self.assertIn("BEGIN;", sql)
        self.assertLess(sql.index("BEGIN;"), sql.index("UPDATE"))
        self.assertLess(sql.index("SELECT count(*)"), sql.index("COMMIT;"))
        self.assertIn("comparison_key IS NULL", sql[sql.index("SELECT count(*)"):])

    def test_skips_unkeyable_rows_and_says_so(self):
        good, broken, fmt = rec(1), rec(2, answer_problem=True), rec(3, format_problem=True)
        sql = backfill_sql([good, broken, fmt], rows_for([good, broken, fmt]))
        self.assertIn(uid(1), sql)
        self.assertNotIn(uid(2), sql.split("-- skipped")[0])
        self.assertNotIn(uid(3), sql.split("-- skipped")[0])
        self.assertEqual(sql.count("UPDATE public.quiz_questions"), 1)
        self.assertIn("-- skipped not live: 1 broken answer key, 1 format mismatch, 0 figure rows", sql)

    def test_missing_export_row_raises(self):
        with self.assertRaises(ValueError):
            backfill_sql([rec(1)], {})

    def test_quotes_are_escaped(self):
        r = rec(1)
        rows = {r.ref: {"id": r.ref, "content_hash_v2": "a'b"}}
        self.assertIn("'a''b'::text", backfill_sql([r], rows))

    def test_null_hash_matches_null(self):
        r = rec(1)
        sql = backfill_sql([r], {r.ref: {"id": r.ref, "content_hash_v2": None}})
        self.assertIn("NULL::text", sql)

    def test_cli_writes_file(self):
        rows = [{"id": uid(1), "question_text": "Which value is the sum?", "question_format": "multiple_choice",
                 "correct_answer": "B", "content_hash_v2": "ab", "is_live": True, "publish_status": "publish_ready",
                 "choices": [{"letter": "A", "choice_text": "2"}, {"letter": "B", "choice_text": "4"}]}]
        with tempfile.TemporaryDirectory() as d:
            exp, out = Path(d) / "live.json", Path(d) / "sub" / "backfill.sql"
            write_export(exp, rows)
            p = subprocess.run([sys.executable, "-I", str(CLI), "backfill", "--export", str(exp), "--out", str(out)],
                               capture_output=True, text=True)
            self.assertEqual(p.returncode, 0, p.stderr)
            self.assertIn(uid(1), out.read_text(encoding="utf-8"))
            self.assertIn("1 rows in SQL", p.stdout)


class FigureAndGuardTests(unittest.TestCase):
    def test_image_figure_row_is_skipped_and_counted(self):
        img, ok = rec(1, unkeyable=True), rec(2)
        sql = backfill_sql([img, ok], rows_for([img, ok]))
        self.assertNotIn(uid(1), sql)
        self.assertIn(uid(2), sql)
        self.assertIn("-- skipped not live: 0 broken answer key, 0 format mismatch, 1 figure rows", sql)

    def test_table_figure_row_is_keyed(self):
        from kimport.sweep import record_from_row
        row = {"id": uid(1), "question_text": "Read the table.", "question_format": "numeric_entry",
               "correct_answer": "3", "content_hash_v2": "ab", "figure_kind": "table",
               "figure_table_data": {"header_row": ["a"], "rows": [["1"]]}}
        r = record_from_row(row)
        self.assertFalse(r.meta["unkeyable"])
        sql = backfill_sql([r], export_by_id([row]))
        self.assertIn(uid(1), sql)
        self.assertIn('\'{"header_row": ["a"], "rows": [["1"]]}\'::jsonb', sql)

    def test_image_kind_is_unkeyable_in_record(self):
        from kimport.sweep import record_from_row
        row = {"id": uid(1), "question_text": "See graph.", "question_format": "numeric_entry",
               "correct_answer": "3", "figure_kind": "graph"}
        self.assertTrue(record_from_row(row).meta["unkeyable"])

    def test_guard_covers_answer_and_table(self):
        r = rec(1)
        rows = {r.ref: {"id": r.ref, "content_hash_v2": "h", "correct_answer": "B"}}
        sql = backfill_sql([r], rows)
        self.assertIn("q.correct_answer IS NOT DISTINCT FROM v.answer", sql)
        self.assertIn("q.figure_table_data IS NOT DISTINCT FROM v.tbl", sql)
        self.assertIn("'B'::text, NULL::jsonb", sql)


class MigrationTests(unittest.TestCase):
    def test_migration_is_column_and_index_only(self):
        sql = MIGRATION.read_text(encoding="utf-8")
        code = [l.strip() for l in sql.splitlines() if l.strip() and not l.strip().startswith("--")]
        self.assertEqual(code, [
            "ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS comparison_key text;",
            "CREATE INDEX IF NOT EXISTS quiz_questions_comparison_key_idx ON public.quiz_questions (comparison_key);",
        ])


if __name__ == "__main__":
    unittest.main()
