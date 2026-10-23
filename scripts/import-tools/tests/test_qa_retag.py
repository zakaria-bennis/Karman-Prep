"""`k qa retag` (kimport.qa_retag, qa_run.run_retag): live skill / difficulty label changes. Synthetic rows only."""

import copy
import json
import tempfile
import unittest
from pathlib import Path

from kimport import qa_retag, qa_run
from kimport.export import ExportDoc
from tests.export_fixtures import write_export

UUID = "00000000-0000-4000-8000-{:012d}"
SID = "2099-01_SYN_V1_RW_M1_Q{:02d}"
SKILLS = qa_retag.catalog()
H = "a" * 64


def raw_for(n, skill="Transitions", domain="Expression of Ideas", domain_id="expression_ideas", seal=H, lane="independent"):
    tags = {"schema_version": 1, "stable_question_id": SID.format(n), "catalog_skill_id": SKILLS[skill]["id"],
            "catalog_domain_id": domain_id, "domain_label": domain, "skill_label": skill,
            "tag_binding_manifest_sha256": H, "content_sha256": "b" * 64, "student_content_sha256": "c" * 64,
            "question_payload_sha256": seal}
    raw = {"stable_question_id": SID.format(n), "question_id": SID.format(n), "B_package_sha256": "b" * 64,
           "B_student_sha256": "c" * 64, "student_publication_allowed": True, "approved_tags": tags}
    if lane == "independent":
        raw.update(independent_D_review_sha256="d" * 64,
                   independent_D_record={"skill": skill, "domain": domain, "level": 3, "reason": "r"})
    else:
        raw["D_original_record"] = {"selectable_skill": skill}
    return raw


def row(n, level=3, **raw_kw):
    return {"id": UUID.format(n), "is_live": True, "publish_status": "publish_ready", "archived_at": None,
            "subject": "reading", "domain": "expression_ideas", "topic_cluster": "Expression of Ideas",
            "difficulty_level": level, "difficulty": qa_retag.band(level), "content_hash_v2": f"h{n}",
            "updated_at": "2099-01-01T00:00:00+00:00", "answer_format": "multiple_choice", "correct_answer": "A",
            "question_text": f"Which choice completes synthetic text {n}?", "question_type": "transition",
            "node_id": None, "display_order": 0, "hint": None, "image_url": None, "image_alt": None,
            "passage_intro": None, "passage": f"Synthetic passage {n}.", "passage_a": None, "passage_b": None,
            "figure_kind": None, "figure_table_data": None, "figure_chart_data": None, "figure_geometry_data": None,
            "figure_svg": None, "numeric_tolerance": None, "explanation_text": "", "explanation_per_choice": None,
            "desmos_strategy": None,
            "answer_choices": [{"id": f"c{n}{L}", "question_id": UUID.format(n), "letter": L, "choice_text": f"{L} {n}",
                                "choice_table_data": None} for L in "ABCD"],
            "answer_key_entries": [{"id": f"k{n}", "raw_model_response": raw_for(n, **raw_kw)}]}


def line(n, field, live, new, by="r1", at="2099-01-02T00:00:00Z", **extra):
    return {"id": UUID.format(n), "stable_question_id": SID.format(n), "field": field, "live": live, "new": new,
            "reason": "synthetic", "by": by, "at": at, **extra}


def fake_checker(items):
    out = []
    for it in items:
        raw = copy.deepcopy(it["raw_after"])
        raw["approved_tags"]["question_payload_sha256"] = "e" * 64
        out.append({"id": it["id"], "ok": True, "raw_after": raw, "seal_before": H, "seal_after": "e" * 64})
    return {"rows": out}


def plan(lines, rows, checker=fake_checker):
    for i, ln in enumerate(lines, 1):
        ln.setdefault("_line", i)
    return qa_retag.build_plan(lines, {r["id"]: r for r in rows}, SKILLS, checker)


