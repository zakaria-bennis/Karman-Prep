"""Hide live questions the live-bank QA pass found a problem with, and put them
back once they are fixed (`k qa hide`, `k qa restore`).

Hiding uses the sweep's un-publish shape: publish_status 'needs_human_review',
import_status 'needs_review' (which turns the generated is_live off), and
import_flag_reason 'qa:<label>: <fix or note>', and also archives the row
(archived_at = now()). A reviewer's corrected version goes back on the site
IN PLACE, on the same row (kimport.qa_correct, run by the autopilot): the
unique source-question index covers archived rows too, so a second row for
the same source question cannot be inserted. A corrected row counts as no
longer hidden once it is in qa/corrections.jsonl.
Nothing is deleted and the answer key is not touched, so putting back the four
columns restores the row exactly.

Which questions are hidden (one results line per id; a later line for the
same id, in a later file or lower in a file, replaces an earlier one):

  verdict key_wrong, broken, unsure, minor_typo, minor -> hidden ("minor" is r2's name for minor_typo)
  no verdict field, but flags                    -> hidden as pending_review (still being reviewed)
  no verdict field, blind answer did not match   -> hidden as unreviewed_mismatch (still being reviewed)
  verdict clean, key_ok; or no verdict and clean: true -> stays live
  verdict pending                                -> stays live, not certified (a reviewer's explicit
                                                    not-checked-yet mark)
  no verdict, no flags, answers match            -> stays live
  any other verdict (e.g. unverifiable)          -> UNKNOWN: not hidden, listed; a real `qa hide`
                                                    refuses until the policy names it

Ids from the automated audit (`--ids`, repeatable) are hidden as 'qa:audit'.

Every database write follows the README sequence: writer lock, fresh export,
SQL file BEGIN ... COMMIT with a .dryrun.sql twin (sqlutil.dryrun_variant),
intent opened, dry run, real file, readback, intent closed. hide.sql opens with
the export fingerprint guard (like publish.sql) and each row block stops the
whole file if that row is no longer live or changed since the export.
"""

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

from kimport.export import FINGERPRINT_SQL, ExportDoc
from kimport.sqlutil import do_block, dryrun_variant, lit, uuid_literal
from kimport.sweep import PUBLISH_READY, UNPUBLISHED_IMPORT, UNPUBLISHED_STATUS

HIDE_VERDICTS = ("key_wrong", "broken", "unsure", "minor_typo", "minor")
KEEP_VERDICTS = ("clean", "key_ok", "pending")
UNKNOWN = "unknown"
REASON_PREFIX = "qa:"
ARCHIVED = "<archived>"  # in a put: archived_at = now(); in a guard or readback: archived_at is not null
REASON_MAX = 200
FINGERPRINT_FAILED = "bank changed since export; take a fresh export"
_ROW_NOTE = "-- kimport qa row "


# ---------------------------------------------------------------- results


def classify(line: dict) -> tuple[bool, str]:
    """(hide?, label) for one results line. An unlisted verdict gives (False, "unknown")."""
    if "verdict" in line and line["verdict"] is not None:
        v = line["verdict"]
        if v in HIDE_VERDICTS:
            return True, v
        if v in KEEP_VERDICTS:
            return False, v
        return False, UNKNOWN
    if line.get("clean") is True:
        return False, "clean"
    if line.get("flags"):
        return True, "pending_review"
    if line.get("match") is False:
        return True, "unreviewed_mismatch"
    return False, "clean"


def unknown_verdicts(results: dict[str, dict]) -> dict[str, int]:
    out: dict[str, int] = {}
    for line in results.values():
        if classify(line)[1] == UNKNOWN:
            out[str(line["verdict"])] = out.get(str(line["verdict"]), 0) + 1
    return dict(sorted(out.items()))


def short(text, limit: int = REASON_MAX) -> str:
    s = re.sub(r"\s+", " ", str(text or "")).strip()
    return s if len(s) <= limit else s[: limit - 3].rstrip() + "..."


