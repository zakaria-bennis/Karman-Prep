"""Typo-level match: two occurrences that differ only by a small scanning typo.

Rule order (first failing check gives the reason):
  choice_differs          answer format, answer value or sorted choices differ
  table_or_figure_differs table cells or figure signature differ
  math_token_differs      any digit, sign, operator or single-letter variable differs
  identical / markup_differs   same words; spans equal or not
  in_tested_span          a changed word sits inside <u>...</u> or a blank
  punctuation_differs     a spot differs only by punctuation (never a typo)
  too_many_spots          more than MAX_SPOTS differing spots
  spot_too_long           a spot needs more than MAX_SPOT_CHARS character edits
  ocr_typo                same question (same=True)
"""

import difflib
import unicodedata
from typing import NamedTuple

from kimport.keys import (
    QuestionRecord,
    answer_value,
    markup_spans,
    sorted_choices,
    table_values,
)
from kimport.normalize import math_tokens, normalize_text, strip_markup

MAX_SPOTS = 2
MAX_SPOT_CHARS = 3
_TESTED = ("u", "blank")


class TypoResult(NamedTuple):
    same: bool
    spots: tuple[tuple[str, str], ...]
    reason: str


def _words(text: str) -> list[tuple[str, bool]]:
    """Normalized words, each flagged True when inside a tested (u / blank) span."""
    plain, spans = strip_markup(text)
    tested = [(s, e) for s, e, kind in spans if kind in _TESTED]
    cuts = sorted({0, len(plain)} | {p for span in tested for p in span})
    words = []
    for lo, hi in zip(cuts, cuts[1:]):
        inside = any(s <= lo and hi <= e for s, e in tested)
        words.extend((w, inside) for w in normalize_text(plain[lo:hi]).split())
    return words


def _levenshtein(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def _without_punctuation(s: str) -> str:
    kept = "".join(c for c in s if not unicodedata.category(c).startswith("P"))
    return " ".join(kept.split())


def typo_match(a: QuestionRecord, b: QuestionRecord) -> TypoResult:
    if (
        a.answer_format != b.answer_format
        or answer_value(a) != answer_value(b)
        or sorted_choices(a) != sorted_choices(b)
    ):
        return TypoResult(False, (), "choice_differs")
    if table_values(a) != table_values(b) or a.figure_signature != b.figure_signature:
        return TypoResult(False, (), "table_or_figure_differs")
    if math_tokens(strip_markup(a.text)[0]) != math_tokens(strip_markup(b.text)[0]):
        return TypoResult(False, (), "math_token_differs")

    wa, wb = _words(a.text), _words(b.text)
    ta, tb = [w for w, _ in wa], [w for w, _ in wb]
    if ta == tb:
        if markup_spans(a.text) == markup_spans(b.text):
            return TypoResult(True, (), "identical")
        return TypoResult(False, (), "markup_differs")

    ops = difflib.SequenceMatcher(None, ta, tb, autojunk=False).get_opcodes()
    changed = [(i1, i2, j1, j2) for tag, i1, i2, j1, j2 in ops if tag != "equal"]
    spots = tuple((" ".join(ta[i1:i2]), " ".join(tb[j1:j2])) for i1, i2, j1, j2 in changed)

    if any(f for i1, i2, j1, j2 in changed for _, f in wa[i1:i2] + wb[j1:j2]):
        return TypoResult(False, spots, "in_tested_span")
    if any(_without_punctuation(x) == _without_punctuation(y) for x, y in spots):
        return TypoResult(False, spots, "punctuation_differs")
    if len(spots) > MAX_SPOTS:
        return TypoResult(False, spots, "too_many_spots")
    if any(_levenshtein(x, y) > MAX_SPOT_CHARS for x, y in spots):
        return TypoResult(False, spots, "spot_too_long")
    return TypoResult(True, spots, "ocr_typo")
