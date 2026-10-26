"""Key consistency (check key_conflicts_printed_twin, fail level): a question whose key was
generated (no printed answer key: answer evidence kind independently_confirmed_generated, or
answer_key_status missing_answer_key) must key the same choice text as a twin with a printed key.

A twin is a multiple-choice row with the same figure data and the same passage and stem once
formatting is set aside (the same lines, a typo-level slip, or up to three spelling/suffix
words, kimport.qa_dupes), or, in Reading and Writing, word-for-word the same choices with a
passage and stem at least 0.6 alike (the SAT reuses a punctuation or transition item on another
topic: d65b466f "shade, though most" on Cavendish, its printed twins on Kaihalulu). The check fails when the printed twin's keyed choice text (normalized) is one
of this row's choices but not the one this row keys: one of the two keys is wrong, and the
printed one is the source's (the second audit of 2026-10-26: f7757554 keyed "example, with"
where its printed twins key "example. With"). A twin whose keyed text is not among this row's
choices says nothing. Runs bank-wide in `k qa certify` and against the live bank for new rows
and QA corrections (kimport.bank_gate). Read-only.
"""

import difflib

from kimport import qa_dupes as qd
from kimport.answer_evidence import GENERATED

LEVEL = "fail"


def is_generated(row: dict) -> bool:
    r = qd.shape(row)
    if r.get("answer_key_status") == "missing_answer_key":
        return True
    for e in r.get("answer_key_entries") or []:
        raw = e.get("raw_model_response") if isinstance(e, dict) else None
        if isinstance(raw, dict) and raw.get("kind") == GENERATED:
            return True
    return False


# A Reading and Writing item the SAT reuses with another passage topic keeps its choices word for
# word (a punctuation or transition item): the same choices and a passage and stem at least this
# alike (word sequence ratio) is a twin too. Math is left out: its variants change the numbers.
SAME_CHOICES_TEXT_RATIO = 0.6


def text_twin(a: qd.Info, b: qd.Info) -> bool:
    """Same passage and stem (and figure, and multiple choice), whatever the choices; or, in
    Reading and Writing, the same choices and a passage and stem alike enough."""
    if a.frame != b.frame or a.frame["format"] != "multiple_choice":
        return False
    if (a.choices == b.choices and a.row.get("subject") != "math" and b.row.get("subject") != "math"
            and difflib.SequenceMatcher(None, a.text_words[0], b.text_words[0], autojunk=False).ratio()
            >= SAME_CHOICES_TEXT_RATIO):
        return True
    if a.lines == b.lines or qd._close(a.lines, b.lines):
        return True
    if qd._digits(a.text_words[0]) != qd._digits(b.text_words[0]):
        return False
    for x, y in ((a.text_words, b.text_words), (a.text_words_sorted, b.text_words_sorted)):
        n = qd.word_changes(x[0], y[0])
        if n is not None and n <= qd.SPELLING_WORDS and qd._text_marks(x[1], y[1]):
            return True
    return False


def _letter(i: qd.Info) -> str:
    return str(i.row.get("correct_answer") or "").strip().upper()


def conflicts(row, index: qd.Index, printed: set, exclude=()) -> list[str]:
    """For a generated-key row: one line per printed twin in `index` (ids in `printed`) whose keyed
    choice text is among this row's choices but is not the one this row keys."""
    i = row if isinstance(row, qd.Info) else qd.Info(row, index.presence)
    if not is_generated(i.row) or i.frame["format"] != "multiple_choice":
        return []
    out = []
    for j in sorted(index.candidates(i) - set(exclude)):
        t = index.infos[j]
        if j not in printed or not text_twin(i, t) or t.answer == i.answer or t.answer not in i.choices:
            continue
        mine = next((c.get("choice_text") for c in i.row.get("answer_choices") or []
                     if str(c.get("letter")) == _letter(i)), "")
        theirs = next((c.get("choice_text") for c in t.row.get("answer_choices") or []
                       if str(c.get("letter")) == _letter(t)), "")
        out.append(f"generated key {_letter(i)} {str(mine)[:50]!r}, but printed-key twin {j} keys {str(theirs)[:50]!r}")
    return out


def bank_findings(rows: list[dict]) -> dict[str, list[str]]:
    """{id: conflict lines} over the live rows of an export (k qa certify)."""
    live = [r for r in rows if qd.is_live(r)]
    index = qd.Index(live)
    printed = {str(r["id"]) for r in live if not is_generated(r)}
    out = {}
    for i in index.infos.values():
        found = conflicts(i, index, printed)
        if found:
            out[i.id] = found
    return out
