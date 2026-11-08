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


def markup_spans(s: str) -> tuple[tuple[str, int, str], ...]:
    """(kind, start word index, normalized covered text) per u / i / blank span.

    The word index counts normalized plain words before the span, so the same
    word underlined at a different position is a different span.
    """
    plain, spans = strip_markup(s)
    return tuple(
        (kind, len(normalize_text(plain[:start]).split()), normalize_text(plain[start:end]))
        for start, end, kind in spans
    )


def sorted_choices(r: QuestionRecord) -> tuple[str, ...]:
    """Normalized choices, order and letters ignored, repeats kept."""
    return tuple(sorted(clean_text(c) for c in r.choices))


def figure_value(r: QuestionRecord) -> str | None:
    """The figure signature, with empty or whitespace-only treated as no figure."""
    sig = r.figure_signature
    return sig if sig and sig.strip() else None


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


# Figure columns the key cannot represent (ruling R23). sql/live_export.sql
# exports each one as `true` when set, so the same test reads an export row,
# a private-readback snapshot (full column values) or a reviewed batch row.
UNKEYED_FIGURE_FIELDS = ("image_url", "image_storage_path", "figure_svg", "figure_graph_data",
                         "figure_chart_data", "figure_geometry_data")
# Passage columns, stored apart from question_text on some rows. They are put in
# front of the question text (record_text), so a row without them keeps its key.
PASSAGE_FIELDS = ("passage_intro", "passage", "passage_a", "passage_b")
_EMPTY = (None, "", [], {})


def is_unkeyable(row_or_record) -> bool:
    """True when the key cannot represent what the student sees: a figure_kind
    other than a table, any image / svg / graph / chart / geometry column set,
    or a choice that is a table (answer_choices.choice_table_data, or a reviewed
    row's choice_tables). Such questions never get a database key, are never
    un-published automatically and are checked by people. The one rule for
    sweep, backfill, corpus, publish and lint.

    A QuestionRecord answers from meta["unkeyable"], set from its row when it
    was built (kimport.sweep.record_from_row)."""
    if isinstance(row_or_record, QuestionRecord):
        return bool(row_or_record.meta.get("unkeyable"))
    row = row_or_record
    kind = row.get("figure_kind")
    if kind is not None and kind != "table":
        return True
    if any(row.get(f) not in _EMPTY for f in UNKEYED_FIGURE_FIELDS):
        return True
    if row.get("choice_tables") not in _EMPTY:
        return True
    return any(isinstance(c, dict) and c.get("choice_table_data") not in _EMPTY for c in row.get("choices") or ())


def keyable_sql(alias: str = "q") -> str:
    """SQL twin of `not is_unkeyable(row)` for a quiz_questions alias (used as a
    backfill guard and in the runbook's null-key check)."""
    cols = " AND ".join(f"{alias}.{f} IS NULL" for f in UNKEYED_FIGURE_FIELDS)
    return (f"({alias}.figure_kind IS NULL OR {alias}.figure_kind = 'table') AND {cols}"
            f" AND NOT EXISTS (SELECT 1 FROM public.answer_choices c WHERE c.question_id = {alias}.id"
            " AND c.choice_table_data IS NOT NULL)")


def record_text(row: dict) -> str:
    """Question text as the key sees it: any passage columns (in PASSAGE_FIELDS
    order, blank ones skipped) and then question_text, joined by blank lines."""
    parts = [str(row[f]) for f in PASSAGE_FIELDS if isinstance(row.get(f), str) and row[f].strip()]
    return "\n\n".join(parts + [row.get("question_text") or ""])


def comparison_key(r: QuestionRecord) -> str:
    payload = [
        clean_text(r.text),
        list(sorted_choices(r)),
        [list(span) for span in markup_spans(r.text)],
        r.answer_format,
        answer_value(r),
        [list(row) for row in table_values(r)],
        figure_value(r),
    ]
    blob = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    return f"{NORMALIZER_VERSION}:" + hashlib.sha256(blob.encode("utf-8")).hexdigest()
