"""QA corrections keep a QA-hidden row's stored source identity (kimport.qa_correct.kept_identities,
ts/stage-rows.ts <keep-identities.json>): synthetic rows, no database.

The importer side (exact match, new rows stay strict, a differing identity is refused) is
tested in src/lib/question-bank/kept-source-identity.test.ts."""

import copy
import json
import unittest
from pathlib import Path
from unittest import mock

from kimport import qa_correct as qc
from kimport import stage as st
from kimport.publish import RefuseToBuild
from tests import stage_fixtures as fx
from tests.test_autopilot import AutopilotCase
from tests.test_bulk import row, text
from tests.test_qa_correct import QaBank, hide

V = "e" * 64


def export_row(section, module, number, hidden=True, version=V):
    r = {"id": f"q-{section}-{module}-{number}", "source_version": version, "source_section": section,
         "source_module": module, "source_question_number": number, "archived_at": None,
         "import_flag_reason": None, "publish_status": "publish_ready", "import_status": "ok", "is_live": True}
    if hidden:
        r.update(archived_at="2026-10-23T07:50:12+00:00", import_flag_reason="qa:audit: certify: header_footer_line",
                 publish_status="needs_human_review", import_status="needs_review", is_live=False)
    return r


class TestKeptIdentities(unittest.TestCase):
    def test_only_qa_hidden_rows_with_a_whole_tuple(self):
        rows = [export_row("writing", "UNSPECIFIED", 21), export_row("reading", "UNSPECIFIED", 1),
                export_row("writing", "UNSPECIFIED", 22, hidden=False),  # still live: nothing to correct
                export_row("reading", None, 3)]  # no stored module: nothing to keep
        self.assertEqual(qc.kept_identities(rows), [
            {"source_version": V, "source_section": "reading", "source_module": "UNSPECIFIED",
             "source_question_number": 1},
            {"source_version": V, "source_section": "writing", "source_module": "UNSPECIFIED",
             "source_question_number": 21}])
        self.assertEqual(qc.kept_identities([export_row("reading", "M1", 1, hidden=False)]), [])


    def test_a_qa_correction_held_at_seal_keeps_its_identity(self):
        # r3-qa-88 rewrote the hidden row as a private draft and was held at seal; its fix batch (r3-qa-90)
        # must keep the identity, though the row no longer looks QA-hidden.
        draft = export_row("writing", "UNSPECIFIED", 21, hidden=False)
        draft.update(publish_status="needs_human_review", import_status="needs_review", is_live=False,
                     import_flag_reason="Private preview")
        other = {**copy.deepcopy(draft), "id": "q-new-draft", "source_question_number": 22}  # never QA-hidden
        hidden = frozenset({draft["id"]})
        self.assertEqual(qc.kept_identities([draft, other]), [])  # without the hidden list: strict
        self.assertEqual(qc.kept_identities([draft, other], hidden), [
            {"source_version": V, "source_section": "writing", "source_module": "UNSPECIFIED",
             "source_question_number": 21}])
        published = {**copy.deepcopy(draft), "is_live": True, "publish_status": "publish_ready", "import_status": "ok"}
        self.assertEqual(qc.kept_identities([published], hidden), [])


class TestStageRowsKeepFile(unittest.TestCase):
    def run_with(self, **kw):
        seen = {}

        def fake_run(cmd, **_):
            seen["cmd"] = list(cmd)
            if len(cmd) == 9:
                seen["keep"] = json.loads(Path(cmd[8]).read_text(encoding="utf-8"))
            return mock.Mock(returncode=0, stdout='{"rows": []}', stderr="")
        with mock.patch.object(st.subprocess, "run", fake_run):
            st.stage_rows(Path("r.json"), Path("e.pdf"), Path("f.json"), "a" * 64, **kw)
        return seen

    def test_keep_identities_go_to_stage_rows_as_a_fifth_argument(self):
        kept = qc.kept_identities([export_row("writing", "UNSPECIFIED", 21)])
        seen = self.run_with(keep_identities=kept)
        self.assertEqual(seen["keep"], kept)
        self.assertFalse(Path(seen["cmd"][8]).exists())  # a temporary file, removed afterwards

    def test_without_keep_identities_stage_rows_is_strict(self):
        self.assertEqual(len(self.run_with()["cmd"]), 8)
        self.assertEqual(len(self.run_with(keep_identities=[])["cmd"]), 8)


class TestOneModuleRule(unittest.TestCase):
    def legacy(self, n, section, kept=True):
        r = fx.stage_row(n, text(n), source_section=section, source_module="UNSPECIFIED")
        if kept:
            r["kept_source_identity"] = True
        return r

    def test_kept_reading_and_writing_rows_of_one_legacy_module_are_one_batch(self):
        st._check_payload([self.legacy(1, "reading"), self.legacy(21, "writing")], fx.BINDING_SHA)

    def test_the_same_rows_without_a_kept_identity_span_two_modules(self):
        with self.assertRaises(RefuseToBuild) as e:
            st._check_payload([self.legacy(1, "reading", False), self.legacy(21, "writing", False)],
                              fx.BINDING_SHA)
        self.assertIn("span 2 source modules", e.exception.reason)


class TestAutopilotPassesKeptIdentities(AutopilotCase):
    def setUp(self):
        super().setUp()
        self.bank = QaBank(None)
        self.calls = []

    def deps(self, chunk_size=200):
        d = super().deps(chunk_size)

        def runner(reviewed, pdf, frozen, sha, **kw):
            self.calls.append(kw)
            return copy.deepcopy(self.docs[str(reviewed)])
        d.rows_runner = runner
        return d

    def test_hidden_rows_identities_reach_stage_rows_only_once_qa_hid_them(self):
        self.batch("syn-1", [row(1), row(2)])
        self.assertEqual(self.run_ap()["result"], "published")
        self.assertEqual(self.calls, [{}])  # nothing hidden: strict
        qid = self.bank.by_stable(row(1)["stable_question_id"])
        hide(self.bank, qid)
        self.calls.clear()
        self.batch("syn-1-qa-1", [row(1, answer="B")])
        self.assertEqual(self.run_ap()["result"], "published")
        q = self.bank.rows[qid]["question"]
        want = [{"source_version": q["source_version"], "source_section": q["source_section"],
                 "source_module": q["source_module"], "source_question_number": q["source_question_number"]}]
        self.assertEqual(self.calls, [{"keep_identities": want}])


if __name__ == "__main__":
    unittest.main()
