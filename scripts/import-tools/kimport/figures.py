"""Figure lane work queue: `k figures slice | submit | no-figure | rework | status`.

`pipeline/figures/<occurrence id>/` holds one figure question:
  original.png  the source question crop (copied from its B question package)
  figure.json   the figure fields as the quiz engine reads them, plus the stem,
                choices and answer so the review page renders the whole question
  status.json   {occurrence_id, status, round, claimed_by, submitted_file_sha256,
                 approved_file_sha256, history: [{at, decision, note, by}]}
  figure.svg    the engine's render of figure_spec, written by submit (choice-<letter>.svg for
                each choice_figure_spec), for the snapshot

A new figure is a FigureSpec (`figure_spec`, or `choice_figure_spec` on each answer choice) with
`transcribed_labels` beside it: every text printed in the original figure. `submit` runs the
figure engine's checks on it (scripts/figures/check-spec.ts in FIGURE_ENGINE_DIR, which samples
every function first) and refuses it on any issue, so it goes back to its reviewer and never
reaches the founder; it then stores the sampled spec in figure.json. Hand-written `figure_svg`
is refused.

Statuses: drafting (a reviewer has it) -> ready_for_founder (submitted) ->
approved | rejected (the founder, in /dev/figure-review). A rejected item goes
back to its reviewer through `rework`; submitting it again opens round + 1.
A question whose original.png shows no figure (a false figure flag) is set to
no_figure by `no-figure`: the claim is released and the id, with the copies of
its figure group, is appended to no-figure.json, which sends it back to the text
lane (figure_gate.is_figure_question).
A folder is the claim: slice never hands out an id (or another copy in the same
figure_review group) that already has a folder, whatever its status.

The review page writes status.json too (atomically, after checking the file did
not change under it); here every read-modify-write holds a FileLock.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from . import figure_gate as fg
from .jsonio import FileLock, atomic_write_json, load_json

B_ROOT = Path("/Users/zakariabennis/Documents/Codex/2026-10-05/task-3/agent-b-output/revisions")
SLICE_SIZE = 10
FIGURE_STATUS = "figure_review"  # clusters.json status of a group grouped by text only, with a figure


REPO = Path(__file__).resolve().parents[3]
PIPELINE_FIGURES = Path("/Users/zakariabennis/Documents/Codex/2026-10-11/task-3/pipeline/figures")
CHECK_TS = REPO / "scripts/import-tools/ts/check-figure.ts"
# The figure engine is not on main yet (2026-10-31 ruling): its checker runs from the engine
# worktree, or FIGURE_ENGINE_DIR. Drop this once the engine merges.
DEFAULT_ENGINE_DIR = Path("/Users/zakariabennis/Karman-Prep/.claude/worktrees/figure-engine-spec")
CHECK_SPEC = "scripts/figures/check-spec.ts"
SVG_FILE = "figure.svg"


def engine_dir() -> Path:
    return Path(os.environ.get("FIGURE_ENGINE_DIR") or DEFAULT_ENGINE_DIR)


def spec_check(figure_file: Path) -> dict:
    """Run the engine's checks (check-spec.ts) on a FigureSpec figure.json: {ok, issues, svg, spec,
    choices}, with every function sampled. Raises ValueError when they cannot run or cannot read
    the spec."""
    try:
        r = subprocess.run(["npx", "--no-install", "tsx", CHECK_SPEC, str(Path(figure_file).resolve())],
                           cwd=engine_dir(), capture_output=True, text=True, timeout=180)
        out = json.loads(r.stdout.strip().splitlines()[-1])
    except (OSError, subprocess.TimeoutExpired, ValueError, IndexError) as e:
        raise ValueError(f"figure checks could not run in {engine_dir()}: {e}") from None
    tail = (r.stderr or r.stdout).strip()[-300:]
    if not isinstance(out, dict):
        raise ValueError(f"figure checks gave no result object: {tail}")
    if r.returncode == 2 and out.get("errors"):
        raise ValueError("the figure spec cannot be checked:\n  - " + "\n  - ".join(map(str, out["errors"])))
    ok = out.get("ok")
    # exit 0 exactly when every spec passes, 1 when any has issues; a pass carries the sampled specs
    if not isinstance(ok, bool) or r.returncode != (0 if ok else 1):
        raise ValueError(f"figure checks failed (exit {r.returncode}, ok={ok!r}): {tail}")
    if ok and ("spec" not in out or not isinstance(out.get("choices"), list)
               or any(not isinstance(c, dict) or "spec" not in c for c in out["choices"])):
        raise ValueError("figure checks passed but returned no sampled spec to store")
    return out


def _issue_lines(result: dict) -> list[str]:
    def line(prefix, i):
        part = f" {i['partId']}" if i.get("partId") else ""
        return f"{prefix}{i.get('code')}{part}: {i.get('detail')}"
    lines = [line("", i) for i in result.get("issues") or []]
    for c in result.get("choices") or []:
        lines += [line(f"choice {c.get('letter')}: ", i) for i in c.get("issues") or []]
    return lines


def _store_checked(folder: Path, doc: dict, result: dict) -> None:
    """figure.json with the sampled specs check-spec.ts returned, then their renders beside it.
    Renders go to temp files first and replace the old ones only after figure.json is written;
    renders from an earlier submit that are not rewritten are removed last. A crash never leaves
    renders newer than figure.json."""
    renders: dict[str, str] = {}
    if doc.get("figure_spec") not in fg._EMPTY:
        doc["figure_spec"] = result["spec"]
        if result.get("svg"):
            renders[SVG_FILE] = result["svg"]
    by_letter = {c.get("letter"): c for c in result.get("choices") or []}
    for c in doc.get("answer_choices") or []:
        got = by_letter.get(c.get("letter")) if isinstance(c, dict) else None
        if got is None:
            continue
        c["choice_figure_spec"] = got["spec"]
        if got.get("svg"):
            renders[f"choice-{c['letter']}.svg"] = got["svg"]
    temps = {}
    try:
        for name, svg in renders.items():
            fd, tmp = tempfile.mkstemp(prefix=name + ".", suffix=".tmp", dir=folder)
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(svg)
            temps[name] = tmp
        atomic_write_json(folder / fg.FIGURE_FILE, doc)
        for name, tmp in temps.items():
            os.replace(tmp, folder / name)
    finally:
        for tmp in temps.values():
            Path(tmp).unlink(missing_ok=True)
    for stale in [folder / SVG_FILE, *folder.glob("choice-*.svg")]:
        if stale.name not in renders:
            stale.unlink(missing_ok=True)


def render_errors(figure_file: Path) -> list[str]:
    """Run the app's own renderers' checks (ts/check-figure.ts) on a figure.json: geometry
    buildGeometrySvg rejects, SVG failing svg-figure-check, table/chart data the renderer
    cannot draw. [] means it draws; otherwise the renderer's messages."""
    try:
        r = subprocess.run(["npx", "--no-install", "tsx", str(CHECK_TS), str(figure_file)],
                           cwd=REPO, capture_output=True, text=True, timeout=120)
        out = json.loads(r.stdout.strip().splitlines()[-1])
    except (OSError, subprocess.TimeoutExpired, ValueError, IndexError) as e:
        raise ValueError(f"renderability check could not run: {e}") from None
    if r.returncode != 0:
        raise ValueError(f"renderability check failed: {r.stderr.strip()[-300:]}")
    return [] if out.get("ok") else [str(x) for x in out.get("errors", [])]


