"""Shared publish builder: guarded publish and rollback SQL for one staged batch.

Replaces the per-batch task-3 build_*publish_sql.py generators. Inputs are the
same files they read: the private readback (`{"rows": [{"snapshot": {keys,
choices, question}}]}`, every column as to_jsonb gives it) and the sealed
preview (`{"rows": [...]}` with question_payload_sha256 per row), plus a fresh
live export (sql/live_export.sql) and the intent log.

Every row gets the legacy guard unchanged (exact to_jsonb snapshot match under
FOR UPDATE, sorted choices, one source tuple, one content hash, exact key row,
staged status, publication flag off, tag manifest, no seal yet) and two
additions: a Python precheck that no other exported row (live or staged) has
the same comparison key or a typo-level match, and, inside the DO block, a
guard that no other non-archived row holds the same comparison_key, which the
publish UPDATE then sets. Archived rows are ignored by both duplicate checks
(ruling R25). Rows whose figure the key cannot represent (keys.is_unkeyable: an
image, graph or other non-table figure, or a choice table; rulings R12, R23)
get no database key and no key guard; the precheck still runs for them and the
report lists them.

precheck.json records publish_sql_sha256, the sha256 of publish.sql, for
`intent open --sql-sha256` (the intent is opened after this builder runs,
because the builder refuses while any intent is open).

publish.sql opens with a block that recomputes the export fingerprint
(kimport.export.FINGERPRINT_SQL) and stops if the bank changed since the
export. Before building, every keyable non-batch export row must carry the key
this normalizer computes (the backfill was applied and nothing drifted).
Rollback is the exact inverse, restoring the comparison_key the row had in the
private readback.

Nothing here connects to a database; the SQL is text for a human-approved run.
"""

import base64
import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict

from kimport import figure_gate
from kimport.answer_evidence import ambiguous, evidence_root, json_path, sql_get
from kimport.export import FINGERPRINT_SQL, ExportDoc, read_export_doc
from kimport.keys import PASSAGE_FIELDS, UNKEYED_FIGURE_FIELDS, QuestionRecord, comparison_key, is_unkeyable
from kimport.normalize import NORMALIZER_VERSION
from kimport.sqlutil import do_block, dryrun_variant, lit, uuid_literal
from kimport.sweep import blocking_key, record_from_row
from kimport.typo import typo_match
from kimport.writer import OpenIntent, require_no_open_intents

MAX_ROWS = 27  # one module
STAGED_STATUS, STAGED_IMPORT = "needs_human_review", "needs_review"
FIGURE_NO_KEY = "figure: checked by people, no database key"
KEYED = "keyed"
NOT_COMPARABLE_ANSWER = "not comparable (bad answer letter)"
NOT_COMPARABLE_FORMAT = "not comparable (format mismatch)"
_HEX64 = re.compile(r"[0-9a-f]{64}")
_BATCH = re.compile(r"[a-z0-9][a-z0-9-]{0,62}")
_KEY = re.compile(re.escape(NORMALIZER_VERSION) + r":[0-9a-f]{64}")


class RefuseToBuild(Exception):
    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


class PublishBundle(TypedDict):
    publish_sql: str
    rollback_sql: str
    keys: dict  # question id -> comparison key, or None for an unkeyed figure row
    precheck: dict


# ---------------------------------------------------------------- inputs


def _json(path: Path, what: str):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        raise RefuseToBuild(f"cannot read the {what} {path}: {e}") from None


def _stamp(s) -> datetime | None:
    if not isinstance(s, str) or not s:
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _read_export(path: Path) -> ExportDoc:
    try:
        return read_export_doc(path)
    except (OSError, ValueError) as e:
        raise RefuseToBuild(f"cannot use the export: {e}") from None


def _check_fresh(readback: Path, export: Path, snaps, doc: ExportDoc) -> None:
    """Secondary check: the export must be taken after the private readback.
    The run-time guard is the fingerprint block at the top of publish.sql."""
    if Path(export).stat().st_mtime < Path(readback).stat().st_mtime:
        raise RefuseToBuild(f"the export {export} is older than the private readback {readback}; "
                            "run sql/live_export.sql again and save a fresh export")
    exported = _stamp(doc.exported_at)
    if exported is None:
        raise RefuseToBuild(f"the export {export} has an unreadable exported_at {doc.exported_at!r}")
    read_times = [t for s in snaps for t in (_stamp(s["question"].get("updated_at")),
                                             _stamp(s["question"].get("created_at"))) if t]
    if read_times and exported < max(read_times):
        raise RefuseToBuild(f"the export {export} is older than the private readback {readback} "
                            f"(exported {exported.isoformat()}, readback row {max(read_times).isoformat()}); "
                            "save a fresh export")


