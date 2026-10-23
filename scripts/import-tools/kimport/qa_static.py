"""Static checks of every live question (`qa-audit.py static`). Read-only.

Input is the full QA export (kimport.qa_export). The text checks here are plain
Python; the checks that need the app's own code (markup tokens the parsers
refuse, KaTeX on every math span, the figure validators, the catalog lane) run
in ts/qa-check.ts, which this module calls once and merges.

Each check has a level: "fail" means a student would meet something broken,
misformatted or unanswerable; "review" means likely wrong and worth a look;
"info" is a count only (for example a live row the catalog lane does not
serve). static-report.json has every finding with its detail; summary.md has
the counts and the ids.
"""

import json
import re
import subprocess
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from kimport.jsonio import write_text_atomic

REPO = Path(__file__).resolve().parents[3]
LETTERS = ["A", "B", "C", "D"]
TEXT_FIELDS = ("passage_intro", "passage", "passage_a", "passage_b", "question_text")
PASSAGES = ("passage", "passage_a", "passage_b")

LEVELS = {
    # structure
    "stem_empty": "fail", "mc_choice_count": "fail", "mc_letters": "fail", "choice_empty": "fail",
    "choices_identical": "fail", "mc_key_not_letter": "fail", "numeric_key_unparseable": "fail",
    "numeric_has_choices": "review", "no_answer_key_entry": "review",
    # formatting
    "markdown_as_text": "fail", "markdown_table": "fail", "triple_newline": "review",
    "figure_description_as_text": "fail", "header_footer_line": "fail", "leading_question_number": "fail",
    "blank_then_word_blank": "fail", "word_blank_drawn_as_line": "fail", "multiple_blanks": "review",
    "ascii_dash": "fail", "replacement_char": "fail", "mojibake": "fail", "control_char": "fail",
    "markup_unmatched": "fail", "markup_as_text": "fail", "latex_as_text": "fail",
    "math_delimiter_unbalanced": "fail", "braces_unbalanced": "fail", "katex_error": "fail", "prose_in_math": "fail",
    # completeness
    "passage_truncated": "review", "stem_truncated": "review", "stem_no_prompt": "review",
    "figure_referenced_missing": "fail",
    # figures
    "figure_invalid": "fail", "choice_table_invalid": "fail", "figure_not_drawn": "fail",
    "image_unreachable": "fail",
    # delivery
    "delivery_breaks_skill": "fail", "checker_crashed": "fail",
}

_MOJIBAKE = re.compile(r"â€|Ã[\u0080-¿\s]|Ã(?=[a-zñóòéèíáú])|(?<=[a-z])Ã|Â[ -¿]|ï»¿|Å[\u0080-¿]")
_CONTROL = re.compile(r"[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]")
_FIG_DESC = re.compile(r"\[(?:Blank|Answer|Response|Graph|Table|Image|Figure|Chart|Diagram|Map|Photo|Illustration|Scatterplot|Bar graph|Line graph)\b[^\]]*\]", re.I)
_HEADER = re.compile(
    r"^\s*(?:Section\s+\d+(?:\s*,\s*Module\s+\d+)?\b.*|Module\s+\d+\b.*|Mark\s+for\s+Review\b.*|Question\s+\d+(?:\s+of\s+\d+)?\s*:?\s*"
    r"|Page\s+\d+(?:\s+of\s+\d+)?\s*|CONTINUE\s*|STOP\s*|Unauthorized\s+copying.*|Reading\s+and\s+Writing\s*|Math\s*"
    r"|SAT\s+Practice\s+Test.*|Directions\s*:?.*)$",
    re.I | re.M)