def _folders(figures_dir: Path):
    figures_dir = Path(figures_dir)
    if not figures_dir.is_dir():
        return
    for d in sorted(figures_dir.iterdir()):
        if d.is_dir() and fg.ID.fullmatch(d.name):
            yield d


def _write_status(folder: Path, status: dict) -> None:
    atomic_write_json(Path(folder) / fg.STATUS_FILE, status)


def _event(now: str, decision: str, by: str, note: str = "") -> dict:
    return {"at": now, "decision": decision, "note": note, "by": by}


# ---------------------------------------------------------------- slice


def _skeleton(occ_id: str) -> dict:
    return {"schema": fg.SCHEMA, "occurrence_id": occ_id, "figure_kind": None, "figure_table_data": None,
            "figure_chart_data": None, "figure_geometry_data": None, "figure_svg": None, "image_alt": None,
            "subject": None, "topic_cluster": None, "passage_intro": None, "passage": None,
            "question_text": "", "answer_format": "multiple_choice",
            "answer_choices": [{"letter": letter, "choice_text": "", "choice_table_data": None}
                               for letter in "ABCD"],
            "correct_answer": None, "notes": ""}


def find_original(entry: dict, b_root: Path, new_exam_packages: Path) -> Path | None:
    """The question's source crop: its B package original.png (readiness ledger, or a new-exam
    package), else the new-exam crop; only a file whose sha256 is the ledger's A_png_sha256."""
    occ, exam, ver, cat = entry.get("id"), entry.get("exam"), entry.get("B_output_version"), entry.get("B_category")
    paths = []
    if exam and ver and cat:
        paths += [Path(b_root) / exam / ver / cat / occ / fg.ORIGINAL_FILE,
                  Path(new_exam_packages) / exam / ver / cat / occ / fg.ORIGINAL_FILE]
    crop = (entry.get("new_exam_record") or {}).get("crop_png")
    if crop:
        paths.append(Path(crop))
    want = entry.get("A_png_sha256")
    for p in paths:
        if p.is_file() and (not want or fg.file_sha256(p) == want):
            return p
    return None


