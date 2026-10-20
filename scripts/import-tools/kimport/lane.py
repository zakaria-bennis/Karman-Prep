"""Problem-question lane and reviewer slices.

A question that fails a check is set aside with a typed reason so it never
blocks a batch. `pipeline/lane.json` is the single record of those questions:
{"items": {id: {reason, status, detail, since, attempts: [...]}}}. Statuses are
open, parked and resolved. Reviewers get disjoint slices of canonical
questions, recorded in `pipeline/claims.json`.

Every function takes file paths, reads, changes and writes back with a
temp-file-then-rename. Nothing here reads the clock (callers pass `now`) and
nothing edits question text.
"""

import json
import os
import re
import time
from datetime import datetime
from pathlib import Path

from .corpus import elect
from .keys import QuestionRecord

REASONS = ("needs_figure", "asset_hold", "no_answer_key", "answer_dispute", "extraction_repair",
           "skill_unclear", "difficulty_unclear", "classification_review", "variant_review",
           "broken_or_excluded")
STATUSES = ("open", "parked", "resolved")
LINT_METHOD = "lint"  # a pull by the batch checks is not a fix method; it never counts toward parking
SLICE_SIZE = 27
_LOCK_WAIT_SECONDS = 10.0
_ID = re.compile(r"^(?P<exam>.+)_(?P<section>[A-Za-z]+)_M(?P<module>[A-Za-z0-9]+)_Q(?P<q>\d+)$")


# ---------------------------------------------------------------- files


def _load(path: Path):
    return json.loads(Path(path).read_bytes().decode("utf-8"))


def _write(path: Path, data) -> None:
    path = Path(path)
    tmp = path.with_name(path.name + f".tmp{os.getpid()}")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def _read_lane(path: Path) -> dict:
    """The lane document; a missing file is an empty lane, an unreadable one refuses."""
    path = Path(path)
    if not path.exists():
        return {"items": {}}
    try:
        data = _load(path)
        if not isinstance(data["items"], dict):
            raise TypeError
    except (ValueError, KeyError, TypeError) as e:
        raise ValueError(f"lane file {path} is not readable lane JSON") from e
    return data


def _check_reason(reason: str) -> None:
    if reason not in REASONS:
        raise ValueError(f"unknown lane reason {reason!r}; use one of {', '.join(REASONS)}")


class _FileLock:
    """O_EXCL lockfile around a read-modify-write, so two callers never interleave."""

    def __init__(self, target: Path):
        self.path = Path(target).with_name(Path(target).name + ".lock")

    def __enter__(self):
        deadline = time.monotonic() + _LOCK_WAIT_SECONDS
        while True:
            try:
                fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
                os.close(fd)
                return self
            except FileExistsError:
                if time.monotonic() > deadline:
                    raise ValueError(f"{self.path} is held by another session; if none is running, delete it") from None
                time.sleep(0.01)

    def __exit__(self, *exc):
        try:
            self.path.unlink()
        except FileNotFoundError:
            pass


# ---------------------------------------------------------------- lane


def add_open(lane_path: Path, entries: dict, now: str, source: str) -> int:
    """Add or update open entries ({id: (reason, detail)}); never remove entries.
    An entry that was not open is reopened with a failed `source` attempt.
    Existing fields, `since` and attempts are kept. Returns entries written."""
    for reason, _ in entries.values():
        _check_reason(reason)
    lane_path = Path(lane_path)
    with _FileLock(lane_path):
        data = _read_lane(lane_path)
        items = data["items"]
        for sid, (reason, detail) in entries.items():
            existing = items.get(sid)
            base = dict(existing) if existing else {"since": now, "attempts": []}
            attempts = list(base.get("attempts", []))
            if existing is not None and existing.get("status") != "open":
                attempts.append({"method": source, "ok": False, "at": now, "detail": detail})
                if existing.get("status") == "resolved":
                    base["epoch"] = len(attempts)   # a fresh two-method count after a reopen
            items[sid] = {**base, "reason": reason, "status": "open", "detail": detail, "attempts": attempts}
        _write(lane_path, data)
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
    with _FileLock(lane_path):
        data = _read_lane(lane_path)
        item = data["items"].get(occ_id)
        if item is None:
            raise ValueError(f"{occ_id} is not in the lane")
        item["attempts"] = list(item.get("attempts", [])) + [{"method": method, "ok": bool(ok), "at": now,
                                                              "detail": detail}]
        if ok:
            item["status"] = "resolved"
        else:
            item["status"] = "parked" if len(_failed_methods(item)) >= 2 else "open"
        _write(lane_path, data)
        return item["status"]


