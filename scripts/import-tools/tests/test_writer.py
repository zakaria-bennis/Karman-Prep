import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from kimport import writer

CLI = Path(__file__).resolve().parent.parent / "kimport-cli.py"
T1 = "2026-10-20T10:00:00Z"
T2 = "2026-10-20T10:05:00Z"


class WriterTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.dir = Path(self._tmp.name)
        self.lock = self.dir / "writer.lock"
        self.log = self.dir / "intents.jsonl"

    def _open(self, batch="batch-07"):
        return writer.write_intent(self.log, batch, "publish", ["b", "a"], "ab" * 32, T1)

    def test_second_holder_refused(self):
        writer.acquire_lock(self.lock, "session-a", T1)
        with self.assertRaises(writer.LockHeld) as cm:
            writer.acquire_lock(self.lock, "session-b", T2)
        self.assertEqual(cm.exception.holder, "session-a")
        self.assertEqual(cm.exception.since, T1)
        self.assertEqual(json.loads(self.lock.read_text()), {"holder": "session-a", "since": T1})

    def test_release_wrong_holder_refused(self):
        writer.acquire_lock(self.lock, "session-a", T1)
        with self.assertRaises(writer.WrongHolder):
            writer.release_lock(self.lock, "session-b")
        self.assertTrue(self.lock.exists())
        writer.release_lock(self.lock, "session-a")
        self.assertFalse(self.lock.exists())
        writer.acquire_lock(self.lock, "session-b", T2)

    def test_intent_open_until_closed(self):
        iid = self._open()
        self.assertEqual(len(iid), 16)
        opened = writer.open_intents(self.log)
        self.assertEqual([i["intent_id"] for i in opened], [iid])
        self.assertEqual(opened[0]["question_ids"], ["a", "b"])
        writer.close_intent(self.log, iid, "verified", "cd" * 32, T2)
        self.assertEqual(writer.open_intents(self.log), [])

    def test_close_rejects_bad_outcome_and_unknown_id(self):
        iid = self._open()
        with self.assertRaises(ValueError):
            writer.close_intent(self.log, iid, "done", "x", T2)
        with self.assertRaises(ValueError):
            writer.close_intent(self.log, "0" * 16, "verified", "x", T2)

    def test_resume_blocks_on_open_intent(self):
        writer.require_no_open_intents(self.log)  # no log yet: fine
        self._open("batch-07")  # simulated crash: never closed
        with self.assertRaises(writer.OpenIntent) as cm:
            writer.require_no_open_intents(self.log)
        self.assertIn("batch-07", str(cm.exception))

    def test_log_append_only(self):
        iid = self._open()
        first = self.log.read_text().splitlines()[0]
        writer.close_intent(self.log, iid, "rolled_back", "cd" * 32, T2)
        lines = self.log.read_text().splitlines()
        self.assertEqual(len(lines), 2)
        self.assertEqual(lines[0], first)

    def test_intent_id_deterministic(self):
        a = writer.write_intent(self.dir / "x.jsonl", "b", "publish", ["2", "1"], "s", T1)
        b = writer.write_intent(self.dir / "y.jsonl", "b", "publish", ["1", "2"], "s", T1)
        self.assertEqual(a, b)

    def test_cli_roundtrip(self):
        def run(*a):
            return subprocess.run(
                [sys.executable, "-I", str(CLI), *a], capture_output=True, text=True
            )

        r = run("lock", "acquire", "--path", str(self.lock), "--holder", "s1", "--now", T1)
        self.assertEqual(r.returncode, 0, r.stderr)
        r = run("lock", "acquire", "--path", str(self.lock), "--holder", "s2", "--now", T2)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("s1", r.stderr)
        r = run("intent", "open", "--log", str(self.log), "--batch", "b9", "--action", "publish",
                "--question-ids", "q1,q2", "--sql-sha256", "ff", "--now", T1)
        self.assertEqual(r.returncode, 0, r.stderr)
        iid = r.stdout.strip()
        r = run("intent", "list", "--log", str(self.log))
        self.assertIn(iid, r.stdout)
        r = run("intent", "close", "--log", str(self.log), "--intent-id", iid,
                "--outcome", "verified", "--readback-sha256", "ee", "--now", T2)
        self.assertEqual(r.returncode, 0, r.stderr)
        r = run("intent", "list", "--log", str(self.log))
        self.assertNotIn(iid, r.stdout)
        r = run("lock", "release", "--path", str(self.lock), "--holder", "s1")
        self.assertEqual(r.returncode, 0, r.stderr)


if __name__ == "__main__":
    unittest.main()
