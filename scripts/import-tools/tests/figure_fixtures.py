"""Synthetic figure-lane fixtures: approve a figure exactly as the founder's review page would
(status.json approved, approved_file_sha256 = sha256 of the figure.json bytes he saw)."""

import json
from pathlib import Path

from kimport import figure_gate as fg

AT = "2026-10-21T12:00:00Z"


def figure_doc(occ_id: str, row: dict) -> dict:
    """A figure.json carrying exactly `row`'s figure fields (any row shape) and a made-up stem."""
    nested = isinstance(row.get("question"), dict)
    q = row["question"] if nested else row
    choices = row.get("choices") if nested else None
    tables = fg.figure_fields(row)["choice_tables"] or {}
    letters = [c.get("letter") for c in choices] if choices else ["A", "B", "C", "D"]
    return {"schema": fg.SCHEMA, "occurrence_id": occ_id, **{f: q.get(f) for f in fg.FIELDS},
            "subject": "math", "topic_cluster": None, "question_text": q.get("question_text") or "Made-up stem?",
            "answer_format": "multiple_choice",
            "answer_choices": [{"letter": letter, "choice_text": f"choice {letter}",
                                "choice_table_data": tables.get(letter)} for letter in letters],
            "correct_answer": "A", "notes": ""}


def write_figure(figures_dir: Path, occ_id: str, doc: dict, status: str = "approved", round_: int = 1,
                 approved_sha: str | None = "auto") -> Path:
    folder = Path(figures_dir) / occ_id
    folder.mkdir(parents=True, exist_ok=True)
    (folder / fg.FIGURE_FILE).write_text(json.dumps(doc, indent=1), encoding="utf-8")
    (folder / fg.ORIGINAL_FILE).write_bytes(b"\x89PNG synthetic")
    sha = fg.file_sha256(folder / fg.FIGURE_FILE)
    history = [{"at": AT, "decision": "submitted", "note": "", "by": "r9"}]
    if status in ("approved", "rejected"):
        history.append({"at": AT, "decision": status, "note": "", "by": "founder"})
    (folder / fg.STATUS_FILE).write_text(json.dumps({
        "occurrence_id": occ_id, "status": status, "round": round_, "claimed_by": "r9",
        "submitted_file_sha256": sha, "approved_file_sha256": (sha if approved_sha == "auto" else approved_sha)
        if status == "approved" else None, "history": history}), encoding="utf-8")
    return folder


def approve_like(figures_dir: Path, occ_id: str, row: dict) -> Path:
    return write_figure(figures_dir, occ_id, figure_doc(occ_id, row))