_PAGE_NUMBER = re.compile(r"^\s*\d{1,3}\s*$", re.M)
_LEADING_NUMBER = re.compile(r"^\s*(?:\d{1,2}[.)]\s+\S|Q\s*\d{1,2}\b)")
_BLANK_SPACED_WORD = re.compile(r"_{2,}\s+blank\b", re.I)
# MathText's blank rules: stems, choices and passages on the catalog screen use treatBlankWord.
_BLANK_MARK = re.compile(r"(?<!\w)[_-]*blank[_-]*(?!\w)|_{2,}", re.I)
_LONE_BLANK_WORD = re.compile(r"(?<![\w_-])blank(?![\w_-])", re.I)
_FIGS = r"(?:table|graph|figure|chart|diagram|scatterplot|histogram|dot plot|box plot|bar graph|line graph)"
_FIG_REF = re.compile(
    rf"\b{_FIGS}\s+(?:shown|above|below)\b"
    rf"|\bshown\s+(?:above|below|in the {_FIGS})\b"
    rf"|\b(?:in|from|by)\s+(?:the|this)\s+{_FIGS}\b(?!\s+(?:of|for)\b)"
    r"|\bon\s+the\s+(?:graph|chart|scatterplot)\b(?!\s+of\b)"
    r"|\bof\s+(?:the|this)\s+(?:table|figure|chart|diagram|scatterplot|histogram)\b(?!\s+(?:of|for)\b)"
    rf"|\bthe\s+{_FIGS}\s+(?:shows|gives|lists|summarizes|displays|presents|represents|models)\b"
    rf"|\bthis\s+figure\b",
    re.I)
_ON_THE_TABLE = re.compile(r"\bon\s+the\s+table\b", re.I)
_TOKENS = re.compile(r"\[\[/?[a-z]\]\]|</?[a-z]>")
_PROMPT_WORDS = re.compile(
    r"\b(?:which|what|how|why|who|where|when|complete|completes|select|choose|find|solve|enter|determine|identify)\b", re.I)


def _norm(s: str) -> str:
    """Choice text as a student reads it: markup tokens and spacing do not count; punctuation
    and case do (punctuation questions differ only there)."""
    s = unicodedata.normalize("NFKC", _TOKENS.sub("", s or ""))
    return re.sub(r"\s+", " ", s).strip()


def _strip_end(s: str) -> str:
    """Text with trailing markup tokens, closing quotes/brackets and spaces removed."""
    prev = None
    s = s or ""
    while prev != s:
        prev = s
        s = _TOKENS.sub(lambda m: "" if m.end() == len(s) else m.group(0), s).rstrip()
        s = s.rstrip("\"'”’»*")
    return s


def _excerpt(s: str, i: int, j: int, pad: int = 30) -> str:
    return re.sub(r"\s+", " ", (s[max(0, i - pad):j + pad]))[:120]


def _add(f: dict, check: str, detail: str) -> None:
    f.setdefault(check, []).append(detail)


def _has_answer_entry(row: dict) -> bool:
    return bool(row.get("answer_key_entries"))


def structure(row: dict, f: dict) -> None:
    stem = (row.get("question_text") or "").strip()
    if not _TOKENS.sub("", stem).strip():
        _add(f, "stem_empty", "question_text is empty")
    choices = row.get("answer_choices") or []
    fmt = row.get("answer_format")
    key = str(row.get("correct_answer") or "").strip()
    if not _has_answer_entry(row):
        _add(f, "no_answer_key_entry", "no answer_key_entries row")
    if fmt == "numeric_entry":
        if choices:
            _add(f, "numeric_has_choices", f"{len(choices)} answer_choices rows are never shown")
        return
    if len(choices) != 4:
        _add(f, "mc_choice_count", f"{len(choices)} choices")
    letters = [c.get("letter") for c in choices]
    if sorted(letters) != LETTERS[:len(letters)] or len(set(letters)) != len(letters) or not set(letters) <= set(LETTERS):
        _add(f, "mc_letters", f"letters {letters}")
    seen = {}
    for c in choices:
        text = (c.get("choice_text") or "").strip()
        table = c.get("choice_table_data")
        if not _TOKENS.sub("", text).strip() and table is None:
            _add(f, "choice_empty", f"choice {c.get('letter')} has no text and no table")
            continue
        sig = ("t", json.dumps(table, sort_keys=True)) if table is not None and not text else ("s", _norm(text), json.dumps(table, sort_keys=True))
        if sig in seen:
            _add(f, "choices_identical", f"choices {seen[sig]} and {c.get('letter')} are the same")
        else:
            seen[sig] = c.get("letter")
    if key not in LETTERS:
        _add(f, "mc_key_not_letter", f"correct_answer {key[:30]!r}")
    elif key not in letters:
        _add(f, "mc_key_not_letter", f"correct_answer {key} has no choice")


