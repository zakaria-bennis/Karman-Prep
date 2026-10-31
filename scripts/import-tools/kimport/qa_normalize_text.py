"""The mechanical Bluebook text fixes of `k qa normalize` (pipeline/qa/bluebook-style/STYLE.md).
Pure functions on one stored field; nothing here reads or writes a database.

A field is split the way main's MathText splits it (kimport.qa_bank_checks.split_math, the same
regular expressions): underline/italic tokens, math spans ($...$, $$...$$, \\(...\\)) and the
prose between them. Prose rules see the prose with each math span as one stand-in character and
each token as another, so a rule never edits math or markup and reads its neighbours across
them; math rules (fractions, commas) see one math span at a time. Each rule changes only what
it is sure of; anything it cannot decide stays exactly as stored and is listed as ambiguous.

Rules (plan.json counts each one):
  quotes        straight quotes and apostrophes to curly, outside math and markup
  dashes        `--` / `---` used as a dash to a closed em dash; a spaced em dash closed
  en_dash       U+2013: a range or compound to `-`, a minus to U+2212, a prose dash to `—`
  minus         a hyphen used as a minus sign in prose (`= -3`, `(-9, 0)`; math rows: `x - 9`)
                to U+2212 (inside math `-` is already the math minus and stays)
  fractions     a simple slash fraction inside math (digits or one letter each side) to \\frac
  math_commas   `1,150` inside math to `1{,}150`
  percent_units `30 percent` / `30 %` to `30%`, `$ 13` to `$13`, `2.29mm` to `2.29 mm`
  whitespace    trailing spaces, doubled spaces between words, spaces before , . ; : ? !
  blanks        `______blank`, `[blank]` and other underscore runs to the standard `______`
  notes         the notes intro wording and `• ` bullets in a notes list
  thousands     a missing thousands comma outside math (`27000 years` to `27,000 years`)
"""

import re
import unicodedata

from kimport.qa_bank_checks import _BLOCK, _INLINE, _RUN_TOKENS, currency_dollar_delimiters

RULES = ("quotes", "dashes", "en_dash", "minus", "fractions", "math_commas", "percent_units",
         "whitespace", "blanks", "notes", "thousands")
TAG, MATH = "\ue000", "\ue001"  # stand-ins in the prose for a markup token and a math span
BLANK = "______"
NOTES_INTRO = "While researching a topic, a student has taken the following notes:"
# Intro lines that are the notes intro in another wording (exact lines seen in the bank).
NOTES_VARIANTS = (
    "While researching a topic, a student has taken the following notes.",
    "- While researching a topic, a student has taken the following notes:",
    "• While researching a topic, a student has taken the following notes:",
    "While researching a topic, a student took the following notes:",
    "While researching a topic, a student took the following notes.",
)
_STEM_LINE = re.compile(r"\s*(?:The student wants|Which choice)")


# ---------------------------------------------------------------- splitting


def split(text: str) -> list[tuple[str, str]]:
    """[(kind, exact source)] with kind "tag", "math" or "prose"; the pieces join to `text`.
    The same cuts as qa_bank_checks.split_math (main's splitMathText), keeping the delimiters."""
    out: list[tuple[str, str]] = []
    pos = 0
    text = text or ""
    for m in _RUN_TOKENS.finditer(text):
        out += _split_run(text[pos:m.start()])
        out.append(("tag", m.group(0)))
        pos = m.end()
    out += _split_run(text[pos:])
    return [p for p in out if p[1]]


def _split_run(run: str) -> list[tuple[str, str]]:
    out = []
    for k, piece in enumerate(_BLOCK.split(run)):
        if k % 2:
            out.append(("math", f"$${piece}$$"))
            continue
        currency = currency_dollar_delimiters(piece)
        offset, rest = 0, piece
        while True:
            m = _INLINE.search(rest)
            if not m:
                break
            if m.group(1) is not None and (offset + m.start() in currency or offset + m.end() - 1 in currency):
                out.append(("prose", rest[:m.start() + 1]))
                offset, rest = offset + m.start() + 1, rest[m.start() + 1:]
                continue
            out.append(("prose", rest[:m.start()]))
            out.append(("math", m.group(0)))
            offset, rest = offset + m.end(), rest[m.end():]
        out.append(("prose", rest))
    return out


