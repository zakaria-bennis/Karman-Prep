"""Synthetic publish-batch fixtures (ruling R2: made-up text, real structure).

The dicts mirror the field layout of a real task-3 batch: the private readback
(`{"rows": [{"snapshot": {keys, choices, question}}]}`, every column of
quiz_questions / answer_key_entries / answer_choices as to_jsonb gives it), the
sealed preview (`{"source_pdf_sha256", "rows": [...]}`) and the live export
(sql/live_export.sql object, with the comparison_key column present).
"""

import json
import os
from pathlib import Path

from kimport.keys import comparison_key
from kimport.sweep import record_from_row
from tests.export_fixtures import EXPORTED_AT, write_export

SOURCE = "a" * 64
MANIFEST = "b" * 64
CREATED = "2026-10-16T10:31:15.303374+00:00"
SECTION, MODULE = "reading", "M2"


def uid(n: int, kind: int = 0) -> str:
    return f"00000000-0000-4000-8{kind:03d}-{n:012d}"


def hexn(n: int, salt: int = 0) -> str:
    return f"{salt:08x}{n:056x}"


def question(n: int, text: str, choices: dict | None, answer: str, figure_kind=None, table=None,
             fmt: str = "multiple_choice", **over) -> dict:
    q = {
        "id": uid(n), "hint": None, "domain": "info_ideas", "is_live": False, "node_id": None,
        "passage": None, "subject": "reading", "image_alt": None, "image_url": None, "passage_a": None,
        "passage_b": None, "created_at": CREATED, "difficulty": "foundational", "figure_svg": None,
        "flag_count": 0, "is_flagged": False, "source_pdf": "synthetic_exam.pdf", "updated_at": CREATED,
        "archived_at": None, "figure_kind": figure_kind, "source_page": 10 + n, "concept_slug": None,
        "content_hash": None, "grader_votes": None, "answer_format": fmt, "answer_source": "extracted",
        "display_order": 0, "import_status": "needs_review", "passage_intro": None, "question_bbox": None,
        "question_text": text, "question_type": "evidence_based", "source_module": MODULE,
        "topic_cluster": "Information & Ideas", "correct_answer": answer, "explanation_v2": None,
        "figure_quality": None, "publish_status": "needs_human_review",
        "source_regions": [{"dpi": 110, "page": 10 + n, "crop_pixels": [0, 30, 1200, 900]}],
        "source_section": SECTION, "source_version": SOURCE, "content_hash_v2": hexn(n, 1),
        "desmos_strategy": None, "source_provider": None, "verified_answer": answer, "difficulty_level": 1,
        "dispute_category": None, "explanation_text": "Made-up explanation.", "import_flag_type": None,
        "answer_key_status": "printed_key_used_no_correction", "figure_chart_data": None,
        "figure_graph_data": None, "figure_table_data": table, "numeric_tolerance": None,
        "raw_question_text": text, "source_occurrence": n, "answer_verified_at": None,
        "calculator_sources": None, "image_storage_path": None,
        "import_flag_reason": "Synthetic batch private stage", "source_document_id": "2099-01_SYN_V1",
        "figure_geometry_data": None, "math_notation_status": None, "explanation_v2_status": None,
        "explanation_per_choice": None, "source_question_number": n, "answer_verifier_version": None,
        "figure_extraction_model": None, "explanation_v2_filled_at": None, "math_notation_checked_at": None,
        "question_bbox_confidence": None, "selected_official_answer": answer, "source_identity_required": True,
        "suggested_verified_answer": None, "answer_verification_status": None,
        "source_assets_processed_at": None, "source_provider_version_id": None,
        "question_bbox_source_asset_id": None, "source_assets_processed_status": None,
        "comparison_key": None,
    }
    q.update(over)
    return q


