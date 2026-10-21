"""Figure lane work queue: `k figures slice | submit | rework | status`.

`pipeline/figures/<occurrence id>/` holds one figure question:
  original.png  the source question crop (copied from its B question package)
  figure.json   the figure fields as the quiz engine reads them, plus the stem,
                choices and answer so the review page renders the whole question
  status.json   {occurrence_id, status, round, claimed_by, submitted_file_sha256,
                 approved_file_sha256, history: [{at, decision, note, by}]}

Statuses: drafting (a reviewer has it) -> ready_for_founder (submitted) ->
approved | rejected (the founder, in /dev/figure-review). A rejected item goes
back to its reviewer through `rework`; submitting it again opens round + 1.
A folder is the claim: slice never hands out an id (or another copy in the same
figure_review group) that already has a folder, whatever its status.

The review page writes status.json too (atomically, after checking the file did
not change under it); here every read-modify-write holds a FileLock.
"""

import shutil
from pathlib import Path

from . import figure_gate as fg
from .jsonio import FileLock, atomic_write_json, load_json

B_ROOT = Path("/Users/zakariabennis/Documents/Codex/2026-10-05/task-3/agent-b-output/revisions")
SLICE_SIZE = 10
FIGURE_STATUS = "figure_review"  # clusters.json status of a group grouped by text only, with a figure


def _folders(figures_dir: Path):
    figures_dir = Path(figures_dir)
    if not figures_dir.is_dir():
        return
    for d in sorted(figures_dir.iterdir()):
        if d.is_dir() and fg.ID.fullmatch(d.name):
            yield d


def _write_status(folder: Path, status: dict) -> None:
    atomic_write_json(Path(folder) / fg.STATUS_FILE, status)


def _event(now: str, decision: str, by: str, note: str = "") -> dict:
    return {"at": now, "decision": decision, "note": note, "by": by}


# ---------------------------------------------------------------- slice


def _skeleton(occ_id: str) -> dict:
    return {"schema": fg.SCHEMA, "occurrence_id": occ_id, "figure_kind": None, "figure_table_data": None,
            "figure_chart_data": None, "figure_geometry_data": None, "figure_svg": None, "image_alt": None,
            "subject": None, "topic_cluster": None, "passage_intro": None, "passage": None,
            "question_text": "", "answer_format": "multiple_choice",
            "answer_choices": [{"letter": letter, "choice_text": "", "choice_table_data": None}
                               for letter in "ABCD"],
            "correct_answer": None, "notes": ""}


def find_original(entry: dict, b_root: Path, new_exam_packages: Path) -> Path | None:
    """The question's source crop: its B package original.png (readiness ledger, or a new-exam
    package), else the new-exam crop; only a file whose sha256 is the ledger's A_png_sha256."""
    occ, exam, ver, cat = entry.get("id"), entry.get("exam"), entry.get("B_output_version"), entry.get("B_category")
    paths = []
    if exam and ver and cat:
        paths += [Path(b_root) / exam / ver / cat / occ / fg.ORIGINAL_FILE,
                  Path(new_exam_packages) / exam / ver / cat / occ / fg.ORIGINAL_FILE]
    crop = (entry.get("new_exam_record") or {}).get("crop_png")
    if crop:
        paths.append(Path(crop))
    want = entry.get("A_png_sha256")
    for p in paths:
        if p.is_file() and (not want or fg.file_sha256(p) == want):
            return p
    return None


def candidates(clusters_path: Path, lane_path: Path, ledger: dict) -> list[tuple[str, list[str]]]:
    """(representative id, every id in its group) for each figure question still to build:
    one copy per not-live figure_review group (printed key first, then fewest holds, then
    source order), plus open needs_figure lane items outside those groups. Copies that are
    live, ruled out, or open / parked in the lane for another reason are never picked."""
    from .lane import _is_live, _read_lane, _ruled_out, live_ids, parse_id
    doc = load_json(clusters_path)
    items = _read_lane(lane_path)["items"]
    live = live_ids(lane_path)
    other_hold = {i for i, it in items.items() if it.get("status") in ("open", "parked")
                  and it.get("reason") != "needs_figure"}

    def ok(occ):
        e = ledger.get(occ)
        return e is not None and not _is_live(e) and not _ruled_out(e) and occ not in live and occ not in other_hold

    out, seen = [], set()
    for c in doc.get("clusters", []):
        if c.get("status") != FIGURE_STATUS or c.get("is_live"):
            continue
        ids = [m["id"] for m in c.get("members", [])]
        seen.update(ids)
        good = [m for m in c.get("members", []) if ok(m["id"])]
        if good:
            best = min(good, key=lambda m: (not m.get("printed_key"), int(m.get("holds") or 0), parse_id(m["id"])))
            out.append((best["id"], ids))
    for occ, it in items.items():
        if it.get("reason") == "needs_figure" and it.get("status") == "open" and occ not in seen and ok(occ):
            out.append((occ, [occ]))
    out.sort(key=lambda x: parse_id(x[0]))
    return out


