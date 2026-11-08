"""Evidence-only corrections for rows that are already LIVE.

A reviewer may write a corrected batch ("fix batch": folder name ending
-fix-<n>, or READY saying "corrected evidence") for rows that were published
earlier, to replace the skill review record in the evidence while the
question stays exactly as it is. Staging it would be refused (the source
question is in the bank) and kimport.fix only updates private drafts held at
seal. This module builds the guarded UPDATE for the live case: it replaces
only answer_key_entries.raw_model_response.

Per row, at build time (from a fresh read-only snapshot of the live row):
  - exactly one export row and one snapshot for its source question, the same
    id, live (is_live, a visible publish_status, import_status ok, not archived);
  - every question, mirror, choice and answer key column the corrected row
    would write (ts/stage-rows.ts, the app's importQuestion, the same path
    stage uses) equals the live row, except the three columns publish sets
    (import_status, import_flag_reason, publish_status); comparison_key equals
    the key the corrected row computes;
  - the live evidence names the same stable id and carries a seal and
    student_publication_allowed true; the corrected evidence differs from it
    only in the skill review record (SKILL_FIELDS) and the batch bookkeeping
    that names the corrected batch (schema, approved_tags.pilot_row_sha256 and
    tag_binding_manifest_sha256), and the skill review record does change;
  - the new evidence is the corrected evidence with
    student_publication_allowed true and the STORED question_payload_sha256;
    run through ts/seal-readback.ts (readCatalogQuestionScope and
    catalogQuestionPayloadHash) against the live row it must pass, allow
    publication and recompute exactly the stored seal (so question content is
    unchanged since publish).
Rows that fail are refused with the reason and left out.

live-evidence-NN.sql: one BEGIN ... COMMIT per chunk, the export fingerprint
guard first, then per row: lock the question and its one answer key row,
require both (and the choices) to equal the snapshot exactly and the row to be
live, and update the evidence. Each has a .dryrun.sql twin.
live-rollback-NN.sql restores the old evidence (only where the new evidence is
still in place). live-readback-NN.sql reads the rows back; verify_readback
checks them.

Nothing here connects to a database; the SQL is text the autopilot runs only
after its dry-run twin passed.
"""

import copy
import json
import re
import tempfile
from pathlib import Path

from kimport import bulk
from kimport import stage as st
from kimport.fix import _blob, _differs
from kimport.publish import RefuseToBuild
from kimport.sqlutil import do_block, dryrun_variant

EVIDENCE = "raw_model_response"
SKILL_FIELDS = ("D_original_record", "independent_D_record", "independent_D_review_sha256",
                "D_classification_record", "D_classification_sha256")
BATCH_FIELDS = ("schema",)
BATCH_TAGS = ("pilot_row_sha256", "tag_binding_manifest_sha256")
SEAL = "question_payload_sha256"
PUBLISH_COLS = ("import_status", "import_flag_reason", "publish_status")
VISIBLE = ("publish_ready", "publish_ready_with_verified_repair")
_FIX_NAME = re.compile(r"-fix-\d+$")
_HEX64 = re.compile(r"[0-9a-f]{64}")


def is_fix_batch(batch_dir: Path) -> bool:
    """A corrected batch: folder name ...-fix-<n>, or READY says it carries corrected evidence."""
    if _FIX_NAME.search(Path(batch_dir).name):
        return True
    try:
        return "corrected evidence" in (Path(batch_dir) / "READY").read_text(encoding="utf-8")
    except OSError:
        return False


def is_live(q: dict) -> bool:
    return (q.get("is_live") is True and q.get("publish_status") in VISIBLE and q.get("archived_at") is None
            and q.get("import_status") == "ok")


def live_sources(export_rows: list[dict]) -> set:
    return {st._source(r) for r in export_rows if r.get("is_live") is True and r.get("archived_at") is None
            and r.get("publish_status") in VISIBLE}


