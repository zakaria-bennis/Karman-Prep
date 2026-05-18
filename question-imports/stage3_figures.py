#!/usr/bin/env python3
"""
Stage 3: figure extraction via Gemini vision.

Runs AFTER stage 2 and BEFORE finalize-pdf-job.mjs. Reads the
extract-out dir produced by stages 1+2:

    page-001.png, page-002.png, …       150 DPI page renders (stage 1)
    questions.csv                        30-col text-only rows (stage 2)
    questions_needs_review.csv           30-col text-only rows (stage 2)

For every source_page that has at least one CSV row, asks Gemini
2.5 Flash to identify figures on that page in normalized 0-1000
bounding-box coordinates. Crops each figure with Pillow, encodes
as a base64 data URL, and writes the data URL into the matching
row's image_url + image_alt columns.

CSV grows from 30 → 32 columns (image_url, image_alt appended);
that matches what src/lib/question-bank/csv-parser.ts expects.

The base64 data URL is materialized to R2 automatically inside
bulk-import (see lib/question-bank/bulk-import.ts materializeImage),
so we do not upload to R2 here — the import path does it once,
on demand.

Why NOT just embed images at stage 2:
- Gemini's RECITATION filter aggressively blocks vision-recognized
  SAT content when asked to transcribe figure contents alongside
  question text. This stage asks for ONLY spatial+structural
  metadata (bbox, type, brief structural alt), never verbatim
  figure content, which we have verified passes the filter.

USAGE
    GEMINI_API_KEY=... \\
    python3 question-imports/stage3_figures.py \\
        question-imports/extract-out/<pdf-stem>

ENV
    GEMINI_API_KEY (required)
    GEMINI_VISION_MODEL  default "gemini-2.5-flash"
    BBOX_PADDING_PCT     default "0.5"  — extra crop padding (%)
                                          to soften imprecise bbox edges
    SKIP_IF_HAS_IMAGE    default "true" — skip rows that already
                                          have an image_url set

OUTPUT
    questions.csv               same row count, now with image_url + image_alt
    questions_needs_review.csv  same
    figures/                    cropped PNGs (for local debugging)
    stage3-report.json          per-page detection summary
"""

from __future__ import annotations

import base64
import csv
import io
import json
import os
import re
import sys
from pathlib import Path

try:
    from google import genai  # type: ignore
    from google.genai import types as genai_types  # type: ignore
except ImportError:
    sys.exit("Install: pip3 install google-genai")

try:
    from PIL import Image  # type: ignore
except ImportError:
    sys.exit("Install: pip3 install pillow")


# Locked 32-column header — must match src/lib/question-bank/csv-parser.ts
# CSV_HEADERS. Stage 2 writes the first 30 columns; we append the last 2.
CSV_HEADERS_32 = [
    "question_text",
    "choice_a", "choice_b", "choice_c", "choice_d",
    "correct_answer", "difficulty", "topic_cluster",
    "hint", "explanation_text",
    "explanation_a", "explanation_b", "explanation_c", "explanation_d",
    "desmos_strategy",
    "passage_intro", "passage", "passage_a", "passage_b",
    "question_format", "numeric_tolerance",
    "domain", "concept_slug", "answer_source",
    "source_pdf", "source_page", "content_hash",
    "import_status", "import_flag_type", "import_flag_reason",
    "image_url", "image_alt",
]

DEFAULT_MODEL = os.environ.get("GEMINI_VISION_MODEL", "gemini-2.5-flash")
DEFAULT_PADDING_PCT = float(os.environ.get("BBOX_PADDING_PCT", "0.5")) / 100.0
SKIP_IF_HAS_IMAGE = os.environ.get("SKIP_IF_HAS_IMAGE", "true").lower() == "true"


