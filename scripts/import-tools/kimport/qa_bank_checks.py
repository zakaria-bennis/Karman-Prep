"""Checks added after the independent audit of 2026-10-26 (pipeline/audit-20261026/REPORT.md),
for defect classes the static checks did not see. Each runs inside kimport.qa_static.audit_rows,
so `k qa certify`, `k lint` (PF_QA) and the stage prechecks all apply them; live_duplicate needs
the whole live bank and runs only where the bank is read (qa_static.run_static, so certify).

- plain_text_math (fail): a math question shows hand-typed notation outside math delimiters:
  a caret exponent ("(1.85)^x", "x^2"), a root written "√(...)", a fraction written "(a)/(b)"
  or with a slash ("g = 14 − x/23", "(5/16)x", "−11/8"), a hyphen for a minus sign ("y = -2x",
  "(-9, 0)", "3-x"), a star for times ("68*68"), or a number left as text right before the
  typeset math that continues it ("172,000" before "(0.035)^x"; the second audit of
  2026-10-26). Prose slashes (and/or, km/h, g/mol, "5 m/s", dates such as 10/26/2026),
  "a 3-hour trip" and typeset math do not count.
- money_as_math (fail): two dollar amounts with prose between them that main's MathText pairs
  as $...$ math ("round (like $25.00), just-below (like $24.99)"), so the prose is set as
  run-together italic letters. The pairing is main's currency rule
  (src/components/learn/currency-dollar-delimiters.ts and math-segments.ts), ported below.
- copyright_line (fail): a credit line ("©2019 by Name", "Copyright 2004", "(c) 2010") in a
  passage, stem or choice.
- numeric_rejects_sat_decimal (review): a typed-answer key that is a fraction, a repeating
  decimal or a decimal too long for the answer box, where the accepted answers (the reviewed numeric answer set, else the key, within
  numeric_tolerance, as main's evaluateQuizAnswer grades) refuse a decimal the SAT accepts:
  the value cut off or rounded to fill the answer box (5 characters, 6 with a minus sign).
- live_duplicate (fail): live rows that are the same question (kimport.qa_dupes), in certify;
  and a new row or QA correction that is the same question as a live row (kimport.bank_gate).
- key_conflicts_printed_twin (fail): a generated key that keys another choice text than a
  printed-key twin (kimport.qa_keys), in certify and against the live bank (kimport.bank_gate).
"""

import re
from decimal import ROUND_DOWN, ROUND_HALF_UP, Decimal
from fractions import Fraction

LEVELS = {"plain_text_math": "fail", "money_as_math": "fail", "copyright_line": "fail",
          "live_duplicate": "fail", "key_conflicts_printed_twin": "fail", "numeric_rejects_sat_decimal": "review"}

# ---- plain-text math -------------------------------------------------------------------------

_NUM_OPERAND = r"\(?[−-]?\d+(?:\.\d+)?[a-zπ]*\)?"
_PLAIN_MATH = (
    ("caret exponent", re.compile(r"[\w)\]}.²³]\s*\^\s*[-−+(\w.{]")),
    ("root written √(...)", re.compile(r"√\s*\(")),
    ("fraction written (a)/(b)", re.compile(r"\)\s*/\s*\(")),
    # x/23, 3/4, (5/16)x, −11/8, cx/(4y): a slash fraction outside typeset math. Not a date
    # (10/26/2026, blanked first), a unit (km/h, g/mol, "5 m/s", kg·m/s) or and/or (alphabetic on
    # both sides: only two single letters, x/y, count).
    ("fraction written with a slash", re.compile(
        rf"(?<![\w/.·])(?<!\d )(?:{_NUM_OPERAND}|\(?[a-zπ]{{1,2}}\)?|\))\s?/\s?(?:{_NUM_OPERAND}|\(?[a-zπ]\)?|\()(?![\w/])")),
    # = -3, (-2, ≥ -6, 3-x, 10 - 2x: an ASCII hyphen for a minus sign ("a 3-hour trip" is prose)
    ("hyphen used as a minus sign",
     re.compile(r"[=(<>≤≥]\s?-\s?\d|(?<!\w)\d+(?:\.\d+)?\s?-\s?\d{0,3}[a-z](?![a-z])")),
    ("star used as a multiplication sign", re.compile(r"[\w)]\s?\*\s?[\w(]")),
)
_DATE = re.compile(r"\b\d{1,2}/\d{1,2}/\d{2,4}\b")
_ALPHA_SLASH = re.compile(r"\(?([a-zπ]+)\)?\s?/\s?\(?([a-zπ]+)\)?")
# 172,000$(0.035)^x$: a number left as text right before typeset math that continues it
_SPAN = re.compile(r"\$\$[\s\S]+?\$\$|(?<!\\)\$(?:\\\$|[^$\n])+?\$")


