import json
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path

from kimport import lane

CLI = Path(__file__).resolve().parent.parent / "kimport-cli.py"
LEDGER_REAL = Path("/Users/zakariabennis/Documents/Codex/2026-10-11/task-3/current-readiness-ledger.json")


def oid(exam, sec, mod, n):
    return f"{exam}_{sec}_M{mod}_Q{n:02d}"


def member(i, live=False, official=False, holds=0):
    return {"id": i, "source": "corpus", "is_live": live, "match": "exact", "spots": [],
            "printed_key": official, "holds": holds}


def settled(canon, others, **kw):
    mems = [dict(member(canon), match="canonical", **kw)] + [member(o) for o in others]
    return {"cluster_id": "kc-" + canon, "status": "settled", "canonical": canon, "members": mems}


def clusters_doc(cl):
    roles = {}
    for c in cl:
        for m in c["members"]:
            roles[m["id"]] = "canonical" if m["id"] == c["canonical"] else "member"
    return {"normalizer_version": "kn-1", "roles": roles, "clusters": cl}


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.lane = self.tmp / "lane.json"
        self.claims = self.tmp / "claims.json"
        self.clusters = self.tmp / "clusters.json"
        self.ledger = self.tmp / "ledger.json"

    def put(self, path, doc):
        path.write_text(json.dumps(doc))

    def items(self):
        return json.loads(self.lane.read_text())["items"]