def reason_for(label: str, line: dict) -> str:
    detail = line.get("fix") or line.get("verdict_note") or line.get("note") or ", ".join(line.get("flags") or ())
    return short(f"{REASON_PREFIX}{label}: {short(detail)}" if detail else f"{REASON_PREFIX}{label}")


def read_results(files) -> dict[str, dict]:
    """Latest line per id across the results files, in the order given."""
    out: dict[str, dict] = {}
    for f in files:
        for n, raw in enumerate(Path(f).read_text(encoding="utf-8").splitlines(), 1):
            if not raw.strip():
                continue
            try:
                line = json.loads(raw)
            except ValueError:
                raise ValueError(f"{f}:{n}: not a JSON line") from None
            if not isinstance(line, dict) or "id" not in line:
                raise ValueError(f"{f}:{n}: a results line needs an id")
            uuid_literal(line["id"])
            out[line["id"]] = line
    return out


def read_ids(path) -> dict[str, str]:
    """{id: detail} from an audit file: a JSON list of ids or of objects with an id
    (detail from reason/fix/note/problems), an object holding such a list under
    ids/items/rows/problems/flagged, or plain text with one id per line."""
    text = Path(path).read_text(encoding="utf-8")
    try:
        data = json.loads(text)
    except ValueError:
        data = [ln.split("#", 1)[0].strip() for ln in text.splitlines()]
        data = [d for d in data if d]
    if isinstance(data, dict):
        lists = [data[k] for k in ("ids", "items", "rows", "problems", "flagged") if isinstance(data.get(k), list)]
        if len(lists) != 1:
            raise ValueError(f"{path}: expected one list under ids, items, rows, problems or flagged")
        data = lists[0]
    if not isinstance(data, list):
        raise ValueError(f"{path}: not a list of ids")
    out = {}
    for item in data:
        if isinstance(item, str):
            out[uuid_literal(item)] = ""
        elif isinstance(item, dict) and isinstance(item.get("id"), str):
            d = item.get("reason") or item.get("fix") or item.get("note") or item.get("problems") or ""
            out[uuid_literal(item["id"])] = ", ".join(map(str, d)) if isinstance(d, list) else str(d)
        else:
            raise ValueError(f"{path}: entry {item!r} has no id")
    return out


def wanted(results: dict[str, dict], audit: dict[str, str]) -> dict[str, tuple[str, str]]:
    """{id: (label, reason)} for every id the QA results or the audit say to hide."""
    out = {}
    for qid, line in results.items():
        hide, label = classify(line)
        if hide:
            out[qid] = (label, reason_for(label, line))
    for qid, detail in audit.items():
        if qid not in out:
            out[qid] = ("audit", short(f"{REASON_PREFIX}audit: {short(detail)}" if detail else f"{REASON_PREFIX}audit"))
    return out


def _is_live(row: dict) -> bool:
    return row.get("is_live") is True and row.get("publish_status") in PUBLISH_READY and row.get("archived_at") is None


def plan_hide(want: dict[str, tuple[str, str]], rows: dict[str, dict]) -> tuple[list[dict], dict]:
    """(items to hide, skipped {id: why}). Only rows still live in the export are hidden."""
    items, skipped = [], {}
    for qid in sorted(want):
        label, reason = want[qid]
        row = rows.get(qid)
        if row is None:
            skipped[qid] = "not in the export"
        elif not _is_live(row):
            skipped[qid] = (f"already hidden by QA ({row.get('import_flag_reason')})"
                            if str(row.get("import_flag_reason") or "").startswith(REASON_PREFIX) else "not live")
        else:
            items.append({"id": qid, "label": label, "reason": reason, "row": row,
                          "set": {"publish_status": UNPUBLISHED_STATUS, "import_status": UNPUBLISHED_IMPORT,
                                  "import_flag_reason": reason, "archived_at": ARCHIVED}})
    return items, skipped


# ---------------------------------------------------------------- SQL