def _fields(row: dict):
    for name in TEXT_FIELDS:
        v = row.get(name)
        if v:
            yield name, v
    for c in row.get("answer_choices") or []:
        if c.get("choice_text"):
            yield f"choice {c.get('letter')}", c["choice_text"]


def _is_math(row: dict) -> bool:
    return row.get("subject") == "math"


def formatting(row: dict, f: dict) -> None:
    reading = row.get("subject") != "math"
    for name, v in _fields(row):
        for pat, check in ((r"\*\*|(?<![\w\\$])\*(?=\S)[^*\n$]+(?<=\S)\*(?!\w)", "markdown_as_text"),
                           (r"!\[", "markdown_as_text"), (r"^\s*#{1,6}\s", "markdown_as_text")):
            for m in re.finditer(pat, v, re.M):
                _add(f, check, f"{name}: {_excerpt(v, m.start(), m.end())}")
        if re.search(r"\|\s*:?-{3,}", v) or len(re.findall(r"^\s*\|.*\|\s*$", v, re.M)) >= 2:
            _add(f, "markdown_table", f"{name}: a markdown table is shown as text")
        if "\n\n\n" in v:
            _add(f, "triple_newline", f"{name}: three or more line breaks in a row")
        for m in _FIG_DESC.finditer(v):
            _add(f, "figure_description_as_text", f"{name}: {_excerpt(v, m.start(), m.end(), 0)}")
        for m in _HEADER.finditer(v):
            _add(f, "header_footer_line", f"{name}: {m.group(0).strip()[:60]!r}")
        if reading and name != "passage_intro":
            for m in _PAGE_NUMBER.finditer(v):
                _add(f, "header_footer_line", f"{name}: page-number line {m.group(0).strip()!r}")
        if name in ("question_text", "passage", "passage_a") and _LEADING_NUMBER.match(v) and not (row.get("subject") == "math" and name == "question_text" and re.match(r"^\s*\d+[.)]\s*\d", v)):
            _add(f, "leading_question_number", f"{name}: starts {v.strip()[:20]!r}")
        for m in _BLANK_SPACED_WORD.finditer(v):
            _add(f, "blank_then_word_blank", f"{name}: {_excerpt(v, m.start(), m.end())}")
        for m in (_LONE_BLANK_WORD.finditer(v) if name in PASSAGES + ("question_text",) else ()):
            _add(f, "word_blank_drawn_as_line", f"{name}: the word 'blank' is drawn as a blank line: {_excerpt(v, m.start(), m.end())}")
        if not _is_math(row):
            for m in re.finditer(r"(?<!-)-{3}(?!-)|\s--\s|\w--\w", v):
                _add(f, "ascii_dash", f"{name}: {_excerpt(v, m.start(), m.end(), 20)}")
        if "�" in v:
            _add(f, "replacement_char", f"{name}: U+FFFD")
        for m in _MOJIBAKE.finditer(v):
            _add(f, "mojibake", f"{name}: {_excerpt(v, m.start(), m.end(), 12)}")
        if _CONTROL.search(v):
            _add(f, "control_char", f"{name}: control character {hex(ord(_CONTROL.search(v).group(0)))}")
        _braces(v, name, f)
    blanks = sum(len(_BLANK_MARK.findall(row.get(n) or "")) for n in PASSAGES + ("question_text",))
    if blanks > 1:
        _add(f, "multiple_blanks", f"{blanks} blank markers across passage and stem")


def _braces(v: str, name: str, f: dict) -> None:
    for m in re.finditer(r"\$\$([\s\S]+?)\$\$|(?<!\\)\$((?:\\\$|[^$\n])+?)\$|\\\(([\s\S]+?)\\\)", v):
        span = m.group(1) or m.group(2) or m.group(3) or ""
        depth = 0
        stripped = re.sub(r"\\[{}]", "", span)
        for ch in stripped:
            depth += ch == "{"
            depth -= ch == "}"
            if depth < 0:
                break
        if depth != 0:
            _add(f, "braces_unbalanced", f"{name}: {span[:60]}")


