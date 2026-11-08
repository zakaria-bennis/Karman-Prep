import subprocess
import sys
import unittest
from pathlib import Path

CLI = Path(__file__).resolve().parent.parent / "kimport-cli.py"


class CliTests(unittest.TestCase):
    def test_help_exits_zero(self):
        r = subprocess.run(
            [sys.executable, "-I", str(CLI), "--help"],
            capture_output=True,
            text=True,
        )
        self.assertEqual(r.returncode, 0)
        self.assertIn("kimport", r.stdout)

    def test_cli_lists_all_commands(self):
        r = subprocess.run(
            [sys.executable, "-I", str(CLI), "--help"],
            capture_output=True,
            text=True,
        )
        self.assertEqual(r.returncode, 0)
        for name in (
            "sweep", "backfill", "publish", "lint", "corpus",
            "pairs", "lane", "slice", "lock", "intent",
        ):
            self.assertIn(name, r.stdout)

    def test_no_command_prints_help_and_fails(self):
        r = subprocess.run(
            [sys.executable, "-I", str(CLI)], capture_output=True, text=True
        )
        self.assertEqual(r.returncode, 2)


if __name__ == "__main__":
    unittest.main()
