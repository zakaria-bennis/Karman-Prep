"""A QA correction whose fixed text now equals its QA-hidden duplicate twin (kimport.qa_correct),
and `k qa restore` refusing that twin while the corrected copy is live (kimport.qa_run). Synthetic
rows, no database."""

import copy
import json

from kimport import qa_correct as qc
from kimport import publish, qa_run
from kimport.export import read_export_doc
from kimport.sweep import UNPUBLISHED_IMPORT, UNPUBLISHED_STATUS
from tests.test_autopilot import AutopilotCase
from tests.test_bulk import row
from tests.test_qa_correct import QA_REASON, QaBank, hide

TWIN_REASON = "qa:audit: Same text and choices, both key A; b flagged"


class TwinCase(AutopilotCase):
    def two(self, twin_state="hidden"):
        """row(1) and row(2) published; row(1) QA-hidden; row(2), its twin, in `twin_state`."""
        self.bank = QaBank(None)
        self.batch("syn-1", [row(1), row(2), row(3)])
        self.assertEqual(self.run_ap()["result"], "published")
        qid = self.bank.by_stable(row(1)["stable_question_id"])
        twin = self.bank.by_stable(row(2)["stable_question_id"])
        canonical = self.bank.by_stable(row(3)["stable_question_id"])  # the sweep kept this one
        hide(self.bank, qid)
        if twin_state == "hidden":
            hide(self.bank, twin, TWIN_REASON)
        elif twin_state.startswith("swept"):  # un-published by the sweep: not archived, not a qa: reason
            self.bank.rows[twin]["question"].update(import_flag_reason=f"duplicate of {canonical}; un-published by sweep",
                                                    publish_status="needs_human_review", import_status="needs_review",
                                                    is_live=False)
            if twin_state == "swept":  # its group has no live row: the canonical was hidden by QA too
                hide(self.bank, canonical, TWIN_REASON)
        self.canonical = canonical
        return qid, twin

    def correct(self, hidden_ids=frozenset()):
        """A correction of row(1) whose text is now row(2)'s text."""
        dup = row(1, question_text=row(2)["question"]["question_text"])
        d = self.batch("syn-1-qa-1", [dup])
        self.bank.export(self.d / "export.json")
        res = qc.build_correct([d], read_export_doc(self.d / "export.json"), "auto-syn",
                               [copy.deepcopy(s) for s in self.bank.rows.values()], self.d / "exams",
                               rows_runner=lambda r, p, f, s, **kw: copy.deepcopy(self.docs[str(r)]),
                               hidden_ids=frozenset(hidden_ids))
        return res, dup["stable_question_id"]

    def log_hidden(self, *pairs):
        (self.pipe / "qa").mkdir(parents=True, exist_ok=True)
        (self.pipe / "qa" / "hidden.jsonl").write_text("".join(  # what k qa hide records
            json.dumps({"id": i, "reason": r, "at": "2026-10-22T21:00:00Z", "label": "audit", "run": "hide-1",
                        "content_hash_v2": self.bank.rows[i]["question"]["content_hash_v2"],
                        "previous_publish_status": "publish_ready", "previous_import_status": "imported",
                        "previous_import_flag_reason": None, "previous_archived_at": None}) + "\n"
            for i, r in pairs))

    def run_correction(self):
        self.batch("syn-1-qa-1", [row(1, question_text=row(2)["question"]["question_text"])])
        res = self.run_ap()
        self.assertEqual(res["result"], "published", res)
        return (self.pipe / res["run"] / "publish" / "publish.sql").read_text(), json.loads(
            (self.pipe / res["run"] / "publish" / "precheck.json").read_text())