def split(dirs: list[Path], export_rows: list[dict], exams_dir: Path, rows_runner) -> tuple[list[Path], list[Path]]:
    """(fix batches with at least one row whose source question is live, every other folder)."""
    cands = [d for d in dirs if is_fix_batch(d)]
    if not cands:
        return [], list(dirs)
    live = live_sources(export_rows)
    loaded, _ = bulk.load_batches(cands, exams_dir, None, rows_runner)
    hit = {Path(b["dir"]).name for b in loaded if any(it["source"] in live for it in b["items"])}
    return [d for d in dirs if d.name in hit], [d for d in dirs if d.name not in hit]


def _strip(ev: dict) -> dict:
    out = {k: v for k, v in ev.items() if k not in SKILL_FIELDS + BATCH_FIELDS + ("student_publication_allowed",)}
    tags = dict(out.get("approved_tags") or {})
    for k in BATCH_TAGS + (SEAL,):
        tags.pop(k, None)
    out["approved_tags"] = tags
    return out


def _diff_names(a: dict, b: dict, prefix: str = "") -> list[str]:
    out = []
    for k in sorted(set(a) | set(b)):
        if a.get(k) != b.get(k):
            if isinstance(a.get(k), dict) and isinstance(b.get(k), dict) and k == "approved_tags":
                out += _diff_names(a[k], b[k], "approved_tags.")
            else:
                out.append(prefix + k)
    return out


def new_evidence(old: dict, new: dict) -> dict:
    final = copy.deepcopy(new)
    final["student_publication_allowed"] = True
    final["approved_tags"] = {**final["approved_tags"], SEAL: old["approved_tags"][SEAL]}
    return final


def check_evidence(sid: str, old, new) -> list[str]:
    if not isinstance(old, dict) or not isinstance(new, dict) or "kind" in old or "kind" in new:
        return ["the evidence is not a flat approved-tags record"]
    otags, ntags = old.get("approved_tags"), new.get("approved_tags")
    if not isinstance(otags, dict) or not isinstance(ntags, dict):
        return ["the evidence has no approved_tags"]
    out = []
    if otags.get("stable_question_id") != sid or ntags.get("stable_question_id") != sid:
        out.append("the live evidence names another stable question id")
    if old.get("student_publication_allowed") is not True or not _HEX64.fullmatch(str(otags.get(SEAL))):
        out.append("the live evidence is not sealed, published evidence")
    if new.get("student_publication_allowed") is not False or SEAL in ntags:
        out.append("the corrected evidence must be unpublished and unsealed")
    bad = _diff_names(_strip(old), _strip(new))
    if bad:
        out.append("the corrected evidence differs outside the skill review record: " + ", ".join(bad))
    if all(old.get(k) == new.get(k) for k in SKILL_FIELDS):
        out.append("the corrected skill review record equals the live one")
    return out


def check_row(it: dict, export_rows: list[dict], snaps: list[dict]) -> tuple[dict | None, list[str]]:
    """(the live snapshot, reasons to refuse)."""
    if len(export_rows) != 1 or len(snaps) != 1:
        return None, [f"{len(export_rows)} bank rows and {len(snaps)} readback rows for its source question; "
                      "expected one"]
    snap, row = snaps[0], it["row"]
    q = snap.get("question") or {}
    out = []
    if export_rows[0]["id"] != q.get("id"):
        out.append("the export and the readback name different rows")
    if not is_live(q):
        out.append("the bank row is not a live published row")
    bad = _differs({**row["question"], **row["mirror"]}, q, skip=PUBLISH_COLS)
    if bad:
        out.append(bad.replace("private draft", "live row"))
    if q.get("comparison_key") != it["key"]:
        out.append("comparison_key differs from the live row")
    have, want = snap.get("choices") or [], sorted(row["choices"], key=lambda c: c["letter"])
    if [c.get("letter") for c in have] != [c["letter"] for c in want]:
        out.append("the choices differ from the live row")
    else:
        for w, h in zip(want, have):
            bad = _differs(w, h)
            if bad:
                out.append(f"choice {w['letter']}: {bad.replace('private draft', 'live row')}")
    keys = snap.get("keys") or []
    if len(keys) != 1:
        out.append(f"{len(keys)} answer key rows on the live row; expected one")
        return snap, out
    bad = _differs(row["key"], keys[0], skip=(EVIDENCE,))
    if bad:
        out.append(f"answer key: {bad.replace('private draft', 'live row')}")
    out += check_evidence(it["id"], keys[0].get(EVIDENCE), row["key"][EVIDENCE])
    return snap, out


