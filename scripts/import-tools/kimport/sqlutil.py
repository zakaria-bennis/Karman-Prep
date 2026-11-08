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


def dryrun_variant(sql: str) -> str:
    """The same SQL with its one final top-level COMMIT; turned into ROLLBACK;.

    A dry run must be this file run as-is: wrapping the real file in another
    transaction would still commit, because the real file ends with COMMIT."""
    lines = sql.split("\n")
    at = [i for i, line in enumerate(lines) if line.strip().upper() == "COMMIT;"]
    if len(at) != 1:
        raise ValueError(f"expected exactly one top-level COMMIT; but found {len(at)}")
    lines[at[0]] = "ROLLBACK;"
    return "\n".join(lines)
