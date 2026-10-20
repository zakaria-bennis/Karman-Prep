import base64
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from kimport.export import FINGERPRINT_SQL, read_export_doc
from kimport.keys import comparison_key
from kimport.publish import (
    FIGURE_NO_KEY,
    NOT_COMPARABLE_ANSWER,
    NOT_COMPARABLE_FORMAT,
    RefuseToBuild,
    build_publish,
    readback_record,
)
from kimport.writer import close_intent, write_intent
from tests import publish_fixtures as fx

CLI = Path(__file__).resolve().parent.parent / "kimport-cli.py"
TASK3 = Path("/Users/zakariabennis/Documents/Codex/2026-10-11/task-3")
LEGACY = TASK3 / "oct25usv2-rw-m2q11-native-table-publish.sql"
LEGACY_READBACK = TASK3 / "oct25usv2-rw-m2q11-native-table-private-readback.json"
LEGACY_SEALED = TASK3 / "oct25usv2-rw-m2q11-native-table-sealed-preview.json"

_KEY_GUARD = re.compile(r"IF EXISTS \(SELECT 1 FROM public\.quiz_questions o WHERE o\.comparison_key = "
                        r"'[^']*' AND o\.id <> q\.id\) THEN RAISE EXCEPTION 'duplicate comparison key: %', "
                        r"q\.id; END IF;")


def normalize_sql(sql: str) -> str:
    """Whitespace removed, new key lines removed, batch-specific values replaced."""
    lines = [ln for ln in sql.splitlines() if not ln.strip().startswith("--") and ln.strip() not in ("BEGIN;", "COMMIT;")]
    s = "\n".join(lines)
    s = re.sub(r"DO \$(\w+_fingerprint)\$.*?END \$\1\$;", "", s, flags=re.S)
    s = _KEY_GUARD.sub("", s)
    s = re.sub(r",comparison_key='[^']*'", "", s)
    s = re.sub(r"decode\('[A-Za-z0-9+/=]*','base64'\)", "decode('B','base64')", s)
    s = re.sub(r"\$[A-Za-z0-9_]+\$", "$T$", s)
    s = re.sub(r"[0-9a-f]{64}", "H", s)
    return re.sub(r"\s+", "", s)


def payloads(sql: str) -> list:
    return [json.loads(base64.b64decode(b)) for b in re.findall(r"decode\('([A-Za-z0-9+/=]+)','base64'\)", sql)]


def other_choices(n):
    return {"A": f"alpha {n}", "B": f"beta {n}", "C": f"gamma {n}", "D": f"delta {n}"}


class PublishTestCase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def batch(self, snaps, extra=(), **kw):
        rows = [fx.export_row(s) for s in snaps] + list(extra)
        return fx.write_batch(self.dir, snaps, rows, **kw)

    def build(self, paths, name="syn-batch"):
        return build_publish(paths["readback"], paths["sealed"], paths["export"], paths["intents"], name)

    def three(self):
        return [fx.table_snapshot(1),
                fx.snapshot(2, "Which choice best states the main idea of the made-up passage about otters?"),
                fx.snapshot(3, "Which finding from the made-up study about bees would support the claim?")]

    def bank(self):
        return [fx.live_row(n, f"Unrelated made-up bank question number {n} about rivers?", other_choices(n))
                for n in range(1, 6)]