class LaneTests(Base):
    def test_unknown_reason_rejected(self):
        with self.assertRaises(ValueError):
            lane.set_aside(self.lane, "X", "because", "d", "t")
        self.assertFalse(self.lane.exists())

    def test_set_aside_creates_open_entry(self):
        lane.set_aside(self.lane, "X", "needs_figure", "no chart", "t1")
        it = self.items()["X"]
        self.assertEqual((it["reason"], it["status"], it["since"], it["detail"], it["attempts"]),
                         ("needs_figure", "open", "t1", "no chart", []))
        self.assertEqual(list(self.tmp.glob("lane.json.*")), [])

    def test_two_different_methods_park(self):
        lane.set_aside(self.lane, "X", "no_answer_key", "d", "t0")
        lane.record_attempt(self.lane, "X", "solve-a", False, "t1")
        self.assertEqual(self.items()["X"]["status"], "open")
        lane.record_attempt(self.lane, "X", "solve-b", False, "t2")
        self.assertEqual(self.items()["X"]["status"], "parked")

    def test_same_method_twice_does_not_park(self):
        lane.set_aside(self.lane, "X", "no_answer_key", "d", "t0")
        lane.record_attempt(self.lane, "X", "solve-a", False, "t1")
        lane.record_attempt(self.lane, "X", "solve-a", False, "t2")
        lane.record_attempt(self.lane, "X", "solve-a", False, "t3")
        it = self.items()["X"]
        self.assertEqual(it["status"], "open")
        self.assertEqual(len(it["attempts"]), 3)

    def test_ok_attempt_resolves(self):
        lane.set_aside(self.lane, "X", "no_answer_key", "d", "t0")
        lane.record_attempt(self.lane, "X", "solve-a", True, "t1")
        self.assertEqual(self.items()["X"]["status"], "resolved")

    def test_failed_attempt_on_resolved_item_reopens_it(self):
        lane.set_aside(self.lane, "X", "needs_figure", "d", "t0")
        lane.record_attempt(self.lane, "X", "m1", True, "t1")
        self.assertEqual(lane.record_attempt(self.lane, "X", "m2", False, "t2"), "open")
        self.assertEqual(self.items()["X"]["status"], "open")

    def test_set_aside_on_parked_item_stays_parked(self):
        lane.set_aside(self.lane, "X", "needs_figure", "d", "t0")
        lane.record_attempt(self.lane, "X", "m1", False, "t1")
        lane.record_attempt(self.lane, "X", "m2", False, "t2")
        lane.set_aside(self.lane, "X", "needs_figure", "seen again", "t3")
        it = self.items()["X"]
        self.assertEqual((it["status"], it["detail"], len(it["attempts"])), ("parked", "seen again", 3))
        self.assertEqual(it["attempts"][-1]["method"], "set_aside")
        lane.requeue(self.lane, "needs_figure")
        self.assertEqual(self.items()["X"]["status"], "open")

    def test_attempt_on_unknown_item_raises(self):
        lane.set_aside(self.lane, "X", "needs_figure", "d", "t0")
        with self.assertRaises(ValueError):
            lane.record_attempt(self.lane, "Y", "m", False, "t")

    def test_requeue_returns_parked_and_open_keeps_history(self):
        lane.set_aside(self.lane, "A", "needs_figure", "d", "t0")
        lane.set_aside(self.lane, "B", "needs_figure", "d", "t0")
        lane.set_aside(self.lane, "C", "needs_figure", "d", "t0")
        lane.set_aside(self.lane, "D", "no_answer_key", "d", "t0")
        lane.record_attempt(self.lane, "A", "m1", False, "t1")
        lane.record_attempt(self.lane, "A", "m2", False, "t2")
        lane.record_attempt(self.lane, "C", "m1", True, "t1")   # resolved stays resolved
        self.assertEqual(self.items()["A"]["status"], "parked")
        got = lane.requeue(self.lane, "needs_figure")
        self.assertEqual(got, ["A", "B"])
        it = self.items()
        self.assertEqual((it["A"]["status"], it["C"]["status"], it["D"]["status"]),
                         ("open", "resolved", "open"))
        self.assertEqual(len(it["A"]["attempts"]), 2)

    def test_requeue_gives_a_fresh_two_method_count(self):
        lane.set_aside(self.lane, "A", "needs_figure", "d", "t0")
        lane.record_attempt(self.lane, "A", "m1", False, "t1")
        lane.record_attempt(self.lane, "A", "m2", False, "t2")
        lane.requeue(self.lane, "needs_figure")
        lane.record_attempt(self.lane, "A", "m3", False, "t3")
        self.assertEqual(self.items()["A"]["status"], "open")
        lane.record_attempt(self.lane, "A", "m4", False, "t4")
        self.assertEqual(self.items()["A"]["status"], "parked")

    def test_requeue_unknown_reason_rejected(self):
        with self.assertRaises(ValueError):
            lane.requeue(self.lane, "nope")

    def test_lint_attempts_do_not_count_toward_parking(self):
        lane.set_aside(self.lane, "X", "extraction_repair", "d", "t0")
        lane.record_attempt(self.lane, "X", "lint", False, "t1")
        lane.record_attempt(self.lane, "X", "recrop", False, "t2")
        self.assertEqual(self.items()["X"]["status"], "open")

    def test_set_aside_again_merges_and_reopens(self):
        lane.set_aside(self.lane, "X", "needs_figure", "d1", "t0")
        lane.record_attempt(self.lane, "X", "m1", True, "t1")
        lane.set_aside(self.lane, "X", "asset_hold", "d2", "t2")
        it = self.items()["X"]
        self.assertEqual((it["status"], it["reason"], it["since"], it["detail"]),
                         ("open", "asset_hold", "t0", "d2"))
        self.assertEqual(len(it["attempts"]), 2)

    def test_corrupt_lane_refuses(self):
        self.lane.write_text("{nope")
        with self.assertRaises(ValueError):
            lane.set_aside(self.lane, "X", "needs_figure", "d", "t")

    def test_summary_counts_and_oldest_age(self):
        lane.set_aside(self.lane, "A", "needs_figure", "d", "2026-10-10T00:00:00Z")
        lane.set_aside(self.lane, "B", "needs_figure", "d", "2026-10-15T12:00:00Z")
        lane.set_aside(self.lane, "C", "no_answer_key", "d", "2026-10-19T00:00:00Z")
        lane.record_attempt(self.lane, "B", "m1", False, "2026-10-16T00:00:00Z")
        lane.record_attempt(self.lane, "B", "m2", False, "2026-10-16T00:00:00Z")
        lane.record_attempt(self.lane, "C", "m1", True, "2026-10-19T01:00:00Z")
        s = lane.summary(self.lane, "2026-10-20T00:00:00Z")
        self.assertEqual(s["by_reason"]["needs_figure"], {"open": 1, "parked": 1, "resolved": 0})
        self.assertEqual(s["by_reason"]["no_answer_key"], {"open": 0, "parked": 0, "resolved": 1})
        self.assertEqual(s["oldest_since"]["needs_figure"], "2026-10-10T00:00:00Z")
        self.assertEqual(s["oldest_age_days"]["needs_figure"], 10.0)
        self.assertIsNone(s["oldest_since"]["no_answer_key"])   # only resolved items
        self.assertEqual(s["total"], 3)

    def test_summary_missing_lane_is_empty(self):
        s = lane.summary(self.lane, "2026-10-20T00:00:00Z")
        self.assertEqual(s["total"], 0)


