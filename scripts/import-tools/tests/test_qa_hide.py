"""k qa hide / k qa restore against a fake bank (synthetic rows, no database)."""

import copy
import json
import re
import tempfile
import unittest
from pathlib import Path

from kimport import qa_hide as qh
from kimport import qa_run, writer
from kimport.autopilot import DbError
from kimport.export import fingerprint
from tests.export_fixtures import current_shape, write_export

NOW = "2026-10-23T10:00:00Z"
LATER = "2026-10-24T10:00:00Z"
_FP = re.compile(r"^-- export \S+: (\d+) rows, fingerprint ([0-9a-f]{32})$", re.M)


def uid(n: int) -> str:
    return f"00000000-0000-4000-8000-{n:012d}"


def row(n: int, live: bool = True, **kw) -> dict:
    return {"id": uid(n), "content_hash_v2": f"h{n}", "publish_status": "publish_ready" if live else "needs_human_review",
            "import_status": "ok" if live else "needs_review", "import_flag_reason": None, "is_live": live,
            "archived_at": None, "created_at": "2026-10-01T00:00:00Z", "question_text": f"q{n}", **kw}


class FakeBank:
    """Runs the generated files: checks the fingerprint and row guards, applies non-dry files."""

    def __init__(self, rows):
        self.rows = {r["id"]: r for r in current_shape(rows)}
        self.ran = []
        self.fail_after_apply = False

    def db(self, path):
        text = Path(path).read_text(encoding="utf-8")
        self.ran.append(Path(path).name)
        if "kimport qa readback" in text:
            ids = re.findall(r"'([0-9a-f-]{36})'", text)
            return [{"rows": [{k: self.rows[i].get(k) for k in
                               ("id", "publish_status", "import_status", "import_flag_reason", "archived_at", "is_live")}
                              for i in sorted(ids) if i in self.rows]}]
        fp = _FP.search(text)
        if fp and (int(fp.group(1)) != len(self.rows) or fp.group(2) != fingerprint(list(self.rows.values()))):
            raise DbError(qh.FINGERPRINT_FAILED, False)
        new = copy.deepcopy(self.rows)
        for line in text.splitlines():
            if not line.startswith("-- kimport qa row "):
                continue
            note = json.loads(line[len("-- kimport qa row "):])
            r = new[note["id"]]
            if (any((r.get(c) is None) if v == qh.ARCHIVED else r.get(c) != v for c, v in note["expect"].items())
                    or (note["live"] is not None and r["is_live"] is not note["live"])):
                raise DbError(f"question changed since the export: {note['id']}", False)
            r.update({c: "2026-10-23T10:00:01+00:00" if v == qh.ARCHIVED else v for c, v in note["set"].items()})
            r["is_live"] = r["import_status"] in (None, "ok") and r["archived_at"] is None
        if text.rstrip().endswith("COMMIT;"):
            self.rows = new
            if self.fail_after_apply:
                raise DbError("connection reset by peer")
        return [{"rows_now_hidden": 0}]


class QaCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pipe = Path(self.tmp.name)
        (self.pipe / "qa").mkdir()
        self.bank = FakeBank([row(1), row(2), row(3), row(4, live=False), row(5), row(6)])
        self.results = self.pipe / "qa" / "results-r1.jsonl"
        self.write_results([
            {"id": uid(1), "match": False, "flags": [], "verdict": "key_wrong", "fix": "key B->C"},
            {"id": uid(2), "match": True, "flags": [], "verdict": "clean"},
            {"id": uid(3), "match": True, "flags": ["garbled"], "note": "stray '16.'"},
            {"id": uid(4), "match": True, "flags": ["garbled"], "verdict": "broken", "fix": "delete line"},
            {"id": uid(6), "match": True, "flags": ["garbled"], "verdict": "pending"},
        ])
        self.audit = self.pipe / "qa" / "static-ids.json"
        self.audit.write_text(json.dumps([{"id": uid(5), "reason": "raw LaTeX"}]))

    def tearDown(self):
        self.tmp.cleanup()

    def write_results(self, lines):
        self.results.write_text("".join(json.dumps(x) + "\n" for x in lines))

    def deps(self):
        def exporter(out):
            write_export(out, list(self.bank.rows.values()))
        return qa_run.Deps(db=self.bank.db, exporter=exporter, sleep=lambda s: None, log=lambda m: None)

    def hide(self, dry=False, export=None, now=NOW):
        return qa_run.run_hide(self.pipe, [self.results], [self.audit], now, dry, export, self.deps())


