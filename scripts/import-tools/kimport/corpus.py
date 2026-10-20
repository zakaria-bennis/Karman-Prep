"""Corpus clustering: every captured occurrence (plus the live bank) in exactly
one duplicate cluster, one canonical per cluster, and the true unique count.

Replaces task-6 dedup.py. Records come from corpus_load.load_corpus (ledger
occurrences) and, optionally, the live export (sweep.record_from_row).

Grouping (cluster):
  1. exact copies share a comparison_key (one bucket);
  2. buckets with the same text but a different answer form one
     "answer_dispute" cluster (role pending_answer_dispute; a live copy stays
     canonical);
  3. other buckets sharing sweep.blocking_key (everything typo_match requires
     to be equal) are compared with typo_match. A bucket joins a cluster only
     by matching the cluster's canonical, so close matches never chain;
  4. records whose figure the key cannot represent never merge: they are
     grouped by text as "figure_review" candidates for the figure campaign;
  5. canonicals with the same answer, no figure and a difflib ratio of at
     least FOUNDER_RATIO form founder yes/no pairs (founder_pairs.json); a
     non-live canonical in a pair gets role founder_review until decided.
Canonical election: a live member always wins (a live export row before a
live-linked occurrence), then a printed key (reviewed_answer.kind ==
"official"), then the copy without a typo, then the fewest ledger holds, then
the lowest id. "Without a typo" is decided by evidence outside the cluster
(rulings R8-R11): a bucket's side of the typo spots must use words more common
in records whose text is not within the typo limits of any cluster copy, so
repeated imports of one typo cannot outvote the clean copy. No evidence either
way is a tie (keeper_tie) and that step is skipped.
"""

import difflib
import hashlib
import json
from collections import Counter
from dataclasses import dataclass, field, replace
from pathlib import Path

from kimport.corpus_load import load_corpus
from kimport.evidence import WORD, OutsideEvidence, needs_visual
from kimport.export import read_export_doc
from kimport.keys import QuestionRecord, answer_value, clean_text, comparison_key, sorted_choices
from kimport.normalize import NORMALIZER_VERSION
from kimport.sweep import blocking_key, record_from_row
from kimport.typo import typo_match

ROLES = ("canonical", "member", "pending_answer_dispute", "figure_review", "founder_review", "unparsed")
FOUNDER_RATIO = 0.90
GOAL = 10_000


@dataclass
class ClusterResult:
    roles: dict[str, str]
    clusters: list[dict]
    founder_pairs: list[dict]
    unparsed: list[dict]
    counts: dict
    records: dict[str, QuestionRecord] = field(repr=False)
    cluster_of: dict[str, str] = field(repr=False)
    export_sha256: str | None = None
    inputs: dict = field(default_factory=dict)


# ---------------------------------------------------------------- records


def _live_record(r: QuestionRecord) -> QuestionRecord:
    """An exported live row with the corpus status fields."""
    m = dict(r.meta)
    m.update(source="live", holds=[], reviewed_answer={"kind": None}, live_rows=[r.ref], certified_live=None,
             status="ok", reason=None)
    kind = m.get("figure_kind")
    if m.get("format_problem"):
        m.update(status="unparsed", reason="format_mismatch")
    elif m.get("answer_problem"):
        m.update(status="unparsed", reason="broken_answer_key")
    elif m.get("figure_unkeyable"):
        m.update(status="figure", reason=f"figure_kind {kind}")
    elif kind == "table" and not r.table_cells:
        m.update(status="figure", reason="figure_kind table with no table data")
    elif not r.table_cells and needs_visual(r.text):
        m.update(status="figure", reason=f"text refers to a visual: {needs_visual(r.text)!r}")
    return replace(r, meta=m)


def _official(r) -> bool:
    return (r.meta.get("reviewed_answer") or {}).get("kind") == "official"


def _prio(r: QuestionRecord, typo_flag: int = 0):
    return (not r.is_live, r.meta.get("source") != "live", not _official(r), typo_flag,
            len(r.meta.get("holds") or ()), r.ref)


def elect(recs) -> QuestionRecord:
    """The canonical among records (no typo evidence): live, printed key, fewest holds, lowest id."""
    return min(recs, key=_prio)


def _cid(prefix: str, key: str) -> str:
    return prefix + hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]


def _compare_text(r: QuestionRecord) -> str:
    return clean_text(r.text) + " || " + " | ".join(sorted_choices(r))


# ---------------------------------------------------------------- clustering