PROMPT = """You are looking at a single rendered page from an SAT practice test PDF. SOME pages contain a real question figure (a chart, graph, table, geometric diagram, scatter plot, coordinate-plane graph, 3-D solid) that is PART of a question on the page. MOST pages do NOT have a figure — they're just text questions.

Your job is SPATIAL + STRUCTURAL only. Do not transcribe figure contents or question text. Just identify WHERE each real question figure is.

═══ WHAT IS A QUESTION FIGURE ═══
A real question figure is a visual the student MUST look at to solve the question. Examples:
  · A coordinate-plane graph with a curve
  · A table of data values
  · A scatterplot
  · A geometric diagram (triangle, prism, pyramid, circle)
  · A bar/line graph
  · A multi-panel answer-choice figure (4 small graphs labeled A/B/C/D as the answer choices)

═══ WHAT IS NOT A FIGURE (DO NOT RETURN THESE) ═══
NEVER return any of these as figures — they appear on many SAT pages but are NOT question figures:

  1. **Empty answer-input boxes**: the rectangular box where students type a numeric answer for SPR questions. Looks like a thin horizontal rectangle with a single underline inside. NEVER a figure.

  2. **The "Examples — Acceptable ways to enter answer" reference table**: this appears in section instructions ONLY (typically pages 1-3 of the Math section). It shows how to enter answers like "3.5", "7/2", etc. It is part of the test instructions, NOT a question. Reject it.

  3. **Section-break / instruction pages**: pages that say things like "Math · 27 questions · 35 minutes" or "Directions" or "When you take a test on the digital testing application…". No figures live on these pages.

  4. **Question-number banners**: the dark "5 Mark for Review" bar at the top of each question is page chrome, not a figure.

  5. **ABC menu icons, calculator icons, button decorations** — page chrome.

  6. **Reference sheets** — the math reference formula sheet that appears at the very beginning of the Math section. Reject.

  7. **Pure text questions with NO visual**: if the page is just question text + 4 answer choices, return {"page_has_figure": false, "figures": []}.

═══ IF UNSURE, RETURN NOTHING ═══
A false-negative (missing a real figure) is far less costly than a false-positive (claiming a UI element is a figure). When in doubt, return page_has_figure=false.

═══ FOR EACH REAL FIGURE ═══

1. question_number: STRING like "22", "5". Read from the "N Mark for Review" banner. If the figure is a multi-panel answer-choice (2x2 grid of mini-graphs), set figure_type="choice_figure" and use the parent question's number.

2. figure_type: choose ONE — table | bar_graph | scatterplot | line_graph | coordinate_plane_curve | coordinate_plane_inequality | geometry_2d | geometry_3d | choice_figure. DO NOT use "other". If the visual doesn't match any of these specific types, it's probably not a real question figure — reject it.

3. alt_text_brief: ONE short structural sentence ("Right triangle ABC with one leg labeled 22 and hypotenuse labeled 43"). NEVER copy question text, chart data values, or passage prose. NEVER use phrases like "answer box", "input field", "empty rectangle", "blank box".

4. bbox_1000 = [y_min, x_min, y_max, x_max] in 0-1000 normalized coords.
   · y_min: TIGHT to the top edge of the figure. DO NOT include the dark "Mark for Review" question-number banner above the figure. y_min should be BELOW that banner.
   · y_max: TIGHT to the bottom edge of the figure. For tables, hug the bottom border row. DO NOT extend into the question text below.
   · x_min, x_max: tight to the figure edges; include caption/title text immediately above the figure if any.

5. confidence: "high" | "medium" | "low". Use "high" only if you're certain this is a real question figure (not instructions, not UI).

═══ OUTPUT (JSON only) ═══

{
  "page_has_figure": true | false,
  "figures": [
    {
      "question_number": "22",
      "figure_type": "geometry_2d",
      "alt_text_brief": "Right triangle ABC with one leg 22 and hypotenuse 43",
      "bbox_1000": [167, 318, 358, 630],
      "confidence": "high"
    }
  ]
}"""


_ALLOWED_FIGURE_TYPES = {
    "table",
    "bar_graph",
    "scatterplot",
    "line_graph",
    "coordinate_plane_curve",
    "coordinate_plane_inequality",
    "geometry_2d",
    "geometry_3d",
    "choice_figure",
}

# Substrings that strongly indicate a false positive in Gemini's alt text.
# We reject figures whose alt_text_brief matches any of these.
_REJECT_ALT_SUBSTRINGS = (
    "answer box",
    "answer input",
    "input field",
    "input box",
    "empty rectangle",
    "blank box",
    "blank rectangle",
    "empty input",
    "answer entry",
    "spr input",
    "input area",
    "mark for review",
    "examples",
    "acceptable ways",
    "directions",
    "instructions",
    "reference sheet",
    "formula sheet",
)


