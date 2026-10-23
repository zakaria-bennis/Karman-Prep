"""`k qa certify` (kimport.qa_certify, kimport.qa_answers). Synthetic rows and files only."""

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from kimport import qa_answers, qa_certify, qa_export

UUID = "00000000-0000-4000-8000-{:012d}"
SID = "2099-01_SYN_V1_RW_M1_Q{:02d}"


def row(n, stem="Which made-up choice best describes the grove?", key="B", binding=None, chash=None, **extra):
    tags = {"stable_question_id": SID.format(n), "tag_binding_manifest_sha256": binding}
    r = {"id": UUID.format(n), "is_live": True, "publish_status": "publish_ready", "subject": "reading",
         "answer_format": "multiple_choice", "question_text": stem, "correct_answer": key,
         "content_hash_v2": chash or f"h{n}", "passage": None, "passage_a": None, "passage_b": None,
         "passage_intro": None, "figure_kind": None, "image_url": None,
         "answer_choices": [{"letter": L, "choice_text": f"grove {L}", "choice_table_data": None} for L in "ABCD"],
         "answer_key_entries": [{"id": "k", "raw_model_response": {"approved_tags": tags}}]}
    r.update(extra)
    return r


def snap(r):
    return {"id": r["id"], "question": r["question_text"], "passage": r["passage"], "passage_a": None,
            "passage_b": None, "passage_intro": None,
            "choices": [{"letter": c["letter"], "text": c["choice_text"], "table": None} for c in r["answer_choices"]]}


class Pipe:
    def __init__(self, d: Path):
        self.d, self.qa, self.batches = d, d / "qa", d / "batches"
        self.qa.mkdir(parents=True)
        self.batches.mkdir()

    def jsonl(self, name, lines):
        (self.qa / name).write_text("".join(json.dumps(x) + "\n" for x in lines))

    def json(self, rel, value):
        p = self.d / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(value))
        return p

    def batch(self, name, files):
        binding = self.json(f"batches/{name}/tag-binding.json", {"batch": name})
        for rel, value in files.items():
            self.json(f"batches/{name}/{rel}", value)
        return hashlib.sha256(binding.read_bytes()).hexdigest()


class AnswerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.p = Pipe(Path(self.tmp.name))

    def tearDown(self):
        self.tmp.cleanup()

    def cert(self, r):
        return qa_answers.certify_row(r, qa_answers.QaRecords(self.p.d))

    def test_same_answer(self):
        self.assertTrue(qa_answers.same_answer("b", "B", False))
        self.assertTrue(qa_answers.same_answer(".5555", "5/9", True))
        self.assertTrue(qa_answers.same_answer("0.5556", "5/9", True))
        self.assertTrue(qa_answers.same_answer("−3", "-3", True))
        self.assertFalse(qa_answers.same_answer(".55", "5/9", True))
        self.assertFalse(qa_answers.same_answer("A", "B", False))

    def test_qa_verdict_path(self):
        clean, wrong, changed, key_moved = row(1), row(2), row(3, stem="A new stem?"), row(4, key="C")
        self.p.jsonl("results-r1.jsonl", [
            {"id": clean["id"], "verdict": "broken", "stored_answer": "B"},
            {"id": wrong["id"], "verdict": "key_wrong", "stored_answer": "B", "fix": "key B->C"},
            {"id": changed["id"], "verdict": "clean", "stored_answer": "B"},
            {"id": key_moved["id"], "verdict": "clean", "stored_answer": "B"}])
        self.p.jsonl("results-r2.jsonl", [{"id": clean["id"], "verdict": "key_ok", "stored_answer": "B"}])  # later wins
        self.p.json("qa/blind-live-r1.json", [snap(row(n)) for n in (1, 2, 3, 4)])
        self.assertEqual(self.cert(clean), {"status": "certified", "basis": "qa_verdict", "verdict": "key_ok"})
        self.assertEqual(self.cert(wrong)["reason"], "qa_verdict_key_wrong")
        self.assertEqual(self.cert(changed)["reason"], "text_changed_since_qa")
        self.assertEqual(self.cert(key_moved)["reason"], "key_changed_since_qa")

    def test_qa_correction_needs_two_agreeing_solves(self):
        r = row(5, key="C", chash="after")
        self.p.jsonl("results-r1.jsonl", [{"id": r["id"], "verdict": "key_wrong", "stored_answer": "B", "blind_answer": "C"}])
        self.p.jsonl("corrections.jsonl", [{"question_id": r["id"], "stable_question_id": SID.format(5), "batch": "r1-qa-1",
                                            "after_content_hash_v2": "after", "after_correct_answer": "C"}])
        self.p.batch("r1-qa-1", {})
        res = self.cert(r)  # the QA round's blind solve only
        self.assertEqual((res["status"], res["reason"], res["agreeing"]),
                         ("uncertified", "qa_correction_fewer_than_two_solves", ["qa-round-blind"]))
        self.p.batch("r1-qa-1", {"blind-answers.json": [{"id": SID.format(5), "answer": "C"}]})
        res = self.cert(r)
        self.assertEqual((res["status"], res["agreeing"]), ("certified", ["batch-blind", "qa-round-blind"]))
        self.assertEqual(self.cert(row(5, key="C", chash="other"))["reason"], "qa_correction_changed_since")

    def test_post_qa_publish_reads_its_own_batch(self):
        binding = self.p.batch("r9-1", {
            f"reviews/{SID.format(6)}.generated-key.json": {"reviews": [{"by": "transcriber", "answer": "B"},
                                                                       {"by": "r3", "answer": "B"}]},
            f"reviews/{SID.format(7)}.second-solve.json": {"answer": "B"},
            "blind-answers.json": [{"id": SID.format(7), "answer": "B"}, {"id": SID.format(8), "answer": "D"}],
            f"reviews/{SID.format(8)}.blind-solve.json": {"answer": "D"}})
        res = self.cert(row(6, binding=binding))
        self.assertEqual((res["status"], res["basis"], res["batch"]), ("certified", "post_qa_publish", "r9-1"))
        self.assertEqual(self.cert(row(7, binding=binding))["status"], "certified")
        # blind-answers.json and the per-question blind solve are one solver, and it disagrees
        res = self.cert(row(8, binding=binding))
        self.assertEqual((res["reason"], res["agreeing"], res["disagreeing"]),
                         ("post_qa_fewer_than_two_solves", [], ["batch-blind"]))
        self.assertEqual(self.cert(row(9, binding="0" * 64))["reason"], "post_qa_no_batch_folder")


