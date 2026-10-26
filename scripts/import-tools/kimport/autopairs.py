"""First pass over the founder's close-match pairs (O8): propose same / different / unclear.

It only proposes. Nothing here writes clusters.json or the decision log; the
founder reads sample.md, and only after his OK does anyone run `k pairs apply`
with decisions-proposed.json ({pair_id: "same"|"different"}, the file that
command reads).

Founder's rule: same question = same stem, same choices, same answer. Scanning
typos of a few letters are the same question. A different name, fact, number,
variable or correct answer is a different question.

  1. Both sides get formatting-only rewrites (prepare_text): curly quotes,
     <i>/<b>/<em>/<strong> tags, "[Underlined portion: ...]" written as <u>,
     dash spellings ("---", "--", " — "), spacing before punctuation and
     around hyphens, accents, question-number and "Section" header lines,
     \\textbf-style wrappers, bullets, markdown *italics*, "Answer:" lines.
     Then normalize.normalize_text (kn-2) for math.
  2. Stem, underlined spans and choices (paired by closeness, order ignored)
     are compared token by token. Each differing spot gets a kind:
       content  a number, single-letter variable, meaning word (typo.MEANING_WORDS)
                or a whole different word / name ("almond" vs "oyster")
       ocr      a few letters in one word that is not a common word on both sides
       real     a few letters, but both sides are common words ("small"/"smell")
       near     a bit more than typo.MAX_SPOT_CHARS letters, still look-alike
       punct    punctuation or brackets only
       op       an operator or sign only (a lost minus sign is common in scans)
       insert   words, a blank or a sentence on one side only
       blank    a blank (____) against words
       moved    the same 4+ words dropped in one place and added in another (layout; ignored)
  3. Any content spot (or a different correct answer) -> different.
     No spots and equal underlines -> same, unless the text leans on a table
     or figure the pair file does not carry (then unclear).
     Only ocr spots, at most typo.MAX_SPOTS, none inside an underline -> same.
     Everything else -> unclear.
"""

import difflib
import json
import random
import re
import unicodedata
from collections import Counter
from pathlib import Path

from kimport import pairs_page
from kimport.normalize import BLANK, normalize_text, strip_markup
from kimport.typo import MAX_SPOT_CHARS, MAX_SPOTS, MEANING_WORDS

VERSION = "ap-1"
GROUPS = ("same", "different", "unclear")
COMMON_WORD_MIN = 3  # a word seen in at least this many distinct texts is a real word, not a scan typo

# ---------------------------------------------------------------- formatting-only rewrites

_UNDERLINE_LABEL = re.compile(r"\[\s*underlined(?:\s+(?:portion|text|part))?\s*:\s*(.*?)\s*\]", re.I | re.S)
_STYLE_TAG = re.compile(r"</?(?:i|b|em|strong)(?:\s[^>]*)?>", re.I)
_SUP = re.compile(r"<sup>(.*?)</sup>", re.I | re.S)
_SUB = re.compile(r"<sub>(.*?)</sub>", re.I | re.S)
_TEX_FN = re.compile(r"\\(sin|cos|tan|log|ln|exp)(?![A-Za-z])")
_TEX_WRAP = re.compile(r"\\(?:textbf|textit|emph|mathrm|mathbf|text|textrm)\s*\{([^{}]*)\}")
_BRACKET_TAG = re.compile(r"\[\[(/?)([uib])\]\]", re.I)
_BLANK_LABEL = re.compile(r"(_{4,})\s*\[?blank\]?(?![\w])", re.I)
_MD_EMPH = re.compile(r"(?<![\w*])\*{1,2}(?=[^\s*\d])([^*\n]*?[^\s*\d])\*{1,2}(?![\w*])")
_BULLET = re.compile(r"(?m)^\s*[•▪●◦*-]\s+")
_HEADER_LINE = re.compile(r"^\s*(?:(?:question\s*)?\d{1,3}\s*[.)]?|section\s+\d+\b.*|module\s+\d+\b.*|answer\s*:|↵)\s*$", re.I)
_DASH_RUN = re.compile(r"\s*(?:---|--|—|–|―)\s*")
_TEX_THOUSANDS = re.compile(r"(?<=\d)\{,\}(?=\d{3})")
_SPACED_APOS = re.compile(r"(?<=[^\W\d_])\s*['’]\s*(?=(?:s|t|re|ve|ll|d)\b)")
_SPACED_HYPHEN = re.compile(r"(?<=[^\W\d_])(?:\s+-\s*|-\s+)(?=[^\W\d_])")
_SPACE_BEFORE = re.compile(r"\s+([,.;:?!)\]’”])")
_SPACE_AFTER = re.compile(r"([(\[‘“])\s+")
_THOUSANDS = re.compile(r"(?<=\d)[,\u00a0\u202f\u2009 ](?=\d{3}(?!\d))")