def _excerpt(s: str, i: int, j: int, pad: int = 25) -> str:
    return re.sub(r"\s+", " ", s[max(0, i - pad):j + pad])[:100]


def _plain_hit(pat, text: str):
    for m in pat.finditer(text):
        a = _ALPHA_SLASH.fullmatch(m.group(0))
        if a and (len(a.group(1)) > 1 or len(a.group(2)) > 1):
            continue  # km/h, and/or
        return m
    return None


def plain_text_math(name: str, text: str, f: dict, add, shown: str = "") -> None:
    """`text`: the field's prose runs only (qa-check.ts "prose": what MathText does not draw as
    math); `shown`: the field as displayed (math as $...$), for a number glued to typeset math."""
    text = _DATE.sub(lambda m: " " * len(m.group(0)), text)
    for what, pat in _PLAIN_MATH:
        m = _plain_hit(pat, text)
        if m:
            add(f, "plain_text_math", f"{name}: {what}: {_excerpt(text, m.start(), m.end())}")
    for m in _SPAN.finditer(shown or ""):
        if m.start() and shown[m.start() - 1].isdigit() and m.group(0).lstrip("$").startswith("("):
            add(f, "plain_text_math", f"{name}: number glued to typeset math: {_excerpt(shown, m.start(), m.end())}")
            break


# ---- money drawn as math (main's currency rule, ported) --------------------------------------

# currency-dollar-delimiters.ts on main, flag for flag (JS \b and [a-z]/i are ASCII-only).
_PAIRS = re.compile(r"(?=(?<!\\)\$ ?\d[\d,]*(?:\.\d+)?[a-z]?[,.;:]?\s([^$\n]*?)\$(?= ?\d))")
_MATH = re.compile(r"[\\^_={}<>+*/≤≥×÷−]|(?:^|\s)-(?:\s|\d|$)")
_PROSE_WORD = re.compile(r"\b(?!(?:sin|cos|tan|log|ln|exp)\b)[a-z]{2,}", re.I | re.A)
_RANGE_WORD = re.compile(r"^(?:to|and|or|through|than)\s*$", re.I)


def currency_dollar_delimiters(text: str) -> set[int]:
    """Offsets of the $ signs main reads as currency, not as math delimiters."""
    offsets: set[int] = set()
    for m in _PAIRS.finditer(text):
        between = m.group(1)
        if not _MATH.search(between) and (len(_PROSE_WORD.findall(between)) > 1 or _RANGE_WORD.match(between)):
            offsets.add(m.start())
            offsets.add(text.index("$", m.start() + 1))
    return offsets


_BLOCK = re.compile(r"\$\$((?:\\\$|[^$])+?)\$\$")
_INLINE = re.compile(r"\$((?:\\\$|[^$\n])+?)\$|\\\(([\s\S]+?)\\\)")
# Underline and italic tokens split the text first (MathText runs splitMathText per run).
_RUN_TOKENS = re.compile(r"\[\[/?[ui]\]\]|</?[ui]>")


