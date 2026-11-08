"""Shared evidence helpers for sweep, lint and corpus (one copy of each rule).

- Near-copy test (rulings R9-R11): two texts whose words are within the typo
  spot limits, with a cheap pre-filter that is a NECESSARY condition only.
- OutsideEvidence: word counts over every record minus the rows near a group,
  so repeated copies of one typo never count as evidence for it (R8, R9).
- needs_visual: the lint needs-a-visual phrases (ruling R16).
"""

import re
from collections import Counter

from kimport.keys import QuestionRecord, clean_text
from kimport.normalize import strip_markup
from kimport.typo import MAX_SPOT_CHARS, MAX_SPOTS, text_words, words_within_spots

WORD = re.compile(r"[^\W_]+")


def bare_words(r: QuestionRecord) -> frozenset[str]:
    return frozenset(WORD.findall(clean_text(r.text)))


# Pre-filter bounds (rulings R10, R11). words_within_spots allows MAX_SPOTS spots
# of at most MAX_SPOT_CHARS character edits each. Word counts: an edit to a
# space adds or drops one word, so counts differ by at most MAX_SPOTS *
# MAX_SPOT_CHARS (6). Shared words: one spot of up to 3 edits can join or split
# words and so touch up to 2 * 3 = 6 words on one side ("is shown in a field of"
# -> "isshown ina fieldof"), so two spots touch up to 2 * MAX_SPOTS *
# MAX_SPOT_CHARS = 12 and at least len(shorter) - 12 words are shared. The
# pre-filter is a necessary condition only: it never rejects a pair the exact
# check accepts (test_prefilter_never_rejects_a_spot_match checks this).
NEAR_COUNT_SLACK = MAX_SPOTS * MAX_SPOT_CHARS
NEAR_SHARED_SLACK = 2 * MAX_SPOTS * MAX_SPOT_CHARS


def near_prefilter(ta: tuple[str, ...], tb: tuple[str, ...]) -> bool:
    if abs(len(ta) - len(tb)) > NEAR_COUNT_SLACK:
        return False
    shared = sum((Counter(ta) & Counter(tb)).values())
    return shared >= min(len(ta), len(tb)) - NEAR_SHARED_SLACK


def near(ta: tuple[str, ...], tb: tuple[str, ...]) -> bool:
    """Cheap necessary pre-filter, then the exact spot check."""
    return near_prefilter(ta, tb) and words_within_spots(ta, tb)


class OutsideEvidence:
    """Word counts over `records`; outside(texts) drops every record whose words
    equal or are within the typo spot limits of any of `texts` (text only: any
    status, answer or choices)."""

    def __init__(self, records):
        self.rows = [(text_words(r.text), bare_words(r)) for r in records]
        self.by_len: dict[int, list[int]] = {}
        for n, (ws, _) in enumerate(self.rows):
            self.by_len.setdefault(len(ws), []).append(n)
        self.total = Counter(w for _, bare in self.rows for w in bare)

    def outside(self, texts):
        own: Counter = Counter()
        cw = [text_words(t) for t in texts]
        cands = {n for w in cw for d in range(-NEAR_COUNT_SLACK, NEAR_COUNT_SLACK + 1)
                 for n in self.by_len.get(len(w) + d, ())}
        for n in cands:
            ws, bare = self.rows[n]
            if any(near(w, ws) for w in cw):
                own.update(bare)
        return lambda word: self.total[word] - own[word]


_V = r"(?:graph|figure|diagram|table|scatterplot|chart|plot)s?"
NEEDS_VISUAL = tuple(re.compile(p, re.IGNORECASE) for p in (
    r"\b(?:in|from|according to|based on|using)\s+the\s+" + _V + r"\b(?!\s+of\b)",
    r"\bthe\s+" + _V + r"\s+(?:above|below|shown|shows|show|gives|give|represents|displays|models|"
    r"summarizes|lists|contains|records|describes)\b",
    r"\b(?:is|are)\s+shown\b(?!\s+(?:it|that|to|how)\b)",
    r"\bshown\s+(?:above|below|here)\b",
    r"\b(?:scatterplot|bar graph|line graph|histogram|dot plot|box plot|circle graph|pie chart|frequency table)s?\b",
    r"\b(?:which|following|each)\s+" + _V + r"\b",
))


def needs_visual(text: str) -> str | None:
    """The first needs-a-visual phrase in the text (markup stripped), if any."""
    plain, _ = strip_markup(text)
    for rx in NEEDS_VISUAL:
        m = rx.search(plain)
        if m:
            return m.group(0)
    return None