def _evidence(n: int, manifest: str) -> dict:
    stable = f"2099-01_SYN_V1_RW_{MODULE}_Q{n:02d}"
    return {
        "schema": "SYNTHETIC_PRIVATE_V1", "question_id": stable,
        "approved_tags": {
            "skill_label": "Command of Evidence", "domain_label": "Information and Ideas",
            "content_sha256": hexn(n, 2), "schema_version": 1,
            "catalog_skill_id": "rw-skill-command-of-evidence", "pilot_row_sha256": hexn(n, 3),
            "catalog_domain_id": "info_ideas", "stable_question_id": stable,
            "student_content_sha256": hexn(n, 4), "tag_binding_manifest_sha256": manifest,
        },
        "B_package_sha256": hexn(n, 2), "B_student_sha256": hexn(n, 4), "B_teacher_sha256": hexn(n, 5),
        "D_original_record": {"uncertain": False, "content_sha256": hexn(n, 2), "difficulty_level": 1,
                              "selectable_skill": "Command of Evidence", "stable_question_id": stable,
                              "original_png_sha256": hexn(n, 6), "student_content_sha256": hexn(n, 4),
                              "selectable_for_downstream": True},
        "source_pdf_sha256": SOURCE, "stable_question_id": stable, "original_png_sha256": hexn(n, 6),
        "source_review_sha256": hexn(n, 7), "CF_scoped_source_review": "Synthetic scoped review note.",
        "student_publication_allowed": False,
    }


def snapshot(n: int, text: str, choices: dict | None = None, answer: str = "A", figure_kind=None, table=None,
             fmt: str = "multiple_choice", manifest: str = MANIFEST, **over) -> dict:
    """One private-readback row: {"keys", "choices", "question"} like to_jsonb gives it."""
    if choices is None and fmt == "multiple_choice":
        choices = {"A": f"first {n}", "B": f"second {n}", "C": f"third {n}", "D": f"fourth {n}"}
    q = question(n, text, choices, answer, figure_kind, table, fmt, **over)
    key = {
        "id": uid(n, 1), "module": MODULE, "status": "printed_key_used_no_correction", "section": SECTION,
        "created_at": CREATED, "answer_mode": None, "question_id": q["id"], "review_reason": None,
        "printed_answer": answer, "source_version": SOURCE, "answer_key_bbox": None, "answer_key_page": None,
        "review_required": False, "selection_reason": "preserved_printed_key_with_separate_independent_solution",
        "source_occurrence": n, "acceptable_answers": None, "raw_model_response": _evidence(n, manifest),
        "answer_key_crop_path": None, "source_question_number": n, "manual_correction_color": None,
        "manual_correction_answer": None, "selected_official_answer": answer, "answer_equivalence_status": None,
        "manual_correction_present": False, "printed_answer_confidence": None, "correction_detection_model": None,
        "printed_answer_crossed_out": False, "manual_correction_confidence": None,
        "correction_detection_provider": None, "selected_official_answer_confidence": None,
        "printed_answer_crossed_out_confidence": None,
    }
    rows = None
    if choices:
        rows = [{"id": uid(n * 10 + i, 2), "letter": letter, "is_correct": letter == answer, "choice_text": t,
                 "question_id": q["id"], "raw_choice_text": t, "choice_table_data": None}
                for i, (letter, t) in enumerate(sorted(choices.items()))]
    return {"keys": [key], "choices": rows, "question": q}


def sealed(snap: dict) -> dict:
    q, ev = snap["question"], snap["keys"][0]["raw_model_response"]
    choices = {c["letter"]: c["choice_text"] for c in snap["choices"] or []}
    n = q["source_question_number"]
    return {
        "stable_question_id": ev["stable_question_id"], "source_pdf": q["source_pdf"],
        "source_version": q["source_version"], "source_section": q["source_section"],
        "source_module": q["source_module"], "source_question_number": n,
        "source_occurrence": q["source_occurrence"], "source_page": q["source_page"],
        "source_document_id": q["source_document_id"], "source_regions": q["source_regions"],
        "question_text": q["question_text"], "raw_question_text": q["raw_question_text"],
        "passage_intro": None, "passage": None, "passage_a": None, "passage_b": None,
        "correct_answer": q["correct_answer"], "explanation_text": q["explanation_text"],
        "explanation_per_choice": None, "raw_choice_texts": choices or None, "choices": choices or None,
        "figure_kind": q["figure_kind"], "figure_table_data": q["figure_table_data"], "domain": q["domain"],
        "topic_cluster": q["topic_cluster"], "concept_slug": None, "subject": q["subject"],
        "question_type": q["question_type"], "answer_format": q["answer_format"], "difficulty": q["difficulty"],
        "difficulty_level": q["difficulty_level"], "content_hash_v2": q["content_hash_v2"],
        "printed_answer": q["correct_answer"], "independently_verified_answer": q["correct_answer"],
        "answer_evidence": json.loads(json.dumps(ev)), "question_payload_sha256": hexn(n, 9),
    }


