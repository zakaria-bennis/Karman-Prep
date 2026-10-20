"""Comparison normalizer. Used only to compare text; never to change stored text.

Every comparison in the import pipeline imports this module, so the same
question always normalizes the same way. Bump NORMALIZER_VERSION whenever the
output for any input changes, because stored comparison keys depend on it.
"""

import functools
import re
import unicodedata

NORMALIZER_VERSION = "kn-1"

_SUPERSCRIPTS = dict(zip("⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻", "0123456789+-"))
_SUBSCRIPTS = dict(zip("₀₁₂₃₄₅₆₇₈₉₊₋", "0123456789+-"))
_VULGAR = "¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞"
_SUP_RUN = re.compile("[" + "".join(_SUPERSCRIPTS) + "]+")
_SUB_RUN = re.compile("[" + "".join(_SUBSCRIPTS) + "]+")
_SIMPLE_GROUP = re.compile(r"-?\w+")

_LATEX_SYMBOLS = (
    (re.compile(r"\\(?:times|cdot)(?![A-Za-z])"), "*"),
    (re.compile(r"\\div(?![A-Za-z])"), "/"),
    (re.compile(r"\\(?:leq|le)(?![A-Za-z])"), "≤"),
    (re.compile(r"\\(?:geq|ge)(?![A-Za-z])"), "≥"),
    (re.compile(r"\\(?:neq|ne)(?![A-Za-z])"), "≠"),
    (re.compile(r"\\lt(?![A-Za-z])"), "<"),
    (re.compile(r"\\gt(?![A-Za-z])"), ">"),
    (re.compile(r"\\pi(?![A-Za-z])"), "π"),
    (re.compile(r"\\%"), "%"),
    (re.compile(r"\\[,;: ]|[   ]"), " "),
)
_LATEX_NOISE = re.compile(r"\\(?:left|right)(?![A-Za-z])|\\[!()\[\]$]|\$")
_FRAC = re.compile(r"\\[dt]?frac(?![A-Za-z])")
_SQRT = re.compile(r"\\sqrt(?![A-Za-z])")
_SCRIPT = re.compile(r"([\^_])\{")

_QUOTES = str.maketrans("“”„‟‘’‚‛", "\"\"\"\"''''")
_DASHES = str.maketrans({c: "-" for c in "‐‑‒–—―−"})

_OPERATORS = "+-*/^=<>≤≥≠√"
BLANK = "______"  # every blank (4+ underscores) compares as this one token
_BLANK_RUN = re.compile(r"_{4,}")
_OP_OR_BRACKET = _OPERATORS + "()"
_PASSES = 5


def _read_arg(s: str, i: int):
    """Read a brace group or a single alphanumeric char at s[i]: (content, next index)."""
    if i >= len(s):
        return None
    if s[i] == "{":
        depth = 0
        for j in range(i, len(s)):
            if s[j] == "{":
                depth += 1
            elif s[j] == "}":
                depth -= 1
                if depth == 0:
                    return s[i + 1 : j], j + 1
        return None
    if s[i].isascii() and s[i].isalnum():
        return s[i], i + 1
    return None


def _match_close(s: str, open_idx: int):
    depth = 0
    for j in range(open_idx, len(s)):
        if s[j] == "(":
            depth += 1
        elif s[j] == ")":
            depth -= 1
            if depth == 0:
                return j
    return None


def _match_open(s: str, close_idx: int):
    depth = 0
    for j in range(close_idx, -1, -1):
        if s[j] == ")":
            depth += 1
        elif s[j] == "(":
            depth -= 1
            if depth == 0:
                return j
    return None


def _wrap(a: str) -> str:
    """Parenthesize an operand unless it is already one parenthesized group."""
    a = a.strip()
    if a.startswith("(") and _match_close(a, 0) == len(a) - 1:
        return a
    return f"({a})"


def _replace_commands(s: str, pattern: re.Pattern, groups: int, build) -> str:
    """Replace each `\\cmd{..}{..}` match (with `groups` arguments) using build()."""
    out, pos = [], 0
    for m in pattern.finditer(s):
        if m.start() < pos:
            continue
        i, args = m.end(), []
        for _ in range(groups):
            got = _read_arg(s, i)
            if got is None:
                break
            args.append(got[0])
            i = got[1]
        if len(args) != groups:
            continue
        out.append(s[pos : m.start()])
        out.append(build(*args))
        pos = i
    out.append(s[pos:])
    return "".join(out)


def _unicode_math(s: str) -> str:
    for ch in _VULGAR:
        num, den = unicodedata.normalize("NFKD", ch).split("⁄")
        frac = f"({num})/({den})"
        s = re.sub(f"(?<=\\d){ch}", " " + frac, s)  # mixed number: 1½ -> 1 (1)/(2)
        s = s.replace(ch, frac)
    s = _SUP_RUN.sub(lambda m: "^" + "".join(_SUPERSCRIPTS[c] for c in m.group()), s)
    s = _SUB_RUN.sub(lambda m: "_" + "".join(_SUBSCRIPTS[c] for c in m.group()), s)
    return s.replace("−", "-").replace("×", "*").replace("÷", "/")


def _latex_math(s: str) -> str:
    s = _replace_commands(s, _FRAC, 2, lambda a, b: f"{_wrap(a)}/{_wrap(b)}")
    s = _replace_commands(s, _SQRT, 1, lambda a: "√" + _wrap(a))
    for pattern, repl in _LATEX_SYMBOLS:
        s = pattern.sub(repl, s)
    return _LATEX_NOISE.sub("", s)