def _math_parts(src: str) -> tuple[str, str, str]:
    for a, b in (("$$", "$$"), ("\\(", "\\)"), ("$", "$")):
        if src.startswith(a) and src.endswith(b) and len(src) >= len(a) + len(b):
            return a, src[len(a):len(src) - len(b)], b
    raise ValueError(f"not a math span: {src[:40]!r}")


class Result:
    def __init__(self):
        self.counts: dict[str, int] = {}
        self.ambiguous: list[tuple[str, str]] = []  # (rule, excerpt)

    def hit(self, rule: str, n: int = 1) -> None:
        if n:
            self.counts[rule] = self.counts.get(rule, 0) + n
            if not self.counts[rule]:
                del self.counts[rule]

    def unsure(self, rule: str, s: str, i: int, j: int | None = None) -> None:
        j = i + 1 if j is None else j
        ex = (s[max(0, i - 25):j + 25]).replace(TAG, "").replace(MATH, "⟨math⟩").replace("\n", "⏎")
        self.ambiguous.append((rule, ex))


# ---------------------------------------------------------------- math rules

_FRAC_OPERAND = r"(?:\d+|[A-Za-z])"
_FRAC = re.compile(rf"(?<![\w.\\}}^_)\]|]){_FRAC_OPERAND}[ ]?/[ ]?{_FRAC_OPERAND}(?![\w.(^_\\{{\[|])")
_FRAC_PARTS = re.compile(rf"({_FRAC_OPERAND})[ ]?/[ ]?({_FRAC_OPERAND})")
_PAREN_FRAC = re.compile(r"(?<![\w)}\]|.])\((\\frac\{\w+\}\{\w+\})\)(?![\^_'])")
_GROUPED = re.compile(r"(?<![\d.,])(\d{1,3})((?:,\d{3})+)(?!\d)")


def math_fractions(content: str, res: Result) -> str:
    """Every slash in the span must be a simple fraction, else the span stays as it is."""
    if "/" not in content:
        return content
    if re.search(r"\\(?:text|mathrm|textrm|operatorname)\{[^}]*/", content):
        res.unsure("fractions", content, 0, len(content))
        return content
    found = list(_FRAC.finditer(content))
    if len(found) != content.count("/"):
        res.unsure("fractions", content, 0, len(content))
        return content
    for f in found:  # a letter operand must not be the end of a command (\pi/2) or a word
        a, b = _FRAC_PARTS.fullmatch(f.group(0)).groups()
        if a.isalpha() and re.search(r"\d\s$", content[:f.start()]):  # 5 m/s: a unit
            res.unsure("fractions", content, 0, len(content))
            return content
    out = _FRAC.sub(lambda m: "\\frac{%s}{%s}" % _FRAC_PARTS.fullmatch(m.group(0)).groups(), content)
    out = _PAREN_FRAC.sub(r"\1", out)
    res.hit("fractions", len(found))
    return out


def math_commas(content: str, res: Result) -> str:
    def one(m):
        i, j = m.start(), m.end()
        before, after = content[:i].rstrip(" "), content[j:].lstrip(" ")
        sole = (before.endswith(("(", "[", "\\{")) and after.startswith((")", "]", "\\}"))
                and not (before.endswith("(") and len(before) > 1 and (before[-2].isdigit() or before[-2] in ")}")))
        listy = re.match(r",\s*\d", content[j:]) or re.search(r"\d\s*,\s*$", content[:i])
        if sole or listy:
            res.unsure("math_commas", content, i, j)
            return m.group(0)
        res.hit("math_commas")
        return m.group(1) + m.group(2).replace(",", "{,}")
    return _GROUPED.sub(one, content)


def fix_math(src: str, res: Result) -> str:
    a, content, b = _math_parts(src)
    content = math_commas(content, res)
    content = math_fractions(content, res)
    return a + content + b


