"""Answer certification for `k qa certify` (read-only, files only).

A student-visible question's answer is certified by exactly one of:

1. qa_verdict: its latest QA verdict (pipeline/qa/results-r*.jsonl, later lines win, as
   `k qa hide` reads them) is clean or key_ok, the key is still the key the QA pass checked
   and the stem, passage and choices are still the text it solved (blind-live*.json);
2. qa_correction: it is a QA-corrected row (qa/corrections.jsonl, the latest line) whose
   content hash and key are still the corrected ones, and at least two independent solves
   on record agree with the corrected key;
3. post_qa_publish: it went live after the QA snapshot (no QA verdict, no correction), and
   at least two independent solves in its own batch folder (found by the answer key's
   tag_binding_manifest_sha256) agree with its key.

Anything else is uncertified, with the reason. Solves are counted once per solver: two
records of the same solver (for example a blind subagent's answer written to both
blind-answers.json and a per-question file) count once.
"""

import glob
import hashlib
import json
import re
from fractions import Fraction
from pathlib import Path

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


def _answers(v) -> list[str]:
    if v is None:
        return []
    if isinstance(v, (str, int, float)):
        return [str(v)]
    if isinstance(v, list):
        return [str(x) for x in v if isinstance(x, (str, int, float))]
    if isinstance(v, dict):
        for k in ("answers", "all_accepted", "all_valid_answers", "values"):
            if v.get(k):
                got = _answers(v[k])
                if got:
                    return got
        for k in ("answer", "own_answer", "key"):
            if v.get(k) is not None:
                return _answers(v[k])
    return []


# ---------------------------------------------------------------- solve records