class LockTests(Base):
    def test_dead_pid_lock_is_broken(self):
        lock = self.tmp / "lane.json.lock"
        lock.write_text(json.dumps({"pid": 2 ** 22 + 12345, "host": __import__("socket").gethostname(), "at": "t"}))
        lane.set_aside(self.lane, "X", "needs_figure", "d", "t")
        self.assertIn("X", self.items())
        self.assertFalse(lock.exists())

    def test_old_lock_is_broken(self):
        import os
        lock = self.tmp / "lane.json.lock"
        lock.write_text(json.dumps({"pid": os.getpid(), "host": "other-host", "at": "t"}))
        os.utime(lock, (1, 1))
        lane.set_aside(self.lane, "X", "needs_figure", "d", "t")
        self.assertIn("X", self.items())

    def test_live_fresh_lock_blocks(self):
        import os
        lock = self.tmp / "lane.json.lock"
        lock.write_text(json.dumps({"pid": os.getpid(), "host": __import__("socket").gethostname(), "at": "t"}))
        old = lane._LOCK_WAIT_SECONDS
        lane._LOCK_WAIT_SECONDS = 0.1
        try:
            with self.assertRaises(ValueError) as cm:
                lane.set_aside(self.lane, "X", "needs_figure", "d", "t")
        finally:
            lane._LOCK_WAIT_SECONDS = old
        self.assertIn("lane unlock", str(cm.exception))
        self.assertTrue(lock.exists())

    def test_lock_records_pid_host_at_and_unlock_removes(self):
        with lane._FileLock(self.lane) as lk:
            info = json.loads(lk.path.read_text())
            self.assertEqual(set(info), {"pid", "host", "at"})
            self.assertTrue(lane.unlock(self.lane))
        self.assertFalse(lane.unlock(self.lane))


class PromoteTests(Base):
    def test_parked_canonical_promotes_member(self):
        self.put(self.clusters, clusters_doc([settled("E_RW_M1_Q01", ["E_RW_M1_Q02", "F_RW_M1_Q01"])]))
        new = lane.promote_next_member(self.clusters, "E_RW_M1_Q01")
        # lowest ref among equal members wins (corpus.elect)
        self.assertEqual(new, "E_RW_M1_Q02")
        doc = json.loads(self.clusters.read_text())
        c = doc["clusters"][0]
        self.assertEqual(c["canonical"], "E_RW_M1_Q02")
        self.assertEqual(doc["roles"]["E_RW_M1_Q02"], "canonical")
        self.assertEqual(doc["roles"]["E_RW_M1_Q01"], "member")
        by = {m["id"]: m["match"] for m in c["members"]}
        self.assertEqual(by["E_RW_M1_Q02"], "canonical")
        self.assertNotEqual(by["E_RW_M1_Q01"], "canonical")
        self.assertEqual(list(self.tmp.glob("clusters.json.*")), [])

    def test_election_prefers_printed_key(self):
        cl = settled("A_Q01", ["A_Q02", "A_Q03"])
        cl["members"][2]["printed_key"] = True
        self.put(self.clusters, clusters_doc([cl]))
        self.assertEqual(lane.promote_next_member(self.clusters, "A_Q01"), "A_Q03")

    def test_no_member_returns_none_and_changes_nothing(self):
        self.put(self.clusters, clusters_doc([settled("A_Q01", [])]))
        before = self.clusters.read_text()
        self.assertIsNone(lane.promote_next_member(self.clusters, "A_Q01"))
        self.assertEqual(self.clusters.read_text(), before)

    def test_members_in_the_lane_are_skipped(self):
        self.put(self.clusters, clusters_doc([settled("A_Q01", ["A_Q02", "A_Q03", "A_Q04"])]))
        lane.set_aside(self.lane, "A_Q02", "needs_figure", "d", "t")
        lane.set_aside(self.lane, "A_Q03", "needs_figure", "d", "t")
        lane.record_attempt(self.lane, "A_Q03", "a", False, "t")
        lane.record_attempt(self.lane, "A_Q03", "b", False, "t")
        self.assertEqual(lane.promote_next_member(self.clusters, "A_Q01", self.lane), "A_Q04")

    def test_not_a_canonical_returns_none(self):
        self.put(self.clusters, clusters_doc([settled("A_Q01", ["A_Q02"])]))
        self.assertIsNone(lane.promote_next_member(self.clusters, "A_Q02"))
        self.assertIsNone(lane.promote_next_member(self.clusters, "ZZZ"))

    def test_held_statuses_never_promote(self):
        for status in ("live_elsewhere", "figure_review", "founder_review", "pending_answer_dispute"):
            c = settled("A_Q01", ["A_Q02"])
            c["status"] = status
            self.put(self.clusters, clusters_doc([c]))
            before = self.clusters.read_text()
            self.assertIsNone(lane.promote_next_member(self.clusters, "A_Q01"), status)
            self.assertEqual(self.clusters.read_text(), before)

    def test_only_member_role_members_are_candidates(self):
        c = settled("A_Q01", ["A_Q02", "A_Q03"])
        doc = clusters_doc([c])
        doc["roles"]["A_Q02"] = "founder_review"
        self.put(self.clusters, doc)
        self.assertEqual(lane.promote_next_member(self.clusters, "A_Q01"), "A_Q03")

    def test_live_member_beats_corpus_member(self):
        c = settled("A_Q01", ["A_Q02", "A_Q03"])
        c["members"][2]["is_live"] = True
        self.put(self.clusters, clusters_doc([c]))
        self.assertEqual(lane.promote_next_member(self.clusters, "A_Q01"), "A_Q03")