def is_real_figure(fig: dict) -> tuple[bool, str]:
    """Post-filter for Gemini's figure detections. Returns (keep, reason).

    Reject any figure that:
      · uses figure_type "other" (we explicitly banned it in the prompt
        but Gemini still emits it occasionally)
      · uses an unrecognized figure_type (typo / hallucinated category)
      · has alt_text mentioning UI/instructions phrases
      · has a degenerate bbox (e.g. < 5% of the page in either dimension —
        too small to be a real figure, likely an answer-input box)
      · has confidence "low"
    """
    ft = (fig.get("figure_type") or "").lower().strip()
    if ft not in _ALLOWED_FIGURE_TYPES:
        return False, f"rejected figure_type={ft!r}"

    alt = (fig.get("alt_text_brief") or "").lower()
    for needle in _REJECT_ALT_SUBSTRINGS:
        if needle in alt:
            return False, f"rejected alt-substring {needle!r}"

    bbox = fig.get("bbox_1000")
    if not (isinstance(bbox, list) and len(bbox) == 4):
        return False, "no/bad bbox"
    y1, x1, y2, x2 = bbox
    height_pct = (y2 - y1) / 10.0  # 0-100
    width_pct = (x2 - x1) / 10.0
    area_pct = (height_pct * width_pct) / 100.0  # 0-100

    # AREA-based filter rather than per-dimension. SAT geometry diagrams
    # (cylinders, prisms) can be narrow but tall — a per-dimension width
    # threshold would over-reject them. Empty SPR answer-input boxes
    # are very thin horizontal rectangles (~0.2% of page area). Real
    # figures are at least 0.4% of page area.
    if area_pct < 0.4:
        return False, f"bbox area too small ({area_pct:.2f}% of page)"

    # Empty SPR input boxes are also degenerately thin — height ~1.5-3%.
    # Reject anything with height < 4% even if area passes (some long
    # thin separators sneak through otherwise).
    if height_pct < 4:
        return False, f"bbox too thin (h={height_pct:.1f}%)"

    # If a figure spans nearly the whole page it's likely a whole-page
    # screenshot artifact, not a real figure.
    if height_pct > 85 and width_pct > 85:
        return False, f"bbox spans whole page (h={height_pct:.1f}% w={width_pct:.1f}%)"

    if (fig.get("confidence") or "").lower() == "low":
        return False, "low confidence"

    return True, "kept"


def detect_figures_on_page(client, page_png: Path) -> dict:
    """Call Gemini vision on a single page PNG. Returns the parsed JSON
    or {"error": ...} on failure."""
    try:
        resp = client.models.generate_content(
            model=DEFAULT_MODEL,
            contents=[
                genai_types.Part.from_bytes(
                    data=page_png.read_bytes(), mime_type="image/png"
                ),
                PROMPT,
            ],
            config=genai_types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=2048,
                thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
                response_mime_type="application/json",
            ),
        )
    except Exception as exc:
        return {"error": str(exc)[:200]}

    finish_reason = None
    try:
        finish_reason = str(resp.candidates[0].finish_reason)  # type: ignore[attr-defined]
    except Exception:
        pass
    text = (resp.text or "").strip()
    if not text:
        return {"error": f"empty response (finish_reason={finish_reason})"}
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        return {"error": f"json parse: {exc}", "raw": text[:200]}


def crop_to_base64(page_png: Path, bbox_1000: list[int], padding_pct: float) -> tuple[str, tuple[int, int], int]:
    """Crop the page PNG at bbox + padding, encode as base64 data URL.

    Returns (data_url, (width_px, height_px), bytes_after_encoding).
    """
    with Image.open(page_png) as img:
        w, h = img.size
        y1, x1, y2, x2 = bbox_1000
        pad_y = int(padding_pct * h)
        pad_x = int(padding_pct * w)
        left = max(0, int(x1 / 1000 * w) - pad_x)
        right = min(w, int(x2 / 1000 * w) + pad_x)
        top = max(0, int(y1 / 1000 * h) - pad_y)
        bottom = min(h, int(y2 / 1000 * h) + pad_y)
        crop = img.crop((left, top, right, bottom))
        buf = io.BytesIO()
        crop.save(buf, "PNG", optimize=True)
        data = buf.getvalue()
        b64 = base64.b64encode(data).decode("ascii")
        return f"data:image/png;base64,{b64}", crop.size, len(data)


