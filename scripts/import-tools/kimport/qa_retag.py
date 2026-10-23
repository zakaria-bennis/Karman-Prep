"""`k qa retag`: change the skill or difficulty LABEL of live questions, nothing else.

Input pipeline/qa/skill-recheck/decisions.jsonl, one line per change:
  {id, stable_question_id, field: "skill" | "difficulty", live, new, reason, by, at, [domain]}

What a label is, where the site reads it (found 2026-10-23):
- difficulty: quiz_questions.difficulty_level (1-7, the catalog pool's difficulty filter) and
  quiz_questions.difficulty (its legacy band, levelToLegacyDifficulty: 1-2 foundational,
  3-4 intermediate, 5-6 advanced, 7 mastery).
- skill: the catalog lane reads the answer key evidence approved_tags (catalog_skill_id,
  skill_label, catalog_domain_id, domain_label) and requires the skill review record to name
  the same skill (independent_D_record skill/domain, with independent_D_review_sha256); the
  row's domain and topic_cluster must be the skill's domain and its cluster label.
- both: the payload seal approved_tags.question_payload_sha256 covers difficulty,
  difficulty_level, domain and topic_cluster, so it is recomputed (ts/retag-check.ts, the
  app's catalogQuestionPayloadHash) and the app's own scope reader checks the result.
A skill change writes a new skill review record (the decision line, its sha256 as
independent_D_review_sha256); the previous record and every change are kept under
evidence label_retags. content_hash_v2, text, choices, key and everything else are untouched.

Refused (listed in plan.json, nothing written for that id): an unknown skill or a difficulty
outside 1-7, a domain that is not the new skill's, a skill in the other subject, a row not
live or not served by the catalog lane now, a live value that is not the decision's `live`,
a row whose skill review lane is the original D record (a retag cannot replace it), several
answer key entries, no change, and conflicting lines: several lines for one id and field
keep the latest only when the same reviewer wrote them; reviewers who disagree refuse the id.
"""

import copy
import hashlib
import json
import re
from pathlib import Path

from kimport.answer_evidence import evidence_root
from kimport.lint import canonical_json
from kimport.qa_hide import _fingerprint_block
from kimport.sqlutil import do_block, lit, uuid_literal

REPO = Path(__file__).resolve().parents[3]
TAXONOMY = REPO / "src/data/curriculum/approved-skill-taxonomy.json"
DOMAIN_IDS = {"Information and Ideas": "info_ideas", "Craft and Structure": "craft_structure",
              "Expression of Ideas": "expression_ideas", "Standard English Conventions": "conventions",
              "Algebra": "algebra", "Advanced Math": "advanced_math",
              "Problem-Solving and Data Analysis": "data_analysis", "Geometry and Trigonometry": "geometry"}
# CLUSTER_BY_DOMAIN in src/lib/question-bank/taxonomy.ts
CLUSTERS = {"algebra": "Algebra", "advanced_math": "Advanced Math", "geometry": "Geometry & Trigonometry",
            "data_analysis": "Problem-Solving & Data Analysis", "info_ideas": "Information & Ideas",
            "craft_structure": "Craft & Structure", "expression_ideas": "Expression of Ideas",
            "conventions": "Standard English Conventions"}
COLUMNS = ("difficulty_level", "difficulty", "domain", "topic_cluster")
GUARD = ("is_live", "publish_status", "archived_at", "content_hash_v2", "subject", "updated_at") + COLUMNS
FIELDS = ("skill", "difficulty")
_ROW_NOTE = "-- kimport qa retag row "


def band(level: int) -> str:
    """levelToLegacyDifficulty in src/types/quiz.ts."""
    return "foundational" if level <= 2 else "intermediate" if level <= 4 else "advanced" if level <= 6 else "mastery"


def catalog(path: Path = TAXONOMY) -> dict[str, dict]:
    """{skill label: {id, subject, domain_id, domain_label}} from the site's approved taxonomy."""
    out = {}
    for d in json.loads(Path(path).read_text(encoding="utf-8"))["domains"]:
        subject = "math" if d["section"] == "Math" else "reading"
        for s in d["skills"]:
            label = s if isinstance(s, str) else s["label"]
            slug = re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", label.lower()))  # catalogSkillId
            out[label] = {"id": f"{'rw' if subject == 'reading' else 'ma'}-skill-{slug}", "subject": subject,
                          "domain_id": DOMAIN_IDS[d["label"]], "domain_label": d["label"], "label": label}
    return out