def _typo_flags(cands, rep, typo, evidence) -> tuple[dict[str, int], bool]:
    """0 for the clean bucket and 1 for the others; all 0 (and tie) without evidence."""
    spot_words: dict[str, set[str]] = {k: set() for k in cands}
    for x, kx in enumerate(cands):
        for ky in cands[x + 1:]:
            res = typo(kx, ky)
            if res.same:
                for side_x, side_y in res.spots:
                    spot_words[kx].update(WORD.findall(side_x))
                    spot_words[ky].update(WORD.findall(side_y))
    freq = evidence.outside([rep[k].text for k in cands])
    score = {k: min((freq(w) for w in ws), default=0) for k, ws in spot_words.items()}
    top = max(score.values())
    if sum(s == top for s in score.values()) > 1:
        return {k: 0 for k in cands}, True
    return {k: 0 if score[k] == top else 1 for k in cands}, False


def _member(r, match, spots=(), reason=None) -> dict:
    out = {"id": r.ref, "source": r.meta.get("source", "corpus"), "is_live": r.is_live, "match": match,
           "spots": [list(s) for s in spots], "printed_key": _official(r), "holds": len(r.meta.get("holds") or ())}
    if reason:
        out["reason"] = reason
    return out


def _hold_cluster(prefix, key, recs, status, match, role) -> tuple[dict, dict[str, str]]:
    """A dispute or figure cluster: nothing merges; a live copy is canonical."""
    recs = sorted(recs, key=_prio)
    canon = recs[0] if recs[0].is_live else None
    roles = {r.ref: ("canonical" if r is canon else role) for r in recs}
    mems = [_member(r, "canonical" if r is canon else match, reason=r.meta.get("reason") if status ==
                    "figure_review" else None) for r in recs]
    return {"cluster_id": _cid(prefix, key), "status": status, "canonical": canon.ref if canon else None,
            "keeper_tie": False, "is_live": any(r.is_live for r in recs), "members": mems, "founder_pairs": []}, roles