# ---------------------------------------------------------------- prose rules
# Each takes the masked prose (TAG / MATH stand-ins), the row's subject and the Result.

_LETTER = re.compile(r"[^\W\d_]")


def _blanks(s: str, res: Result) -> str:
    def word(m):
        res.hit("blanks")
        return BLANK
    s = re.sub(r"_{2,}[ \t]?blank\b|\bblank[ \t]?_{2,}|[\[(][ \t]*blank[ \t]*[\])]", word, s, flags=re.I)
    for m in re.finditer(r"_{2,}[ \t]+_{2,}|(?<![\w_])_(?![\w_])", s):
        res.unsure("blanks", s, m.start(), m.end())

    def run(m):
        if len(m.group(0)) == len(BLANK):
            return m.group(0)
        res.hit("blanks")
        return BLANK
    return re.sub(r"(?<!_)_{4,}(?!_)", run, s)


def _dashes(s: str, res: Result) -> str:
    def ascii_run(m):
        left, right = s[:m.start()], s[m.end():]
        lc, rc = (left.rstrip(" \t") or "\n")[-1], (right.lstrip(" \t") or "")[:1]
        if rc == "" and not right.strip(" \t") and "\n" not in right:
            rc = "."  # the dash ends the field (a choice that fills a blank)
        if "\n" in (lc, rc) or "_" in (lc, rc) or "/" in (lc, rc) or not rc:
            res.unsure("dashes", s, m.start(), m.end())
            return m.group(0)
        res.hit("dashes")
        bare = m.group(0).strip(" \t")
        if lc.isdigit() and rc.isdigit() and bare == m.group(0) and len(bare) == 2:
            return "-"  # 1990--2000: a range takes a hyphen
        return "—"
    s = re.sub(r"[ \t]*(?<!-)-{2,3}(?!-)[ \t]*", ascii_run, s)

    def spaced(m):
        left, right = s[:m.start()], s[m.end():]
        lc, rc = (left or "\n")[-1], (right or "\n")[0]
        lead, trail = m.group(1), m.group(2)
        keep_lead = bool(lead) and (lc in "\n_/" or not left.strip(" \t"))
        keep_trail = bool(trail) and (rc in "\n_/" or not right.strip(" \t"))
        if (lead and not keep_lead) or (trail and not keep_trail):
            res.hit("dashes")
        elif lead or trail:
            res.unsure("dashes", s, m.start(), m.end())
        return (lead if keep_lead else "") + "—" + (trail if keep_trail else "")
    return re.sub(r"([ \t]*)—([ \t]*)", spaced, s)


def _en_dash(s: str, res: Result) -> str:
    def one(m):
        i = m.start()
        lc, rc = (s[:i] or "\n")[-1], (s[i + 1:] or "\n")[0]
        if lc.isdigit() and rc.isdigit() or (_LETTER.match(lc) and _LETTER.match(rc)):
            res.hit("en_dash")
            return "-"
        if rc.isdigit() and (lc in " \t(=[" or lc == "\n"):
            res.hit("en_dash")
            return "−"
        if lc in " \t" and rc in " \t":
            res.hit("en_dash")
            return "—"
        res.unsure("en_dash", s, i)
        return "–"
    return re.sub("–", one, s)


_MATHY_LEFT = re.compile(rf"(?:(?<![^\W\d_])[A-Za-z]|\d+(?:\.\d+)?[A-Za-z]?|[)\]²³⁴⁵⁶⁷⁸⁹|]|{MATH})$")
_MATHY_RIGHT = re.compile(rf"^(?:\d|[A-Za-z](?![^\W\d_])|[(\[|]|{MATH})")