class LegacyGuardTests(PublishTestCase):
    @unittest.skipUnless(LEGACY.exists(), "legacy task-3 publish SQL not on this machine")
    def test_matches_legacy_guard(self):
        bundle = self.build(self.batch([fx.table_snapshot()], self.bank()))
        self.assertEqual(normalize_sql(bundle["publish_sql"]), normalize_sql(LEGACY.read_text(encoding="utf-8")))
        legacy = LEGACY.read_text(encoding="utf-8")
        for clause in ("FOR UPDATE", "to_jsonb(q) IS DISTINCT FROM v->'question'",
                       "ORDER BY c.letter", "qq.content_hash_v2=q.content_hash_v2",
                       "'{student_publication_allowed}','true'::jsonb",
                       "k.raw_model_response->'approved_tags' ? 'question_payload_sha256'"):
            self.assertIn(clause, legacy)
            self.assertIn(clause, bundle["publish_sql"])

    @unittest.skipUnless(LEGACY_READBACK.exists() and LEGACY_SEALED.exists(), "legacy task-3 inputs not here")
    def test_fixture_structure_matches_real_files(self):
        real = json.loads(LEGACY_READBACK.read_text(encoding="utf-8"))["rows"][0]["snapshot"]
        syn = fx.table_snapshot()
        self.assertEqual(list(syn), list(real))
        self.assertEqual(set(syn["question"]) - {"comparison_key"}, set(real["question"]))
        self.assertEqual(set(syn["keys"][0]), set(real["keys"][0]))
        self.assertEqual(set(syn["keys"][0]["raw_model_response"]), set(real["keys"][0]["raw_model_response"]))
        self.assertEqual(set(syn["choices"][0]), set(real["choices"][0]))
        seal_real = json.loads(LEGACY_SEALED.read_text(encoding="utf-8"))["rows"][0]
        self.assertEqual(set(fx.sealed(syn)), set(seal_real))

    def test_payload_is_snapshot_plus_seal(self):
        snap = fx.table_snapshot()
        bundle = self.build(self.batch([snap], self.bank()))
        (item,) = payloads(bundle["publish_sql"])[0]
        self.assertEqual(item, {**snap, "seal": fx.sealed(snap)["question_payload_sha256"]})
        self.assertIn(f"<>'{fx.MANIFEST}'", bundle["publish_sql"])


class KeyGuardTests(PublishTestCase):
    def test_key_guard_present_per_row(self):
        snaps = self.three()
        bundle = self.build(self.batch(snaps, self.bank()))
        sql = bundle["publish_sql"]
        self.assertEqual(sql.count("DO $"), 4)  # fingerprint block + one per row
        self.assertEqual(sql.count("DECLARE items jsonb"), 3)
        self.assertEqual(len(_KEY_GUARD.findall(sql)), 3)
        for s in snaps:
            key = comparison_key(readback_record(s))
            self.assertEqual(bundle["keys"][s["question"]["id"]], key)
            guard = (f"IF EXISTS (SELECT 1 FROM public.quiz_questions o WHERE o.comparison_key = '{key}' "
                     f"AND o.id <> q.id) THEN RAISE EXCEPTION 'duplicate comparison key: %', q.id; END IF;")
            self.assertEqual(sql.count(guard), 1)
            update = f"publish_status='publish_ready',comparison_key='{key}' WHERE id=q.id;"
            self.assertEqual(sql.count(update), 1)
            self.assertLess(sql.index(guard), sql.index(update))
        self.assertLess(sql.index("BEGIN;"), sql.index("DO $"))
        self.assertTrue(sql.rstrip().endswith("COMMIT;"))
        self.assertNotIn("is_live=", sql.replace(" ", ""))

    def test_image_figure_row_has_no_key_guard(self):
        img = fx.snapshot(4, "Which made-up graph shows the trend?", figure_kind="graph",
                          image_url="https://example.invalid/figure.png")
        bundle = self.build(self.batch([fx.table_snapshot(1), img], self.bank()))
        self.assertIsNone(bundle["keys"][img["question"]["id"]])
        self.assertEqual(len(_KEY_GUARD.findall(bundle["publish_sql"])), 1)
        row = next(r for r in bundle["precheck"]["rows"] if r["id"] == img["question"]["id"])
        self.assertEqual(row["key_status"], FIGURE_NO_KEY)

    def test_figure_row_still_prechecked(self):
        img = fx.snapshot(4, "Which made-up graph shows the trend?", figure_kind="graph")
        twin = fx.export_row(img, id=fx.uid(77, 3), content_hash_v2=fx.hexn(77, 8), publish_status="publish_ready",
                             is_live=True)
        with self.assertRaisesRegex(RefuseToBuild, "duplicate"):
            self.build(self.batch([img], [twin]))