class PolicyTest(unittest.TestCase):
    def test_policy(self):
        for v in ("key_wrong", "broken", "unsure", "minor_typo", "minor"):
            self.assertEqual(qh.classify({"id": uid(1), "verdict": v}), (True, v))
        for v in ("clean", "key_ok", "pending"):
            self.assertEqual(qh.classify({"id": uid(1), "verdict": v, "flags": ["garbled"], "match": False})[0], False)
        self.assertEqual(qh.classify({"flags": ["garbled"], "match": True}), (True, "pending_review"))
        self.assertEqual(qh.classify({"flags": [], "match": False}), (True, "unreviewed_mismatch"))
        self.assertEqual(qh.classify({"flags": [], "match": True}), (False, "clean"))
        self.assertEqual(qh.classify({"flags": ["garbled"], "match": False, "clean": True}), (False, "clean"))
        self.assertEqual(qh.classify({"id": uid(1), "verdict": "unverifiable", "flags": ["x"]}), (False, "unknown"))

    def test_reason_uses_fix_and_is_short(self):
        r = qh.reason_for("minor_typo", {"fix": "typo 'blooa'->'blood'\n" + "x" * 500, "note": "n"})
        self.assertTrue(r.startswith("qa:minor_typo: typo 'blooa'->'blood' x"))
        self.assertLessEqual(len(r), qh.REASON_MAX)

    def test_later_line_wins_and_id_formats(self):
        with tempfile.TemporaryDirectory() as d:
            a, b = Path(d) / "a.jsonl", Path(d) / "b.jsonl"
            a.write_text(json.dumps({"id": uid(1), "verdict": "broken"}) + "\n")
            b.write_text(json.dumps({"id": uid(1), "verdict": "key_ok"}) + "\n")
            self.assertEqual(qh.read_results([a, b])[uid(1)]["verdict"], "key_ok")
            t = Path(d) / "ids.txt"
            t.write_text(f"{uid(1)}\n# comment\n{uid(2)}  # x\n")
            self.assertEqual(sorted(qh.read_ids(t)), [uid(1), uid(2)])
            j = Path(d) / "ids.json"
            j.write_text(json.dumps({"items": [{"id": uid(3), "problems": ["a", "b"]}]}))
            self.assertEqual(qh.read_ids(j), {uid(3): "a, b"})

    def test_sql_has_dryrun_twin_and_guard(self):
        items, _ = qh.plan_hide({uid(1): ("broken", "qa:broken: x")}, {uid(1): current_shape([row(1)])[0]})
        from tests.export_fixtures import export_doc
        from kimport.export import ExportDoc
        d = export_doc([row(1)])
        sql = qh.hide_sql(items, ExportDoc(d["rows"], d["exported_at"], d["row_count"], d["fingerprint"]))
        self.assertTrue(sql.rstrip().endswith("COMMIT;"))
        self.assertIn(qh.FINGERPRINT_FAILED, sql)
        self.assertIn("q.content_hash_v2 IS DISTINCT FROM 'h1'", sql)
        self.assertIn("q.archived_at IS DISTINCT FROM NULL", sql)
        self.assertIn("archived_at = now()", sql)


