"""Answer certification for `k qa certify` (read-only, files only).

A student-visible question's answer is certified by exactly one of:

1. qa_verdict: its latest QA verdict (pipeline/qa/results-r*.jsonl, later lines win, as
   `k qa hide` reads them) is clean or key_ok, the key is still the key the QA pass checked
   and the stem, passage and choices are still the text it solved (blind-live*.json);
2. qa_correction: it is a QA-corrected row (qa/corrections.jsonl, the latest line) whose
   content hash and key are still the corrected ones, and its answer evidence holds (below);
3. post_qa_publish: it went live after the QA snapshot (no QA verdict, no correction), and
   the answer evidence in its own batch folder(s) holds (folders found by the answer key's
   tag_binding_manifest_sha256, whatever the tag-binding file is called).

Answer evidence holds when the key is the OFFICIAL printed key and at least one other
independent solver agrees, or (a generated or overridden key) at least two independent
solvers agree. Solvers and every file format they are read from: kimport.qa_evidence; one
solver counts once however many files repeat its solve. Anything else is uncertified,
with the reason.
"""

import glob
import hashlib
import json
import re
from fractions import Fraction
from pathlib import Path

from kimport import qa_evidence
from kimport.answer_evidence import evidence_root, stable_question_id

GOOD = frozenset({"clean", "key_ok"})


# ---------------------------------------------------------------- answers


def _num(s: str):
    s = str(s).strip().replace("−", "-").replace(",", "")
    try:
        if "/" in s:
            a, b = s.split("/", 1)
            return Fraction(Fraction(a.strip()), Fraction(b.strip()))
        return Fraction(s)
    except (ValueError, ZeroDivisionError):
        return None


def same_answer(a, key, numeric: bool) -> bool:
    """A solve's answer equals the key: a letter, or a number (5/9 = .5555 = .5556, as SAT grids)."""
    a, key = str(a or "").strip(), str(key or "").strip()
    if not a or not key:
        return False
    if not numeric:
        return a.upper().strip("() .") == key.upper().strip("() .")
    x, y = _num(a), _num(key)
    if x is None or y is None:
        return re.sub(r"\s+", "", a) == re.sub(r"\s+", "", key)
    if x == y:
        return True
    # a gridded decimal cut to the grid's width: allow the last place it shows
    places = max((len(t.split(".", 1)[1]) for t in (a, key) if "." in t and "/" not in t), default=None)
    return places is not None and places >= 3 and abs(float(x) - float(y)) <= 10 ** -places


def judge(ev: qa_evidence.Evidence, key: str, numeric: bool) -> dict:
    """The evidence rule: printed official key + one agreeing solver, or two agreeing solvers."""
    agree, other = set(), set()
    for solver, got, _ in ev.solves:
        (agree if any(same_answer(a, key, numeric) for a in got) else other).add(solver)
    printed = ev.printed is not None and same_answer(ev.printed, key, numeric)
    need = 1 if printed else 2
    out = {"printed_key": ev.printed, "printed_key_agrees": printed, "agreeing": sorted(agree),
           "disagreeing": sorted(other - agree), "needed_solvers": need, "ok": len(agree) >= need}
    return out


# ---------------------------------------------------------------- QA files


def _jsonl(path: Path) -> list[dict]:
    out = []
    try:
        lines = Path(path).read_text(encoding="utf-8").splitlines()
    except OSError:
        return out
    for line in lines:
        if line.strip():
            try:
                out.append(json.loads(line))
            except ValueError:
                pass
    return out


class QaRecords:
    """Everything certification reads from pipeline/qa and pipeline/batches."""

    def __init__(self, pipe: Path):
        pipe = Path(pipe)
        self.qa, self.batches = pipe / "qa", pipe / "batches"
        self.verdicts: dict[str, dict] = {}
        self.blind_answers: dict[str, list[str]] = {}
        for f in sorted(glob.glob(str(self.qa / "results-r*.jsonl"))):
            for r in _jsonl(Path(f)):
                if r.get("id"):
                    self.verdicts[r["id"]] = r  # later lines win
                    if r.get("blind_answer") not in (None, ""):
                        self.blind_answers.setdefault(r["id"], []).append(str(r["blind_answer"]))
        self.snapshots: dict[str, list[dict]] = {}
        for f in sorted(glob.glob(str(self.qa / "blind-live*.json"))):
            for r in qa_evidence.load(f) or []:
                if isinstance(r, dict) and r.get("id"):
                    self.snapshots.setdefault(r["id"], []).append(r)
        self.corrections = {c["question_id"]: c for c in _jsonl(self.qa / "corrections.jsonl") if c.get("question_id")}
        self.fixes: dict[str, list[dict]] = {}
        for f in sorted(glob.glob(str(self.qa / "fixes-*.jsonl"))):
            for r in _jsonl(Path(f)):
                if r.get("id") and r.get("decision") == "fix":
                    self.fixes.setdefault(r["id"], []).append(r)
        self.blind_corrections: dict[str, list] = {}
        for f in sorted(glob.glob(str(self.qa / "blind-corrections-*.json"))):
            d = qa_evidence.load(f)
            if isinstance(d, dict):
                for sid, v in d.items():
                    self.blind_corrections.setdefault(sid, []).extend(v if isinstance(v, list) else [v])
        self.repair = qa_evidence.RepairRecords(pipe / "repair")
        self._by_binding = None

    def folders_for_binding(self, sha: str | None) -> list[Path]:
        """Every batch folder whose tag binding file (tag-binding.json or <batch>-tag-binding.json,
        superseded and module-split copies too) has this sha256."""
        if self._by_binding is None:
            self._by_binding = {}
            for tb in self.batches.glob("*/*tag-binding*.json"):
                h = hashlib.sha256(tb.read_bytes()).hexdigest()
                self._by_binding.setdefault(h, set()).add(tb.parent)
        return sorted(self._by_binding.get(sha or "", ()))

    def evidence(self, folders: list[Path], sid: str, live_id: str) -> qa_evidence.Evidence:
        ev = qa_evidence.Evidence()
        for folder in folders:
            qa_evidence.read_folder(ev, folder, sid, live_id)
        self.repair.add_to(ev, sid)
        return ev


