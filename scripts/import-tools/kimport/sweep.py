"""Live-bank duplicate sweep: find copies already live and write guarded,
reversible un-publish SQL for the founder to approve.

Input is the one JSON value returned by sql/live_export.sql. Nothing here
connects to a database; the SQL is text for a human-approved run.

Grouping (live records only, see find_live_duplicates):
  1. copies with the same comparison_key form one exact bucket;
  2. buckets sharing blocking_key are compared with typo_match;
  3. a bucket joins a group only by matching the group's keeper (no chains).
Keeper: the copy whose words all appear in the most copies (so a typo copy
loses to clean copies), ties broken by earliest created_at, then id.
Any group with a figure (figure_kind or figure_table_data set) is reported as
"figure_review" with nothing to remove: a person checks those by eye.
"""

import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict

from kimport.keys import QuestionRecord, answer_value, clean_text, comparison_key
from kimport.normalize import NORMALIZER_VERSION
from kimport.typo import typo_match

PUBLISH_READY = ("publish_ready", "publish_ready_with_verified_repair")
UNPUBLISHED_STATUS = "needs_human_review"
UNPUBLISHED_IMPORT = "needs_review"
BLOCK_CHARS = 40
_UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
_FAR_FUTURE = datetime.max.replace(tzinfo=timezone.utc)


class DuplicateGroup(TypedDict):
    keep: str
    remove: list[str]
    relation: str  # "exact" | "ocr_typo" | "figure_review"
    evidence: list[dict]


# ---------------------------------------------------------------- export


def _unwrap(data):
    """Accept the bare array, or a connector result row wrapping it."""
    if isinstance(data, str):
        data = json.loads(data)
    if isinstance(data, dict) and len(data) == 1 and "id" not in data:
        return _unwrap(next(iter(data.values())))
    if isinstance(data, list) and len(data) == 1 and isinstance(data[0], dict) \
            and len(data[0]) == 1 and "id" not in data[0]:
        return _unwrap(next(iter(data[0].values())))
    return data


def read_export(path: Path) -> list[dict]:
    rows = _unwrap(json.loads(Path(path).read_text(encoding="utf-8")))
    if not isinstance(rows, list) or not all(isinstance(r, dict) and "id" in r for r in rows):
        raise ValueError(f"{path}: not a live_export.sql result (expected a JSON array of rows with an id)")
    seen = Counter(r["id"] for r in rows)
    dupes = sorted(i for i, n in seen.items() if n > 1)
    if dupes:
        raise ValueError(f"{path}: ids repeated in export: {', '.join(dupes[:5])}")
    return rows


def export_by_id(rows: list[dict]) -> dict[str, dict]:
    return {r["id"]: r for r in rows}


def _row_is_live(row: dict) -> bool:
    return row.get("is_live") is True and row.get("publish_status") in PUBLISH_READY


def _has_figure(row: dict) -> bool:
    return row.get("figure_kind") is not None or row.get("figure_table_data") is not None


def _table_cells(table) -> tuple[tuple[str, ...], ...]:
    """Caption, header row, body rows and footer note, as the student sees them."""
    if not isinstance(table, dict):
        return ()
    cells = []
    if table.get("caption"):
        cells.append((str(table["caption"]),))
    if table.get("header_row"):
        cells.append(tuple("" if c is None else str(c) for c in table["header_row"]))
    for row in table.get("rows") or ():
        cells.append(tuple("" if c is None else str(c) for c in row))
    if table.get("footer_note"):
        cells.append((str(table["footer_note"]),))
    return tuple(cells)


def record_from_row(row: dict) -> QuestionRecord:
    choice_rows = row.get("choices") or []
    choices = tuple(c.get("choice_text") or "" for c in choice_rows)
    is_live = _row_is_live(row)
    correct = (row.get("correct_answer") or "").strip()
    meta = {
        "created_at": row.get("created_at"),
        "has_figure": _has_figure(row),
        "figure_kind": row.get("figure_kind"),
        "answer_problem": False,
    }
    if choices:
        fmt = "mc"
        by_letter = {(c.get("letter") or "").strip().upper(): c.get("choice_text") or "" for c in choice_rows}
        if correct.upper() in by_letter:
            answer = by_letter[correct.upper()]
        elif is_live:
            raise ValueError(f"{row['id']}: live question's correct_answer {correct!r} is not one of its choice letters")
        else:
            answer, meta["answer_problem"] = "", True
    else:
        fmt, answer = "numeric", correct
    return QuestionRecord(
        ref=row["id"],
        text=row.get("question_text") or "",
        choices=choices,
        answer=answer,
        answer_format=fmt,
        table_cells=_table_cells(row.get("figure_table_data")),
        figure_signature=None,  # the export has no reviewed figure signature
        is_live=is_live,
        meta=meta,
    )


