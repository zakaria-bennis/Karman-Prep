#!/usr/bin/env python3
"""
Stage 1: PDF → per-page text + per-page PNG images.

This is deterministic, local, free, and fast. No LLM is involved.
Run this BEFORE stage2_classify.py.

Usage:
    python3 question-imports/stage1_extract.py <path-to-pdf>

Example:
    python3 question-imports/stage1_extract.py \\
        question-imports/incoming/c461e2ae-.../202603usv1.pdf

Output (under question-imports/extract-out/<pdf-stem>/):
    page-001.txt        text extracted from page 1 (pdfplumber)
    page-001.png        150 DPI render of page 1 (pdftoppm)
    page-002.txt        ...
    summary.json        metadata + heuristic answer-key page guesses

Requires:
    brew install poppler           # provides `pdftoppm`
    pip3 install pdfplumber

If pdfplumber's text quality is poor on math-heavy pages (e.g.
"x²" → "x2"), upgrade to `marker` (heavier but math-aware):
    pip3 install marker-pdf
    marker_single <pdf> <output-dir>
The output is markdown that stage2_classify.py can consume the
same way as page-*.txt files (concatenate them).
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

try:
    import pdfplumber  # type: ignore
except ImportError:
    sys.exit(
        "Missing dependency. Install:\n"
        "    pip3 install pdfplumber"
    )


def find_pdftoppm() -> str:
    """Locate pdftoppm (poppler) — required for page-image rendering."""
    p = shutil.which("pdftoppm")
    if not p:
        sys.exit(
            "pdftoppm not found on PATH. Install poppler:\n"
            "    brew install poppler"
        )
    return p


def extract_text_per_page(pdf_path: Path, out_dir: Path) -> int:
    """Write page-NNN.txt files. Returns total page count."""
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        print(f"  {total} pages — extracting text…")
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            (out_dir / f"page-{i:03d}.txt").write_text(text, encoding="utf-8")
        return total


def render_pages_to_png(pdf_path: Path, out_dir: Path, dpi: int = 150) -> None:
    """Render each page to a PNG via pdftoppm. Renames to zero-padded.

    pdftoppm produces page-1.png, page-2.png, … (not zero-padded).
    We rename to page-001.png, page-002.png, … so they sort correctly
    alongside the .txt files.
    """
    print(f"  rendering pages to PNG at {dpi} DPI (pdftoppm)…")
    subprocess.run(
        [find_pdftoppm(), "-r", str(dpi), "-png", str(pdf_path), str(out_dir / "page")],
        check=True,
    )
    # Rename to zero-padded.
    for png in list(out_dir.glob("page-*.png")):
        try:
            num = int(png.stem.split("-")[1])
        except (IndexError, ValueError):
            continue
        target = png.parent / f"page-{num:03d}.png"
        if png != target:
            png.rename(target)


def guess_answer_key_pages(out_dir: Path, total_pages: int) -> list[int]:
    """Heuristic: scan the last 8 pages for 'answer key', 'correct answer',
    or a question-number-to-letter map pattern. Returns a sorted list of
    page numbers that look like an answer key."""
    candidates: list[int] = []
    start = max(1, total_pages - 8)
    for i in range(start, total_pages + 1):
        txt_path = out_dir / f"page-{i:03d}.txt"
        if not txt_path.exists():
            continue
        text = txt_path.read_text(encoding="utf-8").lower()
        if (
            "answer key" in text
            or "answer choice" in text
            or "correct answer" in text
            # rudimentary match for "1. A  2. B  3. C" patterns common
            # on College Board answer sheets
            or _looks_like_letter_grid(text)
        ):
            candidates.append(i)
    return candidates


def _looks_like_letter_grid(text: str) -> bool:
    """True if a chunk of text contains many "<num>. <letter>" patterns —
    a strong signal of an answer-key page."""
    import re

    matches = re.findall(r"\b\d{1,2}\.\s*[A-D]\b", text)
    return len(matches) >= 8


def ocr_empty_pages_with_tesseract(out_dir: Path) -> int:
    """For any page-NNN.txt that pdfplumber left empty (≤30 bytes —
    typically a header line or nothing), shell out to tesseract on the
    matching PNG. Returns the number of pages that were OCR'd.

    Many SAT PDFs are image-only (no text layer); pdfplumber returns
    empty strings for those pages. Tesseract is a free, local OCR that
    handles them well enough for text-only LLM extraction downstream.
    """
    tess = shutil.which("tesseract")
    if not tess:
        print("  [skip] tesseract not on PATH — install with `brew install tesseract` to OCR scanned PDFs")
        return 0
    empty: list[Path] = []
    for txt in sorted(out_dir.glob("page-*.txt")):
        if txt.stat().st_size <= 30:  # tiny: just module header or empty
            png = txt.with_suffix(".png")
            if png.exists():
                empty.append(png)
    if not empty:
        return 0
    print(f"  OCRing {len(empty)} empty pages with tesseract (parallel)…")
    # Use xargs-style parallelism via concurrent.futures.
    from concurrent.futures import ThreadPoolExecutor

    def ocr_one(png: Path) -> None:
        # tesseract <input> <output-stem> writes <output-stem>.txt
        subprocess.run(
            [tess, str(png), str(png.with_suffix("")), "-l", "eng"],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    with ThreadPoolExecutor(max_workers=4) as ex:
        list(ex.map(ocr_one, empty))
    return len(empty)


def extract_answer_key_via_vision(
    out_dir: Path, total_pages: int
) -> dict[str, str] | None:
    """Send the last 9 page PNGs to Gemini Flash and extract any
    visible question→answer mapping. Returns a flat dict
    {question_id: answer} or None if no key was found / no API key set.

    Earlier version asked Gemini to JUDGE whether a page is an answer
    key (returning is_answer_key true/false) — this was overcautious.
    On 202603usv2.pdf, page 99 was an obvious answer key (numeric SPR
    answers + question numbers) but the model returned is_answer_key=false
    because the layout differed from the canonical multi-column key.
    The permissive prompt here just asks "extract any visible Q→A
    mapping" — far more reliable, occasional false positives easily
    weed out at merge time (we keep the union across pages).

    Answer-key pages are also the only place vision is safe against
    SAT content — they contain just letters and numeric expressions,
    not question prose, so Gemini's RECITATION filter doesn't trip.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("  [skip] GEMINI_API_KEY not set — answer-key extraction skipped")
        print("        (rerun stage 1 with the key exported to populate summary.answer_key)")
        return None
    try:
        from google import genai  # type: ignore
        from google.genai import types  # type: ignore
    except ImportError:
        print("  [skip] google-genai not installed — answer-key extraction skipped")
        return None

    prompt = (
        "Look at this page image. If it shows ANY mapping of question numbers to "
        "answers (letters A/B/C/D for multiple choice, OR numeric values/expressions "
        "for student-produced response questions), extract every entry as JSON: "
        "{\"answers\": {\"q1\": \"A\", \"q22\": \"32\", ...}}. "
        "If the page indicates which module each question belongs to (e.g. headers like "
        "'Reading and Writing Module 1', 'Math Module 2'), use module-prefixed keys: "
        "rw1_1, rw1_2, ..., math2_22. If you can't tell which module, just use q<num>. "
        "If there's no answer mapping visible at all (e.g. it's a regular question page "
        "or a passage), return {\"answers\": {}}. Always return valid JSON."
    )
    client = genai.Client(api_key=api_key)

    # Scan the last 9 pages, collecting answers from any page that has them.
    # Take the union — a real key may span multiple pages and false positives
    # are fine (a wrong q→a mapping is corrected by the actual question's
    # page text disagreeing in stage 2).
    merged: dict[str, str] = {}
    pages_to_scan = list(range(total_pages, max(0, total_pages - 9), -1))
    for n in pages_to_scan:
        png = out_dir / f"page-{n:03d}.png"
        if not png.exists():
            continue
        try:
            resp = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Part.from_bytes(data=png.read_bytes(), mime_type="image/png"),
                    prompt,
                ],
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    max_output_tokens=4096,
                    thinking_config=types.ThinkingConfig(thinking_budget=0),
                    response_mime_type="application/json",
                ),
            )
        except Exception as exc:
            print(f"    page {n}: API error: {str(exc)[:120]}")
            continue
        try:
            data = json.loads(resp.text or "{}")
        except json.JSONDecodeError:
            continue
        ans = data.get("answers") if isinstance(data, dict) else None
        if isinstance(ans, dict) and ans:
            n_added = 0
            for k, v in ans.items():
                key = str(k)
                if key not in merged:
                    merged[key] = str(v)
                    n_added += 1
            if n_added:
                print(f"    page {n}: +{n_added} entries (total {len(merged)})")
    return merged or None


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: python3 stage1_extract.py <path-to-pdf>")

    pdf_path = Path(sys.argv[1]).expanduser().resolve()
    if not pdf_path.exists() or pdf_path.suffix.lower() != ".pdf":
        sys.exit(f"not a PDF: {pdf_path}")

    script_dir = Path(__file__).resolve().parent
    out_dir = script_dir / "extract-out" / pdf_path.stem
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"PDF        : {pdf_path}")
    print(f"output dir : {out_dir}")
    print()

    total = extract_text_per_page(pdf_path, out_dir)
    render_pages_to_png(pdf_path, out_dir)
    ocr_empty_pages_with_tesseract(out_dir)
    answer_key_pages = guess_answer_key_pages(out_dir, total)
    answer_key = extract_answer_key_via_vision(out_dir, total)

    summary = {
        "pdf_source_path": str(pdf_path),
        "pdf_basename": pdf_path.name,
        "page_count": total,
        "answer_key_pages_guess": answer_key_pages,
        "answer_key": answer_key,
        "out_dir": str(out_dir),
    }
    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2))

    print()
    print(f"  wrote {total} text files + {total} PNGs")
    print(f"  answer-key pages (heuristic): {answer_key_pages or 'none found'}")
    print(f"  answer-key entries (vision) : {len(answer_key) if answer_key else 0}")
    print()
    print("Next:")
    print(f"    python3 {script_dir}/stage2_classify.py {out_dir}")


if __name__ == "__main__":
    main()