def candidates(clusters_path: Path, lane_path: Path, ledger: dict,
               no_figure=frozenset()) -> list[tuple[str, list[str]]]:
    """(representative id, every id in its group) for each figure question still to build:
    one copy per not-live figure_review group (printed key first, then fewest holds, then
    source order), plus open needs_figure lane items outside those groups. Copies that are
    live, ruled out, open / parked in the lane for another reason, or in no-figure.json
    (`no_figure`) are never picked."""
    from .lane import _is_live, _read_lane, _ruled_out, live_ids, parse_id
    doc = load_json(clusters_path)
    items = _read_lane(lane_path)["items"]
    live = live_ids(lane_path)
    other_hold = {i for i, it in items.items() if it.get("status") in ("open", "parked")
                  and it.get("reason") != "needs_figure"}

    def ok(occ):
        e = ledger.get(occ)
        return (e is not None and not _is_live(e) and not _ruled_out(e) and occ not in live and occ not in other_hold
                and fg.is_figure_question(occ, True, no_figure))

    out, seen = [], set()
    for c in doc.get("clusters", []):
        if c.get("status") != FIGURE_STATUS or c.get("is_live"):
            continue
        ids = [m["id"] for m in c.get("members", [])]
        seen.update(ids)
        good = [m for m in c.get("members", []) if ok(m["id"])]
        if good:
            best = min(good, key=lambda m: (not m.get("printed_key"), int(m.get("holds") or 0), parse_id(m["id"])))
            out.append((best["id"], ids))
    for occ, it in items.items():
        if it.get("reason") == "needs_figure" and it.get("status") == "open" and occ not in seen and ok(occ):
            out.append((occ, [occ]))
    out.sort(key=lambda x: parse_id(x[0]))
    return out