class TestHiddenTwin(TwinCase):
    def test_a_qa_hidden_twin_does_not_block_the_correction(self):
        qid, twin = self.two()
        res, sid = self.correct({qid, twin})
        self.assertEqual(res["refused"], {})
        self.assertEqual(res["precheck"]["hidden_twins_allowed"], {sid: {twin: {"kind": "qa"}}})
        sql = res["files"]["qa.sql"]
        # the guard lets exactly the twin through, and only while it is still QA-hidden and not live
        self.assertIn(f"AND NOT ((o.id='{twin}'::uuid AND o.archived_at IS NOT NULL AND o.import_flag_reason LIKE"
                      " 'qa:%' AND o.publish_status='needs_human_review' AND o.import_status='needs_review'"
                      " AND o.is_live IS NOT TRUE))", sql)
        self.assertEqual(sql.count(f"'{twin}'::uuid"), 3)  # the hash, comparison key and text guards
        self.assertIn("THEN RAISE EXCEPTION 'normalized question text already in the bank", sql)

    def test_any_twin_that_is_not_live_does_not_block(self):
        # not in qa/hidden.jsonl (an old draft, "No answer key entry", "Certified duplicate of"): not live is enough
        qid, twin = self.two()
        res, sid = self.correct({qid})
        self.assertEqual(res["refused"], {})
        self.assertEqual(res["precheck"]["hidden_twins_allowed"], {sid: {twin: {"kind": "not_live"}}})
        sql = res["files"]["qa.sql"]
        self.assertIn(f"AND NOT ((o.id='{twin}'::uuid AND NOT (o.is_live IS TRUE AND o.archived_at IS NULL AND "
                      "o.publish_status IN ('publish_ready','publish_ready_with_verified_repair'))))", sql)
        # is_live set but not publish_ready (students cannot see it): not live either
        self.bank.rows[twin]["question"].update(is_live=True, archived_at=None, import_flag_reason=None)
        res, sid = self.correct({qid})
        self.assertEqual(res["refused"], {})
        self.bank.rows[twin]["question"].update(import_flag_reason="Certified duplicate of x", archived_at=None)
        res, sid = self.correct({qid})
        self.assertEqual(res["refused"], {})

    def test_a_retried_batch_takes_only_its_rows_still_hidden(self):
        self.bank = QaBank(None)
        self.batch("syn-1", [row(1), row(2), row(3)])
        self.assertEqual(self.run_ap()["result"], "published")
        q1, q2, q3 = (self.bank.by_stable(row(n)["stable_question_id"]) for n in (1, 2, 3))
        hide(self.bank, q1)
        hide(self.bank, q3)
        self.batch("syn-1-qa-1", [row(1, answer="B"), row(3, question_text=row(2)["question"]["question_text"])])
        first = self.run_ap()  # row 3's text is live row 2's: refused; row 1 goes through
        self.assertEqual(first["result"], "published", first)
        self.assertTrue(self.bank.rows[q1]["question"]["is_live"])
        self.assertFalse(self.bank.rows[q3]["question"]["is_live"])
        self.bank.rows[q2]["question"].update(is_live=False, publish_status="needs_human_review")  # row 2 taken off
        res = self.run_ap(retry=("syn-1-qa-1",))
        self.assertEqual(res["result"], "published", res)
        self.assertTrue(self.bank.rows[q3]["question"]["is_live"])
        pre = json.loads((self.pipe / res["run"] / "qa" / "qa-precheck.json").read_text())
        self.assertEqual(pre["already_corrected"], {row(1)["stable_question_id"]: q1})
        self.assertEqual(pre["refused"], [])
        lines = [json.loads(x) for x in (self.pipe / "qa" / qc.CORRECTIONS).read_text().splitlines()]
        self.assertEqual([x["question_id"] for x in lines], [q1, q3])

    def test_a_later_publish_of_the_blocking_row_is_refused_while_the_corrected_copy_is_live(self):
        qid, twin = self.two()
        self.log_hidden((qid, QA_REASON))  # the twin is not in qa/hidden.jsonl: a "not_live" twin
        # the corrected row is now the twin's question exactly (its text and its choices)
        self.batch("syn-1-qa-1", [row(1, question_text=row(2)["question"]["question_text"],
                                      choices={L: f"{w} 2" for L, w in zip("ABCD", ("first", "second", "third", "fourth"))})])
        self.assertEqual(self.run_ap()["result"], "published")
        self.assertTrue(self.bank.rows[qid]["question"]["is_live"])
        self.bank.export(self.d / "after.json")
        doc = read_export_doc(self.d / "after.json")
        snap = copy.deepcopy(self.bank.rows[twin])
        self.assertEqual(publish._live_duplicates([{"id": twin, "snap": snap}], doc.rows),
                         [f"{twin} duplicate: same question as live {qid}"])

    def blocked(self, state):
        qid, twin = self.two(state)
        res, sid = self.correct({qid, twin})  # listed, but not QA-hidden in the bank
        self.assertTrue(any("already in the bank" in w for w in res["refused"][sid]), res["refused"])
        self.assertNotIn("qa.sql", res["files"])

    def test_a_live_twin_still_blocks(self):
        self.blocked("live")

    def test_a_twin_the_sweep_unpublished_does_not_block_when_its_group_has_no_live_row(self):
        qid, twin = self.two("swept")
        res, sid = self.correct({qid, self.canonical})  # the sweep's twin is not in qa/hidden.jsonl
        self.assertEqual(res["refused"], {})
        self.assertEqual(res["precheck"]["hidden_twins_allowed"], {sid: {twin: {"kind": "sweep", "canonical": self.canonical,
                                                                       "reason": f"duplicate of {self.canonical}; un-published by sweep"}}})
        sql = res["files"]["qa.sql"]
        reason = f"duplicate of {self.canonical}; un-published by sweep"
        self.assertIn(f"(o.id='{twin}'::uuid AND o.archived_at IS NULL AND o.import_flag_reason='{reason}'"
                      " AND o.publish_status='needs_human_review' AND o.import_status='needs_review'"
                      " AND o.is_live IS NOT TRUE AND NOT EXISTS (SELECT 1 FROM public.quiz_questions g"
                      f" WHERE g.is_live IS TRUE AND (g.id='{self.canonical}'::uuid OR g.import_flag_reason='{reason}')))",
                      sql)

    def test_a_sweep_twin_whose_canonical_is_live_still_blocks_and_says_so(self):
        qid, twin = self.two("swept-live")
        res, sid = self.correct({qid})
        why = res["refused"][sid]
        self.assertTrue(any("already in the bank" in w for w in why), why)
        self.assertIn(f"its group has a live row ({self.canonical})", why[-1])
        self.assertNotIn("qa.sql", res["files"])

    def test_a_changed_accepted_answer_list_is_a_correction(self):
        self.two("live")
        same = row(1)
        same["key"]["raw_model_response"] = copy.deepcopy(same["key"]["raw_model_response"])
        same["key"]["raw_model_response"]["numeric_answer_set"] = {"answers": ["116.82", "116.8"]}
        d = self.batch("syn-1-qa-1", [same])
        self.bank.export(self.d / "export.json")
        snaps = [copy.deepcopy(s) for s in self.bank.rows.values()]
        build = lambda: qc.build_correct([d], read_export_doc(self.d / "export.json"), "auto-syn", snaps,
                                         self.d / "exams", rows_runner=lambda r, p, f, s, **kw: copy.deepcopy(self.docs[str(r)]))
        self.assertEqual(build()["refused"], {})
        old = next(s for s in snaps if s["question"]["id"] == self.bank.by_stable(row(1)["stable_question_id"]))
        old["keys"][0]["raw_model_response"]["numeric_answer_set"] = {"answers": ["116.8", "116.82"]}
        self.assertIn("nothing was corrected", build()["refused"][same["stable_question_id"]][0])
        self.assertEqual(qc.key_answers({"evidence": {"numeric_answer_set": {"answers": ["2/7", ".2857"]}}}),
                         [".2857", "2/7"])
        self.assertIsNone(qc.key_answers({"approved_tags": {}}))

    def test_autopilot_corrects_and_publishes_past_a_qa_hidden_twin(self):
        qid, twin = self.two()
        self.log_hidden((qid, QA_REASON), (twin, TWIN_REASON))
        sql, pre = self.run_correction()
        self.assertEqual(self.bank.rows[qid]["question"]["is_live"], True)
        self.assertEqual(self.bank.rows[twin]["question"]["is_live"], False)
        # the publish guards leave the twin out of the content-hash count and the comparison-key check,
        # only while it is still QA-hidden; the row's own source and hash counts still guard the rest
        self.assertIn("WHERE qq.content_hash_v2=q.content_hash_v2 AND NOT ((qq.id="
                      f"'{twin}'::uuid AND qq.archived_at IS NOT NULL AND qq.import_flag_reason LIKE 'qa:%'", sql)
        self.assertIn(f"AND o.archived_at IS NULL AND NOT ((o.id='{twin}'::uuid", sql)
        self.assertIn("THEN RAISE EXCEPTION 'private question changed: %'", sql)
        self.assertEqual(pre["hidden_twins_allowed"], {qid: [twin]})

    def test_autopilot_publishes_past_a_sweep_twin(self):
        qid, twin = self.two("swept")
        self.log_hidden((qid, QA_REASON), (self.canonical, TWIN_REASON))
        sql, pre = self.run_correction()
        self.assertEqual(pre["hidden_twins_allowed"], {qid: [twin]})
        self.assertIn(f"(qq.id='{twin}'::uuid AND qq.archived_at IS NULL AND qq.import_flag_reason='duplicate of", sql)
        self.assertIn(f"WHERE g.is_live IS TRUE AND (g.id='{self.canonical}'::uuid", sql)

    def test_publish_without_twins_is_unchanged(self):
        self.assertEqual(publish.twin_skip({}), "")
        self.two("live")
        sql, pre = self.run_correction_plain()
        self.assertIn("WHERE qq.content_hash_v2=q.content_hash_v2)<>1", sql)
        self.assertEqual(pre["hidden_twins_allowed"], {})

    def run_correction_plain(self):
        self.batch("syn-1-qa-1", [row(1, answer="B")])
        res = self.run_ap()
        self.assertEqual(res["result"], "published", res)
        return (self.pipe / res["run"] / "publish" / "publish.sql").read_text(), json.loads(
            (self.pipe / res["run"] / "publish" / "precheck.json").read_text())

    def test_allowed_twins_reads_every_precheck_format(self):
        f = self.d / "qa-precheck.json"
        self.assertEqual(qc.allowed_twins(f), {})  # no QA corrections in the run
        f.write_text(json.dumps({"hidden_twins_allowed": {"s1": ["t1"]}}))  # a run built before the sweep allowance
        self.assertEqual(qc.allowed_twins(f), {"s1": {"t1": {"kind": "qa"}}})
        sweep = {"kind": "sweep", "reason": "duplicate of c; un-published by sweep", "canonical": "c"}
        f.write_text(json.dumps({"hidden_twins_allowed": {"s1": {"t1": "qa", "t2": sweep}}}))
        self.assertEqual(qc.allowed_twins(f), {"s1": {"t1": {"kind": "qa"}, "t2": sweep}})
        f.write_text(json.dumps({"hidden_twins_allowed": {"s1": {"t2": "sweep"}}}))  # no reason or canonical
        with self.assertRaises(publish.RefuseToBuild):
            qc.allowed_twins(f)


