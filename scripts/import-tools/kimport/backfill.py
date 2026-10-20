"""comparison_key backfill: guarded SQL that fills quiz_questions.comparison_key.

Input is the live export (sql/live_export.sql). Nothing here connects to a
database; the SQL is text for a human-approved run. Each row is keyed only if
it still has the exported content_hash_v2, and only while its key is NULL, so a
row edited since the export, or one already keyed, is skipped and never
overwritten. Rows whose answer key is broken, whose format disagrees with having
choices, or whose figure is an image (not in the key) are not keyed; a comment counts them.
"""

import json
from pathlib import Path

from kimport.keys import comparison_key
from kimport.normalize import NORMALIZER_VERSION
from kimport.sqlutil import lit, uuid_literal

CHUNK = 500


def _value(r, row: dict) -> str:
    table = row.get("figure_table_data")
    table_sql = "NULL::jsonb" if table is None else f"{lit(json.dumps(table, ensure_ascii=False))}::jsonb"
    return (f"({lit(uuid_literal(r.ref))}::uuid, {lit(comparison_key(r))}::text, "
            f"{lit(row.get('content_hash_v2'))}::text, {lit(row.get('correct_answer'))}::text, {table_sql})")


def backfill_sql(records, export_by_id: dict[str, dict]) -> str:
    keyable, broken, mismatch, figures = [], 0, 0, 0
    for r in records:
        if r.meta.get("format_problem"):
            mismatch += 1
        elif r.meta.get("answer_problem"):
            broken += 1
        elif r.meta.get("figure_unkeyable"):
            figures += 1
        else:
            row = export_by_id.get(r.ref)
            if row is None:
                raise ValueError(f"{r.ref}: not in the export")
            keyable.append((r, row))
    out = [
        f"-- kimport backfill: comparison_key for {len(keyable)} rows. Normalizer {NORMALIZER_VERSION}.",
        "-- Needs the founder's go-ahead and migration 20261021000000 applied first.",
        "-- A row is keyed only if its content_hash_v2, correct_answer and figure_table_data still match the export and its key is NULL.",
        "BEGIN;",
        "",
    ]
    for i in range(0, len(keyable), CHUNK):
        values = ",\n  ".join(_value(r, row) for r, row in keyable[i:i + CHUNK])
        out += [
            "UPDATE public.quiz_questions q SET comparison_key = v.key",
            f"FROM (VALUES\n  {values}\n) AS v(id, key, hash, answer, tbl)",
            "WHERE q.id = v.id AND q.content_hash_v2 IS NOT DISTINCT FROM v.hash",
            "  AND q.correct_answer IS NOT DISTINCT FROM v.answer AND q.figure_table_data IS NOT DISTINCT FROM v.tbl",
            "  AND q.comparison_key IS NULL;",
            "",
        ]
    out += [
        "-- Rows still without a key (changed since the export, or skipped below):",
        "SELECT count(*) AS rows_still_null FROM public.quiz_questions WHERE comparison_key IS NULL;",
        "",
        "COMMIT;",
        f"-- skipped: {broken} broken answer key, {mismatch} format mismatch (not keyed; see the sweep report)",
        f"-- skipped {figures} figure rows (not keyable without a reviewed figure signature)",
        "",
    ]
    return "\n".join(out)


def run_backfill(export_path: Path, out_path: Path) -> dict:
    from kimport.export import export_by_id, read_export
    from kimport.sweep import record_from_row

    rows = read_export(export_path)
    records = [record_from_row(r) for r in rows]
    sql = backfill_sql(records, export_by_id(rows))
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(sql, encoding="utf-8")
    skipped = sum(1 for r in records if r.meta.get("format_problem") or r.meta.get("answer_problem")
                  or r.meta.get("figure_unkeyable"))
    return {"in_sql": len(records) - skipped, "skipped": skipped}