def next_slice(figures_dir: Path, clusters_path: Path, lane_path: Path, ledger_path: Path, reviewer: str,
               now: str, size: int = SLICE_SIZE, extra_ledgers=None, b_root: Path = B_ROOT,
               prefix: str | None = None) -> list[dict]:
    """Hand `reviewer` up to `size` figure questions: make each folder with original.png, a
    figure.json skeleton and status drafting. Returns [{id, folder, original}] (original None
    when no source crop with the ledger's hash was found)."""
    from .corpus_load import ledger_entries
    from .lane import _extra_ledgers
    if size < 1:
        raise ValueError("size must be at least 1")
    if not reviewer or not fg.ID.fullmatch(reviewer):
        raise ValueError("--reviewer must be a short name (letters, digits, dashes, underscores)")
    figures_dir = Path(figures_dir)
    figures_dir.mkdir(parents=True, exist_ok=True)
    ledger = ledger_entries(ledger_path, _extra_ledgers(extra_ledgers, Path(clusters_path).parent))
    packages = Path(lane_path).parent / "new-exams" / "packages"
    picked = []
    with FileLock(figures_dir / "queue"):
        taken = {d.name for d in _folders(figures_dir)}
        for occ, group in candidates(clusters_path, lane_path, ledger, fg.no_figure_ids(figures_dir)):
            if len(picked) >= size:
                break
            if not fg.ID.fullmatch(occ) or taken.intersection(group):
                continue
            if prefix and not occ.startswith(prefix):  # e.g. one exam form: --prefix 2026-10_US_V1
                continue
            folder = figures_dir / occ
            folder.mkdir()
            src = find_original(ledger[occ], b_root, packages)
            if src is not None:
                shutil.copyfile(src, folder / fg.ORIGINAL_FILE)
            atomic_write_json(folder / fg.FIGURE_FILE, _skeleton(occ))
            _write_status(folder, {"occurrence_id": occ, "status": "drafting", "round": 1, "claimed_by": reviewer,
                                   "group": group, "original_source": str(src) if src else None,
                                   "original_sha256": fg.file_sha256(folder / fg.ORIGINAL_FILE) if src else None,
                                   "submitted_file_sha256": None, "approved_file_sha256": None,
                                   "history": [_event(now, "sliced", reviewer,
                                                      "" if src else "no source crop found: add original.png")]})
            taken.update(group)
            picked.append({"id": occ, "folder": str(folder), "original": str(src) if src else None})
    return picked


# ---------------------------------------------------------------- submit, rework, status


def submit(figures_dir: Path, occ_id: str, by: str, now: str) -> dict:
    """Check figure.json renders in the quiz to the pilot standard, then set ready_for_founder.
    A rejected item comes back as round + 1. Raises ValueError listing every problem."""
    folder = Path(figures_dir) / fg.check_id(occ_id)
    status_path = folder / fg.STATUS_FILE
    if not status_path.is_file():
        raise ValueError(f"{occ_id} is not in the figure queue (no {status_path}); take it with k figures slice")
    with FileLock(status_path):
        status = load_json(status_path)
        state = status.get("status")
        if state == "approved":
            raise ValueError(f"{occ_id} is already approved; an approved figure is not changed")
        if state == fg.NO_FIGURE:
            raise ValueError(f"{occ_id} was marked no_figure (no figure in original.png); it is in the text lane")
        if state not in ("drafting", "rejected", "ready_for_founder"):
            raise ValueError(f"{occ_id} has an unknown status {state!r}")
        if not (folder / fg.ORIGINAL_FILE).is_file():
            raise ValueError(f"{occ_id}: no original.png; the founder compares against it, so add the source crop")
        try:
            doc = load_json(folder / fg.FIGURE_FILE)
        except (OSError, ValueError) as e:
            raise ValueError(f"{occ_id}: cannot read figure.json: {e}") from None
        if isinstance(doc, dict) and doc.get("figure_svg") not in fg._EMPTY:
            raise ValueError(f"{occ_id}: figure.json carries figure_svg; hand-written SVG is not accepted for new "
                             "figures: write the figure as a FigureSpec (figure_spec) with transcribed_labels")
        problems = fg.validate_figure(doc, occ_id)
        if problems:
            raise ValueError(f"{occ_id}: figure.json is not ready:\n  - " + "\n  - ".join(problems))
        result = None
        if fg.has_figure_spec(doc):
            try:
                result = spec_check(folder / fg.FIGURE_FILE)
            except ValueError as e:
                raise ValueError(f"{occ_id}: {e}") from None
            issues = _issue_lines(result)
            if issues or not result.get("ok"):
                raise ValueError(f"{occ_id}: the figure checks found problems; fix them and submit again:\n  - "
                                 + "\n  - ".join(issues or ["the checks did not pass"]))
        if doc.get("figure_spec") in fg._EMPTY:  # the question's own figure (or table choices), as before
            drawn = render_errors(folder / fg.FIGURE_FILE)
            if drawn:
                raise ValueError(f"{occ_id}: the quiz renderer cannot draw this figure (it would show blank):\n  - "
                                 + "\n  - ".join(drawn))
        if result is not None:
            _store_checked(folder, doc, result)
        if state == "rejected":
            status["round"] = int(status.get("round") or 1) + 1
        status.update({"status": "ready_for_founder", "submitted_file_sha256": fg.file_sha256(folder / fg.FIGURE_FILE),
                       "submitted_at": now, "approved_file_sha256": None})
        status["history"] = list(status.get("history", [])) + [
            _event(now, "submitted", by, str(doc.get("notes") or ""))]
        _write_status(folder, status)
        return status


