"""Independently confirmed generated keys (no printed key): the importer stores the whole
reviewed answer as raw_model_response, so approved_tags / student_publication_allowed /
question_id sit under "evidence" (kimport.answer_evidence). Stage, publish, bulk, sweep and the
export read and write them there; official keys keep the exact legacy SQL (made-up data only)."""

import copy
import json
import unittest

from kimport.answer_evidence import GENERATED, ambiguous, evidence_root, json_path, sql_get, sql_remove
from kimport.fetch import _SLIM_KEY
from kimport.publish import RefuseToBuild
from kimport.stage import _check_payload
from kimport.sweep import republish_sql, unpublish_sql
from kimport.export import export_by_id, read_export
from tests import publish_fixtures as fx
from tests import stage_fixtures as sfx
from tests.test_publish import PublishTestCase, payloads
from tests.test_sweep import FIXTURE, groups, uid


def envelope(evidence: dict) -> dict:
    """importAnswerEvidence(row) for an independently confirmed generated key."""
    return {"kind": GENERATED, "printed_answer": None, "generated_key_artifact_sha256": "a" * 64,
            "independent_review_sha256s": ["b" * 64, "c" * 64], "independently_verified_answer": "A",
            "evidence": evidence, "official_answer_available": False}


class Helpers(unittest.TestCase):
    def test_root_and_paths(self):
        official = {"approved_tags": {}, "student_publication_allowed": False}
        gen = envelope(dict(official))
        self.assertIs(evidence_root(official), official)
        self.assertIs(evidence_root(gen), gen["evidence"])
        self.assertEqual(json_path(official, "student_publication_allowed"), "'{student_publication_allowed}'")
        self.assertEqual(json_path(gen, "approved_tags", "question_payload_sha256"),
                         "'{evidence,approved_tags,question_payload_sha256}'")
        self.assertEqual(sql_get("c", official, "approved_tags", "x", text=True), "c->'approved_tags'->>'x'")
        self.assertEqual(sql_get("c", gen, "student_publication_allowed"), "c->'evidence'->'student_publication_allowed'")
        self.assertEqual(sql_remove("c", official, "k"), "c - 'k'")
        self.assertEqual(sql_remove("c", gen, "k"), "c #- '{evidence,k}'")
        self.assertTrue(ambiguous(dict(gen, approved_tags={})))
        self.assertFalse(ambiguous(gen))


class StageGenerated(unittest.TestCase):
    def row(self, n=1, **change):
        r = sfx.stage_row(n, f"Which choice best completes the made-up text number {n} about otters?")
        r["key"]["raw_model_response"] = envelope(r["key"]["raw_model_response"])
        for k, v in change.items():
            r["key"]["raw_model_response"][k] = v
        return r

    def test_generated_key_passes(self):
        _check_payload([self.row()], sfx.BINDING_SHA)

    def test_generated_key_with_open_flag_refused(self):
        r = self.row()
        r["key"]["raw_model_response"]["evidence"]["student_publication_allowed"] = True
        with self.assertRaisesRegex(RefuseToBuild, "student_publication_allowed"):
            _check_payload([r], sfx.BINDING_SHA)

    def test_ambiguous_envelope_refused(self):
        r = self.row(approved_tags={"stable_question_id": "x"})
        with self.assertRaisesRegex(RefuseToBuild, "ambiguous"):
            _check_payload([r], sfx.BINDING_SHA)

    def test_wrong_binding_still_refused(self):
        r = self.row()
        r["key"]["raw_model_response"]["evidence"]["approved_tags"]["tag_binding_manifest_sha256"] = "f" * 64
        with self.assertRaisesRegex(RefuseToBuild, "tag_binding"):
            _check_payload([r], sfx.BINDING_SHA)


def generated(n: int, text: str, flag=False) -> tuple[dict, dict]:
    """(readback snapshot, sealed preview row) for a generated-key row; the sealed preview's
    answer_evidence is the stored raw_model_response, the whole envelope."""
    snap = fx.snapshot(n, text)
    seal = fx.sealed(snap)
    ev = snap["keys"][0]["raw_model_response"]
    ev["student_publication_allowed"] = flag
    snap["keys"][0]["raw_model_response"] = envelope(ev)
    seal["answer_evidence"] = copy.deepcopy(snap["keys"][0]["raw_model_response"])
    return snap, seal


