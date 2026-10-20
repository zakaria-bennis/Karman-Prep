"""Batch-start lint: pull reviewed rows with one of five known mistakes.

Pulled rows go to the problem lane; the rest of the batch continues. Nothing
here reads the clock (callers pass `now`) and nothing edits question text.
"""

import hashlib
import json
import re
from pathlib import Path

from . import lane
from .evidence import needs_visual
from .normalize import NORMALIZER_VERSION

# Matches REVIEWED_DIFFICULTY_RUBRIC_VERSION in karman-release reviewed-difficulty.ts.
RUBRIC_VERSION = "karman-legacy-1-7-v1"
_KNOWN_FIGURE_FIELDS = ("figure_kind", "figure_table_data", "choice_tables")
_ASSET_KEY = re.compile(r"asset|image|figure", re.IGNORECASE)

LANE_REASON = {
    "PF_FIGURE": "extraction_repair",
    "PF_BINDING": "extraction_repair",
    "PF_DIFFICULTY": "classification_review",
    "PF_ENVELOPE": "classification_review",
    "PF_DEDUP_STALE": "variant_review",
}
_CODE_ORDER = ("PF_FIGURE", "PF_BINDING", "PF_ENVELOPE", "PF_DIFFICULTY", "PF_DEDUP_STALE")


def canonical_json(value) -> str:
    """Mirror canonicalJson in reviewed-input-hash.ts (sorted keys, no spaces)."""
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, float):
        if value != value or value in (float("inf"), float("-inf")):
            raise ValueError("row contains a non-JSON number")
        if value == int(value):
            return str(int(value))
        return repr(value)
    if isinstance(value, int):
        return str(value)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, list):
        return "[" + ",".join(canonical_json(v) for v in value) + "]"
    if isinstance(value, dict):
        # JS sorts keys by UTF-16 code units
        keys = sorted(value, key=lambda k: k.encode("utf-16-be"))
        return "{" + ",".join(json.dumps(k, ensure_ascii=False) + ":" + canonical_json(value[k]) for k in keys) + "}"
    raise ValueError("row contains a non-JSON value")


def row_sha256(row) -> str:
    return hashlib.sha256(canonical_json(row).encode("utf-8")).hexdigest()


def _has_asset(row: dict) -> bool:
    if row.get("choice_tables") not in (None, "", [], {}):
        return True
    for key, value in row.items():
        if key in _KNOWN_FIGURE_FIELDS or not _ASSET_KEY.search(key):
            continue
        if value not in (None, "", [], {}):
            return True
    return False


def _check_figure(row: dict) -> list[str]:
    kind = row.get("figure_kind")
    if kind not in (None, "table"):
        return [f"figure_kind {kind!r} is not null or table"]
    if kind == "table":
        if row.get("figure_table_data") in (None, "", [], {}):
            return ["figure_kind is table but figure_table_data is empty"]
        return []
    if row.get("figure_table_data") not in (None, "", [], {}) or _has_asset(row):
        return []
    phrase = needs_visual(str(row.get("question_text") or ""))
    if phrase:
        return [f"text refers to a visual ({phrase!r}) but the row has no reviewed asset"]
    return []


def _object(value):
    return value if isinstance(value, dict) else None


def _approved_tags(row: dict):
    ra = _object(row.get("reviewed_answer")) or {}
    evidence = _object(ra.get("evidence"))
    return ra, evidence


def _check_envelope(row: dict) -> list[str]:
    """Mirror readCatalogQuestionScope: evidence is an object holding approved_tags,
    and approved_tags may not also sit beside it (reviewed_answer or the row)."""
    ra, evidence = _approved_tags(row)
    if not ra:
        return ["reviewed_answer is missing"]
    if evidence is None:
        return ["reviewed_answer.evidence is missing"]
    if ra.get("approved_tags") is not None or row.get("approved_tags") is not None:
        return ["approved_tags is present at the top level as well (ambiguous)"]
    if not isinstance(evidence.get("approved_tags"), dict):
        return ["reviewed_answer.evidence.approved_tags is missing"]
    return []


def _check_binding(row: dict, pins: dict) -> list[str]:
    problems = []
    pin = pins.get(row.get("stable_question_id"))
    if pin is None:
        problems.append("row is not in the frozen manifest")
    else:
        try:
            if row_sha256(row) != pin.get("row_sha256"):
                problems.append("row_sha256 differs from the frozen manifest")
        except ValueError as e:
            problems.append(f"row cannot be hashed: {e}")
        version = _object(row.get("source_version")) or {}
        if version.get("content_sha256") != pin.get("content_sha256"):
            problems.append("content_sha256 differs from the frozen manifest")
        if version.get("student_content_sha256") != pin.get("student_content_sha256"):
            problems.append("student_content_sha256 differs from the frozen manifest")
    version = _object(row.get("source_version")) or {}
    if row.get("difficulty_content_sha256") != version.get("student_content_sha256"):
        problems.append("difficulty_content_sha256 differs from source_version.student_content_sha256")
    _, evidence = _approved_tags(row)
    tags = _object((evidence or {}).get("approved_tags")) or {}
    if not tags.get("tag_binding_manifest_sha256"):
        problems.append("approved_tags lacks tag_binding_manifest_sha256")
    return problems


