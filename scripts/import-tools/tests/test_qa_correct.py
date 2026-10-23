"""QA corrections in place (kimport.qa_correct): synthetic rows, no database.

The end-to-end cases run k autopilot against the FakeBank of test_autopilot,
taught to apply qa-NN.sql (turn the hidden row into the corrected private
draft, same id) and qa-rollback-NN.sql.
"""

import copy
import json
import re
from pathlib import Path

from kimport import qa_correct as qc
from kimport import qa_hide as qh
from kimport import stage as st
from kimport.export import fingerprint, read_export_doc
from kimport.sqlutil import dryrun_variant
from tests import publish_fixtures as pfx
from tests import stage_fixtures as fx
from tests.test_autopilot import _ROW, AutopilotCase, FakeBank
from tests.test_bulk import row

QA_REASON = "qa:key_wrong: printed key is B"


class QaBank(FakeBank):
    def __call__(self, path: Path):
        path = Path(path)
        m = re.match(r"qa(-rollback)?(-\d+)?\.sql$", path.name)
        if not m:
            return super().__call__(path)
        self.ran.append(path.name)
        errs = self.fail.get(path.name)
        if errs:
            raise errs.pop(0)
        prev = {p["stable_question_id"]: p for p in
                json.loads((path.parents[1] / "seal" / "run-preview.json").read_text())["rows"]}
        before = {r["snapshot"]["keys"][0]["raw_model_response"]["approved_tags"]["stable_question_id"]: r["snapshot"]
                  for r in self.readback_rows(path.parent / "hidden-readback.json")}
        for sid in _ROW.findall(path.read_text()):
            qid = before[sid]["question"]["id"]
            if m.group(1):
                self.rows[qid] = copy.deepcopy(before[sid])
                continue
            snap = fx.db_snapshot(prev[sid], 900)
            snap["question"].update(id=qid, created_at=before[sid]["question"]["created_at"],
                                    comparison_key=prev[sid]["comparison_key"])
            for c in snap["choices"] or []:
                c["question_id"] = qid
            snap["keys"][0]["question_id"] = qid
            self.rows[qid] = snap
        return []

    @staticmethod
    def readback_rows(path: Path) -> list:
        return json.loads(path.read_text())[0]["readback"]["rows"]


def hide(bank: FakeBank, qid: str, reason: str = QA_REASON) -> None:
    """What `k qa hide` does to a live row."""
    bank.rows[qid]["question"].update(archived_at="2026-10-22T21:00:00+00:00", import_flag_reason=reason,
                                      publish_status="needs_human_review", import_status="needs_review",
                                      is_live=False)