def _strip_headers(text: str) -> str:
    lines = text.split("\n")
    while lines and (not lines[0].strip() or _HEADER_LINE.match(lines[0])):
        lines.pop(0)
    while lines and (not lines[-1].strip() or _HEADER_LINE.match(lines[-1])):
        lines.pop()
    return "\n".join(lines)


def _fold_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if not unicodedata.combining(c))


def prepare_text(text: str) -> str:
    """Formatting-only rewrites. Underlines (<u>) and blanks are kept for strip_markup.
    Markdown *italics*, [[u]]-style tags and a "blank" label after a blank are capture spellings too."""
    s = _strip_headers(str(text))
    s = _BRACKET_TAG.sub(r"<\1\2>", s)
    s = _BLANK_LABEL.sub(r"\1", s)
    s = _MD_EMPH.sub(r"\1", s.replace("↵", "\n"))
    s = _BULLET.sub("", s)
    s = _UNDERLINE_LABEL.sub(lambda m: f"<u>{m.group(1)}</u>", s)
    s = _SUP.sub(lambda m: f"^({m.group(1)})", s)
    s = _SUB.sub(lambda m: f"_({m.group(1)})", s)
    s = _STYLE_TAG.sub("", s)
    for _ in range(3):
        s = _TEX_WRAP.sub(r"\1", s)
    s = _TEX_FN.sub(r"\1 ", s)
    s = _fold_accents(s)
    s = _DASH_RUN.sub(" — ", s)  # one spelling; normalize_text turns it into "-"
    s = _SPACED_HYPHEN.sub("-", s)
    s = _SPACED_APOS.sub("'", _TEX_THOUSANDS.sub("", s))
    s = _SPACE_BEFORE.sub(r"\1", s)
    s = _SPACE_AFTER.sub(r"\1", s)
    return _THOUSANDS.sub("", s)


# ---------------------------------------------------------------- tokens

_TOKEN = re.compile(rf"{BLANK}|\d+(?:\.\d+)?|[^\W\d_]+(?:'[^\W\d_]+)*|\S")
_OPS = frozenset("+-*/^=<>≤≥≠√")
_FUNCTION_WORDS = frozenset("""a an the this that these those which what who whom whose is are was were be it its
    their they of in on at to for by with from as and or but best most""".split())


def tokens(s: str) -> list[str]:
    """Normalized tokens: blanks, numbers, words, then single symbols."""
    s = normalize_text(s)
    s = _DASH_RUN.sub(" - ", s)
    s = _SPACE_BEFORE.sub(r"\1", s)
    return _TOKEN.findall(s)


def side_view(text: str) -> tuple[list[str], list[bool], list[tuple[str, ...]]]:
    """(tokens, in-underline flag per token, underlined spans as token tuples)."""
    plain, spans = strip_markup(prepare_text(text))
    under = [(a, b) for a, b, kind in spans if kind == "u"]
    cuts = sorted({0, len(plain)} | {p for span in under for p in span})
    toks, flags = [], []
    for lo, hi in zip(cuts, cuts[1:]):
        inside = any(a <= lo and hi <= b for a, b in under)
        piece = tokens(plain[lo:hi])
        toks.extend(piece)
        flags.extend([inside] * len(piece))
    return toks, flags, [tuple(tokens(plain[a:b])) for a, b in sorted(under)]


def _is_word(t: str) -> bool:
    return t[:1].isalpha()


def _is_number(t: str) -> bool:
    return t[:1].isdigit()


def _edit(x: str, y: str) -> int:
    prev = list(range(len(y) + 1))
    for i, cx in enumerate(x, 1):
        cur = [i]
        for j, cy in enumerate(y, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (cx != cy)))
        prev = cur
    return prev[-1]


# ---------------------------------------------------------------- spots