def next_slice(figures_dir: Path, clusters_path: Path, lane_path: Path, ledger_path: Path, reviewer: str,
               now: str, size: int = SLICE_SIZE, extra_ledgers=None, b_root: Path = B_ROOT) -> list[dict]:
    """Hand `reviewer` up to `size` figure questions: make each folder with original.png, a
    figure.json skeleton and status drafting. Returns [{id, folder, original}] (original None
    when no source crop with the ledger's hash was found)."""
    from .corpus_load import ledger_entries
    from .lane import _extra_ledgers
    if size < 1:
        raise ValueError("size must be at least 1")
    if not reviewer or not fg.ID.fullmatch(reviewer):
        raise ValueError("--reviewer must be a short name (letters, digits, dashes, underscores)")
    figures_dir = Path(figures_dir)
    figures_dir.mkdir(parents=True, exist_ok=True)
    ledger = ledger_entries(ledger_path, _extra_ledgers(extra_ledgers, Path(clusters_path).parent))
    packages = Path(lane_path).parent / "new-exams" / "packages"
    picked = []
    with FileLock(figures_dir / "queue"):
        taken = {d.name for d in _folders(figures_dir)}
        for occ, group in candidates(clusters_path, lane_path, ledger):
            if len(picked) >= size:
                break
            if not fg.ID.fullmatch(occ) or taken.intersection(group):
                continue
            folder = figures_dir / occ
            folder.mkdir()
            src = find_original(ledger[occ], b_root, packages)
            if src is not None:
                shutil.copyfile(src, folder / fg.ORIGINAL_FILE)
            atomic_write_json(folder / fg.FIGURE_FILE, _skeleton(occ))
            _write_status(folder, {"occurrence_id": occ, "status": "drafting", "round": 1, "claimed_by": reviewer,
                                   "group": group, "original_source": str(src) if src else None,
                                   "original_sha256": fg.file_sha256(folder / fg.ORIGINAL_FILE) if src else None,
                                   "submitted_file_sha256": None, "approved_file_sha256": None,
                                   "history": [_event(now, "sliced", reviewer,
                                                      "" if src else "no source crop found: add original.png")]})
            taken.update(group)
            picked.append({"id": occ, "folder": str(folder), "original": str(src) if src else None})
    return picked


# ---------------------------------------------------------------- submit, rework, status


def submit(figures_dir: Path, occ_id: str, by: str, now: str) -> dict:
    """Check figure.json renders in the quiz to the pilot standard, then set ready_for_founder.
    A rejected item comes back as round + 1. Raises ValueError listing every problem."""
    folder = Path(figures_dir) / fg.check_id(occ_id)
    status_path = folder / fg.STATUS_FILE
    if not status_path.is_file():
        raise ValueError(f"{occ_id} is not in the figure queue (no {status_path}); take it with k figures slice")
    with FileLock(status_path):
        status = load_json(status_path)
        state = status.get("status")
        if state == "approved":
            raise ValueError(f"{occ_id} is already approved; an approved figure is not changed")
        if state not in ("drafting", "rejected", "ready_for_founder"):
            raise ValueError(f"{occ_id} has an unknown status {state!r}")
        if not (folder / fg.ORIGINAL_FILE).is_file():
            raise ValueError(f"{occ_id}: no original.png; the founder compares against it, so add the source crop")
        try:
            doc = load_json(folder / fg.FIGURE_FILE)
        except (OSError, ValueError) as e:
            raise ValueError(f"{occ_id}: cannot read figure.json: {e}") from None
        problems = fg.validate_figure(doc, occ_id)
        if problems:
            raise ValueError(f"{occ_id}: figure.json is not ready:\n  - " + "\n  - ".join(problems))
        if state == "rejected":
            status["round"] = int(status.get("round") or 1) + 1
        status.update({"status": "ready_for_founder", "submitted_file_sha256": fg.file_sha256(folder / fg.FIGURE_FILE),
                       "submitted_at": now, "approved_file_sha256": None})
        status["history"] = list(status.get("history", [])) + [
            _event(now, "submitted", by, str(doc.get("notes") or ""))]
        _write_status(folder, status)
        return status


def last_note(status: dict, decision: str = "rejected") -> str:
    for h in reversed(status.get("history", [])):
        if h.get("decision") == decision:
            return h.get("note") or ""
    return ""


def rework(figures_dir: Path, reviewer: str | None = None) -> list[dict]:
    """Rejected figures with the founder's note, oldest rejection first (optionally one reviewer's)."""
    out = []
    for d in _folders(figures_dir):
        s = fg.read_status(d)
        if not s or s.get("status") != "rejected" or (reviewer and s.get("claimed_by") != reviewer):
            continue
        at = next((h.get("at") for h in reversed(s.get("history", [])) if h.get("decision") == "rejected"), "")
        out.append({"id": d.name, "round": s.get("round"), "claimed_by": s.get("claimed_by"), "rejected_at": at,
                    "note": last_note(s), "folder": str(d)})
    return sorted(out, key=lambda x: (x["rejected_at"] or "", x["id"]))


def summary(figures_dir: Path) -> dict:
    counts = {s: 0 for s in fg.STATUSES}
    drafting: dict[str, int] = {}
    for d in _folders(figures_dir):
        s = fg.read_status(d) or {}
        state = s.get("status")
        counts[state] = counts.get(state, 0) + 1
        if state == "drafting":
            drafting[s.get("claimed_by") or "?"] = drafting.get(s.get("claimed_by") or "?", 0) + 1
    return {"counts": counts, "drafting_by_reviewer": drafting, "total": sum(counts.values())}
