"""Founder yes/no page: render_pairs and apply_decisions (synthetic data only)."""

import json
import tempfile
import unittest
from collections import Counter
from pathlib import Path

import importlib.util

from kimport import corpus, pairs_page
from tests.corpus_fixtures import build_tree, mc
from kimport.normalize import NORMALIZER_VERSION


def side(i, cid, text, live=False, choices=("alpha", "beta", "gamma", "delta"), answer="alpha"):
    return {"id": f"x{i}", "cluster_id": cid, "is_live": live, "text": text, "choices": list(choices),
            "answer": answer, "answer_format": "mc"}


def member(i, match="canonical", live=False, **kw):
    return {"id": f"x{i}", "source": "live" if live else "corpus", "is_live": live, "match": match,
            "spots": [], **kw}


def cluster_doc(ids, pairs_by_cluster=None, live=(), status="settled"):
    """ids: {cluster_id: [member ints, canonical first]}"""
    pairs_by_cluster = pairs_by_cluster or {}
    clusters, roles = [], {}
    for cid, ints in ids.items():
        mems = [member(n, "canonical" if k == 0 else "exact", live=n in live) for k, n in enumerate(ints)]
        c = {"cluster_id": cid, "status": status, "canonical": f"x{ints[0]}", "keeper_tie": False,
             "is_live": any(n in live for n in ints), "members": mems,
             "founder_pairs": list(pairs_by_cluster.get(cid, []))}
        clusters.append(c)
        for k, n in enumerate(ints):
            roles[f"x{n}"] = ("founder_review" if c["founder_pairs"] and n not in live else "canonical") \
                if k == 0 else "member"
    return {"normalizer_version": NORMALIZER_VERSION, "counts": {"unique": len(ids), "unique_not_live": len(ids),
            "clusters_settled": len(ids), "roles": dict(Counter(roles.values()))},
            "roles": roles, "clusters": clusters, "unparsed": []}


def pair(pid, a, b, ca, cb, ta="What is two plus two?", tb="What is two plus three?", live=()):
    return {"pair_id": pid, "ratio": 0.95, "answer": "alpha",
            "canonical": side(a, ca, ta, a in live), "member": side(b, cb, tb, b in live)}


class Base(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())

    def write(self, name, obj):
        p = self.dir / name
        p.write_text(json.dumps(obj), encoding="utf-8")
        return p

    def pairs_file(self, pairs):
        return self.write("founder_pairs.json", {"normalizer_version": NORMALIZER_VERSION, "ratio_threshold": 0.9,
                                                 "pair_count": len(pairs), "pairs": pairs})

    def load(self, p):
        return json.loads(Path(p).read_text(encoding="utf-8"))