def _hex(v, what: str) -> str:
    if not isinstance(v, str) or not _HEX64.fullmatch(v):
        raise RefuseToBuild(f"{what} is not a sha256 hex string: {v!r}")
    return v


def _export_like(snap: dict) -> dict:
    """The readback row in live_export.sql shape, so sweep.record_from_row maps it."""
    q = snap["question"]
    return {
        "id": q["id"], "question_text": q.get("question_text"), "correct_answer": q.get("correct_answer"),
        "question_format": q.get("answer_format"), "figure_kind": q.get("figure_kind"),
        "figure_table_data": q.get("figure_table_data"), "publish_status": q.get("publish_status"),
        "is_live": q.get("is_live"), "created_at": q.get("created_at"), "archived_at": q.get("archived_at"),
        **{f: q.get(f) for f in PASSAGE_FIELDS + UNKEYED_FIGURE_FIELDS},
        "choices": sorted(({"letter": c.get("letter"), "choice_text": c.get("choice_text"),
                            "choice_table_data": c.get("choice_table_data")}
                           for c in snap.get("choices") or []), key=lambda c: c["letter"] or ""),
    }


def readback_record(snap: dict) -> QuestionRecord:
    return record_from_row(_export_like(snap))


def _source(q: dict) -> tuple:
    return (q.get("source_section"), q.get("source_module"), q.get("source_question_number"))


def _check_row(snap: dict, seal: dict) -> tuple[str, str]:
    """The legacy generator's assertions, generalized. Returns (seal hash, manifest)."""
    q, choices, keys = snap.get("question"), snap.get("choices"), snap.get("keys")
    if not isinstance(q, dict) or not isinstance(keys, list):
        raise RefuseToBuild("private readback row has no question or keys snapshot")
    try:
        qid = uuid_literal(q.get("id"))
    except ValueError:
        raise RefuseToBuild(f"private readback question id is not a lowercase uuid: {q.get('id')!r}") from None
    where = f"{qid} {_source(q)}"
    if "comparison_key" not in q:
        raise RefuseToBuild(f"{where}: the private readback has no comparison_key column, so it was taken before "
                            "migration 20261021000000; take a fresh private readback")
    for field in ("content_hash_v2", "source_version", "question_text", "correct_answer", "answer_format",
                  "figure_kind", "figure_table_data", "source_section", "source_module", "source_question_number"):
        if q.get(field) != seal.get(field):
            raise RefuseToBuild(f"{where}: {field} differs between the private readback and the sealed preview")
    if not (q.get("is_live") is False and q.get("archived_at") is None and q.get("publish_status") == STAGED_STATUS
            and q.get("import_status") == STAGED_IMPORT):
        raise RefuseToBuild(f"{where}: not a staged private row (is_live false, archived_at null, "
                            f"publish_status {STAGED_STATUS}, import_status {STAGED_IMPORT})")
    by_letter = {c.get("letter"): c.get("choice_text") for c in choices or []}
    if q.get("answer_format") == "multiple_choice":
        if len(by_letter) != len(choices or []) or len(by_letter) < 2 or by_letter != (seal.get("choices") or {}):
            raise RefuseToBuild(f"{where}: choices differ between the private readback and the sealed preview")
        if q.get("correct_answer") not in by_letter:
            raise RefuseToBuild(f"{where}: correct_answer {q.get('correct_answer')!r} matches no choice")
    elif choices or seal.get("choices"):
        raise RefuseToBuild(f"{where}: {q.get('answer_format')} row has choices")
    if len(keys) != 1:
        raise RefuseToBuild(f"{where}: {len(keys)} answer key rows; publish needs exactly one")
    raw = keys[0].get("raw_model_response")
    root = evidence_root(raw)  # raw, or raw["evidence"] for an independently confirmed generated key
    tags = root.get("approved_tags") if isinstance(root, dict) else None
    if ambiguous(raw):
        raise RefuseToBuild(f"{where}: generated-key evidence carries approved_tags at the top as well (ambiguous)")
    if not isinstance(tags, dict) or root.get("student_publication_allowed") is not False:
        raise RefuseToBuild(f"{where}: answer key student_publication_allowed is not false (already published?)")
    if "question_payload_sha256" in tags:
        raise RefuseToBuild(f"{where}: answer key already carries a question_payload_sha256 seal")
    seal_tags = (evidence_root(seal.get("answer_evidence")) or {}).get("approved_tags") or {}
    manifest = _hex(seal_tags.get("tag_binding_manifest_sha256"), f"{where}: sealed tag manifest")
    if tags.get("tag_binding_manifest_sha256") != manifest:
        raise RefuseToBuild(f"{where}: tag_binding_manifest_sha256 differs between readback and sealed preview")
    return _hex(seal.get("question_payload_sha256"), f"{where}: question_payload_sha256"), manifest