def return_unrenderable(figures_dir: Path, now: str, by: str = "coordinator") -> list[dict]:
    """Sweep: every ready_for_founder figure the renderers cannot draw goes back to drafting
    (history: returned, "renders blank: <error>") so rework picks it up. Returns [{id, error}]."""
    out = []
    for d in _folders(figures_dir):
        status_path = d / fg.STATUS_FILE
        s = fg.read_status(d)
        if not s or s.get("status") != "ready_for_founder":
            continue
        errs = render_errors(d / fg.FIGURE_FILE)
        if not errs:
            continue
        with FileLock(status_path):
            s = load_json(status_path)
            if s.get("status") != "ready_for_founder":
                continue
            note = "renders blank: " + "; ".join(errs)
            s.update({"status": "drafting", "submitted_file_sha256": None, "approved_file_sha256": None})
            s["history"] = list(s.get("history", [])) + [_event(now, "returned", by, note)]
            _write_status(d, s)
        out.append({"id": d.name, "error": note})
    return out


def no_figure(figures_dir: Path, occ_id: str, reviewer: str, note: str, now: str) -> dict:
    """The reviewer found no figure in original.png: status no_figure (with a history entry),
    the claim released, and the id plus the copies of its figure group appended to
    no-figure.json. An approved figure is never changed. Returns the no-figure.json entry."""
    folder = Path(figures_dir) / fg.check_id(occ_id)
    status_path = folder / fg.STATUS_FILE
    if not reviewer or not fg.ID.fullmatch(reviewer):
        raise ValueError("--reviewer must be a short name (letters, digits, dashes, underscores)")
    if not isinstance(note, str) or not note.strip():
        raise ValueError("--note must say what original.png shows (e.g. 'text, an equation and four choices')")
    if not status_path.is_file():
        raise ValueError(f"{occ_id} is not in the figure queue (no {status_path})")
    with FileLock(status_path):
        status = load_json(status_path)
        state = status.get("status")
        if state == fg.NO_FIGURE:
            raise ValueError(f"{occ_id} is already marked no_figure")
        if state == "approved":
            raise ValueError(f"{occ_id} has an approved figure; the founder approved it, so it is not changed here")
        if state not in fg.STATUSES:
            raise ValueError(f"{occ_id} has an unknown status {state!r}")
        entry = {"id": occ_id, "covers": sorted(set(status.get("group") or ()) - {occ_id}), "by": reviewer,
                 "at": now, "note": note.strip()}
        nf_path = fg.no_figure_path(figures_dir)
        with FileLock(nf_path):
            doc = fg.read_no_figure(figures_dir)
            doc["items"] = [it for it in doc["items"] if it.get("id") != occ_id] + [entry]
            atomic_write_json(nf_path, doc)
        status.update({"status": fg.NO_FIGURE, "claimed_by": None, "released_by": status.get("claimed_by"),
                       "submitted_file_sha256": None, "approved_file_sha256": None})
        status["history"] = list(status.get("history", [])) + [_event(now, fg.NO_FIGURE, reviewer, note.strip())]
        _write_status(folder, status)
        return entry


def last_note(status: dict, decision: str = "rejected") -> str:
    for h in reversed(status.get("history", [])):
        if h.get("decision") == decision:
            return h.get("note") or ""
    return ""