def load_export(path: Path) -> list[QuestionRecord]:
    return [record_from_row(r) for r in read_export(path)]


# ---------------------------------------------------------------- grouping


def blocking_key(r: QuestionRecord) -> str:
    return clean_text(r.text)[:BLOCK_CHARS] + "\x1f" + answer_value(r)


def _created(r: QuestionRecord) -> datetime:
    s = r.meta.get("created_at")
    if not s:
        return _FAR_FUTURE
    dt = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _age(r: QuestionRecord):
    return (_created(r), r.ref)


def _keeper(copies: list[QuestionRecord]) -> QuestionRecord:
    """The copy whose rarest word appears in the most copies; then the oldest."""
    words = {c.ref: set(clean_text(c.text).split()) for c in copies}
    counts = Counter(w for ws in words.values() for w in ws)
    score = {ref: min((counts[w] for w in ws), default=0) for ref, ws in words.items()}
    return min(copies, key=lambda c: (-score[c.ref], _age(c)))


def find_live_duplicates(records) -> list[DuplicateGroup]:
    live = sorted((r for r in records if r.is_live), key=_age)
    key_of = {r.ref: comparison_key(r) for r in live}  # normalizing is the slow part: once per record
    buckets: dict[str, list[QuestionRecord]] = {}
    for r in live:
        buckets.setdefault(key_of[r.ref], []).append(r)
    order = list(buckets)  # by oldest member
    block_of = {k: blocking_key(buckets[k][0]) for k in order}
    by_block: dict[str, list[str]] = {}
    for k in order:
        by_block.setdefault(block_of[k], []).append(k)

    cache: dict[tuple[str, str], object] = {}

    def typo(k1: str, k2: str):
        if (k1, k2) not in cache:
            cache[(k1, k2)] = typo_match(buckets[k1][0], buckets[k2][0])
        return cache[(k1, k2)]

    done: set[str] = set()
    groups: list[dict] = []
    i = 0
    while i < len(order):
        first = order[i]
        if first in done:
            i += 1
            continue
        peers = [k for k in by_block[block_of[first]] if k != first and k not in done]
        cands = [first] + [k for k in peers if typo(first, k).same]
        if len(cands) == 1:
            keep, kkey, members = buckets[first][0], first, cands
        else:
            keep = _keeper([c for k in cands for c in buckets[k]])
            kkey = key_of[keep.ref]
            members = [k for k in cands if k == kkey or typo(kkey, k).same]
        done.update(members)  # always holds kkey, so the loop makes progress
        copies = sorted((c for k in members for c in buckets[k]), key=_age)
        if len(copies) > 1:
            groups.append(_group(keep, kkey, copies, key_of, typo))
    return [_strip(g) for g in sorted(groups, key=lambda g: g["_age"])]


def _group(keep: QuestionRecord, kkey: str, copies: list[QuestionRecord], key_of: dict, typo) -> dict:
    evidence = []
    for c in copies:
        if c.ref == keep.ref:
            continue
        ckey = key_of[c.ref]
        if ckey == kkey:
            match, spots = "exact", []
        else:
            match, spots = "ocr_typo", [list(s) for s in typo(kkey, ckey).spots]
        evidence.append({
            "id": c.ref,
            "match": match,
            "spots": spots,
            "created_at": c.meta.get("created_at"),
            "figure_kind": c.meta.get("figure_kind"),
        })
    remove = [e["id"] for e in evidence]
    if any(c.meta.get("has_figure") for c in copies):
        relation, remove = "figure_review", []
    elif any(e["match"] == "ocr_typo" for e in evidence):
        relation = "ocr_typo"
    else:
        relation = "exact"
    return {"keep": keep.ref, "remove": remove, "relation": relation, "evidence": evidence, "_age": _age(keep)}


def _strip(g: dict) -> DuplicateGroup:
    return {k: v for k, v in g.items() if k != "_age"}


# ---------------------------------------------------------------- SQL


def _uuid(s: str) -> str:
    if not isinstance(s, str) or not _UUID.fullmatch(s):
        raise ValueError(f"not a lowercase uuid: {s!r}")
    return s


def lit(v) -> str:
    """SQL literal for a text value (NULL for None)."""
    if v is None:
        return "NULL"
    s = str(v)
    if "\x00" in s:
        raise ValueError("NUL byte in SQL value")
    return "'" + s.replace("'", "''") + "'"