def save_crop_locally(page_png: Path, bbox_1000: list[int], padding_pct: float, out_path: Path) -> None:
    """Mirror of crop_to_base64 that writes a real PNG for local debugging."""
    with Image.open(page_png) as img:
        w, h = img.size
        y1, x1, y2, x2 = bbox_1000
        pad_y = int(padding_pct * h)
        pad_x = int(padding_pct * w)
        left = max(0, int(x1 / 1000 * w) - pad_x)
        right = min(w, int(x2 / 1000 * w) + pad_x)
        top = max(0, int(y1 / 1000 * h) - pad_y)
        bottom = min(h, int(y2 / 1000 * h) + pad_y)
        img.crop((left, top, right, bottom)).save(out_path, "PNG", optimize=True)


def read_csv_rows(csv_path: Path) -> tuple[list[str], list[list[str]]]:
    """Read a CSV produced by stage 2. Returns (header, data_rows).

    Pads short rows with empty strings up to 32 columns so stage 3 can
    write image_url/image_alt without bounds-error gymnastics later.
    """
    if not csv_path.exists():
        return CSV_HEADERS_32[:], []
    with csv_path.open("r", encoding="utf-8", newline="") as f:
        rdr = csv.reader(f)
        rows = list(rdr)
    if not rows:
        return CSV_HEADERS_32[:], []
    header = rows[0]
    data = rows[1:]
    # Pad each row to the 32-col target.
    pad_target = len(CSV_HEADERS_32)
    data = [r + [""] * (pad_target - len(r)) if len(r) < pad_target else r for r in data]
    return header, data


def write_csv_rows(csv_path: Path, header: list[str], data: list[list[str]]) -> None:
    with csv_path.open("w", encoding="utf-8", newline="\n") as f:
        w = csv.writer(f, lineterminator="\n", quoting=csv.QUOTE_MINIMAL)
        w.writerow(header)
        for row in data:
            w.writerow(row)


_FIGURE_HINT_RE = re.compile(
    r"\b(the\s+(graph|figure|table|chart|diagram|scatter\s*plot|scatterplot)|shown\s+(above|below)?|coordinate[\s-]+plane|triangle|prism|pyramid|cylinder|cone|sphere|histogram|box[\s-]+plot)\b",
    re.IGNORECASE,
)


def looks_like_needs_figure(question_text: str) -> bool:
    """Heuristic: does this question reference a figure? Used to bias
    figure-to-row assignment when a page has both figure-needing and
    text-only questions."""
    if not question_text:
        return False
    return bool(_FIGURE_HINT_RE.search(question_text))