def _fingerprint_block(tag: str, doc: ExportDoc) -> list[str]:
    return do_block(tag, [
        "DECLARE n bigint; f text;",
        "BEGIN",
        f" SELECT count(*), {FINGERPRINT_SQL} INTO n, f FROM public.quiz_questions q;",
        f" IF n <> {int(doc.row_count)} OR f IS DISTINCT FROM {lit(doc.fingerprint)}",
        f" THEN RAISE EXCEPTION {lit(FINGERPRINT_FAILED)}; END IF;",
    ])


def _row_block(tag: str, qid: str, expect: dict, live: bool | None, put: dict) -> list[str]:
    """Lock the row, stop if any expected column differs, then set `put`."""
    note = json.dumps({"id": qid, "expect": expect, "live": live, "set": put}, sort_keys=True)
    guard = [f"q.{c} IS NULL" if v == ARCHIVED else
             f"q.{c} IS DISTINCT FROM {lit(v)}{'::timestamptz' if c == 'archived_at' and v else ''}"
             for c, v in expect.items()]
    if live is not None:
        guard.append(f"q.is_live IS DISTINCT FROM {'true' if live else 'false'}")
    sets = ", ".join(f"{c} = {'now()' if v == ARCHIVED else lit(v)}" for c, v in put.items())
    return [_ROW_NOTE + note] + do_block(tag, [
        "DECLARE q public.quiz_questions%rowtype;",
        "BEGIN",
        f" SELECT * INTO STRICT q FROM public.quiz_questions WHERE id = '{uuid_literal(qid)}'::uuid FOR UPDATE;",
        " IF " + "\n   OR ".join(guard),
        " THEN RAISE EXCEPTION 'question changed since the export: %', q.id; END IF;",
        f" UPDATE public.quiz_questions SET {sets} WHERE id = q.id;",
    ])


_COLS = ("publish_status", "import_status", "import_flag_reason", "archived_at")


def _sql(title: str, blocks: list[tuple[str, dict, bool | None, dict]], doc: ExportDoc | None, slug: str) -> str:
    out = [f"-- kimport qa: {title} ({len(blocks)} rows). No row is ever deleted.",
           "-- One transaction: any failed guard stops every row. Run the .dryrun.sql twin first.",
           "BEGIN;", ""]
    if doc is not None:
        out.append(f"-- export {doc.exported_at}: {doc.row_count} rows, fingerprint {doc.fingerprint}")
        out += _fingerprint_block(f"kimport_qa_{slug}_fingerprint", doc)
    for n, (qid, expect, live, put) in enumerate(blocks, 1):
        out += _row_block(f"kimport_qa_{slug}_{n:04d}", qid, expect, live, put)
    ids = ",".join(f"'{uuid_literal(b[0])}'" for b in blocks) or "NULL"
    out.append(f"SELECT count(*) AS rows_now_hidden FROM public.quiz_questions WHERE id = ANY (ARRAY[{ids}]::uuid[])"
               f" AND is_live IS DISTINCT FROM true;")
    return "\n".join(out + ["COMMIT;", ""])


def hide_sql(items: list[dict], doc: ExportDoc) -> str:
    blocks = [(it["id"], {**{c: it["row"].get(c) for c in _COLS}, "content_hash_v2": it["row"].get("content_hash_v2")},
               True, it["set"]) for it in items]
    return _sql("hide live questions with QA problems", blocks, doc, "hide")


def undo_sql(records: list[dict]) -> str:
    """Put exactly the hidden rows back, guarded on the state the hide left them in."""
    blocks = [(r["id"], {"publish_status": UNPUBLISHED_STATUS, "import_status": UNPUBLISHED_IMPORT,
                         "import_flag_reason": r["reason"], "archived_at": ARCHIVED,
                         "content_hash_v2": r["content_hash_v2"]}, False,
               {c: r[f"previous_{c}"] for c in _COLS}) for r in records]
    return _sql("undo the QA hide (put the rows back exactly)", blocks, None, "undo")


