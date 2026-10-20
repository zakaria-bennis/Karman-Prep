"""Live-bank duplicate sweep: find copies already live and write guarded,
reversible un-publish SQL for the founder to approve.

Input is the one JSON value returned by sql/live_export.sql. Nothing here
connects to a database; the SQL is text for a human-approved run.

Grouping (live records only, see find_live_duplicates):
  1. copies with the same comparison_key form one exact bucket;
  2. buckets sharing blocking_key (everything typo_match requires to be equal)
     are compared with typo_match;
  3. a bucket joins a group only by matching the group's keeper (no chains).
Keeper (rulings R8, R9): exact-only groups keep the earliest created_at. A
group with typo edges keeps the copy whose side of the typo spots uses words
more common in rows OUTSIDE the group. "Outside" is decided on text alone: any
exported row (any status, answer or choices, broken key and format mismatch
included) whose words equal or are within the typo spot limits of a
candidate's words is left out of the count, so a typo imported several times
cannot outvote the clean copy. If that is a tie the group is "typo_review":
nothing is removed and a person picks the keeper.
Live rows whose correct_answer letter matches no choice ("broken answer key")
or whose question_format disagrees with having choices ("format mismatch")
are left out of grouping and listed in the report.
Any group with a figure (figure_kind or figure_table_data set) is reported as
"figure_review" with nothing to remove: a person checks those by eye.
"""

import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict

from kimport.keys import (
    QuestionRecord,
    answer_value,
    clean_text,
    comparison_key,
    figure_value,
    sorted_choices,
    table_values,
)
from kimport.normalize import NORMALIZER_VERSION, math_tokens, strip_markup
from kimport.sqlutil import do_block, lit, uuid_literal
from kimport.typo import MAX_SPOT_CHARS, MAX_SPOTS, text_words, typo_match, words_within_spots

PUBLISH_READY = ("publish_ready", "publish_ready_with_verified_repair")
UNPUBLISHED_STATUS = "needs_human_review"
UNPUBLISHED_IMPORT = "needs_review"
FORMATS = {"multiple_choice": "mc", "numeric_entry": "numeric"}
_WORD = re.compile(r"[^\W_]+")
_FAR_FUTURE = datetime.max.replace(tzinfo=timezone.utc)


class DuplicateGroup(TypedDict):
    keep: str  # for typo_review / figure_review: the oldest candidate, not a decision
    remove: list[str]  # empty for typo_review / figure_review
    relation: str  # "exact" | "ocr_typo" | "typo_review" | "figure_review"
    evidence: list[dict]
    # True when a typo group's keeper was decided by the tie rule (equal top
    # scores, zero or not); such a group is typo_review. Always False for
    # exact and figure_review groups.
    keeper_tie: bool


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
        "format_problem": False,
    }
    exported = row.get("question_format")
    if exported not in FORMATS:
        raise ValueError(f"{row['id']}: unknown question_format {exported!r}")
    fmt = FORMATS[exported]
    if (fmt == "mc") != bool(choices):  # left out of grouping; listed in the report
        meta["format_problem"] = True
    elif fmt == "mc":
        by_letter = {(c.get("letter") or "").strip().upper(): c.get("choice_text") or "" for c in choice_rows}
        if correct.upper() in by_letter:
            answer = by_letter[correct.upper()]
        else:  # left out of grouping; listed in the report
            answer, meta["answer_problem"] = "", True
    if fmt == "numeric" or meta["format_problem"]:
        answer = correct
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
    """Everything typo_match requires to be equal, so blocking loses no pair it would accept."""
    return json.dumps([
        r.answer_format,
        answer_value(r),
        list(sorted_choices(r)),
        [list(row) for row in table_values(r)],
        figure_value(r),
        list(math_tokens(strip_markup(r.text)[0])),
    ], ensure_ascii=False)


def _bare_words(r: QuestionRecord) -> frozenset[str]:
    return frozenset(_WORD.findall(clean_text(r.text)))


