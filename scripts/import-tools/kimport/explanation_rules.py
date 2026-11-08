"""The rules a step-by-step explanation must pass before it may replace a live question's
explanation_text (`k qa explain`, `k qa explain-check`). Pure functions, no database: a writer can
import this module and check every explanation as it writes it.

What the student screen does with an explanation (read 2026-11-08 on the live branch): the review
panels (QuizReviewQuestion, CatalogPractice, ActiveQuizScreen) draw explanation_text and each
explanation_per_choice text with MathText, without serialized math lines. MathText reads `$...$`,
`$$...$$` and `\\(...\\)` as KaTeX; it does NOT read `\\[...\\]`, which would show as raw text. So
math goes only inside `\\( \\)`. The KaTeX parse of every span and the screen's own split
(splitMathText) are checked in ts/explain-check.ts with the app's code; this module holds the
text rules and finds the answer the explanation states.

Rules (each refusal says why):
- non-empty, MIN_CHARS to MAX_CHARS characters (explanation_per_choice texts: PER_CHOICE_MIN to
  MAX_CHARS);
- math only inside balanced, non-nested, non-empty `\\( \\)`; no `\\[ \\]` (not drawn), no `$`
  outside math (the screen reads `$...$` as math; write money as `\\(\\$25\\)`), no LaTeX command,
  `^` or `{}` outside math;
- no en dash (U+2013; the SAT prints none), no replacement character, no control characters;
- a negative number outside math uses the minus sign U+2212 (`−5`), never a hyphen (`-5`); inside
  `\\( \\)` a hyphen is LaTeX's minus and is fine;
- plain text: no HTML tags, no Markdown (headings, bold, backticks, links), no underline/italic
  display markers ([[u]], [[i]]);
- the explanation states its final answer and it agrees with the row's stored key: multiple
  choice names the key's letter ("Choice B is correct.", "The answer is B.") and never another
  letter as the answer; numeric entry states a value ("The answer is \\(\\frac{3}{4}\\).") that the
  app's grader accepts for the row (graded in ts/explain-check.ts with evaluateQuizAnswer and the
  row's reviewed numeric answers).
"""

import hashlib
import re

MIN_CHARS = 200
MAX_CHARS = 2500
PER_CHOICE_MIN = 20
LETTERS = ("A", "B", "C", "D")

_SPAN = re.compile(r"\\\((.*?)\\\)", re.S)
_CONTROL = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")
_HTML = re.compile(r"</?[A-Za-z][^>\n]*>")
_MARKDOWN = (
    (re.compile(r"(?m)^[ \t]*#{1,6}[ \t]"), "a Markdown heading"),
    (re.compile(r"\*\*[^*\n]+\*\*"), "Markdown bold (**...**)"),
    (re.compile(r"`"), "a backtick"),
    (re.compile(r"\[[^\]\n]+\]\([^)\n]+\)"), "a Markdown link"),
    (re.compile(r"\[\[/?[ui]\]\]"), "an underline/italic display marker"),
)
_COMMAND = re.compile(r"\\[A-Za-z]+|\\[{}$%&#_,;!]")
_HYPHEN_NEGATIVE = re.compile(r"(?<![\w)\]}.,/])-(?=\.?\d)")

# The answer statements: words case-insensitive, the letter itself a capital A-D.
_MC_STATEMENTS = (
    re.compile(r"(?i:\bchoice)\s*\(?([A-D])\)?\s+(?i:is\s+(?:the\s+)?(?:correct|best|right)\b)"),
    re.compile(r"(?i:\b(?:correct|best|right)\s+(?:answer|choice|option)\s+is\s+(?:choice\s+)?)\(?([A-D])\)?(?![A-Za-z])"),
    re.compile(r"(?i:\banswer\s+is\s+(?:choice\s+)?)\(?([A-D])\)?(?![A-Za-z])"),
    re.compile(r"(?i:\banswer\s*:\s*(?:choice\s+)?)\(?([A-D])\)?(?![A-Za-z])"),
)
_NUM_LEAD = r"(?i:\b(?:the\s+)?(?:correct\s+)?answer\s+is\s+|\banswer\s*:\s*)"
_NUM_STATEMENT = re.compile(_NUM_LEAD + r"(?:\\\((.+?)\\\)|([−\-]?(?:\d[\d,]*)?\.?\d+(?:/\d+)?))", re.S)
_FRAC = re.compile(r"\\[dt]?frac\s*\{\s*([^{}]+?)\s*\}\s*\{\s*([^{}]+?)\s*\}")
NUMERIC = re.compile(r"-?(?:\d+\.?\d*|\.\d+)(?:/\d+)?")


def sha256_text(text) -> str | None:
    """sha256 hex of a text's UTF-8 bytes (None for None): what explanation_sha256_before holds."""
    return None if text is None else hashlib.sha256(text.encode("utf-8")).hexdigest()


def math_spans(text: str) -> tuple[list[str], list[str]]:
    """(the LaTeX of every \\( \\) span in order, problems with the delimiters)."""
    problems, spans = [], []
    for m in _SPAN.finditer(text):
        body = m.group(1)
        if "\\(" in body:
            problems.append("a \\( opens inside another \\( \\) span")
        elif not body.strip():
            problems.append("an empty \\( \\) span")
        spans.append(body)
    rest = _SPAN.sub(" ", text)
    if "\\(" in rest or "\\)" in rest:
        problems.append("unbalanced \\( \\) delimiters")
    return spans, problems


