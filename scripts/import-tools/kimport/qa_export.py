"""Full read-only export of every live question for the student QA audit.

The usual `k export` file keeps only the presence of the figure columns and a
cut-down answer key, which is enough for duplicates but not to check or draw a
question. This export keeps, for each row with is_live = true, every
quiz_questions column the student screen and the catalog lane read (all but
grader_votes, question_bbox, source_regions and figure_quality), its
answer_choices rows in full (letter order), and its answer_key_entries (id and
raw_model_response, in created_at, id order).

It reads through the REST API with GET requests only, using the service key in
.env.local (the Management API path `k export` uses takes minutes per page when
other sessions use the CLI; REST pages take seconds). The live ids, content
hashes and publish statuses are read before the first page and after the last;
the file is written only when both agree with the assembled rows, otherwise the
export starts over.
"""

import hashlib
import json
import time
from pathlib import Path

from kimport.fetch import ExportFailed
from kimport.jsonio import write_text_atomic
from kimport.sqlutil import uuid_literal

TRIES = 4
_ZERO = "00000000-0000-0000-0000-000000000000"
_DROPPED = ("grader_votes", "question_bbox", "source_regions", "figure_quality")


def live_fingerprint(rows: list[dict]) -> str:
    def part(r):
        return ":".join(str("" if r.get(f) is None else r.get(f)) for f in ("id", "content_hash_v2", "publish_status"))
    return hashlib.md5(",".join(part(r) for r in sorted(rows, key=lambda r: str(r["id"]))).encode("utf-8")).hexdigest()


def _retry(fn, sleep, log):
    for attempt in range(1, TRIES + 1):
        try:
            return fn()
        except (ExportFailed, ValueError) as e:
            if attempt == TRIES:
                raise
            log(f"  retry {attempt}/{TRIES - 1} after: {str(e)[:160]}")
            sleep(min(30, 2 ** attempt))


def read_env(path: Path) -> dict:
    env = {}
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def rest_getter(env_file: Path):
    import urllib.request
    env = read_env(env_file)
    base, key = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/"), env["SUPABASE_SERVICE_ROLE_KEY"]

    def get(query: str):
        req = urllib.request.Request(f"{base}/rest/v1/{query}", method="GET",
                                     headers={"apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001 — retried by the caller
            raise ExportFailed(f"rest: {str(e)[:200]}") from None
    return get


def rest_page_query(after: str, limit: int) -> str:
    after, limit = uuid_literal(after), int(limit)
    return ("quiz_questions?select=*,answer_choices(*),answer_key_entries(id,raw_model_response,created_at)"
            f"&is_live=eq.true&id=gt.{after}&order=id.asc&limit={limit}"
            "&answer_choices.order=letter.asc&answer_key_entries.order=created_at.asc,id.asc")


def _rest_state(get, sleep, log) -> dict:
    rows, after = [], _ZERO
    while True:
        got = _retry(lambda: get(f"quiz_questions?select=id,content_hash_v2,publish_status&is_live=eq.true"
                                 f"&id=gt.{after}&order=id.asc&limit=1000"), sleep, log)
        rows += got
        if len(got) < 1000:
            return {"row_count": len(rows), "fingerprint": live_fingerprint(rows)}
        after = got[-1]["id"]


def _shape(row: dict) -> dict:
    for c in _DROPPED:
        row.pop(c, None)
    for k in row.get("answer_key_entries") or []:
        k.pop("created_at", None)
    return row


def run_qa_export(out: Path, env_file: Path, get=None, page: int = 200, sleep=time.sleep, log=print) -> dict:
    get = get or rest_getter(env_file)
    out = Path(out)
    for attempt in range(1, 4):
        started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        before = _rest_state(get, sleep, log)
        rows, after = [], _ZERO
        while True:
            got = _retry(lambda: get(rest_page_query(after, page)), sleep, log)
            rows += [_shape(r) for r in got]
            if len(rows) % 1000 < page:
                log(f"  {len(rows)} rows")
            if len(got) < page:
                break
            after = got[-1]["id"]
        end = _rest_state(get, sleep, log)
        mine = live_fingerprint(rows)
        if before["fingerprint"] == end["fingerprint"] == mine and before["row_count"] == end["row_count"] == len(rows):
            doc = {"exported_at": started, "row_count": len(rows), "fingerprint": mine, "rows": rows}
            write_text_atomic(out, json.dumps(doc, ensure_ascii=False) + "\n")
            return {"rows": len(rows), "fingerprint": mine, "out": str(out)}
        log(f"  attempt {attempt}: live bank changed during the export; starting over")
    raise ExportFailed("live bank kept changing during the export")