def completeness(row: dict, f: dict, figure_drawn: bool) -> None:
    for name in PASSAGES:
        v = row.get(name)
        if not v or not v.strip():
            continue
        end = _strip_end(v)
        if end and not re.search(r"[.!?…:;—–)\]\-]$|_{2,}$|\$$|\d{4}$|©.*$", end):
            _add(f, "passage_truncated", f"{name}: ends {end[-40:]!r}")
    stem = row.get("question_text") or ""
    end = _strip_end(stem)
    if re.search(r"\n\s*(?:I{1,3}|IV|V)\.\s[^\n]*$", end):
        end = ""  # the stem ends with a Roman-numeral statement list
    if end and not re.search(r"[.!?…:)\]]$|_{2,}$|\$$", end):
        _add(f, "stem_truncated", f"ends {end[-40:]!r}")
    if stem.strip() and "?" not in stem and not _PROMPT_WORDS.search(stem) and not _BLANK_MARK.search(stem):
        _add(f, "stem_no_prompt", f"no question mark or prompt: {stem.strip()[-60:]!r}")
    if not figure_drawn:
        for name, v in _fields(row):
            if name in TEXT_FIELDS and name != "question_text":
                continue
            m = _FIG_REF.search(_ON_THE_TABLE.sub("", v))
            if m:
                _add(f, "figure_referenced_missing", f"{name}: {_excerpt(v, m.start(), m.end())}")
                break


SITE = "https://karmanprep.com"


def _reach(url: str) -> str | None:
    """None when the image loads, else why not. A site-relative path is fetched from the live site."""
    url = urllib.parse.urljoin(SITE + "/", url)
    try:
        req = urllib.request.Request(url, headers={"Range": "bytes=0-1023", "User-Agent": "karman-qa-audit"})
        with urllib.request.urlopen(req, timeout=20) as r:
            kind = r.headers.get("Content-Type", "")
            body = r.read(1024)
            if r.status not in (200, 206):
                return f"HTTP {r.status}"
            if not (kind.startswith("image/") or body[:4] in (b"\x89PNG", b"GIF8") or body[:3] == b"\xff\xd8\xff" or b"<svg" in body[:400]):
                return f"not an image ({kind or 'no content type'})"
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code}"
    except Exception as e:  # noqa: BLE001 — any failure means a student sees no image
        return str(e)[:120]
    return None


def reach_urls(rows: list[dict], cache_path: Path) -> dict:
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    urls = sorted({r["image_url"] for r in rows if isinstance(r.get("image_url"), str) and r["image_url"]})
    todo = [u for u in urls if u not in cache or cache[u] is not None]
    with ThreadPoolExecutor(16) as pool:
        for u, res in zip(todo, pool.map(_reach, todo)):
            cache[u] = res
    write_text_atomic(cache_path, json.dumps(cache, indent=1))
    return cache


def run_ts(export: Path, out: Path) -> dict:
    done = subprocess.run(["npx", "tsx", "scripts/import-tools/ts/qa-check.ts", str(export), str(out)],
                          cwd=REPO, capture_output=True, text=True, timeout=3600)
    if done.returncode != 0:
        raise RuntimeError(f"qa-check.ts failed: {(done.stderr or done.stdout)[-800:]}")
    return json.loads(out.read_text())


def audit_rows(rows: list[dict], ts: dict, urls: dict | None) -> dict:
    per = {}
    for row in rows:
        rid = str(row["id"])
        t = ts.get(rid) or {"checks": {"checker_crashed": ["no qa-check.ts result"]}, "figure": None, "choice_tables": 0, "delivery": "unknown"}
        f = {k: list(v) for k, v in (t.get("checks") or {}).items()}
        structure(row, f)
        formatting(row, f)
        completeness(row, f, bool(t.get("figure")) or bool(t.get("choice_tables")))
        if urls is not None and isinstance(row.get("image_url"), str) and row["image_url"]:
            why = urls.get(row["image_url"])
            if why:
                _add(f, "image_unreachable", f"{row['image_url'][:100]}: {why}")
        per[rid] = {"subject": row.get("subject"), "format": row.get("answer_format"),
                    "figure": t.get("figure"), "delivery": t.get("delivery"), "checks": f}
    return per


