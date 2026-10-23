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

    def test_qa_correction_needs_two_agreeing_solvers_without_a_printed_key(self):
        r = row(5, key="C", chash="after")
        self.p.jsonl("results-r1.jsonl", [{"id": r["id"], "verdict": "key_wrong", "stored_answer": "B", "blind_answer": "C"}])
        self.p.jsonl("corrections.jsonl", [{"question_id": r["id"], "stable_question_id": SID.format(5), "batch": "r1-qa-1",
                                            "after_content_hash_v2": "after", "after_correct_answer": "C"}])
        self.p.batch("r1-qa-1", {})
        res = self.cert(r)  # the QA round's blind solve only
        self.assertEqual((res["status"], res["reason"], res["agreeing"]),
                         ("uncertified", "qa_correction_evidence_short", ["qa-blind"]))
        self.p.batch("r1-qa-1", {"blind-answers.json": [{"id": SID.format(5), "answer": "C"}]})
        res = self.cert(r)
        self.assertEqual((res["status"], res["agreeing"]), ("certified", ["blind-subagent", "qa-blind"]))
        self.assertEqual(self.cert(row(5, key="C", chash="other"))["reason"], "qa_correction_changed_since")

    def reviewed(self, n, kind="official", printed="B"):
        return {"questions": [{"stable_question_id": SID.format(n), "reviewed_answer": {
            "kind": kind, "printed_answer": printed if kind == "official" else None}}]}

    def test_official_printed_key_needs_one_other_solver(self):
        # the tag binding under its batch-prefixed name, as most r2 batches have it
        binding = self.p.batch("r2-9", {"r2-9-reviewed-import-ready.json": self.reviewed(6)})
        (self.p.batches / "r2-9" / "tag-binding.json").rename(self.p.batches / "r2-9" / "r2-9-tag-binding.json")
        res = self.cert(row(6, binding=binding))
        self.assertEqual((res["reason"], res["printed_key"], res["agreeing"], res["needed_blind_solvers"]),
                         ("post_qa_evidence_short", "B", [], 1))
        # the reviewer's own solve may have seen the printed key: on record, but it does not count
        self.p.json("batches/r2-9/r2-9-independent-d-review.json",
                    {"records": [{"stable_question_id": SID.format(6), "reviewer_solve": "B", "printed_key": "B"}]})
        res = self.cert(row(6, binding=binding))
        self.assertEqual((res["status"], res["agreeing"], res["agreeing_blind"]), ("uncertified", ["reviewer"], []))
        self.p.json("batches/r2-9/blind-answers.json", [{"id": SID.format(6), "answer": "B"}])
        res = self.cert(row(6, binding=binding))
        self.assertEqual((res["status"], res["basis"], res["batch"], res["agreeing_blind"]),
                         ("certified", "post_qa_publish", "r2-9", ["blind-subagent"]))
        # a key that is not the printed one (overridden) needs two blind solvers
        res = self.cert(row(6, key="C", binding=binding))
        self.assertEqual((res["status"], res["printed_key_agrees"], res["disagreeing_blind"]),
                         ("uncertified", False, ["blind-subagent"]))

    def test_generated_key_needs_two_solvers_each_counted_once(self):
        binding = self.p.batch("r9-1", {
            "reviewed-import-ready.json": self.reviewed(7, kind="independently_confirmed_generated"),
            "config.json": {"calls": {SID.format(7): ["Skill", 3, "note", "B"]}},
            f"reviews/{SID.format(7)}.second-solve.json": {"answer": "B"},
            f"reviews/{SID.format(7)}.generated-key.json": {"reviews": [
                {"by": "transcriber", "answer": "B", "key_exposed_to_solver": True}, {"by": "r1", "answer": "B"}]}})
        res = self.cert(row(7, binding=binding))  # one reviewer in three files; the transcriber saw the key
        self.assertEqual((res["status"], res["agreeing"], res["needed_blind_solvers"]), ("uncertified", ["reviewer"], 2))
        self.p.json("batches/r9-1/blind-answers.json", {SID.format(7): {
            "solver_A": {"answer": "B"}, "solver_B": {"answer": "B"}, "text_only": "D"}})
        res = self.cert(row(7, binding=binding))
        self.assertEqual((res["status"], res["agreeing"], res["disagreeing"]),
                         ("certified", ["blind-subagent", "blind-subagent-2", "reviewer"], ["blind-text-only"]))

    def test_transcriber_counts_only_when_proven_blind_and_not_the_reviewers_pass(self):
        second = {"answer": "B", "rationale": "r1"}
        files = {"reviewed-import-ready.json": self.reviewed(10, kind="independently_confirmed_generated"),
                 f"reviews/{SID.format(10)}.second-solve.json": second,
                 "blind-answers.json": [{"id": SID.format(10), "answer": "B"}]}
        gk = f"reviews/{SID.format(10)}.generated-key.json"
        sha = hashlib.sha256(json.dumps(second).encode()).hexdigest()  # Pipe.json writes json.dumps
        for record, ok in (({"by": "transcriber", "answer": "B", "key_exposed_to_solver": False, "record_sha256": "x"}, True),
                           ({"by": "transcriber", "answer": "B"}, False),  # nothing proves the key was hidden
                           ({"by": "transcriber", "answer": "B", "key_exposed_to_solver": False, "record_sha256": sha}, False)):
            binding = self.p.batch("r1-5", {**files, gk: {"reviews": [record, {"by": "r1", "answer": "B"}]}})
            res = self.cert(row(10, binding=binding))
            self.assertEqual(res["status"] == "certified", ok, record)
            self.assertEqual("transcriber" in res["agreeing_blind"], ok)

    def test_reviewer_split(self):
        self.assertEqual([qa_certify.reviewer_of(b) for b in ("r1-200", "oct-r2-3", "r3-qa-42", "r2-9, r2-10", "bulk-1", None)],
                         ["r1", "r2", "r3", "r2", "r3", "r3"])

    def test_repair_records_and_unknown_binding(self):
        binding = self.p.batch("r9-2", {"reviewed-import-ready.json": self.reviewed(8)})
        self.p.json("repair/recertify-r3.json", [{"id": SID.format(8), "your_solve": "B", "printed_key": "B"}])
        res = self.cert(row(8, binding=binding))
        self.assertEqual((res["status"], res["agreeing_blind"]), ("certified", ["recertify-blind"]))
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
            self.assertTrue((p.qa / "uncertified-2099-01-02.json").exists())
            cert = json.loads((p.qa / "certificate-2099-01-02.json").read_text())
            by_id = {f["id"]: f for f in cert["failing"]}
            self.assertIn("page_overflow", by_id[good["id"]]["render"])
            self.assertIn("header_footer_line", by_id[broken["id"]]["static"])
            self.assertIn("render_missing", by_id[unrendered["id"]]["render"])
            md = (p.qa / "certificate-2099-01-02.md").read_text()
            self.assertIn(f"`{unrendered['id']}`: post_qa_no_batch_folder", md)
            self.assertTrue((p.qa / "certify-20990102T030405Z" / "static-report.json").exists())

    def test_reuse_certifies_answers_again_and_lists_uncertified_rows_without_keys(self):
        with tempfile.TemporaryDirectory() as d:
            p = Pipe(Path(d))
            work = p.qa / "certify-1"
            r = row(1)
            p.json("qa/certify-1/visible.json", {"exported_at": "x", "rows": [r]})
            p.json("qa/certify-1/static-report.json", {"questions": {}})
            p.json("qa/certify-1/render-report.json", {"totals": {"expected": 1, "rendered": 1, "render_failed": 0},
                                                       "questions": {}})
            (work / "render-results.jsonl").write_text(json.dumps({"id": r["id"]}) + "\n")
            p.json("qa/certify-1/render-meta.json", {"main_commit": "c" * 40})
            res = qa_certify.run_certify(p.d, "2099-01-03T00:00:00Z", reuse=work, render=None, exporter=None,
                                         log=lambda m: None)
            self.assertEqual((res["visible"], res["failing"], res["uncertified"]), (1, 0, 1))
            listed = json.loads((p.qa / "uncertified-2099-01-03.json").read_text())
            self.assertEqual([(x["id"], x["reason"]) for x in listed["rows"]], [(r["id"], "post_qa_no_batch_folder")])
            self.assertNotIn('"B"', json.dumps(listed))  # no key: the re-solve stays blind
            self.assertEqual([json.loads((p.qa / f"uncertified-{w}.json").read_text())["count"] for w in ("r1", "r2", "r3")],
                             [0, 0, 1])  # no batch folder: r3

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
