"""The live-bank half of the import publish gate (the second audit of 2026-10-26: 1cb952fe was
published as a QA correction although it is the same question as live 725a09a2).

For every new row (k stage, k stage --batches, so the autopilot), every QA correction and every
row about to be published, against the live rows of the run's export (is_live, not archived,
publish_ready or publish_ready_with_verified_repair):

- live_duplicate: the row is the same question as a live row, by `k qa certify`'s rule
  (kimport.qa_dupes: formatting set aside, choice and line order ignored, a typo-level slip, or up
  to three words of spelling or suffix). A QA correction's hidden or sweep twin is never live, so
  it does not count (kimport.qa_correct hidden_twins); the row's own id never does.
- key_conflicts_printed_twin: the row's key is generated and a live twin with a printed key keys
  another of its choices (kimport.qa_keys).

Stage and the QA correction precheck refuse such a row with "qa gate: <check>: <detail>" (bucket
qa_gate); the publish precheck refuses the publish; `k lint --export` pulls it as PF_QA. The slim
live export keeps image and drawing columns as true, so figures compare by presence here (table
data in full). Read-only.
"""

from kimport import qa_dupes as qd
from kimport import qa_keys

PREFIX = "qa gate: "
CHECKS = ("live_duplicate", "key_conflicts_printed_twin")


class Bank:
    def __init__(self, export_rows: list[dict]):
        live = [qd.shape(r) for r in export_rows if qd.is_live(r)]
        self.index = qd.Index(live, presence=True)
        self.printed = {str(r["id"]) for r in live if not qa_keys.is_generated(r)}

    def findings(self, row: dict, exclude=()) -> dict[str, list[str]]:
        """{check: [detail]} for one row in any shape (kimport.qa_dupes.shape)."""
        info = qd.Info(row, presence=True)
        out = {}
        same = self.index.matches(info, exclude)
        if same:
            out["live_duplicate"] = [f"same question as live {', '.join(same)}"]
        conflicts = qa_keys.conflicts(info, self.index, self.printed, exclude)
        if conflicts:
            out["key_conflicts_printed_twin"] = conflicts
        return out


def reasons(found: dict[str, list[str]]) -> list[str]:
    return [f"{PREFIX}{c}: {'; '.join(d)[:300]}" for c, d in sorted(found.items())]


def staged_reasons(items: list[dict], export_rows: list[dict], exclude_of=None) -> dict[str, list[str]]:
    """{item id: refusal reasons} for stage precheck items (the row the importer builds).
    exclude_of(item): ids that do not count for that item (a QA correction's own hidden row)."""
    if not items:
        return {}
    bank = Bank(export_rows)
    from kimport.qa_gate import row_from_staged
    out = {}
    for it in items:
        found = bank.findings(row_from_staged(it), exclude_of(it) if exclude_of else ())
        if found:
            out[it["id"]] = reasons(found)
    return out