def _minus(s: str, subject: str, res: Result) -> str:
    def lead(m):
        if re.search(r"[.:;][ \t]$", s[:m.start()]):
            res.unsure("minus", s, m.start())
            return "-"
        res.hit("minus")
        return "−"
    s = re.sub(r"(?<=[ \t(\[=,<>≤≥])-(?=\d)", lead, s)
    if subject != "math":
        return s
    s = re.sub(r"(?m)^-(?=\d)", lead, s)  # a choice or a line that is a negative number

    def binary(m):
        left, right = s[:m.start()], s[m.end():]
        if _MATHY_LEFT.search(left) and _MATHY_RIGHT.match(right):
            res.hit("minus")
            return " − "
        return m.group(0)
    return re.sub(r"(?<=\S) - (?=\S)", binary, s)


_UNITS_ALL = "cm|mm|km|kg|mg|mL|ml|lbs|lb|ft|mi|m|g"
_UNITS_MATH = "cm|mm|km|kg|mg|mL|ml|lbs"


def _percent_units(s: str, subject: str, res: Result) -> str:
    def p(m):
        res.hit("percent_units")
        return "%"
    s = re.sub(r"(?<=\d)[ \t]?percent\b(?!-)", p, s)
    s = re.sub(r"(?<=\d)[ \t]+%", p, s)

    def dollar(m):
        res.hit("percent_units")
        return "$"
    s = re.sub(r"\$[ \t]+(?=\d)", dollar, s)
    units = _UNITS_MATH if subject == "math" else _UNITS_ALL

    def unit(m):
        res.hit("percent_units")
        return f"{m.group(1)} {m.group(2)}"
    return re.sub(rf"(?<![\w.,{MATH}])(\d+(?:\.\d+)?)({units})\b(?![{MATH}\-])", unit, s)


def _whitespace(s: str, res: Result) -> str:
    def trail(m):
        res.hit("whitespace")
        return ""
    s = re.sub(r"[ \t]+(?=\n|$)", trail, s)
    lines = s.split("\n")
    for k, line in enumerate(lines):
        runs = list(re.finditer(r"(?<=\S) {2,}(?=\S)", line))
        if len(runs) > 1:  # columns set with spaces: a person decides
            res.unsure("whitespace", line, runs[0].start(), runs[-1].end())
        elif runs:
            res.hit("whitespace")
            lines[k] = line[:runs[0].start()] + " " + line[runs[0].end():]
    s = "\n".join(lines)

    def before(m):
        punct = s[m.end()]
        nxt = s[m.end() + 1:m.end() + 2]
        if punct == "." and (nxt == "." or s[m.end():m.end() + 3] == ". ." or s[m.start() - 1:m.start()] == "."):
            return m.group(0)  # an ellipsis
        res.hit("whitespace")
        return ""
    return re.sub(r"(?<=[^\s_(\[])[ \t]+(?=[,.;:?!](?![\w.]))", before, s)


def _notes(s: str, res: Result) -> str:
    lines = s.split("\n")
    at = [k for k, line in enumerate(lines) if "following notes" in line.replace(TAG, "")]
    if not at:
        return s
    if len(at) > 1:
        res.unsure("notes", s, 0, 60)
        return s
    k = at[0]
    intro = lines[k].strip(" \t")
    if intro in NOTES_VARIANTS:
        lines[k] = NOTES_INTRO
        res.hit("notes")
    elif intro != NOTES_INTRO:
        res.unsure("notes", lines[k], 0, len(lines[k]))
        return "\n".join(lines)
    end = next((j for j in range(k + 1, len(lines)) if _STEM_LINE.match(lines[j])), len(lines))
    block = [j for j in range(k + 1, end) if lines[j].strip()]
    kinds = {}
    for j in block:
        line = lines[j]
        if line.startswith("• ") and not line.startswith("•  "):
            kinds[j] = "ok"
        elif re.match(r"(?:- |•(?! )|• {2,})\S", line):
            kinds[j] = "fix"
        elif re.match(r"[^\s\-•*]", line) and re.search(r"[.!?][”’\"')]*$", line):
            kinds[j] = "bare"
        else:
            kinds[j] = "unsure"
    if "unsure" in kinds.values() or ("bare" in kinds.values() and set(kinds.values()) != {"bare"}):
        res.unsure("notes", "\n".join(lines[k:end]), 0, 80)
        return "\n".join(lines)
    for j, kind in kinds.items():
        if kind == "fix":
            lines[j] = "• " + re.sub(r"^(?:- |• *)", "", lines[j])
            res.hit("notes")
        elif kind == "bare":
            lines[j] = "• " + lines[j]
            res.hit("notes")
    return "\n".join(lines)