def restore_sql(records: list[dict], rows: dict[str, dict], doc: ExportDoc) -> str:
    """Republish fixed rows: guarded on the fresh export (the fix may have changed the content)."""
    blocks = [(r["id"], {**{c: rows[r["id"]].get(c) for c in _COLS},
                         "content_hash_v2": rows[r["id"]].get("content_hash_v2")}, False,
               {c: r[f"previous_{c}"] for c in _COLS}) for r in records]
    return _sql("republish fixed questions", blocks, doc, "restore")


def readback_sql(ids: list[str]) -> str:
    arr = ",".join(f"'{uuid_literal(i)}'" for i in ids) or "NULL"
    return ("-- kimport qa readback. Read-only.\n"
            "SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'publish_status', publish_status,"
            " 'import_status', import_status, 'import_flag_reason', import_flag_reason, 'archived_at', archived_at,"
            " 'is_live', is_live)"
            f" ORDER BY id), '[]'::jsonb) AS rows FROM public.quiz_questions WHERE id = ANY (ARRAY[{arr}]::uuid[]);\n")


def parse_readback(raw) -> dict[str, dict]:
    """The readback query result (list of one {rows: [...]}, maybe as a JSON string)."""
    def unwrap(v):
        if isinstance(v, str):
            v = json.loads(v)
        if isinstance(v, list) and len(v) == 1 and isinstance(v[0], dict) and "rows" in v[0]:
            return unwrap(v[0]["rows"])
        if isinstance(v, dict) and "rows" in v:
            return unwrap(v["rows"])
        return v
    rows = unwrap(raw)
    if not isinstance(rows, list) or not all(isinstance(r, dict) and "id" in r for r in rows):
        raise ValueError(f"readback: unexpected result {str(raw)[:200]}")
    return {r["id"]: r for r in rows}


def matches(back: dict[str, dict], want: dict[str, dict]) -> list[str]:
    """Ids whose read-back columns differ from `want` ({id: {col: value}})."""
    def same(got, v):
        return got is not None if v == ARCHIVED else got == v
    return sorted(i for i, cols in want.items()
                  if i not in back or any(not same(back[i].get(c), v) for c, v in cols.items()))


# ---------------------------------------------------------------- the hidden log


def read_log(path: Path) -> list[dict]:
    path = Path(path)
    if not path.exists():
        return []
    return [json.loads(ln) for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()]


def append_log(path: Path, entries: list[dict]) -> None:
    with open(path, "a", encoding="utf-8") as f:
        for e in entries:
            f.write(json.dumps(e, sort_keys=True, ensure_ascii=False) + "\n")


def currently_hidden(qa_dir: Path) -> dict[str, dict]:
    """{id: hide record} for rows hidden by QA and not restored or corrected in place since."""
    out: dict[str, dict] = {}
    for e in read_log(Path(qa_dir) / "hidden.jsonl"):
        out[e["id"]] = e
    for e in read_log(Path(qa_dir) / "restored.jsonl"):
        if e["id"] in out and e["at"] >= out[e["id"]]["at"]:
            del out[e["id"]]
    for e in read_log(Path(qa_dir) / "corrections.jsonl"):  # kimport.qa_correct.CORRECTIONS
        if e["question_id"] in out and e["at"] >= out[e["question_id"]]["at"]:
            del out[e["question_id"]]
    return out


def write_undo(qa_dir: Path) -> int:
    """pipeline/qa/restore.sql (+ .dryrun.sql): undo for every row QA has hidden and not restored."""
    records = sorted(currently_hidden(qa_dir).values(), key=lambda r: r["id"])
    sql = undo_sql(records)
    (Path(qa_dir) / "restore.sql").write_text(sql, encoding="utf-8")
    (Path(qa_dir) / "restore.dryrun.sql").write_text(dryrun_variant(sql), encoding="utf-8")
    return len(records)


def sha(data) -> str:
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode("utf-8")).hexdigest()


def counts(items: list[dict]) -> dict:
    return dict(sorted(Counter(it["label"] for it in items).items()))