class RefuseTests(PublishTestCase):
    def test_refuses_on_export_duplicate(self):
        snaps = self.three()
        target = snaps[1]
        ch = {c["letter"]: c["choice_text"] for c in target["choices"]}
        letters = sorted(ch)
        reordered = dict(zip(letters, reversed([ch[x] for x in letters])))
        answer_letter = next(k for k, v in reordered.items() if v == ch[target["question"]["correct_answer"]])
        copy = fx.live_row(50, target["question"]["question_text"], reordered, answer_letter)
        with self.assertRaisesRegex(RefuseToBuild, "duplicate") as cm:
            self.build(self.batch(snaps, self.bank() + [copy]))
        self.assertIn(copy["id"], cm.exception.reason)

    def test_refuses_on_stored_key_match(self):
        snaps = self.three()
        key = comparison_key(readback_record(snaps[2]))
        # an image row is skipped by the backfill check, so only the stored-key index can catch this
        other = fx.live_row(60, "A different made-up question about clouds?", other_choices(60),
                            comparison_key=key, figure_kind="graph")
        with self.assertRaisesRegex(RefuseToBuild, "duplicate") as cm:
            self.build(self.batch(snaps, self.bank() + [other]))
        self.assertIn(other["id"], cm.exception.reason)

    def test_refuses_on_duplicate_inside_batch(self):
        a = fx.snapshot(2, "Which choice best states the main idea of the made-up passage about otters?")
        b = fx.snapshot(3, a["question"]["question_text"], {c["letter"]: c["choice_text"] for c in a["choices"]})
        with self.assertRaisesRegex(RefuseToBuild, "duplicate"):
            self.build(self.batch([a, b], self.bank()))

    def test_refuses_on_typo_duplicate(self):
        snaps = self.three()
        target = snaps[2]
        typo_text = target["question"]["question_text"].replace("support", "suppert")
        ch = {c["letter"]: c["choice_text"] for c in target["choices"]}
        copy = fx.live_row(51, typo_text, ch, target["question"]["correct_answer"])
        with self.assertRaisesRegex(RefuseToBuild, "typo") as cm:
            self.build(self.batch(snaps, self.bank() + [copy]))
        self.assertIn(copy["id"], cm.exception.reason)

    def test_staged_copy_counts(self):
        snaps = self.three()
        target = snaps[1]
        staged = fx.export_row(target, id=fx.uid(70, 3), content_hash_v2=fx.hexn(70, 8))
        staged["comparison_key"] = fx.keyed(staged)
        with self.assertRaisesRegex(RefuseToBuild, "duplicate"):
            self.build(self.batch(snaps, self.bank() + [staged]))

    def test_refuses_with_open_intent(self):
        paths = self.batch(self.three(), self.bank())
        iid = write_intent(paths["intents"], "earlier-batch", "publish", [fx.uid(1)], "f" * 64, "2026-10-20T10:00:00Z")
        with self.assertRaisesRegex(RefuseToBuild, "open intent"):
            self.build(paths)
        close_intent(paths["intents"], iid, "verified", "e" * 64, "2026-10-20T10:05:00Z")
        self.build(paths)

    def test_refuses_stale_export(self):
        with self.assertRaisesRegex(RefuseToBuild, "older than the private readback"):
            self.build(self.batch(self.three(), self.bank(), export_age=-60))

    def test_refuses_stale_export_by_timestamp(self):
        paths = self.batch(self.three(), self.bank(), exported_at="2026-10-16T09:00:00+00:00")
        with self.assertRaisesRegex(RefuseToBuild, "older than the private readback"):
            self.build(paths)

    def test_refuses_more_than_27_rows(self):
        snaps = [fx.snapshot(n, f"Made-up question {n}: which word fits the blank about item {n}?")
                 for n in range(1, 29)]
        with self.assertRaisesRegex(RefuseToBuild, "27"):
            self.build(self.batch(snaps, self.bank()))

    def test_refuses_without_comparison_key_column(self):
        snaps = self.three()
        rows = [fx.export_row(s) for s in snaps] + self.bank()
        for r in rows:
            del r["comparison_key"]
        with self.assertRaisesRegex(RefuseToBuild, "migration"):
            self.build(fx.write_batch(self.dir, snaps, rows))

    def test_refuses_readback_before_migration(self):
        snaps = self.three()
        del snaps[0]["question"]["comparison_key"]
        with self.assertRaisesRegex(RefuseToBuild, "readback"):
            self.build(self.batch(snaps, self.bank()))

    def test_refuses_when_export_row_differs_from_readback(self):
        snaps = self.three()
        rows = [fx.export_row(s) for s in snaps] + self.bank()
        rows[0]["content_hash_v2"] = fx.hexn(99, 9)
        with self.assertRaisesRegex(RefuseToBuild, "export"):
            self.build(fx.write_batch(self.dir, snaps, rows))

    def test_refuses_seal_mismatch(self):
        snaps = self.three()
        seals = [fx.sealed(s) for s in snaps]
        seals[1]["content_hash_v2"] = fx.hexn(98, 9)
        with self.assertRaisesRegex(RefuseToBuild, "content_hash_v2"):
            self.build(self.batch(snaps, self.bank(), seals=seals))

    def test_refuses_table_mismatch(self):
        snaps = self.three()
        seals = [fx.sealed(s) for s in snaps]
        seals[0]["figure_table_data"] = {**fx.TABLE, "rows": [["Alder", "1907"]]}
        with self.assertRaisesRegex(RefuseToBuild, "figure_table_data"):
            self.build(self.batch(snaps, self.bank(), seals=seals))

    def test_refuses_already_published_or_flag_open(self):
        snaps = self.three()
        snaps[1]["keys"][0]["raw_model_response"]["student_publication_allowed"] = True
        with self.assertRaisesRegex(RefuseToBuild, "student_publication_allowed"):
            self.build(self.batch(snaps, self.bank()))

    def test_refuses_manifest_mismatch(self):
        snaps = self.three()
        seals = [fx.sealed(s) for s in snaps]
        seals[2]["answer_evidence"]["approved_tags"]["tag_binding_manifest_sha256"] = "d" * 64
        with self.assertRaisesRegex(RefuseToBuild, "manifest"):
            self.build(self.batch(snaps, self.bank(), seals=seals))

    def test_refuses_two_modules(self):
        snaps = self.three()
        snaps[2]["question"]["source_module"] = "M1"
        with self.assertRaisesRegex(RefuseToBuild, "one module"):
            self.build(self.batch(snaps, self.bank()))

    def test_refuses_bad_batch_name(self):
        with self.assertRaisesRegex(RefuseToBuild, "batch name"):
            self.build(self.batch(self.three(), self.bank()), name="Bad Name; DROP")


