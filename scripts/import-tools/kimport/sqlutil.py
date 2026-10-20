"""SQL text helpers shared by the generators (sweep, backfill, publish).

Nothing here connects to a database; callers build text for a human-approved run.
"""

import re

_UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")


def uuid_literal(s: str) -> str:
    if not isinstance(s, str) or not _UUID.fullmatch(s):
        raise ValueError(f"not a lowercase uuid: {s!r}")
    return s


def lit(v) -> str:
    """SQL literal for a text value (NULL for None)."""
    if v is None:
        return "NULL"
    s = str(v)
    if "\x00" in s:
        raise ValueError("NUL byte in SQL value")
    return "'" + s.replace("'", "''") + "'"


def do_block(tag: str, body: list[str]) -> list[str]:
    if f"${tag}$" in "\n".join(body):
        raise ValueError(f"dollar-quote tag {tag} appears inside its own block")
    return [f"DO ${tag}$", *body, f"END ${tag}$;", ""]