# ---------------------------------------------------------------- one row


def _ws(s) -> str:
    return re.sub(r"\s+", " ", str(s or "")).strip()


def content_as_solved(row: dict, snaps: list[dict]) -> bool:
    """The stem, passages and choice texts equal one of the QA-time snapshots of this row."""
    choices = [(c.get("letter"), _ws(c.get("choice_text"))) for c in row.get("answer_choices") or []]
    for s in snaps:
        same = _ws(s.get("question")) == _ws(row.get("question_text")) and all(
            _ws(s.get(f)) == _ws(row.get(f)) for f in ("passage", "passage_a", "passage_b", "passage_intro") if f in s)
        snap_choices = [(c.get("letter"), _ws(c.get("text"))) for c in s.get("choices") or []]
        # A screenshot-solved snapshot (blind-live2: render_png, no choice list) shows the choices
        # in the picture of this same row; its stem and passage are still compared.
        if same and (snap_choices == choices or (not snap_choices and s.get("render_png"))):
            return True
    return False


def _key_tags(row: dict):
    for k in row.get("answer_key_entries") or []:
        raw = k.get("raw_model_response")
        root = evidence_root(raw) or {}
        tags = root.get("approved_tags") if isinstance(root, dict) else None
        if isinstance(tags, dict):
            return stable_question_id(raw), tags.get("tag_binding_manifest_sha256")
    return None, None


def certify_row(row: dict, rec: QaRecords) -> dict:
    rid, key = str(row["id"]), str(row.get("correct_answer") or "")
    numeric = row.get("answer_format") == "numeric_entry"
    sid, binding = _key_tags(row)
    corr = rec.corrections.get(rid)
    if corr:
        if corr.get("after_content_hash_v2") != row.get("content_hash_v2"):
            return {"status": "uncertified", "reason": "qa_correction_changed_since",
                    "detail": "content_hash_v2 is not the corrected row's"}
        if not same_answer(corr.get("after_correct_answer"), key, numeric):
            return {"status": "uncertified", "reason": "qa_correction_changed_since",
                    "detail": f"key {key} is not the corrected key {corr.get('after_correct_answer')}"}
        csid = corr.get("stable_question_id") or sid
        ev = rec.evidence([rec.batches / str(corr.get("batch"))], csid, rid)
        for a in rec.blind_answers.get(rid, []):
            ev.add("qa-blind", a, "qa/results-r*.jsonl")
        for fx in rec.fixes.get(rid, []):
            ev.add("qa-fix-reviewer", fx.get("corrected_key"), "qa/fixes-*.jsonl")
            ev.add("qa-fix-audit", fx.get("audit_own_answer"), "qa/fixes-*.jsonl")
        for b in rec.blind_corrections.get(csid, []):
            ev.add("blind-subagent", b, "qa/blind-corrections-*.json")
        j = judge(ev, key, numeric)
        base = {"basis": "qa_correction", "batch": corr.get("batch"), "stable_question_id": csid,
                **{k: v for k, v in j.items() if k != "ok"}}
        if j["ok"]:
            return {"status": "certified", **base}
        return {"status": "uncertified", "reason": "qa_correction_evidence_short", **base}
    verdict = rec.verdicts.get(rid)
    if verdict:
        v = verdict.get("verdict")
        if v not in GOOD:
            return {"status": "uncertified", "reason": f"qa_verdict_{v}", "detail": verdict.get("fix") or verdict.get("note")}
        if not same_answer(verdict.get("stored_answer"), key, numeric):
            return {"status": "uncertified", "reason": "key_changed_since_qa",
                    "detail": f"key {key}; QA checked {verdict.get('stored_answer')}"}
        if not content_as_solved(row, rec.snapshots.get(rid, [])):
            return {"status": "uncertified", "reason": "text_changed_since_qa",
                    "detail": "stem, passage or choices differ from the text the QA pass solved"}
        return {"status": "certified", "basis": "qa_verdict", "verdict": v}
    folders = rec.folders_for_binding(binding)
    if not folders or not sid:
        return {"status": "uncertified", "reason": "post_qa_no_batch_folder", "stable_question_id": sid,
                "detail": f"stable id {sid}, tag binding {binding}"}
    j = judge(rec.evidence(folders, sid, rid), key, numeric)
    base = {"basis": "post_qa_publish", "batch": ", ".join(f.name for f in folders), "stable_question_id": sid,
            **{k: v for k, v in j.items() if k != "ok"}}
    if j["ok"]:
        return {"status": "certified", **base}
    return {"status": "uncertified", "reason": "post_qa_evidence_short", **base}
