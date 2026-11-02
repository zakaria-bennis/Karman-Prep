"""Import publish gate: the live QA audit's fail-level static checks, before any write.

Every "fail"-level check of the student QA audit (kimport.qa_static.LEVELS: structure,
formatting under main's display rules, completeness, figures; ts/qa-check.ts --gate) is
run on each new or corrected row:

- `k lint` pulls a reviewed row that fails one to the problem lane (code PF_QA, with the
  check name), and lists "review"-level findings as warnings without pulling the row;
- the stage prechecks (`k stage`, `k stage --batches`, QA correction batches, so the
  autopilot too) refuse such a row on the row the importer builds, with the reason
  "qa gate: <check>: <detail>", before stage.sql or qa-NN.sql is written.

The catalog-lane checks that need a seal (delivery_breaks_skill) are left to seal and
publish, which already refuse them. Nothing here reads or writes the database; an
image_url is fetched (a short range GET) to check that it loads.
"""

import json
import tempfile
from pathlib import Path

from kimport import qa_static

PREFIX = "qa gate: "  # prefix of every stage refusal (autopilot buckets them as qa_gate)
GATE_CHECKS = frozenset(c for c, level in qa_static.LEVELS.items() if level == "fail") - {"delivery_breaks_skill"}


READING_DOMAINS = frozenset({"info_ideas", "craft_structure", "expression_ideas", "conventions"})


def _subject(domain) -> str:
    """subjectFromDomain in import-core.ts: the subject the importer stores."""
    return "reading" if domain in READING_DOMAINS else "math"


_FIGURE_COLUMNS = ("figure_kind", "figure_table_data", "figure_chart_data", "figure_geometry_data", "figure_svg",
                   "figure_graph_data", "image_url", "image_alt", "figure_spec")
_PASSAGES = ("passage_intro", "passage", "passage_a", "passage_b")


def row_from_reviewed(row: dict) -> dict:
    """A reviewed batch row (reviewed-import-ready.json) in the QA export shape."""
    fmt = row.get("question_format") or "multiple_choice"
    tables = row.get("choice_tables") if isinstance(row.get("choice_tables"), dict) else {}
    specs = row.get("choice_figure_specs") if isinstance(row.get("choice_figure_specs"), dict) else {}
    choices = []
    if fmt != "numeric_entry":
        for letter in "ABCD":
            text = row.get(f"choice_{letter.lower()}")
            table, spec = tables.get(letter), specs.get(letter)
            if text is None and table is None and spec is None:
                continue
            choices.append({"letter": letter, "choice_text": "" if text is None else str(text),
                            "choice_table_data": table, "choice_figure_spec": spec})
    return {"id": row.get("stable_question_id"), "subject": _subject(row.get("domain")),
            "answer_format": fmt, "question_text": row.get("question_text"),
            "correct_answer": row.get("correct_answer"), "numeric_tolerance": row.get("numeric_tolerance"),
            **{f: row.get(f) for f in _PASSAGES + _FIGURE_COLUMNS},
            "answer_choices": choices, "answer_key_entries": [{"raw_model_response": row.get("reviewed_answer")}]}


def row_from_staged(item: dict) -> dict:
    """A stage precheck item (the row the importer builds) in the QA export shape."""
    q = item["row"]["question"]
    choices = sorted(({"letter": c.get("letter"), "choice_text": c.get("choice_text"),
                       "choice_table_data": c.get("choice_table_data"),
                       "choice_figure_spec": c.get("choice_figure_spec")} for c in item["row"].get("choices") or []),
                     key=lambda c: c["letter"] or "")
    return {**q, "id": item["id"], "answer_choices": choices,
            "answer_key_entries": [item["row"]["key"]] if item["row"].get("key") else []}


def ts_checker(rows: list[dict]) -> dict:
    """ts/qa-check.ts --gate over export-shaped rows."""
    with tempfile.TemporaryDirectory(prefix="qa-gate-") as d:
        src, out = Path(d) / "rows.json", Path(d) / "out.json"
        src.write_text(json.dumps({"rows": rows}, ensure_ascii=False), encoding="utf-8")
        return qa_static.run_ts(src, out, gate=True)


# The ts/qa-check.ts runner and the image fetch check_rows uses when none is passed. The Python
# test package sets stand-ins (tests/__init__.py) so the stage and lint tests start no tsx and
# fetch nothing; tests/test_qa_gate.py runs the real checker.
CHECKER = ts_checker
REACH = qa_static._reach


def check_rows(rows: list[dict], checker=None, reach=None) -> dict:
    """{row id: {"fail": {check: [detail]}, "review": {check: [detail]}}} for export-shaped rows."""
    if not rows:
        return {}
    ts = (checker or CHECKER)(rows)
    reach = reach or REACH
    urls = {u: reach(u) for u in {r["image_url"] for r in rows if isinstance(r.get("image_url"), str) and r["image_url"]}}
    out = {}
    for rid, item in qa_static.audit_rows(rows, ts, urls).items():
        checks = item["checks"]
        out[rid] = {"fail": {c: d for c, d in checks.items() if c in GATE_CHECKS},
                    "review": {c: d for c, d in checks.items() if c not in GATE_CHECKS}}
    return out


def reasons(found: dict) -> list[str]:
    return [f"{PREFIX}{c}: {'; '.join(d)[:300]}" for c, d in sorted(found["fail"].items())]


def mark_items(items: list[dict], checker=None) -> None:
    """Stage: set it["qa_gate"] (refusal reasons, maybe []) and it["qa_review"] on each precheck item."""
    found = check_rows([row_from_staged(it) for it in items], checker)
    for it in items:
        f = found.get(it["id"], {"fail": {}, "review": {}})
        it["qa_gate"] = reasons(f)
        it["qa_review"] = {c: d for c, d in sorted(f["review"].items())}