class RenderTests(Base):
    def render(self, pairs):
        out = self.dir / "page.html"
        n = pairs_page.render_pairs(self.pairs_file(pairs), out)
        return n, out.read_text(encoding="utf-8")

    def test_escapes_html(self):
        p = pair("fp-1", 1, 2, "kc-1", "kc-2", ta="Q <script>alert(1)</script> & more", tb="Q <b>x</b> more")
        _, html = self.render([p])
        self.assertNotIn("<script>alert", html)
        self.assertIn("&lt;script&gt;alert(1)&lt;/script&gt;", html)
        self.assertNotIn("<b>x</b>", html)

    def test_escapes_ids_and_choices(self):
        p = pair("fp-1", 1, 2, "kc-1", "kc-2")
        p["canonical"]["choices"] = ["<img src=x onerror=1>", "b", "c", "d"]
        p["canonical"]["id"] = "<i>id</i>"
        _, html = self.render([p])
        self.assertNotIn("<img src=x", html)
        self.assertNotIn("<i>id</i>", html)

    def test_count(self):
        pairs = [pair(f"fp-{n}", 2 * n, 2 * n + 1, f"a{n}", f"b{n}") for n in range(1, 4)]
        n, html = self.render(pairs)
        self.assertEqual(n, 3)
        self.assertEqual(html.count('<article class="pair" data-pair="fp-'), 3)
        self.assertIn("of 3 answered", html)

    def test_differences_highlighted(self):
        _, html = self.render([pair("fp-1", 1, 2, "a", "b")])
        self.assertIn("<mark>three?</mark>", html)
        self.assertIn("<mark>two?</mark>", html)

    def test_identical_has_no_mark(self):
        p = pair("fp-1", 1, 2, "a", "b", ta="same text", tb="same text")
        _, html = self.render([p])
        body = html.split('data-pair="fp-1"', 1)[1]
        self.assertNotIn("<mark>", body)

    def test_choice_difference_marked(self):
        p = pair("fp-1", 1, 2, "a", "b", ta="s", tb="s")
        p["member"]["choices"] = ["alpha", "beta", "gamma", "deltas"]
        _, html = self.render([p])
        self.assertIn("<mark>deltas</mark>", html)

    def test_self_contained(self):
        _, html = self.render([pair("fp-1", 1, 2, "a", "b")])
        for bad in ("http://", "https://", "<script src", "<link ", "@import", "fetch(", "XMLHttpRequest"):
            self.assertNotIn(bad, html)
        self.assertIn("prefers-color-scheme: dark", html)
        self.assertIn("Copy my answers", html)
        self.assertIn("localStorage", html)
        self.assertIn("<textarea", html)
        self.assertIn("Same", html)
        self.assertIn("Different", html)
        self.assertIn("Same = a student would see the same question", html)

    def test_pair_ids_embedded_as_json_safely(self):
        p = pair("fp-</script>", 1, 2, "a", "b")
        _, html = self.render([p])
        self.assertNotIn("</script>\"", html)
        self.assertEqual(html.count("</script>"), 2)  # data block + code block only

    def test_zero_pairs(self):
        n, html = self.render([])
        self.assertEqual(n, 0)
        self.assertIn("0 of 0 answered", html)

    def test_numeric_answer_shown(self):
        p = pair("fp-1", 1, 2, "a", "b")
        for s in ("canonical", "member"):
            p[s].update(answer_format="numeric", choices=[], answer="0.5")
        _, html = self.render([p])
        self.assertIn("0.5", html)