class RollbackTests(PublishTestCase):
    def test_rollback_restores_key(self):
        snaps = self.three()
        bundle = self.build(self.batch(snaps, self.bank()))
        rb = bundle["rollback_sql"]
        self.assertEqual(rb.count("DO $"), 3)
        self.assertEqual(rb.count("comparison_key=v->'question'->>'comparison_key' WHERE id=q.id;"), 3)
        self.assertNotIn("comparison_key=NULL", rb)
        for s in snaps:
            key = bundle["keys"][s["question"]["id"]]
            self.assertIn(f"OR q.comparison_key IS DISTINCT FROM '{key}'", rb)
        self.assertIn("publish_status='needs_human_review'", rb)
        self.assertIn("import_status='needs_review'", rb)
        self.assertIn("import_flag_reason=v->'question'->>'import_flag_reason'", rb)
        self.assertIn("raw_model_response=v->'keys'->0->'raw_model_response'", rb)
        self.assertIn("q.publish_status<>'publish_ready'", rb)
        self.assertNotRegex(rb, r"(?i)\bdelete\s+from\b")
        self.assertLess(rb.index("BEGIN;"), rb.index("DO $"))
        self.assertTrue(rb.rstrip().endswith("COMMIT;"))
        # undo in reverse order
        ids = [p[0]["question"]["id"] for p in payloads(rb)]
        self.assertEqual(ids, [s["question"]["id"] for s in reversed(snaps)])

    def test_rollback_restores_backfilled_key(self):
        snap = fx.snapshot(2, "Which choice best states the main idea of the made-up passage about otters?")
        key = comparison_key(readback_record(snap))
        snap["question"]["comparison_key"] = key  # staged row keyed by the backfill
        bundle = self.build(self.batch([snap], self.bank()))
        (item,) = payloads(bundle["rollback_sql"])[0]
        self.assertEqual(item["question"]["comparison_key"], key)
        self.assertIn("comparison_key=v->'question'->>'comparison_key' WHERE id=q.id;", bundle["rollback_sql"])

    def test_rollback_for_unkeyed_row_requires_null_key(self):
        img = fx.snapshot(4, "Which made-up graph shows the trend?", figure_kind="graph")
        bundle = self.build(self.batch([img], self.bank()))
        self.assertIn("OR q.comparison_key IS NOT NULL", bundle["rollback_sql"])