_UNIT_NOUNS = ("feet|foot|meters|metres|miles|kilometers|kilometres|inches|centimeters|square|cubic|acres|hectares|"
               "pounds|grams|kilograms|tons|tonnes|liters|litres|gallons|people|residents|students|dollars|"
               "years|species|words|items|units|households|visitors|participants|copies|cars|trees|birds")


def _group(digits: str) -> str:
    return f"{int(digits):,}"


def _thousands(s: str, res: Result) -> str:
    def big(m):
        before = s[:m.start()]
        if re.search(r"(?:\b[A-Z]{1,5}|No\.|[#“\"‘'])[ \t]?$", before) or re.match(r"[”\"’']|\.[”\"’]", s[m.end():]):
            res.unsure("thousands", s, m.start(), m.end())
            return m.group(0)
        res.hit("thousands")
        return _group(m.group(0))
    s = re.sub(rf"(?<![\w.,/#\-−(${MATH}{TAG}])[1-9]\d{{4,}}(?=[ \t]+[a-z]|[.,;:!?](?:[ \t]|\n|$)|\n|$)", big, s)

    def money(m):
        res.hit("thousands")
        return "$" + _group(m.group(1))
    s = re.sub(r"\$([1-9]\d{3,})(?![\d,])", money, s)

    def unit(m):
        res.hit("thousands")
        return _group(m.group(1)) + m.group(2)
    return re.sub(rf"(?<![\w.,/#\-−(${MATH}{TAG}])(2[1-9]\d\d|[3-9]\d{{3}})(\s+(?:{_UNIT_NOUNS})\b)", unit, s)


# ---- quotes


def _ctx(s: str, i: int, step: int):
    j = i + step
    while 0 <= j < len(s) and s[j] == TAG:
        j += step
    return s[j] if 0 <= j < len(s) else None


def _ws(c) -> bool:
    return c is None or c.isspace()


_OPENERS = set("([{—/‘“-") | {"\u2018"}
_CLOSE_NEXT = set(".,;:!?)]}—’”-/…")
_ELISIONS = re.compile(r"'(?:tis|twas|em|til|n'|cause)\b", re.I)


def _double_kind(s: str, i: int) -> str:
    p, n = _ctx(s, i, -1), _ctx(s, i, 1)
    if (p is None or p.isspace() or p in _OPENERS) and not _ws(n):
        return "open"
    if not _ws(p) and p != MATH and (n is None or n.isspace() or n in _CLOSE_NEXT or n == "'"):
        return "close"
    return "unsure"


def _single_close(s: str, i: int, subject: str) -> bool:
    p, n = _ctx(s, i, -1), _ctx(s, i, 1)
    if _ws(p) or p == MATH or p.isdigit():
        return False
    if not (n is None or n.isspace() or n in _CLOSE_NEXT or n in "\"”"):
        return False
    if subject == "math" and _LETTER.match(p) and not re.search(r"[^\W\d_]{2}$", s[:i].replace(TAG, "")):
        return False  # A' in a math row is a prime
    return True


