"""`k figures publish-specs` and `k figures convert-live` (kimport.figure_publish, kimport.figure_live).
Synthetic rows only; the engine and app checks are faked except in RealSealTest."""

import copy
import json
import tempfile
import unittest
from pathlib import Path

from kimport import figure_gate as fg
from kimport import figure_live as fl
from kimport import figure_publish as fp
from kimport import qa_run
from kimport.export import ExportDoc, fingerprint
from tests.export_fixtures import write_export
from tests.test_qa_retag import SID, UUID, row as retag_row

NOW = "2099-01-02T00:00:00Z"
TABLE = {"header_row": ["x", "y"], "rows": [["1", "2"], ["3", "4"]]}


def spec(n=1, kind="geometry"):
    return {"version": "figure-spec/1", "type": kind, "parts": [{"kind": "point", "id": f"P{n}", "at": [n, n]}],
            "labels": [{"text": f"P{n}", "on": f"P{n}"}]}


def table_spec(table=TABLE):
    return {"version": "figure-spec/1", "type": "table",
            "parts": [{"kind": "table", "id": "t1", "rows": table["rows"], "header": table["header_row"]}], "labels": []}


def live(n, **kw):
    r = retag_row(n)
    r.update(import_status="ok", comparison_key=None, figure_spec=None)
    for c in r["answer_choices"]:
        c["choice_figure_spec"] = None
    r.update(kw)
    return r


def verdict_file(folder: Path, sid: str, figure_spec, choices=None, verdict="match", original=b"\x89PNG syn") -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    (folder / fg.ORIGINAL_FILE).write_bytes(original)
    doc = {"schema": fg.VERDICT_SCHEMA, "verdict": verdict, "occurrence_id": sid,
           "figure_sha256": fg.spec_sha256(figure_spec, choices or {}),
           "original_sha256": fg.file_sha256(folder / fg.ORIGINAL_FILE), "reviewer": "v1", "at": NOW}
    (folder / fg.VERDICT_FILE).write_text(json.dumps(doc))
    return folder / fg.VERDICT_FILE


def line(n, figure_spec, folder: Path | None = None, **kw):
    d = {"question_id": UUID.format(n), "stable_question_id": SID.format(n), "kind": "figure",
         "figure_spec": figure_spec, "check_ok": True, "_line": n}
    if isinstance(figure_spec, list):
        d["transcribed_labels"] = [[f"P{k}"] for k in range(len(figure_spec))]
    elif figure_spec is not None:
        d["transcribed_labels"] = ["P1"]
    if folder is not None:
        d["visual_verdict_path"] = str(verdict_file(folder, SID.format(n), figure_spec, kw.get("choice_specs")))
    d.update(kw)
    return d


class FakeDeps:
    """The four checks, passing unless told otherwise; records what they saw."""

    def __init__(self, issues=None, draws=None, seal=None, convert=None):
        self.issues, self.draw_err, self.seal_err, self.convert = issues or {}, draws or {}, seal or {}, convert or {}
        self.checked = []

    def spec_checker(self, lines):
        out = {}
        for d in lines:
            self.checked.append(d["question_id"])
            figs = fp.figures_of(d.get("figure_spec"))
            sampled = [{**f, "sampled": True} for f in figs]
            out[d["question_id"]] = {"ok": d["question_id"] not in self.issues, "issues": self.issues.get(
                d["question_id"], []), "figures": sampled,
                "choices": {x: {**s, "sampled": True} for x, s in (d.get("choice_specs") or {}).items()}}
        return out

    def converter(self, rows):
        return {r["id"]: self.convert.get(r["id"], {"ok": False, "error": "nothing to convert"}) for r in rows}

    def draws(self, items):
        return {it["id"]: {"ok": it["id"] not in self.draw_err, "error": self.draw_err.get(it["id"])} for it in items}

    def sealer(self, items):
        out = []
        for it in items:
            raw = copy.deepcopy(it["raw_after"])
            raw["approved_tags"]["question_payload_sha256"] = "e" * 64
            ok = it["id"] not in self.seal_err
            out.append({"id": it["id"], "ok": ok, "error": self.seal_err.get(it["id"]), "raw_after": raw,
                        "seal_before": "a" * 64, "seal_after": "e" * 64, "served": "served"})
        return {"rows": out}


def plan(lines, rows, deps=None):
    return fp.build_plan(lines, {r["id"]: r for r in rows}, deps or FakeDeps(), NOW, "figure-specs-test")