_FOLD_DIGITS = str.maketrans({"o": "0", "l": "1", "i": "1", "|": "1"})
_GARBLE = frozenset("¡¿�")  # characters a bad text layer puts in place of accented letters
_LOOKALIKE_LETTERS = frozenset(frozenset(p) for p in ("ce", "il", "it", "lt", "uv", "vy", "ao", "ec", "nh"))


def _char_ratio(x: str, y: str) -> float:
    return difflib.SequenceMatcher(None, x, y, autojunk=False).ratio()


def _real(w: str, vocab) -> bool:
    """A word seen in COMMON_WORD_MIN+ texts of this file, or in the word list (Words.words)."""
    return vocab[w] >= COMMON_WORD_MIN or w in getattr(vocab, "words", ())


class Words(Counter):
    """Word counts from the pair file plus an optional word list (e.g. /usr/share/dict/words)."""
    words: frozenset = frozenset()


def spot_kind(a: list[str], b: list[str], vocab: Counter) -> str:
    """Kind of one differing spot (a and b are the differing token runs)."""
    if BLANK in a or BLANK in b:
        return "insert" if not a or not b else "blank"
    if any(t in ("©", "[", "]") for t in a + b):
        return "insert"  # a credit line or a bracketed note from the capture, not question content
    if not a or not b:
        side = a or b
        return "punct" if all(not (_is_word(t) or _is_number(t)) for t in side) else "insert"
    ja, jb = "".join(a), "".join(b)
    if ja.translate(_FOLD_DIGITS) == jb.translate(_FOLD_DIGITS):
        return "ocr"  # "1O" vs "10", "l" vs "1": a scanner swapping look-alike characters
    na, nb = [t for t in a if _is_number(t)], [t for t in b if _is_number(t)]
    wa, wb = [t for t in a if _is_word(t)], [t for t in b if _is_word(t)]
    if na != nb:
        if re.sub(r"[.,]", "", ja) == re.sub(r"[.,]", "", jb):
            return "near"  # 12.000 vs 12000: a separator read differently
        if not (na and nb) and not (wa or wb):
            return "near"  # a digit against a punctuation mark ("3" vs ","): a smudge, can't tell
        return "content"
    oa, ob = [t for t in a if t in _OPS], [t for t in b if t in _OPS]
    pa = [t for t in a if not (_is_word(t) or _is_number(t) or t in _OPS or t in _GARBLE)]
    pb = [t for t in b if not (_is_word(t) or _is_number(t) or t in _OPS or t in _GARBLE)]
    if wa == wb:
        return "op" if oa != ob else "punct"
    kind = _word_kind(wa, wb, vocab)
    if kind == "content":
        return kind
    if oa != ob:
        return "op"  # x^n vs xn, a lost minus or fraction bar
    return "punct" if pa != pb else kind


def _word_kind(wa: list[str], wb: list[str], vocab) -> str:
    """Kind of a spot whose words differ (numbers and symbols already checked by the caller)."""
    if "".join(wa) == "".join(wb):  # "notable" vs "not able": a split or joined word
        return "ocr"
    if not wa or not wb:
        return "insert"  # words on one side against only punctuation on the other
    x, y = " ".join(wa), " ".join(wb)
    d = _edit(x, y)
    longest = max(len(x), len(y))
    only_a, only_b = set(wa) - set(wb), set(wb) - set(wa)
    if (only_a | only_b) & MEANING_WORDS:
        if d <= 1 and not all(_real(w, vocab) for w in only_a | only_b):
            return "near"  # "alf" vs "all": a meaning word, but the other side is not a real word
        return "content"
    if (set(wa) | set(wb)) <= _FUNCTION_WORDS:
        return "real"  # "what" vs "which": wording of the prompt, not a fact
    if len(only_a) == len(only_b) == 1:
        u, v = next(iter(only_a)), next(iter(only_b))
        if len(u) == len(v) == 1 and frozenset(u + v) in _LOOKALIKE_LETTERS:
            return "near"  # "c" vs "e": a look-alike letter, can't tell a variable from a smudge
        if min(len(u), len(v)) == 1 < max(len(u), len(v)) and max(u, v, key=len).startswith(min(u, v, key=len)):
            return "insert"  # "v" vs "valley": a cut-off capture
    if any(len(t) == 1 for t in only_a | only_b):  # a variable or one-letter word changed
        return "content"
    if d <= 1 and longest <= 3:
        return "near"  # "Jr" vs "Tr": too short to tell a typo from a different word
    if max(len(wa), len(wb)) > 3 * max(1, min(len(wa), len(wb))) and max(len(wa), len(wb)) > 4:
        return "insert"  # a short run against a long one: a missing sentence, not a swapped word
    if d <= MAX_SPOT_CHARS and d * 3 <= longest:
        if only_a and only_b and all(_real(w, vocab) for w in only_a | only_b):
            return "real"  # "small" vs "smell", "sociality" vs "sociability": two real words
        return "ocr"
    if d <= 2 * MAX_SPOT_CHARS and _char_ratio(x, y) >= 0.6:
        return "near"
    return "content"