def ledger_doc(entries):
    return {"items": [{"id": i, "bucket": b, "final_category": f, "holds": []} for i, b, f in entries]}


class SliceTests(Base):
    def setup_bank(self):
        e = "2025-10_US_V1"
        ids = [oid(e, "MATH", 1, n) for n in range(1, 41)]
        self.ids = ids
        self.put(self.clusters, clusters_doc([settled(i, []) for i in ids]))
        self.put(self.ledger, ledger_doc([(i, "awaiting_evidence", None) for i in ids]))

    def test_slice_canonicals_only(self):
        self.setup_bank()
        doc = json.loads(self.clusters.read_text())
        doc["roles"][self.ids[0]] = "member"
        doc["roles"][self.ids[1]] = "founder_review"
        self.put(self.clusters, doc)
        got = lane.next_slice(self.clusters, self.lane, self.ledger, "r1", claims_path=self.claims, now="t")
        self.assertNotIn(self.ids[0], got)
        self.assertNotIn(self.ids[1], got)
        self.assertEqual(len(got), 27)

    def test_slices_disjoint_between_reviewers(self):
        self.setup_bank()
        a = lane.next_slice(self.clusters, self.lane, self.ledger, "r1", claims_path=self.claims, now="t")
        b = lane.next_slice(self.clusters, self.lane, self.ledger, "r2", claims_path=self.claims, now="t")
        self.assertFalse(set(a) & set(b))
        self.assertEqual(len(a), 27)
        self.assertEqual(len(b), 13)

    def test_same_reviewer_asking_twice_gets_new_items(self):
        self.setup_bank()
        a = lane.next_slice(self.clusters, self.lane, self.ledger, "r1", size=5, claims_path=self.claims, now="t1")
        b = lane.next_slice(self.clusters, self.lane, self.ledger, "r1", size=5, claims_path=self.claims, now="t2")
        self.assertFalse(set(a) & set(b))
        claims = json.loads(self.claims.read_text())
        self.assertEqual(claims["r1"]["claimed"], a + b)
        self.assertEqual(claims["r1"]["at"], "t2")

    def test_lane_live_and_claimed_skipped(self):
        self.setup_bank()
        lane.set_aside(self.lane, self.ids[0], "needs_figure", "d", "t")
        lane.set_aside(self.lane, self.ids[1], "needs_figure", "d", "t")
        lane.record_attempt(self.lane, self.ids[1], "a", False, "t")
        lane.record_attempt(self.lane, self.ids[1], "b", False, "t")   # parked
        lane.set_aside(self.lane, self.ids[2], "needs_figure", "d", "t")
        lane.record_attempt(self.lane, self.ids[2], "a", True, "t")    # resolved: not excluded
        led = ledger_doc([(i, "awaiting_evidence", None) for i in self.ids])
        led["items"][3]["bucket"] = "already_live"
        led["items"][4]["bucket"] = "held"
        led["items"][4]["final_category"] = "LIVE"
        self.put(self.ledger, led)
        got = lane.next_slice(self.clusters, self.lane, self.ledger, "r1", size=100, claims_path=self.claims, now="t")
        for skipped in self.ids[:2] + self.ids[3:5]:
            self.assertNotIn(skipped, got)
        self.assertIn(self.ids[2], got)

    def test_oldest_unreviewed_first_and_one_module(self):
        e1, e2 = "2025-05_US_V1", "2025-10_US_V1"
        a = [oid(e1, "RW", 2, n) for n in (3, 1, 2)]          # held bucket (reviewed before)
        b = [oid(e2, "MATH", 1, n) for n in (10, 2)]          # awaiting_evidence, later exam
        c = [oid(e2, "MATH", 2, 1), oid(e2, "RW", 1, 1)]      # awaiting_evidence, other modules
        ids = a + b + c
        self.put(self.clusters, clusters_doc([settled(i, []) for i in ids]))
        led = ledger_doc([(i, "held", None) for i in a] + [(i, "awaiting_evidence", None) for i in b + c])
        self.put(self.ledger, led)
        got = lane.next_slice(self.clusters, self.lane, self.ledger, "r1", claims_path=self.claims, now="t")
        # awaiting_evidence first; exam then section/module then number; one module only
        self.assertEqual(got, [oid(e2, "MATH", 1, 2), oid(e2, "MATH", 1, 10)])
        got2 = lane.next_slice(self.clusters, self.lane, self.ledger, "r2", claims_path=self.claims, now="t")
        self.assertEqual(got2, [oid(e2, "MATH", 2, 1)])
        got3 = lane.next_slice(self.clusters, self.lane, self.ledger, "r1", claims_path=self.claims, now="t")
        self.assertEqual(got3, [oid(e2, "RW", 1, 1)])
        got4 = lane.next_slice(self.clusters, self.lane, self.ledger, "r1", claims_path=self.claims, now="t")
        self.assertEqual(got4, [oid(e1, "RW", 2, 1), oid(e1, "RW", 2, 2), oid(e1, "RW", 2, 3)])

    def test_retained_suffix_ids_parse_and_group_with_their_module(self):
        e = "2026-08_ASIA_V3"
        ids = [f"{e}_RW_M1_Q01_retained", f"{e}_RW_M1_Q02", f"{e}_RW_M1_Q03_retained"]
        self.assertEqual(lane.parse_id(ids[0])[:4], (e, "RW", "1", 1))
        self.put(self.clusters, clusters_doc([settled(i, []) for i in ids]))
        self.put(self.ledger, ledger_doc([(i, "awaiting_evidence", None) for i in ids]))
        got = lane.next_slice(self.clusters, self.lane, self.ledger, "r1", claims_path=self.claims, now="t")
        self.assertEqual(got, ids)

    def test_certified_broken_and_duplicate_excluded(self):
        ids = [oid("2025-10_US_V1", "RW", 1, n) for n in (1, 2, 3)]
        self.put(self.clusters, clusters_doc([settled(i, []) for i in ids]))
        self.put(self.ledger, ledger_doc([(ids[0], "certified_broken", None), (ids[1], "certified_duplicate", None),
                                          (ids[2], "held", None)]))
        got = lane.next_slice(self.clusters, self.lane, self.ledger, "r1", claims_path=self.claims, now="t")
        self.assertEqual(got, [ids[2]])

    def test_exam_order_is_chronological_id_order(self):
        ids = [oid("2025-10_US_V1", "RW", 1, 1), oid("2024-12_US_V1", "RW", 1, 1)]
        self.put(self.clusters, clusters_doc([settled(i, []) for i in ids]))
        self.put(self.ledger, ledger_doc([(i, "awaiting_evidence", None) for i in ids]))
        got = lane.next_slice(self.clusters, self.lane, self.ledger, "r1", claims_path=self.claims, now="t")
        self.assertEqual(got, [ids[1]])

    def test_canonical_missing_from_ledger_skipped(self):
        self.put(self.clusters, clusters_doc([settled("LIVE-ROW-1", []), settled("2025-10_US_V1_RW_M1_Q01", [])]))
        self.put(self.ledger, ledger_doc([("2025-10_US_V1_RW_M1_Q01", "awaiting_evidence", None)]))
        got = lane.next_slice(self.clusters, self.lane, self.ledger, "r1", claims_path=self.claims, now="t")
        self.assertEqual(got, ["2025-10_US_V1_RW_M1_Q01"])

    def test_empty_when_nothing_left(self):
        self.setup_bank()
        lane.next_slice(self.clusters, self.lane, self.ledger, "r1", size=100, claims_path=self.claims, now="t")
        self.assertEqual(lane.next_slice(self.clusters, self.lane, self.ledger, "r2",
                                         claims_path=self.claims, now="t"), [])

    def test_threads_never_get_the_same_item(self):
        self.setup_bank()
        results = {}

        def go(name):
            results[name] = lane.next_slice(self.clusters, self.lane, self.ledger, name, size=5,
                                            claims_path=self.claims, now="t")
        ts = [threading.Thread(target=go, args=(f"r{i}",)) for i in range(6)]
        [t.start() for t in ts]
        [t.join() for t in ts]
        flat = [i for v in results.values() for i in v]
        self.assertEqual(len(flat), 30)
        self.assertEqual(len(set(flat)), 30)

    def test_release_and_release_done(self):
        self.setup_bank()
        a = lane.next_slice(self.clusters, self.lane, self.ledger, "r1", size=4, claims_path=self.claims, now="t")
        b = lane.next_slice(self.clusters, self.lane, self.ledger, "r2", size=4, claims_path=self.claims, now="t")
        self.assertEqual(lane.release(self.claims, "r1"), a)
        self.assertNotIn("r1", json.loads(self.claims.read_text()))
        again = lane.next_slice(self.clusters, self.lane, self.ledger, "r3", size=4, claims_path=self.claims, now="t")
        self.assertEqual(again, a)
        # b[0] became live, b[1] resolved in the lane; b[2], b[3] still pending
        led = ledger_doc([(i, "awaiting_evidence", None) for i in self.ids])
        led["items"][self.ids.index(b[0])]["bucket"] = "already_live"
        self.put(self.ledger, led)
        lane.set_aside(self.lane, b[1], "needs_figure", "d", "t")
        lane.record_attempt(self.lane, b[1], "m", True, "t")
        dropped = lane.release_done(self.claims, self.lane, self.ledger)
        self.assertEqual(sorted(dropped), sorted(b[:2]))
        self.assertEqual(json.loads(self.claims.read_text())["r2"]["claimed"], b[2:])

    @unittest.skipUnless(LEDGER_REAL.exists(), "real ledger not present")
    def test_real_ledger_slices_are_disjoint(self):
        led = json.loads(LEDGER_REAL.read_text())
        ids = [i["id"] for i in led["items"] if i["bucket"] != "already_live"]
        self.put(self.clusters, clusters_doc([settled(i, []) for i in ids]))
        a = lane.next_slice(self.clusters, self.lane, LEDGER_REAL, "r1", claims_path=self.claims, now="t")
        b = lane.next_slice(self.clusters, self.lane, LEDGER_REAL, "r2", claims_path=self.claims, now="t")
        self.assertTrue(0 < len(a) <= 27)   # a real module holds 22 or 27 questions
        self.assertFalse(set(a) & set(b))
        for i in led["items"]:
            if i["bucket"] == "awaiting_evidence":
                self.assertNotEqual(lane.parse_id(i["id"])[0], "~", i["id"])
        modules = {lane.parse_id(i)[:3] for i in a}
        self.assertEqual(len(modules), 1)
        by_id = {i["id"]: i for i in led["items"]}
        self.assertTrue(all(by_id[i]["bucket"] == "awaiting_evidence" for i in a))


