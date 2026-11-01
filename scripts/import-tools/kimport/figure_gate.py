"""Figure lane: the figure.json contract and the publishing gate.

Every figure question (a table, chart, geometry figure, reviewed SVG or table
choices) is rebuilt by a reviewer in `pipeline/figures/<occurrence id>/figure.json`
and checked by the founder in /dev/figure-review, which writes his decision to
`status.json` beside it. A figure question may be staged or published only when:

- its status.json says `approved`,
- figure.json is byte for byte the file he approved (`approved_file_sha256`), and
- the row about to be written carries exactly the figure fields of figure.json
  (compared through one canonical form, so an absent field equals null).

The checked-spec route (founder-authorized 2026-11-01) stands in for his approval of a figure
drawn by the figure engine. His words: "All the figures should be updated to this new model...
All the figure questions should have these new updated figures, and everything should now be
uploaded to the live question bank." He does not review each figure; one may go live only if
(a) every automatic engine check passes with no issues (scripts/figures/check-spec.ts, run
again by this gate), (b) an independent visual comparison against original.png recorded the
verdict "match" (visual-verdict.json beside figure.json, bound to the exact specs and to the
original's bytes), and (c) the answer certification and lint gates pass, unchanged. So a
figure.json whose every figure is a FigureSpec (figure_spec, choice_figure_spec), submitted
(status ready_for_founder, the file he would have seen), passes when (a) and (b) hold;
`spec_route_problems` says why not. The founder's own approval (status approved, the
approved bytes) works exactly as before, for every kind of figure.

`gate_reasons` is the one check stage, bulk stage and publish all call.
Questions without a figure pass untouched. Nothing here edits a file.

A reviewer who finds no figure in original.png runs `k figures no-figure`; the
id (with the copies of its figure group) goes into `pipeline/figures/no-figure.json`,
the single record of those findings. `is_figure_question` is the one rule every
consumer (corpus, lint, this gate) applies: a flagged occurrence is a figure
question unless that file lists it. Such an id goes back to the text lane: it
clusters by text, is sliced to reviewers and needs no figure approval (a row
that still carries figure fields is refused).
"""

import hashlib
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

from .jsonio import load_json

SCHEMA = "karman-figure-v1"
NO_FIGURE = "no_figure"  # status.json status: the reviewer found no figure in original.png
STATUSES = ("drafting", "ready_for_founder", "approved", "rejected", NO_FIGURE)
KINDS = ("table", "chart", "geometric", "image")
FIGURE_FILE, STATUS_FILE, ORIGINAL_FILE = "figure.json", "status.json", "original.png"
NO_FIGURE_FILE = "no-figure.json"  # in pipeline/figures: every id found to have no figure
NO_FIGURE_SCHEMA = "kimport-no-figure-v1"
# The figure columns compared by the gate, as the quiz engine reads them.
FIELDS = ("figure_kind", "figure_table_data", "figure_chart_data", "figure_geometry_data", "figure_svg", "image_alt",
          "figure_spec")
# The older figure fields: a figure.json carrying any of them is not drawn by specs alone.
LEGACY_FIELDS = ("figure_table_data", "figure_chart_data", "figure_geometry_data", "figure_svg", "choice_tables")
VERDICT_FILE = "visual-verdict.json"  # the independent visual comparison of the figure with original.png
VERDICT_SCHEMA = "karman-figure-visual-verdict-v1"
MATCH = "match"
GATE = "figure gate: "  # prefix of every gate refusal (autopilot buckets them as figure_gate)
ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$")
CHART_KINDS = ("scatterplot", "line_graph", "bar_chart", "function_plot", "boxplot", "pie")
SVG_THEME = "karman-v1"
FIGURE_FONT = "STIX Two Text"
_EMPTY = (None, "", [], {})


def figures_dir_for(pipe: Path) -> Path:
    return Path(pipe) / "figures"


def figures_dir_for_batch(batch_dir: Path) -> Path:
    """<pipeline>/figures for a batch at <pipeline>/batches/<name>; figures/ beside a folder elsewhere."""
    parent = Path(batch_dir).resolve().parent
    return figures_dir_for(parent.parent if parent.name == "batches" else parent)


def no_figure_path(figures_dir: Path) -> Path:
    return Path(figures_dir) / NO_FIGURE_FILE


