"""Corpus re-runs keep lane promotions (I9), and every clusters.json writer
shares one lock and one atomic writer (I10). Synthetic text only."""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from kimport import jsonio, lane, pairs_page
from kimport.corpus import run_corpus
from tests.corpus_fixtures import build_tree, mc

CLI = Path(__file__).resolve().parent.parent / "kimport-cli.py"
A, B = "SYN_V1_MATH_M1_Q01", "SYN_V2_MATH_M1_Q01"
TEXT = mc("Which made-up number is the smallest even prime?", ("one", "two", "three", "four"))


class LanePromotionSurvivesRerun(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.d = Path(self._tmp.name)
        self.ip, self.lp = build_tree(self.d / "src", [{"id": A, "text": TEXT}, {"id": B, "text": TEXT}])
        self.pipe = self.d / "pipe"
        self.out = self.pipe / "corpus"
        self.lane = self.pipe / "lane.json"
        self.pipe.mkdir()

    def tearDown(self):
        self._tmp.cleanup()

    def roles(self):
        return json.loads((self.out / "clusters.json").read_text(encoding="utf-8"))["roles"]

    def test_parked_canonical_stays_demoted_after_rerun(self):
        run_corpus(self.ip, self.lp, None, self.out)
        self.assertEqual(self.roles()[A], "canonical")  # lowest id wins with nothing else to go on
        lane.set_aside(self.lane, A, "extraction_repair", "made-up problem", "2026-10-21T09:00:00")
        lane.record_attempt(self.lane, A, "manual", False, "2026-10-21T10:00:00")
        self.assertEqual(lane.record_attempt(self.lane, A, "ocr", False, "2026-10-21T11:00:00"), "parked")
        self.assertEqual(lane.promote_next_member(self.out / "clusters.json", A, self.lane), B)
        counts = run_corpus(self.ip, self.lp, None, self.out)  # lane.json found one folder up
        self.assertEqual((self.roles()[A], self.roles()[B]), ("member", "canonical"))
        self.assertEqual(json.loads((self.out / "clusters.json").read_text())["inputs"]["lane_blocked"], 1)
        self.assertEqual(counts["unique"], 1)

    def test_explicit_lane_and_resolved_item_released(self):
        other = self.d / "elsewhere" / "lane.json"
        other.parent.mkdir()
        lane.set_aside(other, A, "extraction_repair", "made-up problem", "2026-10-21T09:00:00")
        run_corpus(self.ip, self.lp, None, self.out, lane_path=other)
        self.assertEqual(self.roles()[B], "canonical")
        member = next(m for c in json.loads((self.out / "clusters.json").read_text())["clusters"]
                      for m in c["members"] if m["id"] == A)
        self.assertTrue(member["in_lane"])
        lane.record_attempt(other, A, "manual", True, "2026-10-21T10:00:00")  # fixed: resolved
        run_corpus(self.ip, self.lp, None, self.out, lane_path=other)
        self.assertEqual(self.roles()[A], "canonical")

    def test_cli_takes_lane(self):
        lane.set_aside(self.lane, A, "extraction_repair", "made-up problem", "2026-10-21T09:00:00")
        p = subprocess.run([sys.executable, "-I", str(CLI), "corpus", "--c-index", str(self.ip), "--ledger",
                            str(self.lp), "--out", str(self.out), "--lane", str(self.lane)],
                           capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertEqual(self.roles()[B], "canonical")
        old = subprocess.run([sys.executable, "-I", str(CLI), "corpus", "--c-index", str(self.ip), "--ledger",
                              str(self.lp), "--out", str(self.out), "--decisions", "x.json"],
                             capture_output=True, text=True)
        self.assertEqual(old.returncode, 2)  # renamed to --decision-log
        self.assertIn("--decisions", old.stderr)


class SharedLockTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.d = Path(self._tmp.name)
        self.old = jsonio.LOCK_WAIT_SECONDS
        jsonio.LOCK_WAIT_SECONDS = 0.1

    def tearDown(self):
        jsonio.LOCK_WAIT_SECONDS = self.old
        self._tmp.cleanup()

    def test_corpus_and_pairs_apply_wait_for_the_clusters_lock(self):
        ip, lp = build_tree(self.d / "src", [{"id": A, "text": TEXT}])
        out = self.d / "corpus"
        run_corpus(ip, lp, None, out)
        before = (out / "clusters.json").read_bytes()
        with jsonio.FileLock(out / "clusters.json"):
            with self.assertRaisesRegex(ValueError, "in use by another session"):
                run_corpus(ip, lp, None, out)
            with self.assertRaisesRegex(ValueError, "in use by another session"):
                pairs_page.apply_decisions(out / "founder_pairs.json", self.d / "none.json", out / "clusters.json")
            with self.assertRaisesRegex(ValueError, "in use by another session"):
                lane.promote_next_member(out / "clusters.json", A)
        self.assertEqual((out / "clusters.json").read_bytes(), before)

    def test_atomic_writer_leaves_old_file_on_failure(self):
        target = self.d / "doc.json"
        jsonio.atomic_write_json(target, {"a": 1})
        with self.assertRaises(TypeError):
            jsonio.atomic_write_json(target, {"a": object()})
        self.assertEqual(json.loads(target.read_text()), {"a": 1})
        self.assertEqual(sorted(p.name for p in self.d.iterdir()), ["doc.json"])

    def test_one_writer_everywhere(self):
        root = Path(__file__).resolve().parent.parent / "kimport"
        for name in ("lane.py", "pairs_page.py", "corpus.py"):
            src = (root / name).read_text(encoding="utf-8")
            with self.subTest(module=name):
                self.assertNotIn("os.replace", src)
                self.assertNotIn("class _FileLock", src)
                self.assertNotIn(".write_text(json.dumps", src)


if __name__ == "__main__":
    unittest.main()
