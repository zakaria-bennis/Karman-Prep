"""Answer evidence on disk for one question, read for `k qa certify` (kimport.qa_answers). Read-only.

Every format reviewers record answers in (surveyed 2026-10-23 across pipeline/batches and
pipeline/repair), each mapped to the SOLVER it comes from, so one person's solve written to
several files counts once:

  printed key   reviewed row reviewed_answer {kind: official, printed_answer}: the official
                printed key, one independent source (never a transcriber or generated key)
  reviewer      the batch reviewer's own solve: independent-d-review records reviewer_solve,
                config.json calls[sid][3], spec.json items[Qnn][0], reviewer-blind-solves.json,
                <sid>.solve.json, reviews/<sid>.second-solve / my-solve / <sid>.json (numeric
                answer-set review), a generated-key review by r1/r2/r3/oct or "reviewer ...",
                reviewed_answer.independently_verified_answer, repair/recertify-*.json
                your_solve, repair/key-audit.json reviewer_solve
  blind-subagent  blind-answers.json (batch or reviews/; a {solver_A, solver_B, text_only} entry is
                three blind solvers), reviews/<sid>.blind-solve.json, a
                review by "blind subagent" / blind_solver, a QA correction's blind solve from
                the source crop
  transcriber   a generated-key review by the transcriber (the blind solve that made the key)
  b-solver      repair/key-audit.json b_independent_solve (B's independent solve)
  qa-fix-reviewer / qa-fix-audit  a QA correction's reviewer and audit solves

A record marked key_exposed_to_solver: true is not a solve and is skipped.

BLIND solvers (the only ones that certify an answer, founder's zero-doubt bar 2026-10-23):
blind-subagent*, blind-text-only, qa-blind (the QA round's blind solve), recertify-blind
(repair/recertify-*.json your_solve), and the transcriber only where its record says
key_exposed_to_solver: false and it is not the reviewer's pass (its record_sha256 is not one
of the batch's reviewer files). The reviewer, the QA fix reviewer and audit, and B's solve are
recorded but do not count: they may have seen the printed key.
"""

import hashlib

import glob
import json
from pathlib import Path


