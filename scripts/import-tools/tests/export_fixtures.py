"""Builds live-export documents (sql/live_export.sql shape) for tests."""

import json
from pathlib import Path

from kimport.export import fingerprint

EXPORTED_AT = "2026-10-20T12:00:00+00:00"


def export_doc(rows: list[dict], exported_at: str = EXPORTED_AT) -> dict:
    return {"exported_at": exported_at, "row_count": len(rows), "fingerprint": fingerprint(rows), "rows": rows}


def write_export(path: Path, rows: list[dict], exported_at: str = EXPORTED_AT) -> Path:
    path = Path(path)
    path.write_text(json.dumps(export_doc(rows, exported_at), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path