class TestQaCorrectAutopilot(AutopilotCase):
    def setUp(self):
        super().setUp()
        self.bank = QaBank(None)

    def publish_two(self):
        self.batch("syn-1", [row(1), row(2)])
        res = self.run_ap()
        self.assertEqual(res["result"], "published", res)
        return self.bank.by_stable(row(1)["stable_question_id"])

    def test_corrected_row_goes_live_in_place_and_is_recorded(self):
        qid = self.publish_two()
        hide(self.bank, qid)
        self.assertEqual(self.live(), 1)
        self.batch("syn-1-qa-1", [row(1, answer="B")])
        before = len(self.bank.rows)
        res = self.run_ap()
        self.assertEqual(res["result"], "published", res)
        self.assertEqual(len(self.bank.rows), before)  # same row, nothing inserted
        q = self.bank.rows[qid]["question"]
        self.assertEqual((q["correct_answer"], q["is_live"], q["archived_at"]), ("B", True, None))
        self.assertEqual(self.live(), 2)
        ran = self.bank.ran
        self.assertLess(ran.index("qa.dryrun.sql"), ran.index("qa.sql"))
        self.assertNotIn("qa-rollback.sql", ran)
        lines = [json.loads(x) for x in (self.pipe / "qa" / qc.CORRECTIONS).read_text().splitlines()]
        self.assertEqual(len(lines), 1)
        self.assertEqual((lines[0]["question_id"], lines[0]["stable_question_id"], lines[0]["qa_reason"],
                          lines[0]["before_correct_answer"], lines[0]["after_correct_answer"], lines[0]["run"]),
                         (qid, row(1)["stable_question_id"], QA_REASON, "A", "B", res["run"]))
        state = self.state()
        self.assertEqual(state["batches"]["syn-1-qa-1"]["status"], "published")
        self.assertTrue(state["batches"]["syn-1-qa-1"]["qa"])
        self.assertEqual(state["runs"][res["run"]]["qa_corrected"], 1)

    def test_correction_and_new_rows_in_one_run(self):
        qid = self.publish_two()
        hide(self.bank, qid)
        self.batch("syn-1-qa-1", [row(1, answer="B")])
        self.batch("syn-3", [row(5, "M1")])
        res = self.run_ap()
        self.assertEqual(res["result"], "published", res)
        self.assertEqual(self.live(), 3)
        sql = (self.pipe / res["run"] / "qa" / "qa.sql").read_text()
        self.assertIn("NOT EXISTS (SELECT 1 FROM (VALUES", sql)  # the staged row is left out by source
        self.assertIn(f"q.id <> ALL (ARRAY['{qid}']::uuid[])", sql)  # this row by id
        ran = self.bank.ran
        self.assertLess(ran.index("stage.sql"), ran.index("qa.sql"))
        self.assertEqual(self.state()["runs"][res["run"]]["qa_corrected"], 1)

    def test_unchanged_row_is_refused_and_nothing_runs(self):
        qid = self.publish_two()
        hide(self.bank, qid)
        self.batch("syn-1-qa-1", [row(1)])
        res = self.run_ap()
        self.assertEqual(res["result"], "nothing_to_stage", res)
        pre = json.loads((self.pipe / res["run"] / "qa" / "qa-precheck.json").read_text())
        self.assertIn("nothing was corrected", pre["refused"][0]["reasons"][0])
        self.assertNotIn("qa.sql", self.bank.ran)
        self.assertFalse((self.pipe / "qa" / qc.CORRECTIONS).exists())

    def test_batch_mixing_hidden_and_live_rows_is_refused_whole(self):
        qid = self.publish_two()
        hide(self.bank, qid)
        self.batch("syn-1-qa-1", [row(1, answer="B"), row(2, answer="B")])
        res = self.run_ap()
        self.assertEqual(res["result"], "nothing_to_stage", res)
        self.assertEqual(self.state()["batches"]["syn-1-qa-1"]["status"], "refused")
        self.assertIn("QA hid", self.state()["batches"]["syn-1-qa-1"]["reason"])
        self.assertFalse(any(f.startswith("qa") for f in self.bank.ran if f.endswith(".sql")
                             and "readback" not in f))

    def test_a_row_qa_did_not_hide_is_not_a_qa_correction(self):
        self.publish_two()
        self.batch("syn-1-qa-1", [row(1, answer="B")])
        res = self.run_ap()
        self.assertEqual(res["result"], "nothing_to_stage", res)
        pre = json.loads((self.pipe / res["run"] / "stage" / "precheck.json").read_text())
        self.assertTrue(any("source question already in the bank" in r for x in pre["refused"]
                            for r in x["reasons"]), pre["refused"])


class TestQaCorrectSql(AutopilotCase):
    """The generated SQL, built from a hidden row's readback."""

    def build(self, corrected: dict, snap_over=None):
        self.bank = QaBank(None)
        self.batch("syn-1", [row(1)])
        self.run_ap()
        qid = self.bank.by_stable(row(1)["stable_question_id"])
        hide(self.bank, qid)
        if snap_over:
            snap_over(self.bank.rows[qid])
        d = self.batch("syn-1-qa-1", [corrected])
        export = self.d / "export.json"
        self.bank.export(export)
        doc = read_export_doc(export)
        snaps = [copy.deepcopy(s) for s in self.bank.rows.values()]
        res = qc.build_correct([d], doc, "auto-syn", snaps, self.d / "exams",
                               rows_runner=lambda reviewed, pdf, frozen, sha: copy.deepcopy(self.docs[str(reviewed)]))
        return res, qid

    def test_sql_guards_every_other_row_and_resets_unlisted_columns(self):
        res, qid = self.build(row(1, answer="B"))
        self.assertEqual(res["refused"], {})
        sql = res["files"]["qa.sql"]
        self.assertEqual(res["files"]["qa.dryrun.sql"], dryrun_variant(sql))
        self.assertIn("FOR UPDATE", sql)
        self.assertIn("o.id<>q.id AND o.source_version IS NOT DISTINCT FROM", sql)
        self.assertIn("o.id<>q.id AND o.content_hash_v2", sql)
        self.assertIn("archived_at=DEFAULT", sql)
        self.assertIn("figure_chart_data=DEFAULT", sql)
        self.assertIn("correct_answer=r.correct_answer", sql)
        self.assertNotIn("id=DEFAULT", sql.replace("_id=DEFAULT", ""))
        self.assertNotIn("created_at=", sql)
        self.assertNotIn("is_live=", sql)
        self.assertIn("DELETE FROM public.answer_key_entries WHERE question_id=q.id;", sql)
        self.assertNotIn("INSERT INTO public.quiz_questions", sql)
        self.assertNotIn("source_assets", sql)
        # the fingerprint is over the bank without this row (it is in the export)
        rest = [r for r in read_export_doc(self.d / "export.json").rows if r["id"] != qid]
        self.assertIn(f"q.id <> ALL (ARRAY['{qid}']::uuid[])", sql)
        self.assertIn(f"IF n <> {len(rest)} OR f IS DISTINCT FROM '{fingerprint(rest)}'", sql)
        rb = res["files"]["qa-rollback.sql"]
        self.assertIn("question_payload_sha256", rb)  # only while unpublished
        self.assertIn("archived_at=r.archived_at", rb)
        self.assertEqual(res["precheck"]["corrections"][0]["question_id"], qid)
        self.assertEqual(res["preview_rows"][0]["kimport_qa"], True)
        self.assertIn("qa-readback.sql", res["files"])

    def test_source_assets_and_other_occurrence_are_refused(self):
        bad = row(1, answer="B")
        bad["source_assets"] = [{"asset_type": "question_crop"}]
        bad["question"]["source_occurrence"] = 7
        res, _ = self.build(bad)
        why = res["refused"][bad["stable_question_id"]]
        self.assertIn("source_occurrence differs from the hidden row", why)
        self.assertTrue(any("source assets" in w for w in why))
        self.assertNotIn("qa.sql", res["files"])

    def test_evidence_naming_another_stable_id_is_refused(self):
        def other(s):
            s["keys"][0]["raw_model_response"]["approved_tags"]["stable_question_id"] = "someone-else"
        res, _ = self.build(row(1, answer="B"), other)
        self.assertIn("the hidden row's evidence names another stable question id",
                      res["refused"][row(1)["stable_question_id"]])

    def test_duplicate_of_another_bank_row_is_refused(self):
        # the corrected text is another bank row's text
        self.bank = QaBank(None)
        self.batch("syn-1", [row(1), row(2)])
        self.run_ap()
        qid = self.bank.by_stable(row(1)["stable_question_id"])
        hide(self.bank, qid)
        dup = row(1, question_text=row(2)["question"]["question_text"])
        d = self.batch("syn-1-qa-1", [dup])
        export = self.d / "export.json"
        self.bank.export(export)
        res = qc.build_correct([d], read_export_doc(export), "auto-syn",
                               [copy.deepcopy(s) for s in self.bank.rows.values()], self.d / "exams",
                               rows_runner=lambda r, p, f, s: copy.deepcopy(self.docs[str(r)]))
        self.assertTrue(res["refused"][dup["stable_question_id"]])
        self.assertNotIn("qa.sql", res["files"])