def doc_of(rows):
    slim = [{k: r.get(k) for k in ("id", "content_hash_v2", "publish_status", "import_status", "comparison_key",
                                   "archived_at")} for r in rows]
    return ExportDoc(rows=slim, exported_at="2099-01-01T00:00:00Z", row_count=len(slim), fingerprint=fingerprint(slim))


class RefusalTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def v(self, n):
        return self.d / f"v{n}"

    def test_every_refusal(self):
        rows = [live(n) for n in range(1, 16)]
        rows[1]["is_live"] = False
        rows[2]["archived_at"] = "2099-01-01T00:00:00+00:00"
        other = verdict_file(self.d / "other", SID.format(9), spec(9))  # another question's verdict
        mismatch = verdict_file(self.d / "mm", SID.format(7), spec(7), verdict="mismatch")
        stale = verdict_file(self.d / "stale", SID.format(8), spec(99))  # judged other specs
        lines = [
            line(1, spec(), self.v(1), check_ok=False),                       # its check-spec was not clean
            line(2, spec(), self.v(2)),                                       # not live
            line(3, spec(), self.v(3)),                                       # archived
            line(4, spec(), self.v(4), kind="figure", visual_verdict="mechanical"),  # mechanical figure
            {**line(5, spec()), "visual_verdict_path": None},                 # no verdict
            line(6, spec(), visual_verdict_path=str(other)),                  # verdict for another question
            line(7, spec(), visual_verdict_path=str(mismatch)),               # not "match"
            line(8, spec(), visual_verdict_path=str(stale)),                  # other specs
            line(9, spec(), self.v(9), stable_question_id=SID.format(42)),    # not the row's stable id
            line(10, None, self.v(10), choice_specs={"E": spec()}, choice_labels={"E": []}),  # bad letter
            line(11, spec(), self.v(11)),                                     # check-spec issues now
            line(12, spec(), self.v(12)),                                     # the screen would not draw it
            line(13, spec(), self.v(13)),                                     # the app check refuses
            line(14, spec(), self.v(14)), line(14, spec(2), self.v(140)),     # two lines for one question
            line(15, [spec(1), spec(2)], self.v(15), transcribed_labels=[["P1"]]),  # list without its labels
            line(16, spec(), self.v(16)),                                     # not in the export
        ]
        deps = FakeDeps(issues={UUID.format(11): ["clipped: off the edge"]}, draws={UUID.format(12): "legacy"},
                        seal={UUID.format(13): "the live row's payload seal does not match it now"})
        res = plan(lines, rows, deps)
        r = {int(k[-2:]) if k.startswith("0000") else k: v for k, v in res["refused"].items()}
        self.assertEqual(res["items"], [])
        self.assertIn("check_ok is not true", r[1])
        self.assertEqual(r[2], "not live")
        self.assertEqual(r[3], "not live")
        self.assertIn("mechanical is only for table and chart", r[4])
        self.assertIn("visual_verdict_path missing", r[5])
        self.assertIn("names", r[6])
        self.assertIn("'mismatch', not 'match'", r[7])
        self.assertIn("judged other specs", r[8])
        self.assertIn("is not the row's", r[9])
        self.assertIn("choice_specs must map A-D", r[10])
        self.assertIn("check-spec: clipped", r[11])
        self.assertIn("would not draw it: legacy", r[12])
        self.assertIn("app check: the live row's payload seal", r[13])
        self.assertIn("2 lines for one question", r[14])
        self.assertIn("one list of texts per figure", r[15])
        self.assertIn("not in the live export", r[16])
        self.assertNotIn(UUID.format(11), deps.checked[:0])  # checks ran only on lines that got that far
        self.assertNotIn(UUID.format(2), deps.checked)

    def test_mechanical_only_for_the_engines_own_conversion(self):
        rows = [live(1, figure_kind="table", figure_table_data=TABLE), live(2, figure_kind="table",
                                                                          figure_table_data=TABLE)]
        conv = {UUID.format(n): {"ok": True, "kind": "table", "figure_spec": table_spec(), "choice_specs": {}}
                for n in (1, 2)}
        good = line(1, table_spec(), kind="table", visual_verdict="mechanical", transcribed_labels=[])
        edited = line(2, {**table_spec(), "title": "Edited"}, kind="table", visual_verdict="mechanical",
                      transcribed_labels=[])
        res = plan([good, edited], rows, FakeDeps(convert=conv))
        self.assertEqual([it["id"] for it in res["items"]], [UUID.format(1)])
        self.assertIn("not the engine's conversion", res["refused"][UUID.format(2)])
        self.assertEqual(res["items"][0]["verdict"], "mechanical")
        chart = line(1, table_spec(), kind="chart", visual_verdict="mechanical", transcribed_labels=[])
        self.assertIn("live data is a table", plan([chart], rows[:1], FakeDeps(convert=conv))["refused"][UUID.format(1)])

    def test_unchanged_rows_are_skipped(self):
        r = live(1)
        r["figure_spec"] = {**spec(), "sampled": True}
        res = plan([line(1, spec(), self.v(1))], [r])
        self.assertEqual((res["items"], res["unchanged"]), ([], [UUID.format(1)]))