# ---------------------------------------------------------------- decisions


def read_decisions(path: Path) -> list[dict]:
    out = []
    for n, raw in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip():
            continue
        try:
            line = json.loads(raw)
        except ValueError:
            raise ValueError(f"{path}:{n}: not a JSON line") from None
        if not isinstance(line, dict):
            raise ValueError(f"{path}:{n}: not an object")
        out.append({**line, "_line": n})
    return out


def line_problem(d: dict, skills: dict) -> str | None:
    for k in ("id", "stable_question_id", "field", "reason", "by", "at"):
        if not isinstance(d.get(k), str) or not d[k].strip():
            return f"{k} missing"
    if d["field"] not in FIELDS:
        return f"field {d['field']!r} is not skill or difficulty"
    if d["field"] == "difficulty":
        for k in ("live", "new"):
            if isinstance(d.get(k), bool) or not isinstance(d.get(k), int) or not 1 <= d[k] <= 7:
                return f"difficulty {k} {d.get(k)!r} is not an integer 1 to 7"
    else:
        if d.get("new") not in skills:
            return f"skill {d.get('new')!r} is not in the site taxonomy"
        if not isinstance(d.get("live"), str):
            return "live skill missing"
        dom = d.get("domain")
        if dom is not None and dom not in (skills[d["new"]]["domain_id"], skills[d["new"]]["domain_label"]):
            return f"domain {dom!r} is not the domain of {d['new']!r}"
    return None


def _is_uuid(v) -> bool:
    try:
        uuid_literal(v)
        return True
    except (ValueError, TypeError):
        return False


def stable_index(rows: dict[str, dict]) -> dict[str, list[str]]:
    """{stable question id: [live row ids]} from the rows' answer key evidence."""
    out: dict[str, list[str]] = {}
    for rid, r in rows.items():
        if r.get("is_live") is not True:
            continue
        for k in r.get("answer_key_entries") or []:
            tags = (evidence_root(k.get("raw_model_response")) or {}).get("approved_tags") or {}
            if tags.get("stable_question_id"):
                out.setdefault(tags["stable_question_id"], []).append(rid)
    return out


def live_id(d: dict, rows: dict[str, dict], index: dict[str, list[str]]) -> tuple[str | None, str | None]:
    """(live row id, None) or (None, why). `id` may be the live uuid or (some reviewers wrote it so)
    the stable id; either way it must resolve to exactly one live row, and to the line's stable id."""
    qid, sid = d.get("id"), d.get("stable_question_id")
    if _is_uuid(qid) and qid in rows:
        found = [i for i in index.get(sid, [])]
        if qid not in found:
            return None, f"live row {qid} does not carry stable id {sid}"
        return qid, None
    names = {sid} | ({qid} if isinstance(qid, str) and not _is_uuid(qid) else set())
    hits = sorted({i for n in names for i in index.get(n, [])})
    if len(hits) != 1:
        return None, f"{qid if not _is_uuid(qid) else sid} resolves to {len(hits)} live rows (expected one)"
    return hits[0], None


