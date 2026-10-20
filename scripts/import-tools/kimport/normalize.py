"""Comparison normalizer. Used only to compare text; never to change stored text.

Every comparison in the import pipeline imports this module, so the same
question always normalizes the same way. Bump NORMALIZER_VERSION whenever the
output for any input changes, because stored comparison keys depend on it.
"""

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
)
_LATEX_NOISE = re.compile(r"\\(?:left|right)(?![A-Za-z])|\\[(),;!\[\]]|\$|[   ]")
_FRAC = re.compile(r"\\[dt]?frac(?![A-Za-z])")
_SQRT = re.compile(r"\\sqrt(?![A-Za-z])")
_SCRIPT = re.compile(r"([\^_])\{")

_QUOTES = str.maketrans("“”„‟‘’‚‛", "\"\"\"\"''''")
_DASHES = str.maketrans({c: "-" for c in "‐‑‒–—―−"})

_TOKEN = r"(?:[A-Za-z]|\d+(?:\.\d+)?)"
_BARE_FRACTION = re.compile(rf"(?<![\w./])({_TOKEN})/({_TOKEN})(?![\w./(])")


def _read_group(s: str, i: int):
    """Return (content, index after the closing brace) for s[i] == '{', or None."""
    if i >= len(s) or s[i] != "{":
        return None
    depth = 0
    for j in range(i, len(s)):
        if s[j] == "{":
            depth += 1
        elif s[j] == "}":
            depth -= 1
            if depth == 0:
                return s[i + 1 : j], j + 1
    return None


def _replace_commands(s: str, pattern: re.Pattern, groups: int, build) -> str:
    """Replace each `\\cmd{..}{..}` match (with `groups` brace groups) using build()."""
    out, pos = [], 0
    for m in pattern.finditer(s):
        if m.start() < pos:
            continue
        i, args = m.end(), []
        for _ in range(groups):
            got = _read_group(s, i)
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
        s = s.replace(ch, f"({num})/({den})")
    s = _SUP_RUN.sub(lambda m: "^" + "".join(_SUPERSCRIPTS[c] for c in m.group()), s)
    s = _SUB_RUN.sub(lambda m: "_" + "".join(_SUBSCRIPTS[c] for c in m.group()), s)
    return s.replace("−", "-").replace("×", "*").replace("÷", "/")


def _latex_math(s: str) -> str:
    s = _replace_commands(s, _FRAC, 2, lambda a, b: f"({a})/({b})")
    s = _replace_commands(s, _SQRT, 1, lambda a: f"√({a})")
    for pattern, repl in _LATEX_SYMBOLS:
        s = pattern.sub(repl, s)
    return _LATEX_NOISE.sub("", s)


def _unbrace_scripts(s: str) -> str:
    """`^{2}` -> `^2`, `_{-1}` -> `_-1`; keep braces around compound groups."""
    out, pos = [], 0
    for m in _SCRIPT.finditer(s):
        if m.start() < pos:
            continue
        got = _read_group(s, m.end() - 1)
        if got is None or not _SIMPLE_GROUP.fullmatch(got[0]):
            continue
        out.append(s[pos : m.start()])
        out.append(m.group(1) + got[0])
        pos = got[1]
    out.append(s[pos:])
    return "".join(out)


def normalize_text(s: str) -> str:
    s = _unicode_math(s)
    s = _unbrace_scripts(_latex_math(s))
    s = unicodedata.normalize("NFKC", s).casefold()
    s = unicodedata.normalize("NFKC", s)
    s = s.translate(_QUOTES).translate(_DASHES).replace("…", "...")
    s = _BARE_FRACTION.sub(r"(\1)/(\2)", s)
    return " ".join(s.split())


_MARKUP = re.compile(r"</?([ui])>|_{4,}", re.IGNORECASE)


def strip_markup(s: str) -> tuple[str, tuple[tuple[int, int, str], ...]]:
    """Remove `<u>`/`<i>` tags; return plain text and (start, end, kind) spans.

    kind is "u", "i" or "blank" (a run of 4+ underscores, which stays in the
    text). Offsets refer to the returned plain text.
    """
    out, spans, open_at, pos, length = [], [], {"u": [], "i": []}, 0, 0
    for m in _MARKUP.finditer(s):
        chunk = s[pos : m.start()]
        out.append(chunk)
        length += len(chunk)
        pos = m.end()
        tag = m.group(1)
        if tag is None:  # blank: keep the underscores in the text
            out.append(m.group())
            spans.append((length, length + len(m.group()), "blank"))
            length += len(m.group())
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