def diff_spots(ta, fa, tb, fb, where: str, vocab: Counter) -> list[dict]:
    """One dict per differing spot. A run of 4+ tokens dropped in one place and added in another is
    "moved" (the prompt printed before instead of after the passage): layout, not content."""
    out = []
    ops = difflib.SequenceMatcher(None, ta, tb, autojunk=False).get_opcodes()
    for tag, i1, i2, j1, j2 in ops:
        if tag == "equal":
            continue
        a, b = ta[i1:i2], tb[j1:j2]
        out.append({"where": where, "kind": spot_kind(a, b, vocab), "left": _show(a), "right": _show(b),
                    "underlined": any(fa[i1:i2]) or any(fb[j1:j2]), "_a": tuple(a), "_b": tuple(b)})
    gone = {s["_a"]: s for s in out if s["_a"] and not s["_b"] and len(s["_a"]) >= 4}
    for s in out:
        if s["_b"] and not s["_a"] and s["_b"] in gone and gone[s["_b"]]["kind"] == "insert":
            s["kind"] = gone.pop(s["_b"])["kind"] = "moved"
    for s in out:
        del s["_a"], s["_b"]
    return out


def _show(ts: list[str]) -> str:
    s = " ".join(ts)
    return s if len(s) <= 90 else s[:60] + " … " + s[-25:]


def _pair_choices(ca: list[list[str]], cb: list[list[str]]) -> list[tuple[int | None, int | None]]:
    """Pair choices by closeness (order ignored); leftovers pair with None."""
    scored = sorted(((-difflib.SequenceMatcher(None, x, y, autojunk=False).ratio(), i, j)
                     for i, x in enumerate(ca) for j, y in enumerate(cb)))
    used_a, used_b, pairs = set(), set(), []
    for _, i, j in scored:
        if i not in used_a and j not in used_b:
            used_a.add(i)
            used_b.add(j)
            pairs.append((i, j))
    pairs += [(i, None) for i in range(len(ca)) if i not in used_a]
    pairs += [(None, j) for j in range(len(cb)) if j not in used_b]
    return sorted(pairs, key=lambda p: (p[0] is None, p[0] if p[0] is not None else p[1]))


_LETTERS = "ABCDEFGH"
_VISUAL = re.compile(
    r"\b(?:the|this|each) (?:table|graph|chart|figure|diagram|scatterplot|map)\b(?! of\b)"
    r"|\b(?:equations?|system|graph|figure|table|triangle|diagram|circle|shape)s? shown\b"
    r"|\bshown (?:above|below|in the)\b|\[(?:graph|table|figure|image|diagram)", re.I)


def leans_on_visual(text: str) -> bool:
    """The text points at a table or figure that the pair file does not carry."""
    plain = strip_markup(text)[0]
    plain = re.sub(r"periodic table|placed on (?:a|the) table|(?:at|on|around) the table", "", plain, flags=re.I)
    return bool(_VISUAL.search(plain))


def _answer_index(side: dict, toks: list[list[str]]) -> int | None:
    ans = tokens(strip_markup(prepare_text(side["answer"]))[0])
    hits = [i for i, t in enumerate(toks) if t == ans]
    return hits[0] if len(hits) == 1 else None


# ---------------------------------------------------------------- one pair