def _pair_key(q: dict) -> tuple:
    return (q.get("source_version"),) + _source(q)


def _pair_rows(saved: list[dict], seals: list[dict], bulk: bool = False) -> list[tuple[dict, dict]]:
    """Pair readback and sealed rows by source question. A batch is one module of
    at most MAX_ROWS rows; a bulk run (kimport.bulk) may span many exams and modules."""
    if not saved:
        raise RefuseToBuild("the private readback has no rows")
    if not all(isinstance(x, dict) and isinstance(x.get("question"), dict) for x in saved):
        raise RefuseToBuild("a private readback row has no question snapshot")
    if len(saved) > MAX_ROWS and not bulk:
        raise RefuseToBuild(f"{len(saved)} rows; a publish batch is at most {MAX_ROWS} rows (one module)")
    if len(saved) != len(seals):
        raise RefuseToBuild(f"{len(saved)} readback rows but {len(seals)} sealed preview rows")
    lookup = {_pair_key(s): s for s in seals}
    sources = [_pair_key(x.get("question") or {}) for x in saved]
    if len(lookup) != len(seals) or len(set(sources)) != len(sources) or set(sources) != set(lookup):
        raise RefuseToBuild("readback and sealed preview rows do not pair one to one by "
                            "(source version, section, module, number)")
    modules = {s[:3] for s in sources}
    if len(modules) != 1 and not bulk:
        raise RefuseToBuild(f"rows span {len(modules)} source modules; a publish batch is one module")
    return [(x, lookup[s]) for x, s in zip(saved, sources)]


# ---------------------------------------------------------------- precheck


def require_key_column(export_rows: list[dict]) -> None:
    missing = [r["id"] for r in export_rows if "comparison_key" not in r]
    if missing:
        raise RefuseToBuild(f"the export has no comparison_key field on {len(missing)} rows: migration "
                            "20261021000000 and the key backfill are not applied (or the export predates them); "
                            "apply them, then run sql/live_export.sql again")


def _precheck(items: list[dict], export_rows: list[dict]) -> dict:
    require_key_column(export_rows)
    by_id = {r["id"]: r for r in export_rows}
    for it in items:
        q, row = it["snap"]["question"], by_id.get(it["id"])
        if row is None:
            raise RefuseToBuild(f"{it['id']}: not in the export; the export predates staging. Save a fresh export")
        for field in ("content_hash_v2", "publish_status", "import_status", "is_live", "comparison_key"):
            if row.get(field) != q.get(field):
                raise RefuseToBuild(f"{it['id']}: export {field} {row.get(field)!r} differs from the private "
                                    f"readback {q.get(field)!r}; take a fresh readback and export")
    report, problems = duplicate_check(items, export_rows)
    if problems:
        raise RefuseToBuild("duplicate check failed: " + "; ".join(problems))
    return report