def resolve(lines: list[dict], skills: dict, rows: dict[str, dict] | None = None) -> tuple[dict, dict, list]:
    """({live id: {field: decision}}, {id: why refused}, [{id, stable_question_id, field, why}] dropped).
    Every line's id is mapped to its one live row first. For one row and field the latest line
    wins when one reviewer wrote every line; lines from two different reviewers refuse the row.
    A latest line with new == live (a revert) means no change: dropped, nothing written."""
    rows = rows or {}
    index = stable_index(rows)
    refused: dict[str, str] = {}
    by_key: dict[tuple, list[dict]] = {}
    for d in lines:
        key = d.get("id") if isinstance(d.get("id"), str) else f"line {d['_line']}"
        why = line_problem(d, skills)
        rid = None
        if not why:
            rid, why = live_id(d, rows, index)
        if why:
            refused.setdefault(rid or key, f"line {d['_line']}: {why}")
            continue
        by_key.setdefault((rid, d["field"]), []).append({**d, "id": rid, "id_as_written": d["id"]})
    out: dict[str, dict] = {}
    dropped: list[dict] = []
    for (rid, field), group in sorted(by_key.items()):
        group.sort(key=lambda d: (d["at"], d["_line"]))
        reviewers = sorted({d["by"] for d in group})
        if len(reviewers) > 1:
            refused[rid] = (f"{field}: lines from more than one reviewer (" +
                            ", ".join(f"{d['by']}: {d['new']}" for d in group) + ")")
            continue
        last = group[-1]
        if last["new"] == last["live"]:
            dropped.append({"id": rid, "stable_question_id": last["stable_question_id"], "field": field,
                            "why": f"latest line by {last['by']} (line {last['_line']}) keeps the live value"})
            continue
        out.setdefault(rid, {})[field] = last
    for rid in refused:
        out.pop(rid, None)
    return out, refused, [x for x in dropped if x["id"] not in refused]


# ---------------------------------------------------------------- plan


def decision_sha256(d: dict) -> str:
    return hashlib.sha256(canonical_json({k: v for k, v in d.items() if k != "_line"}).encode("utf-8")).hexdigest()


def _live_skill(raw) -> str | None:
    tags = (evidence_root(raw) or {}).get("approved_tags") or {}
    return tags.get("skill_label")


def _who(d: dict) -> dict:
    return {"reason": d["reason"], "by": d["by"], "at": d["at"], "decision_sha256": decision_sha256(d)}


def plan_row(qid: str, decisions: dict, row: dict | None, skills: dict) -> tuple[dict | None, str | None]:
    """(item with question_after and raw_after (seal still to compute), or None and why refused)."""
    if row is None:
        return None, "not in the live export"
    if not (row.get("is_live") is True and row.get("archived_at") is None):
        return None, "not live"
    keys = row.get("answer_key_entries") or []
    if len(keys) != 1:
        return None, f"{len(keys)} answer key entries (expected one)"
    raw = keys[0].get("raw_model_response")
    root = evidence_root(raw)
    tags = (root or {}).get("approved_tags")
    if not isinstance(tags, dict):
        return None, "no catalog tags in the answer key evidence"
    for d in decisions.values():
        if d["stable_question_id"] != tags.get("stable_question_id"):
            return None, f"stable id {d['stable_question_id']} is not the row's {tags.get('stable_question_id')}"
    q_after: dict = {}
    raw_after = copy.deepcopy(raw)
    r_after = evidence_root(raw_after)
    history = []
    if "difficulty" in decisions:
        d = decisions["difficulty"]
        if row.get("difficulty_level") != d["live"]:
            return None, f"difficulty: live is {row.get('difficulty_level')}, the decision says {d['live']}"
        q_after.update(difficulty_level=d["new"], difficulty=band(d["new"]))
        history.append({"field": "difficulty", "live": d["live"], "new": d["new"], **_who(d)})
    if "skill" in decisions:
        d = decisions["skill"]
        if _live_skill(raw) != d["live"]:
            return None, f"skill: live is {_live_skill(raw)!r}, the decision says {d['live']!r}"
        new = skills[d["new"]]
        if new["subject"] != row.get("subject"):
            return None, f"skill {d['new']!r} is a {new['subject']} skill; the question is {row.get('subject')}"
        if root.get("D_original_record") or not isinstance(root.get("independent_D_record"), dict):
            return None, "the skill review lane is not an independent D review (a retag cannot replace it)"
        t = r_after["approved_tags"]
        t.update(catalog_skill_id=new["id"], skill_label=new["label"], catalog_domain_id=new["domain_id"],
                 domain_label=new["domain_label"])
        prev = {"previous_independent_D_record": root["independent_D_record"],
                "previous_independent_D_review_sha256": root.get("independent_D_review_sha256")}
        r_after["independent_D_record"] = {**root["independent_D_record"], "skill": new["label"],
                                           "domain": new["domain_label"], "reason": d["reason"],
                                           "by": d["by"], "at": d["at"], "source": "qa skill-recheck"}
        r_after["independent_D_review_sha256"] = decision_sha256(d)
        if new["domain_id"] != row.get("domain"):
            q_after.update(domain=new["domain_id"], topic_cluster=CLUSTERS[new["domain_id"]])
        history.append({"field": "skill", "live": d["live"], "new": d["new"], **_who(d), **prev})
    r_after["label_retags"] = list(root.get("label_retags") or []) + history
    return {"id": qid, "stable_question_id": tags["stable_question_id"], "row": row, "key_id": keys[0].get("id"),
            "decisions": decisions, "question_after": q_after, "raw_before": raw, "raw_after": raw_after}, None