class ListShapeTest(unittest.TestCase):
    def test_a_figure_list_is_checked_figure_by_figure_and_stored_in_order(self):
        with tempfile.TemporaryDirectory() as d:
            figs = [spec(1), spec(2, "table")]
            ln = line(1, figs, Path(d) / "v", choice_specs={"A": spec(3)}, choice_labels={"A": ["P3"]})
            jobs = fl._jobs(ln)
            self.assertEqual([w for w, _ in jobs], ["figure 0", "figure 1", "choices"])
            self.assertEqual(jobs[1][1], {"figure_spec": figs[1], "transcribed_labels": ["P1"]})
            seen = []

            def checker(path):
                doc = json.loads(Path(path).read_text())
                seen.append(doc)
                if "figure_spec" in doc:
                    return {"ok": True, "issues": [], "spec": {**doc["figure_spec"], "sampled": True}, "choices": []}
                return {"ok": True, "issues": [], "spec": None,
                        "choices": [{"letter": c["letter"], "ok": True, "issues": [], "spec": c["choice_figure_spec"]}
                                    for c in doc["answer_choices"]]}

            res = fl.spec_checks([ln], Path(d), checker=checker, workers=1)[UUID.format(1)]
            self.assertTrue(res["ok"])
            self.assertEqual([f["parts"][0]["id"] for f in res["figures"]], ["P1", "P2"])
            self.assertEqual(sorted(res["choices"]), ["A"])
            p = plan([ln], [live(1)])
            it, = p["items"]
            self.assertIsInstance(it["figure_spec"], list)
            self.assertEqual(len(it["figure_spec"]), 2)
            sql, = fp.publish_sql(p["items"], doc_of([live(1)]))
            self.assertIn('SET figure_spec = \'[{"labels"', sql)
            self.assertEqual(fp.plan_doc(p, {})["rows"][0]["figures"], 2)

    def test_a_failing_figure_fails_the_line(self):
        with tempfile.TemporaryDirectory() as d:
            ln = line(1, [spec(1), spec(2)], Path(d) / "v")

            def checker(path):
                doc = json.loads(Path(path).read_text())
                bad = doc["figure_spec"]["parts"][0]["id"] == "P2"
                return {"ok": not bad, "issues": [{"code": "clipped", "detail": "edge"}] if bad else [],
                        "spec": doc["figure_spec"], "choices": []}

            res = fl.spec_checks([ln], Path(d), checker=checker, workers=2)[UUID.format(1)]
            self.assertFalse(res["ok"])
            self.assertEqual(res["issues"], ["figure 1: clipped: edge"])

    def test_the_verdict_binds_the_whole_list(self):
        self.assertNotEqual(fg.spec_sha256([spec(1), spec(2)]), fg.spec_sha256([spec(2), spec(1)]))
        self.assertNotEqual(fg.spec_sha256(spec(1)), fg.spec_sha256([spec(1)]))
        self.assertEqual(fg.spec_sha256(spec(1), {"A": None}), fg.spec_sha256(spec(1)))


