"""The autopilot's two pipeline files.

pipeline/autopilot-state.json is the ledger of batch folders already handled,
so no batch is staged twice:
  {"batches": {folder: {"run", "status", "rows", "staged", "published", "held", "refused", "at"}},
   "runs": {run id: {"at", "result", "published", "held", "fixed", "refused", "visible_after", "batches"}},
   "held": {stable id: {"run", "batch", "reason"}}}
status is published (some rows went live), held (rows staged but held at seal), refused (nothing
staged), evidence_corrected (a corrected batch for live rows: their evidence was replaced), or stopped (the run stopped part-way; a person must look before it is retried).
"held" lists rows staged and held at seal; a corrected batch for them is an evidence update
(kimport.fix). A held row that is later published moves to the run's "fixed" count.

pipeline/autopilot-status.json is the founder's factory view, rewritten after every run.

`record_manual_run` enters a run done by hand (bulk-1) into the ledger.
"""

import json
from pathlib import Path

from kimport.jsonio import FileLock, atomic_write_json, load_json

STATE, STATUS = "autopilot-state.json", "autopilot-status.json"


def read_state(pipe: Path) -> dict:
    path = Path(pipe) / STATE
    if not path.exists():
        return {"batches": {}, "runs": {}, "held": {}}
    try:
        data = load_json(path)
        for k in ("batches", "runs", "held"):
            data.setdefault(k, {})
            if not isinstance(data[k], dict):
                raise TypeError
        return data
    except (ValueError, TypeError) as e:
        raise ValueError(f"{path} is not readable autopilot state") from e


def write_state(pipe: Path, state: dict) -> None:
    path = Path(pipe) / STATE
    with FileLock(path):
        atomic_write_json(path, state)


def reason_kind(reason: str) -> str:
    """A short bucket name for a precheck refusal reason."""
    r = reason or ""
    if r.startswith("live correction: "):
        return "live_fix_refused"
    if r.startswith("figure gate: "):
        return "figure_gate"
    if r.startswith("qa gate: "):
        return "qa_gate"
    for test, kind in (("in this run", "duplicate_in_run"), ("same comparison key", "same_key_in_bank"),
                       ("typo-level", "typo_match"), ("source question already", "source_in_bank"),
                       ("content_hash_v2 already", "same_hash_in_bank"),
                       ("normalized question_text already", "same_text_in_bank"),
                       ("would still be held at seal", "would_be_held_again")):
        if test in r:
            return kind
    if "differs from the private draft" in r or "private draft" in r:
        return "fix_draft_mismatch"
    return "other"


def refused_by_reason(precheck_refused: list[dict], refused_batches: list[dict]) -> dict:
    """Rows counted once, by their first reason; whole refused batches under batch_refused."""
    out: dict[str, int] = {}
    for r in precheck_refused:
        k = reason_kind((r.get("reasons") or [""])[0])
        out[k] = out.get(k, 0) + 1
    if refused_batches:
        out["batch_refused"] = len(refused_batches)
    return out


def ready_folders(pipe: Path) -> list[Path]:
    from kimport.bulk import _natural
    root = Path(pipe) / "batches"
    if not root.is_dir():
        return []
    return sorted((d for d in root.iterdir() if d.is_dir() and (d / "READY").is_file()),
                  key=lambda d: _natural(d.name))


def waiting(pipe: Path, state: dict) -> list[str]:
    return [d.name for d in ready_folders(pipe) if d.name not in state["batches"]]