class FingerprintTests(PublishTestCase):
    def test_fingerprint_block_runs_first(self):
        paths = self.batch(self.three(), self.bank())
        doc = read_export_doc(paths["export"])
        sql = self.build(paths)["publish_sql"]
        first = sql.index("DO $")
        self.assertLess(sql.index("BEGIN;"), first)
        block = sql[first:sql.index("END $", first)]
        self.assertIn(FINGERPRINT_SQL, block)
        self.assertIn(f"IF n <> {doc.row_count} OR f IS DISTINCT FROM '{doc.fingerprint}'", block)
        self.assertIn("RAISE EXCEPTION 'bank changed since export; take a fresh export'", block)
        self.assertNotIn("v->'question'", block)
        self.assertNotIn("fingerprint", self.build(paths)["rollback_sql"].split("BEGIN;", 1)[1])

    def test_refuses_edited_export(self):
        paths = self.batch(self.three(), self.bank())
        doc = json.loads(paths["export"].read_text())
        doc["rows"][3]["publish_status"] = "needs_human_review"
        paths["export"].write_text(json.dumps(doc))
        with self.assertRaisesRegex(RefuseToBuild, "fingerprint"):
            self.build(paths)


class BackfillCheckTests(PublishTestCase):
    def test_refuses_unkeyed_bank_row(self):
        bank = self.bank()
        bank[1]["comparison_key"] = None
        bank[3]["comparison_key"] = None
        with self.assertRaisesRegex(RefuseToBuild, "2 keyable rows have no comparison_key") as cm:
            self.build(self.batch(self.three(), bank))
        self.assertIn(bank[1]["id"], cm.exception.reason)
        self.assertIn("backfill", cm.exception.reason)

    def test_refuses_key_drift(self):
        bank = self.bank()
        bank[2]["comparison_key"] = "kn-1:" + "0" * 64
        with self.assertRaisesRegex(RefuseToBuild, "1 rows have a stored comparison_key that differs") as cm:
            self.build(self.batch(self.three(), bank))
        self.assertIn(bank[2]["id"], cm.exception.reason)

    def test_unkeyable_bank_rows_may_stay_null(self):
        bank = self.bank()
        bank.append(fx.live_row(80, "Which made-up graph is shown?", other_choices(80), comparison_key=None,
                                figure_kind="graph"))
        bank.append(fx.live_row(81, "Bad letter made-up row?", other_choices(81), answer="E", comparison_key=None))
        bank.append(fx.live_row(82, "Format mismatch made-up row?", other_choices(82), comparison_key=None,
                                question_format="numeric_entry"))
        pre = self.build(self.batch(self.three(), bank))["precheck"]
        self.assertEqual(pre[NOT_COMPARABLE_ANSWER], [bank[-2]["id"]])
        self.assertEqual(pre[NOT_COMPARABLE_FORMAT], [bank[-1]["id"]])


class CliTests(PublishTestCase):
    def run_cli(self, paths, out):
        return subprocess.run(
            [sys.executable, "-I", str(CLI), "publish", "--batch", "syn-batch", "--readback", str(paths["readback"]),
             "--sealed", str(paths["sealed"]), "--export", str(paths["export"]), "--intents", str(paths["intents"]),
             "--out", str(out)], capture_output=True, text=True)

    def test_cli_writes_bundle(self):
        out = self.dir / "batches" / "syn-batch"
        r = self.run_cli(self.batch(self.three(), self.bank()), out)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(sorted(p.name for p in out.iterdir()),
                         ["keys.json", "precheck.json", "publish.sql", "rollback.sql"])
        keys = json.loads((out / "keys.json").read_text())
        self.assertEqual(len(keys), 3)
        self.assertTrue(json.loads((out / "precheck.json").read_text())["passed"])
        self.assertEqual([p for p in out.iterdir() if p.name.endswith(".tmp")], [])

    def test_cli_refusal_exits_1_and_writes_nothing(self):
        out = self.dir / "batches" / "syn-batch"
        r = self.run_cli(self.batch(self.three(), self.bank(), export_age=-60), out)
        self.assertEqual(r.returncode, 1)
        self.assertIn("refused", r.stderr)
        self.assertFalse(out.exists())


if __name__ == "__main__":
    unittest.main()
