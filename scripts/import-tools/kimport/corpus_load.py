"""Corpus loader: one QuestionRecord per selected occurrence in the readiness ledger.

The universe is the ledger's items (one selected source occurrence per stable
question id). Each item is joined by id to the current C index
(final-current-plus-partial-question-records-*.json, or a task-6 style
{"questions": [...]} index) to find its proofread text:

  <C_output_path>/corrected.txt     question text, choices as "A) ..." lines
  <C_output_path>/provenance.json   recorded C text hash + B student.json path
  <B package>/teacher.json          key_answer (or a confirmed generated answer)
  <B package>/version.json          final_version_sha256 = the B version C used

Version checks (kept from task-6 dedup.load_current, fail closed):
  "C content changed"   corrected.txt no longer has the recorded C hash
  "B pointer changed"   the B package on disk is not the version the index names
Items with no current C text, or whose C text is for an older B version than
the ledger's current head, are kept as unparsed records with a reason.

parse_text and classify are ported from dedup.py: the same choice parsing,
trailing-note rules and review reasons. Comparison normalization is not done
here: QuestionRecord keeps the text as proofread and kimport.keys / typo
normalize it (kimport.normalize), so parse_text only splits lines.
"""

import hashlib
import json
import re
from pathlib import Path

from kimport.keys import QuestionRecord
from kimport.evidence import needs_visual

CHOICE = re.compile(r'^\s*([A-H])\s*[).:]\s*(.+?)\s*$')
IMAGE = re.compile(r'(?i)(<svg|<img|!\[|\b(?:figure|graph|diagram|image|shown below|pictured|scatterplot)\b)')
VISUAL_REASON = "essential_visual_material_unreviewed"
GENERATED_BASIS = "two_independent_question_only_reviews_without_original_key"
_STUDENT_KEYS = ("b_final_student_text", "b_student_final_text", "B_student_final_text", "B_student_json", "student_json")
_C_HASH_KEYS = ("c_corrected_text_sha256", "C_corrected_text_sha256", "corrected_text_sha256")
_CF_VISUAL = ("complete", "hold")  # CF rendered (or is holding) an essential visual for this version
# Rule 1 (ruling R18): capture labels that are not part of the question.
# A leading question label ("Question 7", "15.", "3)", "12 SAT Math") at the very
# start, and trailing bracketed response-box notes ("[blank response field]",
# "[empty numeric response box.]"). A note mentioning underlining is never dropped.
LEAD_LABEL = re.compile(r'(?i)^(?:question\s*\d{1,3}\s*[:.]?|\d{1,3}\s*[.)]|\d{1,3}\s+sat\s+math)(?:\s+|$)')
RESPONSE_NOTE = re.compile(
    r'(?i)^\[(?![^\]]*underlin)(?=[^\]]*\b(?:response|answer)\b)(?=[^\]]*\b(?:box|field)\b)[^\]]*\]\.?$')


def _lines(text: str) -> list[str]:
    """Line layout only: each line stripped and inner whitespace collapsed, blank lines dropped."""
    return [" ".join(line.split()) for line in str(text).splitlines() if line.strip()]