def read_no_figure(figures_dir: Path | None) -> dict:
    """no-figure.json ({schema, items: [{id, covers, by, at, note}]}); a missing file is empty,
    an unreadable one refuses (a figure question must never pass silently)."""
    path = no_figure_path(figures_dir) if figures_dir is not None else None
    if path is None or not path.exists():
        return {"schema": NO_FIGURE_SCHEMA, "items": []}
    try:
        doc = load_json(path)
        if doc.get("schema") != NO_FIGURE_SCHEMA or not isinstance(doc.get("items"), list):
            raise TypeError
    except (ValueError, TypeError, AttributeError) as e:
        raise ValueError(f"{path} is not readable no-figure JSON") from e
    return doc


def no_figure_ids(figures_dir: Path | None) -> frozenset[str]:
    """Every id a reviewer found to have no figure, with the copies of its figure group."""
    out = set()
    for it in read_no_figure(figures_dir)["items"]:
        out.add(it["id"])
        out.update(it.get("covers") or ())
    return frozenset(out)


def approved_ids(figures_dir: Path | None) -> frozenset[str]:
    """Ids whose status.json says approved (the founder approved the figure; the gate still checks the bytes)."""
    if figures_dir is None or not Path(figures_dir).is_dir():
        return frozenset()
    out = set()
    for st in Path(figures_dir).glob(f"*/{STATUS_FILE}"):
        try:
            if json.loads(st.read_text(encoding="utf-8")).get("status") == "approved":
                out.add(st.parent.name)
        except (OSError, ValueError):
            continue
    return frozenset(out)


def is_figure_question(occ_id: str, flag, no_figure) -> bool:
    """The one rule for "is this occurrence a figure question": something flags it (a visual
    word or phrase in its text, a CF or ledger visual hold, a re-read, figure fields) and no
    reviewer has recorded in no-figure.json that its original.png shows no figure."""
    return bool(flag) and occ_id not in no_figure


def check_id(occ_id: str) -> str:
    if not isinstance(occ_id, str) or not ID.fullmatch(occ_id):
        raise ValueError(f"{occ_id!r} is not an occurrence id")
    return occ_id