def _with_evidence(snap: dict, ev: dict) -> dict:
    return {**snap, "keys": [{**snap["keys"][0], EVIDENCE: ev}]}


def seal_problems(pairs: list[tuple[str, dict]], sealer) -> dict:
    """{stable id: reason} for snapshots (with the new evidence in place) that the app's scope check
    rejects, that do not allow publication, or whose recomputed seal is not the stored one."""
    if not pairs:
        return {}
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "live-predicted.json"
        path.write_text(json.dumps({"rows": [{"snapshot": s} for _, s in pairs]}, ensure_ascii=False),
                        encoding="utf-8")
        seals, failed = sealer(path)
    by_qid = {s.get("question_id"): s for s in seals}
    why = {f.get("question_id"): str(f.get("error") or "cannot be sealed") for f in failed}
    out = {}
    for sid, snap in pairs:
        qid = snap["question"]["id"]
        stored = snap["keys"][0][EVIDENCE]["approved_tags"].get(SEAL)
        seal = by_qid.get(qid)
        if qid in why:
            out[sid] = f"the app's scope check rejects the new evidence: {why[qid]}"
        elif seal is None:
            out[sid] = "the seal check returned nothing for this row"
        elif seal.get("stable_question_id") != sid or seal.get("publication_allowed_in_snapshot") is not True:
            out[sid] = "the new evidence does not allow publication for this stable id"
        elif seal.get("question_payload_sha256") != stored:
            out[sid] = "the recomputed seal differs from the stored one (the live question changed)"
    return out


# ---------------------------------------------------------------- SQL


def _guard_q(v: str) -> list[str]:
    vis = ",".join(f"'{s}'" for s in VISIBLE)
    return [
        f" SELECT * INTO q FROM public.quiz_questions WHERE id=({v}->'question'->>'id')::uuid FOR UPDATE;",
        " IF NOT FOUND THEN RAISE EXCEPTION 'live row missing: %',v->>'stable_question_id'; END IF;",
        f" IF to_jsonb(q) IS DISTINCT FROM {v}->'question'",
        f"  OR q.is_live IS DISTINCT FROM true OR q.publish_status NOT IN ({vis}) OR q.archived_at IS NOT NULL",
        "  OR coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.letter) FROM public.answer_choices c"
        f" WHERE c.question_id=q.id),'null'::jsonb) IS DISTINCT FROM {v}->'choices'",
        " THEN RAISE EXCEPTION 'live question changed: %',v->>'stable_question_id'; END IF;",
        " SELECT count(*) INTO n FROM public.answer_key_entries WHERE question_id=q.id;",
        " IF n<>1 THEN RAISE EXCEPTION 'answer key rows: %',v->>'stable_question_id'; END IF;",
        " SELECT * INTO STRICT k FROM public.answer_key_entries WHERE question_id=q.id FOR UPDATE;",
    ]


_DECL = "DECLARE v jsonb:={}; q public.quiz_questions%rowtype; k public.answer_key_entries%rowtype; n int;"


def _payload(it: dict) -> str:
    snap = it["snap"]
    return _blob({"question": snap["question"], "choices": snap.get("choices"), "key": snap["keys"][0],
                  "evidence": it["final"], "stable_question_id": it["id"]})


