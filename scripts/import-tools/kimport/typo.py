"""Typo-level match: two occurrences that differ only by a small scanning typo.

Rule order (first failing check gives the reason):
  choice_differs          answer format, answer value or sorted choices differ
  table_or_figure_differs table cells or figure signature differ
  math_token_differs      any digit, sign, operator or single-letter variable differs
  identical / markup_differs   same words; spans equal or not
  markup_differs          an unchanged word is in a tested span on one side only
  in_tested_span          a changed word sits inside <u>...</u> or a blank
  punctuation_differs     a spot differs only by punctuation (never a typo)
  too_many_spots          more than MAX_SPOTS differing spots
  spot_too_long           a spot needs more than MAX_SPOT_CHARS character edits
  punctuation_differs     a spot's punctuation characters differ ("small;" vs "smell,")
  insert_or_delete        a spot adds or drops words (one side empty)
  meaning_word            a spot touches a word that can flip meaning (MEANING_WORDS)
  ocr_typo                same question (same=True)
"""

import difflib
import unicodedata
from typing import NamedTuple

from kimport.keys import (
    QuestionRecord,
    answer_value,
    figure_value,
    markup_spans,
    sorted_choices,
    table_values,
)
from kimport.normalize import math_tokens, normalize_text, strip_markup

MAX_SPOTS = 2
MAX_SPOT_CHARS = 3
_TESTED = ("u", "blank")

# A spot touching any of these is never a scanning typo: one wrong letter
# turns "most" into "least"-like meaning flips or one number into another.
MEANING_WORDS = frozenset(
    """not no never none nor most least more less fewer greater smaller larger
    before after increase decrease increased decreased all some only
    zero one two three four five six seven eight nine ten eleven twelve
    thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty
    hundred thousand million half third quarter twice""".split()
)


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


def _is_punct(c: str) -> bool:
    return unicodedata.category(c).startswith("P")


def _punctuation(s: str) -> str:
    return "".join(c for c in s if _is_punct(c))


def _without_punctuation(s: str) -> str:
    return " ".join("".join(c for c in s if not _is_punct(c)).split())


def _bare_words(s: str) -> set[str]:
    return set("".join(c if not _is_punct(c) else " " for c in s).split())


def _ops(ta: list[str], tb: list[str]):
    return difflib.SequenceMatcher(None, ta, tb, autojunk=False).get_opcodes()


def _spots(ta, tb, ops) -> tuple[tuple[str, str], ...]:
    return tuple((" ".join(ta[i1:i2]), " ".join(tb[j1:j2])) for tag, i1, i2, j1, j2 in ops if tag != "equal")


def _spot_small(x: str, y: str) -> bool:
    """Character edit distance (Levenshtein) <= MAX_SPOT_CHARS; stops early on long spots."""
    if abs(len(x) - len(y)) > MAX_SPOT_CHARS:
        return False
    prev = list(range(len(y) + 1))
    for i, cx in enumerate(x, 1):
        cur = [i]
        for j, cy in enumerate(y, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (cx != cy)))
        if min(cur) > MAX_SPOT_CHARS:
            return False
        prev = cur
    return prev[-1] <= MAX_SPOT_CHARS


def _spots_small(spots) -> bool:
    return all(_spot_small(x, y) for x, y in spots)


def text_words(text: str) -> tuple[str, ...]:
    """The normalized words typo_match compares (markup dropped)."""
    return tuple(w for w, _ in _words(text))


def words_within_spots(ta: tuple[str, ...], tb: tuple[str, ...]) -> bool:
    """Text-only typo limits: equal words, or at most MAX_SPOTS differing spots,
    each at most MAX_SPOT_CHARS character edits. Ignores answers, choices,
    markup and the meaning-word / punctuation rules."""
    if ta == tb:
        return True
    spots = _spots(ta, tb, _ops(list(ta), list(tb)))
    return len(spots) <= MAX_SPOTS and _spots_small(spots)


def typo_match(a: QuestionRecord, b: QuestionRecord) -> TypoResult:
    if (
        a.answer_format != b.answer_format
        or answer_value(a) != answer_value(b)
        or sorted_choices(a) != sorted_choices(b)
    ):
        return TypoResult(False, (), "choice_differs")
    if table_values(a) != table_values(b) or figure_value(a) != figure_value(b):
        return TypoResult(False, (), "table_or_figure_differs")
    if math_tokens(strip_markup(a.text)[0]) != math_tokens(strip_markup(b.text)[0]):
        return TypoResult(False, (), "math_token_differs")

    wa, wb = _words(a.text), _words(b.text)
    ta, tb = [w for w, _ in wa], [w for w, _ in wb]
    if ta == tb:
        if markup_spans(a.text) == markup_spans(b.text):
            return TypoResult(True, (), "identical")
        return TypoResult(False, (), "markup_differs")

    ops = _ops(ta, tb)
    changed = [(i1, i2, j1, j2) for tag, i1, i2, j1, j2 in ops if tag != "equal"]
    spots = _spots(ta, tb, ops)

    for tag, i1, i2, j1, j2 in ops:  # a moved underline or blank is a different question
        if tag == "equal" and [f for _, f in wa[i1:i2]] != [f for _, f in wb[j1:j2]]:
            return TypoResult(False, spots, "markup_differs")
    if any(f for i1, i2, j1, j2 in changed for _, f in wa[i1:i2] + wb[j1:j2]):
        return TypoResult(False, spots, "in_tested_span")
    if any(_without_punctuation(x) == _without_punctuation(y) for x, y in spots):
        return TypoResult(False, spots, "punctuation_differs")
    if len(spots) > MAX_SPOTS:
        return TypoResult(False, spots, "too_many_spots")
    if not _spots_small(spots):
        return TypoResult(False, spots, "spot_too_long")
    if any(_punctuation(x) != _punctuation(y) for x, y in spots):
        return TypoResult(False, spots, "punctuation_differs")
    if any(not x or not y for x, y in spots):
        return TypoResult(False, spots, "insert_or_delete")
    if any((_bare_words(x) | _bare_words(y)) & MEANING_WORDS for x, y in spots):
        return TypoResult(False, spots, "meaning_word")
    return TypoResult(True, spots, "ocr_typo")
