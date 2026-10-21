"""Bringing unread occurrences into the corpus (made-up question text only):
capture notes after the choices, wrapped choice lines, newer C text for the ledger's
B version, "_retained" capture ids, and re-read records (--extra-c-records)."""

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from kimport.corpus import REREAD_FILE, run_corpus
from kimport.corpus_load import REREAD_SCHEMA, load_corpus, parse_text
from tests.corpus_fixtures import mc

CLI = Path(__file__).resolve().parent.parent / "kimport-cli.py"
EXAM = "SYN_V1"
BOUT = "B-syn-new"


def qid(n: int) -> str:
    return f"{EXAM}_RW_M1_Q{n:02d}"


def sha(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


class Tree:
    """C output in the real layout <root>/exams/<exam>/<B output>/questions/<id>/<B version>/,
    B packages with version/teacher/source/student files, a C index and a ledger."""

    def __init__(self, root: Path):
        self.root = Path(root)
        self.index: list[dict] = []
        self.items: list[dict] = []

    def b_package(self, name: str, bver: str, key="A", png="png-1") -> Path:
        bdir = self.root / "B" / name / bver
        bdir.mkdir(parents=True, exist_ok=True)
        (bdir / "version.json").write_text(json.dumps({"final_version_sha256": bver}), encoding="utf-8")
        (bdir / "teacher.json").write_text(json.dumps({"key_answer": key, "matches_key": True}), encoding="utf-8")
        (bdir / "source.json").write_text(json.dumps({"png_sha256": png}), encoding="utf-8")
        (bdir / "student.json").write_text(json.dumps({"renderable_text": "synthetic"}), encoding="utf-8")
        return bdir

    def c_text(self, oid: str, bout: str, bver: str, text: str, bdir: Path, hash_key="corrected_text_sha256",
               student_key="student_json", bad_hash=False) -> Path:
        cdir = self.root / "C" / "exams" / EXAM / bout / "questions" / oid / bver
        cdir.mkdir(parents=True, exist_ok=True)
        (cdir / "corrected.txt").write_text(text + "\n", encoding="utf-8")
        prov = {student_key: {"path": str(bdir / "student.json")},
                hash_key: sha("tampered" if bad_hash else text + "\n")}
        (cdir / "provenance.json").write_text(json.dumps(prov), encoding="utf-8")
        return cdir

    def indexed(self, oid: str, text: str, bver="b-old", key="A", png="png-1", hash_key="c_corrected_text_sha256",
                student_key="b_final_student_text") -> Path:
        bdir = self.b_package(oid, bver, key, png)
        cdir = self.c_text(oid, "B-syn-old", bver, text, bdir, hash_key, student_key)
        self.index.append({"question_id": oid, "exam_id": EXAM, "B_final_version": bver,
                           "B_output_version": "B-syn-old", "C_output_path": str(cdir)})
        return bdir

    def ledger(self, oid: str, bver=None, png="png-1", bout=BOUT, live=()):
        self.items.append({"id": oid, "exam": EXAM, "B_output_version": bout, "B_package_sha256": bver,
                           "A_png_sha256": png, "bucket": "awaiting_evidence", "holds": [],
                           "db_live_rows": list(live), "final_category": None, "certificate": None})

    def write(self) -> tuple[Path, Path]:
        ip, lp = self.root / "index.json", self.root / "ledger.json"
        ip.write_text(json.dumps(self.index), encoding="utf-8")
        lp.write_text(json.dumps({"items": self.items}), encoding="utf-8")
        return ip, lp


def reread_file(path: Path, records: list[dict]) -> Path:
    path.write_text(json.dumps({"schema": REREAD_SCHEMA, "records": records}), encoding="utf-8")
    return path


def by_ref(recs):
    return {r.ref: r for r in recs}


STEM = "Which choice completes the text so that it conforms to the conventions of Standard English?"


class CaptureNotes(unittest.TestCase):
    def test_no_figure_and_chrome_notes_after_choices_are_dropped(self):
        base = mc(STEM)
        for tail in ("No figure or table.", "[No figures or tables.]", "Figure/table: None.", "Diagram: none.",
                     "Figure information: No figure. Blue choice labels; no marked or struck choices.",
                     "Figure/table description: No figures or tables are present.", "DI202303", "Footer: DI202303",
                     "Printed footer: DI202305",
                     "[Colored segmented bars appear beneath each choice; no choice text is struck through.]",
                     "Small multicolored horizontal bars appear beneath each choice; no text is struck through.",
                     "Visual information: Blue choice letters; nothing marked.",
                     "![Whole literal source PNG](/tmp/page.png)", "No figure.\nFooter: DI202303"):
            with self.subTest(tail=tail):
                p = parse_text(base + "\n" + tail)
                self.assertIsNotNone(p)
                self.assertEqual((p["body"], len(p["choices"])), (STEM, 4))

    def test_numeric_body_loses_trailing_no_figure_note(self):
        p = parse_text("What is the value of x?\n[Free-response answer box.]\nNo figure or table.")
        self.assertEqual((p["body"], p["choices"]), ("What is the value of x?", []))

    def test_bare_page_number_after_last_choice_is_dropped(self):
        self.assertEqual(parse_text(mc(STEM) + "\n32")["choices"][-1], ("D", "delta"))

    def test_notes_about_formatting_or_a_real_figure_are_never_dropped(self):
        for tail in ("The word “follow” in the passage is underlined.", "Film titles are italicized in the image.",
                     "Figures/tables: none. The word “display” is underlined.",
                     "Figure: A scatterplot with 10 points.", "Figure description: A bordered table with two rows.",
                     "[In A, the radical bar covers only y.]", "[Original figure and source image](/tmp/f.png)"):
            with self.subTest(tail=tail):
                self.assertIsNone(parse_text(mc(STEM) + "\n" + tail))


class WrappedChoices(unittest.TestCase):
    def test_wrapped_prose_choices_are_joined(self):
        text = (STEM + "\nA) the ball's height is 3.9 meters\nB) the ball was launched with a velocity of 1.0 meter per\n"
                "second.\nC) gamma\nD) the hypothesis about mercury\nlevels.")
        p = parse_text(text)
        self.assertEqual(p["body"], STEM)
        self.assertEqual(p["choices"], [("A", "the ball's height is 3.9 meters"),
                                        ("B", "the ball was launched with a velocity of 1.0 meter per second."),
                                        ("C", "gamma"), ("D", "the hypothesis about mercury levels.")])

    def test_wraps_that_could_be_notes_tables_or_equations_stay_unread(self):
        for d_lines in ("D) Exploiting\nSource formatting: “betraying” in the excerpt is underlined.",
                        "D) delta\nFilm titles are italicized.", "D) Table:\n   x | 5 | 10",
                        "D) m + v = 60\n0.25m + 0.45v = 39", "D) delta\n• The area below is shaded.",
                        "D) delta\nFadini's study, suggesting"):
            with self.subTest(d=d_lines):
                self.assertIsNone(parse_text(STEM + "\nA) alpha\nB) beta\nC) gamma\n" + d_lines))

    def test_out_of_order_or_repeated_letters_stay_unread(self):
        self.assertIsNone(parse_text(STEM + "\nA) alpha\nC) gamma\nmore words\nB) beta"))
        self.assertIsNone(parse_text(STEM + "\nA) alpha\nwrapped\nA) again\nB) beta"))


class NewerCText(unittest.TestCase):
    def build(self, d, newer=True, bad_hash=False):
        t = Tree(Path(d))
        t.indexed(qid(1), mc("Old wording of the stem?"), bver="b-old")
        new_b = t.b_package(qid(1) + "-new", "b-new")
        if newer:
            t.c_text(qid(1), BOUT, "b-new", mc("Current wording of the stem?"), new_b, bad_hash=bad_hash)
        t.ledger(qid(1), bver="b-new")
        return t.write()

    def test_newer_text_for_the_ledger_b_version_is_used(self):
        with tempfile.TemporaryDirectory() as d:
            st = {}
            r = by_ref(load_corpus(*self.build(d), stats=st))[qid(1)]
        self.assertEqual((r.meta["status"], r.text, r.meta["b_version"]), ("ok", "Current wording of the stem?", "b-new"))
        self.assertIn("/b-new", r.meta["c_newer_text"])
        self.assertEqual(st["newer_c_text"], 1)

    def test_without_a_verified_newer_text_it_stays_unread(self):
        for kw in ({"newer": False}, {"bad_hash": True}):
            with self.subTest(**kw), tempfile.TemporaryDirectory() as d:
                r = by_ref(load_corpus(*self.build(d, **kw)))[qid(1)]
                self.assertEqual(r.meta["reason"], "corrected_text_for_older_b_version")


class RetainedAlias(unittest.TestCase):
    def build(self, d, png="png-1", base_in_ledger=False):
        t = Tree(Path(d))
        t.indexed(qid(2), mc("Which word fits the sentence?"), bver="b-2", png="png-1")
        t.ledger(qid(2) + "_retained", bver=None, png=png)
        if base_in_ledger:
            t.ledger(qid(2), bver="b-2")
        return t.write()

    def test_retained_capture_reads_the_plain_id_text_from_the_same_page(self):
        with tempfile.TemporaryDirectory() as d:
            st = {}
            r = by_ref(load_corpus(*self.build(d), stats=st))[qid(2) + "_retained"]
        self.assertEqual((r.meta["status"], r.answer), ("ok", "alpha"))
        self.assertEqual(st["retained_alias"], 1)

    def test_other_page_or_plain_id_in_ledger_is_not_aliased(self):
        for kw in ({"png": "png-other"}, {"base_in_ledger": True}):
            with self.subTest(**kw), tempfile.TemporaryDirectory() as d:
                r = by_ref(load_corpus(*self.build(d, **kw)))[qid(2) + "_retained"]
                self.assertEqual(r.meta["reason"], "no_corrected_text")


class RereadRecords(unittest.TestCase):
    def build(self, d):
        t = Tree(Path(d))
        bdir = t.b_package(qid(3), "b-3", key="B", png="png-3")
        t.ledger(qid(3), bver="b-3", png="png-3")  # no C text at all
        t.indexed(qid(4), mc("A stem that parses?"), bver="b-4")
        t.ledger(qid(4), bver="b-4")
        bad = t.b_package(qid(5), "b-5", png="png-5")
        t.ledger(qid(5), bver="b-5", png="png-5")
        t.ledger(qid(6), bver="b-6")
        t.ledger(qid(7), bver="b-7", png="png-7")
        b7 = t.b_package(qid(7), "b-7", png="png-7")
        ip, lp = t.write()
        good = {"question_id": qid(3), "B_final_version": "b-3", "B_package_path": str(bdir),
                "source_png_sha256": "png-3", "text": mc("Read from the <u>page</u> by hand?")}
        recs = [good,
                {**good, "question_id": qid(4), "B_final_version": "b-4"},
                {"question_id": qid(5), "B_final_version": "b-5", "B_package_path": str(bad),
                 "source_png_sha256": "png-other", "text": mc("Wrong page?")},
                {"question_id": qid(6), "not_readable": "source page missing"},
                {"question_id": qid(7), "B_final_version": "b-7", "B_package_path": str(b7),
                 "source_png_sha256": "png-7", "text": STEM + "\nA) alpha\nA) twice"}]
        return ip, lp, reread_file(Path(d) / "reread.json", recs)

    def test_reread_fills_only_unread_occurrences_after_version_checks(self):
        with tempfile.TemporaryDirectory() as d:
            ip, lp, rr = self.build(d)
            st = {}
            recs = by_ref(load_corpus(ip, lp, rr, st))
        r = recs[qid(3)]
        self.assertEqual((r.meta["status"], r.text, r.answer), ("ok", "Read from the <u>page</u> by hand?", "beta"))
        self.assertEqual((r.meta["text_source"], r.meta["reread_replaces"]), ("reread", "no_corrected_text"))
        self.assertEqual(recs[qid(4)].text, "A stem that parses?")  # the C text wins when it parses
        self.assertNotIn("text_source", recs[qid(4)].meta)
        self.assertEqual(recs[qid(5)].meta["reason"], "no_corrected_text")
        self.assertEqual(recs[qid(6)].meta["reason"], "not_readable: source page missing")
        self.assertEqual(recs[qid(7)].meta["reason"], "reread_choice_parse_ambiguous")
        self.assertEqual((st["reread_used"], st["reread_unused"], st["reread_failed"]), (1, 1, 2))
        self.assertEqual(st["reread_failures"][qid(5)], "reread_source_image_differs")

    def test_reread_figure_flag_marks_a_figure_question(self):
        with tempfile.TemporaryDirectory() as d:
            t = Tree(Path(d))
            bdir = t.b_package(qid(3), "b-3", png="png-3")
            t.ledger(qid(3), bver="b-3", png="png-3")
            ip, lp = t.write()
            rr = reread_file(Path(d) / "rr.json", [{"question_id": qid(3), "B_final_version": "b-3",
                                                    "B_package_path": str(bdir), "source_png_sha256": "png-3",
                                                    "text": mc("Which value is correct?"), "figure": True}])
            r = by_ref(load_corpus(ip, lp, rr))[qid(3)]
        self.assertEqual((r.meta["status"], r.meta["reason"]), ("figure", "re-read: the question needs its figure"))

    def test_reread_for_another_b_version_is_refused(self):
        with tempfile.TemporaryDirectory() as d:
            t = Tree(Path(d))
            bdir = t.b_package(qid(3), "b-3", png="png-3")
            t.ledger(qid(3), bver="b-newer", png="png-3")
            ip, lp = t.write()
            rr = reread_file(Path(d) / "rr.json", [{"question_id": qid(3), "B_final_version": "b-3",
                                                    "B_package_path": str(bdir), "source_png_sha256": "png-3",
                                                    "text": mc("Stem?")}])
            st = {}
            r = by_ref(load_corpus(ip, lp, rr, st))[qid(3)]
        self.assertEqual(r.meta["reason"], "no_corrected_text")
        self.assertEqual(st["reread_failures"][qid(3)], "reread_for_other_b_version")

    def test_bad_reread_file_is_an_error(self):
        with tempfile.TemporaryDirectory() as d:
            t = Tree(Path(d))
            t.ledger(qid(3), bver="b-3")
            ip, lp = t.write()
            for body in ({"records": []}, {"schema": REREAD_SCHEMA, "records": [{"question_id": qid(3)}]},
                         {"schema": REREAD_SCHEMA, "records": [{"question_id": qid(3), "not_readable": "x"}] * 2}):
                with self.subTest(body=body):
                    p = Path(d) / "bad.json"
                    p.write_text(json.dumps(body), encoding="utf-8")
                    with self.assertRaises(ValueError):
                        load_corpus(ip, lp, p)

    def test_run_corpus_and_cli_use_the_reread_file(self):
        with tempfile.TemporaryDirectory() as d:
            ip, lp, rr = self.build(d)
            out = Path(d) / "out"
            out.mkdir()
            (out / REREAD_FILE).write_bytes(rr.read_bytes())
            counts = run_corpus(ip, lp, None, out)  # default: reread-records.json in --out
            doc = json.loads((out / "clusters.json").read_text(encoding="utf-8"))
            self.assertEqual(doc["inputs"]["extra_c_records"], str(out / REREAD_FILE))
            self.assertEqual(doc["inputs"]["load"]["reread_used"], 1)
            self.assertEqual(counts["unparsed"], 3)
            out2 = Path(d) / "out2"
            p = subprocess.run([sys.executable, "-I", str(CLI), "corpus", "--c-index", str(ip), "--ledger", str(lp),
                                "--out", str(out2), "--extra-c-records", str(rr)], capture_output=True, text=True)
            self.assertEqual(p.returncode, 0, p.stderr)
            self.assertIn("3 unparsed", p.stdout)
            doc2 = json.loads((out2 / "clusters.json").read_text(encoding="utf-8"))
            self.assertEqual(doc2["inputs"]["extra_c_records_sha256"], hashlib.sha256(rr.read_bytes()).hexdigest())
            counts3 = run_corpus(ip, lp, None, Path(d) / "out3")  # no file: unchanged behaviour
            self.assertEqual(counts3["unparsed"], 4)


if __name__ == "__main__":
    unittest.main()