def update_block(tag: str, it: dict) -> list[str]:
    return do_block(tag, [
        _DECL.format(_payload(it)), "BEGIN", *_guard_q("v"),
        " IF to_jsonb(k) IS DISTINCT FROM v->'key'",
        "  OR k.raw_model_response->>'student_publication_allowed' IS DISTINCT FROM 'true'",
        "  OR v->'evidence'->>'student_publication_allowed' IS DISTINCT FROM 'true'",
        f"  OR v->'evidence'->'approved_tags'->>'{SEAL}' IS DISTINCT FROM k.raw_model_response->'approved_tags'->>'{SEAL}'",
        " THEN RAISE EXCEPTION 'live answer key changed: %',v->>'stable_question_id'; END IF;",
        " UPDATE public.answer_key_entries SET raw_model_response=v->'evidence' WHERE id=k.id;",
        " GET DIAGNOSTICS n=ROW_COUNT;",
        " IF n<>1 THEN RAISE EXCEPTION 'evidence update count: %',v->>'stable_question_id'; END IF;",
    ])


def rollback_block(tag: str, it: dict) -> list[str]:
    return do_block(tag, [
        _DECL.format(_payload(it)), "BEGIN", *_guard_q("v"),
        " IF k.raw_model_response IS DISTINCT FROM v->'evidence'",
        " THEN RAISE EXCEPTION 'evidence is not the corrected evidence: %',v->>'stable_question_id'; END IF;",
        " UPDATE public.answer_key_entries SET raw_model_response=v->'key'->'raw_model_response' WHERE id=k.id;",
        " GET DIAGNOSTICS n=ROW_COUNT;",
        " IF n<>1 THEN RAISE EXCEPTION 'evidence rollback count: %',v->>'stable_question_id'; END IF;",
    ])


def _chunk_sql(kind: str, name: str, k: int, total: int, rows_total: int, items: list, start: int, doc) -> str:
    slug = name.replace("-", "_")
    head = ("-- kimport live evidence correction" if kind == "update" else "-- kimport live evidence ROLLBACK")
    what = ("Replaces only answer_key_entries.raw_model_response of LIVE rows (question unchanged; "
            "publication flag and seal kept)." if kind == "update" else
            "Puts back the evidence these rows had before the correction (only where it is still in place).")
    out = [f"{head}: run {name}, chunk {k} of {total} ({len(items)} of {rows_total} rows).", f"-- {what}",
           "-- One transaction: any failed guard aborts every row of this chunk. No row is ever deleted.",
           "BEGIN;", ""]
    if kind == "update":
        out.append(f"-- export {doc.exported_at}: {doc.row_count} rows, fingerprint {doc.fingerprint}")
        out += bulk.run_fingerprint_block(f"kimport_live_{slug}_c{k:02d}_fingerprint", doc.row_count,
                                          doc.fingerprint, "true")
    block = update_block if kind == "update" else rollback_block
    order = list(enumerate(items, start))
    if kind != "update":
        order.reverse()
    for n, it in order:
        sec, mod, num = it["source"][1:]
        out.append(f"-- row {n}: {it['id']} (batch {it['batch']}; {sec} {mod} Q{num}); live evidence correction")
        out += block(f"kimport_live_{kind}_{slug}_{n:04d}", it)
    return "\n".join(out + ["COMMIT;", ""])


# ---------------------------------------------------------------- build / verify