class ApplyTests(Base):
    def run_apply(self, pairs, clusters, decisions):
        pp, dp = self.pairs_file(pairs), self.write("d.json", decisions)
        cp = self.write("clusters.json", clusters)
        pairs_page.apply_decisions(pp, dp, cp)
        return self.load(cp)

    def basic(self):
        pairs = [pair("fp-1", 1, 2, "ca", "cb")]
        clusters = cluster_doc({"ca": [1], "cb": [2]}, {"ca": ["fp-1"], "cb": ["fp-1"]})
        return pairs, clusters

    def by_id(self, doc):
        return {c["cluster_id"]: c for c in doc["clusters"]}

    def test_apply_same_and_different(self):
        pairs = [pair("fp-1", 1, 2, "ca", "cb"), pair("fp-2", 3, 4, "cc", "cd")]
        clusters = cluster_doc({"ca": [1], "cb": [2], "cc": [3], "cd": [4]},
                               {"ca": ["fp-1"], "cb": ["fp-1"], "cc": ["fp-2"], "cd": ["fp-2"]})
        doc = self.run_apply(pairs, clusters, {"fp-1": "same", "fp-2": "different"})
        cl = self.by_id(doc)
        self.assertNotIn("cb", cl)
        self.assertEqual([m["id"] for m in cl["ca"]["members"]], ["x1", "x2"])
        self.assertEqual(cl["ca"]["members"][1]["duplicate_of"], "x1")
        self.assertEqual(cl["ca"]["canonical"], "x1")
        self.assertEqual(doc["roles"]["x1"], "canonical")
        self.assertEqual(doc["roles"]["x2"], "member")
        self.assertEqual((doc["roles"]["x3"], doc["roles"]["x4"]), ("canonical", "canonical"))
        self.assertEqual(cl["cc"]["canonical"], "x3")
        self.assertEqual(cl["cd"]["canonical"], "x4")
        self.assertEqual(cl["cc"]["founder_pairs"], [])
        self.assertEqual(doc["normalizer_version"], NORMALIZER_VERSION)
        self.assertEqual(doc["counts"]["roles"], dict(Counter(doc["roles"].values())))

    def test_undecided_stays_blocked(self):
        pairs, clusters = self.basic()
        doc = self.run_apply(pairs, clusters, {})
        self.assertEqual((doc["roles"]["x1"], doc["roles"]["x2"]), ("founder_review", "founder_review"))
        self.assertEqual(self.by_id(doc)["ca"]["founder_pairs"], ["fp-1"])

    def test_partial_decision_keeps_other_pair_blocked(self):
        pairs = [pair("fp-1", 1, 2, "ca", "cb"), pair("fp-2", 1, 3, "ca", "cc")]
        clusters = cluster_doc({"ca": [1], "cb": [2], "cc": [3]},
                               {"ca": ["fp-1", "fp-2"], "cb": ["fp-1"], "cc": ["fp-2"]})
        doc = self.run_apply(pairs, clusters, {"fp-1": "different"})
        self.assertEqual(doc["roles"]["x1"], "founder_review")
        self.assertEqual(doc["roles"]["x2"], "canonical")
        self.assertEqual(doc["roles"]["x3"], "founder_review")

    def test_idempotent(self):
        pairs = [pair("fp-1", 1, 2, "ca", "cb"), pair("fp-2", 3, 4, "cc", "cd")]
        clusters = cluster_doc({"ca": [1], "cb": [2], "cc": [3], "cd": [4]},
                               {"ca": ["fp-1"], "cb": ["fp-1"], "cc": ["fp-2"], "cd": ["fp-2"]})
        d = {"fp-1": "same", "fp-2": "different"}
        first = self.run_apply(pairs, clusters, d)
        second = self.run_apply(pairs, first, d)
        self.assertEqual(first, second)
        third = self.run_apply(pairs, second, {})
        self.assertEqual(second, third)

    def test_unknown_pair_rejected_and_nothing_written(self):
        pairs, clusters = self.basic()
        cp = self.write("clusters.json", clusters)
        before = cp.read_bytes()
        with self.assertRaises(ValueError):
            pairs_page.apply_decisions(self.pairs_file(pairs), self.write("d.json", {"fp-1": "same", "fp-9": "same"}), cp)
        self.assertEqual(cp.read_bytes(), before)

    def test_bad_value_rejected(self):
        pairs, clusters = self.basic()
        with self.assertRaises(ValueError):
            self.run_apply(pairs, clusters, {"fp-1": "maybe"})

    def test_held_cluster_rejected(self):
        pairs = [pair("fp-1", 1, 2, "ca", "cb")]
        clusters = cluster_doc({"ca": [1], "cb": [2]}, {"ca": ["fp-1"], "cb": ["fp-1"]})
        clusters["clusters"][1]["status"] = "live_elsewhere"
        cp = self.write("clusters.json", clusters)
        before = cp.read_bytes()
        with self.assertRaises(ValueError):
            pairs_page.apply_decisions(self.pairs_file(pairs), self.write("d.json", {"fp-1": "same"}), cp)
        self.assertEqual(cp.read_bytes(), before)

    def test_figure_review_never_touched(self):
        pairs, clusters = self.basic()
        extra = cluster_doc({"kf": [7, 8]}, status="figure_review")
        clusters["clusters"] += extra["clusters"]
        clusters["roles"].update({"x7": "figure_review", "x8": "figure_review"})
        doc = self.run_apply(pairs, clusters, {"fp-1": "same"})
        self.assertEqual(self.by_id(doc)["kf"], extra["clusters"][0])
        self.assertEqual(doc["roles"]["x7"], "figure_review")

    def test_same_merges_smaller_into_larger(self):
        pairs = [pair("fp-1", 1, 5, "ca", "cb")]
        clusters = cluster_doc({"ca": [1], "cb": [5, 6, 7]}, {"ca": ["fp-1"], "cb": ["fp-1"]})
        doc = self.run_apply(pairs, clusters, {"fp-1": "same"})
        cl = self.by_id(doc)
        self.assertEqual(set(cl), {"cb"})
        self.assertEqual({m["id"] for m in cl["cb"]["members"]}, {"x1", "x5", "x6", "x7"})
        self.assertEqual(cl["cb"]["members"][0]["id"], cl["cb"]["canonical"])
        self.assertEqual(Counter(doc["roles"].values()), Counter({"canonical": 1, "member": 3}))
        self.assertEqual(doc["roles"][cl["cb"]["canonical"]], "canonical")
        self.assertEqual(doc["counts"]["unique"], 1)

    def test_election_prefers_live(self):
        pairs = [pair("fp-1", 1, 2, "ca", "cb", live=(2,))]
        clusters = cluster_doc({"ca": [1, 3], "cb": [2]}, {"ca": ["fp-1"], "cb": ["fp-1"]}, live=(2,))
        doc = self.run_apply(pairs, clusters, {"fp-1": "same"})
        c = self.by_id(doc)["ca"]
        self.assertEqual(c["canonical"], "x2")
        self.assertTrue(c["is_live"])
        self.assertEqual(doc["roles"]["x2"], "canonical")
        self.assertEqual(doc["roles"]["x1"], "member")
        demoted = next(m for m in c["members"] if m["id"] == "x1")
        self.assertEqual(demoted["duplicate_of"], "x2")

    def test_election_prefers_printed_key_via_corpus_rule(self):
        pairs = [pair("fp-1", 1, 2, "ca", "cb")]
        clusters = cluster_doc({"ca": [1], "cb": [2]}, {"ca": ["fp-1"], "cb": ["fp-1"]})
        clusters["clusters"][1]["members"][0]["printed_key"] = True
        doc = self.run_apply(pairs, clusters, {"fp-1": "same"})
        self.assertEqual(self.by_id(doc)["ca"]["canonical"], "x2")

    def test_conflicting_decisions_rejected(self):
        pairs = [pair("fp-1", 1, 2, "ca", "cb"), pair("fp-2", 2, 3, "cb", "cc"), pair("fp-3", 1, 3, "ca", "cc")]
        clusters = cluster_doc({"ca": [1], "cb": [2], "cc": [3]},
                               {"ca": ["fp-1", "fp-3"], "cb": ["fp-1", "fp-2"], "cc": ["fp-2", "fp-3"]})
        cp = self.write("clusters.json", clusters)
        before = cp.read_bytes()
        with self.assertRaises(ValueError):
            pairs_page.apply_decisions(self.pairs_file(pairs), self.write(
                "d.json", {"fp-1": "same", "fp-2": "same", "fp-3": "different"}), cp)
        self.assertEqual(cp.read_bytes(), before)

    def test_changing_a_recorded_decision_rejected(self):
        pairs, clusters = self.basic()
        first = self.run_apply(pairs, clusters, {"fp-1": "different"})
        with self.assertRaises(ValueError):
            self.run_apply(pairs, first, {"fp-1": "same"})

    def test_normalizer_mismatch_rejected(self):
        pairs, clusters = self.basic()
        clusters["normalizer_version"] = "kn-0"
        with self.assertRaises(ValueError):
            self.run_apply(pairs, clusters, {"fp-1": "same"})

    def test_no_temp_file_left_and_atomic(self):
        pairs, clusters = self.basic()
        self.run_apply(pairs, clusters, {"fp-1": "same"})
        self.assertEqual(sorted(p.name for p in self.dir.iterdir() if p.name.startswith("clusters")),
                         ["clusters.json"])