class HideTest(QaCase):
    def test_dry_run_writes_nothing(self):
        res = self.hide(dry=True)
        self.assertEqual(res["by_reason"], {"audit": 1, "key_wrong": 1, "pending_review": 1})
        self.assertEqual(res["skipped"], {"not live": 1})
        self.assertTrue(all(n.endswith(".dryrun.sql") for n in self.bank.ran))
        self.assertTrue(self.bank.rows[uid(1)]["is_live"])
        self.assertFalse((self.pipe / "qa" / "hidden.jsonl").exists())
        self.assertFalse((self.pipe / "intents.jsonl").exists())
        self.assertFalse((self.pipe / "writer.lock").exists())

    def test_hide_then_undo_restores_exactly(self):
        before = copy.deepcopy(self.bank.rows)
        res = self.hide()
        self.assertEqual(res["result"], "hidden")
        self.assertEqual(self.bank.ran[:2], ["hide.dryrun.sql", "hide.sql"])
        for n in (1, 3, 5):
            r = self.bank.rows[uid(n)]
            self.assertEqual((r["publish_status"], r["import_status"], r["is_live"]),
                             ("needs_human_review", "needs_review", False))
            self.assertIsNotNone(r["archived_at"])
        self.assertEqual(self.bank.rows[uid(1)]["import_flag_reason"], "qa:key_wrong: key B->C")
        self.assertEqual(self.bank.rows[uid(5)]["import_flag_reason"], "qa:audit: raw LaTeX")
        self.assertTrue(self.bank.rows[uid(2)]["is_live"] and self.bank.rows[uid(6)]["is_live"])
        log = qh.read_log(self.pipe / "qa" / "hidden.jsonl")
        self.assertEqual({e["id"] for e in log}, {uid(1), uid(3), uid(5)})
        self.assertEqual(log[0]["previous_publish_status"], "publish_ready")
        self.assertIn("previous_archived_at", log[0])
        self.assertIsNone(log[0]["previous_archived_at"])
        self.assertEqual(writer.open_intents(self.pipe / "intents.jsonl"), [])
        self.assertFalse((self.pipe / "writer.lock").exists())
        # a second run hides nothing new
        self.assertEqual(self.hide(now=LATER)["result"], "nothing to hide")
        # undo: the dry run passes, the real file puts every row back exactly
        self.bank.db(self.pipe / "qa" / "restore.dryrun.sql")
        self.bank.db(self.pipe / "qa" / "restore.sql")
        self.assertEqual(self.bank.rows, before)

    def test_bank_changed_since_export_writes_nothing(self):
        stale = self.pipe / "stale.json"
        write_export(stale, list(self.bank.rows.values()))
        self.bank.rows[uid(2)]["content_hash_v2"] = "changed"
        with self.assertRaisesRegex(ValueError, "dry run failed"):
            self.hide(export=str(stale))
        self.assertTrue(self.bank.rows[uid(1)]["is_live"])
        self.assertEqual(writer.open_intents(self.pipe / "intents.jsonl"), [])
        self.assertFalse((self.pipe / "writer.lock").exists())

    def test_connection_error_after_apply_is_verified_by_readback(self):
        self.bank.fail_after_apply = True
        self.assertEqual(self.hide()["result"], "hidden")
        self.assertEqual(writer.open_intents(self.pipe / "intents.jsonl"), [])

    def test_unknown_verdict_listed_in_dry_run_refused_for_real(self):
        lines = [json.loads(x) for x in self.results.read_text().splitlines()]
        self.write_results(lines + [{"id": uid(2), "match": False, "flags": ["x"], "verdict": "unverifiable"}])
        self.assertEqual(self.hide(dry=True)["unknown_verdicts_not_hidden"], {"unverifiable": 1})
        with self.assertRaisesRegex(ValueError, "unverifiable \\(1\\)"):
            self.hide()
        self.assertTrue(self.bank.rows[uid(1)]["is_live"])

    def test_live_means_student_visible(self):
        """Live = is_live, a VISIBLE publish_status and not archived (quiz_questions_live and
        the student queries); verified_repair rows are hidden and get that status back on undo."""
        rows = {r["id"]: r for r in current_shape([
            row(1, publish_status="publish_ready_with_verified_repair"),
            row(2, publish_status="needs_human_review"),       # is_live true (import ok) but not served
            row(3, publish_status="blocked_answer_dispute")])}
        items, skipped = qh.plan_hide({uid(n): ("broken", "qa:broken: x") for n in (1, 2, 3)}, rows)
        self.assertEqual([it["id"] for it in items], [uid(1)])
        self.assertEqual(skipped, {uid(2): "not live", uid(3): "not live"})
        self.bank.rows[uid(1)]["publish_status"] = "publish_ready_with_verified_repair"
        before = copy.deepcopy(self.bank.rows)
        self.hide()
        rec = {e["id"]: e for e in qh.read_log(self.pipe / "qa" / "hidden.jsonl")}[uid(1)]
        self.assertEqual(rec["previous_publish_status"], "publish_ready_with_verified_repair")
        self.bank.db(self.pipe / "qa" / "restore.sql")
        self.assertEqual(self.bank.rows, before)

    def test_lock_held(self):
        writer.acquire_lock(self.pipe / "writer.lock", "someone", NOW)
        with self.assertRaises(writer.LockHeld):
            self.hide()

    def test_corrected_rows_are_not_hidden_again(self):
        """A row whose text is its reviewed QA correction is not hidden again by the results line about the
        old text; a row whose text changed after the correction is (2026-10-23: 128 corrections re-hidden)."""
        self.bank.rows[uid(3)]["content_hash_v2"] = "h3-later-edit"
        qh.append_log(self.pipe / "qa" / "corrections.jsonl", [
            {"question_id": uid(1), "after_content_hash_v2": "h1", "at": "2026-10-23T09:00:00Z"},
            {"question_id": uid(3), "after_content_hash_v2": "h3", "at": "2026-10-23T09:00:00Z"}])
        res = self.hide()
        self.assertTrue(self.bank.rows[uid(1)]["is_live"])
        self.assertFalse(self.bank.rows[uid(3)]["is_live"])
        plan = json.loads(Path(res["run"], "plan.json").read_text())
        self.assertEqual(plan["skipped_rows"][uid(1)], qh.CORRECTED_SKIP)


