"""`k qa ids`: which stable question id each question QA hid carries
(pipeline/qa/hidden-id-map.json, and the hidden-stable-ids.json list lint reads).

Why this exists: the first map was read with raw_model_response->'approved_tags', which is
empty for every independently confirmed generated key (that envelope keeps approved_tags
under "evidence"), so 25 rows looked like older imports with no stable id although their
evidence names one. The reading here is answer_evidence.stable_question_id, the same one
kimport.qa_correct.check_row applies, so a row this map names is a row a QA correction batch
under that stable id can correct.

Per id, three independent readings:
  evidence      the stable id the row's answer key evidence names (one key row expected);
  source tuple  the ledger occurrence (readiness ledger + new-exam ledger) of the exam whose
                source_sha256 is the row's source_version, same section, module and number;
  cluster       the corpus occurrences in the row's duplicate cluster (corpus/clusters.json).
Status:
  evidence   the evidence names it, and neither other reading names a different id;
  ambiguous  the readings disagree, the row has several key rows naming different ids, or
             another bank row's evidence names the same id: nothing is mapped, a person decides;
  legacy     the evidence names no stable id (an older import): it cannot be corrected by a
             QA correction batch; `k qa fix-legacy` corrects it in place (kimport.qa_legacy).
             Any source-tuple or cluster reading is listed for information only;
  not_found  the id is not in the bank.

Only the read-only SELECT in ids_sql touches the database. The candidate file is written
for the coordinator; --write-approved writes hidden-id-map.json and hidden-stable-ids.json
from it (an ambiguous or not-found row keeps its current entry).
"""

import json
from collections import Counter
from pathlib import Path

from kimport.answer_evidence import sql_stable_question_id, stable_question_id
from kimport.export import _unwrap
from kimport.sqlutil import uuid_literal

SCHEMA = "kimport-qa-hidden-id-map-candidate-v1"
CANDIDATE = "hidden-id-map.candidate.json"
ID_MAP = "hidden-id-map.json"
STABLE_IDS = "hidden-stable-ids.json"
SECTION = {"reading": "RW", "math": "MATH"}
TUPLE = ("source_version", "source_section", "source_module", "source_question_number")


def ids_sql() -> str:
    """Read-only: every bank row's source tuple and the stable ids its answer key rows name."""
    return ("-- kimport qa ids. Read-only, changes nothing.\n"
            "SELECT jsonb_build_object('rows', coalesce(jsonb_agg(jsonb_build_object('id', q.id,"
            " 'source_version', q.source_version, 'source_section', q.source_section,"
            " 'source_module', q.source_module, 'source_question_number', q.source_question_number,"
            " 'publish_status', q.publish_status, 'stable_ids', (SELECT coalesce(jsonb_agg("
            f"{sql_stable_question_id('k.raw_model_response')} ORDER BY k.created_at, k.id), '[]'::jsonb)"
            " FROM public.answer_key_entries k WHERE k.question_id = q.id)) ORDER BY q.id), '[]'::jsonb)) AS ids\n"
            "FROM public.quiz_questions q;\n")


def read_rows(raw) -> list[dict]:
    """The ids_sql result, or a full dump whose rows carry answer_key_entries (each with its
    raw_model_response); either way rows with a `stable_ids` list."""
    data = _unwrap(raw)
    rows = data.get("rows") if isinstance(data, dict) else data
    if isinstance(rows, str):
        rows = json.loads(rows)
    if not isinstance(rows, list) or not all(isinstance(r, dict) and "id" in r for r in rows):
        raise ValueError("qa ids: expected rows with an id (the ids_sql result or a full dump)")
    out = []
    for r in rows:
        if "stable_ids" not in r:
            keys = r.get("answer_key_entries")
            if keys is None:
                keys = r.get("keys")
            if not isinstance(keys, list):
                raise ValueError(f"qa ids: row {r['id']} has neither stable_ids nor its answer key rows")
            r = {**r, "stable_ids": [stable_question_id(k.get("raw_model_response")) for k in keys]}
        out.append(r)
    return out


def _ledger_index(items: list[dict]) -> tuple[set, dict]:
    ids, exams = set(), {}
    for it in items:
        ids.add(it["id"])
        if it.get("source_sha256") and it.get("exam"):
            exams.setdefault(it["source_sha256"], set()).add(it["exam"])
    return ids, exams


def tuple_ids(row: dict, ledger_ids: set, exams_by_sha: dict) -> list[str]:
    """Ledger occurrence ids at the row's source tuple (its exam found by the PDF's sha256)."""
    sec, mod, num = SECTION.get(row.get("source_section")), row.get("source_module"), row.get("source_question_number")
    if not (sec and mod and isinstance(num, int)):
        return []
    return sorted(s for e in exams_by_sha.get(row.get("source_version") or "", ())
                  for s in [f"{e}_{sec}_{mod}_Q{num:02d}"] if s in ledger_ids)