def file_sha256(path: Path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


# ---------------------------------------------------------------- canonical figure fields


def _clean(v):
    """Drop null / empty members recursively, so an absent key equals null."""
    if isinstance(v, dict):
        out = {k: _clean(x) for k, x in v.items()}
        return {k: x for k, x in out.items() if x not in _EMPTY} or None
    if isinstance(v, list):
        return [_clean(x) for x in v] or None
    return None if v == "" else v


def _choice_tables(row: dict) -> dict | None:
    """{letter: table} from a reviewed row (choice_tables), a staged or readback row
    (choices[].choice_table_data) or figure.json (answer_choices[].choice_table_data)."""
    out = {}
    tables = row.get("choice_tables")
    if isinstance(tables, dict):
        out.update({k: v for k, v in tables.items() if v not in _EMPTY})
    for key in ("choices", "answer_choices"):
        for c in row.get(key) or ():
            if isinstance(c, dict) and c.get("choice_table_data") not in _EMPTY:
                out[c.get("letter")] = c["choice_table_data"]
    return _clean(out)


def choice_specs(row: dict) -> dict:
    """{letter: FigureSpec} from a reviewed row (choice_figure_specs), a staged or readback row
    (choices[].choice_figure_spec) or figure.json (answer_choices[].choice_figure_spec)."""
    out = {}
    specs = row.get("choice_figure_specs")
    if isinstance(specs, dict):
        out.update({k: v for k, v in specs.items() if v not in _EMPTY})
    for key in ("choices", "answer_choices"):
        for c in row.get(key) or ():
            if isinstance(c, dict) and c.get("choice_figure_spec") not in _EMPTY:
                out[c.get("letter")] = c["choice_figure_spec"]
    return out


def figure_fields(row: dict) -> dict:
    """The canonical figure fields of any row shape: a reviewed batch row, a staged row
    ({question, choices}), a readback snapshot ({question, choices, keys}) or figure.json."""
    nested = isinstance(row.get("question"), dict)
    q = row["question"] if nested else row
    out = {f: _clean(q.get(f)) for f in FIELDS}
    flat = {**q, "choices": row.get("choices")} if nested else row
    out["choice_tables"] = _choice_tables(flat)
    out["choice_figure_specs"] = _clean(choice_specs(flat))
    if out["figure_kind"] is None and all(out[f] is None for f in out if f != "image_alt"):
        out["image_alt"] = None  # alt text without a figure is not a figure
    return out


def figure_sha256(fields: dict) -> str:
    blob = json.dumps(fields, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def has_figure(row: dict | None) -> bool:
    """True when a row shows the student a figure: a figure kind, figure data, an image
    (image_url / image_storage_path / figure_svg / graph data) or table choices."""
    if not row:
        return False
    q = row.get("question") if isinstance(row.get("question"), dict) else row
    if any(q.get(f) not in _EMPTY for f in ("image_url", "image_storage_path", "figure_graph_data")):
        return True
    fields = figure_fields(row)
    return any(v is not None for k, v in fields.items() if k != "image_alt")


# ---------------------------------------------------------------- figure.json validation


def _table_problems(t, where: str) -> list[str]:
    if not isinstance(t, dict) or not isinstance(t.get("rows"), list) or not t["rows"]:
        return [f"{where}: needs rows (a list of rows of cell strings)"]
    out = []
    rows = t["rows"]
    if not all(isinstance(r, list) and all(isinstance(c, str) for c in r) for r in rows):
        out.append(f"{where}: every row must be a list of strings")
        return out
    width = len(t["header_row"]) if isinstance(t.get("header_row"), list) else len(rows[0])
    if t.get("header_row") is not None and not all(isinstance(c, str) for c in t.get("header_row") or [None]):
        out.append(f"{where}: header_row must be a list of strings")
    if any(len(r) != width for r in rows):
        out.append(f"{where}: every row needs {width} cells")
    groups = t.get("header_groups")
    if groups is not None:
        if not isinstance(groups, list) or not all(isinstance(g, dict) and isinstance(g.get("label"), str)
                                                   and isinstance(g.get("span"), int) and g["span"] > 0
                                                   for g in groups):
            out.append(f"{where}: header_groups must be [{{label, span}}]")
        elif sum(g["span"] for g in groups) != width:
            out.append(f"{where}: header_groups spans add up to {sum(g['span'] for g in groups)}, not {width}")
    return out


def _chart_problems(c) -> list[str]:
    if not isinstance(c, dict):
        return ["figure_chart_data must be an object"]
    out = []
    if c.get("kind") not in CHART_KINDS:
        out.append(f"figure_chart_data.kind must be one of {', '.join(CHART_KINDS)}")
    for axis in ("x_axis", "y_axis"):
        if not isinstance(c.get(axis), dict):
            out.append(f"figure_chart_data.{axis} is missing")
    if not isinstance(c.get("series"), list) or not c["series"]:
        out.append("figure_chart_data.series needs at least one series")
    elif not all(isinstance(s, dict) and s.get("kind") for s in c["series"]):
        out.append("figure_chart_data.series: every series needs a kind")
    return out


def _geometry_problems(g) -> list[str]:
    if not isinstance(g, dict):
        return ["figure_geometry_data must be an object"]
    out = []
    if g.get("layout_version") != "balanced-v1":
        out.append("figure_geometry_data.layout_version must be balanced-v1 (the approved label placement)")
    shapes = g.get("shapes")
    if not isinstance(shapes, list) or not shapes:
        out.append("figure_geometry_data.shapes needs at least one shape")
        return out
    for n, s in enumerate(shapes):
        pts = s.get("vertices_or_points") if isinstance(s, dict) else None
        if not isinstance(pts, list) or not pts or not all(
                isinstance(p, dict) and isinstance(p.get("x"), (int, float)) and isinstance(p.get("y"), (int, float))
                for p in pts):
            out.append(f"figure_geometry_data.shapes[{n}] needs vertices_or_points with numeric x and y")
    return out


# The inert SVG subset src/lib/figures/inline-svg.ts accepts (kept in step with it).
SVG_TAGS = {"svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan",
            "title", "desc", "metadata"}
SVG_ATTRS = {"xmlns", "width", "height", "viewBox", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry",
             "d", "points", "transform", "fill", "stroke", "stroke-width", "fill-opacity", "stroke-opacity",
             "opacity", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "fill-rule", "font-family",
             "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline", "paint-order", "id",
             "role", "aria-labelledby", "data-figure-role", "data-figure-theme"}
_SVG_NS = "{http://www.w3.org/2000/svg}"
_BAD_VALUE = re.compile(r"url\s*\(|javascript:|data:|https?:|[<>]", re.I)
_PAINT = re.compile(r"^(?:none|currentColor|#[\da-fA-F]{3,8}|var\(--figure-[a-z0-9-]+(?:,\s*#[\da-fA-F]{3,8})?\))$")


def svg_problems(svg) -> list[str]:
    """Problems that would stop the quiz from inlining the SVG, or break the pilot standard."""
    if not isinstance(svg, str) or not svg.lstrip().startswith("<svg"):
        return ["figure_svg must be SVG markup starting with <svg"]
    if len(svg) > 400_000:
        return ["figure_svg is over 400,000 characters (the quiz will not inline it)"]
    if re.search(r"<!DOCTYPE|<!ENTITY|<\?xml-stylesheet|<style|<script", svg, re.I):
        return ["figure_svg may not contain a DOCTYPE, ENTITY, style or script"]
    try:
        root = ET.fromstring(svg)
    except ET.ParseError as e:
        return [f"figure_svg does not parse: {e}"]
    out = []
    if root.tag != _SVG_NS + "svg":
        out.append('figure_svg root must be <svg xmlns="http://www.w3.org/2000/svg">')
    if root.get("data-figure-theme") != SVG_THEME:
        out.append(f'figure_svg root needs data-figure-theme="{SVG_THEME}" (the reviewed figure theme)')
    for el in root.iter():
        tag = el.tag.replace(_SVG_NS, "")
        if tag not in SVG_TAGS:
            out.append(f"figure_svg uses <{tag}>, which the quiz does not allow")
            continue
        for name, value in el.attrib.items():
            if name.startswith("{"):
                out.append(f"figure_svg <{tag}> has a namespaced attribute {name}")
            elif name not in SVG_ATTRS:
                out.append(f"figure_svg <{tag}> has attribute {name}, which the quiz does not allow")
            elif _BAD_VALUE.search(value):
                out.append(f"figure_svg <{tag}> {name} has a URL or markup in it")
            elif name in ("fill", "stroke") and not _PAINT.match(value):
                out.append(f"figure_svg <{tag}> {name}={value!r} is not a plain colour")
        if tag == "text" and FIGURE_FONT not in (el.get("font-family") or ""):
            out.append(f'figure_svg <text> needs font-family "{FIGURE_FONT}, Times New Roman, serif" (the figure serif)')
    return sorted(set(out))


def spec_sha256(figure_spec, choices: dict | None = None) -> str:
    """sha256 of the specs a visual verdict judged: the question's figure_spec (one FigureSpec or
    an ordered list) and each choice's choice_figure_spec, as canonical JSON."""
    blob = json.dumps({"figure_spec": figure_spec if figure_spec not in _EMPTY else None,
                       "choice_figure_specs": {k: v for k, v in sorted((choices or {}).items()) if v not in _EMPTY}},
                      ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def read_verdict(path: Path) -> dict | None:
    try:
        doc = load_json(Path(path))
    except (OSError, ValueError):
        return None
    return doc if isinstance(doc, dict) else None


def verdict_problems(verdict: dict | None, ids, figure_sha: str, original_sha: str | None = None) -> list[str]:
    """Why a visual verdict does not clear these specs ([] = it does). It must say "match", name
    the question (occurrence_id or stable_question_ids), and carry the sha256 of exactly these
    specs (spec_sha256) and of the original it was compared with (original_sha, when known)."""
    if verdict is None:
        return [f"no readable visual verdict ({VERDICT_FILE})"]
    out = []
    if verdict.get("schema") != VERDICT_SCHEMA:
        out.append(f"the visual verdict's schema is not {VERDICT_SCHEMA}")
    if verdict.get("verdict") != MATCH:
        out.append(f"the visual verdict is {verdict.get('verdict')!r}, not {MATCH!r}")
    named = {verdict.get("occurrence_id")} | set(verdict.get("stable_question_ids") or ())
    if not named & set(ids):
        out.append(f"the visual verdict names {sorted(x for x in named if x)}, not {sorted(ids)}")
    if verdict.get("figure_sha256") != figure_sha:
        out.append("the visual verdict judged other specs (figure_sha256 differs); compare the figure again")
    osha = verdict.get("original_sha256")
    if not isinstance(osha, str) or not re.fullmatch(r"[0-9a-f]{64}", osha):
        out.append("the visual verdict does not record the original's sha256")
    elif original_sha is not None and osha != original_sha:
        out.append("the visual verdict compared another original.png")
    if not all(isinstance(verdict.get(k), str) and verdict[k].strip() for k in ("reviewer", "at")):
        out.append("the visual verdict needs reviewer and at")
    return out


def has_figure_spec(doc: dict) -> bool:
    """figure.json draws with the figure engine: a figure_spec, or a choice_figure_spec on a choice."""
    return doc.get("figure_spec") not in _EMPTY or any(
        isinstance(c, dict) and c.get("choice_figure_spec") not in _EMPTY for c in doc.get("answer_choices") or ())


def _transcription_problems(holder: dict, what: str) -> list[str]:
    labels = holder.get("transcribed_labels")
    if isinstance(labels, list) and all(isinstance(t, str) for t in labels):
        return []
    return [f"{what} needs transcribed_labels: every text printed in the original figure, repeats included "
            "([] when it prints none)"]


def validate_figure(doc, occ_id: str) -> list[str]:
    """Every problem that keeps figure.json from rendering in the quiz as the pilot standard
    requires; an empty list means it can go to the founder."""
    if not isinstance(doc, dict):
        return ["figure.json must be a JSON object"]
    out = []
    if doc.get("schema") != SCHEMA:
        out.append(f"schema must be {SCHEMA}")
    if doc.get("occurrence_id") != occ_id:
        out.append(f"occurrence_id must be {occ_id}")
    kind = doc.get("figure_kind")
    wanted = {"table": "figure_table_data", "chart": "figure_chart_data", "geometric": "figure_geometry_data",
              "image": "figure_svg"}
    if doc.get("figure_spec") not in _EMPTY:
        # The engine draws it, and check-spec.ts (k figures submit) checks the spec itself.
        out += _transcription_problems(doc, "figure_spec")
        out += [f"{field} is set but figure_spec draws the figure"
                for field in wanted.values() if doc.get(field) not in _EMPTY]
    else:
        if kind not in KINDS and _choice_tables(doc) is None and not has_figure_spec(doc):
            out.append(f"figure_kind must be one of {', '.join(KINDS)} (or null with table or figure choices)")
        for k, field in wanted.items():
            if kind != k and doc.get(field) not in _EMPTY:
                out.append(f"{field} is set but figure_kind is {kind!r}")
        if kind == "table":
            out += _table_problems(doc.get("figure_table_data"), "figure_table_data")
        elif kind == "chart":
            out += _chart_problems(doc.get("figure_chart_data"))
        elif kind == "geometric":
            out += _geometry_problems(doc.get("figure_geometry_data"))
        elif kind == "image":
            out += svg_problems(doc.get("figure_svg"))
            if not isinstance(doc.get("image_alt"), str) or not doc["image_alt"].strip():
                out.append("image_alt (a short description of the figure) is required for an SVG figure")
    if not isinstance(doc.get("question_text"), str) or not doc["question_text"].strip():
        out.append("question_text is empty")
    if not isinstance(doc.get("subject"), str) or not doc["subject"]:
        out.append("subject is missing (math or reading)")
    fmt, choices, answer = doc.get("answer_format"), doc.get("answer_choices") or [], doc.get("correct_answer")
    if fmt == "multiple_choice":
        letters = [c.get("letter") for c in choices if isinstance(c, dict)]
        if letters != ["A", "B", "C", "D"]:
            out.append("answer_choices must be A, B, C, D in order")
        for c in choices:
            if not isinstance(c, dict):
                continue
            table = c.get("choice_table_data")
            if c.get("choice_figure_spec") not in _EMPTY:
                out += _transcription_problems(c, f"choice {c.get('letter')} choice_figure_spec")
                if table not in _EMPTY:
                    out.append(f"choice {c.get('letter')} has both choice_figure_spec and choice_table_data")
            elif table not in _EMPTY:
                out += _table_problems(table, f"choice {c.get('letter')} choice_table_data")
            elif not isinstance(c.get("choice_text"), str) or not c["choice_text"].strip():
                out.append(f"choice {c.get('letter')} has no text and no table")
        if answer not in ("A", "B", "C", "D"):
            out.append("correct_answer must be the letter A, B, C or D")
    elif fmt == "numeric_entry":
        if choices:
            out.append("a numeric_entry question has no answer_choices")
        if not isinstance(answer, str) or not answer.strip():
            out.append("correct_answer is empty")
    else:
        out.append("answer_format must be multiple_choice or numeric_entry")
    return out


# ---------------------------------------------------------------- the gate


def read_status(folder: Path) -> dict | None:
    try:
        return load_json(Path(folder) / STATUS_FILE)
    except (OSError, ValueError):
        return None


def _spec_route_files(folder: Path, occ_id: str, status: dict | None) -> tuple[dict | None, list[str]]:
    """(figure.json, problems) for the checked-spec route, without running the engine."""
    if status is None or status.get("status") != "ready_for_founder":
        return None, [f"status is {(status or {}).get('status')!r}, not a submitted figure (ready_for_founder)"]
    try:
        sha = file_sha256(folder / FIGURE_FILE)
        doc = load_json(folder / FIGURE_FILE)
    except (OSError, ValueError) as e:
        return None, [f"cannot read {folder / FIGURE_FILE}: {e}"]
    if sha != status.get("submitted_file_sha256"):
        return None, ["figure.json changed after it was submitted; submit it again"]
    out = validate_figure(doc, occ_id)
    if not has_figure_spec(doc):
        out.append("figure.json has no FigureSpec; only engine-drawn figures take this route")
    fields = figure_fields(doc)
    out += [f"figure.json still carries {f}; every figure must be a FigureSpec" for f in LEGACY_FIELDS if fields.get(f)]
    original = folder / ORIGINAL_FILE
    osha = file_sha256(original) if original.is_file() else None
    if osha is None:
        out.append("no original.png to compare with")
    elif status.get("original_sha256") and osha != status["original_sha256"]:
        out.append("original.png is not the source crop the queue recorded")
    if not out:
        out += verdict_problems(read_verdict(folder / VERDICT_FILE), {occ_id}, spec_sha256(
            doc.get("figure_spec"), choice_specs(doc)), osha)
    return doc, out


def spec_route_problems(folder: Path, occ_id: str, status: dict | None, checker=None) -> tuple[dict | None, list[str]]:
    """(figure.json, why it is not cleared) for the checked-spec route ([] = cleared): a submitted
    all-FigureSpec figure.json, a "match" visual verdict bound to its specs and original.png, and
    the engine's checks (check-spec.ts, `checker`, default kimport.figures.spec_check) passing
    again now with no issues."""
    doc, out = _spec_route_files(Path(folder), occ_id, status)
    if out:
        return doc, out
    if checker is None:
        from .figures import spec_check as checker
    try:
        result = checker(Path(folder) / FIGURE_FILE)
    except ValueError as e:
        return doc, [f"the engine checks could not run: {e}"]
    issues = list(result.get("issues") or []) + [i for c in result.get("choices") or [] for i in c.get("issues") or []]
    if result.get("ok") is not True or issues:
        return doc, [f"the engine checks found {len(issues) or 'unlisted'} issue(s)"]
    return doc, []


def publishable_ids(figures_dir: Path | None) -> frozenset[str]:
    """Ids whose figure may publish: approved by the founder, or cleared by the checked-spec
    route as far as files show (the gate also runs the engine checks again)."""
    out = set(approved_ids(figures_dir))
    if figures_dir is None or not Path(figures_dir).is_dir():
        return frozenset(out)
    for st in Path(figures_dir).glob(f"*/{VERDICT_FILE}"):
        folder = st.parent
        if ID.fullmatch(folder.name) and not _spec_route_files(folder, folder.name, read_status(folder))[1]:
            out.add(folder.name)
    return frozenset(out)


def gate_reasons(figures_dir: Path, occ_id: str, rows: dict, no_figure=None, spec_checker=None) -> list[str]:
    """Why `occ_id` may not be staged or published yet ([] = it may). `rows` maps a label
    ("the reviewed batch row", "the row the importer builds", "the private readback row") to
    that shape of the row about to be written; each must carry exactly figure.json's figure
    fields. A question with no figure in any row and no figure folder passes, and so does one
    in no-figure.json (`no_figure`: those ids, read from figures_dir when None) whose rows
    carry no figure. The figure is cleared by the founder's approval or by the checked-spec
    route (spec_route_problems; `spec_checker` runs check-spec.ts)."""
    folder = Path(figures_dir) / occ_id if ID.fullmatch(str(occ_id or "")) else None
    present = {k: r for k, r in rows.items() if r}
    no_figure = no_figure_ids(figures_dir) if no_figure is None else no_figure
    if not is_figure_question(occ_id, True, no_figure):
        carrying = sorted(k for k, r in present.items() if has_figure(r))
        return [GATE + f"{occ_id} is in {NO_FIGURE_FILE} (no figure in original.png) but {', '.join(carrying)} "
                       "carries figure fields"] if carrying else []
    if not any(has_figure(r) for r in present.values()) and not (folder and (folder / FIGURE_FILE).exists()):
        return []
    if folder is None:
        return [GATE + f"{occ_id!r} is not an occurrence id, so its figure cannot be found"]
    status = read_status(folder)
    if status is None:
        return [GATE + f"figure not approved by the founder: no {folder / STATUS_FILE}"]
    if status.get("status") != "approved":
        doc, why = spec_route_problems(folder, occ_id, status, spec_checker)
        if why:
            return [GATE + f"figure not approved by the founder (status {status.get('status')}, "
                           f"round {status.get('round')}) and not cleared by the checked-spec route: " + "; ".join(why)]
    else:
        try:
            sha = file_sha256(folder / FIGURE_FILE)
            doc = load_json(folder / FIGURE_FILE)
        except (OSError, ValueError) as e:
            return [GATE + f"cannot read {folder / FIGURE_FILE}: {e}"]
        if sha != status.get("approved_file_sha256"):
            return [GATE + "figure.json changed after the founder approved it; submit it again for review"]
    want = figure_fields(doc)
    out = []
    for what, r in present.items():
        got = figure_fields(r)
        if got != want:
            diff = sorted(k for k in want if got.get(k) != want.get(k))
            out.append(GATE + f"{what} differs from the approved figure.json in {', '.join(diff)} "
                              f"(figure sha {figure_sha256(got)[:12]} vs approved {figure_sha256(want)[:12]})")
    return out


def reviewed_rows(reviewed_file) -> dict:
    """{stable_question_id: row} of a reviewed batch file; {} when it cannot be read."""
    try:
        qs = load_json(Path(reviewed_file)).get("questions", [])
    except (OSError, ValueError, AttributeError, TypeError):
        return {}
    return {q.get("stable_question_id"): q for q in qs if isinstance(q, dict) and q.get("stable_question_id")}


def mark_batch(batch_dir: Path, reviewed_file, items: list[dict], spec_checker=None) -> None:
    """Stage: set it["figure_gate"] (refusal reasons, maybe []) on each precheck item of one batch,
    from the batch's reviewed rows and the importer's rows. Figures live in <pipeline>/figures for
    a batch at <pipeline>/batches/<name> (a folder elsewhere: figures/ beside it)."""
    fdir = figures_dir_for_batch(batch_dir)
    reviewed = reviewed_rows(reviewed_file)
    no_figure = no_figure_ids(fdir)
    for it in items:
        row = it["row"]
        rows = {"the reviewed batch row": reviewed.get(it["id"]), "the row the importer builds": row}
        reasons = gate_reasons(fdir, it["id"], rows, no_figure, spec_checker)
        if reasons and it["id"] not in reviewed:
            reasons.append(GATE + f"{it['id']} is not in the reviewed batch file {reviewed_file}")
        it["figure_gate"] = reasons


def publish_reasons(intents: Path, stable_id, snap: dict, spec_checker=None) -> list[str]:
    """Publish: the gate on a private readback snapshot. Figures live in <pipeline>/figures,
    the pipeline being the folder of the intent log."""
    return gate_reasons(figures_dir_for(Path(intents).resolve().parent), stable_id,
                        {"the private readback row": snap}, spec_checker=spec_checker)