def cluster(corpus, live=None) -> ClusterResult:
    """`live`: records from the live export (sweep.record_from_row), or None to
    take live status from the ledger's db_live_rows. Non-live export rows are
    word evidence only."""
    corpus = list(corpus)
    extra: list[QuestionRecord] = []
    live_recs: list[QuestionRecord] = []
    if live is not None:
        live = list(live)
        live_ids = {r.ref for r in live if r.is_live}
        corpus = [replace(r, is_live=bool(live_ids & set(r.meta.get("live_rows") or ()))) for r in corpus]
        live_recs = [_live_record(r) for r in live if r.is_live]
        extra = [r for r in live if not r.is_live]
    records = corpus + live_recs
    by_ref: dict[str, QuestionRecord] = {}
    for r in records:
        if r.ref in by_ref:
            raise ValueError(f"repeated record id: {r.ref}")
        by_ref[r.ref] = r

    roles: dict[str, str] = {}
    clusters: list[dict] = []
    unparsed = [{"id": r.ref, "reason": r.meta.get("reason"), "is_live": r.is_live, "source": r.meta.get("source")}
                for r in records if r.meta.get("status") == "unparsed"]
    roles.update({u["id"]: "unparsed" for u in unparsed})
    parsed = [r for r in records if r.meta.get("status") != "unparsed"]
    key_of = {r.ref: comparison_key(r) for r in parsed}

    figures: dict[str, list] = {}
    buckets: dict[str, list] = {}
    for r in parsed:
        (figures if r.meta.get("status") == "figure" else buckets).setdefault(key_of[r.ref], []).append(r)
    for k, recs in figures.items():
        c, rl = _hold_cluster("kf-", k, recs, "figure_review", "figure_candidate", "figure_review")
        clusters.append(c)
        roles.update(rl)

    by_content: dict[str, list[str]] = {}
    for k, recs in buckets.items():
        by_content.setdefault(comparison_key(replace(recs[0], answer="")), []).append(k)
    disputed = set()
    for ck, ks in by_content.items():
        if len(ks) > 1:
            disputed.update(ks)
            c, rl = _hold_cluster("kd-", ck, [r for k in ks for r in buckets[k]], "answer_dispute",
                                  "answer_dispute", "pending_answer_dispute")
            clusters.append(c)
            roles.update(rl)

    rep = {k: min(recs, key=_prio) for k, recs in buckets.items() if k not in disputed}
    order = sorted(rep, key=lambda k: _prio(rep[k]))
    block_of = {k: blocking_key(rep[k]) for k in order}
    by_block: dict[str, list[str]] = {}
    for k in order:
        by_block.setdefault(block_of[k], []).append(k)
    evidence = OutsideEvidence(parsed + extra)
    cache: dict = {}

    def typo(k1, k2):
        if (k1, k2) not in cache:
            cache[(k1, k2)] = typo_match(rep[k1], rep[k2])
        return cache[(k1, k2)]

    done: set[str] = set()
    settled: list[tuple[dict, QuestionRecord]] = []
    for first in order:
        if first in done:
            continue
        block = by_block[block_of[first]]
        cands = [first] + [k for k in block if k != first and k not in done and typo(first, k).same]
        tie = False
        if len(cands) == 1:
            canon, ckey, mkeys = rep[first], first, [first]
        else:
            flags, tie = _typo_flags(cands, rep, typo, evidence)
            canon = min((r for k in cands for r in buckets[k]), key=lambda r: _prio(r, flags[key_of[r.ref]]))
            ckey = key_of[canon.ref]
            mkeys = [ckey] + [k for k in block if k != ckey and k not in done and typo(ckey, k).same]
        done.update(mkeys)
        recs = sorted((r for k in mkeys for r in buckets[k]), key=lambda r: (r is not canon, key_of[r.ref] != ckey,
                                                                            _prio(r)))
        mems = []
        for r in recs:
            if r is canon:
                mems.append(_member(r, "canonical"))
            elif key_of[r.ref] == ckey:
                mems.append(_member(r, "exact"))
            else:
                mems.append(_member(r, "ocr_typo", typo(ckey, key_of[r.ref]).spots))
        c = {"cluster_id": _cid("kc-", ckey), "status": "settled", "canonical": canon.ref, "keeper_tie": tie,
             "is_live": any(r.is_live for r in recs), "members": mems, "founder_pairs": []}
        clusters.append(c)
        settled.append((c, canon))
        roles.update({r.ref: ("canonical" if r is canon else "member") for r in recs})

    read_live = {r.ref for r in parsed if r.meta.get("source") == "live"}
    live_state = None if live is None else {r.ref: r.is_live for r in live}
    held = []
    for c, canon in settled:
        recs = [by_ref[m["id"]] for m in c["members"]]
        if any(r.is_live and not _blocked(r, live_state, read_live) for r in recs):
            continue
        blockers = [r for r in recs if _blocked(r, live_state, read_live)]
        if blockers:
            row = _blocked(blockers[0], live_state, read_live)
            c.update(status="live_elsewhere", canonical=None, live_row=row,
                     is_live=live_state is None or live_state.get(row, True))
            for m in c["members"]:
                m["duplicate_of"] = row
                if m["match"] == "canonical":
                    m["match"] = "exact"
            roles.update({r.ref: "member" for r in recs})
            held.append(c["cluster_id"])
    settled = [(c, canon) for c, canon in settled if c["status"] == "settled"]
    pairs = _founder_pairs(settled)
    by_cid = {c["cluster_id"]: c for c, _ in settled}
    for p in pairs:
        for side in ("canonical", "member"):
            by_cid[p[side]["cluster_id"]]["founder_pairs"].append(p["pair_id"])
            if not p[side]["is_live"]:
                roles[p[side]["id"]] = "founder_review"

    clusters.sort(key=lambda c: (c["canonical"] or c["members"][0]["id"]))
    cluster_of = {m["id"]: c["cluster_id"] for c in clusters for m in c["members"]}
    counts = _counts(corpus, live_recs, live, clusters, unparsed, pairs, roles, by_ref)
    return ClusterResult(roles, clusters, pairs, unparsed, counts, by_ref, cluster_of)


def _blocked(r: QuestionRecord, live: dict | None, read_live: set[str]) -> str | None:
    """The live row id this record duplicates, so it must never be canonical: a
    ledger CERTIFIED_DUPLICATE (always), or (with an export) an occurrence whose
    linked live rows are not read records here. A cluster that also holds a
    read live copy is unaffected (the live copy is canonical)."""
    cert = r.meta.get("certified_live")
    if cert:
        return cert
    if r.meta.get("final_category") == "CERTIFIED_DUPLICATE" and not cert:
        return "certified duplicate (no row id)"
    rows = r.meta.get("live_rows") or []
    if live is None or not rows or set(rows) & read_live:
        return None
    # linked rows missing from the export, or live there but not readable
    return next((x for x in rows if live.get(x, True)), None)