def duplicate_check(items: list[dict], export_rows: list[dict]) -> tuple[dict, list[str]]:
    """The duplicate precheck shared by publish and stage (kimport.stage).

    items: {"id", "source", "record", "full_key", "key"} per batch row; an id
    that is also an export row (publish) is compared with every other row only.
    Every non-archived export row and every other batch row is compared on the
    comparison key (computed, and as stored) and at typo level. Returns the
    report and one problem line per duplicate; the caller decides to refuse.
    Raises RefuseToBuild when the export's stored keys are missing or drifted."""
    by_id = {r["id"]: r for r in export_rows}
    try:
        exported = [record_from_row(r) for r in export_rows if r.get("archived_at") is None]
    except ValueError as e:
        raise RefuseToBuild(f"export: {e}") from None
    batch_ids = {it["id"] for it in items}
    key_of = {r.ref: comparison_key(r) for r in exported}
    _check_backfill(exported, key_of, by_id, batch_ids)
    by_key: dict[str, set[str]] = {}
    by_block: dict[str, list[QuestionRecord]] = {}
    seen: set[tuple[str, str]] = set()
    for r, k in [(r, key_of[r.ref]) for r in exported] + [(it["record"], it["full_key"]) for it in items]:
        by_key.setdefault(k, set()).add(r.ref)
        b = blocking_key(r)
        if (b, r.ref) not in seen:
            seen.add((b, r.ref))
            by_block.setdefault(b, []).append(r)
    for r in export_rows:
        if r.get("comparison_key") and r.get("archived_at") is None:
            by_key.setdefault(r["comparison_key"], set()).add(r["id"])
    rows, problems = [], []
    for it in items:
        rec = it["record"]
        exact = sorted(by_key.get(it["full_key"], set()) - {it["id"]})
        typo = sorted({c.ref for c in by_block.get(blocking_key(rec), ())
                       if c.ref != it["id"] and c.ref not in exact and typo_match(rec, c).same})
        rows.append({"id": it["id"], "source": list(it["source"]),
                     "key": it["key"], "key_status": KEYED if it["key"] else FIGURE_NO_KEY,
                     "exact_matches": exact, "typo_matches": typo})
        if exact:
            problems.append(f"{it['id']} duplicate: same comparison key as {', '.join(exact)}")
        if typo:
            problems.append(f"{it['id']} duplicate: typo-level match with {', '.join(typo)}")
    others = [r for r in exported if r.ref not in batch_ids]
    report = {"normalizer_version": NORMALIZER_VERSION, "export_rows": len(export_rows),
              "archived_rows_ignored": len(export_rows) - len(exported), "passed": not problems,
              "rows": rows,
              NOT_COMPARABLE_ANSWER: sorted(r.ref for r in others if r.meta.get("answer_problem")
                                            and not r.meta.get("format_problem")),
              NOT_COMPARABLE_FORMAT: sorted(r.ref for r in others if r.meta.get("format_problem"))}
    return report, problems


def _check_backfill(exported, key_of: dict, by_id: dict, batch_ids: set) -> None:
    """Every keyable non-batch, non-archived row must carry the key this normalizer
    computes (same keyable rule as kimport.backfill). The batch's own rows need no
    backfill: publish.sql sets their key."""
    missing, drift = [], []
    for r in exported:
        if r.ref in batch_ids or r.meta.get("format_problem") or r.meta.get("answer_problem") or is_unkeyable(r):
            continue
        stored = by_id[r.ref].get("comparison_key")
        if stored is None:
            missing.append(r.ref)
        elif stored != key_of[r.ref]:
            drift.append(r.ref)
    problems = []
    if missing:
        problems.append(f"{len(missing)} keyable rows have no comparison_key (e.g. {', '.join(missing[:5])}): "
                        "the backfill is not applied or rows were added since; run `kimport-cli.py backfill` "
                        "on a fresh export, apply it, then export again")
    if drift:
        problems.append(f"{len(drift)} rows have a stored comparison_key that differs from the key "
                        f"{NORMALIZER_VERSION} computes (e.g. {', '.join(drift[:5])}): normalizer drift or an "
                        "edited row; stop and ask before publishing")
    if problems:
        raise RefuseToBuild("backfill check failed: " + "; ".join(problems))


# ---------------------------------------------------------------- SQL


def _items_literal(snap: dict, seal: str) -> str:
    blob = base64.b64encode(json.dumps([{**snap, "seal": seal}], ensure_ascii=False,
                                       separators=(",", ":")).encode()).decode()
    return f"convert_from(decode('{blob}','base64'),'UTF8')::jsonb"


