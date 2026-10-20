"""Question record shape and the exact-match comparison key.

The key decides "same question" for exact duplicates. It hashes only what a
student sees and is graded on: question text (passage embedded), sorted
choices (repeats kept), underline/italic/blank spans, answer format, answer
value, table cells and the reviewed figure signature. Subject, domain, ref and
live status are never inputs.
"""

import hashlib
import json
import re
from dataclasses import dataclass, field
from fractions import Fraction

from kimport.normalize import NORMALIZER_VERSION, normalize_text, strip_markup


@dataclass(frozen=True)
class QuestionRecord:
    ref: str  # live: quiz_questions.id; corpus: occurrence id e.g. "2025-10_US_V1_MATH_M1_Q06"
    text: str  # stem (passage embedded, as stored)
    choices: tuple[str, ...]  # () for numeric entry
    answer: str  # correct choice TEXT for MC, value for numeric
    answer_format: str  # "mc" | "numeric"
    table_cells: tuple[tuple[str, ...], ...] = ()
    figure_signature: str | None = None  # reviewed figure signature, never an image hash
    is_live: bool = False
    meta: dict = field(default_factory=dict, compare=False)


def clean_text(s: str) -> str:
    """Markup removed, then normalized. Comparison only."""
    return normalize_text(strip_markup(s)[0])


def markup_spans(s: str) -> tuple[tuple[str, str], ...]:
    """(kind, normalized covered text) for each u / i / blank span, in text order."""
    plain, spans = strip_markup(s)
    return tuple((kind, normalize_text(plain[start:end])) for start, end, kind in spans)


def sorted_choices(r: QuestionRecord) -> tuple[str, ...]:
    """Normalized choices, order and letters ignored, repeats kept."""
    return tuple(sorted(clean_text(c) for c in r.choices))


def table_values(r: QuestionRecord) -> tuple[tuple[str, ...], ...]:
    return tuple(tuple(clean_text(c) for c in row) for row in r.table_cells)


_NUM = r"[-+]?(?:\d+\.?\d*|\.\d+)"
_NUMBER = re.compile(rf"([-+]?)\(?({_NUM})\)?(?:/\(?({_NUM})\)?)?")
_THOUSANDS = re.compile(r"(?<=\d),(?=\d{3}(?!\d))")


def _as_fraction(s: str) -> Fraction | None:
    m = _NUMBER.fullmatch(_THOUSANDS.sub("", s))
    if not m:
        return None
    try:
        num, den = Fraction(m.group(1) + m.group(2)), Fraction(m.group(3) or "1")
    except ValueError:  # e.g. a doubled sign such as "-(-3)"
        return None
    return None if den == 0 else num / den


def answer_value(r: QuestionRecord) -> str:
    """Normalized answer text; numeric answers as a canonical Fraction when parseable."""
    value = clean_text(r.answer)
    if r.answer_format == "numeric":
        frac = _as_fraction(value)
        if frac is not None:
            return str(frac)
    return value


def comparison_key(r: QuestionRecord) -> str:
    payload = [
        clean_text(r.text),
        list(sorted_choices(r)),
        [list(span) for span in markup_spans(r.text)],
        r.answer_format,
        answer_value(r),
        [list(row) for row in table_values(r)],
        r.figure_signature,
    ]
    blob = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    return f"{NORMALIZER_VERSION}:" + hashlib.sha256(blob.encode("utf-8")).hexdigest()