class DecisionTest(unittest.TestCase):
    def test_taxonomy_ids_match_the_site(self):
        self.assertEqual(SKILLS["Colons and dashes introducing explanations or lists"]["id"],
                         "rw-skill-colons-and-dashes-introducing-explanations-or-lists")
        self.assertEqual(SKILLS["Area and volume"]["domain_id"], "geometry")

    def test_refusals(self):
        rows = [row(n) for n in range(1, 10)] + [row(10, lane="original")]
        res = plan([line(1, "difficulty", 3, 8), line(2, "skill", "Transitions", "Made-up skill"),
                    line(3, "skill", "Transitions", "Area and volume"),  # math skill on a reading row
                    line(4, "difficulty", 2, 4),  # live is 3
                    line(5, "difficulty", 3, 4, by="r1"), line(5, "difficulty", 3, 4, by="r2"),  # two reviewers
                    line(6, "skill", "Transitions", "Rhetorical Synthesis", domain="conventions"),
                    line(10, "skill", "Transitions", "Rhetorical Synthesis"),
                    line(11, "difficulty", 3, 4), {**line(8, "difficulty", 3, 4), "id": "2099-01_NOPE_Q01",
                                                   "stable_question_id": "2099-01_NOPE_Q01"}], rows)
        why = res["refused"]
        self.assertIn("not an integer 1 to 7", why[UUID.format(1)])
        self.assertIn("not in the site taxonomy", why[UUID.format(2)])
        self.assertIn("is a math skill", why[UUID.format(3)])
        self.assertIn("live is 3, the decision says 2", why[UUID.format(4)])
        self.assertIn("lines from more than one reviewer (r1: 4, r2: 4)", why[UUID.format(5)])
        self.assertIn("is not the domain of", why[UUID.format(6)])
        self.assertIn("2099-01_NOPE_Q01 resolves to 0 live rows", why["2099-01_NOPE_Q01"])
        self.assertIn("not an independent D review", why[UUID.format(10)])
        self.assertIn("resolves to 0 live rows", why[UUID.format(11)])
        self.assertEqual(res["items"], [])

    def test_latest_line_by_one_reviewer_wins_a_revert_drops_and_a_stable_id_resolves(self):
        res = plan([line(1, "difficulty", 3, 4, at="2099-01-02T00:00:00Z"), line(1, "difficulty", 3, 5, at="2099-01-03T00:00:00Z"),
                    line(2, "difficulty", 3, 4, by="r1"),
                    {**line(2, "difficulty", 3, 3, by="r1", at="2099-01-04T00:00:00Z"), "supersedes_earlier_r1_decision": True},
                    {**line(3, "difficulty", 3, 6, by="r2"), "id": SID.format(3)}], [row(1), row(2), row(3)])
        self.assertEqual(res["refused"], {})
        self.assertEqual([(it["id"], it["question_after"]) for it in res["items"]],
                         [(UUID.format(1), {"difficulty_level": 5, "difficulty": "advanced"}),
                          (UUID.format(3), {"difficulty_level": 6, "difficulty": "advanced"})])
        self.assertEqual([(x["id"], x["field"]) for x in res["dropped"]], [(UUID.format(2), "difficulty")])
        md = qa_retag.plan_md(res, {"decisions": "d.jsonl", "decision_lines": 5, "run": "r", "dry_passed": True},
                              "2099-01-05T00:00:00Z")
        self.assertIn("**2 label changes on 2 live questions**", md)
        self.assertIn("| difficulty | 2 |", md)
        self.assertIn("| r2 | 1 |", md)
        self.assertIn(f"| {SID.format(3)} | difficulty | 3 → 6 | r2 |", md)
        self.assertIn(f"- {SID.format(2)} (difficulty): latest line by r1", md)

    def test_plan_md_lists_skill_moves(self):
        res = plan([line(1, "skill", "Transitions", "Lists and series"), line(2, "skill", "Transitions", "Lists and series"),
                    line(3, "skill", "Transitions", "Rhetorical Synthesis")], [row(1), row(2), row(3)])
        md = qa_retag.plan_md(res, {"decisions": "d", "decision_lines": 3, "run": "r"}, "2099-01-05T00:00:00Z")
        self.assertIn("| Transitions | Lists and series | 2 |\n| Transitions | Rhetorical Synthesis | 1 |", md)

    def test_skill_change_writes_tags_review_record_domain_and_history(self):
        res = plan([line(1, "skill", "Transitions", "Lists and series"), line(1, "difficulty", 3, 2)], [row(1)])
        it, = res["items"]
        self.assertEqual(it["question_after"], {"difficulty_level": 2, "difficulty": "foundational",
                                                "domain": "conventions", "topic_cluster": "Standard English Conventions"})
        raw = it["raw_after"]
        t = raw["approved_tags"]
        self.assertEqual((t["catalog_skill_id"], t["skill_label"], t["catalog_domain_id"], t["domain_label"]),
                         ("rw-skill-lists-and-series", "Lists and series", "conventions", "Standard English Conventions"))
        self.assertEqual((raw["independent_D_record"]["skill"], raw["independent_D_record"]["by"]), ("Lists and series", "r1"))
        self.assertNotEqual(raw["independent_D_review_sha256"], "d" * 64)
        self.assertEqual([h["field"] for h in raw["label_retags"]], ["difficulty", "skill"])
        self.assertEqual(raw["label_retags"][1]["previous_independent_D_record"]["skill"], "Transitions")
        self.assertEqual(row(1)["answer_key_entries"][0]["raw_model_response"]["approved_tags"]["skill_label"], "Transitions")

    def test_app_check_refusal(self):
        res = plan([line(1, "difficulty", 3, 4)], [row(1)],
                   checker=lambda items: {"rows": [{"id": items[0]["id"], "ok": False, "error": "not served"}]})
        self.assertEqual(res["refused"], {UUID.format(1): "app check: not served"})