_DECLARE = "DECLARE items jsonb:={}; v jsonb; q public.quiz_questions%rowtype; k public.answer_key_entries%rowtype;"
_LOOP = [
    "BEGIN",
    " IF jsonb_array_length(items)<>1 THEN RAISE EXCEPTION 'one exact row required'; END IF;",
    " FOR v IN SELECT value FROM jsonb_array_elements(items) LOOP",
    "  SELECT * INTO STRICT q FROM public.quiz_questions WHERE id=(v->'question'->>'id')::uuid FOR UPDATE;",
]
def _raw(it: dict):
    return ((it.get("snap") or {}).get("keys") or [{}])[0].get("raw_model_response")


def _flag_on(raw) -> str:
    return f"{json_path(raw, 'student_publication_allowed')},'true'::jsonb),"


def _seal(raw) -> str:
    return f"{json_path(raw, 'approved_tags', 'question_payload_sha256')},to_jsonb(v->>'seal'))"


def _publish_block(tag: str, it: dict) -> list[str]:
    key, raw = it["key"], _raw(it)
    col = "k.raw_model_response"
    body = [
        _DECLARE.format(it["items"]), *_LOOP,
        "  IF to_jsonb(q) IS DISTINCT FROM v->'question'",
        "   OR coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.letter) FROM public.answer_choices c"
        " WHERE c.question_id=q.id),'null'::jsonb) IS DISTINCT FROM v->'choices'",
        "   OR (SELECT count(*) FROM public.quiz_questions qq WHERE qq.source_version=q.source_version"
        " AND qq.source_section=q.source_section AND qq.source_module=q.source_module"
        " AND qq.source_question_number=q.source_question_number)<>1",
        "   OR (SELECT count(*) FROM public.quiz_questions qq WHERE qq.content_hash_v2=q.content_hash_v2)<>1",
        "  THEN RAISE EXCEPTION 'private question changed: %',q.id; END IF;",
        "  SELECT * INTO STRICT k FROM public.answer_key_entries WHERE question_id=q.id FOR UPDATE;",
        "  IF to_jsonb(k) IS DISTINCT FROM v->'keys'->0",
        f"   OR q.publish_status<>'{STAGED_STATUS}' OR q.import_status<>'{STAGED_IMPORT}'"
        " OR q.is_live IS DISTINCT FROM false OR q.archived_at IS NOT NULL",
        f"   OR {sql_get(col, raw, 'student_publication_allowed', text=True)}<>'false'",
        f"   OR {sql_get(col, raw, 'approved_tags', 'tag_binding_manifest_sha256', text=True)}<>{lit(it['manifest'])}",
        f"   OR {sql_get(col, raw, 'approved_tags')} ? 'question_payload_sha256'",
        "  THEN RAISE EXCEPTION 'private answer changed: %',q.id; END IF;",
    ]
    if key:
        body.append(f"  IF EXISTS (SELECT 1 FROM public.quiz_questions o WHERE o.comparison_key = {lit(key)}"
                    " AND o.id <> q.id AND o.archived_at IS NULL) THEN RAISE EXCEPTION 'duplicate comparison key: %', q.id; END IF;")
    body += [
        "  UPDATE public.answer_key_entries SET raw_model_response=jsonb_set(",
        f"   jsonb_set(raw_model_response,{_flag_on(raw)}",
        f"   {_seal(raw)} WHERE id=k.id;",
        "  UPDATE public.quiz_questions SET import_status='ok',import_flag_reason=NULL,publish_status='publish_ready'"
        + (f",comparison_key={lit(key)}" if key else "") + " WHERE id=q.id;",
        " END LOOP;",
    ]
    return do_block(tag, body)