def _founder_pairs(settled) -> list[dict]:
    blocks: dict[tuple, list] = {}
    for c, canon in settled:
        blocks.setdefault((canon.answer_format, answer_value(canon)), []).append((c, canon))
    pairs = []
    for group in blocks.values():
        texts = [_compare_text(canon) for _, canon in group]
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                (ci, a), (cj, b) = group[i], group[j]
                if a.is_live and b.is_live:
                    continue  # live copies are the sweep's job
                sm = difflib.SequenceMatcher(None, texts[i], texts[j], autojunk=False)
                if sm.real_quick_ratio() < FOUNDER_RATIO or sm.quick_ratio() < FOUNDER_RATIO:
                    continue
                ratio = sm.ratio()
                if ratio < FOUNDER_RATIO:
                    continue
                (kc, k), (mc, m) = sorted([(ci, a), (cj, b)], key=lambda t: _prio(t[1]))
                pairs.append({"pair_id": _cid("fp-", "|".join(sorted([k.ref, m.ref]))), "ratio": round(ratio, 4),
                              "answer": answer_value(k), "canonical": _side(kc, k), "member": _side(mc, m)})
    return sorted(pairs, key=lambda p: (p["canonical"]["id"], p["member"]["id"]))


def _side(c, r) -> dict:
    return {"id": r.ref, "cluster_id": c["cluster_id"], "is_live": r.is_live, "text": r.text,
            "choices": list(r.choices), "answer": r.answer, "answer_format": r.answer_format}


def _rows_of(r: QuestionRecord) -> set[str]:
    """Live row ids a record stands for: an export row is itself; an occurrence its
    linked rows (a live occurrence with no row id stands for itself)."""
    if r.meta.get("source") == "live":
        return {r.ref}
    rows = set(r.meta.get("live_rows") or ())
    return rows or ({r.ref} if r.is_live else set())


def _counts(corpus, live_recs, live, clusters, unparsed, pairs, roles, by_ref) -> dict:
    """Counts for the report. Unique counts cover READ occurrences only; the
    unread ones are estimated separately (see report_md for the method)."""
    status = Counter(c["status"] for c in clusters)
    rows_in = {c["cluster_id"]: set().union(*(_rows_of(by_ref[m["id"]]) for m in c["members"])) for c in clusters}
    represented = set().union(*(rows_in[c["cluster_id"]] for c in clusters if c["status"] != "live_elsewhere"))
    # a held certified copy whose live row sits in another read cluster is that question again
    dup_held = [c for c in clusters if c["status"] == "live_elsewhere" and c["live_row"] in represented]
    counted = [c for c in clusters if c not in dup_held]
    live_unique = sum(1 for c in counted if c["is_live"])
    parent: dict[str, str] = {}

    def find(x):
        while parent.get(x, x) != x:
            x = parent[x]
        return x

    merges = 0
    for p in pairs:
        a, b = find(p["canonical"]["cluster_id"]), find(p["member"]["cluster_id"])
        if a != b:
            parent[b] = a
            merges += 1
    if live is None:
        all_live = set().union(*(_rows_of(r) for r in corpus))
    else:
        all_live = {r.ref for r in live if r.is_live}
    read_live = set().union(*rows_in.values()) & all_live
    unread = [by_ref[u["id"]] for u in unparsed if by_ref[u["id"]].meta.get("source", "corpus") == "corpus"]
    unread_new = [r for r in unread if not r.meta.get("live_rows") and not r.meta.get("certified_live")]
    read_not_live = [r for r in corpus if r.meta.get("status") != "unparsed" and not r.is_live
                     and not r.meta.get("certified_live")]
    not_live = len(counted) - live_unique
    rate = not_live / len(read_not_live) if read_not_live else 1.0
    return {
        "occurrences": len(corpus),
        "live_status_from": "ledger" if live is None else "export",
        "export_rows": None if live is None else len(live),
        "live_rows_clustered": len(live_recs),
        "unparsed": len(unparsed),
        "unparsed_by_reason": dict(Counter(u["reason"] for u in unparsed)),
        "clusters_settled": status["settled"],
        "clusters_answer_dispute": status["answer_dispute"],
        "clusters_figure_review": status["figure_review"],
        "clusters_live_elsewhere": status["live_elsewhere"],
        "live_elsewhere_same_as_read_cluster": len(dup_held),
        "unique": len(counted),
        "live_unique": live_unique,
        "unique_not_live": not_live,
        "distinct_live_rows": len(all_live),
        "live_rows_only_in_unread": len(all_live - read_live),
        "live_rows_sharing_a_cluster": sum(max(0, len(rows_in[c["cluster_id"]] & all_live) - 1) for c in counted),
        "unread_occurrences": len(unread),
        "unread_live_or_certified": len(unread) - len(unread_new),
        "unread_new_upper": len(unread_new),
        "unread_new_at_read_rate": round(len(unread_new) * rate),
        "read_not_live_unique_rate": round(rate, 4),
        "founder_pairs": len(pairs),
        "unique_floor_if_every_pair_is_same": len(counted) - merges,
        "roles": dict(Counter(roles.values())),
    }


