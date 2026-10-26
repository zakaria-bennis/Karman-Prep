"""Live duplicates for `k qa certify` (check live_duplicate, fail level): live rows that are the
same question once formatting is set aside. Read-only; runs on an export.

The fingerprint of a row (two: the text split into lines, and into sentences) is its text with underline and italic tokens, math delimiters, blank
style and length, quotes, dash style, list bullets, case, all spacing and a closing period set
aside; the passage and stem sentences and lines (a blank counts as its own) and the choices are
compared as sorted lists (so a question written before or after its passage, or with its
choices in another order, is the same question); the answer is the
correct choice's text (not its letter) or the numeric key's value; any figure data counts as is.
Every group of two or more live rows (is_live, not archived, publish_status publish_ready or
publish_ready_with_verified_repair) fails, each row naming the others.
"""

import difflib
import hashlib
import json
import re
import unicodedata
from fractions import Fraction

from kimport.qa_bank_checks import parse_numeric

LIVE_STATUSES = ("publish_ready", "publish_ready_with_verified_repair")
_TEXT = ("passage_intro", "passage", "passage_a", "passage_b", "question_text")
_FIGURE = ("figure_table_data", "figure_chart_data", "figure_geometry_data", "figure_svg", "image_url")

_TOKENS = re.compile(r"\[\[/?[a-z]\]\]|</?[a-z]+\s*/?>")
_QUOTES = re.compile(r"[\"'‘’‛′`´ʻʼ“”„″«»]")
# A list bullet at the start of a text line ("- The willow oak ...", "• 1914: ..."); in a math
# question a "- " before a number is a minus sign and stays.
_BULLET = re.compile(r"^\s*(?:[•*·▪●◦‣]|-(?=\s))\s*")
_MATH_BULLET = re.compile(r"^\s*(?:[•*·▪●◦‣]|-(?=\s+[^\W\d]))\s*")
_DASHES = re.compile(r"[‐‑‒–—―−﹣－]")
_BLANK = re.compile(r"_{2,}(?:\s*blank\b)?", re.I)
_LATEX_SPACING = re.compile(r"\\(?:left|right|displaystyle|[,;:! ]|quad|qquad)")


def norm(text) -> str:
    """One line or choice with its formatting set aside: tokens, quotes, dash style, blanks,
    math delimiters, spacing, case and one closing period."""
    t = _TOKENS.sub("", str(text or ""))
    t = _QUOTES.sub("", unicodedata.normalize("NFKC", t))
    t = re.sub(r"-{2,}", "-", _DASHES.sub("-", t))  # "---" is how a source writes a dash
    t = _BLANK.sub("\x00", t)
    t = _LATEX_SPACING.sub("", t).replace("\\(", "").replace("\\)", "").replace("$", "")
    t = re.sub(r"\\[dt]frac", r"\\frac", t)
    t = re.sub(r"\s+", "", t).lower()
    t = re.sub(r"(?<!\.)\.$", "", t)
    return re.sub(r"\x00+", "_", t)


_LINE = re.compile(r"\n+")
_SENTENCE = re.compile(r"\n+|(?<=[.?!:])\s+")


def _lines(row: dict, split=_LINE) -> list[str]:
    """The text as a sorted list of lines (or sentences, split=_SENTENCE); a blank counts as one
    of its own (a blank at the end of a sentence or on the next line is the same blank)."""
    out, bullet = [], _MATH_BULLET if row.get("subject") == "math" else _BULLET
    for f in _TEXT:
        for line in split.split(row.get(f) or ""):
            out += [n for n in re.split(r"(_)", norm(bullet.sub("", _TOKENS.sub("", line)))) if n]
    return sorted(out)


def _answer(row: dict) -> str:
    key = str(row.get("correct_answer") or "").strip()
    if row.get("answer_format") == "numeric_entry":
        v = parse_numeric(key)
        return str(v) if isinstance(v, Fraction) else norm(key)
    for c in row.get("answer_choices") or []:
        if str(c.get("letter")) == key.upper():
            return norm(c.get("choice_text")) + json.dumps(c.get("choice_table_data"), sort_keys=True)
    return "key:" + key


