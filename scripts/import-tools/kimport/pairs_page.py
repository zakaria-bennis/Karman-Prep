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

import copy
import difflib
import hashlib
import html
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from kimport import corpus
from kimport.jsonio import FileLock, atomic_write_json
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


def _norm(s: str) -> str:
    return " ".join(_fold(str(s)).split())


def _identical_choices(a: dict, b: dict) -> bool:
    """Same choices (in any order) and same answer: nothing for the founder to compare there."""
    return (sorted(_norm(c) for c in a["choices"]) == sorted(_norm(c) for c in b["choices"])
            and _norm(a["answer"]) == _norm(b["answer"]))


def _card(side: dict, other: dict, label: str, show_choices: bool) -> str:
    stem = _show_formatting(_marked(side["text"], other["text"])[0])
    parts = [f'<section class="card"><h3>{html.escape(label)}'
             f'<span class="exam">{html.escape(side["id"])}</span></h3>',
             f'<p class="stem">{stem}</p>']
    if show_choices:
        if side["choices"]:
            items = "".join(f"<li><b>{'ABCD'[n] if n < 4 else n + 1}</b> <span>{_show_formatting(c)}</span></li>"
                            for n, c in enumerate(_choice_html(side, other)))
            parts.append(f'<ol class="choices">{items}</ol>')
        parts.append(f'<p class="ans">Answer: {_show_formatting(_answer_html(side, other))}</p>')
    parts.append("</section>")
    return "".join(parts)


_FORMAT_TOKENS = {"&lt;u&gt;": "<u>", "&lt;/u&gt;": "</u>", "&lt;i&gt;": "<i>", "&lt;/i&gt;": "</i>",
                  "[[u]]": "<u>", "[[/u]]": "</u>", "[[i]]": "<i>", "[[/i]]": "</i>"}


def _show_formatting(markup: str) -> str:
    """Draw the source underline/italic tokens as real formatting, the way the student page does,
    instead of printing them as code."""
    for token, tag in _FORMAT_TOKENS.items():
        markup = markup.replace(token, tag)
    return markup


def _pair_html(p: dict) -> str:
    pid = html.escape(p["pair_id"], quote=True)
    a, b = p["canonical"], p["member"]
    same = _identical_choices(a, b)
    if same:
        items = "".join(f"<li><b>{'ABCD'[n] if n < 4 else n + 1}</b> <span>{_show_formatting(html.escape(c))}</span></li>"
                        for n, c in enumerate(a["choices"]))
        lst = f'<ol class="choices">{items}</ol>' if a["choices"] else ""
        what = "choices and answer identical" if a["choices"] else "answer identical"
        extra = (f'<details class="same-choices"><summary>{what} <span class="link">show choices (C)</span></summary>'
                 f'{lst}<p class="ans">Answer: {_show_formatting(html.escape(str(a["answer"])))}</p></details>')
    else:
        extra = '<p class="differs">The choices or the answer differ (highlighted below).</p>'
    return (f'<article class="pair" data-pair="{pid}" hidden>'
            f'<div class="cards">{_card(a, b, "Left", not same)}{_card(b, a, "Right", not same)}</div>{extra}'
            f'</article>')


def _json_in_script(obj) -> str:
    return (json.dumps(obj).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
            .replace("\u2028", "\\u2028").replace("\u2029", "\\u2029"))


