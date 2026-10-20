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


class NoLock(Exception):
    pass


class CorruptLock(Exception):
    pass


class CorruptLog(Exception):
    def __init__(self, path, line_no: int):
        self.path = path
        self.line_no = line_no
        super().__init__(f"intent log {path} has an unreadable line {line_no} that is not the last line")


class OpenIntent(Exception):
    def __init__(self, intents: list):
        self.intents = intents
        desc = "; ".join(f"batch {i['batch']} ({i['action']}, intent {i['intent_id']})" for i in intents)
        super().__init__(f"open intent(s) must be closed by a readback first: {desc}")


def _read_lock(lock_path: Path):
    """Return (holder, since), or None when the file cannot be parsed."""
    try:
        info = json.loads(Path(lock_path).read_text())
        return info["holder"], info["since"]
    except (ValueError, KeyError, TypeError):
        return None


def acquire_lock(lock_path: Path, holder: str, now: str) -> None:
    lock_path = Path(lock_path)
    try:
        fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
    except FileExistsError:
        info = _read_lock(lock_path)
        raise LockHeld(*(info or ("unknown", "unknown"))) from None
    with os.fdopen(fd, "w") as f:
        json.dump({"holder": holder, "since": now}, f)
        f.flush()
        os.fsync(f.fileno())


def release_lock(lock_path: Path, holder: str, force: bool = False) -> None:
    lock_path = Path(lock_path)
    if not lock_path.exists():
        raise NoLock(f"no lock held at {lock_path}")
    info = _read_lock(lock_path)
    if info is None:
        if not force:
            raise CorruptLock(f"lock file {lock_path} is unreadable; release with force only if no session is writing")
        lock_path.unlink()
        return
    if info[0] != holder:
        raise WrongHolder(f"lock is held by {info[0]}, not {holder}")
    lock_path.unlink()


def _append(log_path: Path, entry: dict) -> None:
    log_path = Path(log_path)
    prefix = ""
    if log_path.exists() and log_path.stat().st_size > 0:
        with open(log_path, "rb") as f:
            f.seek(-1, os.SEEK_END)
            if f.read(1) != b"\n":
                prefix = "\n"  # a crash left a torn last line; keep it separate
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(prefix + json.dumps(entry, sort_keys=True) + "\n")
        f.flush()
        os.fsync(f.fileno())


def _read(log_path: Path) -> list:
    log_path = Path(log_path)
    if not log_path.exists():
        return []
    parsed = []  # (line_no, entry or None)
    for n, line in enumerate(log_path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
            if not isinstance(entry, dict) or "type" not in entry or "intent_id" not in entry:
                raise ValueError
        except ValueError:
            entry = None
        parsed.append((n, entry))
    closed = {e["intent_id"] for _, e in parsed if e and e["type"] == "close"}
    entries = []
    for i, (n, entry) in enumerate(parsed):
        if entry is not None:
            entries.append(entry)
        elif i == len(parsed) - 1 or f"torn-{n}" not in closed:
            if i != len(parsed) - 1:
                raise CorruptLog(log_path, n)
            entries.append({
                "type": "open", "intent_id": f"torn-{n}", "batch": f"unknown (torn log line {n})",
                "action": "unknown", "question_ids": [], "sql_sha256": "", "at": "",
            })
        # else: a torn line already closed by an explicit torn-N close; skip
    return entries


def write_intent(log_path: Path, batch: str, action: str, question_ids: list, sql_sha256: str, now: str) -> str:
    ids = sorted(question_ids)
    basis = json.dumps([batch, action, ids, sql_sha256, now])
    intent_id = hashlib.sha256(basis.encode("utf-8")).hexdigest()[:16]
    if intent_id in {i["intent_id"] for i in open_intents(log_path)}:
        raise ValueError(f"intent {intent_id} is already open")
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