def load(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def answers(v) -> list[str]:
    if v is None:
        return []
    if isinstance(v, (str, int, float)) and not isinstance(v, bool):
        return [str(v)]
    if isinstance(v, list):
        return [str(x) for x in v if isinstance(x, (str, int, float)) and not isinstance(x, bool)]
    if isinstance(v, dict):
        for k in ("answers", "accepted", "all_accepted", "all_valid_answers", "values"):
            got = answers(v.get(k)) if v.get(k) else []
            if got:
                return got
        for k in ("answer", "own_answer", "key", "reviewer_solve", "your_solve"):
            if v.get(k) is not None:
                return answers(v[k])
    return []


def is_blind(solver: str) -> bool:
    return solver.startswith("blind-") or solver in ("qa-blind", "recertify-blind", "transcriber")
    # (a re-solve record's solver is "blind-resolve:<solver_run>")


def solver_of(by) -> str:
    b = str(by or "").lower()
    if "transcriber" in b:
        return "transcriber"
    if "subagent" in b or "blind_solver" in b or "blind solver" in b:
        return "blind-subagent"
    return "reviewer"


def _exposed(v) -> bool:
    return isinstance(v, dict) and v.get("key_exposed_to_solver") is True


def _matches(k, sid: str, live_id: str) -> bool:
    k = str(k or "")
    return bool(k) and (k == sid or k == live_id or (len(k) >= 8 and live_id.startswith(k)))


class Evidence:
    """Solves (solver, answers, file) and the printed official key found for one question."""

    def __init__(self):
        self.solves: list[tuple[str, list[str], str]] = []
        self.printed: str | None = None
        self.kind: str | None = None
        self.files: set[str] = set()

    def add(self, solver: str, value, where) -> None:
        if _exposed(value):
            return
        got = answers(value)
        if got:
            self.solves.append((solver, got, str(where)))


# blind-answers.json {sid: {solver_A, solver_B, text_only}}: two page-image blind solvers and a
# text-only one. solver_A is taken as the batch's usual blind subagent (counted once with it).
_PANEL = {"solver_A": "blind-subagent", "solver_B": "blind-subagent-2", "text_only": "blind-text-only"}


def _blind_file(ev: Evidence, path: Path, sid: str, live_id: str, solver: str = "blind-subagent") -> None:
    d = load(path)
    if isinstance(d, list):
        for e in d:
            if isinstance(e, dict) and _matches(e.get("id") or e.get("sid") or e.get("stable_question_id"), sid, live_id):
                ev.add(solver, e, path)
    elif isinstance(d, dict):
        for k, e in d.items():
            if not _matches(k, sid, live_id):
                continue
            if isinstance(e, dict) and any(x in e for x in _PANEL):  # several blind solvers per question
                for x, name in _PANEL.items():
                    ev.add(name, e.get(x), path)
                continue
            for one in (e if isinstance(e, list) else [e]):
                ev.add(solver, one, path)


def _reviewed_row(folder: Path, sid: str):
    for f in sorted(folder.glob("*reviewed-import-ready.json")):
        d = load(f)
        for q in (d.get("questions") if isinstance(d, dict) else None) or []:
            if isinstance(q, dict) and q.get("stable_question_id") == sid:
                return q, f
    return None, None


def _reviewer_hashes(folder: Path, sid: str) -> set[str]:
    """sha256 of the reviewer's own files for this question (second-solve, my-solve, <sid>.json)."""
    out = set()
    for f in (folder / "reviews").glob(f"{sid}.*json"):
        if not any(t in f.name for t in ("generated-key", "blind-solve")):
            out.add(hashlib.sha256(f.read_bytes()).hexdigest())
    return out


def _reviews(ev: Evidence, folder: Path, sid: str, live_id: str) -> None:
    rdir = folder / "reviews"
    for f in sorted(rdir.glob("*.json")) if rdir.is_dir() else []:
        name = f.name
        if name == "blind-answers.json":
            _blind_file(ev, f, sid, live_id)
        elif name == "qa-correction-solves.json":
            entry = (load(f) or {}).get(sid)
            if isinstance(entry, dict):
                for i, b in enumerate(entry.get("blind_from_source_crop") or []):
                    ev.add("blind-subagent" if i == 0 else f"blind-subagent-{i + 1}", b, f)
                ev.add("qa-fix-reviewer", entry.get("first_pass_solve_from_crop"), f)
                ev.add("qa-fix-audit", entry.get("audit_solve_from_crops"), f)
        elif name.startswith(sid + "."):
            d = load(f)
            if not isinstance(d, dict):
                continue
            if isinstance(d.get("reviews"), list):  # generated key: who solved it, blind
                for r in d["reviews"]:
                    if not isinstance(r, dict):
                        continue
                    who = solver_of(r.get("by"))
                    if who == "transcriber" and (r.get("key_exposed_to_solver") is not False
                                                 or r.get("record_sha256") in _reviewer_hashes(folder, sid)):
                        who = "transcriber-unproven"  # not proven blind, or the reviewer's own pass
                    ev.add(who, r, f)
            elif d.get("reviewed_accepted_answers"):  # the reviewer's numeric answer-set review
                ev.add("reviewer", d["reviewed_accepted_answers"], f)
            elif "blind-solve" in name:
                ev.add("blind-subagent", d, f)
            elif "solve-1" in name or "solve-2" in name:
                ev.add(solver_of(d.get("by")), d, f)
            else:  # second-solve, my-solve: the reviewer's own
                ev.add("reviewer", d, f)


def read_folder(ev: Evidence, folder: Path, sid: str, live_id: str) -> None:
    folder = Path(folder)
    ev.files.add(str(folder))
    row, rfile = _reviewed_row(folder, sid)
    if row is not None:
        ra = row.get("reviewed_answer") if isinstance(row.get("reviewed_answer"), dict) else {}
        ev.kind = ev.kind or ra.get("kind")
        if ra.get("kind") == "official" and ra.get("printed_answer") not in (None, ""):
            ev.printed = ev.printed or str(ra["printed_answer"])
        ev.add("reviewer", ra.get("independently_verified_answer"), rfile)
    for f in sorted(folder.glob("*independent-d-review.json")):
        recs = (load(f) or {}).get("records")
        for r in (recs if isinstance(recs, list) else list((recs or {}).values())):
            if isinstance(r, dict) and r.get("stable_question_id") == sid:
                ev.add("reviewer", r.get("reviewer_solve"), f)
    cfg = load(folder / "config.json")
    call = ((cfg.get("calls") or {}).get(sid)) if isinstance(cfg, dict) else None
    if isinstance(call, list) and len(call) > 3:  # [skill, level, note, the reviewer's answer, ...]
        ev.add("reviewer", call[3], folder / "config.json")
    spec = load(folder / "spec.json")
    if isinstance(spec, dict) and isinstance(spec.get("items"), dict):
        for n, item in spec["items"].items():
            if sid.endswith(f"_Q{str(n).zfill(2)}") and isinstance(item, list) and item:
                ev.add("reviewer", item[0], folder / "spec.json")
    rbs = load(folder / "reviewer-blind-solves.json")
    if isinstance(rbs, dict) and sid in rbs:
        ev.add("reviewer", rbs[sid], folder / "reviewer-blind-solves.json")
    ev.add("reviewer", load(folder / f"{sid}.solve.json"), folder / f"{sid}.solve.json")
    _blind_file(ev, folder / "blind-answers.json", sid, live_id)
    _reviews(ev, folder, sid, live_id)


class RepairRecords:
    """repair/recertify-*.json (your_solve, a blind re-solve) and repair/key-audit.json, by stable id."""

    def __init__(self, repair: Path):
        self.by_sid: dict[str, list[tuple[str, object, str]]] = {}
        for f in sorted(glob.glob(str(Path(repair) / "recertify-*.json"))):
            for r in load(f) or []:
                if isinstance(r, dict) and r.get("id"):
                    self.by_sid.setdefault(r["id"], []).append(("recertify-blind", r.get("your_solve"), f))
        audit = Path(repair) / "key-audit.json"
        for r in load(audit) or []:
            if isinstance(r, dict) and r.get("id"):
                self.by_sid.setdefault(r["id"], []).append(("reviewer", r.get("reviewer_solve"), str(audit)))
                self.by_sid.setdefault(r["id"], []).append(("b-solver", r.get("b_independent_solve"), str(audit)))

    def add_to(self, ev: Evidence, sid: str) -> None:
        for solver, value, f in self.by_sid.get(sid, []):
            ev.add(solver, value, f)


# ---------------------------------------------------------------- blind re-solve records

RESOLVE_INPUTS = ("student-view text", "source page image")
ADJUDICATIONS = "adjudications.jsonl"
DECISIONS = ("key_confirmed", "key_wrong", "unclear")


class BlindResolves:
    """pipeline/qa/blind-resolve/<reviewer>-<n>.jsonl: one line per blind re-solve,
    {"id", "stable_question_id", "answer", "solver": "blind-subagent", "solver_run",
     "key_exposed_to_solver": false, "inputs": "student-view text" | "source page image", "at"}.
    Each distinct solver_run is one blind solver; a line that breaks the format is not a solve and
    is listed in `rejected` with the reason. adjudications.jsonl in the same folder holds
    {id, stable_question_id, decision: key_confirmed | key_wrong | unclear, note, by, at,
    confirming_runs: [solver_run, ...]} for rows a re-solve disagreed with (later lines win)."""

    def __init__(self, folder: Path):
        self.by_id: dict[str, dict[str, tuple]] = {}
        self.rejected: list[dict] = []
        self.adjudications: dict[str, dict] = {}
        for f in sorted(Path(folder).glob("*.jsonl")) if Path(folder).is_dir() else []:
            adj = f.name == ADJUDICATIONS
            for n, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
                if not line.strip():
                    continue
                why, r = None, None
                try:
                    r = json.loads(line)
                except ValueError:
                    why = "not JSON"
                if why is None:
                    why = self._adjudication_problem(r) if adj else self._problem(r)
                if why:
                    self.rejected.append({"file": f.name, "line": n, "id": r.get("id") if isinstance(r, dict) else None,
                                          "reason": why})
                    continue
                if adj:
                    self.adjudications[r["id"]] = r  # later lines win
                    continue
                runs = self.by_id.setdefault(r["id"], {})
                runs.setdefault(str(r["solver_run"]), (str(r["answer"]), r.get("stable_question_id"), f"{f.name}:{n}"))

    @staticmethod
    def _adjudication_problem(r) -> str | None:
        if not isinstance(r, dict):
            return "not an object"
        for k in ("id", "stable_question_id", "by", "at"):
            if not isinstance(r.get(k), str) or not r[k].strip():
                return f"{k} missing"
        if r.get("decision") not in DECISIONS:
            return f"decision is not one of {', '.join(DECISIONS)}"
        if not isinstance(r.get("note"), str):
            return "note missing"
        runs = r.get("confirming_runs")
        if not isinstance(runs, list) or not all(isinstance(x, str) and x for x in runs):
            return "confirming_runs is not a list of solver_run ids"
        return None

    @staticmethod
    def _problem(r) -> str | None:
        if not isinstance(r, dict):
            return "not an object"
        for k in ("id", "stable_question_id", "solver_run", "at"):
            if not isinstance(r.get(k), str) or not r[k].strip():
                return f"{k} missing"
        if not isinstance(r.get("answer"), (str, int, float)) or isinstance(r.get("answer"), bool) or str(r["answer"]).strip() == "":
            return "answer missing"
        if r.get("solver") != "blind-subagent":
            return "solver is not blind-subagent"
        if r.get("key_exposed_to_solver") is not False:
            return "key_exposed_to_solver is not false"
        if r.get("inputs") not in RESOLVE_INPUTS:
            return f"inputs is not one of {', '.join(RESOLVE_INPUTS)}"
        return None

    def adjudication(self, live_id: str, sid: str | None) -> dict | None:
        """The latest adjudication of this question (adjudications.jsonl, later lines win)."""
        a = self.adjudications.get(live_id)
        return a if a and (sid is None or a.get("stable_question_id") == sid) else None

    def for_row(self, live_id: str, sid: str | None) -> list[tuple[str, str, str]]:
        """(solver_run, answer, where) of this question's re-solves; a line naming another stable id is left out."""
        return [(run, ans, where) for run, (ans, rsid, where) in sorted(self.by_id.get(live_id, {}).items())
                if sid is None or rsid == sid]