class SqlTest(unittest.TestCase):
    def items(self, **kw):
        with tempfile.TemporaryDirectory() as d:
            rows = [live(1, figure_kind="table", figure_table_data=TABLE)]
            res = plan([line(1, spec(), Path(d) / "v", choice_specs={"B": spec(2)}, choice_labels={"B": ["P2"]})],
                       rows)
        return res["items"], rows

    def test_guards_write_only_the_specs_and_an_exact_undo(self):
        items, rows = self.items()
        sql, = fp.publish_sql(items, doc_of(rows))
        self.assertEqual((sql.count("BEGIN;"), sql.count("\nCOMMIT;")), (1, 1))
        self.assertIn("bank changed since export", sql)
        self.assertIn("coalesce(q.figure_spec <> 'null'::jsonb, false)", sql)  # it had none (NULL or JSON null)
        self.assertIn('q.figure_table_data IS DISTINCT FROM \'{"header_row":["x","y"],', sql)  # old fields guarded
        self.assertIn("q.figure_kind IS DISTINCT FROM 'table'", sql)
        self.assertIn("c.letter = 'B') <> 'null'::jsonb, false)", sql)
        self.assertIn("answer key evidence changed since the export", sql)
        self.assertIn("UPDATE public.quiz_questions SET figure_spec = '{", sql)
        self.assertIn("SET choice_figure_spec = '{", sql)
        self.assertNotIn("figure_table_data =", sql)
        self.assertNotIn("content_hash_v2 =", sql)
        self.assertIn('"figure_spec_publications"', sql)
        undo, = fp.restore_sql(items)
        self.assertIn("SET figure_spec = NULL", undo)
        self.assertIn("SET choice_figure_spec = NULL", undo)
        self.assertNotIn("q.updated_at", undo)
        self.assertIn('"figure_spec_publications"', undo.split("NOT EXISTS", 1)[1].split("THEN", 1)[0])
        self.assertNotIn("figure_spec_publications", undo.split("UPDATE public.answer_key_entries", 1)[1])

    def test_expected_readback(self):
        items, _ = self.items()
        after, before = fp.expected(items, True)[UUID.format(1)], fp.expected(items, False)[UUID.format(1)]
        self.assertTrue(after["figure_spec"]["sampled"])
        self.assertIsNone(before["figure_spec"])
        self.assertEqual(sorted(after["choice_figure_specs"]), list("ABCD"))
        self.assertTrue(after["choice_figure_specs"]["B"]["sampled"])
        self.assertIsNone(before["choice_figure_specs"]["B"])
        entry = after["raw_model_response"]["figure_spec_publications"][-1]
        self.assertEqual((entry["verdict"], entry["set"]), ("match", ["figure_spec", "choice B"]))
        self.assertEqual(entry["previous_question_payload_sha256"], "a" * 64)


class RunTest(unittest.TestCase):
    def test_dry_runs_only_the_dry_twins(self):
        with tempfile.TemporaryDirectory() as d:
            pipe = Path(d)
            rows = [live(1)]
            lines = pipe / "lines.jsonl"
            ln = line(1, spec(), pipe / "v")
            ln.pop("_line")
            lines.write_text(json.dumps(ln) + "\n")
            calls = []
            fake = FakeDeps()
            deps = fl.Deps(db=lambda p: calls.append(Path(p).name) or [{"rows": []}], log=lambda m: None,
                           sleep=lambda s: None,
                           exporter=lambda out: write_export(Path(out), [{k: rows[0][k] for k in (
                               "id", "content_hash_v2", "publish_status", "import_status", "comparison_key")}]),
                           full_exporter=lambda out: Path(out).write_text(json.dumps({"rows": rows})),
                           spec_checker=lambda ls, w: fake.spec_checker(ls), converter=lambda rs, w: fake.converter(rs),
                           draws=lambda its, w: fake.draws(its), sealer=lambda its, w: fake.sealer(its))
            res = fl.run_publish_specs(pipe, str(lines), NOW, dry=True, deps=deps)
            self.assertEqual((res["to_change"], res["result"]), (1, "dry run passed (rolled back)"))
            self.assertEqual(calls, ["publish-specs.dryrun.sql"])
            run = pipe / "qa" / "figure-specs-20990102T000000Z-dry"
            for f in ("plan.json", "publish-specs.sql", "restore.sql", "readback.sql"):
                self.assertTrue((run / f).exists(), f)
            self.assertTrue(json.loads((run / "plan.json").read_text())["dry_passed"])
            self.assertFalse((pipe / "writer.lock").exists())
            self.assertFalse((pipe / "intents.jsonl").exists())