def assign_figures_to_rows(
    page_num: int,
    figures: list[dict],
    rows: list[list[str]],
    source_page_idx: int,
    question_text_idx: int,
    image_url_idx: int,
) -> tuple[int, list[dict]]:
    """Attach each figure on `page_num` to a row from that page.

    Returns (num_attached, attachment_log).

    Rule:
      · If 1 figure on the page → attach to the first row from this page
        whose question_text matches the figure-hint regex (falling back
        to the first row from this page if none match).
      · If N figures + N rows on the page → zip by Gemini's
        question_number ascending → page-row order.
      · Otherwise → attach what we can in order, log a "needs manual
        review" warning for the unattached figures.
    """
    if not figures:
        return 0, []

    # All rows on this source_page that don't already have an image_url
    # (assuming SKIP_IF_HAS_IMAGE is true; otherwise overwrite).
    page_row_indices = [
        i
        for i, r in enumerate(rows)
        if r[source_page_idx] == str(page_num)
        and (not SKIP_IF_HAS_IMAGE or not r[image_url_idx])
    ]
    if not page_row_indices:
        return 0, [{"page": page_num, "warning": "no candidate rows on this page"}]

    # Prefer rows whose question_text looks like it needs a figure.
    figure_needing_idxs = [
        i for i in page_row_indices if looks_like_needs_figure(rows[i][question_text_idx])
    ]
    target_idxs = figure_needing_idxs if figure_needing_idxs else page_row_indices

    # Sort figures by their Gemini-supplied question_number (if numeric)
    # so we attach top-to-bottom when there are multiple per page.
    def _qnum(f: dict) -> int:
        q = f.get("question_number") or ""
        try:
            return int(re.sub(r"[^0-9]", "", q) or "999")
        except ValueError:
            return 999

    figures_sorted = sorted(figures, key=_qnum)

    log: list[dict] = []
    attached = 0
    for i, fig in enumerate(figures_sorted):
        if i < len(target_idxs):
            row_idx = target_idxs[i]
            log.append(
                {
                    "page": page_num,
                    "figure_index": i,
                    "row_index": row_idx,
                    "alt": fig.get("alt_text_brief", ""),
                    "confidence": fig.get("confidence"),
                }
            )
            attached += 1
        else:
            log.append(
                {
                    "page": page_num,
                    "figure_index": i,
                    "warning": "more figures than target rows on page — unattached",
                    "alt": fig.get("alt_text_brief", ""),
                }
            )
    return attached, log


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: stage3_figures.py <extract-out-dir>")
    in_dir = Path(sys.argv[1]).expanduser().resolve()
    if not in_dir.is_dir():
        sys.exit(f"not a directory: {in_dir}")

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        sys.exit("set GEMINI_API_KEY")

    figures_dir = in_dir / "figures"
    figures_dir.mkdir(parents=True, exist_ok=True)

    # ── Read both CSVs and merge for page discovery ──────────
    ok_csv = in_dir / "questions.csv"
    nr_csv = in_dir / "questions_needs_review.csv"

    ok_header, ok_rows = read_csv_rows(ok_csv)
    nr_header, nr_rows = read_csv_rows(nr_csv)

    # Stage 2 currently writes a 30-col header; we extend to 32.
    final_header = CSV_HEADERS_32[:]

    if not ok_rows and not nr_rows:
        print("No CSV rows found — nothing to enrich.")
        return

    src_idx = CSV_HEADERS_32.index("source_page")
    qt_idx = CSV_HEADERS_32.index("question_text")
    img_url_idx = CSV_HEADERS_32.index("image_url")
    img_alt_idx = CSV_HEADERS_32.index("image_alt")

    # ── Unique source_pages across both files ────────────────
    all_pages: set[int] = set()
    for rows in (ok_rows, nr_rows):
        for r in rows:
            try:
                p = int(r[src_idx])
                all_pages.add(p)
            except (ValueError, IndexError):
                pass

    print(f"extract dir : {in_dir.name}")
    print(f"pages to scan: {len(all_pages)}")
    print(f"model       : {DEFAULT_MODEL}")
    print(f"padding     : {DEFAULT_PADDING_PCT * 100:.2f}%")
    print()

    client = genai.Client(api_key=api_key)
    page_results: dict[int, dict] = {}
    total_figures = 0

    for page_num in sorted(all_pages):
        png_path = in_dir / f"page-{page_num:03d}.png"
        if not png_path.exists():
            page_results[page_num] = {"error": "page PNG missing"}
            continue

        print(f"  page {page_num:03d}…", end=" ", flush=True)
        detection = detect_figures_on_page(client, png_path)
        if detection.get("error"):
            print(f"ERROR: {detection['error']}")
            page_results[page_num] = detection
            continue

        raw_figures = detection.get("figures") or []
        # Post-filter: reject UI/instruction false positives even when
        # Gemini's prompt-following is sloppy. See is_real_figure().
        figures: list[dict] = []
        rejected: list[dict] = []
        for fig in raw_figures:
            keep, reason = is_real_figure(fig)
            if keep:
                figures.append(fig)
            else:
                rejected.append({**fig, "_rejected": reason})

        if not figures:
            tag = "no figure" if not rejected else f"no figure ({len(rejected)} rejected)"
            print(tag)
            page_results[page_num] = {
                "figures": [],
                "rejected": rejected,
                "has_figure": False,
            }
            continue

        # Crop each figure (both local PNG + base64 data URL).
        for i, fig in enumerate(figures, start=1):
            bbox = fig.get("bbox_1000")
            if not (isinstance(bbox, list) and len(bbox) == 4):
                fig["_skipped"] = "no bbox"
                continue
            try:
                data_url, size_px, n_bytes = crop_to_base64(
                    png_path, bbox, DEFAULT_PADDING_PCT
                )
            except Exception as exc:
                fig["_skipped"] = f"crop failed: {exc}"
                continue
            fig["_data_url"] = data_url
            fig["_size_px"] = size_px
            fig["_bytes"] = n_bytes
            # Save a local PNG mirror for debugging.
            save_crop_locally(
                png_path,
                bbox,
                DEFAULT_PADDING_PCT,
                figures_dir / f"page-{page_num:03d}_fig{i:02d}.png",
            )

        kb = sum(f.get("_bytes", 0) for f in figures) // 1024
        tag = f"{len(figures)} fig ({kb} KB)"
        if rejected:
            tag += f" + {len(rejected)} rejected"
        print(tag)
        page_results[page_num] = {
            "figures": figures,
            "rejected": rejected,
            "has_figure": detection.get("page_has_figure", False),
        }
        total_figures += sum(1 for f in figures if "_data_url" in f)

    # ── Attach figures to CSV rows ───────────────────────────
    attach_log: list[dict] = []
    n_attached_ok = 0
    n_attached_nr = 0

    for page_num, result in page_results.items():
        figures = [f for f in (result.get("figures") or []) if "_data_url" in f]
        if not figures:
            continue

        # Try ok rows first, fall back to needs_review.
        ok_attached, ok_log = assign_figures_to_rows(
            page_num, figures, ok_rows, src_idx, qt_idx, img_url_idx
        )
        for entry in ok_log:
            entry["target_csv"] = "questions.csv"
            ridx = entry.get("row_index")
            fidx = entry.get("figure_index")
            if isinstance(ridx, int) and isinstance(fidx, int):
                fig = figures[fidx]
                ok_rows[ridx][img_url_idx] = fig["_data_url"]
                ok_rows[ridx][img_alt_idx] = fig.get("alt_text_brief", "")
        n_attached_ok += ok_attached
        attach_log.extend(ok_log)

        if ok_attached < len(figures):
            # Spill remaining figures into needs_review for this page.
            remaining = figures[ok_attached:]
            nr_attached, nr_log = assign_figures_to_rows(
                page_num, remaining, nr_rows, src_idx, qt_idx, img_url_idx
            )
            for entry in nr_log:
                entry["target_csv"] = "questions_needs_review.csv"
                ridx = entry.get("row_index")
                fidx = entry.get("figure_index")
                if isinstance(ridx, int) and isinstance(fidx, int):
                    fig = remaining[fidx]
                    nr_rows[ridx][img_url_idx] = fig["_data_url"]
                    nr_rows[ridx][img_alt_idx] = fig.get("alt_text_brief", "")
            n_attached_nr += nr_attached
            attach_log.extend(nr_log)

    # ── Write enriched CSVs ─────────────────────────────────
    write_csv_rows(ok_csv, final_header, ok_rows)
    write_csv_rows(nr_csv, final_header, nr_rows)

    # Stage 3 report — what got attached, what didn't, why.
    # Strip _data_url values before serializing (would balloon the JSON).
    pretty_results = {}
    for p, r in page_results.items():
        pretty = dict(r)
        figs = pretty.get("figures") or []
        pretty["figures"] = [
            {k: v for k, v in f.items() if k != "_data_url"} for f in figs
        ]
        pretty_results[str(p)] = pretty

    (in_dir / "stage3-report.json").write_text(
        json.dumps(
            {
                "pages_scanned": len(all_pages),
                "total_figures_detected": total_figures,
                "attached_to_ok_csv": n_attached_ok,
                "attached_to_needs_review_csv": n_attached_nr,
                "model": DEFAULT_MODEL,
                "padding_pct": DEFAULT_PADDING_PCT * 100,
                "attachment_log": attach_log,
                "per_page": pretty_results,
            },
            indent=2,
            default=str,
        )
    )

    print()
    print(f"  total figures detected     : {total_figures}")
    print(f"  attached → questions.csv   : {n_attached_ok}")
    print(f"  attached → needs_review.csv: {n_attached_nr}")
    print(f"  report                     : {in_dir / 'stage3-report.json'}")
    print(f"  local PNG crops            : {figures_dir}/")


if __name__ == "__main__":
    main()
