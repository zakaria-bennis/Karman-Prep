"""Synthetic stage fixtures (ruling R2: made-up text, real structure).

stage_row() mirrors one row of ts/stage-rows.ts output (what importQuestion()
would send: question payload, choices, answer key, mirror update), and
write_batch_dir() lays out a batch folder like pipeline/batches/<name>/ (READY,
tag binding). db_snapshot() turns a staged row into the private-readback
snapshot the database would return after stage.sql ran.
"""

import hashlib
import json
from pathlib import Path

from tests.publish_fixtures import CREATED, MODULE, SECTION, SOURCE, _evidence, hexn, uid

BINDING = {"schema": "SYNTHETIC_BINDING_V1", "bindings": ["made-up"]}
BINDING_SHA = hashlib.sha256((json.dumps(BINDING) + "\n").encode()).hexdigest()


def stage_row(n: int, text: str, choices: dict | None = None, answer: str = "A", fmt: str = "multiple_choice",
              manifest: str = BINDING_SHA, **over) -> dict:
    if choices is None and fmt == "multiple_choice":
        choices = {"A": f"first {n}", "B": f"second {n}", "C": f"third {n}", "D": f"fourth {n}"}
    stable = f"2099-01_SYN_V1_RW_{MODULE}_Q{n:02d}"
    q = {
        "node_id": None, "question_text": text, "raw_question_text": f"Question {n}\n{text}",
        "verified_answer": answer, "question_type": "evidence_based", "difficulty": "foundational",
        "difficulty_level": 1, "answer_format": fmt, "correct_answer": answer,
        "numeric_tolerance": 0 if fmt == "numeric_entry" else None, "explanation_text": "Made-up explanation.",
        "explanation_per_choice": None, "hint": None, "subject": "reading", "topic_cluster": "Information & Ideas",
        "desmos_strategy": None, "passage_intro": None, "passage": None, "passage_a": None, "passage_b": None,
        "domain": "info_ideas", "concept_slug": None, "answer_source": "extracted", "source_pdf": "synthetic_exam.pdf",
        "source_page": 10 + n, "source_provider": None, "source_identity_required": True,
        "source_document_id": "2099-01_SYN_V1", "source_provider_version_id": None, "source_version": SOURCE,
        "source_section": SECTION, "source_module": MODULE, "source_question_number": n, "source_occurrence": n,
        "source_regions": [{"dpi": 110, "page": 10 + n, "crop_pixels": [0, 30, 1200, 900]}],
        "content_hash": None, "content_hash_v2": hexn(n, 1), "import_status": "needs_review",
        "import_flag_type": None, "import_flag_reason": "Synthetic private draft", "publish_status": "needs_human_review",
        "figure_kind": None, "figure_table_data": None, "image_url": None, "image_storage_path": None, "image_alt": None,
    }
    q.update(over)
    key = {
        "printed_answer": answer, "printed_answer_crossed_out": False, "manual_correction_present": False,
        "selected_official_answer": answer,
        "selection_reason": "preserved_printed_key_with_separate_independent_solution",
        "status": "printed_key_used_no_correction", "section": SECTION, "module": MODULE,
        "source_question_number": n, "source_version": SOURCE, "source_occurrence": n,
        "raw_model_response": {**_evidence(n, manifest), "stable_question_id": stable},
        "review_required": False, "review_reason": None,
    }
    rows = [{"letter": letter, "choice_text": t, "raw_choice_text": t, "choice_table_data": None,
             "is_correct": letter == answer} for letter, t in sorted((choices or {}).items())]
    return {"stable_question_id": stable, "question": q, "choices": rows, "key": key,
            "mirror": {"selected_official_answer": answer, "answer_key_status": "printed_key_used_no_correction"},
            "source_assets": []}


def rows_doc(rows: list[dict]) -> dict:
    return {"reviewed_json_sha256": "d" * 64, "source_pdf_sha256": SOURCE, "rows": rows}


def write_batch_dir(d: Path, name: str = "syn-1", tag_line: bool = True) -> Path:
    d = Path(d)
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{name}-tag-binding.json").write_text(json.dumps(BINDING) + "\n", encoding="utf-8")
    lines = [f"batch: {name} (2099-01_SYN_V1 RW {MODULE})",
             f"reviewed_file: {d / f'{name}-reviewed-import-ready.json'}",
             f"frozen_manifest: {d / f'{name}-frozen-inputs-import-ready.json'}",
             "frozen_manifest_sha256: " + "e" * 64]
    if tag_line:
        lines.append(f"tag_binding: {d / f'{name}-tag-binding.json'}")
    (d / "READY").write_text("\n".join(lines + ["row_count: 2", "notes: synthetic"]) + "\n", encoding="utf-8")
    return d


def db_snapshot(preview_row: dict, n: int) -> dict:
    """What readback.sql returns for a staged row once stage.sql has run."""
    p = preview_row["stage_payload"]
    qid = uid(n)
    question = {**{c: None for c in ("hint", "archived_at", "figure_svg", "figure_chart_data",
                                     "figure_graph_data", "figure_geometry_data")},
                **p["question"], **p["mirror"], "id": qid, "is_live": False, "archived_at": None,
                "created_at": CREATED, "updated_at": CREATED, "display_order": 0}
    choices = [{**c, "id": uid(n * 10 + i, 2), "question_id": qid} for i, c in enumerate(p["choices"])] or None
    key = {**p["key"], "id": uid(n, 1), "question_id": qid, "created_at": CREATED}
    return {"question": question, "choices": choices, "keys": [key]}


def fake_sealer(path: Path) -> list[dict]:
    """Stands in for ts/seal-readback.ts: a deterministic hash per row; publication allowed as the evidence says."""
    rows = json.loads(Path(path).read_text(encoding="utf-8"))["rows"]
    out = []
    for r in rows:
        q = r["snapshot"]["question"]
        ev = r["snapshot"]["keys"][0]["raw_model_response"]
        out.append({"question_id": q["id"], "stable_question_id": ev["approved_tags"]["stable_question_id"],
                    "source_version": q["source_version"], "content_hash_v2": q["content_hash_v2"],
                    "question_payload_sha256": hashlib.sha256(q["question_text"].encode()).hexdigest(),
                    "publication_allowed_in_snapshot": ev.get("student_publication_allowed") is True})
    return out