def classify(canonical: dict, member: dict, vocab: Counter | None = None) -> dict:
    """{"group", "reason", "spots"} for one pair (each side: text, choices, answer, answer_format)."""
    vocab = vocab if vocab is not None else Words()
    a, b = canonical, member
    spots: list[dict] = []
    ta, fa, ua = side_view(a["text"])
    tb, fb, ub = side_view(b["text"])
    spots += diff_spots(ta, fa, tb, fb, "question", vocab)

    if a.get("answer_format") != b.get("answer_format"):
        return {"group": "unclear", "reason": "one is multiple choice, the other a typed answer", "spots": spots}
    answer_differs = False
    if a.get("answer_format") == "numeric":
        xa = tokens(strip_markup(prepare_text(a["answer"]))[0])
        xb = tokens(strip_markup(prepare_text(b["answer"]))[0])
        if xa != xb:
            spots += diff_spots(xa, [False] * len(xa), xb, [False] * len(xb), "answer", vocab)
    else:
        ca = [side_view(c)[0] for c in a["choices"]]
        cb = [side_view(c)[0] for c in b["choices"]]
        paired = _pair_choices(ca, cb)
        for i, j in paired:
            x, y = (ca[i] if i is not None else []), (cb[j] if j is not None else [])
            if x != y:
                label = f"choice {_LETTERS[i] if i is not None else '-'}/{_LETTERS[j] if j is not None else '-'}"
                spots += diff_spots(x, [False] * len(x), y, [False] * len(y), label, vocab)
                if not x or not y:
                    spots[-1]["kind"] = "insert"  # a whole choice on one side only
        ia, ib = _answer_index(a, ca), _answer_index(b, cb)
        if ia is not None and ib is not None and len(ca) == len(cb) and (ia, ib) not in paired:
            answer_differs = True

    under_kind = None
    if ua != ub:
        if not ua or not ub:
            under_kind = "insert"
        else:  # both underline something: where the underlines differ decides
            xa = [t for x in ua for t in (*x, "|")]
            xb = [t for y in ub for t in (*y, "|")]
            got = {s["kind"] for s in diff_spots(xa, [False] * len(xa), xb, [False] * len(xb), "u", vocab)}
            under_kind = "content" if "content" in got else "insert" if "insert" in got else "near"
        spots.append({"where": "underlined part", "kind": under_kind, "left": " | ".join(_show(list(x)) for x in ua) or "(none)",
                      "right": " | ".join(_show(list(y)) for y in ub) or "(none)", "underlined": True})

    spots_all, spots = spots, [s for s in spots if s["kind"] != "moved"]
    kinds = Counter(s["kind"] for s in spots)
    if answer_differs:
        return {"group": "different", "reason": "a different choice is the correct answer", "spots": spots_all}
    if kinds["content"]:
        hits = [s for s in spots if s["kind"] == "content"]
        if any(re.search(r"\d", s["left"] + s["right"]) for s in hits):
            why = "a number differs"
        elif any(re.fullmatch(r"[^\W\d_]", s["left"]) and re.fullmatch(r"[^\W\d_]", s["right"]) for s in hits):
            why = "a variable or one-letter word differs"
        else:
            why = "a name or word differs"
        return {"group": "different", "reason": why, "spots": spots_all}
    if not spots:
        if leans_on_visual(a["text"]) or leans_on_visual(b["text"]):
            return {"group": "unclear", "reason": "same text, but it relies on a table or figure not in the pair file",
                    "spots": spots_all}
        return {"group": "same", "reason": "identical after formatting" + (" (a sentence printed in another place)" if spots_all else ""), "spots": spots_all}
    if set(kinds) == {"ocr"}:
        if any(s["underlined"] for s in spots):
            return {"group": "unclear", "reason": "a scanning typo inside the underlined part", "spots": spots_all}
        if kinds["ocr"] > MAX_SPOTS:
            return {"group": "unclear", "reason": f"{kinds['ocr']} small typo spots (the typo rule allows {MAX_SPOTS})",
                    "spots": spots_all}
        if leans_on_visual(a["text"]) or leans_on_visual(b["text"]):
            return {"group": "unclear", "reason": "only typos, but it relies on a table or figure not in the pair file",
                    "spots": spots_all}
        return {"group": "same", "reason": "only scanning typos", "spots": spots_all}
    why = {"insert": "words, a sentence or a choice on one side only", "blank": "a blank on one side, words on the other",
           "punct": "punctuation or brackets differ", "op": "an operator or sign differs",
           "real": "a small change between two real words", "near": "a longer look-alike change",
           "ocr": "scanning typos"}
    worst = next(k for k in ("insert", "blank", "real", "op", "punct", "near", "ocr") if kinds[k])
    return {"group": "unclear", "reason": why[worst], "spots": spots_all}


# ---------------------------------------------------------------- the whole file


WORD_LIST = Path("/usr/share/dict/words")