# Pre-filter bounds (rulings R10, R11). words_within_spots allows MAX_SPOTS spots
# of at most MAX_SPOT_CHARS character edits each. Word counts: an edit to a
# space adds or drops one word, so counts differ by at most MAX_SPOTS *
# MAX_SPOT_CHARS (6). Shared words: one spot of up to 3 edits can join or split
# words and so touch up to 2 * 3 = 6 words on one side ("is shown in a field of"
# -> "isshown ina fieldof"), so two spots touch up to 2 * MAX_SPOTS *
# MAX_SPOT_CHARS = 12 and at least len(shorter) - 12 words are shared. The
# pre-filter is a necessary condition only: it never rejects a pair the exact
# check accepts (test_prefilter_never_rejects_a_spot_match checks this).
_NEAR_COUNT_SLACK = MAX_SPOTS * MAX_SPOT_CHARS
_NEAR_SHARED_SLACK = 2 * MAX_SPOTS * MAX_SPOT_CHARS


def _near_prefilter(ta: tuple[str, ...], tb: tuple[str, ...]) -> bool:
    if abs(len(ta) - len(tb)) > _NEAR_COUNT_SLACK:
        return False
    shared = sum((Counter(ta) & Counter(tb)).values())
    return shared >= min(len(ta), len(tb)) - _NEAR_SHARED_SLACK


def _near(ta: tuple[str, ...], tb: tuple[str, ...]) -> bool:
    """Cheap necessary pre-filter, then the exact spot check."""
    return _near_prefilter(ta, tb) and words_within_spots(ta, tb)


def _created(r: QuestionRecord) -> datetime:
    s = r.meta.get("created_at")
    if not s:
        return _FAR_FUTURE
    dt = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _age(r: QuestionRecord):
    return (_created(r), r.ref)


def _keeper(cands: list[str], age_of, typo, outside_freq) -> tuple[str, bool]:
    """(keeper key, decided by tie) among candidate buckets (comparison keys).

    Each candidate's spot words are its own side of every typo spot against
    every other candidate it matches. Its score is how many rows outside the
    group hold its rarest spot word. A candidate with no spot words scores 0
    (never a free win). Equal top scores are a tie, broken by age only so the
    output is stable; the caller turns a tie into typo_review.
    """
    spot_words: dict[str, set[str]] = {k: set() for k in cands}
    for x, kx in enumerate(cands):
        for ky in cands[x + 1:]:
            result = typo(kx, ky)
            if result.same:
                for side_x, side_y in result.spots:
                    spot_words[kx].update(_WORD.findall(side_x))
                    spot_words[ky].update(_WORD.findall(side_y))
    score = {k: min((outside_freq(w) for w in ws), default=0) for k, ws in spot_words.items()}
    best = min(cands, key=lambda k: (-score[k], age_of(k)))
    tie = sum(score[k] == score[best] for k in cands) > 1
    return best, tie


