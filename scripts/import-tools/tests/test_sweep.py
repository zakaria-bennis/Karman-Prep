import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from kimport.keys import QuestionRecord
from kimport.sweep import (
    export_by_id,
    find_live_duplicates,
    load_export,
    read_export,
    republish_sql,
    unpublish_sql,
)

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "export_small.json"
CLI = Path(__file__).resolve().parent.parent / "kimport-cli.py"


def uid(n: int) -> str:
    return f"00000000-0000-4000-8000-{n:012d}"


def live(ref, text, created, choices=("2", "4", "6", "8"), answer="4"):
    return QuestionRecord(ref=ref, text=text, choices=tuple(choices), answer=answer,
                          answer_format="mc", is_live=True, meta={"created_at": created})


def groups():
    return find_live_duplicates(load_export(FIXTURE))


def group_with(gs, ref):
    found = [g for g in gs if g["keep"] == ref or ref in g["remove"]
             or any(e["id"] == ref for e in g["evidence"])]
    return found[0] if found else None


class LoadExportTests(unittest.TestCase):
    def test_mc_answer_is_choice_text_and_live_needs_publish_ready(self):
        recs = {r.ref: r for r in load_export(FIXTURE)}
        self.assertEqual(len(recs), 13)
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
            p = Path(d) / "x.json"
            p.write_text(json.dumps(rows), encoding="utf-8")
            self.assertFalse({r.ref: r for r in load_export(p)}[uid(1)].is_live)

    def test_unwraps_connector_result_row(self):
        rows = read_export(FIXTURE)
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "wrapped.json"
            p.write_text(json.dumps([{"export": rows}]), encoding="utf-8")
            self.assertEqual(read_export(p), rows)

    def test_live_row_with_unknown_answer_letter_rejected(self):
        rows = read_export(FIXTURE)
        rows[0]["correct_answer"] = "E"
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "bad.json"
            p.write_text(json.dumps(rows), encoding="utf-8")
            with self.assertRaises(ValueError):
                load_export(p)


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

    def test_typo_tie_keeps_earliest(self):
        a = live("a", "On a calm grey morning the old fisherman tied the rope to the mast.", "2026-01-02T00:00:00+00:00")
        b = live("b", "On a calm grey morning the old fisherman tied the rops to the mast.", "2026-01-01T00:00:00+00:00")
        [g] = find_live_duplicates([a, b])
        self.assertEqual((g["keep"], g["remove"], g["relation"]), ("b", ["a"], "ocr_typo"))

    def test_no_typo_chaining(self):
        base = "On a calm grey morning the old fisherman tied the rope around the mast while the wind pushed the boat toward the harbor."
        a = live("a", base, "2026-01-01T00:00:00+00:00")
        b = live("b", base.replace("rope", "rops").replace("mast", "masl"), "2026-01-02T00:00:00+00:00")
        c = live("c", b.text.replace("harbor", "harbar"), "2026-01-03T00:00:00+00:00")
        gs = find_live_duplicates([a, b, c])
        self.assertEqual([(g["keep"], g["remove"]) for g in gs], [("a", ["b"])])

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