def _rollback_block(tag: str, it: dict) -> list[str]:
    raw = _raw(it)
    key_guard = f"q.comparison_key IS DISTINCT FROM {lit(it['key'])}" if it["key"] else "q.comparison_key IS NOT NULL"
    body = [
        _DECLARE.format(it["items"]), *_LOOP,
        "  SELECT * INTO STRICT k FROM public.answer_key_entries WHERE question_id=q.id FOR UPDATE;",
        "  IF q.source_version IS DISTINCT FROM v->'question'->>'source_version'",
        "   OR q.content_hash_v2 IS DISTINCT FROM v->'question'->>'content_hash_v2'",
        "   OR q.publish_status<>'publish_ready' OR q.import_status<>'ok' OR q.is_live IS DISTINCT FROM true",
        f"   OR q.import_flag_reason IS NOT NULL OR {key_guard}",
        "   OR k.raw_model_response IS DISTINCT FROM jsonb_set(",
        f"     jsonb_set(v->'keys'->0->'raw_model_response',{_flag_on(raw)}",
        f"     {_seal(raw)}",
        "  THEN RAISE EXCEPTION 'published state changed: %',q.id; END IF;",
        f"  UPDATE public.quiz_questions SET import_status='{STAGED_IMPORT}',"
        "import_flag_reason=v->'question'->>'import_flag_reason',"
        f"publish_status='{STAGED_STATUS}',comparison_key=v->'question'->>'comparison_key' WHERE id=q.id;",
        "  UPDATE public.answer_key_entries SET raw_model_response=v->'keys'->0->'raw_model_response' WHERE id=k.id;",
        " END LOOP;",
    ]
    return do_block(tag, body)


def _row_note(n: int, it: dict) -> str:
    sec, mod, num = _source(it["snap"]["question"])
    what = f"key {it['key']}" if it["key"] else FIGURE_NO_KEY
    return f"-- row {n}: {it['id']} ({sec} {mod} Q{num}); {what}"


FINGERPRINT_FAILED = "bank changed since export; take a fresh export"


def _fingerprint_block(tag: str, doc: ExportDoc) -> list[str]:
    """Runs first inside the publish transaction: the bank must still be exactly the exported one."""
    return do_block(tag, [
        "DECLARE n bigint; f text;",
        "BEGIN",
        f" SELECT count(*), {FINGERPRINT_SQL} INTO n, f FROM public.quiz_questions q;",
        f" IF n <> {int(doc.row_count)} OR f IS DISTINCT FROM {lit(doc.fingerprint)}",
        f" THEN RAISE EXCEPTION {lit(FINGERPRINT_FAILED)}; END IF;",
    ])


def _sql(batch: str, items: list[dict], kind: str, doc: ExportDoc) -> str:
    slug = batch.replace("-", "_")
    head = {
        "publish": f"-- kimport publish: batch {batch} ({len(items)} rows). Normalizer {NORMALIZER_VERSION}.",
        "rollback": f"-- kimport rollback: undo the publish of batch {batch} ({len(items)} rows).",
    }[kind]
    out = [head,
           "-- Needs the founder's go-ahead before it runs. One transaction: any failed guard aborts every row.",
           "-- Needs migration 20261021000000 (comparison_key column). No row is ever deleted.",
           "BEGIN;", ""]
    if kind == "publish":
        out.append(f"-- export {doc.exported_at}: {doc.row_count} rows, fingerprint {doc.fingerprint}")
        out += _fingerprint_block(f"kimport_publish_{slug}_fingerprint", doc)
    order = list(enumerate(items, 1))
    if kind == "rollback":
        order.reverse()
    for n, it in order:
        out.append(_row_note(n, it))
        tag = f"kimport_{kind}_{slug}_{n:02d}"
        out += _publish_block(tag, it) if kind == "publish" else _rollback_block(tag, it)
    return "\n".join(out + ["COMMIT;", ""])


# ---------------------------------------------------------------- entry points


