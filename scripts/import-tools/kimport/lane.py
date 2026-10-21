"""Problem-question lane and reviewer slices.

A question that fails a check is set aside with a typed reason so it never
blocks a batch. `pipeline/lane.json` is the single record of those questions:
{"items": {id: {reason, status, detail, since, attempts: [...]}}}. Statuses are
open, parked and resolved. Reviewers get disjoint slices of canonical
questions, recorded in `pipeline/claims.json`.

Every function takes file paths, reads, changes and writes back under
kimport.jsonio's FileLock with its atomic writer (temp file, then rename). Nothing here reads the clock (callers pass `now`) and
nothing edits question text.
"""

import re
from datetime import datetime, timezone
from pathlib import Path

from .corpus import elect
from .jsonio import FileLock, atomic_write_json, load_json
from .keys import QuestionRecord

REASONS = ("needs_figure", "asset_hold", "no_answer_key", "answer_dispute", "extraction_repair",
           "skill_unclear", "difficulty_unclear", "classification_review", "variant_review",
           "broken_or_excluded", "already_live")
ALREADY_LIVE = "already_live"  # the occurrence is live, or duplicates a live row: resolved, and never sliced again
STATUSES = ("open", "parked", "resolved")
LINT_METHOD = "lint"  # a pull by the batch checks is not a fix method; it never counts toward parking
SLICE_SIZE = 27
NOT_REVIEWABLE_BUCKETS = ("certified_broken", "certified_duplicate")
_ID = re.compile(r"^(?P<exam>.+)_(?P<section>[A-Za-z]+)_M(?P<module>[A-Za-z0-9]+)_Q(?P<q>\d+)(?P<suffix>_[a-z]+)?$")   # e.g. ..._Q01_retained


# ---------------------------------------------------------------- files


def _read_lane(path: Path) -> dict:
    """The lane document; a missing file is an empty lane, an unreadable one refuses."""
    path = Path(path)
    if not path.exists():
        return {"items": {}}
    try:
        data = load_json(path)
        if not isinstance(data["items"], dict):
            raise TypeError
    except (ValueError, KeyError, TypeError) as e:
        raise ValueError(f"lane file {path} is not readable lane JSON") from e
    return data


def _check_reason(reason: str) -> None:
    if reason not in REASONS:
        raise ValueError(f"unknown lane reason {reason!r}; use one of {', '.join(REASONS)}")


# ---------------------------------------------------------------- lane


def add_open(lane_path: Path, entries: dict, now: str, source: str) -> int:
    """Add or update open entries ({id: (reason, detail)}); never remove entries.
    A resolved entry is reopened with a failed `source` attempt; a parked one records the
    attempt and detail but stays parked with its reason unchanged (spec section 6).
    Existing fields, `since` and attempts are kept. Returns entries written."""
    for reason, _ in entries.values():
        _check_reason(reason)
    lane_path = Path(lane_path)
    with FileLock(lane_path):
        data = _read_lane(lane_path)
        items = data["items"]
        for sid, (reason, detail) in entries.items():
            existing = items.get(sid)
            base = dict(existing) if existing else {"since": now, "attempts": []}
            attempts = list(base.get("attempts", []))
            status = "open"
            if existing is not None and existing.get("status") == "parked":
                # only a campaign requeue for its reason brings it back; the reason stays fixed
                status = "parked"
                if reason != existing.get("reason"):
                    detail = f"[reason now {reason}] {detail}"
                    reason = existing["reason"]
                attempts.append({"method": source, "ok": False, "at": now, "detail": detail})
            elif existing is not None and existing.get("status") != "open":
                attempts.append({"method": source, "ok": False, "at": now, "detail": detail})
                base["epoch"] = len(attempts)   # resolved: a fresh two-method count after a reopen
            items[sid] = {**base, "reason": reason, "status": status, "detail": detail, "attempts": attempts}
        atomic_write_json(lane_path, data)
    return len(entries)