def build_plan(lines: list[dict], rows: dict[str, dict], skills: dict, checker) -> dict:
    """Every change, checked: {"items": [...], "refused": {id: why}}. `checker` runs ts/retag-check.ts."""
    decided, refused, dropped = resolve(lines, skills, rows)
    items = []
    for qid in sorted(decided):
        item, why = plan_row(qid, decided[qid], rows.get(qid), skills)
        if why:
            refused[qid] = why
        else:
            items.append(item)
    checked = {c["id"]: c for c in checker(items)["rows"]} if items else {}
    ok = []
    for it in items:
        c = checked.get(it["id"]) or {"ok": False, "error": "no check result"}
        if not c["ok"]:
            refused[it["id"]] = f"app check: {c['error']}"
            continue
        ok.append({**it, "raw_after": c["raw_after"], "seal_before": c["seal_before"], "seal_after": c["seal_after"]})
    return {"items": ok, "refused": dict(sorted(refused.items())), "dropped": dropped}


# ---------------------------------------------------------------- SQL


def _row_block(tag: str, it: dict, expect_q: dict, expect_raw, put_q: dict, put_raw) -> list[str]:
    qid = uuid_literal(it["id"])
    guard = [f"q.{c} IS NOT NULL" if v is None else
             f"q.{c} IS DISTINCT FROM {lit(v)}{'::timestamptz' if c in ('updated_at', 'archived_at') else ''}"
             if not isinstance(v, bool) else f"q.{c} IS DISTINCT FROM {'true' if v else 'false'}"
             for c, v in expect_q.items()]
    sets = ", ".join(f"{c} = {lit(v)}" for c, v in put_q.items())
    note = json.dumps({"id": it["id"], "stable_question_id": it["stable_question_id"], "set": put_q}, sort_keys=True)
    return [_ROW_NOTE + note] + do_block(tag, [
        "DECLARE q public.quiz_questions%rowtype; n int;",
        "BEGIN",
        f" SELECT * INTO STRICT q FROM public.quiz_questions WHERE id = '{qid}'::uuid FOR UPDATE;",
        " IF " + "\n   OR ".join(guard),
        " THEN RAISE EXCEPTION 'question changed since the export: %', q.id; END IF;",
        f" SELECT count(*) INTO n FROM public.answer_key_entries WHERE question_id = q.id;",
        f" IF n <> 1 OR NOT EXISTS (SELECT 1 FROM public.answer_key_entries WHERE question_id = q.id"
        f" AND raw_model_response = {lit(json.dumps(expect_raw, ensure_ascii=False))}::jsonb)",
        " THEN RAISE EXCEPTION 'answer key evidence changed since the export: %', q.id; END IF;",
        *([f" UPDATE public.quiz_questions SET {sets} WHERE id = q.id;"] if put_q else []),
        f" UPDATE public.answer_key_entries SET raw_model_response = {lit(json.dumps(put_raw, ensure_ascii=False))}::jsonb"
        " WHERE question_id = q.id;",
    ])


# The Management API refuses a request over a few MB; each file stays under this.
MAX_FILE_BYTES = 600_000