def _flag(row: dict):
    raw = row.get("raw_model_response")
    return raw.get("student_publication_allowed") if isinstance(raw, dict) else None


def _jsonb(v) -> str:
    return "NULL" if v is None else lit(json.dumps(v)) + "::jsonb"


def _reason(keep: str) -> str:
    return f"duplicate of {keep}; un-published by sweep"


def _plan(groups, rows: dict[str, dict]) -> list[tuple[str, str, dict]]:
    """(removed id, keeper id, exported row) for every removed copy, in group order."""
    plan = []
    for g in groups:
        keep = _uuid(g["keep"])
        for rid in g["remove"]:
            row = rows.get(_uuid(rid))
            if row is None:
                raise ValueError(f"{rid}: not in the export")
            if not _row_is_live(row):
                raise ValueError(f"{rid}: not live in the export; refusing to un-publish")
            count = row.get("answer_key_count", 1 if row.get("raw_model_response") is not None else 0)
            if count not in (0, 1):
                raise ValueError(f"{rid}: {count} answer key rows; un-publish needs one or none")
            plan.append((rid, keep, row))
    return plan


def _key_guard(row: dict, flag) -> list[str]:
    count = row.get("answer_key_count", 1 if row.get("raw_model_response") is not None else 0)
    return [
        f"   OR (SELECT count(*) FROM public.answer_key_entries WHERE question_id = q.id) <> {int(count)}",
        "   OR (SELECT raw_model_response->'student_publication_allowed' FROM public.answer_key_entries"
        f" WHERE question_id = q.id) IS DISTINCT FROM {_jsonb(flag)}",
    ]


def _header(title: str, n: int) -> list[str]:
    return [
        f"-- kimport sweep: {title} ({n} rows). Normalizer {NORMALIZER_VERSION}.",
        "-- Needs the founder's go-ahead before it runs. No row is ever removed.",
        "-- Each block stops with an error if the row changed since the export.",
        "BEGIN;",
        "",
    ]


def unpublish_sql(groups, export_by_id: dict[str, dict]) -> str:
    plan = _plan(groups, export_by_id)
    out = _header("un-publish live duplicates", len(plan))
    ready = ", ".join(lit(s) for s in PUBLISH_READY)
    for rid, keep, row in plan:
        tag = "kimport_unpublish_" + rid.replace("-", "")
        flag = _flag(row)
        out += [
            f"DO ${tag}$",
            "DECLARE q public.quiz_questions%rowtype; keeper public.quiz_questions%rowtype;",
            "BEGIN",
            f" SELECT * INTO STRICT q FROM public.quiz_questions WHERE id = '{rid}'::uuid FOR UPDATE;",
            f" IF q.publish_status IS DISTINCT FROM {lit(row.get('publish_status'))}",
            f"   OR q.import_status IS DISTINCT FROM {lit(row.get('import_status'))}",
            "   OR q.is_live IS DISTINCT FROM true",
            f"   OR q.content_hash_v2 IS DISTINCT FROM {lit(row.get('content_hash_v2'))}",
            f"   OR coalesce(q.publish_status, '') NOT IN ({ready})",
            *_key_guard(row, flag),
            " THEN RAISE EXCEPTION 'published state changed: %', q.id; END IF;",
            f" SELECT * INTO STRICT keeper FROM public.quiz_questions WHERE id = '{keep}'::uuid FOR SHARE;",
            f" IF keeper.is_live IS DISTINCT FROM true OR coalesce(keeper.publish_status, '') NOT IN ({ready})",
            " THEN RAISE EXCEPTION 'keeper not live: %', keeper.id; END IF;",
            f" UPDATE public.quiz_questions SET import_status = {lit(UNPUBLISHED_IMPORT)},"
            f" publish_status = {lit(UNPUBLISHED_STATUS)}, import_flag_reason = {lit(_reason(keep))} WHERE id = q.id;",
        ]
        if isinstance(row.get("raw_model_response"), dict):
            out.append(" UPDATE public.answer_key_entries SET raw_model_response = jsonb_set(raw_model_response,"
                       " '{student_publication_allowed}', 'false'::jsonb) WHERE question_id = q.id;")
        out += [f"END ${tag}$;", ""]
    return "\n".join(out + ["COMMIT;", ""])


