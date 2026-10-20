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
_STUDENT_KEYS = ("b_final_student_text", "b_student_final_text", "B_student_final_text", "B_student_json")
_C_HASH_KEYS = ("c_corrected_text_sha256", "C_corrected_text_sha256")
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


def parse_text(text):
    lines = _lines(text)
    while lines and (re.fullmatch(r'\[Page number at bottom: \d+\.\]', lines[-1])
                     or re.fullmatch(r'Printed page number: \d+\.', lines[-1]) or lines[-1] == 'Figures/tables: none.'
                     or RESPONSE_NOTE.match(lines[-1])):
        lines.pop()
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
        return None
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
            "c_hash_recorded": bool(recorded), "c_text_sha256": _sha(raw)}


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


def load_corpus(c_index: Path, ledger: Path) -> list[QuestionRecord]:
    index: dict[str, dict] = {}
    for x in _index_rows(_read_json(c_index)):
        if x["question_id"] in index:
            raise ValueError("repeated question id in C index: " + x["question_id"])
        index[x["question_id"]] = x
    items = _read_json(ledger).get("items")
    if not isinstance(items, list):
        raise ValueError(f"{ledger}: no 'items' list (expected current-readiness-ledger.json)")
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
        x = index.get(oid)
        if x is None:
            out.append(unparsed_record(oid, "no_corrected_text", is_live=live, meta=meta))
            continue
        occ = read_occurrence(x)
        meta.update(c_hash_recorded=occ["c_hash_recorded"], c_text_sha256=occ["c_text_sha256"],
                    b_version=occ["b_version"], reviewed_answer={"kind": occ["kind"]})
        if item.get("B_package_sha256") and item["B_package_sha256"] != occ["b_version"]:
            out.append(unparsed_record(oid, "corrected_text_for_older_b_version", is_live=live, meta=meta))
            continue
        status = cf.status(item)
        if status in _CF_VISUAL and not meta["figure_reason"]:
            meta["figure_reason"] = f"CF essential visual ({status})"
        out.append(record_from_question({"text": occ["text"], "key": occ["key"]}, oid, is_live=live, meta=meta))
    return out