class RestoreTest(QaCase):
    def test_restore_corrected_row_hidden_again(self):
        """A correction re-hidden by a later hide run can be restored although the results still flag the
        old text, as long as the row's text is still the correction."""
        self.hide()  # hides uid(1) (key_wrong), uid(3), uid(5)
        qh.append_log(self.pipe / "qa" / "corrections.jsonl", [
            {"question_id": uid(1), "after_content_hash_v2": "h1", "at": "2026-10-23T09:00:00Z"},
            {"question_id": uid(3), "after_content_hash_v2": "h3-other", "at": "2026-10-23T09:00:00Z"}])
        ids = self.pipe / "ids.txt"
        ids.write_text(f"{uid(1)}\n{uid(3)}\n")
        res = qa_run.run_restore(self.pipe, ids, [self.results], [], LATER, skip_refused=True, deps=self.deps())
        self.assertEqual(res["to_restore"], 1)
        self.assertIn("still unresolved", res["refused"][uid(3)])
        self.assertTrue(self.bank.rows[uid(1)]["is_live"])

    def test_restore_only_resolved(self):
        self.hide()
        self.bank.rows[uid(1)]["content_hash_v2"] = "h1-fixed"  # the fix changed the question
        self.write_results([
            {"id": uid(1), "match": True, "flags": [], "verdict": "key_ok"},
            {"id": uid(3), "match": True, "flags": ["garbled"], "note": "stray '16.'"},
        ])
        ids = self.pipe / "restore-ids.txt"
        ids.write_text(f"{uid(1)}\n{uid(3)}\n{uid(2)}\n")
        args = (self.pipe, ids, [self.results], [], LATER)
        with self.assertRaisesRegex(ValueError, "2 of 3 rows cannot be republished"):
            qa_run.run_restore(*args, deps=self.deps())
        res = qa_run.run_restore(*args, skip_refused=True, deps=self.deps())
        self.assertEqual(res["to_restore"], 1)
        self.assertIn("still unresolved", res["refused"][uid(3)])
        self.assertIn("not hidden by QA", res["refused"][uid(2)])
        r = self.bank.rows[uid(1)]
        self.assertEqual((r["publish_status"], r["import_status"], r["import_flag_reason"], r["archived_at"],
                          r["is_live"]), ("publish_ready", "ok", None, None, True))
        self.assertEqual(set(qh.currently_hidden(self.pipe / "qa")), {uid(3), uid(5)})
        self.assertEqual(res["undo_rows"], 2)

    def test_restore_refuses_when_replacement_live(self):
        self.bank.rows[uid(1)]["comparison_key"] = "kn-2:abc"
        self.hide()
        new = current_shape([row(9, comparison_key="kn-2:abc")])[0]
        self.bank.rows[new["id"]] = new
        self.write_results([{"id": uid(1), "match": True, "flags": [], "verdict": "key_ok"}])
        ids = self.pipe / "ids.txt"
        ids.write_text(uid(1) + "\n")
        with self.assertRaisesRegex(ValueError, "cannot be republished"):
            qa_run.run_restore(self.pipe, ids, [self.results], [], LATER, deps=self.deps())

    def test_restore_refuses_audit_listed(self):
        self.hide()
        ids = self.pipe / "ids.txt"
        ids.write_text(uid(5) + "\n")
        with self.assertRaisesRegex(ValueError, "cannot be republished"):
            qa_run.run_restore(self.pipe, ids, [self.results], [self.audit], LATER, deps=self.deps())


if __name__ == "__main__":
    unittest.main()