def republish_sql(groups, export_by_id: dict[str, dict]) -> str:
    plan = _plan(groups, export_by_id)
    out = _header("undo the un-publish (republish)", len(plan))
    for rid, keep, row in reversed(plan):
        tag = "kimport_republish_" + rid.replace("-", "")
        has_key = isinstance(row.get("raw_model_response"), dict)
        flag = _flag(row)
        out += [
            f"DO ${tag}$",
            "DECLARE q public.quiz_questions%rowtype;",
            "BEGIN",
            f" SELECT * INTO STRICT q FROM public.quiz_questions WHERE id = '{rid}'::uuid FOR UPDATE;",
            f" IF q.publish_status IS DISTINCT FROM {lit(UNPUBLISHED_STATUS)}",
            f"   OR q.import_status IS DISTINCT FROM {lit(UNPUBLISHED_IMPORT)}",
            f"   OR q.import_flag_reason IS DISTINCT FROM {lit(_reason(keep))}",
            "   OR q.is_live IS DISTINCT FROM false",
            "   OR q.archived_at IS NOT NULL",
            f"   OR q.content_hash_v2 IS DISTINCT FROM {lit(row.get('content_hash_v2'))}",
            *_key_guard(row, False if has_key else flag),
            " THEN RAISE EXCEPTION 'sweep state changed: %', q.id; END IF;",
            f" UPDATE public.quiz_questions SET import_status = {lit(row.get('import_status'))},"
            f" publish_status = {lit(row.get('publish_status'))},"
            f" import_flag_reason = {lit(row.get('import_flag_reason'))} WHERE id = q.id;",
        ]
        if has_key:
            restore = ("raw_model_response - 'student_publication_allowed'" if flag is None else
                       f"jsonb_set(raw_model_response, '{{student_publication_allowed}}', {_jsonb(flag)})")
            out.append(f" UPDATE public.answer_key_entries SET raw_model_response = {restore} WHERE question_id = q.id;")
        out += [f"END ${tag}$;", ""]
    return "\n".join(out + ["COMMIT;", ""])


# ---------------------------------------------------------------- report

_RELATION_WORDS = {
    "exact": "exact copy",
    "ocr_typo": "same question with a small scanning typo",
    "figure_review": "has a figure, check by eye (nothing un-published)",
}


def _stem(row: dict | None) -> str:
    text = " ".join(((row or {}).get("question_text") or "").split())
    return text[:80].replace("|", "/").replace("`", "'")


def report_md(groups, rows: dict[str, dict], live_count: int) -> str:
    rel = Counter(g["relation"] for g in groups)
    removed = sum(len(g["remove"]) for g in groups)
    lines = [
        "# Live duplicate sweep",
        "",
        f"- {len(rows)} questions in the export, {live_count} of them visible to students.",
        f"- {len(groups)} duplicate groups: {rel['exact']} exact copies, {rel['ocr_typo']} with a small typo, "
        f"{rel['figure_review']} with a figure to check by eye.",
        f"- {removed} questions would be un-published. Nothing is deleted, and republish.sql undoes it.",
        "- Nothing runs until you say yes.",
        "",
        "## Groups",
        "",
    ]
    for i, g in enumerate(groups, 1):
        if g["relation"] == "figure_review":
            action = "possible copies " + ", ".join(e["id"] for e in g["evidence"])
        else:
            action = "un-publish " + ", ".join(g["remove"])
        lines.append(f"{i}. Keep `{g['keep']}`; {action}; {_RELATION_WORDS[g['relation']]}. "
                     f"\"{_stem(rows.get(g['keep']))}\"")
    if not groups:
        lines.append("No duplicates found.")
    return "\n".join(lines) + "\n"


def run_sweep(export_path: Path, out_dir: Path) -> dict:
    rows = read_export(export_path)
    records = [record_from_row(r) for r in rows]
    by_id = export_by_id(rows)
    groups = find_live_duplicates(records)
    live_count = sum(r.is_live for r in records)
    unpublish, republish = unpublish_sql(groups, by_id), republish_sql(groups, by_id)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = {"normalizer_version": NORMALIZER_VERSION, "export_rows": len(rows), "live_rows": live_count,
           "groups": groups}
    (out_dir / "groups.json").write_text(json.dumps(doc, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
                                         encoding="utf-8")
    (out_dir / "report.md").write_text(report_md(groups, by_id, live_count), encoding="utf-8")
    (out_dir / "unpublish.sql").write_text(unpublish, encoding="utf-8")
    (out_dir / "republish.sql").write_text(republish, encoding="utf-8")
    return {"groups": len(groups), "remove": sum(len(g["remove"]) for g in groups), "live": live_count}