CSS = """
:root{color-scheme:dark;--bg:#0d0e11;--fg:#f3f4f6;--mute:#aeb4bf;--card:#171920;--line:#2b2f3a;--mark:#ffd24a;
--markfg:#111;--same:#1f8f5a;--diff:#c4442e;--bar:#12141a}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--fg)}
body{font:18px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;padding-bottom:170px}
[hidden]{display:none!important}
header.bar{position:sticky;top:0;z-index:5;background:var(--bar);border-bottom:1px solid var(--line)}
.track{height:4px;background:var(--line)}#prog{height:4px;width:0;background:var(--same);transition:width .15s}
.top{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:8px 16px}
#counter{font-weight:600;font-variant-numeric:tabular-nums}
.rule{margin:0;padding:8px 16px;font-size:.9rem;color:var(--mute);border-bottom:1px solid var(--line);background:var(--bar)}
main{max-width:1200px;margin:0 auto;padding:16px}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media (max-width:760px){.cards{grid-template-columns:1fr}body{font-size:17px}}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;overflow-wrap:anywhere}
.card h3{margin:0 0 8px;font-size:.8rem;color:var(--mute);display:flex;justify-content:space-between;gap:8px;
text-transform:uppercase;letter-spacing:.04em}
.exam{font-weight:400;text-transform:none;letter-spacing:0;text-align:right}
.stem{white-space:pre-wrap;margin:0 0 8px;font-size:1.2rem;line-height:1.65}
.choices{list-style:none;margin:8px 0;padding:0}
.choices li{margin:3px 0}.choices b{display:inline-block;width:1.5em;color:var(--mute)}
.ans{margin:6px 0 0;color:var(--mute);font-size:.95rem}
.differs{margin:12px 2px 0;color:var(--mark);font-weight:600}
details.same-choices{margin:14px 2px 0;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px;color:var(--mute)}
details summary{cursor:pointer}.link{text-decoration:underline;margin-left:6px}
mark{background:var(--mark);color:var(--markfg);border-radius:3px;padding:0 2px}
.actions{position:fixed;left:0;right:0;bottom:0;z-index:6;background:var(--bar);border-top:1px solid var(--line);
padding:10px 12px calc(10px + env(safe-area-inset-bottom))}
.actions .in{max-width:1200px;margin:0 auto}
.big{display:grid;grid-template-columns:1fr 1fr;gap:12px}
button{font:inherit;color:var(--fg);background:var(--card);border:2px solid var(--line);border-radius:12px;cursor:pointer}
button.big-btn{font-weight:700;font-size:1.3rem;min-height:68px;color:#fff}
button.same{background:var(--same);border-color:var(--same)}button.diff{background:var(--diff);border-color:var(--diff)}
button kbd{font:inherit;font-weight:400;opacity:.85;font-size:.9rem;margin-left:6px}
.small{display:flex;gap:10px;align-items:center;margin-top:8px;font-size:.9rem;color:var(--mute)}
.small button,.top button{font-size:.9rem;padding:8px 14px;min-height:40px}
#last{margin-left:auto;text-align:right}
button:disabled{opacity:.4;cursor:default}
button:focus-visible,summary:focus-visible{outline:3px solid var(--mark);outline-offset:2px}
#panel{max-width:760px;margin:0 auto}
#panel h1{font-size:1.6rem;margin:10px 0}
textarea{width:100%;min-height:160px;font:13px/1.4 ui-monospace,Menlo,monospace;background:var(--card);color:var(--fg);
border:1px solid var(--line);border-radius:8px;padding:8px}
.row{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.row .big-btn,.row a.big-btn{min-height:56px;padding:0 20px}
a.big-btn{display:inline-flex;align-items:center;text-decoration:none;font-weight:700;border-radius:12px;
background:var(--card);border:2px solid var(--line);color:var(--fg)}
"""