def find_live_duplicates(records) -> list[DuplicateGroup]:
    """Groups of live copies. `records` should be the whole export: non-live rows
    count as word evidence for picking the keeper but are never grouped."""
    records = list(records)
    live = sorted((r for r in records if r.is_live and not _excluded(r)), key=_age)
    key_of = {r.ref: comparison_key(r) for r in live}  # normalizing is the slow part: once per record
    buckets: dict[str, list[QuestionRecord]] = {}
    for r in live:
        buckets.setdefault(key_of[r.ref], []).append(r)
    order = list(buckets)  # by oldest member
    block_of = {k: blocking_key(buckets[k][0]) for k in order}
    by_block: dict[str, list[str]] = {}
    for k in order:
        by_block.setdefault(block_of[k], []).append(k)

    # Every exported row (live, non-live, excluded) with its words, built lazily:
    # only needed once a typo candidate appears.
    every: dict = {}

    def index_all() -> dict:
        if not every:
            rows = [(text_words(r.text), _bare_words(r)) for r in records]
            by_len: dict[int, list[int]] = {}
            for n, (ws, _) in enumerate(rows):
                by_len.setdefault(len(ws), []).append(n)
            total = Counter(w for _, bare in rows for w in bare)
            every.update(rows=rows, by_len=by_len, total=total)
        return every

    cache: dict[tuple[str, str], object] = {}

    def typo(k1: str, k2: str):
        if (k1, k2) not in cache:
            cache[(k1, k2)] = typo_match(buckets[k1][0], buckets[k2][0])
        return cache[(k1, k2)]

    def outside_freq_for(cands: list[str]):
        """Word counts over rows outside the group (ruling R9, text only): drops
        every exported row, of any status, answer or choices, whose words equal
        or are within the typo spot limits of any candidate's words."""
        idx = index_all()
        own: Counter = Counter()
        cand_words = [text_words(buckets[k][0].text) for k in cands]
        for n in {n for cw in cand_words for d in range(-_NEAR_COUNT_SLACK, _NEAR_COUNT_SLACK + 1) for n in idx["by_len"].get(len(cw) + d, ())}:
            ws, bare = idx["rows"][n]
            if any(_near(cw, ws) for cw in cand_words):
                own.update(bare)
        return lambda w: idx["total"][w] - own[w]

    done: set[str] = set()
    groups: list[dict] = []
    i = 0
    while i < len(order):
        first = order[i]
        if first in done:
            i += 1
            continue
        pending = [k for k in by_block[block_of[first]] if k != first and k not in done]
        cands = [first] + [k for k in pending if typo(first, k).same]
        tie = False
        if len(cands) == 1:
            kkey, members = first, cands
        else:
            kkey, tie = _keeper(cands, lambda k: _age(buckets[k][0]), typo, outside_freq_for(cands))
            # Recompute from the keeper: a bucket may match it but not `first`.
            members = [kkey] + [k for k in by_block[block_of[kkey]]
                                if k != kkey and k not in done and typo(kkey, k).same]
        done.update(members)  # always holds kkey; `first` stays pending if it missed the keeper
        copies = sorted((c for k in members for c in buckets[k]), key=_age)
        if len(copies) > 1:
            groups.append(_group(buckets[kkey][0], kkey, copies, key_of, typo, tie))
    return [_strip(g) for g in sorted(groups, key=lambda g: g["_age"])]


def _excluded(r: QuestionRecord) -> bool:
    return bool(r.meta.get("answer_problem") or r.meta.get("format_problem"))


def format_mismatches(records) -> list[str]:
    """Live rows whose question_format disagrees with whether they have choices."""
    return [r.ref for r in sorted((r for r in records if r.is_live and r.meta.get("format_problem")), key=_age)]


def broken_answer_keys(records) -> list[str]:
    """Live rows whose correct_answer letter matches none of their choices."""
    return [r.ref for r in sorted((r for r in records if r.is_live and r.meta.get("answer_problem")
                                   and not r.meta.get("format_problem")), key=_age)]


def _group(keep: QuestionRecord, kkey: str, copies: list[QuestionRecord], key_of: dict, typo, tie: bool) -> dict:
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
        relation, remove, tie = "figure_review", [], False
    elif any(e["match"] == "ocr_typo" for e in evidence):
        relation = "typo_review" if tie else "ocr_typo"
        if tie:
            remove = []
    else:
        relation, tie = "exact", False
    return {"keep": keep.ref, "remove": remove, "relation": relation, "evidence": evidence,
            "keeper_tie": tie, "_age": _age(keep)}


def _strip(g: dict) -> DuplicateGroup:
    return {k: v for k, v in g.items() if k != "_age"}


# ---------------------------------------------------------------- SQL


_MISSING = object()  # flag key absent (or no key object): `->` gives SQL NULL


def _flag(row: dict):
    raw = row.get("raw_model_response")
    if isinstance(raw, dict) and "student_publication_allowed" in raw:
        return raw["student_publication_allowed"]
    return _MISSING


def _jsonb(v) -> str:
    """Exact jsonb value; a JSON null stays 'null'::jsonb, a missing key is SQL NULL."""
    return "NULL" if v is _MISSING else lit(json.dumps(v)) + "::jsonb"


def _reason(keep: str) -> str:
    return f"duplicate of {keep}; un-published by sweep"


