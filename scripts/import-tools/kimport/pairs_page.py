"""Founder yes/no page for close-match pairs, and applying his answers.

render_pairs writes one self-contained HTML file (no network, no external
files). apply_decisions folds the answers back into clusters.json:
  same      the two questions are one: the smaller cluster joins the larger and
            corpus.elect picks the canonical (live, printed key, fewest holds,
            lowest id);
  different both stay canonical of their own clusters;
  undecided the non-live canonical stays founder_review (lint blocks it).
Held clusters (live_elsewhere, figure_review, answer_dispute) are never touched.
"""

import difflib
import hashlib
import html
import json
import os
import re
import tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from kimport import corpus
from kimport.keys import QuestionRecord

DECISIONS = ("same", "different")
_TOKEN = re.compile(r"\s+|\S+")
_FOLD = str.maketrans({"\u2018": "'", "\u2019": "'", "\u201a": "'", "\u201b": "'", "\u201c": '"', "\u201d": '"',
                       "\u201e": '"', "\u2013": "-", "\u2014": "-", "\u2212": "-"})


def _fold(s: str) -> str:
    """Curly vs straight quotes and dash widths are scanning noise, not differences."""
    return s.translate(_FOLD)

# ---------------------------------------------------------------- rendering


def _marked(a: str, b: str) -> tuple[str, str]:
    """HTML for a and b with the word-level differences wrapped in <mark>."""
    ta, tb = _TOKEN.findall(a), _TOKEN.findall(b)
    sm = difflib.SequenceMatcher(None, [_fold(t) for t in ta], [_fold(t) for t in tb], autojunk=False)
    out_a, out_b = [], []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        for out, toks in ((out_a, ta[i1:i2]), (out_b, tb[j1:j2])):
            seg = "".join(toks)
            if op == "equal" or not seg.strip():
                out.append(html.escape(seg))
                continue
            lead = seg[:len(seg) - len(seg.lstrip())]
            tail = seg[len(seg.rstrip()):]
            out.append(f"{html.escape(lead)}<mark>{html.escape(seg.strip())}</mark>{html.escape(tail)}")
    return "".join(out_a), "".join(out_b)


def _pair_choices(left: list[str], right: list[str]) -> tuple[dict[int, int], dict[int, int]]:
    """Greedy best-ratio matching, so a reordered choice is compared with its twin."""
    scored = sorted(((difflib.SequenceMatcher(None, _fold(x), _fold(y), autojunk=False).ratio(), i, j)
                     for i, x in enumerate(left) for j, y in enumerate(right)), key=lambda t: (-t[0], t[1], t[2]))
    lm: dict[int, int] = {}
    rm: dict[int, int] = {}
    for _, i, j in scored:
        if i not in lm and j not in rm:
            lm[i], rm[j] = j, i
    return lm, rm


def _choice_html(side: dict, other: dict) -> list[str]:
    mine, theirs = side["choices"], other["choices"]
    lm, _ = _pair_choices(mine, theirs)
    out = []
    for i, c in enumerate(mine):
        if i in lm:
            out.append(_marked(c, theirs[lm[i]])[0])
        else:
            out.append(f"<mark>{html.escape(c)}</mark>")
    return out


def _answer_html(side: dict, other: dict) -> str:
    return _marked(str(side["answer"]), str(other["answer"]))[0]


def _card(side: dict, other: dict, label: str) -> str:
    stem = _marked(side["text"], other["text"])[0]
    parts = [f'<section class="card"><h3>{html.escape(label)}'
             f'<span class="exam">{html.escape(side["id"])}</span></h3>',
             f'<p class="stem">{stem}</p>']
    if side["choices"]:
        items = "".join(f"<li><b>{'ABCD'[n] if n < 4 else n + 1}</b> <span>{c}</span></li>"
                        for n, c in enumerate(_choice_html(side, other)))
        parts.append(f'<ol class="choices">{items}</ol>')
    parts.append(f'<p class="ans">Answer: {_answer_html(side, other)}</p></section>')
    return "".join(parts)


