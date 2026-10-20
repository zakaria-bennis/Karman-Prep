"""Cross-module rules (rulings R23, R25, M2): one keys.is_unkeyable rule for
sweep, backfill, corpus, publish and lint; archived rows ignored by the
duplicate checks; passage columns in the key. Synthetic text only."""

import json
import tempfile
import unittest
from pathlib import Path

from kimport.backfill import backfill_sql
from kimport.corpus import cluster
from kimport.export import export_by_id, read_export
from kimport.keys import UNKEYED_FIGURE_FIELDS, comparison_key, is_unkeyable, keyable_sql
from kimport.lint import _has_asset
from kimport.publish import FIGURE_NO_KEY, RefuseToBuild, build_publish
from kimport.sweep import find_live_duplicates, record_from_row, unpublish_sql
from tests import publish_fixtures as fx
from tests.export_fixtures import current_shape, export_doc, write_export

STEM = "Which made-up table shows a relationship in which y grows with x?"
README = Path(__file__).resolve().parent.parent / "README.md"


def uid(n: int) -> str:
    return f"00000000-0000-4000-8000-{n:012d}"


def table_choice_row(n, answer, created, **over):
    """A live question whose four choices are tables: choice_text is '' and only
    choice_table_data (exported as presence `true`) tells them apart."""
    row = {"id": uid(n), "question_text": STEM, "correct_answer": answer, "question_format": "multiple_choice",
           "figure_kind": None, "figure_table_data": None, "publish_status": "publish_ready",
           "import_status": "ok", "import_flag_reason": None, "is_live": True, "archived_at": None,
           "content_hash_v2": f"{n:064x}", "created_at": created, "answer_key_count": 0,
           "choices": [{"letter": L, "choice_text": "", "choice_table_data": True} for L in "ABCD"]}
    row.update(over)
    return current_shape([row])[0]


class IsUnkeyableTests(unittest.TestCase):
    def test_rule(self):
        self.assertFalse(is_unkeyable({"figure_kind": None}))
        self.assertFalse(is_unkeyable({"figure_kind": "table", "figure_table_data": {"rows": []}}))
        self.assertTrue(is_unkeyable({"figure_kind": "graph"}))
        for f in UNKEYED_FIGURE_FIELDS:
            with self.subTest(field=f):
                self.assertTrue(is_unkeyable({f: True}))  # export: presence flag
                self.assertTrue(is_unkeyable({f: "made-up value"}))  # readback: full value
        self.assertTrue(is_unkeyable({"choices": [{"choice_text": "", "choice_table_data": {"rows": [["1"]]}}]}))
        self.assertTrue(is_unkeyable({"choice_tables": [[["x"]]]}))  # reviewed batch row
        self.assertFalse(is_unkeyable({"choices": [{"choice_text": "2", "choice_table_data": None}]}))

    def test_record_carries_rule(self):
        r = record_from_row(table_choice_row(1, "B", "2026-01-01T00:00:00Z"))
        self.assertTrue(is_unkeyable(r))
        self.assertTrue(r.meta["has_figure"])

    def test_keyable_sql_names_every_column(self):
        sql = keyable_sql("q")
        for f in UNKEYED_FIGURE_FIELDS:
            self.assertIn(f"q.{f} IS NULL", sql)
        self.assertIn("c.choice_table_data IS NOT NULL", sql)
        self.assertIn("q.figure_kind = 'table'", sql)

    def test_runbook_null_check_uses_the_same_rule(self):
        self.assertIn(keyable_sql("q"), README.read_text(encoding="utf-8"))

    def test_old_export_without_presence_fields_is_refused(self):
        row = {"id": uid(1), "question_text": STEM, "question_format": "numeric_entry", "correct_answer": "3"}
        doc = {**export_doc([row])}
        doc["rows"] = [row]  # as an older live_export.sql wrote it
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "old.json"
            p.write_text(json.dumps(doc), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "older sql/live_export.sql"):
                read_export(p)