class TestResumeAfterPublishDryRun(TwinCase):
    """A QA-correction run whose publish dry run failed (auto-20261026-081701: the hash count guard
    met the hidden twin), taken with --retry after an earlier refusal, finished with --resume."""

    def resume(self, run, dry=False):
        from kimport import autopilot as ap
        return ap.run_autopilot(self.pipe, dry, None, self.deps(), (), run)

    def stopped_at_publish(self):
        from kimport import autopilot as ap
        qid, twin = self.two("live")
        self.batch("syn-1-qa-1", [row(1, question_text=row(2)["question"]["question_text"])])
        first = self.run_ap()  # the twin is live: it blocks, the batch is refused
        self.assertEqual(self.state()["batches"]["syn-1-qa-1"]["status"], "refused", first)
        hide(self.bank, twin, TWIN_REASON)
        self.log_hidden((qid, QA_REASON), (twin, TWIN_REASON))
        self.bank.fail["publish.dryrun.sql"] = [ap.DbError("ERROR: P0001: private question changed: x")]
        res = self.run_ap(retry=("syn-1-qa-1",))
        self.assertEqual(res["result"], "stopped", res)
        self.assertFalse(self.bank.rows[qid]["question"]["is_live"])
        return res["run"], qid, twin

    def test_a_retried_batch_is_stopped_by_the_run_that_stopped(self):
        run, _, _ = self.stopped_at_publish()
        b = self.state()["batches"]["syn-1-qa-1"]
        self.assertEqual((b["status"], b["run"]), ("stopped", run))
        self.assertEqual(self.run_ap()["result"], "no_new_batches")  # never retried by itself

    def test_resume_publishes_past_the_twin_without_writing_again(self):
        run, qid, twin = self.stopped_at_publish()
        self.assertEqual(self.resume(run, dry=True)["result"], "dry_run_ok")
        self.bank.ran.clear()
        res = self.resume(run)
        self.assertEqual(res["result"], "published", res)
        self.assertTrue(self.bank.rows[qid]["question"]["is_live"])
        self.assertFalse(self.bank.rows[twin]["question"]["is_live"])
        self.assertFalse(any(f.startswith(("stage", "qa.sql", "qa-0")) for f in self.bank.ran))  # nothing re-staged
        sql = (self.pipe / res["run"] / "publish" / "publish.sql").read_text()
        self.assertIn(f"AND NOT ((qq.id='{twin}'::uuid", sql)
        self.assertEqual(self.state()["batches"]["syn-1-qa-1"]["status"], "published")

    def test_resume_takes_a_run_whose_ledger_kept_the_earlier_refusal(self):
        run, qid, _ = self.stopped_at_publish()
        st = self.state()
        st["batches"]["syn-1-qa-1"].update(status="refused", run="auto-earlier", at="2000-01-01T00:00:00Z")
        (self.pipe / "autopilot-state.json").write_text(json.dumps(st))
        res = self.resume(run)
        self.assertEqual(res["result"], "published", res)
        self.assertTrue(self.bank.rows[qid]["question"]["is_live"])

    def test_resume_refuses_a_run_whose_publish_went_further(self):
        run, _, _ = self.stopped_at_publish()
        with open(self.pipe / "intents.jsonl") as f:
            lines = [json.loads(x) for x in f]
        for e in lines:
            if e.get("type") == "close" and e.get("outcome") == "not_applied":
                e["outcome"] = "unknown"
        (self.pipe / "intents.jsonl").write_text("".join(json.dumps(e) + "\n" for e in lines))
        with self.assertRaisesRegex(ValueError, "at most a publish intent closed not_applied"):
            self.resume(run)