def _sql(title: str, blocks: list, doc, slug: str, max_bytes: int = MAX_FILE_BYTES) -> list[str]:
    """One or more files, each one transaction. The fingerprint guard holds in every file: a
    label change does not touch the fingerprinted columns (id, content hash, statuses, key)."""
    rendered = [_row_block(f"kimport_qa_{slug}_{n:04d}", *b) for n, b in enumerate(blocks, 1)]
    chunks, cur, size = [], [], 0
    for r in rendered:
        n = sum(len(x) + 1 for x in r)
        if cur and size + n > max_bytes:
            chunks.append(cur)
            cur, size = [], 0
        cur.append(r)
        size += n
    chunks.append(cur)
    files = []
    for k, chunk in enumerate(chunks, 1):
        out = [f"-- kimport qa retag: {title} (file {k} of {len(chunks)}, {len(chunk)} of {len(blocks)} rows). "
               "Labels only; nothing else changes.",
               "-- One transaction: any failed guard stops every row of this file. Run the .dryrun.sql twin first.",
               "BEGIN;", ""]
        if doc is not None:
            out.append(f"-- export {doc.exported_at}: {doc.row_count} rows, fingerprint {doc.fingerprint}")
            out += _fingerprint_block(f"kimport_qa_{slug}_fingerprint_{k:02d}", doc)
        for r in chunk:
            out += r
        files.append("\n".join(out + ["COMMIT;", ""]))
    return files


def retag_sql(items: list[dict], doc, max_bytes: int = MAX_FILE_BYTES) -> list[str]:
    blocks = [(it, {c: it["row"].get(c) for c in GUARD}, it["raw_before"], it["question_after"], it["raw_after"])
              for it in items]
    return _sql("change skill / difficulty labels", blocks, doc, "retag", max_bytes)


def restore_sql(items: list[dict], max_bytes: int = MAX_FILE_BYTES) -> list[str]:
    """Put exactly the old labels and evidence back, guarded on the state the retag left."""
    blocks = []
    for it in items:
        after = {**{c: it["row"].get(c) for c in GUARD}, **it["question_after"]}  # no trigger touches updated_at
        blocks.append((it, after, it["raw_after"], {c: it["row"].get(c) for c in it["question_after"]}, it["raw_before"]))
    return _sql("undo the label change (put the old labels back exactly)", blocks, None, "retag_undo", max_bytes)


def readback_sql(ids: list[str]) -> str:
    arr = ",".join(f"'{uuid_literal(i)}'" for i in ids) or "NULL"
    cols = ", ".join(f"'{c}', q.{c}" for c in COLUMNS)
    return ("-- kimport qa retag readback. Read-only.\n"
            f"SELECT coalesce(jsonb_agg(jsonb_build_object('id', q.id, {cols}, 'raw_model_response',"
            " (SELECT k.raw_model_response FROM public.answer_key_entries k WHERE k.question_id = q.id LIMIT 1))"
            f" ORDER BY q.id), '[]'::jsonb) AS rows FROM public.quiz_questions q WHERE q.id = ANY (ARRAY[{arr}]::uuid[]);\n")


def expected(items: list[dict], after: bool) -> dict[str, dict]:
    """{id: {column: value, raw_model_response: ...}} the readback should show after (or before) the write."""
    out = {}
    for it in items:
        cols = {c: it["row"].get(c) for c in COLUMNS}
        if after:
            cols.update(it["question_after"])
        out[it["id"]] = {**cols, "raw_model_response": it["raw_after"] if after else it["raw_before"]}
    return out


# ---------------------------------------------------------------- the founder's summary


def _cell(v) -> str:
    return str(v).replace("|", "/").replace("\n", " ")


REFUSAL_PLAIN = (  # (substring of the reason, how the summary says it)
    ("resolves to", "not on the site right now (hidden or never published), so there is no live label to change"),
    ("the decision says", "the label on the site is no longer the one the reviewer saw; they need to look again"),
    ("more than one reviewer", "two reviewers wrote different decisions for the same question"),
    ("not an independent D review", "its skill comes from the original source classification, which this tool does not overwrite"),
    ("not in the site taxonomy", "the new skill is not one of the site's skills"),
    ("integer 1 to 7", "the difficulty is not a whole number from 1 to 7"),
    ("app check", "the site's own check refused the changed question"),
)


def _plain(reason: str) -> str:
    return next((text for key, text in REFUSAL_PLAIN if key in reason), "other: " + reason)


