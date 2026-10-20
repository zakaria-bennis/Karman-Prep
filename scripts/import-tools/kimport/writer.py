"""Writer lock and intent log.

The lock stops two sessions publishing at once. The intent log lets an
interrupted session resume safely: an intent is "open" from the moment it is
written until a closing line with a readback hash is appended. Callers pass
`now` as an ISO-8601 string; this module never reads the clock.
"""

import hashlib
import json
import os
from pathlib import Path

OUTCOMES = ("verified", "rolled_back", "not_applied")


class LockHeld(Exception):
    def __init__(self, holder: str, since: str):
        self.holder = holder
        self.since = since
        super().__init__(f"writer lock held by {holder} since {since}")


class WrongHolder(Exception):
    pass


class OpenIntent(Exception):
    def __init__(self, intents: list):
        self.intents = intents
        desc = "; ".join(f"batch {i['batch']} ({i['action']}, intent {i['intent_id']})" for i in intents)
        super().__init__(f"open intent(s) must be closed by a readback first: {desc}")


def acquire_lock(lock_path: Path, holder: str, now: str) -> None:
    lock_path = Path(lock_path)
    try:
        fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
    except FileExistsError:
        info = json.loads(lock_path.read_text())
        raise LockHeld(info["holder"], info["since"]) from None
    with os.fdopen(fd, "w") as f:
        json.dump({"holder": holder, "since": now}, f)
        f.flush()
        os.fsync(f.fileno())


def release_lock(lock_path: Path, holder: str) -> None:
    lock_path = Path(lock_path)
    info = json.loads(lock_path.read_text())
    if info["holder"] != holder:
        raise WrongHolder(f"lock is held by {info['holder']}, not {holder}")
    lock_path.unlink()


def _append(log_path: Path, entry: dict) -> None:
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, sort_keys=True) + "\n")
        f.flush()
        os.fsync(f.fileno())


def _read(log_path: Path) -> list:
    log_path = Path(log_path)
    if not log_path.exists():
        return []
    return [json.loads(line) for line in log_path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_intent(log_path: Path, batch: str, action: str, question_ids: list, sql_sha256: str, now: str) -> str:
    ids = sorted(question_ids)
    basis = json.dumps([batch, action, ids, sql_sha256, now])
    intent_id = hashlib.sha256(basis.encode("utf-8")).hexdigest()[:16]
    _append(log_path, {
        "type": "open", "intent_id": intent_id, "batch": batch, "action": action,
        "question_ids": ids, "sql_sha256": sql_sha256, "at": now,
    })
    return intent_id


def close_intent(log_path: Path, intent_id: str, outcome: str, readback_sha256: str, now: str) -> None:
    if outcome not in OUTCOMES:
        raise ValueError(f"outcome must be one of {OUTCOMES}, got {outcome!r}")
    if intent_id not in {i["intent_id"] for i in open_intents(log_path)}:
        raise ValueError(f"no open intent {intent_id}")
    _append(log_path, {
        "type": "close", "intent_id": intent_id, "outcome": outcome,
        "readback_sha256": readback_sha256, "at": now,
    })


def open_intents(log_path: Path) -> list:
    entries = _read(log_path)
    closed = {e["intent_id"] for e in entries if e["type"] == "close"}
    return [e for e in entries if e["type"] == "open" and e["intent_id"] not in closed]


def require_no_open_intents(log_path: Path) -> None:
    pending = open_intents(log_path)
    if pending:
        raise OpenIntent(pending)