def _choices(row: dict) -> list[str]:
    return sorted(norm(c.get("choice_text")) + json.dumps(c.get("choice_table_data"), sort_keys=True)
                  for c in row.get("answer_choices") or [])


def _frame(row: dict) -> dict:
    return {"format": row.get("answer_format") or "multiple_choice",
            "figure": {f: row.get(f) for f in _FIGURE if row.get(f) not in (None, "")}}


def _key(obj) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def fingerprints(row: dict) -> list[str]:
    """Two fingerprints, the text split into lines and into sentences (a source that breaks a
    line mid-paragraph, or one that does not break where another does): either one shared is a
    copy."""
    rest = {**_frame(row), "choices": _choices(row), "answer": _answer(row)}
    return [_key({**rest, "text": _lines(row, split), "split": n}) for n, split in enumerate((_LINE, _SENTENCE))]


# A near copy: one side (the text, or the choices and answer) the same once formatting is set
# aside, the other differing only by a typo or a punctuation mark: at most two places, each at
# most two characters, and the same numbers in the same order. ("grove" for "river", a name or
# a word swapped as in the SAT's own variants of one item, is a different question.)
TYPO_PLACES, TYPO_CHARS = 2, 2


def _digits(parts) -> list[str]:
    return re.findall(r"\d+", "\n".join(parts))


def _close(a: list[str], b: list[str]) -> bool:
    x, y = "\n".join(a), "\n".join(b)
    if x == y:
        return True
    if _digits(a) != _digits(b) or abs(len(x) - len(y)) > TYPO_PLACES * TYPO_CHARS:
        return False
    ops = [max(i2 - i1, j2 - j1) for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, x, y, autojunk=False).get_opcodes()
           if op != "equal"]
    return len(ops) <= TYPO_PLACES and max(ops) <= TYPO_CHARS


def _near_pairs(rows: list[dict]):
    """(id, id) for near copies: same choices and answer with close text, or the same text with
    close choices and answer."""
    info = {str(r["id"]): (_frame(r), _lines(r), _choices(r), _answer(r)) for r in rows}
    blocks: dict[tuple, list[str]] = {}
    for rid, (frame, text, choices, answer) in info.items():
        blocks.setdefault(("c", _key([frame, choices, answer])), []).append(rid)
        blocks.setdefault(("t", _key([frame, text])), []).append(rid)
    for (side, _), ids in blocks.items():
        for i, a in enumerate(ids):
            for b in ids[i + 1:]:
                _, ta, ca, aa = info[a]
                _, tb, cb, ab = info[b]
                if (_close(ta, tb) if side == "c" else _close(ca, cb) and _close([aa], [ab])):
                    yield a, b


def groups(rows: list[dict]) -> list[list[str]]:
    """Sorted id lists of live rows that are the same question: the same fingerprint, or near
    copies (joined, so a group holds every copy)."""
    live = [r for r in rows if is_live(r)]
    parent = {str(r["id"]): str(r["id"]) for r in live}

    def root(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    by: dict[str, str] = {}
    for r in live:
        rid = str(r["id"])
        for fp in fingerprints(r):
            if fp in by:
                parent[root(rid)] = root(by[fp])
            else:
                by[fp] = rid
    for a, b in _near_pairs(live):
        parent[root(a)] = root(b)
    out: dict[str, list[str]] = {}
    for rid in parent:
        out.setdefault(root(rid), []).append(rid)
    return sorted(sorted(v) for v in out.values() if len(v) > 1)


def is_live(row: dict) -> bool:
    return row.get("is_live") is True and row.get("archived_at") is None and row.get("publish_status") in LIVE_STATUSES


def findings(rows: list[dict]) -> tuple[list[list[str]], dict[str, list[str]]]:
    """(groups, {id: ["same question as <ids>"]}) for every row in a duplicate group."""
    found = groups(rows)
    per = {}
    for g in found:
        for rid in g:
            per[rid] = [f"same question as {', '.join(x for x in g if x != rid)} (live, {len(g)} copies)"]
    return found, per