def build(dirs: list[Path], doc, name: str, snaps: list[dict], sealer, exams_dir: Path = bulk.EXAMS,
          chunk_size: int = 0, rows_runner=st.stage_rows, rows_docs: dict | None = None) -> dict:
    """Returns {"files", "items", "refused", "refused_batches", "precheck"}. `snaps` is a fresh read-only
    readback (st.readback_sql) over the rows' sources."""
    batches, refused_batches = bulk.load_batches(dirs, exams_dir, rows_docs, rows_runner)
    items = [it for b in batches for it in b["items"]]
    by_export, by_snap = {}, {}
    for r in doc.rows:
        by_export.setdefault(st._source(r), []).append(r)
    for s in snaps:
        by_snap.setdefault(st._source(s.get("question") or {}), []).append(s)
    live = live_sources(doc.rows)
    refused: dict[str, list[str]] = {}
    for it in items:
        if it["source"] not in live:
            refused[it["id"]] = ["not a live row: a corrected batch for live rows only corrects live rows"]
            continue
        it["snap"], why = check_row(it, by_export.get(it["source"], []), by_snap.get(it["source"], []))
        if why:
            refused[it["id"]] = why
    ids = [it["id"] for it in items]
    for i in {i for i in ids if ids.count(i) > 1}:
        refused.setdefault(i, []).append("the same stable id is in more than one corrected row of this run")
    ok = [it for it in items if it["id"] not in refused]
    for it in ok:
        it["final"] = new_evidence(it["snap"]["keys"][0][EVIDENCE], it["row"]["key"][EVIDENCE])
    for sid, why in seal_problems([(it["id"], _with_evidence(it["snap"], it["final"])) for it in ok],
                                  sealer).items():
        refused.setdefault(sid, []).append(why)
    ok = [it for it in ok if it["id"] not in refused]
    files: dict[str, str] = {}
    chunks = []
    parts = bulk._chunks(ok, chunk_size) if ok else []
    start = 1
    try:
        for k, part in enumerate(parts, 1):
            fname, rname = (f"live-{x}-{k:02d}.sql" for x in ("evidence", "rollback"))
            sql = _chunk_sql("update", name, k, len(parts), len(ok), part, start, doc)
            rsql = _chunk_sql("rollback", name, k, len(parts), len(ok), part, start, doc)
            start += len(part)
            files[fname.replace(".sql", ".dryrun.sql")] = dryrun_variant(sql)
            files[fname] = sql
            files[rname.replace(".sql", ".dryrun.sql")] = dryrun_variant(rsql)
            files[rname] = rsql
            files[f"live-readback-{k:02d}.sql"] = st.readback_sql(f"{name} live corrections, part {k}",
                                                                  [it["source"] for it in part])
            chunks.append({"file": fname, "rollback": rname, "readback": f"live-readback-{k:02d}.sql",
                           "rows": len(part), "ids": [it["id"] for it in part], "sha256": bulk._sha(sql)})
    except ValueError as e:
        raise RefuseToBuild(str(e)) from None
    by_batch = {b["batch"]: b for b in batches}
    precheck = {"batch": name, "live_fix": True, "chunks": chunks, "corrected_ids": [it["id"] for it in ok],
                "evidence_sql_sha256": bulk._sha("".join(files[c["file"]] for c in chunks)),
                "refused": [{"id": it["id"], "batch": it["batch"], "reasons": refused[it["id"]]}
                            for it in items if it["id"] in refused],
                "refused_batches": [{"folder": k, "reason": v} for k, v in sorted(refused_batches.items())],
                "batches": {n: {"folder": Path(b["dir"]).name, "rows": len(b["items"]),
                                "corrected": sum(1 for it in ok if it["batch"] == n)} for n, b in by_batch.items()}}
    expected = {it["id"]: {"question": it["snap"]["question"], "choices": it["snap"].get("choices"),
                           "key": {**it["snap"]["keys"][0], EVIDENCE: it["final"]},
                           "old_evidence": it["snap"]["keys"][0][EVIDENCE]} for it in ok}
    files = {"live-precheck.json": st._dump(precheck), "live-expected.json": st._dump(expected), **files}
    return {"files": files, "items": ok, "refused": refused, "refused_batches": refused_batches,
            "precheck": precheck}


def verify_readback(expected: dict, readbacks: list, sealer) -> list[str]:
    """Problems with the rows after the correction ran ([] when every row is exactly as intended)."""
    snaps = [x["snapshot"] for raw in readbacks for x in raw["rows"]]
    by_qid = {s["question"]["id"]: s for s in snaps}
    out, pairs = [], []
    for sid, want in expected.items():
        s = by_qid.get(want["question"]["id"])
        if s is None:
            out.append(f"{sid}: not in the readback")
            continue
        if s["question"] != want["question"] or (s.get("choices") or None) != (want["choices"] or None):
            out.append(f"{sid}: the question or its choices changed")
        elif len(s.get("keys") or []) != 1 or s["keys"][0] != want["key"]:
            out.append(f"{sid}: the answer key is not the corrected one")
        else:
            pairs.append((sid, s))
    out += [f"{sid}: {why}" for sid, why in seal_problems(pairs, sealer).items()]
    return out