def requeue(lane_path: Path, reason: str) -> list[str]:
    """Move every parked or open item with `reason` to open (a campaign is starting).
    History is kept; the two-method count starts again. Returns the ids, sorted."""
    _check_reason(reason)
    lane_path = Path(lane_path)
    with _FileLock(lane_path):
        data = _read_lane(lane_path)
        moved = []
        for sid, item in sorted(data["items"].items()):
            if item.get("reason") == reason and item.get("status") in ("open", "parked"):
                item["status"] = "open"
                item["epoch"] = len(item.get("attempts", []))
                moved.append(sid)
        if moved:
            _write(lane_path, data)
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


def promote_next_member(clusters_path: Path, occ_id: str):
    """When canonical `occ_id` is parked or broken, elect the next member (corpus.elect, the
    parked one excluded), make it canonical and the former canonical a member. Returns the new
    canonical id, or None when nothing changed (not a canonical, held cluster, no member left)."""
    clusters_path = Path(clusters_path)
    with _FileLock(clusters_path):
        doc = _load(clusters_path)
        roles = doc["roles"]
        cluster = next((c for c in doc["clusters"] if c.get("canonical") == occ_id), None)
        if cluster is None or cluster.get("status") != "settled" or roles.get(occ_id) != "canonical":
            return None
        candidates = [m for m in cluster["members"] if m["id"] != occ_id and roles.get(m["id"]) == "member"]
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
        _write(clusters_path, doc)
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


def _read_claims(path: Path) -> dict:
    path = Path(path)
    if not path.exists():
        return {}
    try:
        data = _load(path)
        if not isinstance(data, dict):
            raise TypeError
        return data
    except (ValueError, TypeError) as e:
        raise ValueError(f"claims file {path} is not readable claims JSON") from e


def claims_path_for(lane_path: Path) -> Path:
    return Path(lane_path).with_name("claims.json")


def next_slice(clusters_path: Path, lane_path: Path, ledger_path: Path, reviewer: str,
               size: int = SLICE_SIZE, claims_path: Path | None = None, now: str | None = None) -> list[str]:
    """Up to `size` unclaimed canonical questions from one exam module, oldest unreviewed first
    (ledger bucket awaiting_evidence, then the rest; exam, section, module, number). Skips lane items
    that are open or parked, live questions, and anything claimed by any reviewer. The picked ids are
    recorded as `reviewer`'s claim under a lockfile, so two reviewers never get the same item."""
    if size < 1:
        raise ValueError("size must be at least 1")
    claims_path = Path(claims_path) if claims_path else claims_path_for(lane_path)
    roles = _load(clusters_path)["roles"]
    ledger = {e["id"]: e for e in _load(ledger_path)["items"]}
    lane_items = _read_lane(lane_path)["items"]
    blocked_lane = {i for i, it in lane_items.items() if it.get("status") in ("open", "parked")}
    with _FileLock(claims_path):
        claims = _read_claims(claims_path)
        claimed = {i for c in claims.values() for i in c.get("claimed", [])}
        eligible = []
        for occ, role in roles.items():
            entry = ledger.get(occ)
            if role != "canonical" or entry is None or _is_live(entry) or occ in blocked_lane or occ in claimed:
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
        _write(claims_path, claims)
        return picked


def release(claims_path: Path, reviewer: str) -> list[str]:
    """Drop all of `reviewer`'s claims so the items return to the pool; returns the ids."""
    claims_path = Path(claims_path)
    with _FileLock(claims_path):
        claims = _read_claims(claims_path)
        gone = claims.pop(reviewer, {}).get("claimed", [])
        _write(claims_path, claims)
        return list(gone)


def release_done(claims_path: Path, lane_path: Path, ledger_path: Path) -> list[str]:
    """Drop claims that are finished: resolved in the lane, or live in the ledger."""
    claims_path = Path(claims_path)
    ledger = {e["id"]: e for e in _load(ledger_path)["items"]}
    lane_items = _read_lane(lane_path)["items"]

    def done(i):
        return lane_items.get(i, {}).get("status") == "resolved" or (i in ledger and _is_live(ledger[i]))
    dropped = []
    with _FileLock(claims_path):
        claims = _read_claims(claims_path)
        for entry in claims.values():
            keep = [i for i in entry.get("claimed", []) if not done(i)]
            dropped += [i for i in entry.get("claimed", []) if done(i)]
            entry["claimed"] = keep
        _write(claims_path, claims)
    return dropped
