"""`sweep resolve`: a person's pick for a figure_review or typo_review group (synthetic text only)."""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from kimport.normalize import NORMALIZER_VERSION
from kimport.sweep import find_live_duplicates, record_from_row, resolve_group
from tests.export_fixtures import current_shape, write_export

CLI = Path(__file__).resolve().parent.parent / "kimport-cli.py"
STEM = "Which made-up table shows a relationship in which y shrinks as x grows?"


def uid(n: int) -> str:
    return f"00000000-0000-4000-8000-{n:012d}"


def row(n, created, **over):
    r = {"id": uid(n), "question_text": STEM, "correct_answer": "A", "question_format": "multiple_choice",
         "figure_kind": None, "figure_table_data": None, "publish_status": "publish_ready", "import_status": "ok",
         "import_flag_reason": None, "is_live": True, "archived_at": None, "content_hash_v2": f"{n:064x}",
         "created_at": created, "answer_key_count": 0,
         "choices": [{"letter": L, "choice_text": "", "choice_table_data": True} for L in "ABCD"]}
    r.update(over)
    return current_shape([r])[0]


def rows3():
    return [row(1, "2026-01-01T00:00:00Z"), row(2, "2026-02-01T00:00:00Z"), row(3, "2026-03-01T00:00:00Z")]


def groups_doc(rows):
    return {"normalizer_version": NORMALIZER_VERSION,
            "groups": find_live_duplicates([record_from_row(r) for r in rows])}


class ResolveGroupTests(unittest.TestCase):
    def test_figure_group_is_the_input(self):
        doc = groups_doc(rows3())
        self.assertEqual([g["relation"] for g in doc["groups"]], ["figure_review"])

    def test_keep_and_default_remove(self):
        g = resolve_group(groups_doc(rows3()), "1", uid(2))
        self.assertEqual((g["keep"], sorted(g["remove"])), (uid(2), [uid(1), uid(3)]))

    def test_group_by_member_id_and_subset(self):
        g = resolve_group(groups_doc(rows3()), uid(3), uid(1), [uid(3)])
        self.assertEqual(g["remove"], [uid(3)])

    def test_refuses_ids_outside_the_group(self):
        doc = groups_doc(rows3())
        with self.assertRaisesRegex(ValueError, "not a copy in group"):
            resolve_group(doc, "1", uid(9))
        with self.assertRaisesRegex(ValueError, "not other copies"):
            resolve_group(doc, "1", uid(1), [uid(9)])
        with self.assertRaisesRegex(ValueError, "not other copies"):
            resolve_group(doc, "1", uid(1), [uid(1)])
        with self.assertRaisesRegex(ValueError, "groups.json has 1 groups"):
            resolve_group(doc, "2", uid(1))

    def test_refuses_exact_groups_and_other_normalizer(self):
        plain = [row(n, f"2026-0{n}-01T00:00:00Z",
                     choices=[{"letter": L, "choice_text": L.lower(), "choice_table_data": None} for L in "AB"])
                 for n in (1, 2)]
        with self.assertRaisesRegex(ValueError, "already covers it"):
            resolve_group(groups_doc(plain), "1", uid(1))
        with self.assertRaisesRegex(ValueError, "normalizer"):
            resolve_group({**groups_doc(rows3()), "normalizer_version": "kn-0"}, "1", uid(1))


class ResolveCliTests(unittest.TestCase):
    def test_cli_writes_guarded_sql_and_twins(self):
        rows = rows3()
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            exp = write_export(d / "live.json", rows)
            sw = subprocess.run([sys.executable, "-I", str(CLI), "sweep", "--export", str(exp), "--out", str(d / "s")],
                                capture_output=True, text=True)
            self.assertEqual(sw.returncode, 0, sw.stderr)
            out = d / "s" / "resolve-1"
            p = subprocess.run([sys.executable, "-I", str(CLI), "sweep", "resolve", "--groups",
                                str(d / "s" / "groups.json"), "--export", str(exp), "--group", "1",
                                "--keep", uid(3), "--out", str(out)], capture_output=True, text=True)
            self.assertEqual(p.returncode, 0, p.stderr)
            self.assertIn("2 to un-publish", p.stdout)
            un = (out / "unpublish.sql").read_text(encoding="utf-8")
            self.assertIn(f"duplicate of {uid(3)}; un-published by sweep", un)
            self.assertIn(f"WHERE id = '{uid(1)}'::uuid FOR UPDATE", un)
            self.assertNotIn(f"WHERE id = '{uid(3)}'::uuid FOR UPDATE", un)
            for name in ("unpublish", "republish"):
                dry = (out / f"{name}.dryrun.sql").read_text(encoding="utf-8")
                self.assertEqual(dry.replace("ROLLBACK;", "COMMIT;"), (out / f"{name}.sql").read_text(encoding="utf-8"))
            self.assertEqual(json.loads((out / "resolution.json").read_text())["keep"], uid(3))
            bad = subprocess.run([sys.executable, "-I", str(CLI), "sweep", "resolve", "--groups",
                                  str(d / "s" / "groups.json"), "--export", str(exp), "--group", "1",
                                  "--keep", uid(8), "--out", str(d / "bad")], capture_output=True, text=True)
            self.assertEqual(bad.returncode, 1)
            self.assertFalse((d / "bad").exists())


if __name__ == "__main__":
    unittest.main()