JS = """
(function(){
var DATA=JSON.parse(document.getElementById('pair-data').textContent);
var IDS=DATA.ids,KEY=DATA.key,N=IDS.length;
var st={a:{},o:IDS.slice(),h:[],t:[]},lastT=0,showPanel=false;
var known={};IDS.forEach(function(id){known[id]=1;});
try{var s=JSON.parse(localStorage.getItem(KEY)||'null');
if(s&&typeof s==='object'){
if(s.a&&typeof s.a==='object')for(var k in s.a){if(known[k]&&(s.a[k]==='same'||s.a[k]==='different'))st.a[k]=s.a[k];}
if(Array.isArray(s.o)){var seen={},o=[];s.o.forEach(function(id){if(known[id]&&!seen[id]){seen[id]=1;o.push(id);}});
IDS.forEach(function(id){if(!seen[id])o.push(id);});st.o=o;}
if(Array.isArray(s.h))st.h=s.h.filter(function(x){return x&&known[x.id]&&(x.v==='same'||x.v==='different'||x.v==='skip');}).slice(-300);
if(Array.isArray(s.t))st.t=s.t.filter(function(x){return typeof x==='number'&&isFinite(x);}).slice(-30);}}catch(e){}
var els={};Array.prototype.forEach.call(document.querySelectorAll('article.pair'),function(a){els[a.getAttribute('data-pair')]=a;});
function $(id){return document.getElementById(id);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){}}
function out(){var r={};IDS.forEach(function(id){if(st.a[id])r[id]=st.a[id];});return r;}
function answered(){return Object.keys(out()).length;}
function current(){for(var i=0;i<st.o.length;i++){if(!st.a[st.o[i]])return st.o[i];}return null;}
function toFront(id){st.o=[id].concat(st.o.filter(function(x){return x!==id;}));}
function toEnd(id){st.o=st.o.filter(function(x){return x!==id;}).concat([id]);}
function say(t){$('last').textContent=t;}
var shown=null;
function paint(){
var cur=current(),n=answered(),left=N-n;
var avg=7000;if(st.t.length){avg=st.t.reduce(function(x,y){return x+y;},0)/st.t.length;}
var mins=Math.ceil(left*avg/60000);
$('counter').textContent=n+' / '+N+(left?' \\u00b7 '+(mins<1?'<1':'~'+mins)+' min left':' \\u00b7 done');
$('prog').style.width=(N?100*n/N:100)+'%';
var panel=showPanel||cur===null;
$('panel').hidden=!panel;$('stage').hidden=panel;
$('actions').hidden=panel&&cur===null;
$('back').hidden=cur===null;
$('donehead').textContent=cur===null?'All '+N+' answered':'Your answers so far';
$('answers').value=JSON.stringify(out(),null,1);
$('undo').disabled=!st.h.length;download();
if(cur!==shown){if(shown&&els[shown])els[shown].hidden=true;shown=cur;
if(cur&&els[cur]){els[cur].hidden=false;var d=els[cur].querySelector('details');if(d)d.open=false;}
window.scrollTo(0,0);}
}
function answer(v){if(showPanel)return;var id=current();if(!id)return;
var now=Date.now();if(lastT&&now-lastT<90000){st.t.push(now-lastT);st.t=st.t.slice(-30);}lastT=now;
st.a[id]=v;st.h.push({id:id,v:v});st.h=st.h.slice(-300);save();say((v==='same'?'Same':'Different')+' saved. U = undo');paint();}
function skip(){if(showPanel)return;var id=current();if(!id)return;toEnd(id);st.h.push({id:id,v:'skip'});st.h=st.h.slice(-300);save();say('Skipped for later');paint();}
function undo(){var x=st.h.pop();if(!x)return;delete st.a[x.id];toFront(x.id);showPanel=false;lastT=0;save();say('Undone');paint();}
function copy(){var text=JSON.stringify(out()),ta=$('answers'),st2=$('copystatus');
function fallback(){showPanel=true;paint();ta.focus();ta.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}
st2.textContent=ok?'Copied.':'Press Ctrl/Cmd+C to copy the selected text.';}
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){st2.textContent='Copied '+answered()+' answers.';},fallback);}
else{fallback();}}
function download(e){var a=$('dl');a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(out(),null,1));}
function bind(id,fn){$(id).addEventListener('click',function(e){fn(e);if(e.currentTarget.blur)e.currentTarget.blur();});}
bind('btn-same',function(){answer('same');});bind('btn-diff',function(){answer('different');});
bind('undo',undo);bind('skip',skip);bind('copy',copy);bind('copy2',copy);
bind('back',function(){showPanel=false;paint();});
$('dl').addEventListener('click',download);$('dl').addEventListener('focus',download);$('dl').addEventListener('mouseover',download);
$('show').addEventListener('click',function(){showPanel=true;paint();});
function toggleChoices(){var c=current();if(!c||showPanel)return;var d=els[c].querySelector('details');if(d)d.open=!d.open;}
var map={s:'S',j:'S',arrowright:'S',d:'D',k:'D',arrowleft:'D',u:'U',backspace:'U',' ':'K',c:'C'};
document.addEventListener('keydown',function(e){
if(e.ctrlKey||e.metaKey||e.altKey)return;
var tg=(e.target&&e.target.tagName)||'';if(tg==='TEXTAREA'||tg==='INPUT')return;
var a=map[(e.key||'').toLowerCase()];if(!a)return;
if(e.key===' '||e.key==='Backspace'||e.key.indexOf('Arrow')===0)e.preventDefault();
if(e.repeat)return;
if(a==='S')answer('same');else if(a==='D')answer('different');else if(a==='U')undo();else if(a==='K')skip();else toggleChoices();});
document.addEventListener('keyup',function(e){if(e.key===' ')e.preventDefault();});
paint();})();
"""


