"""comparison_key backfill: guarded SQL that fills quiz_questions.comparison_key.

Input is the live export (sql/live_export.sql). Nothing here connects to a
database; the SQL is text for a human-approved run. Each row is keyed only if
it still has the exported content_hash_v2, and only while its key is NULL, so a
row edited since the export, or one already keyed, is skipped and never
overwritten. Rows whose answer key is broken or whose format disagrees with
having choices cannot be keyed from the export and are listed in a comment.
"""

from pathlib import Path

from kimport.keys import comparison_key
from kimport.normalize import NORMALIZER_VERSION
from kimport.sqlutil import lit, uuid_literal

CHUNK = 500


def _value(r, row: dict) -> str:
    return f"({lit(uuid_literal(r.ref))}::uuid, {lit(comparison_key(r))}::text, {lit(row.get('content_hash_v2'))}::text)"


def backfill_sql(records, export_by_id: dict[str, dict]) -> str:
    keyable, broken, mismatch = [], 0, 0
    for r in records:
        if r.meta.get("format_problem"):
            mismatch += 1
        elif r.meta.get("answer_problem"):
            broken += 1
        else:
            row = export_by_id.get(r.ref)
            if row is None:
                raise ValueError(f"{r.ref}: not in the export")
            keyable.append((r, row))
    out = [
        f"-- kimport backfill: comparison_key for {len(keyable)} rows. Normalizer {NORMALIZER_VERSION}.",
        "-- Needs the founder's go-ahead and migration 20261021000000 applied first.",
        "-- A row is keyed only if its content_hash_v2 still matches the export and its key is NULL.",
        "BEGIN;",
        "",
    ]
    for i in range(0, len(keyable), CHUNK):
        values = ",\n  ".join(_value(r, row) for r, row in keyable[i:i + CHUNK])
        out += [
            "UPDATE public.quiz_questions q SET comparison_key = v.key",
            f"FROM (VALUES\n  {values}\n) AS v(id, key, hash)",
            "WHERE q.id = v.id AND q.content_hash_v2 IS NOT DISTINCT FROM v.hash AND q.comparison_key IS NULL;",
            "",
        ]
    out += [
        "-- Rows still without a key (changed since the export, or skipped below):",
        "SELECT count(*) AS rows_still_null FROM public.quiz_questions WHERE comparison_key IS NULL;",
        "",
        "COMMIT;",
        f"-- skipped: {broken} broken answer key, {mismatch} format mismatch (not keyed; see the sweep report)",
        "",
    ]
    return "\n".join(out)


def run_backfill(export_path: Path, out_path: Path) -> dict:
    from kimport.sweep import export_by_id, read_export, record_from_row

    rows = read_export(export_path)
    records = [record_from_row(r) for r in rows]
    sql = backfill_sql(records, export_by_id(rows))
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(sql, encoding="utf-8")
    skipped = sum(1 for r in records if r.meta.get("format_problem") or r.meta.get("answer_problem"))
    return {"keyed": len(records) - skipped, "skipped": skipped}