def export_row(snap: dict, **over) -> dict:
    """The live_export.sql row for a readback snapshot (staged, not live); its
    comparison_key is the readback's unless overridden."""
    q = snap["question"]
    row = {
        "id": q["id"], "question_text": q["question_text"], "correct_answer": q["correct_answer"],
        "question_format": q["answer_format"], "figure_kind": q["figure_kind"],
        "figure_table_data": q["figure_table_data"], "publish_status": q["publish_status"],
        "import_status": q["import_status"], "import_flag_reason": q["import_flag_reason"],
        "is_live": q["is_live"], "archived_at": q["archived_at"], "source_version": q["source_version"],
        "source_section": q["source_section"], "source_module": q["source_module"],
        "source_question_number": q["source_question_number"], "content_hash_v2": q["content_hash_v2"],
        "created_at": q["created_at"],
        "choices": [{"letter": c["letter"], "choice_text": c["choice_text"]} for c in snap["choices"] or []],
        "raw_model_response": snap["keys"][0]["raw_model_response"], "answer_key_count": 1,
        "comparison_key": q.get("comparison_key"),
    }
    row.update(over)
    return row


_COMPUTE = object()


def live_row(n: int, text: str, choices: dict, answer: str = "A", comparison_key=_COMPUTE, **over) -> dict:
    """An unrelated live bank row in export shape, keyed as the backfill would key it."""
    row = {
        "id": uid(n, 3), "question_text": text, "correct_answer": answer, "question_format": "multiple_choice",
        "figure_kind": None, "figure_table_data": None, "publish_status": "publish_ready", "import_status": "ok",
        "import_flag_reason": None, "is_live": True, "archived_at": None, "source_version": "c" * 64,
        "source_section": SECTION, "source_module": "M1", "source_question_number": n,
        "content_hash_v2": hexn(n, 8), "created_at": "2026-09-01T09:00:00+00:00",
        "choices": [{"letter": k, "choice_text": v} for k, v in sorted(choices.items())],
        "raw_model_response": {"student_publication_allowed": True}, "answer_key_count": 1,
        "comparison_key": None,
    }
    row.update(over)
    row["comparison_key"] = keyed(row) if comparison_key is _COMPUTE else comparison_key
    return row


def keyed(row: dict) -> str:
    return comparison_key(record_from_row(row))


def write_batch(d: Path, snaps: list[dict], export_rows: list[dict], seals: list[dict] | None = None,
                export_age: int = 10, exported_at: str = EXPORTED_AT) -> dict:
    """Write readback, sealed preview, export and an empty intent log; the export
    is `export_age` seconds newer than the readback (negative: older)."""
    d = Path(d)
    paths = {name: d / f"syn-{name}.json" for name in ("readback", "sealed", "export")}
    paths["intents"] = d / "intents.jsonl"
    paths["readback"].write_text(json.dumps({"rows": [{"snapshot": s} for s in snaps]}), encoding="utf-8")
    paths["sealed"].write_text(json.dumps({"source_pdf_sha256": SOURCE,
                                           "rows": seals if seals is not None else [sealed(s) for s in snaps]}),
                               encoding="utf-8")
    write_export(paths["export"], export_rows, exported_at)
    base = 1_800_000_000
    os.utime(paths["readback"], (base, base))
    os.utime(paths["sealed"], (base, base))
    os.utime(paths["export"], (base + export_age, base + export_age))
    return paths


TABLE = {"caption": "Made-up yearly counts", "header_row": ["Town", "Year"],
         "rows": [["Alder", "1901"], ["Birch", "1902"], ["Cedar", "1903"]]}


def table_snapshot(n: int = 11) -> dict:
    """A one-row MC table question shaped like the Oct 16 native-table batch."""
    return snapshot(n, "Which year in the made-up table completes the example about Alder?",
                    {"A": "1901", "B": "1905", "C": "1910", "D": "1899"}, "A", figure_kind="table", table=TABLE)