def render_pairs(pairs_json: Path, out_html: Path) -> int:
    doc = json.loads(Path(pairs_json).read_text(encoding="utf-8"))
    # Easiest first: the most similar pairs (one word apart) lead; skipped ones come back at the end.
    pairs = sorted(doc["pairs"], key=lambda p: -float(p.get("ratio") or 0))
    ids = [p["pair_id"] for p in pairs]
    key = "kpairs:" + hashlib.sha256("|".join(sorted(ids)).encode("utf-8")).hexdigest()[:16]
    total = len(pairs)
    body = "".join(_pair_html(p) for p in pairs)
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>Same or different?</title>
<style>{CSS}</style></head><body>
<header class="bar"><div class="track"><div id="prog"></div></div>
<div class="top"><span id="counter">0 / {total}</span>
<span><span id="copystatus" aria-live="polite"></span> <button type="button" id="copy">Copy answers</button></span></div>
<p class="rule">Same = a student would see the same question (only a scanning typo or choice order differs). Different = a number, a meaning word, punctuation in a grammar question, or a different figure.</p></header>
<main><div id="stage">
{body}
</div>
<section id="panel" hidden><h1 id="donehead">All answered</h1>
<p>Copy the answers and paste them to Claude, or download the file.</p>
<div class="row"><button type="button" class="big-btn same" id="copy2">Copy answers</button>
<a class="big-btn" id="dl" download="answers.json" href="data:application/json;charset=utf-8,%7B%7D">Download answers.json</a>
<button type="button" class="big-btn" id="back">Back to pairs</button></div>
<textarea id="answers" readonly aria-label="Your answers as text" onfocus="this.select()"></textarea></section></main>
<div class="actions" id="actions"><div class="in"><div class="big">
<button type="button" class="big-btn diff" id="btn-diff">&larr; Different<kbd>D</kbd></button>
<button type="button" class="big-btn same" id="btn-same">Same &rarr;<kbd>S</kbd></button></div>
<div class="small"><button type="button" id="undo">Undo (U)</button><button type="button" id="skip">Skip (Space)</button>
<button type="button" id="show">My answers</button><span id="last"></span></div></div></div>
<script type="application/json" id="pair-data">{_json_in_script({"ids": ids, "key": key})}</script>
<script>{JS}</script>
</body></html>
"""
    Path(out_html).write_text(page, encoding="utf-8")
    return total


# ---------------------------------------------------------------- applying


def _stand_in(m: dict) -> QuestionRecord:
    """The election fields of a cluster member (corpus.elect reads only these)."""
    meta = {"source": m.get("source", "corpus"), "holds": [None] * int(m.get("holds") or 0),
            "reviewed_answer": {"kind": "official" if m.get("printed_key") else None},
            "lane_blocked": bool(m.get("in_lane"))}
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
        atomic_write_json(Path(path), dict(sorted(merged.items())))
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


def apply_to_doc(doc: dict, pairs: list[dict], decided: dict[str, str], stale: list | None = None) -> list[dict]:
    """Apply decisions {pair_key: 'same'|'different'} to a clusters document (roles, clusters, counts) in place.
    Returns the pairs still undecided. Raises ValueError, changing nothing, if the answers contradict
    each other or touch a held cluster. With a `stale` list (corpus re-runs), an answer that no longer applies
    (a side missing, in a held group, or a "different" already merged automatically) is skipped and listed
    there as {"pair", "decision", "reason"} instead of raising. Used by `pairs apply` and by `corpus` (re-applying saved answers)."""
    clusters = {c["cluster_id"]: c for c in doc["clusters"]}
    owner = {m["id"]: c["cluster_id"] for c in doc["clusters"] for m in c["members"]}
    ends = {_key_of(p): (p["canonical"]["id"], p["member"]["id"]) for p in pairs}
    for k in decided:
        ends.setdefault(k, tuple(k.split("|")))
    decided = dict(decided)
    for k in sorted(decided):
        why = None
        for mid in ends[k]:
            if mid not in owner:
                why = ("missing", f"The answer for {k} names {mid}, which is not in this clusters file. "
                                  "Re-run the corpus step, then apply again.")
                break
            c = clusters[owner[mid]]
            if c["status"] != "settled":
                why = ("on_hold", f"The answer for {k} is about {mid}, whose group is on hold ({c['status']}). "
                                  "Held groups cannot be decided on this page.")
                break
        if why is None and stale is not None and decided[k] == "different" and owner[ends[k][0]] == owner[ends[k][1]]:
            why = ("merged_automatically", "")
        if why:
            if stale is None:
                raise ValueError(why[1])
            stale.append({"pair": k, "decision": decided.pop(k), "reason": why[0]})
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
                         + ". To fix this, open founder_decisions.json, delete the line for the answer that is wrong (one of the pairs "
                         "named above), and run the same command again.")

    members_of: dict[str, list[str]] = {}
    for cid in clusters:
        members_of.setdefault(groups.find(cid), []).append(cid)
    touched, merges, not_live_drop, live_drop = set(), 0, 0, 0
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
        n_live = sum(bool(c["is_live"]) for c in cs)  # before big is overwritten
        big.update(members=members, canonical=winner, keeper_tie=False,
                   is_live=any(c["is_live"] for c in cs),
                   founder_pairs=sorted({p for c in cs for p in c["founder_pairs"]}))
        not_live_drop += (len(cs) - n_live) - (0 if n_live else 1)
        live_drop += n_live - (1 if n_live else 0)
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
    for k, drop in (("unique", merges), ("clusters_settled", merges), ("unique_not_live", not_live_drop),
                    ("live_unique", live_drop)):
        if k in counts:
            counts[k] -= drop
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


def live_saved_answers(doc: dict, pairs: list[dict], saved: dict[str, str]) -> dict[str, str]:
    """Saved answers that still apply to this clusters file. An earlier answer about a question that has
    since left the bank (hidden by QA, retired) or whose group is now on hold is skipped, the same way a
    corpus re-run skips it; only NEW answers are checked strictly."""
    stale: list = []
    apply_to_doc(copy.deepcopy(doc), [dict(p) for p in pairs], dict(saved), stale)
    gone = {x["pair"] for x in stale}
    return {k: v for k, v in saved.items() if k not in gone}


def apply_decisions(pairs_json: Path, decisions_json: Path, clusters_json: Path,
                    decisions_file: Path | None = None, now: str | None = None) -> None:
    """Fold the founder's page answers {pair_id: 'same'|'different'} into clusters.json. The answers are first
    appended to the decision log (default founder_decisions.json next to clusters.json) so a corpus re-run keeps them."""
    clusters_json = Path(clusters_json)
    with FileLock(clusters_json):  # same lock as corpus and lane.promote_next_member
        _apply_decisions_locked(Path(pairs_json), Path(decisions_json), clusters_json, decisions_file, now)


def _apply_decisions_locked(pairs_json: Path, decisions_json: Path, clusters_json: Path,
                            decisions_file: Path | None, now: str | None) -> None:
    pairs_doc = json.loads(pairs_json.read_text(encoding="utf-8"))
    answers = json.loads(decisions_json.read_text(encoding="utf-8"))
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
    saved = live_saved_answers(doc, pairs_doc["pairs"], {k: v["decision"] for k, v in log.items()})
    decided = {**saved, **new}
    apply_to_doc(doc, [dict(p) for p in pairs_doc["pairs"]], decided)  # raises before anything is written
    if new:
        append_decisions(log_path, log, new, now or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    atomic_write_json(clusters_json, doc)
