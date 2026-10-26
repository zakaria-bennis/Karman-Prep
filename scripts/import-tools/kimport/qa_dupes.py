"""Live duplicates (check live_duplicate, fail level): live rows that are the same question once
formatting is set aside. `k qa certify` groups the live bank; the stage, QA correction and
publish prechecks (kimport.bank_gate) refuse a row that is the same question as a live row.
Read-only; runs on an export.

The fingerprint of a row (two: the text split into lines, and into sentences) is its text with underline and italic tokens, math delimiters, blank
style and length, quotes, dash style, list bullets, case, all spacing and a closing period set
aside; the passage and stem sentences and lines (a blank counts as its own) and the choices are
compared as sorted lists (so a question written before or after its passage, or with its
choices in another order, is the same question); the answer is the
correct choice's text (not its letter) or the numeric key's value; any figure data counts as is.
A near copy is the same question too (see `near`), by the founder's rule of 2026-10-26: up to
three words that differ only in spelling, suffix or a typo ("illustrate"/"illustrates",
"Chloé"/"Chloe", "solpe"/"slope"), with the same numbers, and the same punctuation except a few
marks in the passage, stem or a long choice.
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


def _table(v, presence: bool):
    return (v is not None) if presence else v


def _answer(row: dict, presence: bool = False) -> str:
    key = str(row.get("correct_answer") or "").strip()
    if row.get("answer_format") == "numeric_entry":
        v = parse_numeric(key)
        return str(v) if isinstance(v, Fraction) else norm(key)
    for c in row.get("answer_choices") or []:
        if str(c.get("letter")) == key.upper():
            return norm(c.get("choice_text")) + json.dumps(_table(c.get("choice_table_data"), presence), sort_keys=True)
    return "key:" + key


def _choices(row: dict, presence: bool = False) -> list[str]:
    return sorted(norm(c.get("choice_text")) + json.dumps(_table(c.get("choice_table_data"), presence), sort_keys=True)
                  for c in row.get("answer_choices") or [])


def _frame(row: dict, presence: bool = False) -> dict:
    """The answer format and the figure data. presence: only whether each figure column is set
    (the slim live export keeps image and drawing columns as true), the table data as is."""
    return {"format": row.get("answer_format") or "multiple_choice",
            "figure": {f: (True if presence and f != "figure_table_data" else row.get(f))
                       for f in _FIGURE if row.get(f) not in (None, "", False)}}


def _key(obj) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def shape(row: dict) -> dict:
    """A row in the QA export shape from any of the shapes the tools hold: the QA export, the slim
    live export or a staged payload (choices, question_format), or a private readback snapshot."""
    if isinstance(row.get("question"), dict):
        q = dict(row["question"])
        q["answer_choices"] = row.get("choices") or []
        q["answer_key_entries"] = row.get("keys") or []
        return q
    if "answer_choices" in row:
        return row
    r = dict(row)
    r["answer_choices"] = row.get("choices") or []
    r.setdefault("answer_format", row.get("question_format"))
    if "raw_model_response" in row:
        r.setdefault("answer_key_entries", [{"raw_model_response": row["raw_model_response"]}])
    if not r.get("subject"):
        r["subject"] = "math" if str(row.get("source_section") or "").lower() == "math" else "reading"
    return r


def fingerprints(row: dict, presence: bool = False) -> list[str]:
    """Two fingerprints, the text split into lines and into sentences (a source that breaks a
    line mid-paragraph, or one that does not break where another does): either one shared is a
    copy."""
    rest = {**_frame(row, presence), "choices": _choices(row, presence), "answer": _answer(row, presence)}
    return [_key({**rest, "text": _lines(row, split), "split": n}) for n, split in enumerate((_LINE, _SENTENCE))]


# ---- near copies -----------------------------------------------------------------------------

# A typo or punctuation slip: one side (the text, or the choices and answer) the same once
# formatting is set aside, the other differing in at most two places of at most two characters,
# the same numbers in the same order. ("grove" for "river" is a different question.)
TYPO_PLACES, TYPO_CHARS = 2, 2
# The founder's rule (2026-10-26): up to three words, over text, choices and answer together, that
# differ only in spelling or suffix, with the same numbers and the same punctuation.
SPELLING_WORDS = 3


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


def _plain(text) -> str:
    """Text for the word comparison: tokens, quotes and accents gone, dash style and blanks one
    form, lowercase."""
    t = _TOKENS.sub(" ", str(text or ""))
    t = unicodedata.normalize("NFKD", unicodedata.normalize("NFKC", t))
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    t = _QUOTES.sub("", t)
    t = re.sub(r"-{2,}", "-", _DASHES.sub("-", t))
    t = _BLANK.sub(" _ ", t)
    t = _LATEX_SPACING.sub(" ", t).replace("\\(", " ").replace("\\)", " ").replace("$", " ")
    return t.lower()


_LINE_BULLET = re.compile(r"(?m)^[ \t]*(?:[•*·▪●◦‣]|-(?=[ \t]+\D))[ \t]*")
_NOTES_HEADING = re.compile(r"(?im)^[ \t]*notes[ \t]*:?[ \t]*$")


def words(text) -> tuple[list[str], str]:
    """(the words, the punctuation and symbols in order; list bullets and a "Notes:" heading line
    left out)."""
    t = _plain(_NOTES_HEADING.sub("", _LINE_BULLET.sub("", str(text or ""))))
    return re.findall(r"[^\W_]+", t), re.sub(r"[\w\s]+", "", t)


def _punct_close(x: str, y: str, chars: int) -> bool:
    """The edit distance between two runs of marks is at most `chars`."""
    if x == y:
        return True
    if abs(len(x) - len(y)) > chars:
        return False
    prev = list(range(len(y) + 1))
    for i, cx in enumerate(x, 1):
        cur = [i]
        for j, cy in enumerate(y, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (cx != cy)))
        if min(cur) > chars:
            return False
        prev = cur
    return prev[-1] <= chars


def spelling_variant(x: str, y: str) -> bool:
    """Two words that are one word spelled or inflected differently (show/shows, colour/color,
    solpe/slope), not two different words; numbers never."""
    if x == y:
        return True
    if re.search(r"\d", x + y):
        return False
    if x.replace("l", "i") == y.replace("l", "i"):
        return True
    a, b = sorted((x, y), key=len)
    if len(a) >= 3 and b.startswith(a) and len(b) - len(a) <= 4:
        return True
    p = next((k for k, (c1, c2) in enumerate(zip(x, y)) if c1 != c2), min(len(x), len(y)))
    if p >= 4 and abs(len(x) - len(y)) <= 3 and p >= min(len(x), len(y)) - 3:
        return True
    return min(len(x), len(y)) >= 4 and difflib.SequenceMatcher(None, x, y).ratio() >= 0.75


def word_changes(a: list[str], b: list[str]) -> int | None:
    """Words changed from a to b when every change is a spelling variant, a split/joined word or
    a stray single letter; None when a change is anything else."""
    n = 0
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == "equal":
            continue
        xa, xb = a[i1:i2], b[j1:j2]
        if "".join(xa) == "".join(xb):  # "on site" / "onsite"
            n += 1
        elif op in ("insert", "delete") and len(xa) + len(xb) == 1 and len((xa or xb)[0]) == 1 and not (xa or xb)[0].isdigit():
            n += 1  # a stray letter: "[small]l rice", "| lose" read as "i lose"
        elif op == "replace" and len(xa) == len(xb) and all(spelling_variant(p, q) for p, q in zip(xa, xb)):
            n += len(xa)
        else:
            return None
    return n


class Info:
    """What the comparison needs of one row."""

    def __init__(self, row: dict, presence: bool = False):
        r = shape(row)
        self.id, self.row = str(r["id"]), r
        self.frame = _frame(r, presence)
        self.lines, self.choices, self.answer = _lines(r), _choices(r, presence), _answer(r, presence)
        self.fps = fingerprints(r, presence)
        text = "\n".join(str(r.get(f) or "") for f in _TEXT)
        self.text_words = words(text)
        # the lines in a set order too, so a question written before or after its passage compares
        lines = sorted((ln for ln in text.splitlines() if ln.strip()), key=lambda ln: norm(_LINE_BULLET.sub("", ln)))
        self.text_words_sorted = words("\n".join(lines))
        self.choice_words = [words(c.get("choice_text")) for c in r.get("answer_choices") or []]
        self.answer_words = words(next((c.get("choice_text") for c in r.get("answer_choices") or []
                                        if str(c.get("letter")) == str(r.get("correct_answer") or "").strip().upper()),
                                       r.get("correct_answer")))
        self.digits = _digits(self.text_words[0] + [w for ws, _ in self.choice_words for w in ws])
        ws = self.text_words[0]
        self.shingles = {" ".join(ws[k:k + 4]) for k in range(max(1, len(ws) - 3))}


# Punctuation: the passage and stem may differ by a few marks (a source's typo, "E.M." / "E M,"):
# three, or a fifth of the marks in a long text; a short choice (a punctuation question's) must
# have exactly the same marks, a long one may differ by a few.
TEXT_MARKS, TEXT_MARKS_SHARE, LONG_CHOICE, CHOICE_MARKS = 3, 0.2, 8, 3


def _text_marks(x: str, y: str) -> bool:
    return _punct_close(x, y, max(TEXT_MARKS, int(TEXT_MARKS_SHARE * max(len(x), len(y)) + 0.999)))


def _choice_punct(wa, pa, pb) -> bool:
    return pa == pb or (len(wa) >= LONG_CHOICE and _punct_close(pa, pb, CHOICE_MARKS))


def _spelling_copy(a: Info, b: Info) -> bool:
    """The founder's rule: at most SPELLING_WORDS spelling/suffix words changed over text, choices
    and answer, the same numbers, the same or nearly the same punctuation, choices in any order."""
    if a.digits != b.digits or not _choice_punct(a.answer_words[0], a.answer_words[1], b.answer_words[1]):
        return False
    texts = [(word_changes(a.text_words[0], b.text_words[0]), _text_marks(a.text_words[1], b.text_words[1])),
             (word_changes(a.text_words_sorted[0], b.text_words_sorted[0]),
              _text_marks(a.text_words_sorted[1], b.text_words_sorted[1]))]
    found = [n for n, ok in texts if n is not None and ok]
    budget = min(found) if found else None
    k = word_changes(a.answer_words[0], b.answer_words[0])
    if budget is None or k is None or budget > SPELLING_WORDS or len(a.choice_words) != len(b.choice_words):
        return False
    rest = list(b.choice_words)
    for wa, pa in a.choice_words:
        best = None
        for j, (wb, pb) in enumerate(rest):
            n = word_changes(wa, wb) if _choice_punct(wa, pa, pb) else None
            if n is not None and (best is None or n < best[1]):
                best = (j, n)
        if best is None:
            return False
        budget += best[1]
        rest.pop(best[0])
    return budget <= SPELLING_WORDS


def near(a: Info, b: Info) -> bool:
    """a and b are the same question: a fingerprint shared, or a copy by the founder's rule (a
    typo or spelling/suffix variant in up to three words, a few marks of punctuation in the text
    or a long choice). A character-level rule is not used: "South"/"North" is two characters."""
    if a.frame != b.frame:
        return False
    if set(a.fps) & set(b.fps):
        return True
    return _spelling_copy(a, b)


class Index:
    """The rows to compare against (live rows), with candidate blocks: a fingerprint, the choices
    and answer, the text, or a share of rare four-word runs of the text."""

    RARE, SHARE = 40, 0.5

    def __init__(self, rows: list[dict], presence: bool = False):
        self.presence = presence
        self.infos = {i.id: i for i in (Info(r, presence) for r in rows)}
        self.blocks: dict[str, set[str]] = {}
        self.grams: dict[str, set[str]] = {}
        for i in self.infos.values():
            for k in self._keys(i):
                self.blocks.setdefault(k, set()).add(i.id)
            for g in i.shingles:
                self.grams.setdefault(g, set()).add(i.id)

    @staticmethod
    def _keys(i: Info) -> list[str]:
        return i.fps + [_key(["c", i.frame, i.choices, i.answer]), _key(["t", i.frame, i.lines]),
                        _key(["cs", i.frame, i.choices])]

    def candidates(self, i: Info) -> set[str]:
        out = set().union(*(self.blocks.get(k, set()) for k in self._keys(i)))
        shared: dict[str, int] = {}
        for g in i.shingles:
            hits = self.grams.get(g, ())
            if len(hits) <= self.RARE:
                for j in hits:
                    shared[j] = shared.get(j, 0) + 1
        for j, n in shared.items():
            if n >= self.SHARE * max(1, min(len(i.shingles), len(self.infos[j].shingles))):
                out.add(j)
        out.discard(i.id)
        return out

    def matches(self, row, exclude=()) -> list[str]:
        """Ids of indexed rows that are the same question as `row` (an Info or any row shape)."""
        i = row if isinstance(row, Info) else Info(row, self.presence)
        skip = set(exclude) | {i.id}
        return sorted(j for j in self.candidates(i) if j not in skip and near(i, self.infos[j]))


def is_live(row: dict) -> bool:
    return row.get("is_live") is True and row.get("archived_at") is None and row.get("publish_status") in LIVE_STATUSES


def groups(rows: list[dict]) -> list[list[str]]:
    """Sorted id lists of live rows that are the same question (joined, so a group holds every
    copy)."""
    index = Index([r for r in rows if is_live(r)])
    parent = {k: k for k in index.infos}

    def root(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for i in index.infos.values():
        for j in index.matches(i):
            parent[root(i.id)] = root(j)
    out: dict[str, list[str]] = {}
    for rid in parent:
        out.setdefault(root(rid), []).append(rid)
    return sorted(sorted(v) for v in out.values() if len(v) > 1)


def findings(rows: list[dict]) -> tuple[list[list[str]], dict[str, list[str]]]:
    """(groups, {id: ["same question as <ids>"]}) for every row in a duplicate group."""
    found = groups(rows)
    per = {}
    for g in found:
        for rid in g:
            per[rid] = [f"same question as {', '.join(x for x in g if x != rid)} (live, {len(g)} copies)"]
    return found, per