class FixRoundTests(Base):
    def chain(self, big_first=True):
        # A (1 member), B (1), C (3 members): C is larger than both
        pairs = [pair("fp-1", 1, 2, "ca", "cb"), pair("fp-2", 2, 5, "cb", "cc")]
        clusters = cluster_doc({"ca": [1], "cb": [2], "cc": [5, 6, 7]},
                               {"ca": ["fp-1"], "cb": ["fp-1", "fp-2"], "cc": ["fp-2"]})
        return pairs, clusters

    def apply(self, pairs, clusters, answers, **kw):
        cp = self.write("clusters.json", clusters)
        pairs_page.apply_decisions(self.pairs_file(pairs), self.write("d.json", answers), cp, **kw)
        return self.load(cp), cp

    def test_size_driven_chain_merges_into_one(self):
        pairs, clusters = self.chain()
        doc, _ = self.apply(pairs, clusters, {"fp-1": "same", "fp-2": "same"})
        self.assertEqual([c["cluster_id"] for c in doc["clusters"]], ["cc"])
        self.assertEqual({m["id"] for m in doc["clusters"][0]["members"]}, {"x1", "x2", "x5", "x6", "x7"})
        self.assertEqual(Counter(doc["roles"].values()), Counter({"canonical": 1, "member": 4}))
        self.assertEqual(doc["counts"]["unique"], 1)

    def test_different_sorting_first_still_checked_against_chain(self):
        pairs = [pair("fp-a", 1, 3, "ca", "cc"), pair("fp-b", 1, 2, "ca", "cb"), pair("fp-c", 2, 3, "cb", "cc")]
        clusters = cluster_doc({"ca": [1], "cb": [2], "cc": [3]},
                               {"ca": ["fp-a", "fp-b"], "cb": ["fp-b", "fp-c"], "cc": ["fp-a", "fp-c"]})
        cp = self.write("clusters.json", clusters)
        before = cp.read_bytes()
        with self.assertRaises(ValueError) as cm:
            pairs_page.apply_decisions(self.pairs_file(pairs), self.write(
                "d.json", {"fp-a": "different", "fp-b": "same", "fp-c": "same"}), cp)
        msg = str(cm.exception)
        self.assertIn("x1|x3", msg)
        self.assertIn("x1|x2", msg)
        self.assertIn("x2|x3", msg)
        self.assertIn("nothing was changed", msg)
        self.assertEqual(cp.read_bytes(), before)
        self.assertFalse((self.dir / "founder_decisions.json").exists())

    def test_recorded_different_then_later_chain_rejected(self):
        pairs = [pair("fp-a", 1, 3, "ca", "cc"), pair("fp-b", 1, 2, "ca", "cb"), pair("fp-c", 2, 3, "cb", "cc")]
        clusters = cluster_doc({"ca": [1], "cb": [2], "cc": [3]},
                               {"ca": ["fp-a", "fp-b"], "cb": ["fp-b", "fp-c"], "cc": ["fp-a", "fp-c"]})
        doc, cp = self.apply(pairs, clusters, {"fp-a": "different"})
        before = cp.read_bytes()
        log_before = (self.dir / "founder_decisions.json").read_bytes()
        with self.assertRaises(ValueError) as cm:
            pairs_page.apply_decisions(self.pairs_file(pairs), self.write(
                "d2.json", {"fp-b": "same", "fp-c": "same"}), cp)
        self.assertIn("x1|x3", str(cm.exception))
        self.assertEqual(cp.read_bytes(), before)
        self.assertEqual((self.dir / "founder_decisions.json").read_bytes(), log_before)

    def test_log_is_append_only_and_keyed_by_occurrence_ids(self):
        pairs = [pair("fp-1", 1, 2, "ca", "cb"), pair("fp-2", 3, 4, "cc", "cd")]
        clusters = cluster_doc({"ca": [1], "cb": [2], "cc": [3], "cd": [4]},
                               {"ca": ["fp-1"], "cb": ["fp-1"], "cc": ["fp-2"], "cd": ["fp-2"]})
        self.apply(pairs, clusters, {"fp-1": "same"}, now="2026-10-20T10:00:00Z")
        doc, _ = self.apply(pairs, self.load(self.dir / "clusters.json"), {"fp-2": "different"},
                            now="2026-10-20T11:00:00Z")
        log = self.load(self.dir / "founder_decisions.json")
        self.assertEqual(log, {"x1|x2": {"decision": "same", "at": "2026-10-20T10:00:00Z"},
                               "x3|x4": {"decision": "different", "at": "2026-10-20T11:00:00Z"}})
        self.assertEqual(doc["counts"]["founder_pairs"], 0)

    def test_redeciding_gives_plain_words(self):
        pairs, clusters = [pair("fp-1", 1, 2, "ca", "cb")], cluster_doc(
            {"ca": [1], "cb": [2]}, {"ca": ["fp-1"], "cb": ["fp-1"]})
        _, cp = self.apply(pairs, clusters, {"fp-1": "different"})
        with self.assertRaises(ValueError) as cm:
            pairs_page.apply_decisions(self.pairs_file(pairs), self.write("d2.json", {"fp-1": "same"}), cp)
        self.assertIn("already answered 'different'", str(cm.exception))
        self.assertIn("remove its line from founder_decisions.json", str(cm.exception))

    def test_decisions_survive_corpus_rerun(self):
        items = [{"id": "SYN_V1_MATH_M1_Q01", "text": mc("The park has a pond near the old stone "
                                                         "bridge and the largest fountain in the whole district.")},
                 {"id": "SYN_V2_MATH_M1_Q01", "text": mc("The park has a lake near the old stone bridge and the "
                                                         "largest fountain in the whole district.")}]
        for verdict, canon_count in (("same", 1), ("different", 2)):
            with tempfile.TemporaryDirectory() as d:
                d = Path(d)
                ip, lp = build_tree(d, items)
                out = d / "out"
                corpus.run_corpus(ip, lp, None, out)
                pairs = json.loads((out / "founder_pairs.json").read_text(encoding="utf-8"))
                self.assertEqual(pairs["pair_count"], 1)
                ans = d / "ans.json"
                ans.write_text(json.dumps({pairs["pairs"][0]["pair_id"]: verdict}), encoding="utf-8")
                pairs_page.apply_decisions(out / "founder_pairs.json", ans, out / "clusters.json")
                first = json.loads((out / "clusters.json").read_text(encoding="utf-8"))
                counts = corpus.run_corpus(ip, lp, None, out)
                again = json.loads((out / "founder_pairs.json").read_text(encoding="utf-8"))
                self.assertEqual(again["pair_count"], 0)
                self.assertEqual(counts["founder_pairs"], 0)
                doc = json.loads((out / "clusters.json").read_text(encoding="utf-8"))
                self.assertEqual(doc["roles"], first["roles"])
                self.assertEqual(sum(v == "canonical" for v in doc["roles"].values()), canon_count)
                self.assertEqual(len(doc["clusters"]), canon_count)
                self.assertNotIn("founder_review", doc["roles"].values())
                self.assertEqual(list(doc["founder_decisions"].values()), [verdict])

    def test_curly_quotes_and_dashes_not_highlighted(self):
        p = pair("fp-1", 1, 2, "a", "b", ta='It\u2019s a \u201cgood\u201d fit \u2013 really', tb='It\'s a "good" fit - really')
        out = self.dir / "p.html"
        pairs_page.render_pairs(self.pairs_file([p]), out)
        body = out.read_text(encoding="utf-8").split('data-pair="fp-1"', 1)[1]
        self.assertNotIn("<mark>", body.split('class="stem"', 1)[1].split("</p>", 1)[0])
        self.assertIn("\u2019", body)  # the original characters are still shown

    def test_cli_has_no_traceback_for_bad_files(self):
        import subprocess, sys
        cli = Path(__file__).resolve().parent.parent / "kimport-cli.py"
        bad = self.write("bad.json", {"pairs": [{"nope": 1}], "normalizer_version": NORMALIZER_VERSION})
        cl = self.write("clusters.json", cluster_doc({"ca": [1]}))
        d = self.write("d.json", {})
        r = subprocess.run([sys.executable, "-I", str(cli), "pairs", "apply", "--pairs", str(bad), "--decisions",
                            str(d), "--clusters", str(cl)], capture_output=True, text=True)
        self.assertEqual(r.returncode, 1)
        self.assertNotIn("Traceback", r.stderr)
        self.assertIn("error:", r.stderr)


class WiringTests(unittest.TestCase):
    def test_cli_commands_registered(self):
        spec = importlib.util.spec_from_file_location("kcli", Path(__file__).resolve().parent.parent / "kimport-cli.py")
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        p = m.build_parser()
        a = p.parse_args(["pairs", "render", "--pairs", "a", "--out", "b"])
        self.assertTrue(callable(a.func))
        a = p.parse_args(["pairs", "apply", "--pairs", "a", "--decisions", "b", "--clusters", "c"])
        self.assertTrue(callable(a.func))


if __name__ == "__main__":
    unittest.main()