def rework(figures_dir: Path, reviewer: str | None = None) -> list[dict]:
    """Rejected figures (and ones returned for rendering blank) with the note, oldest rejection first (optionally one reviewer's)."""
    out = []
    for d in _folders(figures_dir):
        s = fg.read_status(d)
        if not s or (reviewer and s.get("claimed_by") != reviewer):
            continue
        hist = s.get("history", [])
        # rejected by the founder, or returned by the coordinator's renderability sweep
        decision = ("rejected" if s.get("status") == "rejected"
                    else "returned" if s.get("status") == "drafting" and hist and hist[-1].get("decision") == "returned"
                    else None)
        if not decision:
            continue
        at = next((h.get("at") for h in reversed(hist) if h.get("decision") == decision), "")
        out.append({"id": d.name, "round": s.get("round"), "claimed_by": s.get("claimed_by"), "rejected_at": at,
                    "note": last_note(s, decision), "folder": str(d)})
    return sorted(out, key=lambda x: (x["rejected_at"] or "", x["id"]))


def summary(figures_dir: Path) -> dict:
    counts = {s: 0 for s in fg.STATUSES}
    drafting: dict[str, int] = {}
    for d in _folders(figures_dir):
        s = fg.read_status(d) or {}
        state = s.get("status")
        counts[state] = counts.get(state, 0) + 1
        if state == "drafting":
            drafting[s.get("claimed_by") or "?"] = drafting.get(s.get("claimed_by") or "?", 0) + 1
    return {"counts": counts, "drafting_by_reviewer": drafting, "total": sum(counts.values())}


def snapshot(figures_dir: Path, out_dir: Path, status: str = "ready_for_founder", limit: int | None = None,
             base_url: str = "http://127.0.0.1:3107") -> dict:
    """One composite JPEG per figure with this status (original.png left, the real quiz render right) for a
    hosted review page, plus manifest.json. Resumable: a file already there for the same round is kept.
    Rendering is done by figure-snapshot.mjs against the dev server's /dev/figure-review/render route."""
    out_dir.mkdir(parents=True, exist_ok=True)
    items, jobs, skipped = [], [], []
    for d in _folders(figures_dir):
        s = fg.read_status(d) or {}
        if s.get("status") != status:
            continue
        if limit is not None and len(items) >= limit:
            break
        rnd = s.get("round") or 1
        try:
            fig = json.loads((d / "figure.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            fig = {}
        entry = {"id": d.name, "round": rnd, "file": f"{d.name}.r{rnd}.jpg",
                 "prev_note": last_note(s) if rnd > 1 else "",
                 "kind": fig.get("figure_kind"), "subject": fig.get("subject")}
        items.append(entry)
        if not (d / "original.png").is_file():
            skipped.append({"id": d.name, "error": "no original.png"})
        elif not (out_dir / entry["file"]).is_file():
            jobs.append({"id": d.name, "original": str(d / "original.png"), "out": str(out_dir / entry["file"])})
    failed = list(skipped)
    clipped: dict[str, bool] = {}
    if jobs:
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(jobs, f)
        script = Path(__file__).resolve().parent.parent / "figure-snapshot.mjs"
        proc = subprocess.Popen(["node", str(script), f.name, base_url], stdout=subprocess.PIPE, text=True,
                                cwd=str(script.parent.parent.parent))
        done = 0
        for line in proc.stdout:
            try:
                r = json.loads(line)
            except ValueError:
                continue
            done += 1
            if not r.get("ok"):
                failed.append({"id": r["id"], "error": r.get("error")})
            else:
                clipped[r["id"]] = bool(r.get("clipped"))
            if done % 50 == 0:
                print(f"figures snapshot: {done}/{len(jobs)}", file=sys.stderr, flush=True)
        proc.wait()
    bad = {x["id"] for x in failed}
    kept = [e for e in items if e["id"] not in bad and (out_dir / e["file"]).is_file()]
    # clipped: the plain 800px quiz frame would have cut part of this render off (kept from an earlier
    # run's manifest for files that were not re-rendered now).
    try:
        before = {e["file"]: e.get("clipped") for e in json.loads((out_dir / "manifest.json").read_text("utf-8"))}
    except (OSError, ValueError, TypeError, KeyError):
        before = {}
    for e in kept:
        e["clipped"] = clipped.get(e["id"], before.get(e["file"]))
    atomic_write_json(out_dir / "manifest.json", kept)
    return {"produced": len(kept), "rendered_now": len(jobs) - len([f for f in failed if f not in skipped]),
            "clipped": sorted(i for i, c in clipped.items() if c), "failed": failed}