def set_aside(lane_path: Path, occ_id: str, reason: str, detail: str, now: str) -> None:
    add_open(lane_path, {occ_id: (reason, detail)}, now, "set_aside")


def _failed_methods(item: dict) -> set:
    since = item.get("epoch", 0)
    return {a["method"] for a in item.get("attempts", [])[since:]
            if not a.get("ok") and a.get("method") != LINT_METHOD}


def record_attempt(lane_path: Path, occ_id: str, method: str, ok: bool, now: str, detail: str = "") -> str:
    """Record a fix attempt; return the new status. ok resolves the item. A second failed
    attempt with a different method parks it; repeating a method does not count."""
    lane_path = Path(lane_path)
    with FileLock(lane_path):
        data = _read_lane(lane_path)
        item = data["items"].get(occ_id)
        if item is None:
            raise ValueError(f"{occ_id} is not in the lane")
        if item.get("status") == "resolved" and not ok:
            item["epoch"] = len(item.get("attempts", []))   # fresh count once it leaves resolved
        item["attempts"] = list(item.get("attempts", [])) + [{"method": method, "ok": bool(ok), "at": now,
                                                              "detail": detail}]
        if ok:
            item["status"] = "resolved"
        else:
            item["status"] = "parked" if len(_failed_methods(item)) >= 2 else "open"
        atomic_write_json(lane_path, data)
        return item["status"]


def requeue(lane_path: Path, reason: str) -> list[str]:
    """Move every parked or open item with `reason` to open (a campaign is starting).
    History is kept; the two-method count starts again. Returns the ids, sorted."""
    _check_reason(reason)
    lane_path = Path(lane_path)
    with FileLock(lane_path):
        data = _read_lane(lane_path)
        moved = []
        for sid, item in sorted(data["items"].items()):
            if item.get("reason") == reason and item.get("status") in ("open", "parked"):
                item["status"] = "open"
                item["epoch"] = len(item.get("attempts", []))
                moved.append(sid)
        if moved:
            atomic_write_json(lane_path, data)
        return moved


def _days(now: str, since: str) -> float:
    delta = datetime.fromisoformat(now) - datetime.fromisoformat(since)
    return round(delta.total_seconds() / 86400, 1)


def summary(lane_path: Path, now: str) -> dict:
    """Counts by reason and status, and the oldest unresolved `since` (with its age) per reason."""
    items = _read_lane(lane_path)["items"]
    by_reason = {r: {s: 0 for s in STATUSES} for r in REASONS}
    oldest: dict = {r: None for r in REASONS}
    for item in items.values():
        reason, status = item.get("reason"), item.get("status")
        bucket = by_reason.setdefault(reason, {s: 0 for s in STATUSES})
        bucket[status] = bucket.get(status, 0) + 1
        if status in ("open", "parked") and (oldest.get(reason) is None or item["since"] < oldest[reason]):
            oldest[reason] = item["since"]
    return {"total": len(items), "by_reason": by_reason, "oldest_since": oldest,
            "oldest_age_days": {r: (None if s is None else _days(now, s)) for r, s in oldest.items()}}


# ---------------------------------------------------------------- clusters


def blocked_ids(lane_path: Path | None) -> set[str]:
    """Ids open or parked in the lane: never elected canonical (promote_next_member,
    corpus re-runs) and never handed out in a slice. No lane file: none."""
    if lane_path is None:
        return set()
    return {i for i, it in _read_lane(lane_path)["items"].items() if it.get("status") in ("open", "parked")}


def live_ids(lane_path: Path | None) -> set[str]:
    """Ids the lane records as already live (reason already_live, any status): never sliced."""
    if lane_path is None:
        return set()
    return {i for i, it in _read_lane(lane_path)["items"].items() if it.get("reason") == ALREADY_LIVE}