class PublishGenerated(PublishTestCase):
    def test_publish_and_rollback_write_under_evidence(self):
        g, gseal = generated(2, "Which choice best states the main idea of the made-up passage about otters?")
        o = fx.snapshot(3, "Which finding from the made-up study about bees would support the claim?")
        snaps, seals = [g, o], [gseal, fx.sealed(o)]
        bundle = self.build(self.batch(snaps, seals=seals))
        sql, rb = bundle["publish_sql"], bundle["rollback_sql"]
        blocks = [b for b in sql.split("\nDO ") if "private answer changed" in b]
        gen = next(b for b in blocks if payloads(b)[0][0]["question"]["source_question_number"] == 2)
        off = next(b for b in blocks if payloads(b)[0][0]["question"]["source_question_number"] == 3)
        self.assertIn("'{evidence,student_publication_allowed}','true'::jsonb)", gen)
        self.assertIn("'{evidence,approved_tags,question_payload_sha256}',to_jsonb(v->>'seal'))", gen)
        self.assertIn("k.raw_model_response->'evidence'->>'student_publication_allowed'<>'false'", gen)
        self.assertIn("k.raw_model_response->'evidence'->'approved_tags'->>'tag_binding_manifest_sha256'", gen)
        self.assertNotIn("'{student_publication_allowed}'", gen)
        self.assertIn("'{student_publication_allowed}','true'::jsonb)", off)  # official row unchanged
        self.assertIn("k.raw_model_response->>'student_publication_allowed'<>'false'", off)
        rgen = [b for b in rb.split("\nDO ") if "'{evidence,student_publication_allowed}'" in b]
        self.assertEqual(len(rgen), 1)

    def test_generated_flag_open_refused(self):
        snap, seal = generated(2, "Which choice best states the main idea of the made-up passage about otters?", True)
        with self.assertRaisesRegex(RefuseToBuild, "student_publication_allowed"):
            self.build(self.batch([snap], seals=[seal]))


class SweepGenerated(unittest.TestCase):
    def test_flag_paths_follow_the_evidence_root(self):
        gs = groups()
        rows = {k: dict(v) for k, v in export_by_id(read_export(FIXTURE)).items()}
        rows[uid(2)]["raw_model_response"] = {"kind": GENERATED, "evidence": {"student_publication_allowed": True}}
        rows[uid(11)]["raw_model_response"] = {"kind": GENERATED, "evidence": {}}
        un, re_ = unpublish_sql(gs, rows), republish_sql(gs, rows)
        block = lambda sql, n: [b for b in sql.split("\nDO ") if f"'{uid(n)}'::uuid FOR UPDATE" in b][0]
        self.assertIn("raw_model_response->'evidence'->'student_publication_allowed' FROM", block(un, 2))
        self.assertIn("IS DISTINCT FROM 'true'::jsonb", block(un, 2))
        self.assertIn("jsonb_set(raw_model_response, '{evidence,student_publication_allowed}', 'false'::jsonb)",
                      block(un, 2))
        self.assertIn("jsonb_set(raw_model_response, '{evidence,student_publication_allowed}', 'true'::jsonb)",
                      block(re_, 2))
        self.assertIn("raw_model_response #- '{evidence,student_publication_allowed}'", block(re_, 11))
        self.assertIn("jsonb_set(raw_model_response, '{student_publication_allowed}', 'false'::jsonb)",
                      block(un, 21))  # official rows keep the legacy statement


class ExportSlim(unittest.TestCase):
    def test_slim_keeps_generated_nesting(self):
        self.assertIn("'independently_confirmed_generated', 'evidence'", _SLIM_KEY)
        self.assertIn("k.raw_model_response -> 'evidence' -> 'student_publication_allowed'", _SLIM_KEY)


if __name__ == "__main__":
    unittest.main()
