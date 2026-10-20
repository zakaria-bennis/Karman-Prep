"""The one reader for the live export (sql/live_export.sql).

The export is ONE JSON object: {"exported_at", "row_count", "fingerprint",
"rows"}. `fingerprint` is computed by the database in the same statement as
the rows (FINGERPRINT_SQL) and recomputed here from the rows, so a hand-edited
or truncated file is rejected. The publish SQL recomputes it at run time and
stops if the bank changed since the export.

quiz_questions.updated_at has a default but no update trigger, so it is not a
reliable change signal; the fingerprint hashes the fields that matter instead.
comparison_key is read through to_jsonb(q) so the query also runs before
migration 20261021000000 (the field is then '' in the fingerprint and absent
from the rows).
"""

import hashlib
import json
import re
from pathlib import Path
from typing import NamedTuple

# Kept byte-identical in sql/live_export.sql (test_export checks it).
FINGERPRINT_SQL = (
    "md5(coalesce(string_agg(q.id::text||':'||coalesce(q.content_hash_v2::text,'')||':'"
    "||coalesce(q.publish_status::text,'')||':'||coalesce(q.import_status::text,'')||':'"
    "||coalesce(to_jsonb(q)->>'comparison_key',''), ',' ORDER BY q.id),''))"
)
_FIELDS = ("content_hash_v2", "publish_status", "import_status", "comparison_key")
_MD5 = re.compile(r"[0-9a-f]{32}")
_DOC_KEYS = {"exported_at", "row_count", "fingerprint", "rows"}


class ExportDoc(NamedTuple):
    rows: list[dict]
    exported_at: str
    row_count: int
    fingerprint: str


def fingerprint(rows: list[dict]) -> str:
    """Python twin of FINGERPRINT_SQL (uuid order equals lowercase text order)."""
    def part(r):
        return ":".join([str(r["id"])] + ["" if r.get(f) is None else str(r.get(f)) for f in _FIELDS])
    return hashlib.md5(",".join(part(r) for r in sorted(rows, key=lambda r: str(r["id"]))).encode("utf-8")).hexdigest()


def _unwrap(data):
    """Accept the export object, or a connector result row wrapping it."""
    if isinstance(data, str):
        data = json.loads(data)
    if isinstance(data, dict) and len(data) == 1 and not _DOC_KEYS & set(data):
        return _unwrap(next(iter(data.values())))
    if isinstance(data, list) and len(data) == 1 and isinstance(data[0], dict) and len(data[0]) == 1:
        return _unwrap(next(iter(data[0].values())))
    return data


def read_export_doc(path: Path) -> ExportDoc:
    doc = _unwrap(json.loads(Path(path).read_text(encoding="utf-8")))
    if not isinstance(doc, dict) or set(doc) != _DOC_KEYS:
        raise ValueError(f"{path}: not a sql/live_export.sql result (expected one object with exported_at, "
                         "row_count, fingerprint and rows); run sql/live_export.sql again")
    rows = doc["rows"]
    if not isinstance(rows, list) or not all(isinstance(r, dict) and "id" in r for r in rows):
        raise ValueError(f"{path}: export rows must be objects with an id")
    seen: dict = {}
    for r in rows:
        seen[r["id"]] = seen.get(r["id"], 0) + 1
    dupes = sorted(i for i, n in seen.items() if n > 1)
    if dupes:
        raise ValueError(f"{path}: ids repeated in export: {', '.join(dupes[:5])}")
    if doc["row_count"] != len(rows):
        raise ValueError(f"{path}: row_count {doc['row_count']} but {len(rows)} rows (truncated export?)")
    if not isinstance(doc["fingerprint"], str) or not _MD5.fullmatch(doc["fingerprint"]):
        raise ValueError(f"{path}: fingerprint is not an md5 hex string")
    if fingerprint(rows) != doc["fingerprint"]:
        raise ValueError(f"{path}: rows do not match the export fingerprint (file edited or cut?)")
    if not isinstance(doc["exported_at"], str) or not doc["exported_at"]:
        raise ValueError(f"{path}: exported_at missing")
    return ExportDoc(rows, doc["exported_at"], doc["row_count"], doc["fingerprint"])


def read_export(path: Path) -> list[dict]:
    return read_export_doc(path).rows


def export_by_id(rows: list[dict]) -> dict[str, dict]:
    return {r["id"]: r for r in rows}