# Rule 2: capture notes C sometimes appended after the choices. Only notes that say there is
# no figure, describe page chrome (footer codes, choice-letter colours, answer bars) or link the
# whole source page are dropped. A note that mentions underlining, italics or bold is never
# dropped, and neither is a note describing an actual figure or table (the question stays unread).
KEEP_NOTE = re.compile(r'(?i)underlin|italic|bold|highlight')
_NOTE_LABEL = r'(?:figures?|tables?|figures?/tables?|figure or table|visuals?|diagrams?|images?)'
CAPTURE_NOTES = (
    re.compile(r'(?i)^\[?\s*(?:printed\s+)?footer\s*:?\s*DI\d{6}\b[^\]]*\]?\.?$'),
    re.compile(r'(?i)^\[?\s*DI\d{6}\s*\]?\.?$'),
    re.compile(r'(?i)^\[?\s*(?:there\s+(?:is|are)\s+)?no\s+(?:substantive\s+)?' + _NOTE_LABEL + r'\b[^\]]*\]?\.?$'),
    re.compile(r'(?i)^\[?\s*' + _NOTE_LABEL + r'(?:\s+(?:description|information|note))?\s*:\s*'
               r'(?:none\b|no\s+(?:substantive\s+)?' + _NOTE_LABEL + r'\b|n/?a\b|blue choice)[^\]]*\]?\.?$'),
    re.compile(r'(?i)^\[?\s*visual information\s*:\s*(?:blue choice|a small multicolou?red|small multicolou?red|'
               r'colou?red)[^\]]*\]?\.?$'),
    re.compile(r'(?i)^\[?\s*(?:small\s+)?(?:multicolou?red|colou?red)\s+(?:segmented\s+|horizontal\s+)*'
               r'(?:bars|marks)\s+appear\s+beneath\s+each\s+choice[^\]]*\]?\.?$'),
    re.compile(r'^!\[Whole literal source PNG\]\([^)]*\)$'),
)


def _is_capture_note(line: str) -> bool:
    if KEEP_NOTE.search(line):
        return False
    return (bool(re.fullmatch(r'\[Page number at bottom: \d+\.\]', line))
            or bool(re.fullmatch(r'Printed page number: \d+\.', line)) or line == 'Figures/tables: none.'
            or bool(RESPONSE_NOTE.match(line)) or any(p.match(line) for p in CAPTURE_NOTES))


def _strip_tail(lines: list[str]) -> list[str]:
    while lines:
        if _is_capture_note(lines[-1]):
            lines.pop()
        elif (re.fullmatch(r'\d{1,3}', lines[-1]) and len(lines) > 1 and CHOICE.fullmatch(lines[-2])):
            lines.pop()  # a bare page number printed after the last choice
        else:
            break
    return lines


_CONT_BLOCK = re.compile(r'[|=<>≤≥]|^[•◦\-*]\s|^\s*$')  # table cells, equations, bullets
# A wrapped choice line continues a sentence: it starts in lower case or with a digit, and
# says nothing about the page (a note such as "Source formatting: ... is underlined" never joins).
_CONT_START = re.compile(r'^[a-z0-9(,;:’\'"“”\-–—.]')
_NOTE_WORDS = re.compile(r'(?i)underlin|italic|bold|highlight|\bfigure|\bfooter|\bpng\b|\bimage\b|\bprinted\b|'
                         r'source formatting|\bvisible\b|\bappears?\b|struck')


def _wrapped_choices(lines: list[str]):
    """Choices whose text wraps onto following lines (hard line breaks in the capture).
    Accepted only for one block A), B), ... in order, starting at the only A) line and
    running to the end, where every extra line is plain prose (no table cells or bullets).
    Returns (body lines, [(letter, text)]) or None."""
    starts = [i for i, line in enumerate(lines) if (m := CHOICE.fullmatch(line)) and m.group(1) == 'A']
    if len(starts) != 1:
        return None
    opts: list[list[str]] = []
    for line in lines[starts[0]:]:
        m = CHOICE.fullmatch(line)
        if m and m.group(1) == 'ABCDEFGH'[len(opts)]:
            opts.append([m.group(1), m.group(2)])
        elif (m or _CONT_BLOCK.search(line) or _is_capture_note(line) or not _CONT_START.match(line)
              or _NOTE_WORDS.search(line)):
            return None
        else:
            opts[-1][1] += ' ' + line
    if len(opts) < 2:
        return None
    return lines[:starts[0]], [(k, v) for k, v in opts]


def parse_text(text):
    lines = _strip_tail(_lines(text))
    if lines and re.fullmatch(r'\d{1,3}', lines[0]):
        lines = lines[1:]
    if lines:
        lines[0] = LEAD_LABEL.sub('', lines[0], count=1)
        if not lines[0]:
            lines = lines[1:]
    opts = []
    while lines:
        m = CHOICE.fullmatch(lines[-1])
        if not m:
            break
        opts.append((m.group(1), m.group(2)))
        lines.pop()
    opts.reverse()
    if opts and (len(opts) < 2 or len({k for k, _ in opts}) != len(opts)):
        return None
    if any(CHOICE.fullmatch(line) for line in lines):
        wrapped = _wrapped_choices(lines + [f'{k}) {v}' for k, v in opts])
        if wrapped is None:
            return None
        lines, opts = wrapped
    return {'body': '\n'.join(lines), 'choices': opts}