def promote_next_member(clusters_path: Path, occ_id: str, lane_path: Path | None = None):
    """When canonical `occ_id` is parked or broken, elect the next member (corpus.elect, the
    parked one excluded), make it canonical and the former canonical a member. Returns the new
    canonical id, or None when nothing changed (not a canonical, held cluster, no member left).
    Members that are open or parked in the lane (when `lane_path` is given) are not candidates."""
    in_lane = blocked_ids(lane_path)
    clusters_path = Path(clusters_path)
    with FileLock(clusters_path):
        doc = load_json(clusters_path)
        roles = doc["roles"]
        cluster = next((c for c in doc["clusters"] if c.get("canonical") == occ_id), None)
        if cluster is None or cluster.get("status") != "settled" or roles.get(occ_id) != "canonical":
            return None
        candidates = [m for m in cluster["members"] if m["id"] != occ_id and roles.get(m["id"]) == "member"
                      and m["id"] not in in_lane]
        if not candidates:
            return None
        by_id = {m["id"]: m for m in candidates}
        records = [QuestionRecord(ref=m["id"], text="", choices=(), answer="", answer_format="mc",
                                  is_live=bool(m.get("is_live")),
                                  meta={"source": m.get("source", "corpus"),
                                        "reviewed_answer": {"kind": "official" if m.get("printed_key") else None},
                                        "holds": [None] * int(m.get("holds") or 0)})
                   for m in candidates]
        new = elect(records).ref
        cluster["canonical"] = new
        for m in cluster["members"]:
            if m["id"] == new:
                m["match"] = "canonical"
            elif m["id"] == occ_id:
                m["match"] = "exact"
        roles[new], roles[occ_id] = "canonical", "member"
        by_id[new]["match"] = "canonical"
        atomic_write_json(clusters_path, doc)
        return new


# ---------------------------------------------------------------- slices


def parse_id(occ_id: str) -> tuple:
    """(exam, section, module, question number) from an occurrence id such as
    2025-10_US_V1_MATH_M1_Q06; an id that does not parse sorts last in its own group."""
    m = _ID.match(occ_id)
    if not m:
        return ("~", occ_id, "", 0)
    return (m["exam"], m["section"], m["module"], int(m["q"]))


def _module_key(mod: str):
    return (0, int(mod), "") if mod.isdigit() else (1, 0, mod)


def _is_live(entry: dict) -> bool:
    return entry.get("bucket") == "already_live" or entry.get("final_category") == "LIVE"


def _ruled_out(entry: dict) -> bool:
    return entry.get("bucket") in NOT_REVIEWABLE_BUCKETS


def _read_claims(path: Path) -> dict:
    path = Path(path)
    if not path.exists():
        return {}
    try:
        data = load_json(path)
        if not isinstance(data, dict):
            raise TypeError
        return data
    except (ValueError, TypeError) as e:
        raise ValueError(f"claims file {path} is not readable claims JSON") from e


def claims_path_for(lane_path: Path) -> Path:
    return Path(lane_path).with_name("claims.json")


def _extra_ledgers(extra, near: Path) -> list[Path]:
    """Supplementary new-exam ledgers: the ones given, else new-exam-ledger.json in `near` if present."""
    from .corpus_load import NEW_EXAM_LEDGER_FILE
    if extra is not None:
        return [Path(p) for p in extra]
    p = Path(near) / NEW_EXAM_LEDGER_FILE
    return [p] if p.exists() else []


REWORK_REASONS = ("extraction_repair", "classification_review", "skill_unclear", "difficulty_unclear", "variant_review")


def _ready_reviewed_file(batch: Path) -> Path | None:
    try:
        for line in (batch / "READY").read_text(encoding="utf-8").splitlines():
            if line.startswith("reviewed_file:"):
                named = Path(line.split(":", 1)[1].strip())
                if named.is_file():
                    return named
                if (batch / named.name).is_file():
                    return batch / named.name
    except OSError:
        return None
    found = sorted(batch.glob("*reviewed-import-ready.json"))
    return found[0] if found else None


