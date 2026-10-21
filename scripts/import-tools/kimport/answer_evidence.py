"""Where the answer key evidence sits in answer_key_entries.raw_model_response.

The importer (importAnswerEvidence) stores reviewed_answer.evidence for an official key, but
the whole reviewed_answer for an independently confirmed generated key, so there the evidence
(approved_tags, student_publication_allowed, question_id) sits under "evidence". The app's
readCatalogQuestionScope reads it from that root and rejects a generated envelope that also
carries approved_tags at the top. Every reader and writer of those fields goes through here.
"""

GENERATED = "independently_confirmed_generated"


def is_generated(raw) -> bool:
    return isinstance(raw, dict) and raw.get("kind") == GENERATED


def evidence_root(raw):
    """The object holding approved_tags / student_publication_allowed (None if there is none)."""
    if is_generated(raw):
        ev = raw.get("evidence")
        return ev if isinstance(ev, dict) else None
    return raw if isinstance(raw, dict) else None


def ambiguous(raw) -> bool:
    """A generated envelope that also carries approved_tags at the top (the app refuses it)."""
    return is_generated(raw) and raw.get("approved_tags") is not None


def json_path(raw, *keys: str) -> str:
    """Postgres text[] literal for jsonb_set / #> on this row's evidence field, e.g.
    '{student_publication_allowed}' or '{evidence,student_publication_allowed}'."""
    return "'{" + ",".join((("evidence",) if is_generated(raw) else ()) + keys) + "}'"


def sql_get(col: str, raw, *keys: str, text: bool = False) -> str:
    """Arrow chain for this row's evidence field, e.g. col->>'student_publication_allowed' or
    col->'evidence'->'approved_tags'->>'tag_binding_manifest_sha256' (official rows keep the exact
    legacy SQL)."""
    path = (("evidence",) if is_generated(raw) else ()) + keys
    out = col
    for i, k in enumerate(path):
        out += ("->>" if text and i == len(path) - 1 else "->") + f"'{k}'"
    return out


def sql_remove(col: str, raw, key: str) -> str:
    """Remove one evidence field: col - 'key' (official) or col #- '{evidence,key}' (generated)."""
    return f"{col} #- {json_path(raw, key)}" if is_generated(raw) else f"{col} - '{key}'"