def split_math(text: str):
    """main's splitMathText without the serialized function lines: ("text", value) runs and
    ("math", content, text after the closing $) spans ("math", content, None for \\( \\) and $$)."""
    for run in _RUN_TOKENS.split(text or ""):
        for k, piece in enumerate(_BLOCK.split(run)):
            if k % 2:  # a $$...$$ block
                yield "math", piece, None
                continue
            currency = currency_dollar_delimiters(piece)
            offset, rest = 0, piece
            while True:
                m = _INLINE.search(rest)
                if not m:
                    break
                if m.group(1) is not None and (offset + m.start() in currency or offset + m.end() - 1 in currency):
                    yield "text", rest[:m.start() + 1]  # the currency $ stays text; rescan after it
                    offset, rest = offset + m.start() + 1, rest[m.start() + 1:]
                    continue
                yield "text", rest[:m.start()]
                yield "math", (m.group(1) if m.group(1) is not None else m.group(2)), (
                    rest[m.end():] if m.group(1) is not None else None)
                offset, rest = offset + m.end(), rest[m.end():]
            yield "text", rest


def prose_runs(text: str) -> str:
    """The stored text with every math span left out (a stand-in when qa-check.ts gave none)."""
    return " ".join(seg[1] for seg in split_math(text) if seg[0] == "text")


def inline_dollar_math(text: str):
    """(content, text after the closing $) for each $...$ span main's splitMathText draws as math."""
    for seg in split_math(text):
        if seg[0] == "math" and seg[2] is not None:
            yield seg[1], seg[2]


_AMOUNT = re.compile(r"^ ?\d[\d,]*(?:\.\d+)?")
_NEXT_AMOUNT = re.compile(r"^ ?\d")


def money_as_math(name: str, raw: str, f: dict, add) -> None:
    """A $...$ span main draws as math that opens on an amount, closes on the next amount and
    holds a prose word between them: two prices, not math."""
    for content, after in inline_dollar_math(raw):
        if _AMOUNT.match(content) and _NEXT_AMOUNT.match(after) and _PROSE_WORD.search(content[_AMOUNT.match(content).end():]):
            add(f, "money_as_math", f"{name}: ${content[:60]}$ is drawn as math")


# ---- copyright / credit lines ----------------------------------------------------------------

_COPYRIGHT = re.compile(r"©\s*(?:\d{4}|by\b)|\(c\)\s*\d{4}\b|\bcopyright\s*(?:©|\(c\)|\d{4}\b|by\b)", re.I)


def copyright_line(name: str, shown: str, f: dict, add) -> None:
    m = _COPYRIGHT.search(shown)
    if m:
        end = shown.find("\n", m.start())
        add(f, "copyright_line", f"{name}: {shown[m.start():end if end != -1 else None][:70]!r}")


# ---- numeric grading -------------------------------------------------------------------------

def parse_numeric(text) -> Fraction | None:
    """parseNumericAnswer on main, exactly (as a Fraction)."""
    t = str(text if text is not None else "").strip()
    if re.fullmatch(r"[+-]?\d+\s*/\s*[+-]?\d+", t):
        top, bottom = (int(p.strip()) for p in t.split("/"))
        return None if bottom == 0 else Fraction(top, bottom)
    if re.fullmatch(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)", t):
        return Fraction(Decimal(t))
    return None


def accepted_answers(row: dict) -> list:
    """What main grades against: the reviewed numeric answer set (evidence.numeric_answer_set),
    else the stored key."""
    for e in row.get("answer_key_entries") or []:
        raw = e.get("raw_model_response") if isinstance(e, dict) else None
        if not isinstance(raw, dict):
            continue
        ev = raw.get("evidence") if isinstance(raw.get("evidence"), dict) else raw
        s = ev.get("numeric_answer_set")
        if isinstance(s, dict) and isinstance(s.get("answers"), list) and s["answers"]:
            return s["answers"]
    return [row.get("correct_answer")]


def _accepts(answer: str, accepted: list, tolerance: Fraction) -> bool:
    a = parse_numeric(answer)
    if a is None:
        return False
    slack = tolerance + Fraction(1, 10 ** 9)
    return any((v := parse_numeric(x)) is not None and abs(a - v) <= slack for x in accepted)


def _fits(x: Fraction) -> bool:
    """The exact value is a decimal that fits the answer box as it is (".75", "12.5")."""
    if not _primes(x.denominator) <= {2, 5}:
        return False
    s = format(Decimal(x.numerator) / Decimal(x.denominator), "f").lstrip("-")
    return len(s.lstrip("0") if abs(x) < 1 else s) <= 5


