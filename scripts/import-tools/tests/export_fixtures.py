"""Builds live-export documents (sql/live_export.sql shape) for tests."""

import json
from pathlib import Path

from kimport.export import ROW_FIELDS, fingerprint

EXPORTED_AT = "2026-10-20T12:00:00+00:00"


def current_shape(rows: list[dict]) -> list[dict]:
    """Rows as the current sql/live_export.sql returns them: every figure-presence
    and passage field present (null unless the test set it)."""
    out = []
    for r in rows:
        r = {**{f: None for f in ROW_FIELDS}, **r}
        if r.get("choices"):
            r["choices"] = [{"choice_table_data": None, **c} for c in r["choices"]]
        out.append(r)
    return out


def export_doc(rows: list[dict], exported_at: str = EXPORTED_AT) -> dict:
    rows = current_shape(rows)
    return {"exported_at": exported_at, "row_count": len(rows), "fingerprint": fingerprint(rows), "rows": rows}


def write_export(path: Path, rows: list[dict], exported_at: str = EXPORTED_AT) -> Path:
    path = Path(path)
    path.write_text(json.dumps(export_doc(rows, exported_at), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path
