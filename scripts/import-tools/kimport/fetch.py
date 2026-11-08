"""`k export`: the live export, fetched in pages instead of one 35 MB result.

The one-shot sql/live_export.sql result is large enough that the Management
API drops it ("connection reset by peer" after ~20 minutes). This runs the
same row query in pages keyed on id (PAGE rows at a time; a page that keeps
failing is fetched again in FALLBACK-row pages), and assembles the same
document: {"exported_at", "row_count", "fingerprint", "rows"}.

Consistency: the bank's count and fingerprint (kimport.export.FINGERPRINT_SQL,
unchanged) are read before the first page and again after the last. The
export is kept only when both readings agree with each other and with the
fingerprint recomputed from the assembled rows; otherwise the bank changed
mid-export and the whole export is retried. exported_at is the first reading's
time, the conservative choice for publish's freshness check.

Slimmer rows: answer_key_entries.raw_model_response is most of the old file
(about 20 of 26 MB) and no export reader needs it whole. sweep reads only
whether it is an object and its student_publication_allowed flag, and stage
and publish read the batch's own evidence from the readback, never from the
export. So each row carries raw_model_response cut down to
{"student_publication_allowed": <value>} (or {} when the key is absent; a
non-object value is kept as it is). An independently confirmed generated key keeps its
evidence nesting: {"kind": "independently_confirmed_generated", "evidence":
{"student_publication_allowed": <value>}} (kimport.answer_evidence). Every other field is exactly what
sql/live_export.sql returns.

Only read-only SELECTs are sent. The runner is injectable for tests.
"""

import json
import subprocess
import tempfile
import time
from pathlib import Path

from kimport.export import FINGERPRINT_SQL, fingerprint, read_export_doc
from kimport.jsonio import write_text_atomic
from kimport.sqlutil import uuid_literal

REPO = Path(__file__).resolve().parents[3]
PAGE, FALLBACK = 100, 10
PAGE_TRIES, EXPORT_TRIES = 4, 3
_ZERO = "00000000-0000-0000-0000-000000000000"

# The inner SELECT list of sql/live_export.sql, except raw_model_response
# (slimmed below). test_fetch checks every line still appears in that file.
ROW_COLUMNS = """    q.id,
    q.passage_intro,
    q.passage,
    q.passage_a,
    q.passage_b,
    q.question_text,
    q.correct_answer,
    q.answer_format::text AS question_format,
    q.figure_kind,
    q.figure_table_data,
    CASE WHEN q.image_url IS NOT NULL THEN true END AS image_url,
    CASE WHEN q.image_storage_path IS NOT NULL THEN true END AS image_storage_path,
    CASE WHEN q.figure_svg IS NOT NULL THEN true END AS figure_svg,
    CASE WHEN q.figure_graph_data IS NOT NULL THEN true END AS figure_graph_data,
    CASE WHEN q.figure_chart_data IS NOT NULL THEN true END AS figure_chart_data,
    CASE WHEN q.figure_geometry_data IS NOT NULL THEN true END AS figure_geometry_data,
    q.publish_status,
    q.import_status,
    q.import_flag_reason,
    q.is_live,
    q.archived_at,
    q.source_version,
    q.source_section,
    q.source_module,
    q.source_question_number,
    q.content_hash_v2,
    q.created_at,
    to_jsonb(q) -> 'comparison_key' AS comparison_key,
    (to_jsonb(q) -> 'comparison_key') IS NOT NULL AS has_comparison_key_column,
    (SELECT coalesce(jsonb_agg(jsonb_build_object('letter', c.letter, 'choice_text', c.choice_text,
                                                  'choice_table_data', CASE WHEN c.choice_table_data IS NOT NULL THEN true END)
                               ORDER BY c.letter), '[]'::jsonb)
       FROM public.answer_choices c
      WHERE c.question_id = q.id) AS choices,"""

_SLIM_KEY = """    (SELECT CASE WHEN jsonb_typeof(k.raw_model_response) <> 'object' THEN k.raw_model_response
              WHEN k.raw_model_response ->> 'kind' = 'independently_confirmed_generated' THEN
                   jsonb_build_object('kind', 'independently_confirmed_generated', 'evidence',
                     CASE WHEN k.raw_model_response -> 'evidence' -> 'student_publication_allowed' IS NOT NULL
                          THEN jsonb_build_object('student_publication_allowed',
                                                  k.raw_model_response -> 'evidence' -> 'student_publication_allowed')
                          ELSE '{}'::jsonb END)
              WHEN k.raw_model_response -> 'student_publication_allowed' IS NOT NULL
                   THEN jsonb_build_object('student_publication_allowed', k.raw_model_response -> 'student_publication_allowed')
              ELSE '{}'::jsonb END
       FROM public.answer_key_entries k
      WHERE k.question_id = q.id
      ORDER BY k.created_at, k.id
      LIMIT 1) AS raw_model_response,
    (SELECT count(*)
       FROM public.answer_key_entries k
      WHERE k.question_id = q.id) AS answer_key_count"""


class ExportFailed(Exception):
    pass


def state_sql() -> str:
    return ("-- kimport export: bank count and fingerprint. Read-only.\n"
            f"SELECT to_jsonb(now()) #>> '{{}}' AS exported_at, count(*) AS row_count, {FINGERPRINT_SQL} AS fingerprint\n"
            "FROM public.quiz_questions q;\n")