def _unbrace_scripts(s: str) -> str:
    """`^{2}` -> `^2`, `_{-1}` -> `_-1`; keep braces around compound groups."""
    out, pos = [], 0
    for m in _SCRIPT.finditer(s):
        if m.start() < pos:
            continue
        got = _read_arg(s, m.end() - 1)
        if got is None or not _SIMPLE_GROUP.fullmatch(got[0]):
            continue
        out.append(s[pos : m.start()])
        out.append(m.group(1) + got[0])
        pos = got[1]
    out.append(s[pos:])
    return "".join(out)


def _math_spacing(s: str) -> str:
    """Drop whitespace next to an operator or bracket when both sides look like math.

    Math-like: a digit, an operator or bracket, or a single standalone letter.
    Prose such as "well - known" keeps its spaces.
    """

    def left_ok(i):
        c = s[i - 1]
        return c.isdigit() or c in _OP_OR_BRACKET or (c.isalpha() and (i < 2 or not s[i - 2].isalpha()))

    def right_ok(j):
        c = s[j]
        return c.isdigit() or c in _OP_OR_BRACKET or (c.isalpha() and (j + 1 >= len(s) or not s[j + 1].isalpha()))

    def gap(m):
        i, j = m.start(), m.end()
        touches = s[i - 1] in _OP_OR_BRACKET or s[j] in _OP_OR_BRACKET
        return "" if touches and left_ok(i) and right_ok(j) else m.group()

    return re.sub(r"(?<=\S)\s+(?=\S)", gap, s)


_NUMBER_OR_LETTER = r"(?:[A-Za-z]|\d+(?:\.\d+)?)"
_LEFT_TOKEN = re.compile(rf"(?<![\w./]){_NUMBER_OR_LETTER}$")
_RIGHT_TOKEN = re.compile(rf"{_NUMBER_OR_LETTER}(?![\w./(])")


def _bare_fractions(s: str) -> str:
    """`a/b`, `(x+1)/2`, `2/(x+1)` -> `(a)/(b)` for single tokens and bracket groups."""
    out, pos = [], 0
    for k, c in enumerate(s):
        if c != "/" or k < pos:
            continue
        if k > 0 and s[k - 1] == ")":
            o = _match_open(s, k - 1)
            if o is None or o < pos or (o > 0 and (s[o - 1].isalnum() or s[o - 1] in "_./")):
                continue
            left = (o, k)
        elif (m := _LEFT_TOKEN.search(s, 0, k)) and m.start() >= pos:
            left = (m.start(), k)
        else:
            continue
        if s[k + 1 : k + 2] == "(":
            c2 = _match_close(s, k + 1)
            if c2 is None or (c2 + 1 < len(s) and (s[c2 + 1].isalnum() or s[c2 + 1] in "_./")):
                continue
            right = (k + 1, c2 + 1)
        elif m := _RIGHT_TOKEN.match(s, k + 1):
            right = (k + 1, m.end())
        else:
            continue
        out.append(s[pos : left[0]])
        out.append(f"{_wrap(s[left[0]:left[1]])}/{_wrap(s[right[0]:right[1]])}")
        pos = right[1]
    out.append(s[pos:])
    return "".join(out)


def _normalize_once(s: str) -> str:
    s = _BLANK_RUN.sub(BLANK, s)
    s = _unicode_math(s)
    s = _unbrace_scripts(_latex_math(s))
    s = unicodedata.normalize("NFKC", s).casefold()
    s = unicodedata.normalize("NFKC", s)
    s = s.translate(_QUOTES).translate(_DASHES).replace("…", "...")
    s = s.replace(">=", "≥").replace("<=", "≤")
    s = _math_spacing(" ".join(s.split()))
    return " ".join(_bare_fractions(s).split())


@functools.lru_cache(maxsize=1 << 16)  # pure function; the corpus run normalizes each text several times
def normalize_text(s: str) -> str:
    # Rewrites can expose each other (e.g. `\sqrt${x}`), so repeat until stable.
    for _ in range(_PASSES):
        nxt = _normalize_once(s)
        if nxt == s:
            break
        s = nxt
    return s


_MARKUP = re.compile(r"</?([ui])>|_{4,}", re.IGNORECASE)


def strip_markup(s: str) -> tuple[str, tuple[tuple[int, int, str], ...]]:
    """Remove `<u>`/`<i>` tags; return plain text and (start, end, kind) spans.

    kind is "u", "i" or "blank" (a run of 4+ underscores, which stays in the
    text as the fixed BLANK token whatever its length). Offsets refer to the
    returned plain text.
    """
    out, spans, open_at, pos, length = [], [], {"u": [], "i": []}, 0, 0
    for m in _MARKUP.finditer(s):
        chunk = s[pos : m.start()]
        out.append(chunk)
        length += len(chunk)
        pos = m.end()
        tag = m.group(1)
        if tag is None:  # blank: keep it in the text as the fixed token
            out.append(BLANK)
            spans.append((length, length + len(BLANK), "blank"))
            length += len(BLANK)
        elif not m.group().startswith("</"):
            open_at[tag.lower()].append(length)
        elif open_at[tag.lower()]:
            spans.append((open_at[tag.lower()].pop(), length, tag.lower()))
    out.append(s[pos:])
    length += len(s) - pos
    for kind, starts in open_at.items():  # unclosed tags run to the end
        spans.extend((st, length, kind) for st in starts)
    return "".join(out), tuple(sorted(spans))


_LETTER = r"[^\W\d_]"
_MATH_TOKEN = re.compile(rf"\d+(?:\.\d+)?|[-+*/^=<>≤≥≠√]|(?<!{_LETTER}){_LETTER}(?!{_LETTER})")


def math_tokens(s: str) -> tuple[str, ...]:
    """Digits, signs, operators and standalone single-letter variables, in order."""
    return tuple(_MATH_TOKEN.findall(normalize_text(s)))