def classify(q):
    """(fields, reason). As dedup.classify, except that a question needing an
    unreviewed visual is still parsed (fields returned with VISUAL_REASON) so
    the corpus can group figure candidates by text without merging them."""
    p = parse_text(q['text'])
    if not p:
        return None, 'choice_parse_ambiguous'
    typ = q.get('question_type') or ('multiple_choice' if p['choices'] else 'numeric_response')
    if typ not in ('multiple_choice', 'numeric_response'):
        return None, 'unknown_type'
    if (typ == 'multiple_choice') != bool(p['choices']):
        return None, 'type_choice_mismatch'
    visual = None
    # Asset review must describe the full figure/data semantics; byte hashes are lineage only.
    if IMAGE.search(p['body']) and not q.get('reviewed_material_signature'):
        visual = VISUAL_REASON
    if q.get('assets') and not q.get('reviewed_material_signature'):
        visual = VISUAL_REASON
    body = p['body']
    if not body:
        return None, 'empty_prompt'
    choices = p['choices']
    key = str(q.get('key') if q.get('key') is not None else '').strip()
    if typ == 'multiple_choice':
        mapped = dict(choices)
        if key not in mapped:
            return (None, 'key_unmapped') if not visual else (_fields(body, choices, '', typ, q), visual)
        answer = mapped[key]
    else:
        answer = str(q.get('numeric_answer', key) or '').strip()
        if not answer and not visual:
            return None, 'numeric_answer_missing'
    return _fields(body, choices, answer, typ, q), visual


def _fields(body, choices, answer, typ, q) -> dict:
    return {'body': body, 'choices': tuple(v for _, v in choices), 'answer': answer,
            'answer_format': 'mc' if typ == 'multiple_choice' else 'numeric',
            'figure_signature': q.get('reviewed_material_signature') or None,
            'choice_map': dict(choices)}


def _base_meta(meta: dict | None) -> dict:
    out = {"source": "corpus", "status": "ok", "reason": None, "holds": [], "reviewed_answer": {"kind": None},
           "live_rows": [], "certified_live": None}
    out.update(meta or {})
    return out


def unparsed_record(ref: str, reason: str, *, is_live=False, meta=None) -> QuestionRecord:
    m = _base_meta(meta)
    m.update(status="unparsed", reason=reason)
    return QuestionRecord(ref=ref, text="", choices=(), answer="", answer_format="mc", is_live=is_live, meta=m)


def record_from_question(q: dict, ref: str, *, is_live=False, meta=None) -> QuestionRecord:
    """A dedup.py style question dict -> QuestionRecord. meta["status"] is
    "ok", "figure" (never auto-merged) or "unparsed" (meta["reason"] says why)."""
    fields, reason = classify(q)
    if fields is None:
        return unparsed_record(ref, reason, is_live=is_live, meta=meta)
    m = _base_meta(meta)
    phrase = None if fields['figure_signature'] else needs_visual(fields['body'])
    if reason or phrase or m.get("figure_reason"):
        m.update(status="figure", reason=reason or m.get("figure_reason") or f"text refers to a visual: {phrase!r}")
    m["choice_map"] = fields['choice_map']
    return QuestionRecord(ref=ref, text=fields['body'], choices=fields['choices'], answer=fields['answer'],
                          answer_format=fields['answer_format'], figure_signature=fields['figure_signature'],
                          is_live=is_live, meta=m)


# ---------------------------------------------------------------- real inputs


def _read_json(path: Path):
    return json.loads(Path(path).read_bytes().decode("utf-8"))


def _sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def _student_path(prov: dict) -> Path | None:
    for k in _STUDENT_KEYS:
        v = prov.get(k)
        if isinstance(v, dict):
            v = v.get("path")
        if isinstance(v, str) and v:
            return Path(v)
    return None