def write_status(pipe: Path, state: dict, run: dict | None, message: str, error: str | None = None) -> dict:
    """Rewrite autopilot-status.json from the ledger and this run."""
    runs = state["runs"]
    last_visible = next((r["visible_after"] for _, r in sorted(runs.items(), key=lambda x: x[1].get("at") or "",
                                                             reverse=True) if r.get("visible_after") is not None),
                        None)
    refused: dict[str, int] = {}
    for r in runs.values():
        for k, n in (r.get("refused") or {}).items():
            refused[k] = refused.get(k, 0) + n
    status = {
        "last_run_at": (run or {}).get("at"),
        "last_run": (run or {}).get("id"),
        "last_result": (run or {}).get("result", "no_new_batches"),
        "message": message,
        "published_total_by_run": {k: r.get("published", 0) for k, r in sorted(runs.items())},
        "published_total": sum(r.get("published", 0) for r in runs.values()),
        "visible_after": last_visible,
        "staged_held": len(state["held"]),
        "staged_held_by_run": {k: r.get("held", 0) for k, r in sorted(runs.items())},
        "refused_by_reason": refused,
        "last_run_refused_by_reason": (run or {}).get("refused") or {},
        "batches_waiting": waiting(pipe, state),
        "last_error": error,
        "evidence_corrected_total": sum(r.get("evidence_corrected", 0) for r in runs.values()),
        "corpus_unique_not_live": next((r["corpus"].get("unique_not_live") for _, r in
                                        sorted(runs.items(), key=lambda x: x[1].get("at") or "", reverse=True)
                                        if isinstance(r.get("corpus"), dict) and "unique_not_live" in r["corpus"]),
                                       None),
    }
    path = Path(pipe) / STATUS
    with FileLock(path):
        atomic_write_json(path, status)
    return status


def record_manual_run(pipe: Path, name: str, published: int, visible_after: int | None, at: str,
                      held_file: Path | None = None) -> dict:
    """Enter a run done by hand into the ledger, from its stage/precheck.json,
    stage/stage-preview.json and the held list (a JSON list of stable ids)."""
    pipe = Path(pipe)
    run_dir = pipe / name
    pre = load_json(run_dir / "stage" / "precheck.json")
    preview = load_json(run_dir / "stage" / "stage-preview.json")
    held_ids = set(load_json(held_file)) if held_file else set()
    batch_of = {r["stable_question_id"]: r.get("kimport_batch") for r in preview["rows"]}
    if not held_ids <= set(batch_of):
        raise ValueError("a held id is not in the run's stage preview")
    staged = len(pre.get("staged_ids", []))
    if staged - len(held_ids) != published:
        raise ValueError(f"{staged} staged minus {len(held_ids)} held is not {published} published")
    state = read_state(pipe)
    refused_rows: dict[str, int] = {}
    for r in pre.get("refused", []):
        refused_rows[r["batch"]] = refused_rows.get(r["batch"], 0) + 1
    folders = []
    for batch, b in pre["batches"].items():
        held = sum(1 for i in held_ids if batch_of[i] == batch)
        state["batches"][b["folder"]] = {
            "run": name, "status": "published" if b["staged"] > held else ("held" if held else "refused"),
            "rows": b["rows"], "staged": b["staged"], "published": b["staged"] - held, "held": held,
            "refused": refused_rows.get(batch, 0), "at": at}
        folders.append(b["folder"])
    for rb in pre.get("refused_batches", []):
        state["batches"][rb["folder"]] = {"run": name, "status": "refused", "rows": None, "staged": 0,
                                          "published": 0, "held": 0, "refused": None, "at": at,
                                          "reason": rb["reason"]}
        folders.append(rb["folder"])
    for i in sorted(held_ids):
        state["held"].setdefault(i, {"run": name, "batch": batch_of[i],
                                     "reason": "no skill review record in the evidence (held at seal)"})
    state["runs"][name] = {"at": at, "result": "published", "manual": True, "published": published,
                           "held": len(held_ids), "fixed": 0,
                           "refused": refused_by_reason(pre.get("refused", []), pre.get("refused_batches", [])),
                           "visible_after": visible_after, "batches": sorted(folders)}
    write_state(pipe, state)
    from kimport import lane
    lane_path = pipe / "lane.json"
    blocked = lane._read_lane(lane_path)["items"]
    lane.add_open(lane_path, {i: ("classification_review", f"held at seal in {name}: no skill review record "
                                  "in the evidence") for i in sorted(held_ids) if i not in blocked}, at, "seal")
    released = lane.release_ids(lane.claims_path_for(lane_path), published_stable_ids(run_dir, held_ids))
    return {"batches": len(folders), "held": len(held_ids), "published": published, "released": len(released)}


def published_stable_ids(run_dir: Path, held_ids: set) -> list[str]:
    pre = json.loads((Path(run_dir) / "stage" / "precheck.json").read_text(encoding="utf-8"))
    return [i for i in pre.get("staged_ids", []) if i not in held_ids]