class LaneCliTests(Base):
    def run_cli(self, *args):
        return subprocess.run([sys.executable, "-I", str(CLI), *args], capture_output=True, text=True)

    def test_cli_round_trip(self):
        lp = str(self.lane)
        r = self.run_cli("lane", "set-aside", "--lane", lp, "--id", "X", "--reason", "needs_figure",
                         "--detail", "d", "--now", "2026-10-10T00:00:00Z")
        self.assertEqual(r.returncode, 0, r.stderr)
        r = self.run_cli("lane", "set-aside", "--lane", lp, "--id", "X", "--reason", "bogus",
                         "--detail", "d", "--now", "t")
        self.assertEqual(r.returncode, 1)
        self.assertIn("reason", r.stderr)
        for m in ("a", "b"):
            r = self.run_cli("lane", "attempt", "--lane", lp, "--id", "X", "--method", m, "--failed",
                             "--now", "2026-10-11T00:00:00Z")
            self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("parked", r.stdout)
        r = self.run_cli("lane", "requeue", "--lane", lp, "--reason", "needs_figure")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("1 requeued", r.stdout)
        r = self.run_cli("lane", "summary", "--lane", lp, "--now", "2026-10-20T00:00:00Z")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("needs_figure", r.stdout)
        self.assertEqual(self.items()["X"]["status"], "open")

    def test_cli_broken_without_clusters_refused_and_unlock(self):
        r = self.run_cli("lane", "set-aside", "--lane", str(self.lane), "--id", "X",
                         "--reason", "broken_or_excluded", "--detail", "d", "--now", "t")
        self.assertEqual(r.returncode, 1)
        self.assertIn("--clusters", r.stderr)
        self.assertFalse(self.lane.exists())
        (self.tmp / "lane.json.lock").write_text("{}")
        r = self.run_cli("lane", "unlock", "--path", str(self.lane))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertFalse((self.tmp / "lane.json.lock").exists())

    def test_cli_parked_canonical_promotes_when_clusters_given(self):
        self.put(self.clusters, clusters_doc([settled("2025-10_US_V1_RW_M1_Q01", ["2025-10_US_V1_RW_M1_Q02"])]))
        lp, cp = str(self.lane), str(self.clusters)
        self.run_cli("lane", "set-aside", "--lane", lp, "--id", "2025-10_US_V1_RW_M1_Q01",
                     "--reason", "no_answer_key", "--detail", "d", "--now", "t")
        for m in ("a", "b"):
            r = self.run_cli("lane", "attempt", "--lane", lp, "--id", "2025-10_US_V1_RW_M1_Q01", "--method", m,
                             "--failed", "--now", "t", "--clusters", cp)
        self.assertIn("promoted 2025-10_US_V1_RW_M1_Q02", r.stdout)
        self.assertEqual(json.loads(self.clusters.read_text())["clusters"][0]["canonical"],
                         "2025-10_US_V1_RW_M1_Q02")

    def test_cli_slice_release(self):
        ids = [oid("2025-10_US_V1", "RW", 1, n) for n in range(1, 6)]
        self.put(self.clusters, clusters_doc([settled(i, []) for i in ids]))
        self.put(self.ledger, ledger_doc([(i, "awaiting_evidence", None) for i in ids]))
        common = ["--clusters", str(self.clusters), "--lane", str(self.lane), "--ledger", str(self.ledger),
                  "--claims", str(self.claims)]
        r1 = self.run_cli("slice", "--reviewer", "r1", "--size", "3", "--now", "t", *common)
        r2 = self.run_cli("slice", "--reviewer", "r2", "--size", "3", "--now", "t", *common)
        a, b = r1.stdout.split(), r2.stdout.split()
        self.assertEqual((len(a), len(b)), (3, 2), r1.stderr + r2.stderr)
        self.assertFalse(set(a) & set(b))
        r = self.run_cli("slice", "--release", "--reviewer", "r1", "--claims", str(self.claims))
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("released 3", r.stdout)
        r = self.run_cli("slice", "--release-done", "--claims", str(self.claims), "--lane", str(self.lane),
                         "--ledger", str(self.ledger))
        self.assertEqual(r.returncode, 0, r.stderr)


if __name__ == "__main__":
    unittest.main()
