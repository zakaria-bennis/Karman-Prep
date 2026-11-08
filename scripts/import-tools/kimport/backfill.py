"""comparison_key backfill: guarded SQL that fills quiz_questions.comparison_key.

Input is the live export (sql/live_export.sql). Nothing here connects to a
database; the SQL is text for a human-approved run. Each row is keyed only if
it still has the exported content_hash_v2, and only while its key is NULL, so a
row edited since the export, or one already keyed, is skipped and never
overwritten. Rows whose answer key is broken, whose format disagrees with having
choices, or whose figure the key cannot represent (keys.is_unkeyable: images,
graphs, choice tables) are not keyed; closing comments count them, live and
not live apart, so the runbook's live null-key check compares like with like.
Archived rows are keyed like any other (harmless; documented in the SQL header).
"""

import json
from pathlib import Path

from kimport.keys import comparison_key, is_unkeyable, keyable_sql
from kimport.normalize import NORMALIZER_VERSION
from kimport.sqlutil import dryrun_variant, lit, uuid_literal

CHUNK = 500
PUBLISH_READY = ("publish_ready", "publish_ready_with_verified_repair")
SKIP_REASONS = ("broken answer key", "format mismatch", "figure the key cannot represent")


def _value(r, row: dict) -> str:
    table = row.get("figure_table_data")
    table_sql = "NULL::jsonb" if table is None else f"{lit(json.dumps(table, ensure_ascii=False))}::jsonb"
    return (f"({lit(uuid_literal(r.ref))}::uuid, {lit(comparison_key(r))}::text, "
            f"{lit(row.get('content_hash_v2'))}::text, {lit(row.get('correct_answer'))}::text, {table_sql})")


def _skip_reason(r) -> str | None:
    """Figure first, so the broken / mismatch counts cover only rows the runbook's
    null-key check (which leaves out unkeyable figures) still sees."""
    if is_unkeyable(r):
        return SKIP_REASONS[2]
    if r.meta.get("format_problem"):
        return SKIP_REASONS[1]
    if r.meta.get("answer_problem"):
        return SKIP_REASONS[0]
    return None


def is_live_row(row: dict) -> bool:
    """Live as the unique rule and the runbook check count it: not archived, publish-ready."""
    return row.get("archived_at") is None and row.get("publish_status") in PUBLISH_READY


def skip_counts(records, export_by_id: dict[str, dict]) -> dict[str, dict[str, int]]:
    """{"live"|"not_live": {reason: n}} for the rows the backfill leaves without a key."""
    counts = {side: {reason: 0 for reason in SKIP_REASONS} for side in ("live", "not_live")}
    for r in records:
        reason = _skip_reason(r)
        if reason:
            counts["live" if is_live_row(export_by_id.get(r.ref) or {}) else "not_live"][reason] += 1
    return counts


def backfill_sql(records, export_by_id: dict[str, dict]) -> str:
    keyable = []
    for r in records:
        if _skip_reason(r) is None:
            row = export_by_id.get(r.ref)
            if row is None:
                raise ValueError(f"{r.ref}: not in the export")
            keyable.append((r, row))
    counts = skip_counts(records, export_by_id)
    out = [
        f"-- kimport backfill: comparison_key for {len(keyable)} rows. Normalizer {NORMALIZER_VERSION}.",
        "-- Needs the founder's go-ahead and migration 20261021000000 applied first.",
        "-- A row is keyed only if its content_hash_v2, correct_answer and figure_table_data still match the export,",
        "-- it has gained no figure the key cannot represent, and its key is NULL. Archived rows are keyed too",
        "-- (harmless: the unique rule and the publish duplicate check ignore archived rows).",
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
            f"  AND {keyable_sql('q')}",
            "  AND q.comparison_key IS NULL;",
            "",
        ]
    out += [
        "-- Rows still without a key (changed since the export, or skipped below):",
        "SELECT count(*) AS rows_still_null FROM public.quiz_questions WHERE comparison_key IS NULL;",
        "",
        "COMMIT;",
    ]
    for side, words in (("live", "live (not archived, publish-ready)"), ("not_live", "not live")):
        c = counts[side]
        out.append(f"-- skipped {words}: {c[SKIP_REASONS[0]]} broken answer key, {c[SKIP_REASONS[1]]} format "
                   f"mismatch, {c[SKIP_REASONS[2]]} figure rows the key cannot represent (images, graphs, "
                   "choice tables)")
    return "\n".join(out + [""])


def run_backfill(export_path: Path, out_path: Path) -> dict:
    from kimport.export import export_by_id, read_export
    from kimport.sweep import record_from_row

    rows = read_export(export_path)
    records = [record_from_row(r) for r in rows]
    by_id = export_by_id(rows)
    sql = backfill_sql(records, by_id)
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(sql, encoding="utf-8")
    out_path.with_name(out_path.stem + ".dryrun.sql").write_text(dryrun_variant(sql), encoding="utf-8")
    counts = skip_counts(records, by_id)
    live_skipped = sum(counts["live"].values())
    skipped = live_skipped + sum(counts["not_live"].values())
    return {"in_sql": len(records) - skipped, "skipped": skipped, "skipped_live": live_skipped}