def _plan(groups, rows: dict[str, dict]) -> list[tuple[str, str, dict]]:
    """(removed id, keeper id, exported row) for every removed copy, in group order."""
    plan = []
    for g in groups:
        keep = uuid_literal(g["keep"])
        for rid in g["remove"]:
            row = rows.get(uuid_literal(rid))
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


_LOCK_KEYS = " PERFORM 1 FROM public.answer_key_entries WHERE question_id = q.id FOR UPDATE;"


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
        body = [
            "DECLARE q public.quiz_questions%rowtype; keeper public.quiz_questions%rowtype;",
            "BEGIN",
            f" SELECT * INTO STRICT q FROM public.quiz_questions WHERE id = '{rid}'::uuid FOR UPDATE;",
            _LOCK_KEYS,
            f" IF q.publish_status IS DISTINCT FROM {lit(row.get('publish_status'))}",
            f"   OR q.import_status IS DISTINCT FROM {lit(row.get('import_status'))}",
            f"   OR q.import_flag_reason IS DISTINCT FROM {lit(row.get('import_flag_reason'))}",
            "   OR q.is_live IS DISTINCT FROM true",
            f"   OR q.content_hash_v2 IS DISTINCT FROM {lit(row.get('content_hash_v2'))}",
            f"   OR coalesce(q.publish_status, '') NOT IN ({ready})",
            *_key_guard(row, _flag(row)),
            " THEN RAISE EXCEPTION 'published state changed: %', q.id; END IF;",
            f" SELECT * INTO STRICT keeper FROM public.quiz_questions WHERE id = '{keep}'::uuid FOR SHARE;",
            f" IF keeper.is_live IS DISTINCT FROM true OR coalesce(keeper.publish_status, '') NOT IN ({ready})",
            " THEN RAISE EXCEPTION 'keeper not live: %', keeper.id; END IF;",
            f" UPDATE public.quiz_questions SET import_status = {lit(UNPUBLISHED_IMPORT)},"
            f" publish_status = {lit(UNPUBLISHED_STATUS)}, import_flag_reason = {lit(_reason(keep))} WHERE id = q.id;",
        ]
        if isinstance(row.get("raw_model_response"), dict):
            body.append(" UPDATE public.answer_key_entries SET raw_model_response = jsonb_set(raw_model_response,"
                        " '{student_publication_allowed}', 'false'::jsonb) WHERE question_id = q.id;")
        out += do_block(tag, body)
    return "\n".join(out + ["COMMIT;", ""])