def handed_over_ids(lane_path: Path) -> dict[str, float]:
    """Occurrence ids already built and handed over: every pipeline/batches/*/ folder with a READY
    file whose reviewed file lists the id as stable_question_id. Maps id to the newest READY mtime
    (epoch seconds). Unreadable batches are skipped."""
    out: dict[str, float] = {}
    for ready in Path(lane_path).parent.glob("batches/*/READY"):
        reviewed = _ready_reviewed_file(ready.parent)
        if reviewed is None:
            continue
        try:
            mtime = ready.stat().st_mtime
            questions = load_json(reviewed).get("questions", [])
        except (OSError, ValueError, AttributeError):
            continue
        for q in questions:
            sid = q.get("stable_question_id") if isinstance(q, dict) else None
            if sid:
                out[sid] = max(out.get(sid, 0.0), mtime)
    return out


def _epoch(stamp: str) -> float:
    dt = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    return (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).timestamp()


def _reopened_after(item: dict, when: float) -> bool:
    stamps = [item.get("since")] + [a.get("at") for a in item.get("attempts", [])]
    try:
        return max(_epoch(t) for t in stamps if t) > when
    except ValueError:
        return False


def handed_over_blocked(lane_path: Path) -> set[str]:
    """Handed-over ids that must not be sliced again, unless the lane reopened them for reviewer
    rework (open, a rework reason) after their batch was written."""
    items = _read_lane(lane_path)["items"]
    blocked = set()
    for sid, when in handed_over_ids(lane_path).items():
        it = items.get(sid)
        if it and it.get("status") == "open" and it.get("reason") in REWORK_REASONS and _reopened_after(it, when):
            continue
        blocked.add(sid)
    return blocked


def next_slice(clusters_path: Path, lane_path: Path, ledger_path: Path, reviewer: str,
               size: int = SLICE_SIZE, claims_path: Path | None = None, now: str | None = None,
               extra_ledgers=None) -> list[str]:
    """Up to `size` unclaimed canonical questions from one exam module, oldest unreviewed first
    (ledger bucket awaiting_evidence, then the rest; exam, section, module, number). Skips lane items
    that are open or parked, live questions, ids already handed over in a batch (unless reopened for rework since), and anything claimed by any reviewer. The picked ids are
    recorded as `reviewer`'s claim under a lockfile, so two reviewers never get the same item."""
    if size < 1:
        raise ValueError("size must be at least 1")
    claims_path = Path(claims_path) if claims_path else claims_path_for(lane_path)
    from .corpus_load import ledger_entries
    roles = load_json(clusters_path)["roles"]
    # new-exam occurrences (pipeline/new-exams) come from a supplementary ledger next to clusters.json
    ledger = ledger_entries(ledger_path, _extra_ledgers(extra_ledgers, Path(clusters_path).parent))
    blocked_lane = blocked_ids(lane_path)
    already_live = live_ids(lane_path) | handed_over_blocked(lane_path)
    with FileLock(claims_path):
        claims = _read_claims(claims_path)
        claimed = {i for c in claims.values() for i in c.get("claimed", [])}
        eligible = []
        for occ, role in roles.items():
            entry = ledger.get(occ)
            if (role != "canonical" or entry is None or _is_live(entry) or _ruled_out(entry) or occ in blocked_lane
                    or occ in claimed or occ in already_live):
                continue
            exam, section, module, num = parse_id(occ)
            eligible.append(((entry.get("bucket") != "awaiting_evidence", exam, section, _module_key(module), num, occ),
                             (exam, section, module), occ))
        eligible.sort()
        if not eligible:
            return []
        first_module = eligible[0][1]
        picked = [occ for _, mod, occ in eligible if mod == first_module][:size]
        entry = claims.setdefault(reviewer, {"claimed": [], "at": now})
        entry["claimed"] = list(entry.get("claimed", [])) + picked
        entry["at"] = now
        atomic_write_json(claims_path, claims)
        return picked