def plan_md(plan: dict, summary: dict, now: str) -> str:
    """retag-plan.md: what the label change would do, for the founder to approve. Plain summary first."""
    items, refused, dropped = plan["items"], plan["refused"], plan["dropped"]
    changes = [(it, f, d) for it in items for f, d in sorted(it["decisions"].items())]
    by_field: dict[str, int] = {}
    by_reviewer: dict[str, int] = {}
    moves: dict[tuple, int] = {}
    for _, f, d in changes:
        by_field[f] = by_field.get(f, 0) + 1
        by_reviewer[d["by"]] = by_reviewer.get(d["by"], 0) + 1
        if f == "skill":
            moves[(d["live"], d["new"])] = moves.get((d["live"], d["new"]), 0) + 1
    ups = sum(1 for _, f, d in changes if f == "difficulty" and d["new"] > d["live"])
    downs = by_field.get("difficulty", 0) - ups
    both = sum(1 for it in items if len(it["decisions"]) == 2)
    top = sorted(moves.items(), key=lambda x: (-x[1], x[0]))
    refusal_groups: dict[str, int] = {}
    for why in refused.values():
        refusal_groups[_plain(why)] = refusal_groups.get(_plain(why), 0) + 1
    ran = ("The trial run against the live bank passed: every safety check held, and it was rolled back, so nothing "
           "has changed yet." if summary.get("dry_passed") else "No trial run against the live bank yet.")
    lines = [f"# Label changes waiting for your OK ({now[:10]})", "", "## In short", "",
             f"- **{len(items)} live questions** would get a corrected label: **{by_field.get('skill', 0)} skill changes** "
             f"and **{by_field.get('difficulty', 0)} difficulty changes** ({both} questions get both).",
             f"- Difficulty: {ups} go up, {downs} go down (scale 1 to 7).",
             "- Only labels change. The question text, choices, answers and explanations stay exactly as they are.",
             "- Reviewers: " + ", ".join(f"{r} {n}" for r, n in sorted(by_reviewer.items())) + " changes.",
             f"- {ran} An exact undo file is ready.", ""]
    if top:
        lines += ["**Main skill moves** (from → to, questions):", ""]
        lines += [f"- {a} → {b}: {n}" for (a, b), n in top[:8]]
        if len(top) > 8:
            lines.append(f"- and {len(top) - 8} smaller patterns (full list below)")
        lines.append("")
    lines += [f"**Not changed: {len(refused)} questions refused** (nothing is written for them):", ""]
    lines += [f"- {n}: {text}" for text, n in sorted(refusal_groups.items(), key=lambda x: -x[1])] or ["- none"]
    lines += ["", f"Also skipped: {len(dropped)} lines where the reviewer's last word kept the current label.", "",
              f"Source: `{summary['decisions']}` ({summary['decision_lines']} reviewer lines); live export "
              f"{summary.get('export')}.", "", "---", "", "## Counts", "", "| | changes |", "|---|---|"]
    lines += [f"| {f} | {n} |" for f, n in sorted(by_field.items())]
    lines += ["", "| reviewer | changes |", "|---|---|"] + [f"| {r} | {n} |" for r, n in sorted(by_reviewer.items())]
    if moves:
        lines += ["", "## Skill moves", "", "| from | to | questions |", "|---|---|---|"]
        lines += [f"| {_cell(a)} | {_cell(b)} | {n} |" for (a, b), n in top]
    lines += ["", "## Every change", "", "| stable id | field | live → new | reviewer | reason |", "|---|---|---|---|---|"]
    lines += [f"| {it['stable_question_id']} | {f} | {_cell(d['live'])} → {_cell(d['new'])} | {d['by']} | {_cell(d['reason'])} |"
              for it, f, d in sorted(changes, key=lambda x: (x[1], x[0]["stable_question_id"]))]
    lines += ["", "## Refused (nothing written for these)", ""]
    lines += [f"- `{k}`: {_cell(v)}" for k, v in refused.items()] or ["None."]
    lines += ["", "## Skipped: the reviewer's latest line keeps the live value", ""]
    lines += [f"- {x['stable_question_id']} ({x['field']}): {x['why']}" for x in dropped] or ["None."]
    lines += ["", f"Run folder: `{summary['run']}` (plan.json, retag SQL files and their .dryrun.sql twins, restore SQL)."]
    return "\n".join(lines) + "\n"