def bank_row(n, text, live, comparison_key=None, content_hash="h"):
    r = {"id": f"00000000-0000-4000-8000-{n:012d}", "question_text": text, "content_hash_v2": f"{content_hash}{n}",
         "comparison_key": comparison_key, "is_live": live,
         "publish_status": "publish_ready" if live else UNPUBLISHED_STATUS,
         "import_status": "imported" if live else UNPUBLISHED_IMPORT,
         "import_flag_reason": None if live else TWIN_REASON, "archived_at": None if live else "2026-10-22T21:00:00Z"}
    return r


class TestRestoreRefusesATwin(AutopilotCase):
    def check(self, rows):
        twin = rows[0]
        hidden = {twin["id"]: {"id": twin["id"], "reason": TWIN_REASON}}
        return qa_run.restore_checks([twin["id"]], hidden, {}, set(), {r["id"]: r for r in rows})

    def test_twin_of_a_live_corrected_copy_stays_hidden(self):
        text = "Which made-up choice best describes the willow oak?"
        bad = self.check([bank_row(1, text, False), bank_row(2, "Which made-up choice best describes the willow  oak ?", True)])
        self.assertIn("same normalized text", list(bad.values())[0])
        twin, copy_ = bank_row(1, text, False), bank_row(2, "Other words entirely.", True)
        copy_["content_hash_v2"] = twin["content_hash_v2"]
        self.assertIn("same content hash", list(self.check([twin, copy_]).values())[0])
        twin, copy_ = bank_row(1, text, False, "k1"), bank_row(2, "Other words entirely.", True, "k1")
        self.assertIn("same comparison key", list(self.check([twin, copy_]).values())[0])

    def test_twin_whose_copy_is_not_live_can_come_back(self):
        text = "Which made-up choice best describes the willow oak?"
        self.assertEqual(self.check([bank_row(1, text, False), bank_row(2, text, False)]), {})
        self.assertEqual(self.check([bank_row(1, text, False), bank_row(2, "Other words entirely.", True)]), {})