def release(claims_path: Path, reviewer: str) -> list[str]:
    """Drop all of `reviewer`'s claims so the items return to the pool; returns the ids."""
    claims_path = Path(claims_path)
    with FileLock(claims_path):
        claims = _read_claims(claims_path)
        gone = claims.pop(reviewer, {}).get("claimed", [])
        atomic_write_json(claims_path, claims)
        return list(gone)


def release_done(claims_path: Path, lane_path: Path, ledger_path: Path, extra_ledgers=None) -> list[str]:
    """Drop claims that are finished: resolved in the lane, or live in the ledger (the readiness
    ledger plus new-exam ledgers: given, else <lane folder>/corpus/new-exam-ledger.json if present)."""
    from .corpus_load import ledger_entries
    claims_path = Path(claims_path)
    ledger = ledger_entries(ledger_path, _extra_ledgers(extra_ledgers, Path(lane_path).parent / "corpus"))
    lane_items = _read_lane(lane_path)["items"]

    def done(i):
        return lane_items.get(i, {}).get("status") == "resolved" or (i in ledger and _is_live(ledger[i]))
    dropped = []
    with FileLock(claims_path):
        claims = _read_claims(claims_path)
        for entry in claims.values():
            keep = [i for i in entry.get("claimed", []) if not done(i)]
            dropped += [i for i in entry.get("claimed", []) if done(i)]
            entry["claimed"] = keep
        atomic_write_json(claims_path, claims)
    return dropped


def release_ids(claims_path: Path, ids) -> list[str]:
    """Drop the given ids (for example questions just published) from every reviewer's claims."""
    gone_set = set(ids)
    claims_path = Path(claims_path)
    if not claims_path.exists():
        return []
    dropped = []
    with FileLock(claims_path):
        claims = _read_claims(claims_path)
        for entry in claims.values():
            dropped += [i for i in entry.get("claimed", []) if i in gone_set]
            entry["claimed"] = [i for i in entry.get("claimed", []) if i not in gone_set]
        atomic_write_json(claims_path, claims)
    return dropped


def mark_already_live(lane_path: Path, entries: dict, now: str, method: str) -> list[str]:
    """Record occurrences as already live ({id: (live row id or None, detail)}): reason already_live,
    status resolved, with an ok attempt. An existing entry keeps its history (its old reason goes in the
    detail). Returns the ids newly marked."""
    lane_path = Path(lane_path)
    done = []
    with FileLock(lane_path):
        data = _read_lane(lane_path)
        for sid, (row, detail) in sorted(entries.items()):
            item = data["items"].get(sid)
            if item is not None and item.get("reason") == ALREADY_LIVE:
                continue
            base = dict(item) if item else {"since": now, "attempts": []}
            if item is not None:
                detail = f"[was {item.get('reason')} {item.get('status')}] {detail}"
            base["attempts"] = list(base.get("attempts", [])) + [{"method": method, "ok": True, "at": now,
                                                                  "detail": detail}]
            data["items"][sid] = {**base, "reason": ALREADY_LIVE, "status": "resolved", "detail": detail,
                                  "live_row": row}
            done.append(sid)
        if done:
            atomic_write_json(lane_path, data)
    return done


def resolve_ids(lane_path: Path, ids, method: str, now: str, detail: str = "") -> list[str]:
    """Mark lane items resolved (for example held rows that were corrected and published)."""
    lane_path = Path(lane_path)
    done = []
    with FileLock(lane_path):
        data = _read_lane(lane_path)
        for i in ids:
            item = data["items"].get(i)
            if item is None or item.get("status") == "resolved":
                continue
            item["attempts"] = list(item.get("attempts", [])) + [{"method": method, "ok": True, "at": now,
                                                                  "detail": detail}]
            item["status"] = "resolved"
            done.append(i)
        if done:
            atomic_write_json(lane_path, data)
    return done
