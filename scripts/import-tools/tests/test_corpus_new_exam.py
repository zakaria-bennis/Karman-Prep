"""New exam forms captured after the readiness ledger (made-up question text only):
a supplementary ledger of new-exam occurrences plus new-exam records in an extra C records
file (k corpus --extra-ledger / --extra-c-records), and k slice / release-done reading them."""

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from kimport import lane
from kimport.corpus import run_corpus
from kimport.corpus_load import (NEW_EXAM_LEDGER_FILE, NEW_EXAM_ORIGIN, NEW_EXAM_RECORDS_FILE, REREAD_SCHEMA,
                                 ledger_entries, load_corpus)
from tests.corpus_fixtures import mc
from tests.test_corpus_unparsed import EXAM, Tree, by_ref, qid

CLI = Path(__file__).resolve().parent.parent / "kimport-cli.py"
NEW = "2099-01_SYN_V9"
SRC = "pdf-sha-1"
STEM = "Which choice best states the main idea of the synthetic passage about tidal pools?"


def nid(n: int, sec="RW", mod=1) -> str:
    return f"{NEW}_{sec}_M{mod}_Q{n:02d}"


def sha(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def new_row(oid: str, holds=(), bucket="new_exam", src=SRC, origin=NEW_EXAM_ORIGIN) -> dict:
    return {"id": oid, "exam": NEW, "source_sha256": src, "origin": origin, "bucket": bucket,
            "holds": list(holds), "missing_evidence": [], "db_live_rows": [], "final_category": None,
            "certificate": None}


def new_rec(oid: str, text: str, key="A", kind="official", src=SRC, **kw) -> dict:
    return {"question_id": oid, "origin": NEW_EXAM_ORIGIN, "exam_id": NEW, "text": text, "text_sha256": sha(text),
            "key": key, "answer_kind": kind, "source_sha256": src, **kw}


def write(path: Path, doc) -> Path:
    path.write_text(json.dumps(doc), encoding="utf-8")
    return path


def bundle(d, rows, recs, base_items=()) -> tuple[Path, Path, Path, Path]:
    """(C index, readiness ledger, new-exam ledger, new-exam records) in folder d."""
    t = Tree(Path(d))
    for oid, text in base_items:
        t.indexed(oid, text, bver="b-1")
        t.ledger(oid, bver="b-1")
    ip, lp = t.write()
    nl = write(Path(d) / NEW_EXAM_LEDGER_FILE, {"schema": "new-exam-ledger-v1", "items": rows})
    nr = write(Path(d) / NEW_EXAM_RECORDS_FILE, {"schema": REREAD_SCHEMA, "records": recs})
    return ip, lp, nl, nr


class NewExamLoad(unittest.TestCase):
    def test_new_exam_occurrence_is_read_with_its_printed_key(self):
        with tempfile.TemporaryDirectory() as d:
            text = mc(STEM)
            ip, lp, nl, nr = bundle(d, [new_row(nid(1))], [new_rec(nid(1), text, key="C")])
            st = {}
            r = by_ref(load_corpus(ip, lp, [nr], st, [nl]))[nid(1)]
        self.assertEqual(r.meta["status"], "ok")
        self.assertEqual(r.answer, "gamma")
        self.assertEqual(r.meta["reviewed_answer"], {"kind": "official"})
        self.assertEqual(r.meta["text_source"], NEW_EXAM_ORIGIN)
        self.assertEqual((st["new_exam_occurrences"], st["new_exam_used"], st["new_exam_failed"]), (1, 1, 0))

    def test_solved_key_is_never_official(self):
        with tempfile.TemporaryDirectory() as d:
            ip, lp, nl, nr = bundle(d, [new_row(nid(1))], [new_rec(nid(1), mc(STEM), kind="transcriber_solved")])
            r = by_ref(load_corpus(ip, lp, [nr], {}, [nl]))[nid(1)]
        self.assertEqual(r.meta["reviewed_answer"], {"kind": None})
        self.assertEqual(r.meta["new_exam_key_kind"], "transcriber_solved")

    def test_numeric_new_exam_question(self):
        with tempfile.TemporaryDirectory() as d:
            text = "If 3x + 2 = 11, what is the value of x?"
            ip, lp, nl, nr = bundle(d, [new_row(nid(5, "MATH"))], [new_rec(nid(5, "MATH"), text, key="3")])
            r = by_ref(load_corpus(ip, lp, [nr], {}, [nl]))[nid(5, "MATH")]
        self.assertEqual((r.meta["status"], r.answer_format, r.answer), ("ok", "numeric", "3"))

    def test_visual_hold_and_figure_flag_make_a_figure_record(self):
        with tempfile.TemporaryDirectory() as d:
            rows = [new_row(nid(1), holds=["new_exam_visual_review"]), new_row(nid(2))]
            recs = [new_rec(nid(1), mc(STEM)), new_rec(nid(2), mc(STEM + " Second."), figure=True)]
            ip, lp, nl, nr = bundle(d, rows, recs)
            got = by_ref(load_corpus(ip, lp, [nr], {}, [nl]))
        self.assertEqual(got[nid(1)].meta["status"], "figure")
        self.assertEqual(got[nid(2)].meta["status"], "figure")

    def test_source_or_text_change_makes_it_unparsed(self):
        with tempfile.TemporaryDirectory() as d:
            changed = new_rec(nid(2), mc(STEM))
            changed["text"] = mc(STEM + " Edited later.")
            rows = [new_row(nid(1)), new_row(nid(2)), new_row(nid(3))]
            recs = [new_rec(nid(1), mc(STEM), src="other-pdf"), changed]
            ip, lp, nl, nr = bundle(d, rows, recs)
            st = {}
            got = by_ref(load_corpus(ip, lp, [nr], st, [nl]))
        self.assertEqual(got[nid(1)].meta["reason"], "new_exam_source_differs")
        self.assertEqual(got[nid(2)].meta["reason"], "new_exam_text_changed")
        self.assertEqual(got[nid(3)].meta["reason"], "no_corrected_text")
        self.assertEqual(st["new_exam_failed"], 2)

    def test_new_exam_record_cannot_replace_a_ledger_occurrence(self):
        with tempfile.TemporaryDirectory() as d:
            t = Tree(Path(d))
            t.ledger(qid(1), bver="b-1")
            ip, lp = t.write()
            nr = write(Path(d) / "nr.json", {"schema": REREAD_SCHEMA, "records": [new_rec(qid(1), mc(STEM))]})
            st = {}
            r = by_ref(load_corpus(ip, lp, [nr], st))[qid(1)]
        self.assertEqual(r.meta["status"], "unparsed")
        self.assertEqual(st["reread_failures"][qid(1)], "new_exam_record_for_ledger_occurrence")

    def test_supplementary_ledger_rules(self):
        with tempfile.TemporaryDirectory() as d:
            base = qid(1)
            ip, lp, nl, nr = bundle(d, [new_row(base)], [], base_items=[(base, mc(STEM))])
            with self.assertRaises(ValueError):  # repeats a readiness ledger occurrence
                load_corpus(ip, lp, [nr], {}, [nl])
            with self.assertRaises(ValueError):
                ledger_entries(lp, [nl])
            bad = write(Path(d) / "bad.json", {"items": [new_row(nid(1), origin=None)]})
            with self.assertRaises(ValueError):  # not a new-exam row
                load_corpus(ip, lp, [nr], {}, [bad])
            incomplete = write(Path(d) / "inc.json", {"schema": REREAD_SCHEMA, "records": [
                {"question_id": nid(1), "origin": NEW_EXAM_ORIGIN, "text": mc(STEM)}]})
            with self.assertRaises(ValueError):  # no source / text hash
                load_corpus(ip, lp, [incomplete], {}, [])

    def test_same_id_in_two_extra_files_is_an_error(self):
        with tempfile.TemporaryDirectory() as d:
            ip, lp, nl, nr = bundle(d, [new_row(nid(1))], [new_rec(nid(1), mc(STEM))])
            other = write(Path(d) / "other.json", {"schema": REREAD_SCHEMA, "records": [new_rec(nid(1), mc(STEM))]})
            with self.assertRaises(ValueError):
                load_corpus(ip, lp, [nr, other], {}, [nl])


class NewExamCorpus(unittest.TestCase):
    def test_duplicate_of_a_ledger_question_joins_its_cluster(self):
        with tempfile.TemporaryDirectory() as d:
            text = mc(STEM)
            fresh = mc("Which statement about the synthetic glacier survey is best supported by the data?",
                       ("one", "two", "three", "four"))
            ip, lp, nl, nr = bundle(d, [new_row(nid(1)), new_row(nid(2))],
                                    [new_rec(nid(1), text), new_rec(nid(2), fresh)], base_items=[(qid(1), text)])
            out = Path(d) / "out"
            out.mkdir()
            (out / NEW_EXAM_LEDGER_FILE).write_bytes(nl.read_bytes())
            (out / NEW_EXAM_RECORDS_FILE).write_bytes(nr.read_bytes())
            counts = run_corpus(ip, lp, None, out)  # defaults: new-exam files in --out
            doc = json.loads((out / "clusters.json").read_text(encoding="utf-8"))
        roles = doc["roles"]
        self.assertEqual(counts["occurrences"], 3)
        self.assertEqual(counts["unique"], 2)
        self.assertEqual({roles[qid(1)], roles[nid(1)]}, {"canonical", "member"})
        self.assertEqual(roles[nid(2)], "canonical")
        self.assertEqual(doc["inputs"]["extra_ledgers"], [str(out / NEW_EXAM_LEDGER_FILE)])
        self.assertEqual(doc["inputs"]["extra_c_records"], [str(out / NEW_EXAM_RECORDS_FILE)])
        self.assertEqual(doc["inputs"]["load"]["new_exam_used"], 2)

    def test_cli_flags_are_repeatable(self):
        with tempfile.TemporaryDirectory() as d:
            ip, lp, nl, nr = bundle(d, [new_row(nid(1))], [new_rec(nid(1), mc(STEM))])
            out = Path(d) / "out"
            p = subprocess.run([sys.executable, "-I", str(CLI), "corpus", "--c-index", str(ip), "--ledger", str(lp),
                                "--out", str(out), "--extra-c-records", str(nr), "--extra-ledger", str(nl)],
                               capture_output=True, text=True)
            self.assertEqual(p.returncode, 0, p.stderr)
            self.assertIn("1 occurrences, 1 unique", p.stdout)
            self.assertIn("0 unparsed", p.stdout)
            counts = run_corpus(ip, lp, None, Path(d) / "out2")  # no files in --out: ledger only
            self.assertEqual(counts["occurrences"], 0)


class NewExamSlice(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        p = Path(self.tmp.name)
        (p / "corpus").mkdir()
        self.clusters = p / "corpus" / "clusters.json"
        self.lane = p / "lane.json"
        self.ledger = write(p / "ledger.json", {"items": []})
        ids = [nid(n) for n in range(1, 4)]
        self.ids = ids
        write(self.clusters, {"clusters": [], "roles": {i: "canonical" for i in ids}})
        write(self.lane, {"items": {}})
        self.extra = write(p / "corpus" / NEW_EXAM_LEDGER_FILE, {"items": [new_row(i) for i in ids]})

    def tearDown(self):
        self.tmp.cleanup()

    def test_slice_reads_the_new_exam_ledger_next_to_clusters(self):
        got = lane.next_slice(self.clusters, self.lane, self.ledger, "r1", now="t")
        self.assertEqual(got, self.ids)

    def test_without_the_new_exam_ledger_nothing_is_sliced(self):
        got = lane.next_slice(self.clusters, self.lane, self.ledger, "r1", now="t", extra_ledgers=[])
        self.assertEqual(got, [])

    def test_release_done_drops_claims_of_live_new_exam_rows(self):
        lane.next_slice(self.clusters, self.lane, self.ledger, "r1", now="t")
        rows = [new_row(i) for i in self.ids]
        rows[0]["bucket"] = "already_live"
        write(self.extra, {"items": rows})
        dropped = lane.release_done(lane.claims_path_for(self.lane), self.lane, self.ledger)
        self.assertEqual(dropped, [self.ids[0]])


if __name__ == "__main__":
    unittest.main()