def _quotes(s: str, subject: str, res: Result) -> str:
    out = list(s)
    # double quotes: the whole field alternates open / close, or none is changed
    seq = [(i, "open" if c == "“" else "close" if c == "”" else _double_kind(s, i))
           for i, c in enumerate(s) if c in "\"“”"]
    straight = [i for i, c in enumerate(s) if c == '"']
    want = "open"
    ok = True
    for i, kind in seq:
        if kind != want:
            ok = False
            break
        want = "close" if want == "open" else "open"
    if straight:
        if ok and want == "open":
            for i, kind in seq:
                if s[i] == '"':
                    out[i] = "“" if kind == "open" else "”"
            res.hit("quotes", len(straight))
        else:
            res.unsure("quotes", s, straight[0])
    # single quotes, one at a time; a word with an unsure one keeps all of its own
    singles = [i for i, c in enumerate(s) if c == "'"]
    unsure_at = []
    for i in singles:
        p, n = _ctx(s, i, -1), _ctx(s, i, 1)
        if p is not None and n is not None and _LETTER.match(n) and (p.isdigit() or _LETTER.match(p)):
            if subject == "math" and not re.search(r"[^\W\d_]{2}$", s[:i].replace(TAG, "")):
                res.unsure("quotes", s, i)
                continue
            out[i] = "’"
        elif _single_close(s, i, subject):
            out[i] = "’"
        elif (p is None or p.isspace() or p in _OPENERS or p in "\"“") and n is not None and (n.isalnum()):
            if re.match(r"'\d\ds?\b", s[i:]) or _ELISIONS.match(s[i:].replace(TAG, "")):
                out[i] = "’"
            else:
                para_end = s.find("\n\n", i)
                rest = range(i + 1, para_end if para_end != -1 else len(s))
                nxt = next((j for j in rest if s[j] == "'" and not (
                    _LETTER.match(_ctx(s, j, 1) or "") and (_ctx(s, j, -1) or " ").isalnum())), None)
                if nxt is not None and _single_close(s, nxt, subject):
                    out[i] = "‘"
                else:
                    unsure_at.append(i)
                    continue
        else:
            unsure_at.append(i)
            continue
        res.hit("quotes")
    for i in unsure_at:
        res.unsure("quotes", s, i)
        a, b = i, i
        while a > 0 and not s[a - 1].isspace():
            a -= 1
        while b < len(s) and not s[b].isspace():
            b += 1
        for j in range(a, b):
            if s[j] == "'" and out[j] != "'":
                out[j] = "'"
                res.hit("quotes", -1)
    return "".join(out)


# ---------------------------------------------------------------- one field


def normalize_field(text: str, subject: str) -> tuple[str, Result]:
    """(new text, Result). The text comes back unchanged when no rule applies."""
    res = Result()
    if not text:
        return text, res
    pieces = split(text)
    held = []
    masked = []
    for kind, src in pieces:
        if kind == "prose":
            masked.append(src)
        else:
            held.append((kind, fix_math(src, res) if kind == "math" else src))
            masked.append(TAG if kind == "tag" else MATH)
    s = "".join(masked)
    s = _blanks(s, res)
    s = _notes(s, res)
    s = _en_dash(s, res)
    s = _dashes(s, res)
    s = _minus(s, subject, res)
    s = _percent_units(s, subject, res)
    s = _thousands(s, res)
    s = _whitespace(s, res)
    s = _quotes(s, subject, res)
    if s.count(TAG) + s.count(MATH) != len(held):
        raise ValueError("a rule dropped a math span or a markup token")
    it = iter(held)
    out = "".join(next(it)[1] if c in (TAG, MATH) else c for c in s)
    return out, res


# ---------------------------------------------------------------- the word check


def _canon(text: str) -> str:
    t = unicodedata.normalize("NFC", text or "")
    for v in NOTES_VARIANTS:
        t = t.replace(v.lstrip("-• "), NOTES_INTRO)
    t = re.sub(r"_{2,}[ \t]?blank\b|\bblank[ \t]?_{2,}|[\[(][ \t]*blank[ \t]*[\])]", "_", t, flags=re.I)
    t = re.sub(r"\\[A-Za-z]+", " ", t.replace("\\%", "%"))
    t = re.sub(r"(?<=\d)(?:\{,\}|,)(?=\d{3})", "", t)
    t = re.sub(r"(?<=\d)(?=[^\W\d_])|(?<=[^\W\d_])(?=\d)", " ", t)  # 100g and 100 g
    return t.replace("%", " percent ")


def words(text: str) -> list[str]:
    """The words and numbers of a field in order, with the intended character swaps set aside."""
    return re.findall(r"[^\W_]+", _canon(text))