class SweepTests(unittest.TestCase):
    def test_same_stem_table_choices_never_removed(self):
        rows = [table_choice_row(1, "B", "2026-01-01T00:00:00Z"), table_choice_row(2, "C", "2026-02-01T00:00:00Z")]
        recs = [record_from_row(r) for r in rows]
        self.assertEqual(comparison_key(recs[0]), comparison_key(recs[1]))  # the key cannot tell them apart
        groups = find_live_duplicates(recs)
        self.assertEqual([g["relation"] for g in groups], ["figure_review"])
        self.assertEqual([g["remove"] for g in groups], [[]])
        self.assertNotIn(uid(2), unpublish_sql(groups, export_by_id(rows)).split("BEGIN;", 1)[1])

    def test_image_column_alone_makes_figure_review(self):
        rows = [table_choice_row(n, "A", f"2026-0{n}-01T00:00:00Z", image_url=True,
                                 choices=[{"letter": L, "choice_text": L.lower(), "choice_table_data": None}
                                          for L in "ABCD"]) for n in (1, 2)]
        groups = find_live_duplicates([record_from_row(r) for r in rows])
        self.assertEqual([(g["relation"], g["remove"]) for g in groups], [("figure_review", [])])


class BackfillTests(unittest.TestCase):
    def test_choice_table_row_skipped_and_counted_live(self):
        rows = [table_choice_row(1, "B", "2026-01-01T00:00:00Z")]
        sql = backfill_sql([record_from_row(r) for r in rows], export_by_id(rows))
        self.assertNotIn(uid(1), sql)
        self.assertIn("-- skipped live (not archived, publish-ready): 0 broken answer key, 0 format mismatch, "
                      "1 figure rows", sql)
        self.assertIn("-- skipped not live: 0 broken answer key, 0 format mismatch, 0 figure rows", sql)

    def test_live_and_not_live_split(self):
        rows = [table_choice_row(1, "E", "2026-01-01T00:00:00Z",
                                 choices=[{"letter": "A", "choice_text": "1", "choice_table_data": None},
                                          {"letter": "B", "choice_text": "2", "choice_table_data": None}]),
                table_choice_row(2, "E", "2026-01-01T00:00:00Z", publish_status="needs_human_review",
                                 is_live=False,
                                 choices=[{"letter": "A", "choice_text": "1", "choice_table_data": None},
                                          {"letter": "B", "choice_text": "2", "choice_table_data": None}])]
        sql = backfill_sql([record_from_row(r) for r in rows], export_by_id(rows))
        self.assertIn("-- skipped live (not archived, publish-ready): 1 broken answer key", sql)
        self.assertIn("-- skipped not live: 1 broken answer key", sql)

    def test_guard_refuses_rows_that_gained_a_figure(self):
        row = current_shape([{"id": uid(3), "question_text": "Made-up sum?", "question_format": "numeric_entry",
                              "correct_answer": "3", "content_hash_v2": "ab"}])[0]
        sql = backfill_sql([record_from_row(row)], export_by_id([row]))
        self.assertIn(uid(3), sql)
        self.assertIn(keyable_sql("q"), sql)


class CorpusTests(unittest.TestCase):
    def test_live_choice_table_rows_are_figure_review(self):
        rows = [table_choice_row(1, "B", "2026-01-01T00:00:00Z"), table_choice_row(2, "C", "2026-02-01T00:00:00Z")]
        res = cluster([], [record_from_row(r) for r in rows])
        self.assertEqual({c["status"] for c in res.clusters}, {"figure_review"})
        self.assertNotIn("member", set(res.roles.values()))


class LintTests(unittest.TestCase):
    def test_asset_rule_is_shared(self):
        self.assertTrue(_has_asset({"choice_tables": [[["x"]]]}))
        self.assertTrue(_has_asset({"figure_svg": "<svg/>"}))
        self.assertTrue(_has_asset({"choices": [{"choice_table_data": {"rows": [["1"]]}}]}))
        self.assertFalse(_has_asset({"question_text": "Made-up?"}))