def _answer_key(teacher: dict) -> tuple[str | None, str | None]:
    """(key letter or value, reviewed answer kind)."""
    key = teacher.get("key_answer")
    if teacher.get("acceptance_basis") == GENERATED_BASIS or key is None:
        entry = teacher.get("private_generated_key_entry")
        gen = entry.get("generated_answer") if isinstance(entry, dict) else None
        return (gen, "independently_confirmed_generated") if gen is not None else (None, None)
    official = teacher.get("acceptance_basis") == "official_original_key" or teacher.get("matches_key") is True
    return str(key), ("official" if official else None)


def read_occurrence(x: dict) -> dict:
    """Read one C index entry with its version checks. Returns text, key, kind, B version."""
    qid = x["question_id"]
    folder = Path(x["C_output_path"])
    prov = _read_json(folder / "provenance.json")
    raw = (folder / "corrected.txt").read_bytes()
    recorded = [h for h in [x.get("C_corrected_text_sha256")] + [prov.get(k) for k in _C_HASH_KEYS] if h]
    for h in recorded:  # C records the hash of the text with or without its final newline
        if h not in (_sha(raw), _sha(raw.rstrip(b"\n"))):
            raise ValueError("C content changed: " + qid)
    student = _student_path(prov)
    if student is None:
        raise ValueError("B pointer changed: " + qid + " (provenance names no B student text)")
    bdir = student.parent
    expected = x.get("B_final_version") or x.get("B_package_sha256")
    if _read_json(bdir / "version.json").get("final_version_sha256") != expected:
        raise ValueError("B pointer changed: " + qid)
    key, kind = _answer_key(_read_json(bdir / "teacher.json"))
    return {"text": raw.decode("utf-8"), "key": key, "kind": kind, "b_version": expected,
            "c_hash_recorded": bool(recorded), "c_text_sha256": _sha(raw), "b_dir": str(bdir)}


def _index_rows(data) -> list[dict]:
    rows = data.get("questions") if isinstance(data, dict) else data
    if not isinstance(rows, list):
        raise ValueError("C index: expected a list of question records (or {'questions': [...]})")
    return rows


class _CfVisual:
    """Per-question CF visual status from the ledger's CF manifest (read once per file)."""

    def __init__(self):
        self.cache: dict[str, dict] = {}

    def status(self, item: dict) -> str | None:
        path = item.get("CF_manifest")
        if not path:
            return None
        if path not in self.cache:
            try:
                rows = _read_json(Path(path)).get("questions") or []
                self.cache[path] = {r.get("question_id"): r for r in rows if isinstance(r, dict)}
            except (OSError, ValueError, AttributeError):
                self.cache[path] = {}
        row = self.cache[path].get(item["id"])
        if not row or row.get("source_version") != item.get("B_package_sha256"):
            return None
        return row.get("status")


def _ledger_meta(item: dict) -> dict:
    cert = item.get("certificate") if isinstance(item.get("certificate"), dict) else {}
    holds = list(item.get("holds") or [])
    visual_hold = next((h for h in holds if "visual" in h.lower()), None)
    return {"holds": holds, "exam": item.get("exam"), "bucket": item.get("bucket"),
            "final_category": item.get("final_category"), "live_rows": list(item.get("db_live_rows") or []),
            "certified_live": cert.get("matching_live_question_id"),
            "figure_reason": f"ledger hold {visual_hold}" if visual_hold else None}


RETAINED = "_retained"
REREAD_SCHEMA = "kimport-reread-records-v1"


def _c_root(c_output_path: str) -> Path | None:
    """The C output root above an index path (<root>/exams/... or <root>/questions/...)."""
    parts = Path(c_output_path).parts
    for i in range(1, len(parts)):
        if parts[i] in ("exams", "questions"):
            return Path(*parts[:i])
    return None