def _load(path: Path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _match_key(k: str, sid: str, live_id: str) -> bool:
    k = str(k or "")
    return bool(k) and (k == sid or k == live_id or (len(k) >= 8 and live_id.startswith(k)))


def _blind_file(path: Path, sid: str, live_id: str, kind: str) -> list[tuple[str, list[str], str]]:
    d, out = _load(path), []
    if isinstance(d, list):
        for e in d:
            if isinstance(e, dict) and _match_key(e.get("id") or e.get("sid") or e.get("stable_question_id"), sid, live_id):
                out.append((kind, _answers(e), str(path)))
    elif isinstance(d, dict):
        for k, e in d.items():
            if _match_key(k, sid, live_id):
                for one in (e if isinstance(e, list) else [e]):
                    out.append((kind, _answers(one), str(path)))
    return out


_REVIEW_KIND = (("blind-solve", "batch-blind"), ("second-solve", "second-solve"), ("my-solve", "reviewer-solve"),
                ("solve-1", "solve-1"), ("solve-2", "solve-2"))


def _review_files(folder: Path, sid: str, live_id: str) -> list[tuple[str, list[str], str]]:
    out = []
    rdir = folder / "reviews"
    if not rdir.is_dir():
        return out
    for f in sorted(rdir.glob("*.json")):
        name = f.name
        if name == "blind-answers.json":
            out += _blind_file(f, sid, live_id, "batch-blind")
            continue
        if name == "qa-correction-solves.json":
            entry = (_load(f) or {}).get(sid)
            if isinstance(entry, dict):
                for i, b in enumerate(entry.get("blind_from_source_crop") or []):
                    out.append(("batch-blind-crop" if i == 0 else f"batch-blind-crop-{i}", _answers(b), str(f)))
                if entry.get("first_pass_solve_from_crop"):
                    out.append(("qa-fix-reviewer", _answers(entry["first_pass_solve_from_crop"]), str(f)))
                if entry.get("audit_solve_from_crops"):
                    out.append(("qa-fix-audit", _answers(entry["audit_solve_from_crops"]), str(f)))
            continue
        if not name.startswith(sid + "."):
            continue
        d = _load(f)
        if not isinstance(d, dict):
            continue
        if isinstance(d.get("reviews"), list):  # generated key: the transcriber's and the reviewer's solves
            for r in d["reviews"]:
                if isinstance(r, dict):
                    out.append((f"generated-key:{r.get('by') or '?'}", _answers(r), str(f)))
            continue
        if d.get("reviewed_accepted_answers"):  # a reviewer's numeric answer-set review with its own solve
            out.append(("answer-set-review", _answers(d["reviewed_accepted_answers"]), str(f)))
            continue
        kind = next((k for tag, k in _REVIEW_KIND if tag in name), "review:" + name[len(sid) + 1:])
        out.append((kind, _answers(d), str(f)))
    return out


def batch_solves(folder: Path, sid: str, live_id: str) -> list[tuple[str, list[str], str]]:
    """(solver kind, answers, file) for every solve of this question in its batch folder."""
    folder = Path(folder)
    out = _blind_file(folder / "blind-answers.json", sid, live_id, "batch-blind") if (folder / "blind-answers.json").exists() else []
    out += _review_files(folder, sid, live_id)
    cfg = _load(folder / "config.json")
    call = ((cfg or {}).get("calls") or {}).get(sid) if isinstance(cfg, dict) else None
    if isinstance(call, list) and len(call) > 3:  # [skill, difficulty, note, the reviewer's answer, rationale]
        out.append(("qa-fix-reviewer", _answers(call[3]), str(folder / "config.json")))
    return out


def agreeing(solves, key, numeric: bool) -> tuple[list[str], list[str]]:
    """(solver kinds agreeing with the key, solver kinds disagreeing), each solver once."""
    agree, other = set(), set()
    for kind, answers, _ in solves:
        if not answers:
            continue
        (agree if any(same_answer(a, key, numeric) for a in answers) else other).add(kind)
    return sorted(agree), sorted(other - agree)


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
            for r in _load(Path(f)) or []:
                if isinstance(r, dict) and r.get("id"):
                    self.snapshots.setdefault(r["id"], []).append(r)
        self.corrections = {c["question_id"]: c for c in _jsonl(self.qa / "corrections.jsonl") if c.get("question_id")}
        self.fixes: dict[str, list[dict]] = {}
        for f in sorted(glob.glob(str(self.qa / "fixes-*.jsonl"))):
            for r in _jsonl(Path(f)):
                if r.get("id") and r.get("decision") == "fix":
                    self.fixes.setdefault(r["id"], []).append(r)
        self.blind_corrections = {}
        for f in sorted(glob.glob(str(self.qa / "blind-corrections-*.json"))):
            d = _load(Path(f))
            if isinstance(d, dict):
                for sid, v in d.items():
                    self.blind_corrections.setdefault(sid, []).extend(v if isinstance(v, list) else [v])
        self._by_binding = None

    def folder_for_binding(self, sha: str | None) -> Path | None:
        if self._by_binding is None:
            self._by_binding = {}
            for tb in self.batches.glob("*/tag-binding.json"):
                h = hashlib.sha256(tb.read_bytes()).hexdigest()
                self._by_binding.setdefault(h, []).append(tb.parent)
        found = self._by_binding.get(sha or "", [])
        return sorted(found)[-1] if found else None


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
        folder = rec.batches / str(corr.get("batch"))
        csid = corr.get("stable_question_id") or sid
        solves = batch_solves(folder, csid, rid)
        solves += [("qa-round-blind", [a], "results-r*.jsonl") for a in rec.blind_answers.get(rid, [])]
        for fx in rec.fixes.get(rid, []):
            if fx.get("corrected_key") not in (None, ""):
                solves.append(("qa-fix-reviewer", _answers(fx["corrected_key"]), "fixes-*.jsonl"))
            if fx.get("audit_own_answer") not in (None, ""):
                solves.append(("qa-fix-audit", _answers(fx["audit_own_answer"]), "fixes-*.jsonl"))
        for b in rec.blind_corrections.get(csid, []):
            solves.append(("batch-blind-crop", _answers(b), "blind-corrections-*.json"))
        agree, other = agreeing(solves, key, numeric)
        base = {"basis": "qa_correction", "batch": corr.get("batch"), "agreeing": agree, "disagreeing": other}
        if len(agree) >= 2:
            return {"status": "certified", **base}
        return {"status": "uncertified", "reason": "qa_correction_fewer_than_two_solves", **base}
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
    folder = rec.folder_for_binding(binding)
    if folder is None or not sid:
        return {"status": "uncertified", "reason": "post_qa_no_batch_folder",
                "detail": f"stable id {sid}, tag binding {binding}"}
    agree, other = agreeing(batch_solves(folder, sid, rid), key, numeric)
    base = {"basis": "post_qa_publish", "batch": folder.name, "agreeing": agree, "disagreeing": other}
    if len(agree) >= 2:
        return {"status": "certified", **base}
    return {"status": "uncertified", "reason": "post_qa_fewer_than_two_solves", **base}