def build_vocab(pairs: list[dict], word_list: Path | None = WORD_LIST) -> Words:
    """Words counted once per distinct occurrence text (pairs repeat a canonical), plus the word list."""
    seen, vocab = set(), Words()
    if word_list and Path(word_list).exists():
        vocab.words = frozenset(w.strip().casefold() for w in Path(word_list).read_text(encoding="utf-8").split())
    for p in pairs:
        for s in (p["canonical"], p["member"]):
            if s["id"] in seen:
                continue
            seen.add(s["id"])
            words = set()
            for t in [s["text"], *s["choices"]]:
                words.update(w for w in side_view(t)[0] if _is_word(w))
            vocab.update(words)
    return vocab


def _resolve_conflicts(rows: dict[str, list[dict]]) -> int:
    """A 'different' whose two sides are joined by 'same' proposals cannot both be right: all move to unclear."""
    parent: dict[str, str] = {}

    def find(x):
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for r in rows["same"]:
        parent[find(r["canonical_id"])] = find(r["member_id"])
    bad_roots = {find(r["canonical_id"]) for r in rows["different"] if find(r["canonical_id"]) == find(r["member_id"])}
    if not bad_roots:
        return 0
    moved = 0
    for g in ("same", "different"):
        keep = []
        for r in rows[g]:
            if find(r["canonical_id"]) in bad_roots:
                r["reason"] = f"conflicts with other proposals (was {g}): {r['reason']}"
                rows["unclear"].append(r)
                moved += 1
            else:
                keep.append(r)
        rows[g] = keep
    return moved


def classify_file(pairs_json: Path, decision_log: Path | None = None) -> dict:
    doc = json.loads(Path(pairs_json).read_text(encoding="utf-8"))
    pairs = doc["pairs"]
    log = pairs_page.load_decisions(decision_log) if decision_log else {}
    vocab = build_vocab(pairs)
    rows = {g: [] for g in GROUPS}
    skipped = 0
    for p in pairs:
        key = pairs_page.pair_key(p["canonical"]["id"], p["member"]["id"])
        if key in log:
            skipped += 1
            continue
        res = classify(p["canonical"], p["member"], vocab)
        rows[res["group"]].append({
            "pair_id": p["pair_id"], "key": key, "canonical_id": p["canonical"]["id"], "member_id": p["member"]["id"],
            "canonical_is_live": bool(p["canonical"].get("is_live")), "ratio": p["ratio"], "reason": res["reason"],
            "diff": [{k: s[k] for k in ("where", "kind", "left", "right")} for s in res["spots"]]})
    conflicts = _resolve_conflicts(rows)
    for g in GROUPS:
        rows[g].sort(key=lambda r: r["pair_id"])
    return {"rows": rows, "skipped_already_decided": skipped, "conflicts_moved": conflicts,
            "normalizer_version": doc.get("normalizer_version"), "pair_count": len(pairs)}


def released(clusters_json: Path, pairs_json: Path, decision_log: Path | None, proposed: dict[str, str]) -> dict:
    """Dry run of pairs_page.apply_to_doc in memory (nothing written): which held ids leave founder_review."""
    doc = json.loads(Path(clusters_json).read_text(encoding="utf-8"))
    pairs = json.loads(Path(pairs_json).read_text(encoding="utf-8"))["pairs"]
    by_id = {p["pair_id"]: p for p in pairs}
    log = pairs_page.load_decisions(decision_log) if decision_log else {}
    base = pairs_page.live_saved_answers(doc, pairs, {k: v["decision"] for k, v in log.items()})
    decided = dict(base)
    decided.update({pairs_page.pair_key(by_id[pid]["canonical"]["id"], by_id[pid]["member"]["id"]): v
                    for pid, v in proposed.items()})
    pairs_page.apply_to_doc(doc, [dict(p) for p in pairs], base)  # answers already given are not counted
    before = {i for i, r in doc["roles"].items() if r == "founder_review"}
    pairs_page.apply_to_doc(doc, [dict(p) for p in pairs], decided)
    after = {i for i, r in doc["roles"].items() if r == "founder_review"}
    members = {p["member"]["id"] for p in pairs}
    out = before - after
    return {"ids": len(out), "member_ids": len(out & members), "still_held": len(after)}


def raw_snippets(x: str, y: str, limit: int = 3, context: int = 10) -> list[tuple[str, str]]:
    """The first few raw (unnormalized) differences with a little context, newlines shown as ⏎."""
    out = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, x, y, autojunk=False).get_opcodes():
        if tag == "equal":
            continue
        a = x[max(0, i1 - context):i2 + context].replace("\n", "⏎")
        b = y[max(0, j1 - context):j2 + context].replace("\n", "⏎")
        out.append((a, b))
        if len(out) == limit:
            break
    return out