class TestQaHidden(AutopilotCase):
    def test_is_qa_hidden_needs_every_mark(self):
        snap = fx.db_snapshot(st.preview_row(row(1), None), 1)
        q = snap["question"]
        self.assertFalse(qc.is_qa_hidden(q))  # a private draft, not archived
        q.update(archived_at="2026-10-22T21:00:00+00:00", import_flag_reason=QA_REASON)
        self.assertTrue(qc.is_qa_hidden(q))
        self.assertTrue(qc.is_qa_hidden(pfx.export_row(snap)))
        self.assertFalse(qc.is_qa_hidden({**q, "import_flag_reason": "Synthetic private draft"}))
        self.assertFalse(qc.is_qa_hidden({**q, "publish_status": "publish_ready"}))

    def test_record_corrections_appends_published_rows_only(self):
        qa_dir = self.d / "qa"
        c = [{"question_id": pfx.uid(1), "stable_question_id": "a"}, {"question_id": pfx.uid(2), "stable_question_id": "b"}]
        self.assertEqual(qc.record_corrections(qa_dir, c, {"a"}, "auto-x", "2026-10-22T00:00:00Z"), 1)
        self.assertEqual(qc.record_corrections(qa_dir, c, set(), "auto-y", "2026-10-22T00:00:01Z"), 0)
        lines = (qa_dir / qc.CORRECTIONS).read_text().splitlines()
        self.assertEqual([json.loads(x)["stable_question_id"] for x in lines], ["a"])

    def test_a_corrected_row_leaves_the_hidden_list_and_restore_sql(self):
        qa_dir = self.d / "qa"
        qa_dir.mkdir()
        hid = [{"id": pfx.uid(n), "reason": QA_REASON, "label": "key_wrong", "at": "2026-10-22T21:00:00Z",
                "run": "hide-1", "content_hash_v2": pfx.hexn(n, 1), "previous_publish_status": "publish_ready",
                "previous_import_status": "ok", "previous_import_flag_reason": None, "previous_archived_at": None}
               for n in (1, 2)]
        qh.append_log(qa_dir / "hidden.jsonl", hid)
        qc.record_corrections(qa_dir, [{"question_id": pfx.uid(1), "stable_question_id": "a"}], {"a"}, "auto-x",
                              "2026-10-23T01:00:00Z")
        self.assertEqual(set(qh.currently_hidden(qa_dir)), {pfx.uid(2)})
        restore = (qa_dir / "restore.sql").read_text()
        self.assertIn(pfx.uid(2), restore)
        self.assertNotIn(pfx.uid(1), restore)