def cluster_index(clusters: dict) -> dict[str, set]:
    """{member id: ids of every member of its clusters}."""
    out: dict = {}
    for c in clusters.get("clusters") or []:
        ids = {m["id"] for m in c["members"]}
        for i in ids:
            out.setdefault(i, set()).update(ids)
    return out


def derive(ids, rows: list[dict], ledger_items: list[dict], clusters: dict) -> dict:
    """{"rows": {id: reading}, "map": {id: stable id or None}, "stable_ids": [...], "counts": {...}}."""
    by_id = {r["id"]: r for r in rows}
    named: dict = {}
    for r in rows:
        for s in set(filter(None, r["stable_ids"])):
            named.setdefault(s, set()).add(r["id"])
    ledger_ids, exams = _ledger_index(ledger_items)
    together = cluster_index(clusters)
    out = {}
    for qid in sorted(set(ids)):
        uuid_literal(qid)
        r = by_id.get(qid)
        if r is None:
            out[qid] = {"status": "not_found", "stable_question_id": None}
            continue
        ev = sorted(set(filter(None, r["stable_ids"])))
        tup = tuple_ids(r, ledger_ids, exams)
        clu = sorted(i for i in together.get(qid, ()) if i != qid and i in ledger_ids)
        rec = {"evidence": ev, "source_tuple": [r.get(c) for c in TUPLE], "from_source_tuple": tup,
               "from_cluster": clu, "key_rows": len(r["stable_ids"]), "publish_status": r.get("publish_status")}
        why = []
        if len(ev) > 1:
            why.append(f"its answer key rows name {len(ev)} stable ids")
        elif ev:
            sid = ev[0]
            if len(r["stable_ids"]) != 1:
                why.append(f"{len(r['stable_ids'])} answer key rows; a QA correction needs exactly one")
            if tup and sid not in tup:
                why.append(f"the source tuple reads {', '.join(tup)}")
            if clu and sid not in clu:
                why.append(f"its corpus cluster holds {', '.join(clu)}")
            others = sorted(named.get(sid, set()) - {qid})
            if others:
                why.append(f"another bank row's evidence names it too: {', '.join(others)}")
        if why:
            rec.update(status="ambiguous", stable_question_id=None, why=why)
        elif ev:
            rec.update(status="evidence", stable_question_id=ev[0])
        else:
            rec.update(status="legacy", stable_question_id=None)
        out[qid] = rec
    return {"rows": out, "map": {k: v["stable_question_id"] for k, v in out.items()},
            "stable_ids": sorted({v["stable_question_id"] for v in out.values() if v["stable_question_id"]}),
            "counts": dict(sorted(Counter(v["status"] for v in out.values()).items()))}


def _load(path: Path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def ledger_items(paths) -> list[dict]:
    items = []
    for p in paths:
        data = _load(p)
        items += data["items"] if isinstance(data, dict) else data
    return items


def write_candidate(qa_dir: Path, res: dict, built_from: dict) -> Path:
    path = Path(qa_dir) / CANDIDATE
    path.write_text(json.dumps({"schema": SCHEMA, "built_from": built_from, **res}, indent=2, sort_keys=True,
                               ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def write_approved(qa_dir: Path) -> dict:
    """hidden-id-map.json and hidden-stable-ids.json from the reviewed candidate (the coordinator's
    go-ahead). An ambiguous or not-found row keeps whatever the current map says: this never maps a
    row a person has not decided, and never drops one that was mapped before."""
    qa_dir = Path(qa_dir)
    cand = _load(qa_dir / CANDIDATE)
    if cand.get("schema") != SCHEMA:
        raise ValueError(f"{CANDIDATE}: not a {SCHEMA} file")
    try:
        current = _load(qa_dir / ID_MAP)
    except OSError:
        current = {}
    kept = sorted(k for k, v in cand["rows"].items() if v["status"] in ("ambiguous", "not_found"))
    out = {**cand["map"], **{k: current.get(k) for k in kept}}
    (qa_dir / ID_MAP).write_text(json.dumps(out, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    sids = sorted({v for v in out.values() if v})
    (qa_dir / STABLE_IDS).write_text(json.dumps(sids, indent=0) + "\n", encoding="utf-8")
    return {"mapped": len(sids), "legacy": cand["counts"].get("legacy", 0),
            "kept_as_before": {k: current.get(k) for k in kept}}