def _sample_md(result: dict, rel: dict, n: int, seed: int, sides: dict | None = None) -> str:
    rows = result["rows"]
    lines = ["# Look-alike pairs: automatic first pass (for your OK)", "",
             "Nothing has been applied. If these look right, the same and different answers in "
             "`decisions-proposed.json` can be applied with `k pairs apply`; unclear pairs stay for you.", "",
             "| Group | Pairs | Held questions in these pairs (distinct member ids) |", "|---|---:|---:|"]
    for g in GROUPS:
        lines.append(f"| {g} | {len(rows[g])} | {len({r['member_id'] for r in rows[g]})} |")
    lines += ["", f"Pairs already in your decision log, skipped: {result['skipped_already_decided']}. "
              f"Pairs moved to unclear because same and different proposals contradicted each other: "
              f"{result['conflicts_moved']}.", ""]
    if rel:
        lines += [f"If both same and different were applied, {rel['both']['member_ids']} held questions would leave "
                  f"review ({rel['both']['ids']} ids counting canonicals); {rel['both']['still_held']} stay held "
                  "because they also sit in an unclear pair. Same alone: "
                  f"{rel['same']['member_ids']}; different alone: {rel['different']['member_ids']}. "
                  "Same means the held copy becomes a duplicate (not published); different means it becomes "
                  "its own question and can go to review.", ""]
    reasons = {g: Counter(r["reason"].split(": ")[0] if r["reason"].startswith("conflicts") else r["reason"]
                          for r in rows[g]) for g in GROUPS}
    rng = random.Random(seed)
    for g in GROUPS:
        lines += [f"## {g.capitalize()} ({len(rows[g])})", ""]
        lines += [f"- {c} × {why}" for why, c in reasons[g].most_common()] + [""]
        for r in rng.sample(rows[g], min(n, len(rows[g]))):
            lines.append(f"**{r['pair_id']}** (closeness {r['ratio']}): {r['reason']}")
            if not r["diff"]:
                a, b = (sides or {}).get(r["pair_id"], ("", ""))
                raw = raw_snippets(a, b)
                lines.append("- nothing left after formatting; the raw texts differ only like this:" if raw
                             else "- the texts are character for character the same")
                lines += [f"  - “{x}” vs “{y}”" for x, y in raw]
            for d in r["diff"][:4]:
                lines.append(f"- {d['where']} [{d['kind']}]: “{d['left'] or '(nothing)'}” vs “{d['right'] or '(nothing)'}”")
            if len(r["diff"]) > 4:
                lines.append(f"- … and {len(r['diff']) - 4} more spots")
            lines.append("")
    return "\n".join(lines)


def write_outputs(pairs_json: Path, out_dir: Path, clusters_json: Path | None = None,
                  decision_log: Path | None = None, n_sample: int = 8, seed: int = 8) -> dict:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    result = classify_file(pairs_json, decision_log)
    rows = result["rows"]
    for g in GROUPS:
        (out_dir / f"{g}.json").write_text(json.dumps(rows[g], ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    proposed = {r["pair_id"]: g for g in ("same", "different") for r in rows[g]}
    (out_dir / "decisions-proposed.json").write_text(json.dumps(dict(sorted(proposed.items())), indent=1) + "\n",
                                                     encoding="utf-8")
    rel = {}
    if clusters_json:
        for name, pick in (("same", "same"), ("different", "different"), ("both", None)):
            sub = {k: v for k, v in proposed.items() if pick is None or v == pick}
            rel[name] = released(clusters_json, pairs_json, decision_log, sub)
    pairs = json.loads(Path(pairs_json).read_text(encoding="utf-8"))["pairs"]
    sides = {p["pair_id"]: tuple(s["text"] + "\nChoices: " + " | ".join(sorted(s["choices"]))
                                 for s in (p["canonical"], p["member"])) for p in pairs}
    (out_dir / "sample.md").write_text(_sample_md(result, rel, n_sample, seed, sides) + "\n", encoding="utf-8")
    return {"counts": {g: len(rows[g]) for g in GROUPS}, "released": rel,
            "skipped": result["skipped_already_decided"], "conflicts": result["conflicts_moved"]}