class CertifyRunTest(unittest.TestCase):
    def test_run_writes_the_certificate_with_every_failing_and_uncertified_id(self):
        with tempfile.TemporaryDirectory() as d:
            p = Pipe(Path(d))
            good, broken, unrendered = row(1), row(2, stem="Section 1, Module 2\nWhich made-up choice fits?"), row(3)
            p.jsonl("results-r1.jsonl", [{"id": r["id"], "verdict": "clean", "stored_answer": "B"} for r in (good, broken)])
            p.json("qa/blind-live-r1.json", [snap(r) for r in (good, broken)])

            def exporter(out, env, log, visible):
                self.assertTrue(visible)
                Path(out).write_text(json.dumps({"exported_at": "2099-01-01T00:00:00Z", "fingerprint": "f",
                                                 "rows": [good, broken, unrendered]}))

            def render(export, out, first, log):
                return {"main_commit": "c" * 40, "totals": {"expected": 3, "rendered": 2, "render_failed": 0},
                        "questions": {good["id"]: {"failures": {"page_overflow": ["phone: 20px"]}}},
                        "rendered_ids": [good["id"], broken["id"]]}

            res = qa_certify.run_certify(p.d, "2099-01-02T03:04:05Z", render=render, exporter=exporter, log=lambda m: None)
            self.assertEqual((res["visible"], res["certified"], res["failing"], res["uncertified"]), (3, 0, 3, 1))
            self.assertEqual(res["uncertified_by_reason"], {"post_qa_no_batch_folder": 1})
            cert = json.loads((p.qa / "certificate-2099-01-02.json").read_text())
            by_id = {f["id"]: f for f in cert["failing"]}
            self.assertIn("page_overflow", by_id[good["id"]]["render"])
            self.assertIn("header_footer_line", by_id[broken["id"]]["static"])
            self.assertIn("render_missing", by_id[unrendered["id"]]["render"])
            md = (p.qa / "certificate-2099-01-02.md").read_text()
            self.assertIn(f"`{unrendered['id']}`: post_qa_no_batch_folder", md)
            self.assertTrue((p.qa / "certify-20990102T030405Z" / "static-report.json").exists())

    def test_refuses_an_export_with_rows_students_cannot_see(self):
        with tempfile.TemporaryDirectory() as d:
            p = Pipe(Path(d))
            exp = p.json("x.json", {"rows": [row(1, publish_status="needs_human_review")]})
            with self.assertRaises(ValueError):
                qa_certify.run_certify(p.d, "2099-01-02T03:04:05Z", export=exp, render=None, log=lambda m: None)

    def test_visible_export_queries(self):
        q = qa_export.rest_page_query(UUID.format(0), 5, visible=True)
        self.assertIn("is_live=eq.true&publish_status=in.(publish_ready,publish_ready_with_verified_repair)", q)
        self.assertNotIn("publish_status=in", qa_export.rest_page_query(UUID.format(0), 5))


if __name__ == "__main__":
    unittest.main()