def _pair_html(n: int, total: int, p: dict) -> str:
    pid = html.escape(p["pair_id"], quote=True)
    a, b = p["canonical"], p["member"]
    return (f'<article class="pair" data-pair="{pid}" id="p{n}">'
            f'<h2>Pair {n} of {total}</h2><div class="cards">{_card(a, b, "Left")}{_card(b, a, "Right")}</div>'
            f'<div class="buttons"><button type="button" class="same" data-pair="{pid}" data-val="same">Same</button>'
            f'<button type="button" class="diff" data-pair="{pid}" data-val="different">Different</button></div>'
            f'</article>')


def _json_in_script(obj) -> str:
    return (json.dumps(obj).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
            .replace("\u2028", "\\u2028").replace("\u2029", "\\u2029"))


CSS = """
:root{--bg:#fafaf7;--fg:#1d1d1b;--mute:#66665f;--card:#fff;--line:#d9d9d2;--mark:#ffe58a;--markfg:#1d1d1b;
--same:#1f6f43;--diff:#a03a2a;--bar:#fff}
@media (prefers-color-scheme: dark){:root{--bg:#161614;--fg:#ecece6;--mute:#a3a39b;--card:#1f1f1c;--line:#3a3a35;
--mark:#6b5a12;--markfg:#fff;--same:#4cae7a;--diff:#e07a68;--bar:#1f1f1c}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:18px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:1100px;margin:0 auto;padding:0 16px 80px}
header.bar{position:sticky;top:0;z-index:5;background:var(--bar);border-bottom:1px solid var(--line);padding:10px 16px;
display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
#counter{font-weight:600}
h1{font-size:1.4rem;margin:20px 0 8px}
.intro{color:var(--mute);margin:0 0 20px}
.pair{border-top:2px solid var(--line);padding:18px 0}
.pair h2{font-size:1.1rem;margin:0 0 10px}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (max-width:760px){.cards{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;overflow-wrap:anywhere}
.card h3{margin:0 0 8px;font-size:.95rem;color:var(--mute);display:flex;justify-content:space-between;gap:8px}
.exam{font-weight:400;font-size:.75rem;text-align:right}
.stem{white-space:pre-wrap;margin:0 0 8px}
.choices{list-style:none;margin:0 0 8px;padding:0}
.choices li{margin:2px 0}.choices b{display:inline-block;width:1.4em}
.ans{margin:0;color:var(--mute);font-size:.95rem}
mark{background:var(--mark);color:var(--markfg);border-radius:3px;padding:0 2px}
.buttons{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
button{font:inherit;font-weight:700;font-size:1.15rem;padding:16px 10px;border-radius:10px;border:2px solid var(--line);
background:var(--card);color:var(--fg);cursor:pointer;min-height:56px}
button.same[aria-pressed=true]{background:var(--same);border-color:var(--same);color:#fff}
button.diff[aria-pressed=true]{background:var(--diff);border-color:var(--diff);color:#fff}
.bar button{font-size:1rem;padding:8px 14px;min-height:40px}
textarea{width:100%;min-height:120px;font:13px/1.4 ui-monospace,Menlo,monospace;background:var(--card);color:var(--fg);
border:1px solid var(--line);border-radius:8px;padding:8px}
"""

JS = """
(function(){
var DATA=JSON.parse(document.getElementById('pair-data').textContent);
var IDS=DATA.ids,KEY=DATA.key,ans={};
try{var s=localStorage.getItem(KEY);if(s){var o=JSON.parse(s);IDS.forEach(function(id){
if(o&&(o[id]==='same'||o[id]==='different'))ans[id]=o[id];});}}catch(e){}
function out(){var r={};IDS.forEach(function(id){if(ans[id])r[id]=ans[id];});return r;}
function paint(){
var btns=document.querySelectorAll('button[data-pair]');
for(var i=0;i<btns.length;i++){var b=btns[i];b.setAttribute('aria-pressed',ans[b.getAttribute('data-pair')]===b.getAttribute('data-val')?'true':'false');}
var o=out(),n=Object.keys(o).length;
document.getElementById('counter').textContent=n+' of '+IDS.length+' answered';
document.getElementById('answers').value=JSON.stringify(o,null,1);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(out()));}catch(e){}}
document.addEventListener('click',function(e){var t=e.target;
if(t&&t.getAttribute&&t.getAttribute('data-val')&&t.getAttribute('data-pair')){
var id=t.getAttribute('data-pair'),v=t.getAttribute('data-val');
if(ans[id]===v){delete ans[id];}else{ans[id]=v;}save();paint();}});
var cb=document.getElementById('copy'),st=document.getElementById('copystatus'),ta=document.getElementById('answers');
cb.addEventListener('click',function(){var text=JSON.stringify(out());
function fallback(){ta.focus();ta.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}
st.textContent=ok?'Copied.':'Select the box at the bottom and copy it.';}
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){st.textContent='Copied.';},fallback);}
else{fallback();}});
paint();})();
"""