def _primes(n: int) -> set[int]:
    out, p = set(), 2
    while p * p <= n:
        while n % p == 0:
            out.add(p)
            n //= p
        p += 1
    if n > 1:
        out.add(n)
    return out


def sat_decimal_forms(x: Fraction) -> list[str]:
    """The decimals the SAT accepts for x when it does not fit: cut off or rounded to fill the
    box (5 characters; a minus sign takes a 6th), with or without a leading 0."""
    neg, ax = x < 0, abs(x)
    whole = int(ax)
    exact = Decimal(ax.numerator) / Decimal(ax.denominator)
    forms = set()
    for lead in (["", "0"] if whole == 0 else [str(whole)]):
        digits = 5 - len(lead) - 1
        if digits < 1:
            continue
        for mode in (ROUND_DOWN, ROUND_HALF_UP):
            s = format(exact.quantize(Decimal(1).scaleb(-digits), rounding=mode), "f")
            if lead == "" and s.startswith("0"):
                s = s[1:]
            forms.add(("-" if neg else "") + s)
    return sorted(forms)


def _repeating(key: str) -> Fraction | None:
    """A decimal key that is a repeating decimal written short (0.333, 2.667, -0.1666): the
    fraction (denominator under 100, not only 2s and 5s) it is cut off or rounded from."""
    m = re.fullmatch(r"[+-]?\d*\.(\d{3,})", key.strip())
    if not m:
        return None
    v = Fraction(Decimal(key.strip()))
    digits = len(m.group(1))
    if not re.search(r"(\d)\1\d?$", m.group(1)[-3:]):  # the written digits show the repeat
        return None
    for den in range(3, 100):
        if _primes(den) <= {2, 5}:
            continue
        num = round(v * den)
        cand = Fraction(num, den)
        if cand.denominator != den or cand == v:
            continue
        exact = Decimal(cand.numerator) / Decimal(cand.denominator)
        step = Decimal(1).scaleb(-digits)
        if Decimal(key.strip()) in (exact.quantize(step, rounding=ROUND_DOWN), exact.quantize(step, rounding=ROUND_HALF_UP)):
            return cand
    return None


def numeric_grading(row: dict, f: dict, add) -> None:
    if row.get("answer_format") != "numeric_entry":
        return
    key = str(row.get("correct_answer") or "").strip()
    value = parse_numeric(key)
    if value is None:
        return
    # A fraction key, a repeating decimal written short (its fraction), or a decimal too long
    # for the box (3.1205): the SAT takes it cut off or rounded.
    exact = value if "/" in key else (_repeating(key) or value)
    if exact.denominator == 1 or _fits(exact):
        return
    try:
        tolerance = max(Fraction(0), Fraction(Decimal(str(row.get("numeric_tolerance") or 0))))
    except (ArithmeticError, ValueError):
        tolerance = Fraction(0)
    accepted = accepted_answers(row)
    fraction = f"{exact.numerator}/{exact.denominator}"
    valid = sat_decimal_forms(exact) + ([fraction] if len(fraction.lstrip("-")) <= 5 else [])
    rejected = [s for s in valid if not _accepts(s, accepted, tolerance)]
    if rejected:
        add(f, "numeric_rejects_sat_decimal",
            f"key {key}: {', '.join(rejected)} would be marked wrong (accepted: {', '.join(map(str, accepted))[:60]}, "
            f"tolerance {row.get('numeric_tolerance') or 0})")


# ---- the row checks, as audit_rows runs them -------------------------------------------------

def check_row(row: dict, fields, f: dict, add) -> None:
    """`fields`: (name, display text, prose runs, stored text) for every text field and choice."""
    math = row.get("subject") == "math"
    for name, shown, prose, raw in fields:
        if math:
            plain_text_math(name, prose, f, add, shown)
        money_as_math(name, raw, f, add)
        copyright_line(name, shown, f, add)
    numeric_grading(row, f, add)