# ---------------------------------------------------------------- certified duplicates


def check_certified(result: ClusterResult) -> list[dict]:
    """Each ledger CERTIFIED_DUPLICATE (meta certified_live) must be a member of the
    cluster holding its certified live row, or (without that row in this run) of
    the cluster holding the ledger occurrence linked to that row."""
    out = []
    recs = result.records
    for r in sorted((r for r in recs.values() if r.meta.get("certified_live")), key=lambda r: r.ref):
        uuid = r.meta["certified_live"]
        target = uuid if uuid in recs else next(
            (x.ref for x in sorted(recs.values(), key=lambda x: x.ref)
             if x.ref != r.ref and uuid in (x.meta.get("live_rows") or ())), None)
        role = result.roles.get(r.ref)
        ok = (target is not None and role == "member" and r.ref in result.cluster_of
              and result.cluster_of.get(r.ref) == result.cluster_of.get(target))
        out.append({"id": r.ref, "certified_live_row": uuid, "target": target, "ok": ok, "role": role,
                    "held": role not in ("canonical", "founder_review"),
                    "reason": None if ok else _mismatch_reason(result, r, target)})
    return out


def _mismatch_reason(result, r, target) -> str:
    role = result.roles.get(r.ref)
    if target is None:
        return f"role {role}; the certified live row is not in this run and no ledger occurrence links it"
    t = result.records[target]
    parts = [f"role {role}", f"target {target} has role {result.roles.get(target)}"]
    if role == "unparsed" or result.roles.get(target) == "unparsed":
        parts += [f"{who} not read: {x.meta.get('reason')}" for who, x in (("this copy", r), ("target", t))
                  if result.roles.get(x.ref) == "unparsed"]
    elif "figure" in (r.meta.get("status"), t.meta.get("status")):
        parts.append("figure question: the figure campaign decides")
    elif result.cluster_of.get(r.ref) != result.cluster_of.get(target):
        same_key = comparison_key(r) == comparison_key(t)
        parts.append("same comparison key" if same_key else f"typo rule says {typo_match(r, t).reason}")
        pair = [p["pair_id"] for p in result.founder_pairs
                if {p["canonical"]["id"], p["member"]["id"]} == {r.ref, target}]
        if pair:
            parts.append(f"in founder pair {pair[0]}")
    return "; ".join(parts)


# ---------------------------------------------------------------- outputs


def _n(x) -> str:
    return f"{x:,}"