def _newer_c(roots: list[Path], item: dict) -> dict | None:
    """A C text written for the ledger's current B version of this question, when the index
    still points at an older one. Looked for at the C output layout
    <root>/exams/<exam>/<B output>/questions/<id>/<B version>/ (the ledger's B output first)
    and <root>/questions/<id>/<B version>/; the first folder whose text and B package pass the
    same version checks as an index entry wins."""
    oid, bver, exam = item["id"], item.get("B_package_sha256"), item.get("exam")
    if not bver:
        return None
    for root in roots:
        cands = []
        if exam and item.get("B_output_version"):
            cands.append(root / "exams" / exam / item["B_output_version"] / "questions" / oid / bver)
        if exam:
            cands += sorted((root / "exams" / exam).glob(f"*/questions/{oid}/{bver}"))
        cands.append(root / "questions" / oid / bver)
        for folder in dict.fromkeys(cands):
            if not (folder / "corrected.txt").is_file() or not (folder / "provenance.json").is_file():
                continue
            try:
                occ = read_occurrence({"question_id": oid, "C_output_path": str(folder), "B_final_version": bver})
            except (OSError, ValueError):
                continue
            occ["c_output_path"] = str(folder)
            return occ
    return None


def _png_sha(bdir: Path) -> str | None:
    try:
        src = _read_json(Path(bdir) / "source.json")
    except (OSError, ValueError):
        return None
    return src.get("png_sha256") if isinstance(src, dict) else None


def load_reread(path: Path) -> dict[str, dict]:
    """Supplementary corrected texts (re-read from the source page by hand), keyed by occurrence id.
    {"schema": "kimport-reread-records-v1", "records": [{"question_id", "B_final_version",
    "B_package_path", "source_png_sha256", "text", "figure"?} | {"question_id", "not_readable": reason}]}
    "figure": true marks a question that needs its figure (never auto-merged, like a ledger visual hold)."""
    data = _read_json(Path(path))
    if not isinstance(data, dict) or data.get("schema") != REREAD_SCHEMA or not isinstance(data.get("records"), list):
        raise ValueError(f"{path}: expected {{'schema': '{REREAD_SCHEMA}', 'records': [...]}}")
    out: dict[str, dict] = {}
    for r in data["records"]:
        qid = r.get("question_id") if isinstance(r, dict) else None
        if not qid:
            raise ValueError(f"{path}: record without question_id")
        if qid in out:
            raise ValueError(f"{path}: repeated question id {qid}")
        if not r.get("not_readable") and not (r.get("text") and r.get("B_package_path") and r.get("B_final_version")):
            raise ValueError(f"{path}: {qid} needs text, B_package_path and B_final_version (or not_readable)")
        out[qid] = r
    return out


def read_reread(r: dict, item: dict) -> dict:
    """Version checks for a re-read record: the B package is the version the record names, which
    is the ledger's current version (when the ledger names one), and the page image the reader
    used is the one A captured and B packaged. Raises ValueError("reread ...") otherwise."""
    qid = r["question_id"]
    bdir = Path(r["B_package_path"])
    bver = r["B_final_version"]
    if item.get("B_package_sha256") and item["B_package_sha256"] != bver:
        raise ValueError("reread_for_other_b_version")
    if _read_json(bdir / "version.json").get("final_version_sha256") != bver:
        raise ValueError("reread_b_pointer_changed")
    png = r.get("source_png_sha256")
    for want in (_png_sha(bdir), item.get("A_png_sha256")):
        if want and png != want:
            raise ValueError("reread_source_image_differs")
    key, kind = _answer_key(_read_json(bdir / "teacher.json"))
    text = str(r["text"])
    return {"text": text, "key": key, "kind": kind, "b_version": bver, "c_hash_recorded": False,
            "c_text_sha256": _sha(text.encode("utf-8")), "b_dir": str(bdir)}


