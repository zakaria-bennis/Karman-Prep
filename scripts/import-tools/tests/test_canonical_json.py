"""kimport.lint.canonical_json must print numbers exactly as JavaScript does.

The builders hash rows with canonical_json (frozen manifest row_sha256, approved_tags.pilot_row_sha256)
and stage re-hashes the parsed JSON with canonicalJson in scripts/pdf-pipeline/reviewed-input-hash.ts.
Python's repr writes 7e-05 where JavaScript writes 0.00007, so a figure_spec with small sampled
points used to fail stage with "Row N content differs from frozen manifest".

The cross-checks against node and the real verifier are skipped when node_modules is not installed."""

import hashlib
import json
import random
import subprocess
import tempfile
import unittest
from pathlib import Path

from kimport import lint
from tests import publish_fixtures as pfx

REPO = Path(__file__).resolve().parents[3]
VERIFY_TS = Path(__file__).resolve().parent / "ts" / "verify-frozen.ts"
HAS_TSX = (REPO / "node_modules" / ".bin" / "tsx").exists()

# value -> what JSON.stringify(value) prints in JavaScript
JS_NUMBERS = [
    (7e-05, "0.00007"), (5.1e-05, "0.000051"), (1e-4, "0.0001"), (1.5e-6, "0.0000015"), (1e-6, "0.000001"),
    (1e-7, "1e-7"), (1.25e-7, "1.25e-7"), (5e-324, "5e-324"), (0.1, "0.1"), (123.456, "123.456"),
    (1.0, "1"), (2.5, "2.5"), (1e16, "10000000000000000"), (1.5e17, "150000000000000000"),
    (1e20, "100000000000000000000"), (1e21, "1e+21"), (1.5e22, "1.5e+22"), (1.7976931348623157e308, "1.7976931348623157e+308"),
    (-7e-05, "-0.00007"), (-1e21, "-1e+21"), (0.0, "0"), (-0.0, "0"), (12, "12"), (-3, "-3"),
    (2**53, "9007199254740992"), (10**21, "1e+21"), (10**22 + 1, "1e+22"),
]


def spec_row(n: int = 1) -> dict:
    """A reviewed row that passes the stage verifier's tag binding, with a figure_spec whose sampled
    points are below 1e-4 (a parabola sampled near its vertex at the origin). Made-up content."""
    stable = f"2099-01_SYN_V1_RW_{pfx.MODULE}_Q{n:02d}"
    evidence = {**pfx._evidence(n, pfx.MANIFEST), "stable_question_id": stable}
    return {
        "stable_question_id": stable, "question_text": "Made-up stem about a parabola.",
        "domain": "info_ideas", "topic_cluster": "Information & Ideas",
        "choice_a": "one", "choice_b": "two", "choice_c": "three", "choice_d": "four", "correct_answer": "A",
        "reviewed_answer": {"printed_answer": "A", "independently_verified_answer": "A", "evidence": evidence},
        "difficulty_level": 3, "difficulty_confidence": 0.9, "difficulty_content_sha256": pfx.hexn(n, 4),
        "source_version": {"content_sha256": pfx.hexn(n, 2), "student_content_sha256": pfx.hexn(n, 4)},
        "figure_spec": {"kind": "function-graph", "curves": [{"samples": [
            [-0.01, 7e-05], [-0.00714, 5.1e-05], [0, 0], [0.00714, 5.1e-05], [0.01, 7e-05], [1.5, 2.25]]}]},
    }


class CanonicalJsonNumbers(unittest.TestCase):
    def test_numbers_print_like_javascript(self):
        for value, expected in JS_NUMBERS:
            with self.subTest(value=value):
                self.assertEqual(lint.canonical_json(value), expected)

    def test_small_samples_hash_like_the_stage_check(self):
        row = {"samples": [[-0.01, 7e-05], [0.00714, 5.1e-05]]}
        expected = '{"samples":[[-0.01,0.00007],[0.00714,0.000051]]}'
        self.assertEqual(lint.canonical_json(row), expected)
        self.assertEqual(lint.row_sha256(row), hashlib.sha256(expected.encode()).hexdigest())

    def test_non_json_numbers_still_refused(self):
        for bad in (float("nan"), float("inf"), float("-inf")):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                lint.canonical_json([bad])


@unittest.skipUnless(HAS_TSX, "node_modules not installed")
class CanonicalJsonAgainstTypeScript(unittest.TestCase):
    def test_random_numbers_match_node(self):
        rnd = random.Random(20261108)
        values = [rnd.uniform(-1, 1) * 10 ** rnd.randint(-12, 25) for _ in range(3000)]
        values += [rnd.randint(-10**6, 10**6) / 10 ** rnd.randint(0, 12) for _ in range(1000)]
        values += [v for v, _ in JS_NUMBERS]
        payload = json.dumps(values)  # Python's own number format, as the builders write the batch
        done = subprocess.run(["node", "-e", "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>"
                               "process.stdout.write(JSON.stringify(JSON.parse(s).map(v=>JSON.stringify(v)))))"],
                              input=payload, capture_output=True, text=True, timeout=60)
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertEqual([lint.canonical_json(v) for v in json.loads(payload)], json.loads(done.stdout))

    def test_small_samples_survive_build_freeze_stage_check(self):
        """build (Python json.dumps) -> freeze (lint.row_sha256) -> stage's verifyFrozenReviewedInput."""
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            rows = [spec_row(1), spec_row(2)]
            reviewed = d / "syn-reviewed-import-ready.json"
            reviewed.write_bytes((json.dumps({"import_policy": "reviewed-difficulty", "questions": rows},
                                             ensure_ascii=False, indent=2) + "\n").encode())
            self.assertIn("7e-05", reviewed.read_text())
            self.assertIn("5.1e-05", reviewed.read_text())
            pdf = d / "syn.pdf"
            pdf.write_bytes(b"%PDF-1.4 made-up\n")
            sha = lambda b: hashlib.sha256(b).hexdigest()  # noqa: E731
            manifest = {"schema_version": 1, "reviewed_json_sha256": sha(reviewed.read_bytes()),
                        "source_pdf_sha256": sha(pdf.read_bytes()),
                        "rows": [{"stable_question_id": r["stable_question_id"], "row_sha256": lint.row_sha256(r),
                                  "content_sha256": r["source_version"]["content_sha256"],
                                  "student_content_sha256": r["source_version"]["student_content_sha256"]}
                                 for r in rows]}
            mpath = d / "syn-frozen.json"
            mpath.write_bytes((json.dumps(manifest, indent=2) + "\n").encode())
            done = subprocess.run(["npx", "--no-install", "tsx", str(VERIFY_TS), str(reviewed), str(pdf), str(mpath),
                                   sha(mpath.read_bytes())], cwd=REPO, capture_output=True, text=True, timeout=300)
            self.assertEqual(done.returncode, 0, done.stderr)
            self.assertEqual(json.loads(done.stdout), {"ok": True, "verifiedRows": 2})


if __name__ == "__main__":
    unittest.main()