def render_pairs(pairs_json: Path, out_html: Path) -> int:
    doc = json.loads(Path(pairs_json).read_text(encoding="utf-8"))
    pairs = doc["pairs"]
    ids = [p["pair_id"] for p in pairs]
    key = "kpairs:" + hashlib.sha256("|".join(ids).encode("utf-8")).hexdigest()[:16]
    total = len(pairs)
    body = "".join(_pair_html(n, total, p) for n, p in enumerate(pairs, 1))
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Same or different?</title>
<style>{CSS}</style></head><body>
<header class="bar"><span id="counter">0 of {total} answered</span>
<span><button type="button" id="copy">Copy my answers</button> <span id="copystatus" aria-live="polite"></span></span></header>
<main>
<h1>Same or different?</h1>
<p class="intro">Same = a student would see the same question (only a scanning typo or choice order differs). Different = anything a student would notice: a number, a word that changes meaning, punctuation in a grammar question, a different figure. Highlighted text is where the two sides differ. Your answers are saved in this browser as you go.</p>
{body}
<h2>Your answers</h2>
<p class="intro">If the Copy button does not work on your device, select everything in this box and copy it.</p>
<textarea id="answers" readonly aria-label="Your answers as text"></textarea>
</main>
<script type="application/json" id="pair-data">{_json_in_script({"ids": ids, "key": key})}</script>
<script>{JS}</script>
</body></html>
"""
    Path(out_html).write_text(page, encoding="utf-8")
    return total


# ---------------------------------------------------------------- applying


def _atomic_write(path: Path, doc: dict) -> None:
    path = Path(path)
    fd, tmp = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def _stand_in(m: dict) -> QuestionRecord:
    """The election fields of a cluster member (corpus.elect reads only these)."""
    meta = {"source": m.get("source", "corpus"), "holds": [None] * int(m.get("holds") or 0),
            "reviewed_answer": {"kind": "official" if m.get("printed_key") else None}}
    return QuestionRecord(ref=m["id"], text="", choices=(), answer="", answer_format="mc",
                          is_live=bool(m.get("is_live")), meta=meta)


def pair_key(a: str, b: str) -> str:
    """Stable identity of a pair: the two occurrence ids, unordered (pair numbers change between runs)."""
    return "|".join(sorted([a, b]))


def _key_of(p: dict) -> str:
    return pair_key(p["canonical"]["id"], p["member"]["id"])


# ---- decision log (append-only) ----


def load_decisions(path: Path | None) -> dict[str, dict]:
    if path is None or not Path(path).exists():
        return {}
    doc = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(doc, dict):
        raise ValueError(f"{path} should be a JSON object of pair -> decision")
    for k, v in doc.items():
        if not isinstance(v, dict) or v.get("decision") not in DECISIONS:
            raise ValueError(f"{path}: the entry for {k} must look like {{\"decision\": \"same\" or \"different\"}}")
    return doc


def check_new(log: dict[str, dict], new: dict[str, str], log_name: str = "founder_decisions.json") -> None:
    for k, v in sorted(new.items()):
        old = log.get(k, {}).get("decision")
        if old and old != v:
            raise ValueError(f"This pair was already answered '{old}' and you now say '{v}'. If the first answer was "
                             f"a mistake, remove its line from {log_name} and run again. Pair: {k}")


def append_decisions(path: Path, log: dict[str, dict], new: dict[str, str], now: str) -> dict[str, dict]:
    merged = dict(log)
    for k, v in new.items():
        merged.setdefault(k, {"decision": v, "at": now})
    if merged != log:
        _atomic_write(Path(path), dict(sorted(merged.items())))
    return merged


# ---- applying decisions to a clusters document ----


class _Groups:
    def __init__(self):
        self.parent: dict[str, str] = {}

    def find(self, x):
        while self.parent.get(x, x) != x:
            self.parent[x] = self.parent.get(self.parent[x], self.parent[x])
            x = self.parent[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[rb] = ra


def _chain(edges: dict[str, list[tuple[str, str]]], start: str, goal: str) -> list[str]:
    """The 'same' answers (pair keys) linking two clusters."""
    seen, queue = {start: []}, [start]
    for node in queue:
        for nxt, key in edges.get(node, ()):
            if nxt not in seen:
                seen[nxt] = seen[node] + [key]
                queue.append(nxt)
    return seen.get(goal, [])


def _refresh(doc: dict, c: dict) -> None:
    """Canonical role of a settled cluster: founder_review while it is not live and has undecided pairs."""
    canon = next(m for m in c["members"] if m["id"] == c["canonical"])
    pending = bool(c["founder_pairs"]) and not canon["is_live"]
    doc["roles"][c["canonical"]] = "founder_review" if pending else "canonical"
    for m in c["members"]:
        if m["id"] != c["canonical"]:
            doc["roles"][m["id"]] = "member"


def apply_to_doc(doc: dict, pairs: list[dict], decided: dict[str, str]) -> list[dict]:
    """Apply decisions {pair_key: 'same'|'different'} to a clusters document (roles, clusters, counts) in place.
    Returns the pairs still undecided. Raises ValueError, changing nothing, if the answers contradict
    each other or touch a held cluster. Used by `pairs apply` and by `corpus` (re-applying saved answers)."""
    clusters = {c["cluster_id"]: c for c in doc["clusters"]}
    owner = {m["id"]: c["cluster_id"] for c in doc["clusters"] for m in c["members"]}
    ends = {_key_of(p): (p["canonical"]["id"], p["member"]["id"]) for p in pairs}
    for k in decided:
        ends.setdefault(k, tuple(k.split("|")))
    for k in sorted(decided):
        for mid in ends[k]:
            if mid not in owner:
                raise ValueError(f"The answer for {k} names {mid}, which is not in this clusters file. "
                                 "Re-run the corpus step, then apply again.")
            c = clusters[owner[mid]]
            if c["status"] != "settled":
                raise ValueError(f"The answer for {k} is about {mid}, whose group is on hold ({c['status']}). "
                                 "Held groups cannot be decided on this page.")
    groups, edges = _Groups(), {}
    for k in sorted(decided):
        if decided[k] == "same":
            a, b = (owner[m] for m in ends[k])
            groups.union(a, b)
            edges.setdefault(a, []).append((b, k))
            edges.setdefault(b, []).append((a, k))
    clash = []
    for k in sorted(decided):
        a, b = (owner[m] for m in ends[k])
        if decided[k] == "different" and groups.find(a) == groups.find(b):
            clash.append(f"{k} was answered 'different', but these 'same' answers join its two questions: "
                         + "; ".join(_chain(edges, a, b)))
    if clash:
        raise ValueError("Your answers contradict each other, so nothing was changed. " + " | ".join(clash)
                         + ". Fix the wrong answer (remove its line from founder_decisions.json) and run again.")

    members_of: dict[str, list[str]] = {}
    for cid in clusters:
        members_of.setdefault(groups.find(cid), []).append(cid)
    touched, merges = set(), 0
    for root, cids in members_of.items():
        if len(cids) == 1:
            continue
        cs = sorted((clusters[c] for c in cids), key=lambda c: (-len(c["members"]), c["cluster_id"]))
        big = cs[0]
        canons = [next(m for m in c["members"] if m["id"] == c["canonical"]) for c in cs]
        winner = corpus.elect([_stand_in(m) for m in canons]).ref
        members = [m for c in cs for m in c["members"]]
        for m in members:
            if m["id"] == winner:
                m["match"] = "canonical"
                m.pop("duplicate_of", None)
            elif m["id"] in {x["id"] for x in canons}:
                m["match"] = "founder_same"
                m["duplicate_of"] = winner
        members.sort(key=lambda m: m["id"] != winner)
        big.update(members=members, canonical=winner, keeper_tie=False,
                   is_live=any(c["is_live"] for c in cs),
                   founder_pairs=sorted({p for c in cs for p in c["founder_pairs"]}))
        for c in cs[1:]:
            del clusters[c["cluster_id"]]
        for m in members:
            owner[m["id"]] = big["cluster_id"]
        touched.add(big["cluster_id"])
        merges += len(cs) - 1

    remaining = [p for p in pairs if _key_of(p) not in decided and owner.get(p["canonical"]["id"]) != owner.get(p["member"]["id"])]
    keep = {p["pair_id"] for p in remaining}
    for c in clusters.values():
        pend = [x for x in c["founder_pairs"] if x in keep]
        if pend != c["founder_pairs"]:
            c["founder_pairs"] = pend
            touched.add(c["cluster_id"])
    for p in remaining:
        p["canonical"]["cluster_id"], p["member"]["cluster_id"] = owner[p["canonical"]["id"]], owner[p["member"]["id"]]
    doc["clusters"] = [c for c in doc["clusters"] if c["cluster_id"] in clusters]
    for cid in sorted(touched):
        _refresh(doc, clusters[cid])
    doc["founder_decisions"] = {k: decided[k] for k in sorted(decided)}
    counts = doc.setdefault("counts", {})
    counts["roles"] = dict(Counter(doc["roles"].values()))
    for k in ("unique", "unique_not_live", "clusters_settled"):
        if k in counts:
            counts[k] -= merges
    counts["founder_pairs"] = len(remaining)
    if "unique" in counts:
        g = _Groups()
        floor = counts["unique"]
        for p in remaining:
            a, b = g.find(owner[p["canonical"]["id"]]), g.find(owner[p["member"]["id"]])
            if a != b:
                g.union(a, b)
                floor -= 1
        counts["unique_floor_if_every_pair_is_same"] = floor
    return remaining


def apply_decisions(pairs_json: Path, decisions_json: Path, clusters_json: Path,
                    decisions_file: Path | None = None, now: str | None = None) -> None:
    """Fold the founder's page answers {pair_id: 'same'|'different'} into clusters.json. The answers are first
    appended to the decision log (default founder_decisions.json next to clusters.json) so a corpus re-run keeps them."""
    clusters_json = Path(clusters_json)
    pairs_doc = json.loads(Path(pairs_json).read_text(encoding="utf-8"))
    answers = json.loads(Path(decisions_json).read_text(encoding="utf-8"))
    doc = json.loads(clusters_json.read_text(encoding="utf-8"))
    if not isinstance(answers, dict):
        raise ValueError("The answers file must be a JSON object like {\"fp-...\": \"same\"}.")
    if pairs_doc.get("normalizer_version") != doc.get("normalizer_version"):
        raise ValueError(f"The pairs file (normalizer {pairs_doc.get('normalizer_version')!r}) and clusters file "
                         f"({doc.get('normalizer_version')!r}) come from different runs. Re-run the corpus step.")
    pairs = {p["pair_id"]: p for p in pairs_doc["pairs"]}
    unknown = sorted(set(answers) - set(pairs))
    if unknown:
        raise ValueError(f"These pair ids are not in the pairs file (wrong or older file?): {', '.join(unknown)}")
    bad = {k: v for k, v in answers.items() if v not in DECISIONS}
    if bad:
        raise ValueError(f"Each answer must be exactly 'same' or 'different'. Got: {bad}")
    log_path = Path(decisions_file) if decisions_file else clusters_json.parent / "founder_decisions.json"
    log = load_decisions(log_path)
    new = {_key_of(pairs[pid]): v for pid, v in answers.items()}
    check_new(log, new, log_path.name)
    decided = {**{k: v["decision"] for k, v in log.items()}, **new}
    apply_to_doc(doc, [dict(p) for p in pairs_doc["pairs"]], decided)  # raises before anything is written
    if new:
        append_decisions(log_path, log, new, now or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    _atomic_write(clusters_json, doc)