def load_corpus(c_index: Path, ledger: Path, extra: Path | None = None, stats: dict | None = None) -> list[QuestionRecord]:
    """extra: optional re-read records file (load_reread). An occurrence uses its re-read text only
    when the C index gives no usable text (none, older B version, or a text that does not parse).
    stats, when given, is filled with how each fallback was used."""
    index: dict[str, dict] = {}
    for x in _index_rows(_read_json(c_index)):
        if x["question_id"] in index:
            raise ValueError("repeated question id in C index: " + x["question_id"])
        index[x["question_id"]] = x
    roots = list(dict.fromkeys(r for r in (_c_root(x.get("C_output_path") or "") for x in index.values()) if r))
    reread = load_reread(extra) if extra else {}
    items = _read_json(ledger).get("items")
    if not isinstance(items, list):
        raise ValueError(f"{ledger}: no 'items' list (expected current-readiness-ledger.json)")
    ids = {item["id"] for item in items}
    st = stats if stats is not None else {}
    for k in ("newer_c_text", "retained_alias", "reread_used", "reread_unused", "reread_failed"):
        st.setdefault(k, 0)
    st.setdefault("reread_failures", {})
    seen: set[str] = set()
    cf = _CfVisual()
    out = []
    for item in items:
        oid = item["id"]
        if oid in seen:
            raise ValueError("repeated occurrence id in ledger: " + oid)
        seen.add(oid)
        meta = _ledger_meta(item)
        live = bool(meta["live_rows"])
        rec, reason, occ = None, None, None
        x = index.get(oid)
        if x is None and oid.endswith(RETAINED) and oid[:-len(RETAINED)] not in ids:
            # A capture kept under "<id>_retained" whose C text and B package carry the plain id;
            # used only when the B package was made from the same page image.
            base = index.get(oid[:-len(RETAINED)])
            if base is not None:
                cand = read_occurrence(base)
                png = _png_sha(Path(cand["b_dir"]))
                if png and png == item.get("A_png_sha256"):
                    x, occ = base, cand
                    st["retained_alias"] += 1
        if x is None:
            reason = "no_corrected_text"
        else:
            occ = occ or read_occurrence(x)
            if item.get("B_package_sha256") and item["B_package_sha256"] != occ["b_version"]:
                newer = _newer_c(roots, item)
                if newer is None:
                    reason = "corrected_text_for_older_b_version"
                else:
                    occ = newer
                    meta["c_newer_text"] = newer["c_output_path"]
                    st["newer_c_text"] += 1
        if reason is None:
            rec = _record(item, occ, meta, live, cf)
            if rec.meta["status"] == "unparsed":
                reason = rec.meta["reason"]
        r = reread.get(oid)
        if r is not None:
            if reason is None:
                st["reread_unused"] += 1
            elif r.get("not_readable"):
                reason = "not_readable: " + str(r["not_readable"])
                rec = None
            else:
                try:
                    rocc = read_reread(r, item)
                except ValueError as e:
                    st["reread_failed"] += 1
                    st["reread_failures"][oid] = str(e)
                else:
                    meta.update(text_source="reread", reread_replaces=reason)
                    if r.get("figure") and not meta["figure_reason"]:
                        meta["figure_reason"] = "re-read: the question needs its figure"
                    rec = _record(item, rocc, meta, live, cf)
                    if rec.meta["status"] == "unparsed":
                        st["reread_failed"] += 1
                        st["reread_failures"][oid] = "reread_" + rec.meta["reason"]
                        reason = "reread_" + rec.meta["reason"]
                    else:
                        st["reread_used"] += 1
                        reason = None
        if reason is not None and (rec is None or rec.meta["status"] != "unparsed" or rec.meta["reason"] != reason):
            rec = unparsed_record(oid, reason, is_live=live, meta=meta)
        out.append(rec)
    return out


def _record(item: dict, occ: dict, meta: dict, live: bool, cf: "_CfVisual") -> QuestionRecord:
    m = dict(meta)
    m.update(c_hash_recorded=occ["c_hash_recorded"], c_text_sha256=occ["c_text_sha256"],
             b_version=occ["b_version"], reviewed_answer={"kind": occ["kind"]})
    status = cf.status(item)
    if status in _CF_VISUAL and not m["figure_reason"]:
        m["figure_reason"] = f"CF essential visual ({status})"
    return record_from_question({"text": occ["text"], "key": occ["key"]}, item["id"], is_live=live, meta=m)