class SqlTest(unittest.TestCase):
    def test_sql_guards_and_exact_undo(self):
        items = plan([line(1, "skill", "Transitions", "Lists and series")], [row(1)])["items"]
        doc = ExportDoc(rows=[], exported_at="2099-01-01T00:00:00Z", row_count=5, fingerprint="f" * 32)
        sql, = qa_retag.retag_sql(items, doc)
        self.assertEqual((sql.count("BEGIN;"), sql.count("\nCOMMIT;")), (1, 1))
        self.assertIn("bank changed since export", sql)
        self.assertIn("q.difficulty_level IS DISTINCT FROM '3'", sql)
        self.assertIn("OR q.archived_at IS NOT NULL", sql)  # a guard names what would STOP the file
        self.assertIn("IF q.is_live IS DISTINCT FROM true", sql)
        self.assertIn("q.updated_at IS DISTINCT FROM '2099-01-01T00:00:00+00:00'::timestamptz", sql)
        self.assertIn("answer key evidence changed since the export", sql)
        self.assertIn("SET domain = 'conventions', topic_cluster = 'Standard English Conventions'", sql)
        self.assertNotIn("question_text", sql.split("BEGIN;", 1)[1].replace('"question_text', ""))  # only labels set
        undo, = qa_retag.restore_sql(items)
        self.assertIn("q.domain IS DISTINCT FROM 'conventions'", undo)
        self.assertIn("SET domain = 'expression_ideas', topic_cluster = 'Expression of Ideas'", undo)
        self.assertIn('"skill_label": "Transitions"', undo.split("UPDATE public.answer_key_entries", 1)[1])


    def test_large_plans_split_into_files_each_with_the_fingerprint_guard(self):
        items = plan([line(n, "difficulty", 3, 4) for n in range(1, 6)], [row(n) for n in range(1, 6)])["items"]
        doc = ExportDoc(rows=[], exported_at="t", row_count=5, fingerprint="f" * 32)
        files = qa_retag.retag_sql(items, doc, max_bytes=9000)
        self.assertGreater(len(files), 1)
        self.assertTrue(all(f.count("BEGIN;") == 1 and "bank changed since export" in f for f in files))
        self.assertEqual(sum(f.count(qa_retag._ROW_NOTE) for f in files), 5)
        self.assertTrue(all(len(f) < 9000 + 3000 for f in files))


class RunTest(unittest.TestCase):
    def deps(self, calls):
        def db(path):
            calls.append(Path(path).name)
            return [{"rows": []}]

        def exporter(out):
            write_export(Path(out), [{"id": UUID.format(1), "content_hash_v2": "h1", "publish_status": "publish_ready"}])

        return qa_run.Deps(db=db, exporter=exporter, log=lambda m: None, sleep=lambda s: None,
                           full_exporter=lambda out: Path(out).write_text(json.dumps({"rows": [row(1)]})),
                           retag_checker=lambda items, work: fake_checker(items))

    def test_dry_runs_only_the_dry_twin_and_writes_the_plan(self):
        with tempfile.TemporaryDirectory() as d:
            pipe = Path(d)
            dec = pipe / "decisions.jsonl"
            dec.write_text(json.dumps(line(1, "difficulty", 3, 4)) + "\n")
            calls = []
            res = qa_run.run_retag(pipe, str(dec), "2099-01-02T00:00:00Z", dry=True, deps=self.deps(calls))
            self.assertEqual((res["to_change"], res["result"]), (1, "dry run passed (rolled back)"))
            self.assertEqual(calls, ["retag.dryrun.sql"])
            run = pipe / "qa" / "retag-20990102T000000Z-dry"
            self.assertEqual(json.loads((run / "plan.json").read_text())["rows"][0]["columns"],
                             {"difficulty_level": 4, "difficulty": "intermediate"})
            self.assertTrue((run / "restore.sql").exists() and (run / "retag.sql").exists())
            self.assertFalse((pipe / "writer.lock").exists())
            self.assertFalse((pipe / "intents.jsonl").exists())


class RealCheckerTest(unittest.TestCase):
    def test_app_code_seals_and_reads_the_new_skill(self):
        with tempfile.TemporaryDirectory() as d:
            r = row(1)
            first = plan([line(1, "difficulty", 3, 4)], [r], checker=lambda items: qa_run.qa_retag_check(items, Path(d)))
            self.assertIn("not served by the catalog lane now", first["refused"][UUID.format(1)])  # wrong seal
            seal = qa_run.qa_retag_check([{"row": r, "question_after": {}, "raw_after": {}}], Path(d))["rows"][0]["seal_before"]
            r["answer_key_entries"][0]["raw_model_response"]["approved_tags"]["question_payload_sha256"] = seal
            res = plan([line(1, "skill", "Transitions", "Lists and series"), line(1, "difficulty", 3, 4)], [r],
                       checker=lambda items: qa_run.qa_retag_check(items, Path(d)))
            self.assertEqual(res["refused"], {})
            it, = res["items"]
            self.assertEqual(it["seal_before"], seal)
            self.assertNotEqual(it["seal_after"], seal)  # difficulty and domain are sealed
            self.assertEqual(it["raw_after"]["approved_tags"]["question_payload_sha256"], it["seal_after"])


if __name__ == "__main__":
    unittest.main()