class ConvertTest(unittest.TestCase):
    def test_lines_for_live_tables_and_their_refusals(self):
        rows = {r["id"]: r for r in [
            live(1, figure_kind="table", figure_table_data=TABLE),
            live(2, figure_kind="table", figure_table_data=TABLE, figure_spec=spec()),  # already a spec
            live(3, figure_kind="table", figure_table_data=TABLE),                      # check issue
            live(4, figure_kind="chart", figure_chart_data={"kind": "line_graph"}),     # a chart, not asked
            live(5, figure_kind="table", figure_table_data=TABLE, is_live=False),       # not live
            live(6, figure_kind="image", figure_table_data=TABLE)]}                     # conversion refuses
        rows[UUID.format(6)]["answer_choices"][0]["choice_table_data"] = TABLE
        conv = {UUID.format(n): {"ok": True, "kind": "table", "figure_spec": table_spec(), "choice_specs": {},
                                 "transcribed_labels": ["x", "y", "1", "2", "3", "4"], "choice_labels": {}}
                for n in (1, 3)}
        conv[UUID.format(6)] = {"ok": False, "error": "figure_table_data is set but figure_kind is image"}
        fake = FakeDeps(convert=conv, issues={UUID.format(3): ["figure: missing_label: x"]})
        deps = fl.Deps(spec_checker=lambda ls, w: fake.spec_checker(ls), converter=lambda rs, w: fake.converter(rs))
        res = fl.convert_lines(rows, "table", deps, Path("."))
        self.assertEqual([x["question_id"] for x in res["lines"]], [UUID.format(1)])
        got = res["lines"][0]
        self.assertEqual((got["visual_verdict"], got["check_ok"], got["kind"]), ("mechanical", True, "table"))
        self.assertEqual(got["figure_sha256"], fg.spec_sha256(table_spec(), {}))
        self.assertIsNone(fp.line_problem({**got, "_line": 1}))
        why = {x["question_id"]: x["why"] for x in res["refused"]}
        self.assertIn("already has a figure_spec", why[UUID.format(2)])
        self.assertIn("check-spec", why[UUID.format(3)])
        self.assertIn("figure_kind is image", why[UUID.format(6)])
        self.assertEqual(res["counts"], {"live_rows_with_data": 4, "converted_clean": 1, "refused": 3})
        with self.assertRaises(ValueError):
            fl.convert_lines(rows, "geometry", deps, Path("."))


class RealSealTest(unittest.TestCase):
    """ts/figure-seal-check.ts: the seal is the app's own catalogQuestionPayloadHash."""

    def app_seal(self, r, work):
        return qa_run.qa_retag_check([{"row": r, "question_after": {}, "raw_after": {}}], work)["rows"][0]["seal_before"]

    def test_seal_matches_the_app_and_choice_specs_only_count_when_set(self):
        with tempfile.TemporaryDirectory() as d:
            work = Path(d)
            r = live(1)
            r["answer_key_entries"][0]["raw_model_response"]["approved_tags"]["question_payload_sha256"] = \
                self.app_seal(r, work)
            bare = copy.deepcopy(r)
            for c in bare["answer_choices"]:
                del c["choice_figure_spec"]
            del bare["figure_spec"]
            self.assertEqual(self.app_seal(bare, work), self.app_seal(r, work))  # null specs seal as before
            for figure in (spec(), [spec(1), spec(2)]):
                item = {"id": r["id"], "row": r, "figure_spec": figure, "choice_specs": {"C": spec(3)},
                        "raw_after": fp.history_raw(r, line(1, figure), figure, {"C": spec(3)}, NOW, "t")}
                c, = fl.app_seal([item], work)["rows"]
                self.assertTrue(c["ok"], c.get("error"))
                after = copy.deepcopy(r)
                after["figure_spec"] = figure
                after["answer_choices"][2]["choice_figure_spec"] = spec(3)
                self.assertEqual(c["seal_after"], self.app_seal(after, work))
                self.assertNotEqual(c["seal_after"], c["seal_before"])
                self.assertEqual(c["raw_after"]["approved_tags"]["question_payload_sha256"], c["seal_after"])
                only_q = copy.deepcopy(after)
                only_q["answer_choices"][2]["choice_figure_spec"] = None
                self.assertNotEqual(self.app_seal(only_q, work), c["seal_after"])  # the choice spec is sealed

    def test_a_row_not_served_as_it_is_is_refused(self):
        with tempfile.TemporaryDirectory() as d:
            r = live(1)  # its stored seal is "a" * 64, not the row's
            item = {"id": r["id"], "row": r, "figure_spec": spec(), "choice_specs": {},
                    "raw_after": copy.deepcopy(r["answer_key_entries"][0]["raw_model_response"])}
            c, = fl.app_seal([item], Path(d))["rows"]
            self.assertFalse(c["ok"])
            self.assertIn("not served as it is", c["error"])


if __name__ == "__main__":
    unittest.main()