def page_sql(after: str, limit: int) -> str:
    """Read-only: up to `limit` rows with id > `after`, in id order, as one jsonb array."""
    after, limit = uuid_literal(after), int(limit)
    return ("-- kimport export page. Read-only.\n"
            "SELECT coalesce(jsonb_agg(CASE WHEN x.has_comparison_key_column THEN to_jsonb(x) - 'has_comparison_key_column'\n"
            "            ELSE to_jsonb(x) - 'has_comparison_key_column' - 'comparison_key' END ORDER BY x.id), '[]'::jsonb) AS rows\n"
            "FROM (\n  SELECT\n" + ROW_COLUMNS + "\n" + _SLIM_KEY + "\n"
            f"  FROM public.quiz_questions q\n  WHERE q.id > '{after}'::uuid\n  ORDER BY q.id\n  LIMIT {limit}\n) x;\n")


def supabase_runner(sql: str) -> list:
    """Run one read-only query through the linked project; returns the JSON result rows."""
    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8") as f:
        f.write(sql)
        path = f.name
    try:
        done = subprocess.run(["supabase", "db", "query", "--linked", "--agent=no", "-o", "json", "-f", path],
                              cwd=REPO, capture_output=True, text=True, timeout=900)
    except (OSError, subprocess.TimeoutExpired) as e:
        raise ExportFailed(f"supabase db query: {e}") from None
    finally:
        Path(path).unlink(missing_ok=True)
    if done.returncode != 0:
        raise ExportFailed(f"supabase db query: {(done.stderr or done.stdout).strip()[-500:]}")
    out = done.stdout
    start = out.find("[")
    try:
        return json.loads(out[start:] if start >= 0 else out)
    except ValueError as e:
        raise ExportFailed(f"supabase db query returned no JSON: {e}: {out[:200]!r}") from None


def _retry(fn, tries: int, sleep, log):
    for attempt in range(1, tries + 1):
        try:
            return fn()
        except ExportFailed as e:
            if attempt == tries:
                raise
            log(f"  retry {attempt}/{tries - 1} after: {str(e)[:160]}")
            sleep(min(30, 2 ** attempt))


def _state(run, sleep, log) -> dict:
    res = _retry(lambda: run(state_sql()), PAGE_TRIES, sleep, log)
    if not (isinstance(res, list) and len(res) == 1 and isinstance(res[0], dict)):
        raise ExportFailed(f"unexpected state result: {str(res)[:200]}")
    return res[0]


def _page(run, after: str, limit: int) -> list:
    res = run(page_sql(after, limit))
    if not (isinstance(res, list) and len(res) == 1 and isinstance(res[0], dict) and "rows" in res[0]):
        raise ExportFailed(f"unexpected page result: {str(res)[:200]}")
    rows = res[0]["rows"]
    if isinstance(rows, str):
        rows = json.loads(rows)
    if not isinstance(rows, list):
        raise ExportFailed("page rows are not a list")
    return rows


def fetch_rows(run, page: int, fallback: int, sleep, log) -> list:
    """Every row in id order. A page that fails PAGE_TRIES times is fetched again
    as up to page/fallback smaller pages."""
    rows, after = [], _ZERO
    while True:
        try:
            got = _retry(lambda: _page(run, after, page), PAGE_TRIES, sleep, log)
            end = len(got) < page
        except ExportFailed as e:
            log(f"  page after {after} failed at {page} rows ({str(e)[:120]}); using {fallback}-row pages")
            got, end = [], False
            for _ in range(max(1, page // fallback)):
                start = got[-1]["id"] if got else after
                small = _retry(lambda: _page(run, start, fallback), PAGE_TRIES, sleep, log)
                got += small
                if len(small) < fallback:
                    end = True
                    break
        ids = [str(r.get("id")) for r in got]
        if ids != sorted(ids) or (ids and ids[0] <= after):
            raise ExportFailed("a page returned rows out of id order")
        rows += got
        log(f"  {len(rows)} rows")
        if end:
            return rows
        after = got[-1]["id"]


def assemble(run=supabase_runner, page: int = PAGE, fallback: int = FALLBACK, sleep=time.sleep,
             log=lambda m: None) -> dict:
    """One consistent export document, or ExportFailed after EXPORT_TRIES attempts."""
    last = "no attempt"
    for attempt in range(1, EXPORT_TRIES + 1):
        before = _state(run, sleep, log)
        rows = fetch_rows(run, page, fallback, sleep, log)
        after = _state(run, sleep, log)
        mine = fingerprint(rows)
        if (before.get("fingerprint") == after.get("fingerprint") == mine
                and int(before.get("row_count")) == int(after.get("row_count")) == len(rows)):
            rows.sort(key=lambda r: (str(r.get("created_at") or ""), str(r["id"])))
            return {"exported_at": before["exported_at"], "row_count": len(rows),
                    "fingerprint": mine, "rows": rows}
        last = (f"bank changed during the export (fingerprint before {before.get('fingerprint')}, "
                f"after {after.get('fingerprint')}, rows {mine}; counts {before.get('row_count')}, "
                f"{after.get('row_count')}, {len(rows)})")
        log(f"  attempt {attempt}: {last}; retrying")
    raise ExportFailed(last)


def run_export(out: Path, run=supabase_runner, page: int = PAGE, fallback: int = FALLBACK,
               sleep=time.sleep, log=print) -> dict:
    doc = assemble(run, page, fallback, sleep, log)
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    write_text_atomic(out, json.dumps(doc, ensure_ascii=False) + "\n")
    checked = read_export_doc(out)  # the reader every tool uses must accept it
    return {"rows": checked.row_count, "fingerprint": checked.fingerprint, "exported_at": checked.exported_at,
            "out": str(out)}