def republish_sql(groups, export_by_id: dict[str, dict]) -> str:
    plan = _plan(groups, export_by_id)
    out = _header("undo the un-publish (republish)", len(plan))
    for rid, keep, row in reversed(plan):
        tag = "kimport_republish_" + rid.replace("-", "")
        has_key = isinstance(row.get("raw_model_response"), dict)
        flag = _flag(row)
        body = [
            "DECLARE q public.quiz_questions%rowtype;",
            "BEGIN",
            f" SELECT * INTO STRICT q FROM public.quiz_questions WHERE id = '{rid}'::uuid FOR UPDATE;",
            _LOCK_KEYS,
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
            restore = ("raw_model_response - 'student_publication_allowed'" if flag is _MISSING else
                       f"jsonb_set(raw_model_response, '{{student_publication_allowed}}', {_jsonb(flag)})")
            body.append(f" UPDATE public.answer_key_entries SET raw_model_response = {restore} WHERE question_id = q.id;")
        out += do_block(tag, body)
    return "\n".join(out + ["COMMIT;", ""])


# ---------------------------------------------------------------- report

_RELATION_WORDS = {
    "exact": "exact copy",
    "ocr_typo": "same question with a small scanning typo",
    "typo_review": "small typo, but no way to tell which copy is clean (nothing un-published)",
    "figure_review": "has a figure, check by eye (nothing un-published)",
}


def _stem(row: dict | None) -> str:
    text = " ".join(((row or {}).get("question_text") or "").split())
    return text[:80].replace("|", "/").replace("`", "'")


def report_md(groups, rows: dict[str, dict], live_count: int, broken: list[str] = (),
              mismatched: list[str] = ()) -> str:
    rel = Counter(g["relation"] for g in groups)
    removed = sum(len(g["remove"]) for g in groups)
    lines = [
        "# Live duplicate sweep",
        "",
        f"- {len(rows)} questions in the export, {live_count} of them visible to students.",
        f"- {len(groups)} duplicate groups: {rel['exact']} exact copies, {rel['ocr_typo']} with a small typo, "
        f"{rel['typo_review']} with a typo where a person must pick the copy to keep, "
        f"{rel['figure_review']} with a figure to check by eye.",
        f"- {removed} questions would be un-published. Nothing is deleted, and republish.sql undoes it.",
        "- Nothing runs until you say yes.",
        "",
        "## Groups",
        "",
    ]
    review = [g for g in groups if g["relation"] == "typo_review"]
    listed = [g for g in groups if g["relation"] != "typo_review"]
    for i, g in enumerate(listed, 1):
        if g["relation"] == "figure_review":
            action = "possible copies " + ", ".join(e["id"] for e in g["evidence"])
        else:
            action = "un-publish " + ", ".join(g["remove"])
        lines.append(f"{i}. Keep `{g['keep']}`; {action}; {_RELATION_WORDS[g['relation']]}. "
                     f"\"{_stem(rows.get(g['keep']))}\"")
    if not listed:
        lines.append("No duplicates to un-publish or check by eye.")
    if review:
        lines += ["", "## Needs a person to pick the copy to keep", "",
                  "These copies differ by a small typo, and nothing else in the bank shows which spelling is "
                  "right. Nothing was un-published. Pick the clean copy; the others can then be un-published.", ""]
        for g in review:
            ids = [g["keep"]] + [e["id"] for e in g["evidence"]]
            spots = "; ".join(f"{a} / {b}" for e in g["evidence"] for a, b in e["spots"])
            lines.append(f"- Copies {', '.join(f'`{x}`' for x in ids)}; differing words: {spots}. "
                         f"\"{_stem(rows.get(g['keep']))}\"")
    if broken:
        lines += ["", "## Broken answer key", "",
                  f"{len(broken)} live questions have a correct answer letter that matches none of their choices. "
                  "They were left out of the duplicate check and need fixing by hand.", ""]
        lines += [f"- `{rid}` (answer letter {(rows.get(rid) or {}).get('correct_answer')!r}). "
                  f"\"{_stem(rows.get(rid))}\"" for rid in broken]
    if mismatched:
        lines += ["", "## Format mismatch", "",
                  f"{len(mismatched)} live questions say multiple choice but have no choices, or say numeric "
                  "entry but have choices. They were left out of the duplicate check and need fixing by hand.", ""]
        lines += [f"- `{rid}` ({(rows.get(rid) or {}).get('question_format')}, "
                  f"{len((rows.get(rid) or {}).get('choices') or [])} choices). \"{_stem(rows.get(rid))}\""
                  for rid in mismatched]
    return "\n".join(lines) + "\n"


def run_sweep(export_path: Path, out_dir: Path) -> dict:
    rows = read_export(export_path)
    records = [record_from_row(r) for r in rows]
    by_id = export_by_id(rows)
    groups = find_live_duplicates(records)
    broken = broken_answer_keys(records)
    mismatched = format_mismatches(records)
    live_count = sum(r.is_live for r in records)
    unpublish, republish = unpublish_sql(groups, by_id), republish_sql(groups, by_id)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = {"normalizer_version": NORMALIZER_VERSION, "export_rows": len(rows), "live_rows": live_count,
           "groups": groups, "broken_answer_key": broken, "format_mismatch": mismatched}
    (out_dir / "groups.json").write_text(json.dumps(doc, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
                                         encoding="utf-8")
    (out_dir / "report.md").write_text(report_md(groups, by_id, live_count, broken, mismatched), encoding="utf-8")
    (out_dir / "unpublish.sql").write_text(unpublish, encoding="utf-8")
    (out_dir / "republish.sql").write_text(republish, encoding="utf-8")
    return {"groups": len(groups), "remove": sum(len(g["remove"]) for g in groups), "live": live_count}