def prepare_publish(private_readback: Path, sealed_preview: Path, export: Path, intents: Path,
                    batch: str, bulk: bool = False) -> tuple[list[dict], ExportDoc, dict]:
    """Every input check and the precheck; returns (items, export doc, precheck)."""
    if not isinstance(batch, str) or not _BATCH.fullmatch(batch):
        raise RefuseToBuild(f"batch name {batch!r} must be lowercase letters, digits and dashes")
    try:
        require_no_open_intents(Path(intents))
    except OpenIntent as e:
        raise RefuseToBuild(str(e)) from None
    readback_doc = _json(private_readback, "private readback")
    sealed_doc = _json(sealed_preview, "sealed preview")
    try:
        saved = [x["snapshot"] for x in readback_doc["rows"]]
        seals = list(sealed_doc["rows"])
    except (KeyError, TypeError):
        raise RefuseToBuild("private readback or sealed preview is not in the task-3 shape ({\"rows\": [...]})") from None
    pairs = _pair_rows(saved, seals, bulk)
    doc = _read_export(export)
    _check_fresh(private_readback, export, saved, doc)
    export_rows = doc.rows

    items, figure_problems = [], []
    for snap, seal_row in pairs:
        seal, manifest = _check_row(snap, seal_row)
        tags = (evidence_root(snap["keys"][0].get("raw_model_response")) or {}).get("approved_tags") or {}
        figure_problems += [f"{snap['question'].get('id')}: {r}" for r in
                            figure_gate.publish_reasons(intents, tags.get("stable_question_id"), snap)]
        try:
            record = readback_record(snap)
        except ValueError as e:
            raise RefuseToBuild(str(e)) from None
        qid = snap["question"]["id"]
        if record.meta.get("answer_problem") or record.meta.get("format_problem"):
            raise RefuseToBuild(f"{qid}: answer letter or format does not fit the choices")
        full_key = comparison_key(record)
        unkeyed = is_unkeyable(record)
        stored = snap["question"]["comparison_key"]
        if unkeyed and stored is not None:
            raise RefuseToBuild(f"{qid}: has a database key but its figure is not represented in the key")
        if not unkeyed and stored is not None and stored != full_key:
            raise RefuseToBuild(f"{qid}: stored comparison_key {stored} differs from the computed {full_key}")
        if not _KEY.fullmatch(full_key):
            raise RefuseToBuild(f"{qid}: unexpected key format {full_key!r}")
        items.append({"id": qid, "snap": snap, "source": _source(snap["question"]), "record": record,
                      "full_key": full_key,
                      "key": None if unkeyed else full_key, "seal": seal, "manifest": manifest,
                      "items": _items_literal(snap, seal)})

    if figure_problems:
        raise RefuseToBuild("; ".join(figure_problems))
    precheck = {"batch": batch, **_precheck(items, export_rows)}
    return items, doc, precheck


def build_publish(private_readback: Path, sealed_preview: Path, export: Path, intents: Path,
                  batch: str) -> PublishBundle:
    items, doc, precheck = prepare_publish(private_readback, sealed_preview, export, intents, batch)
    try:
        publish_sql, rollback_sql = _sql(batch, items, "publish", doc), _sql(batch, items, "rollback", doc)
    except ValueError as e:  # dollar tag inside its own block
        raise RefuseToBuild(str(e)) from None
    precheck["publish_sql_sha256"] = hashlib.sha256(publish_sql.encode("utf-8")).hexdigest()
    precheck["question_ids"] = [it["id"] for it in items]
    return {"publish_sql": publish_sql, "rollback_sql": rollback_sql,
            "keys": {it["id"]: it["key"] for it in items}, "precheck": precheck}


def run_publish(batch: str, readback: Path, sealed: Path, export: Path, intents: Path, out_dir: Path) -> dict:
    bundle = build_publish(Path(readback), Path(sealed), Path(export), Path(intents), batch)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    files = {
        "publish.sql": bundle["publish_sql"],
        "rollback.sql": bundle["rollback_sql"],
        "rollback.dryrun.sql": dryrun_variant(bundle["rollback_sql"]),
        "publish.dryrun.sql": dryrun_variant(bundle["publish_sql"]),
        "keys.json": json.dumps(bundle["keys"], indent=2, sort_keys=True) + "\n",
        "precheck.json": json.dumps(bundle["precheck"], indent=2, ensure_ascii=False, sort_keys=True) + "\n",
    }
    # Stage every file first, then rename rollback first and publish last, so a
    # failure never leaves a new publish.sql beside an old rollback.sql.
    staged = []
    for name in ("rollback.sql", "rollback.dryrun.sql", "keys.json", "precheck.json",
                 "publish.dryrun.sql", "publish.sql"):
        tmp = out_dir / f".{name}.tmp"
        tmp.write_text(files[name], encoding="utf-8")
        staged.append((tmp, out_dir / name))
    for tmp, final in staged:
        os.replace(tmp, final)
    keyed = sum(1 for k in bundle["keys"].values() if k)
    return {"rows": len(bundle["keys"]), "keyed": keyed, "figure_no_key": len(bundle["keys"]) - keyed}