def prose(text: str) -> str:
    """The text with every \\( \\) span blanked out."""
    return _SPAN.sub(" ", text)


def text_problems(text, min_chars: int = MIN_CHARS, max_chars: int = MAX_CHARS) -> list[str]:
    """Why this text may not be shown as an explanation ([] = it may)."""
    if not isinstance(text, str) or not text.strip():
        return ["empty"]
    out = []
    n = len(text.strip())
    if n < min_chars:
        out.append(f"too short ({n} characters, at least {min_chars})")
    if n > max_chars:
        out.append(f"too long ({n} characters, at most {max_chars})")
    if "\u2013" in text:
        out.append("an en dash (U+2013); use a hyphen, an em dash or the minus sign")
    if "\ufffd" in text:
        out.append("a replacement character (U+FFFD)")
    if _CONTROL.search(text):
        out.append("a control character")
    if "\\[" in text or "\\]" in text:
        out.append("display math \\[ \\] (the screen does not draw it); use \\( \\)")
    spans, delim = math_spans(text)
    out += delim
    outside = prose(text)
    if "$" in outside:
        out.append("a $ outside math (the screen reads $...$ as math); write money as \\(\\$25\\)")
    if not delim:
        if _COMMAND.search(outside.replace("\\(", "").replace("\\)", "")):
            out.append("a LaTeX command outside \\( \\)")
        if "^" in outside:
            out.append("a ^ outside \\( \\) (put powers in math)")
        if "{" in outside or "}" in outside:
            out.append("a brace outside \\( \\)")
        if _HYPHEN_NEGATIVE.search(outside):
            out.append("a negative number written with a hyphen outside math; use the minus sign − (U+2212)")
    if _HTML.search(text):
        out.append("an HTML tag (plain text only)")
    for pattern, what in _MARKDOWN:
        if pattern.search(text):
            out.append(f"{what} (plain text only)")
    return out


def stated_letters(text: str) -> list[str]:
    """Every letter the text names as the answer, in order."""
    found = []
    for pattern in _MC_STATEMENTS:
        found += [(m.start(), m.group(1)) for m in pattern.finditer(text)]
    return [x for _, x in sorted(set(found))]


def numeric_form(value: str) -> str | None:
    """A stated value as the plain string the app's grader reads ("3/4", "-2.5"), or None."""
    v = value.strip().rstrip(".").strip()
    v = v.replace("\u2212", "-").replace("{,}", "").replace("\\!", "").replace("\\,", "")
    v = re.sub(r"\\(?:left|right)\b", "", v)
    v = _FRAC.sub(lambda m: f"{m.group(1)}/{m.group(2)}", v)
    v = re.sub(r"\s+", "", v)
    v = re.sub(r"(?<=\d),(?=\d{3}\b)", "", v)
    if v.startswith("(") and v.endswith(")"):
        v = v[1:-1]
    v = re.sub(r"^-\((.+)\)$", r"-\1", v)
    return v if NUMERIC.fullmatch(v) else None


def stated_values(text: str) -> tuple[list[str], list[str]]:
    """(every value the text states as the answer, as numeric strings; the statements that are not
    a number)."""
    values, bad = [], []
    for m in _NUM_STATEMENT.finditer(text):
        raw = m.group(1) if m.group(1) is not None else m.group(2)
        latex = raw
        if m.group(1) is not None and "=" in latex:  # "\(x = 5\)": the value after the last "="
            latex = latex.rsplit("=", 1)[1]
        v = numeric_form(latex)
        (values if v is not None else bad).append(v if v is not None else raw.strip()[:40])
    return values, bad


def answer_problems(text: str, row: dict) -> tuple[list[str], dict | None]:
    """(problems, the stated answer {"kind": "letter" | "value", "values": [...]}) for this row.
    Numeric values are graded later with the app's grader (ts/explain-check.ts)."""
    if row.get("answer_format") == "numeric_entry":
        values, bad = stated_values(text)
        if bad:
            return [f"the stated answer {bad[0]!r} is not a number"], None
        if not values:
            return ["states no final answer (end with e.g. \"The answer is \\(12\\).\")"], None
        return [], {"kind": "value", "values": values}
    key = str(row.get("correct_answer") or "").strip().upper()
    letters = stated_letters(text)
    if not letters:
        return ["states no final answer (say e.g. \"Choice B is correct.\")"], None
    wrong = sorted(set(letters) - {key})
    if wrong:
        return [f"states the answer is {', '.join(wrong)} but the key is {key}"], None
    return [], {"kind": "letter", "values": letters}


def per_choice_problems(value, letters: set[str]) -> list[str]:
    """explanation_per_choice: {letter: text} for letters the row has, each text passing the rules."""
    if not isinstance(value, dict) or not value:
        return ["explanation_per_choice must map choice letters to texts"]
    out = []
    for k in sorted(value, key=str):
        if k not in LETTERS or k not in letters:
            out.append(f"explanation_per_choice: the row has no choice {k}")
            continue
        out += [f"explanation_per_choice {k}: {p}" for p in text_problems(value[k], PER_CHOICE_MIN, MAX_CHARS)]
    return out
