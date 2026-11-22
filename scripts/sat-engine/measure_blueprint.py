"""Measure SAT module blueprints from mapped release-exam questions.

Input: a JSON list of rows {exam, part, module, q, skill, domain, diff}, where module is RW1, RW2,
M1 or M2 and diff is Karman's 1-7 rating. Output: the blueprint JSON that
src/lib/sat-engine/blueprint.ts reads (domain counts per module, skill shares, difficulty mix for
Module 1 and for the easier and harder Module 2s).

A Module 2 counts as the harder one when its mean rating is more than 0.3 above its own Module 1;
otherwise the easier one. When fewer than three easier Module 2s are seen, the easier mix is
derived by tilting the Module 1 mix toward easy questions, and the output says so.

Usage: python3 -I scripts/sat-engine/measure_blueprint.py rows.json out.json
"""
import collections
import json
import math
import sys

SECTIONS = {"reading": ("RW1", "RW2"), "math": ("M1", "M2")}
FULL = {"reading": (26, 29), "math": (21, 23)}
DOMAIN_ORDER = {
    "reading": ["craft_structure", "info_ideas", "conventions", "expression_ideas"],
    "math": ["algebra", "advanced_math", "data_analysis", "geometry"],
}


def hist(rows):
    h = [0] * 7
    for r in rows:
        if r.get("diff"):
            h[int(r["diff"]) - 1] += 1
    total = sum(h) or 1
    return [round(x / total, 4) for x in h]


def mean_of(h):
    return sum((i + 1) * p for i, p in enumerate(h))


def tilt(h, target):
    lo, hi = -5.0, 5.0
    for _ in range(80):
        k = (lo + hi) / 2
        w = [p * math.exp(k * (i + 1)) for i, p in enumerate(h)]
        s = sum(w)
        m = sum((i + 1) * x for i, x in enumerate(w)) / s
        lo, hi = (k, hi) if m < target else (lo, k)
    s = sum(w)
    return [round(x / s, 4) for x in w]


def main(src, dst):
    rows = json.load(open(src))
    modules = collections.defaultdict(list)
    for r in rows:
        modules[(r["exam"], str(r.get("part", "0")), r["module"])].append(r)
    out = {"measured_from": src.split("/")[-1], "sections": {}}
    for section, (m1, m2) in SECTIONS.items():
        lo, hi = FULL[section]
        first, harder, easier = [], [], []
        exams = set()
        for (exam, part, mod), rs in modules.items():
            if mod != m1 or not lo <= len(rs) <= hi:
                continue
            second = modules.get((exam, part, m2), [])
            first.append(rs)
            exams.add(exam)
            if lo <= len(second) <= hi:
                gap = mean_of(hist(second)) - mean_of(hist(rs))
                (harder if gap > 0.3 else easier).append(second)

        def per_module(groups):
            counts = collections.Counter()
            for g in groups:
                counts.update(r["domain"] for r in g)
            return {d: round(counts[d] / max(1, len(groups)), 2) for d in DOMAIN_ORDER[section]}

        skills = collections.Counter()
        domain_of = {}
        for g in first + harder + easier:
            for r in g:
                skills[r["skill"]] += 1
                domain_of[r["skill"]] = r["domain"]
        by_domain = collections.Counter()
        for s, c in skills.items():
            by_domain[domain_of[s]] += c
        share = {
            s: {"domain": domain_of[s], "share": round(c / by_domain[domain_of[s]], 4), "seen": c}
            for s, c in sorted(skills.items())
        }
        h1 = hist([r for g in first for r in g])
        hh = hist([r for g in harder for r in g])
        if len(easier) >= 3:
            he, derived = hist([r for g in easier for r in g]), False
        else:
            he, derived = tilt(h1, mean_of(h1) - 0.6 * (mean_of(hh) - mean_of(h1))), True
        out["sections"][section] = {
            "exams": sorted(exams),
            "modules_seen": {"module1": len(first), "harder": len(harder), "easier": len(easier)},
            "domain_order": DOMAIN_ORDER[section],
            "domain_counts": {
                "module1": per_module(first),
                "harder": per_module(harder),
                "easier": per_module(easier) if len(easier) >= 3 else per_module(first),
            },
            "skill_share": share,
            "difficulty_mix": {"module1": h1, "harder": hh, "easier": he},
            "easier_mix_derived": derived,
        }
    json.dump(out, open(dst, "w"), indent=1)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