def _check_difficulty(row: dict) -> list[str]:
    problems = []
    level = row.get("difficulty_level")
    if isinstance(level, bool) or not isinstance(level, int) or not 1 <= level <= 7:
        problems.append(f"difficulty_level {level!r} is not an integer 1 to 7")
    if row.get("difficulty_rubric_version") != RUBRIC_VERSION:
        problems.append(f"difficulty_rubric_version is not {RUBRIC_VERSION}")
    if row.get("difficulty_uncertain") is True:
        problems.append("difficulty_uncertain is true")
    rationale = row.get("difficulty_rationale")
    if not isinstance(rationale, str) or not rationale.strip():
        problems.append("difficulty_rationale is empty")
    return problems


def _check_dedup(row: dict, clusters: dict) -> list[str]:
    sid = row.get("stable_question_id")
    roles = _object(clusters.get("roles")) or {}
    if sid not in roles:
        return ["row has no cluster entry"]
    if roles[sid] != "canonical":
        return [f"cluster role is {roles[sid]!r}, not canonical"]
    return []


def _load(path: Path):
    return json.loads(Path(path).read_bytes().decode("utf-8"))


class LintError(ValueError):
    pass


def lint_batch(reviewed: Path, frozen: Path | None, clusters: Path) -> dict:
    """Return {"passed": [ids], "pulled": [{id, code, detail}]}. A row with several
    problems gets one pulled entry per code and is not in `passed`."""
    data = _load(reviewed)
    rows = data.get("questions") if isinstance(data, dict) else None
    if not isinstance(rows, list):
        raise LintError(f"{reviewed} has no 'questions' list")
    ids = []
    for i, row in enumerate(rows):
        sid = row.get("stable_question_id") if isinstance(row, dict) else None
        if not isinstance(sid, str) or not sid:
            raise LintError(f"row {i + 1} of {reviewed} has no stable_question_id")
        ids.append(sid)
    dupes = {i for i in ids if ids.count(i) > 1}
    pins = None
    if frozen is not None:
        manifest = _load(frozen)
        pin_rows = manifest.get("rows") if isinstance(manifest, dict) else None
        if not isinstance(pin_rows, list) or not all(
                isinstance(p, dict) and isinstance(p.get("stable_question_id"), str) for p in pin_rows):
            raise LintError(f"{frozen} is not a frozen manifest: needs rows, each with a stable_question_id")
        pins = {p["stable_question_id"]: p for p in pin_rows}
    cluster_data = _load(clusters)
    if cluster_data.get("normalizer_version") != NORMALIZER_VERSION:
        raise LintError(f"clusters were built with normalizer {cluster_data.get('normalizer_version')!r}, "
                        f"not {NORMALIZER_VERSION!r}: rebuild clusters")
    passed, pulled = [], []
    for row in rows:
        sid = row["stable_question_id"]
        binding = _check_binding(row, pins) if pins is not None else []
        if sid in dupes:
            binding.append("stable_question_id repeats within the batch")
        found = {
            "PF_FIGURE": _check_figure(row),
            "PF_ENVELOPE": _check_envelope(row),
            "PF_BINDING": binding,
            "PF_DIFFICULTY": _check_difficulty(row),
            "PF_DEDUP_STALE": _check_dedup(row, cluster_data),
        }
        hit = False
        for code in _CODE_ORDER:
            if found[code]:
                hit = True
                pulled.append({"id": sid, "code": code, "detail": "; ".join(found[code])})
        if not hit:
            passed.append(sid)
    return {"passed": passed, "pulled": pulled}


def write_lane(lane_path: Path, pulled: list, now: str) -> int:
    """Hand pulled rows to the problem lane (lane.add_open owns the file). A row with several
    problems becomes one entry: reason from its first code, detail listing every code."""
    by_id: dict = {}
    for p in pulled:
        by_id.setdefault(p["id"], []).append(p)
    entries = {}
    for sid, found in by_id.items():
        found.sort(key=lambda p: _CODE_ORDER.index(p["code"]))
        entries[sid] = (LANE_REASON[found[0]["code"]], " | ".join(f"{p['code']}: {p['detail']}" for p in found))
    return lane.add_open(lane_path, entries, now, "lint")


def run_lint(reviewed: Path, frozen: Path | None, clusters: Path, lane: Path, now: str) -> dict:
    result = lint_batch(reviewed, frozen, clusters)
    if result["pulled"]:
        write_lane(lane, result["pulled"], now)
    return {"passed": len(result["passed"]), "pulled_rows": len({p["id"] for p in result["pulled"]}),
            "pulled": result["pulled"]}