class PassageTests(unittest.TestCase):
    def test_passage_columns_are_part_of_the_key(self):
        base = {"id": uid(1), "question_text": "Which choice best states the main idea?",
                "question_format": "multiple_choice", "correct_answer": "A",
                "choices": [{"letter": "A", "choice_text": "one"}, {"letter": "B", "choice_text": "two"}]}
        plain = record_from_row(base)
        a = record_from_row({**base, "passage": "Made-up passage about otters."})
        b = record_from_row({**base, "passage": "Made-up passage about beavers."})
        embedded = record_from_row({**base, "question_text": "Made-up passage about otters.\n\n"
                                                             + base["question_text"]})
        self.assertNotEqual(comparison_key(a), comparison_key(b))
        self.assertNotEqual(comparison_key(a), comparison_key(plain))
        self.assertEqual(comparison_key(a), comparison_key(embedded))
        self.assertEqual(comparison_key(plain), comparison_key(record_from_row({**base, "passage": None,
                                                                                "passage_a": " "})))


class PublishTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def build(self, snaps, extra):
        paths = fx.write_batch(self.dir, snaps, [fx.export_row(s) for s in snaps] + list(extra))
        return build_publish(paths["readback"], paths["sealed"], paths["export"], paths["intents"], "syn-batch")

    def bank(self):
        return [fx.live_row(n, f"Unrelated made-up bank question {n} about hills?",
                            {"A": f"a{n}", "B": f"b{n}", "C": f"c{n}", "D": f"d{n}"}) for n in range(1, 4)]

    def test_choice_table_row_staged_after_backfill_publishes_unkeyed(self):
        snap = fx.snapshot(5, "Which made-up table matches the rule y = 2x?", {"A": "", "B": "", "C": "", "D": ""})
        for i, c in enumerate(snap["choices"]):
            c["choice_table_data"] = {"rows": [[str(i), str(2 * i)]]}
        # another staged choice-table row, never keyed by the backfill: must not block
        other = fx.export_row(fx.snapshot(6, "Which made-up table matches y = 3x?", {"A": "", "B": ""}),
                              comparison_key=None)
        other["choices"] = [{**c, "choice_table_data": True} for c in other["choices"]]
        bundle = self.build([snap], self.bank() + [other])
        qid = snap["question"]["id"]
        self.assertIsNone(bundle["keys"][qid])
        self.assertNotIn("duplicate comparison key", bundle["publish_sql"])
        self.assertNotIn(",comparison_key=", bundle["publish_sql"])
        row = next(r for r in bundle["precheck"]["rows"] if r["id"] == qid)
        self.assertEqual(row["key_status"], FIGURE_NO_KEY)
        self.assertEqual((row["exact_matches"], row["typo_matches"]), ([], []))

    def test_archived_copy_does_not_block(self):
        snap = fx.snapshot(7, "Which made-up choice completes the text about kites?")
        archived = fx.export_row(snap, id=fx.uid(70, 3), content_hash_v2=fx.hexn(70, 8),
                                 archived_at="2026-05-28T00:00:00+00:00", publish_status="publish_ready")
        archived["comparison_key"] = comparison_key(record_from_row(archived))
        bundle = self.build([snap], self.bank() + [archived])
        self.assertIn("AND o.archived_at IS NULL", bundle["publish_sql"])
        self.assertEqual(bundle["precheck"]["archived_rows_ignored"], 1)

    def test_unarchived_copy_still_blocks(self):
        snap = fx.snapshot(7, "Which made-up choice completes the text about kites?")
        twin = fx.export_row(snap, id=fx.uid(70, 3), content_hash_v2=fx.hexn(70, 8), publish_status="publish_ready",
                             is_live=True)
        twin["comparison_key"] = comparison_key(record_from_row(twin))
        with self.assertRaisesRegex(RefuseToBuild, "duplicate"):
            self.build([snap], self.bank() + [twin])


if __name__ == "__main__":
    unittest.main()
