"""Shared JSON file helpers: one atomic writer and one lock for the
read-modify-write of pipeline files (lane.json, claims.json, clusters.json,
founder_decisions.json).

atomic_write_json writes a temp file in the same folder and renames it over
the target, so a reader never sees half a file and a crash leaves the old one.
FileLock is an exclusive flock on a persistent `<file>.lock` beside the target;
the OS drops it when its holder dies, so there is nothing stale to break.
"""

import fcntl
import json
import os
import tempfile
import time
from pathlib import Path

LOCK_WAIT_SECONDS = 10.0


def load_json(path: Path):
    return json.loads(Path(path).read_bytes().decode("utf-8"))


def atomic_write_json(path: Path, data) -> None:
    write_text_atomic(path, json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def write_text_atomic(path: Path, text: str) -> None:
    path = Path(path)
    fd, tmp = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


class FileLock:
    """Exclusive flock on `<target>.lock` around a read-modify-write. Waits up to
    LOCK_WAIT_SECONDS (read at entry, so tests can lower it), then gives a plain
    message. Not re-entrant: take it once per operation."""

    def __init__(self, target: Path):
        self.path = Path(target).with_name(Path(target).name + ".lock")
        self.fd = None

    def __enter__(self):
        fd = os.open(self.path, os.O_CREAT | os.O_RDWR, 0o644)
        deadline = time.monotonic() + LOCK_WAIT_SECONDS
        while True:
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                self.fd = fd
                return self
            except BlockingIOError:
                if time.monotonic() > deadline:
                    os.close(fd)
                    raise ValueError(f"{self.path} is in use by another session; try again in a moment") from None
                time.sleep(0.01)

    def __exit__(self, *exc):
        os.close(self.fd)  # closing releases the flock
        self.fd = None