def tally(per: dict) -> dict:
    checks: dict[str, dict] = {}
    for rid, item in per.items():
        for c in item["checks"]:
            e = checks.setdefault(c, {"level": LEVELS.get(c, "review"), "count": 0, "ids": []})
            e["count"] += 1
            e["ids"].append(rid)
    failing = sorted(rid for rid, item in per.items() if any(LEVELS.get(c, "review") == "fail" for c in item["checks"]))
    review = sorted(rid for rid, item in per.items() if item["checks"] and rid not in set(failing))
    delivery: dict[str, int] = {}
    for item in per.values():
        delivery[item["delivery"]] = delivery.get(item["delivery"], 0) + 1
    return {"checks": dict(sorted(checks.items())), "failing_ids": failing, "review_only_ids": review, "delivery": delivery}


def run_static(export: Path, out: Path, check_urls: bool = True) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    doc = json.loads(Path(export).read_text())
    rows = [r for r in doc["rows"] if r.get("is_live") is True]
    ts = run_ts(Path(export), out / "static-ts.json")
    urls = reach_urls(rows, out / "image-url-cache.json") if check_urls else None
    per = audit_rows(rows, ts, urls)
    t = tally(per)
    report = {"export": str(export), "exported_at": doc.get("exported_at"), "fingerprint": doc.get("fingerprint"),
              "totals": {"live_audited": len(rows), "failing": len(t["failing_ids"]), "review_only": len(t["review_only_ids"])},
              **t, "questions": {rid: item for rid, item in per.items() if item["checks"]}}
    write_text_atomic(out / "static-report.json", json.dumps(report, indent=1, ensure_ascii=False))
    return report


def _ids(ids: list[str], limit: int = 400) -> str:
    shown = ", ".join(f"`{i}`" for i in ids[:limit])
    return shown + (f" … and {len(ids) - limit} more (see the report)" if len(ids) > limit else "")


def write_summary(out: Path) -> str:
    out = Path(out)
    s = json.loads((out / "static-report.json").read_text()) if (out / "static-report.json").exists() else None
    r = json.loads((out / "render-report.json").read_text()) if (out / "render-report.json").exists() else None
    lines = ["# Live question QA audit", ""]
    fail_any: set[str] = set()
    if s:
        lines += [f"Export: {s['export']} (exported {s['exported_at']}).", "",
                  f"Live questions audited: **{s['totals']['live_audited']}**.", ""]
        fail_any |= set(s["failing_ids"])
    if r:
        fail_any |= {i for i, item in r["questions"].items() if item.get("failures")}
    lines += [f"Questions failing at least one check (static fail level or any render check): **{len(fail_any)}**.", ""]
    if s:
        lines += ["## Static checks", "", "| check | level | questions |", "|---|---|---|"]
        for c, e in s["checks"].items():
            lines.append(f"| {c} | {e['level']} | {e['count']} |")
        lines += ["", "Catalog lane for the live rows: " + ", ".join(f"{k} {v}" for k, v in sorted(s["delivery"].items())), ""]
    if r:
        lines += ["## Rendered checks", "",
                  f"Rendered {r['totals']['rendered']} of {r['totals']['expected']} at 1280x800 and 390x844 (dark, answer hidden); {r['totals'].get('render_failed', 0)} failed to render.", "",
                  "| check | questions |", "|---|---|"]
        for c, e in sorted(r["checks"].items()):
            lines.append(f"| {c} | {e['count']} |")
        lines.append("")
    if s:
        lines += ["## Ids per static check", ""]
        for c, e in s["checks"].items():
            lines += [f"**{c}** ({e['level']}, {e['count']}): {_ids(e['ids'])}", ""]
    if r:
        lines += ["## Ids per rendered check", ""]
        for c, e in sorted(r["checks"].items()):
            lines += [f"**{c}** ({e['count']}): {_ids(e['ids'])}", ""]
    text = "\n".join(lines) + "\n"
    write_text_atomic(out / "summary.md", text)
    return text