def report_md(result: ClusterResult) -> str:
    c = result.counts
    live_q = c["distinct_live_rows"] - c["live_rows_sharing_a_cluster"]  # live questions, extra live copies removed
    low = live_q + c["unique_not_live"]
    mid = low + c["unread_new_at_read_rate"]
    high = low + c["unread_new_upper"]
    floor = live_q + (c["unique_floor_if_every_pair_is_same"] - c["live_unique"])
    live_from = ("the live export" if c["live_status_from"] == "export" else
                 "the readiness ledger's linked live rows (no live export given)")

    def short(n):
        return f"{_n(GOAL - n)} short of" if n < GOAL else f"{_n(n - GOAL)} over"

    lines = [
        "# Corpus duplicate run",
        "",
        f"- {_n(c['occurrences'])} captured occurrences (the readiness ledger), plus "
        f"{_n(c['live_rows_clustered'])} live bank rows from an export. Live status comes from {live_from}.",
        f"- **Live today: {_n(c['distinct_live_rows'])} distinct live rows.** {_n(c['live_rows_only_in_unread'])} of "
        f"them are only in occurrences we could not read; {_n(c['live_rows_sharing_a_cluster'])} are extra live "
        "copies of a question that already has another live row (the live sweep's job).",
        f"- **Unique among read occurrences: {_n(c['unique'])}** ({_n(c['live_unique'])} already live, "
        f"**{_n(c['unique_not_live'])} not yet live**).",
        f"- Of those, {_n(c['clusters_figure_review'])} are figure questions grouped by text only (the figure "
        f"campaign confirms them), {_n(c['clusters_answer_dispute'])} have copies with different answer keys, and "
        f"{_n(c['clusters_live_elsewhere'])} are certified copies of a live row held back from publishing.",
        f"- **Not read: {_n(c['unread_occurrences'])} occurrences.** {_n(c['unread_live_or_certified'])} of them are "
        "already live or certified copies of a live row, so they add nothing new. The other "
        f"{_n(c['unread_new_upper'])} could add up to {_n(c['unread_new_upper'])} more unique questions "
        f"(about {_n(c['unread_new_at_read_rate'])} if they repeat at the rate read ones do: "
        f"{c['read_not_live_unique_rate']:.0%} unique). Method: count unread occurrences with no linked live row "
        "and no certificate; exam position is not used to link them.",
        f"- {_n(c['founder_pairs'])} close-match pairs need your yes/no (founder_pairs.json). Even if every close "
        f"match were a duplicate, there would be at least {_n(c['unique_floor_if_every_pair_is_same'])} unique "
        "questions among the read occurrences.",
        f"- Against 10,000: live questions {_n(live_q)} (live rows minus extra live copies) + not yet live among "
        f"read {_n(c['unique_not_live'])} "
        f"= {_n(low)} ({short(low)} the goal). Adding the unread estimate gives about {_n(mid)} "
        f"(at most {_n(high)}, {short(high)} the goal). If every close match is a duplicate: about {_n(floor)} "
        "before the unread estimate.",
        "- Captures outside the ledger (other raw scans): not counted.",
        "",
    ]
    cert = check_certified(result)
    if cert:
        good = sum(x["ok"] for x in cert)
        lines += ["## Certified duplicates", "",
                  f"{good} of {len(cert)} ledger CERTIFIED_DUPLICATE items came out as a member of the cluster "
                  "holding their certified live row (or the ledger occurrence linked to it). "
                  f"{sum(x['held'] for x in cert)} of {len(cert)} can never be published as a second copy "
                  "(none is canonical or in a founder pair).", ""]
        bad = [x for x in cert if not x["ok"]]
        if bad:
            lines += ["Each of these needs an explanation before the corpus output is used:", ""]
            lines += [f"- `{x['id']}` (certified live row `{x['certified_live_row']}`): {x['reason']}" for x in bad]
            lines.append("")
    if c["unparsed_by_reason"]:
        lines += ["## Not read", ""]
        lines += [f"- {reason}: {_n(n)}" for reason, n in sorted(c["unparsed_by_reason"].items(),
                                                                  key=lambda t: (-t[1], str(t[0])))]
        lines.append("")
    disputes = [x for x in result.clusters if x["status"] == "answer_dispute"]
    if disputes:
        lines += ["## Same question, different answer key", ""]
        lines += ["- " + ", ".join(f"`{m['id']}`" for m in x["members"]) for x in disputes]
        lines.append("")
    return "\n".join(lines)


def write_outputs(result: ClusterResult, out_dir: Path) -> None:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = {"normalizer_version": NORMALIZER_VERSION, "export_sha256": result.export_sha256,
           "inputs": result.inputs, "counts": result.counts, "roles": dict(sorted(result.roles.items())),
           "clusters": result.clusters, "unparsed": result.unparsed, "certified_duplicates": check_certified(result)}
    (out_dir / "clusters.json").write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    pairs = {"normalizer_version": NORMALIZER_VERSION, "ratio_threshold": FOUNDER_RATIO,
             "pair_count": len(result.founder_pairs), "pairs": result.founder_pairs}
    (out_dir / "founder_pairs.json").write_text(json.dumps(pairs, indent=2, ensure_ascii=False) + "\n",
                                                encoding="utf-8")
    (out_dir / "report.md").write_text(report_md(result), encoding="utf-8")


def _file_sha(path: Path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run_corpus(c_index: Path, ledger: Path, export: Path | None, out_dir: Path) -> dict:
    corpus = load_corpus(Path(c_index), Path(ledger))
    live = None
    if export is not None:
        live = [record_from_row(row) for row in read_export_doc(Path(export)).rows]
    result = cluster(corpus, live)
    result.export_sha256 = _file_sha(export) if export is not None else None
    result.inputs = {"c_index": str(c_index), "c_index_sha256": _file_sha(c_index), "ledger": str(ledger),
                     "ledger_sha256": _file_sha(ledger), "export": str(export) if export is not None else None}
    write_outputs(result, Path(out_dir))
    return result.counts
