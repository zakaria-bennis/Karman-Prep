#!/usr/bin/env python3
"""
Stage 2: Stage-1 output dir → 30-column CSV via Gemini.

Calls the Gemini API once per page-chunk, asks it to extract questions
into the locked 30-column schema with the locked taxonomy, then merges
the chunks into questions.csv + questions_needs_review.csv. The whole
PDF is processed in a few minutes; no rate-limit risk on Claude Max
because this doesn't touch Claude.

Usage:
    GEMINI_API_KEY=... \\
    python3 question-imports/stage2_classify.py <stage1-output-dir>

Get a free key:
    https://aistudio.google.com/apikey

Tunables (env vars):
    GEMINI_API_KEY (or GOOGLE_API_KEY) — required
    GEMINI_MODEL   — default "gemini-2.5-flash". Override with
                     "gemini-2.5-pro" for higher quality (slower,
                     stricter free-tier RPD: ~25/day).
    CHUNK_PAGES    — pages per Gemini call (default 25).
                     Smaller chunks = more calls but lower risk of
                     truncating the output past 65k tokens.

Output (in the same stage-1 dir):
    questions.csv               rows with import_status=ok
    questions_needs_review.csv  rows flagged needs_review
    raw-chunk-NN.txt            verbatim Gemini response per chunk
                                (for debugging if CSV parsing fails)
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Iterable

try:
    from google import genai  # type: ignore
    from google.genai import types as genai_types  # type: ignore
except ImportError:
    sys.exit(
        "Missing dependency. Install:\n"
        "    pip3 install google-genai"
    )

# ── 30-column schema (locked) ────────────────────────────────────
SCHEMA_COLUMNS = [
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
]

# Tight Gemini-tailored spec — distilled from ROUTINE_PROMPT.md but
# stripped of Claude-Code-specific tooling instructions.
SYSTEM_SPEC = """You are an SAT question-extraction system. Output ONE CSV row per solvable question on the pages provided. Follow the schema and taxonomy EXACTLY — no deviations, no invented values.

═══════════════════════════════════════════════
30-COLUMN SCHEMA (exact order, comma-separated)
═══════════════════════════════════════════════
question_text,choice_a,choice_b,choice_c,choice_d,correct_answer,difficulty,topic_cluster,hint,explanation_text,explanation_a,explanation_b,explanation_c,explanation_d,desmos_strategy,passage_intro,passage,passage_a,passage_b,question_format,numeric_tolerance,domain,concept_slug,answer_source,source_pdf,source_page,content_hash,import_status,import_flag_type,import_flag_reason

CSV escaping rules:
- Wrap fields containing commas, quotes, or newlines in double quotes
- Escape embedded double quotes by doubling them ("")
- UTF-8, LF line endings
- DO NOT include the header row in your response — only data rows.

═══════════════════════════════════════════════
LOCKED TAXONOMY — never invent a value
═══════════════════════════════════════════════

8 DOMAINS (use exactly): algebra, advanced_math, geometry, data_analysis, info_ideas, craft_structure, expression_ideas, conventions

8 CLUSTERS (the topic_cluster value, 1:1 with domain):
  algebra          → "Algebra"
  advanced_math    → "Advanced Math"
  geometry         → "Geometry & Trigonometry"
  data_analysis    → "Problem-Solving & Data Analysis"
  info_ideas       → "Information & Ideas"
  craft_structure  → "Craft & Structure"
  expression_ideas → "Expression of Ideas"
  conventions      → "Standard English Conventions"

89 CONCEPT SLUGS (use as concept_slug, pick exactly ONE per row):

ALGEBRA (6):
  linear-equations-one-variable, linear-equations-two-variables,
  linear-inequalities, systems-of-linear-equations,
  systems-of-linear-inequalities, absolute-value-equations

ADVANCED MATH (17):
  properties-of-exponents, simplifying-algebraic-expressions,
  evaluating-and-interpreting-functions, introduction-to-polynomials,
  quadratic-equations-factoring, quadratic-equations-quadratic-formula,
  quadratic-functions-vertex-form, polynomial-operations,
  rational-expressions, radical-expressions, exponential-growth-and-decay,
  function-transformations, linear-vs-exponential-models,
  nonlinear-systems-of-equations,
  algebraic-manipulation-of-complex-expressions,
  multi-step-problem-solving, full-section-strategy

GEOMETRY (8):
  area-perimeter-and-volume, angle-relationships, coordinate-plane-geometry,
  triangle-congruence-and-similarity, pythagorean-theorem-and-distance-formula,
  trigonometric-ratios, circle-equations-in-standard-form,
  arc-length-and-sector-area

DATA ANALYSIS (9):
  ratios-and-proportions, percentages, unit-rates-and-conversions,
  scatterplots-and-lines-of-best-fit, statistical-measures,
  probability-basics, two-way-tables,
  statistical-inference-and-margin-of-error, interpreting-complex-data

INFO IDEAS (15):
  main-idea-and-central-claims, supporting-details-and-evidence,
  inference-and-implicit-meaning, central-idea-vs-theme,
  citing-textual-evidence, cross-text-synthesis,
  charts-and-data-in-passages, interpreting-graphs-alongside-text,
  command-of-evidence-textual, command-of-evidence-quantitative,
  counterclaims-and-rebuttals, dual-passage-analysis,
  statistical-claim-evaluation, information-and-ideas-integration,
  cross-disciplinary-evidence-use

CRAFT STRUCTURE (14):
  authors-purpose-and-intent, text-organization-patterns,
  vocabulary-in-context, word-choice-and-connotation,
  rhetorical-appeals, tone-and-point-of-view,
  evaluating-argument-strength, authorial-perspective-and-bias,
  advanced-argumentation-analysis, literary-authorial-purpose,
  nuanced-vocabulary-in-context, precise-word-choice-in-context,
  structural-analysis-of-texts, logical-structure-of-arguments

EXPRESSION IDEAS (6):
  transitional-words-and-phrases, redundancy-and-conciseness,
  sentence-variety-and-combining, multi-paragraph-structure,
  rhetorical-synthesis, advanced-transitions-and-cohesion

CONVENTIONS (14):
  subject-verb-agreement, verb-tense, pronouns-and-nouns,
  apostrophes-plural-vs-possessive, periods-and-semicolons,
  comma-fanboys, commas-and-dependent-clauses,
  non-essential-information, commas-with-names-and-titles,
  additional-comma-uses-and-misuses, colons-and-dashes,
  parallel-structure-and-word-pairs, question-marks, modifier-placement

═══════════════════════════════════════════════
DIFFICULTY (integer 1–7)
═══════════════════════════════════════════════
1–2 easy, 3–4 medium (most common), 5–6 hard, 7 trickiest.
Calibrate against the full College Board difficulty spread.

═══════════════════════════════════════════════
ANSWER KEY HANDLING
═══════════════════════════════════════════════
You'll be given a STRUCTURED answer-key map (JSON dict) with keys
like "rw1_3", "rw2_1", "math1_5", "math2_22" — meaning Reading &
Writing Module 1 question 3, Math Module 2 question 22, etc. The
chunk's pages will indicate which module they belong to (look for
"Module 1" / "Module 2" headings, or "Reading and Writing" /
"Math" section titles). Question numbers within a module are visible
in the OCR text (e.g. "5 Mark for Review", "22 Mark for Review").

For each question you extract:
- Look up the key by module + question number, e.g. q5 in R&W M1 → "rw1_5".
- If found (regardless of agreement with your independently-solved answer):
    correct_answer = the KEY's value (the key is authoritative — the
        College Board key is virtually always correct, your solve may
        not be).
    answer_source = "extracted"
    import_status = "ok"
    import_flag_type = ""
    import_flag_reason = ""
  Do NOT flag a row needs_review just because your inferred answer
  disagreed with the key. The key wins; that's the whole point of
  having one. Flagging key-disagreements creates manual-review work
  that almost always ends with "yeah, the key was right".
- If the key map is empty or has no entry for this question →
  answer_source="inferred", import_status="needs_review",
  import_flag_type="partial_emit",
  import_flag_reason="No answer key entry — inferred".

═══════════════════════════════════════════════
EXPLANATIONS — explanation_text IS REQUIRED, ALWAYS
═══════════════════════════════════════════════
explanation_text is the OVERALL explanation shown to the student
after they answer. It MUST be a complete 1–2-sentence explanation
of why the correct answer is correct, written for someone who got
it wrong. NEVER leave explanation_text empty. NEVER substitute
per-choice content for it. Even if you also fill explanation_a..d,
you MUST also fill explanation_text.

PER-CHOICE EXPLANATIONS (MC questions)
Fill explanation_a/b/c/d for at least 60% of MC questions.
Name the SAT trap pattern in the wrong-choice explanation:
sign error, partial completion, keyword trap, reasonable-but-unsupported,
half-right + half-wrong, switched units, common stem misreading.
For the correct choice, write 1–2 sentences explaining WHY it's right.

For SPR (numeric_entry) questions: explanation_a..d MUST be empty;
explanation_text carries the full walkthrough.

═══════════════════════════════════════════════
HINT (always)
═══════════════════════════════════════════════
One sentence. Methodological nudge. Don't reveal the answer or operation.
GOOD: "Start by isolating the radical."
BAD : "Square both sides."

═══════════════════════════════════════════════
KaTeX FORMATTING (REQUIRED for math)
═══════════════════════════════════════════════
Wrap ALL math in $...$ (inline) or $$...$$ (display). Apply to
question_text, choices, explanations, hint, desmos_strategy.
Examples:
  fraction      $\\dfrac{11}{6}$
  exponent      $x^2$
  sqrt          $\\sqrt{5k+9}$
  variable      $x$ (single letters always wrapped)
  point         $(-5, 5)$
  equation      $y = 6x^2 + bx + c$
  percent       $44\\%$
Plain English never gets $...$.

═══════════════════════════════════════════════
SPR (numeric entry) questions
═══════════════════════════════════════════════
question_format="numeric_entry"; choice_a..d blank; correct_answer holds
the numeric value/expression; numeric_tolerance holds ± range (blank=exact);
explanation_a..d blank; explanation_text carries the full walkthrough.

═══════════════════════════════════════════════
PASSAGES
═══════════════════════════════════════════════
Each R&W question has its OWN passage on its OWN row.
For literature, fill passage_intro with the italic source line.
For cross-text questions, fill passage_a + passage_b; leave passage blank.
For math without surrounding text, leave all four passage fields blank.

═══════════════════════════════════════════════
FLAGGING
═══════════════════════════════════════════════
import_status: "ok" or "needs_review".
For solvable questions with cosmetic issues use needs_review with
import_flag_type="partial_emit". Provide a clear import_flag_reason
on every needs_review row.
For UNSOLVABLE questions (missing choice, illegible required diagram,
no inferable answer): SKIP entirely — do not emit a row.

If a question essentially requires reading a graph/figure that you
cannot solve from the text alone, emit needs_review with
import_flag_reason="Requires figure on page N — manual review".

═══════════════════════════════════════════════
content_hash
═══════════════════════════════════════════════
sha1(lowercase(strip_whitespace(question_text + "|" + choice_a + "|" +
choice_b + "|" + choice_c + "|" + choice_d))). For SPR rows where
choices are blank, hash just question_text.
You may emit a placeholder string "TBD" — the post-processor will
recompute it. Just emit something; never leave blank.

═══════════════════════════════════════════════
OUTPUT REQUIREMENTS — READ CAREFULLY, FAILURE TO FOLLOW = REJECTED
═══════════════════════════════════════════════
- Return ONLY CSV data rows. No header row, no commentary, no markdown
  fences, no preamble, no trailing prose. The first character of your
  response must be the first character of the first data row.
- One row per question. UTF-8. LF newlines.

EXACTLY 30 FIELDS PER ROW, EXACTLY IN THIS ORDER (numbered for clarity):
   1. question_text         16. passage_intro
   2. choice_a              17. passage
   3. choice_b              18. passage_a
   4. choice_c              19. passage_b
   5. choice_d              20. question_format
   6. correct_answer        21. numeric_tolerance
   7. difficulty            22. domain
   8. topic_cluster         23. concept_slug
   9. hint                  24. answer_source
  10. explanation_text      25. source_pdf
  11. explanation_a         26. source_page
  12. explanation_b         27. content_hash
  13. explanation_c         28. import_status
  14. explanation_d         29. import_flag_type
  15. desmos_strategy       30. import_flag_reason

CRITICAL: empty fields are emitted as TWO CONSECUTIVE COMMAS — never
skipped. Every row must have EXACTLY 29 top-level commas (delimiter
count = field count − 1). Examples of valid empty-field handling:
  · An R&W multiple-choice question still has a numeric_tolerance
    field (empty) — emit `,,` between question_format and domain.
  · A math question with no passage still has passage_intro, passage,
    passage_a, passage_b — emit `,,,,` between desmos_strategy and
    question_format.
  · An SPR (numeric_entry) question still has choice_a..d, explanation_a..d
    — emit `,"","","","",` for choices and the same for explanations.

Self-check before emitting each row: count commas at the top level
(ignoring commas inside quoted fields). MUST equal 29. If not, you
skipped or duplicated a column — fix and re-emit.

For the values:
  · question_format: "multiple_choice" or "numeric_entry"
  · domain: one of the 8 domain slugs above (e.g. "algebra", "info_ideas")
  · import_status: "ok" or "needs_review"
  · answer_source: "extracted", "hand_corrected", or "inferred"
  · content_hash: emit "TBD" — the post-processor will compute it
  · source_pdf: filename of the source PDF (provided to you)
  · source_page: integer page number (1-indexed)
"""

DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
DEFAULT_CHUNK_PAGES = int(os.environ.get("CHUNK_PAGES", "25"))
# Smoke-test cap: process only N chunks then stop. Empty → no cap.
MAX_CHUNKS_ENV = os.environ.get("MAX_CHUNKS", "").strip()
MAX_CHUNKS = int(MAX_CHUNKS_ENV) if MAX_CHUNKS_ENV else None


def get_api_key() -> str:
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        sys.exit(
            "Set GEMINI_API_KEY (free key at https://aistudio.google.com/apikey).\n"
            "    GEMINI_API_KEY=... python3 stage2_classify.py <dir>"
        )
    return key


def read_pages(in_dir: Path) -> dict[int, str]:
    pages: dict[int, str] = {}
    for p in sorted(in_dir.glob("page-*.txt")):
        try:
            num = int(p.stem.split("-")[1])
        except (IndexError, ValueError):
            continue
        pages[num] = p.read_text(encoding="utf-8")
    return pages


def chunked(iterable: list[int], size: int) -> Iterable[list[int]]:
    for i in range(0, len(iterable), size):
        yield iterable[i : i + size]


def build_chunk_contents(
    chunk_pages: list[int],
    pages: dict[int, str],
    images_dir: Path,
    answer_key: dict[str, str] | None,
    pdf_basename: str,
):
    """Compose the text-only `contents` list for one Gemini call.

    We tried sending page PNGs alongside the text — Gemini's RECITATION
    filter aggressively blocks vision-recognized SAT content (returns
    finish_reason=RECITATION with empty text). The same content as
    user-supplied OCR text passes the filter cleanly. So Stage 1 must
    OCR scanned PDFs into per-page .txt files BEFORE this runs; we
    only feed text here.
    """
    del images_dir  # kept for signature compat; images intentionally omitted
    if answer_key:
        key_repr = json.dumps(answer_key, indent=2, ensure_ascii=False)
    else:
        key_repr = "{}  (no answer key — mark every row needs_review)"
    parts: list[str] = [
        f"PDF source filename: {pdf_basename}",
        f"Pages in this chunk: {chunk_pages[0]}–{chunk_pages[-1]}",
        "",
        "ANSWER KEY MAP (JSON dict — keys are module-prefixed question IDs):",
        "─" * 40,
        key_repr,
        "─" * 40,
        "",
        "PAGES TO PROCESS:",
    ]
    for n in chunk_pages:
        page_text = pages.get(n, "").strip()
        if not page_text:
            continue
        parts.append(f"\n=== PAGE {n} ===\n{page_text}")
    parts.append(
        "\n\nReturn CSV data rows only. No header, no markdown fences, no prose."
    )
    return parts


def compute_content_hash(row: list[str]) -> str:
    """Per ROUTINE_PROMPT.md spec:
        sha1(lowercase(strip_whitespace(
            question_text + "|" + choice_a + "|" + choice_b + "|" +
            choice_c + "|" + choice_d
        )))
    For SPR (numeric_entry) questions where choices are blank, hash
    just question_text. The DB has a UNIQUE index on
    (source_pdf, content_hash), so any two rows with the same
    content_hash from the same PDF collide and the second one is
    silently skipped. Computing this deterministically (not "TBD")
    lets every distinct question land in the bank."""
    qt = row[SCHEMA_COLUMNS.index("question_text")] or ""
    qf = row[SCHEMA_COLUMNS.index("question_format")] or "multiple_choice"
    if qf == "numeric_entry":
        material = qt
    else:
        ca = row[SCHEMA_COLUMNS.index("choice_a")] or ""
        cb = row[SCHEMA_COLUMNS.index("choice_b")] or ""
        cc = row[SCHEMA_COLUMNS.index("choice_c")] or ""
        cd = row[SCHEMA_COLUMNS.index("choice_d")] or ""
        material = f"{qt}|{ca}|{cb}|{cc}|{cd}"
    normalized = "".join(material.lower().split())
    return hashlib.sha1(normalized.encode("utf-8")).hexdigest()


def normalize_slug(s: str) -> str:
    """Concept slugs use DASHES (`linear-equations-one-variable`).
    Gemini occasionally emits underscores by mistake. Normalize:
    lowercase, underscores → dashes, strip whitespace."""
    return s.strip().lower().replace("_", "-")


def normalize_domain(s: str) -> str:
    """Domain enum uses UNDERSCORES (`info_ideas`, `craft_structure`).
    Note: opposite convention from slugs! If you naively reuse
    normalize_slug for domain, every R&W row gets a `-` value that
    the importer's isValidDomain check rejects. Convert
    dashes/spaces to underscores here, lowercase."""
    return s.strip().lower().replace("-", "_").replace(" ", "_")


def parse_rows(json_text: str) -> list[list[str]]:
    """Parse Gemini's structured JSON output (an array of objects, one per
    question) into a list of 30-column rows in schema order."""
    if not json_text.strip():
        return []
    data = json.loads(json_text)
    if not isinstance(data, list):
        # Gemini occasionally wraps in {"questions": [...]}
        for key in ("questions", "rows", "data", "items"):
            if isinstance(data, dict) and key in data:
                data = data[key]
                break
        if not isinstance(data, list):
            raise ValueError(f"unexpected JSON top-level: {type(data).__name__}")
    out: list[list[str]] = []
    SLUG_IDX = SCHEMA_COLUMNS.index("concept_slug")
    DOMAIN_IDX = SCHEMA_COLUMNS.index("domain")
    HASH_IDX = SCHEMA_COLUMNS.index("content_hash")
    for q in data:
        if not isinstance(q, dict):
            continue
        # Pull every column in schema order; missing keys → "".
        row = [str(q.get(col, "") or "") for col in SCHEMA_COLUMNS]
        # Normalize slug + domain so Gemini's "_" / case typos don't
        # break the importer's slug→node lookup.
        if row[SLUG_IDX]:
            row[SLUG_IDX] = normalize_slug(row[SLUG_IDX])
        if row[DOMAIN_IDX]:
            row[DOMAIN_IDX] = normalize_domain(row[DOMAIN_IDX])
        # Always compute content_hash here. Gemini emits "TBD" per the
        # spec; if we ship it as-is, the (source_pdf, content_hash)
        # unique index collapses every row from one PDF into a single
        # insertion (one wins, the rest skip as duplicates). Computing
        # the sha1 deterministically per spec gives every row a unique
        # hash matching its content.
        row[HASH_IDX] = compute_content_hash(row)
        out.append(row)
    return out


def write_csv(path: Path, rows: list[list[str]]) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as f:
        w = csv.writer(f, lineterminator="\n", quoting=csv.QUOTE_MINIMAL)
        w.writerow(SCHEMA_COLUMNS)
        for r in rows:
            w.writerow(r)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: python3 stage2_classify.py <stage1-output-dir>")

    in_dir = Path(sys.argv[1]).expanduser().resolve()
    if not in_dir.is_dir():
        sys.exit(f"not a directory: {in_dir}")
    summary_path = in_dir / "summary.json"
    if not summary_path.exists():
        sys.exit(f"no summary.json in {in_dir} — did you run stage1_extract.py?")

    summary = json.loads(summary_path.read_text())
    pdf_basename = summary["pdf_basename"]
    page_count = summary["page_count"]
    answer_key_pages = set(summary.get("answer_key_pages_guess", []))
    answer_key = summary.get("answer_key") or None  # may be None / dict

    pages = read_pages(in_dir)
    if not pages:
        sys.exit("no page-*.txt files found")

    # Skip answer-key pages from the content set we send for question
    # extraction — we already have a structured answer key from Stage 1's
    # vision pass, no need to re-process those pages as content.
    content_pages = sorted(p for p in pages if p not in answer_key_pages)

    print(f"PDF        : {pdf_basename}")
    print(f"page count : {page_count}")
    print(f"key pages  : {sorted(answer_key_pages) or '(none)'}")
    print(f"answer key : {len(answer_key) if answer_key else 0} entries from vision pass")
    print(f"content    : {len(content_pages)} pages")
    print(f"chunks     : ceil({len(content_pages)}/{DEFAULT_CHUNK_PAGES})")
    print(f"model      : {DEFAULT_MODEL}")
    print()

    api_key_used = get_api_key()
    # Diagnostic: print the prefix of the key actually being passed.
    # Removed safely after we confirm env propagation works.
    print(f"[stage2] using GEMINI_API_KEY: {api_key_used[:8]}...{api_key_used[-4:]}", flush=True)
    client = genai.Client(api_key=api_key_used)

    # Structured-JSON output with a required-field schema. We tried
    # CSV first and Gemini kept silently dropping empty/optional fields
    # (numeric_tolerance, passage_a, etc.), producing 27–29-field rows
    # instead of 30. JSON with response_schema forces every field to
    # appear in every row.
    response_schema = {
        "type": "ARRAY",
        "items": {
            "type": "OBJECT",
            "properties": {col: {"type": "STRING"} for col in SCHEMA_COLUMNS},
            "required": list(SCHEMA_COLUMNS),
            "propertyOrdering": list(SCHEMA_COLUMNS),
        },
    }
    # Thinking disabled — see prior commit message; for structured
    # extraction it burns budget without improving quality.
    config = genai_types.GenerateContentConfig(
        temperature=0.2,
        max_output_tokens=65536,
        system_instruction=SYSTEM_SPEC,
        thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
        response_mime_type="application/json",
        response_schema=response_schema,
    )

    all_rows: list[list[str]] = []
    chunks = list(chunked(content_pages, DEFAULT_CHUNK_PAGES))
    if MAX_CHUNKS is not None:
        chunks = chunks[:MAX_CHUNKS]
        print(f"  (smoke-test mode: capping to {MAX_CHUNKS} chunk(s) of {DEFAULT_CHUNK_PAGES} pages)")
    for idx, chunk_pages in enumerate(chunks, start=1):
        contents = build_chunk_contents(
            chunk_pages, pages, in_dir, answer_key, pdf_basename
        )
        # Approximate request size for logging — sum of bytes in image
        # parts plus text length. Gives a sense of how big the call is.
        approx_bytes = 0
        for p in contents:
            if isinstance(p, str):
                approx_bytes += len(p.encode("utf-8"))
            else:
                # genai Part — best-effort byte length
                try:
                    approx_bytes += len(p.inline_data.data)  # type: ignore[attr-defined]
                except Exception:
                    pass
        print(
            f"[chunk {idx}/{len(chunks)}] pages {chunk_pages[0]}–{chunk_pages[-1]} "
            f"(~{approx_bytes / 1024:.0f} KB in: text + {len(chunk_pages)} page images)…",
            flush=True,
        )
        t0 = time.time()
        # Up to 3 retries with exponential backoff on 429 / 503.
        # The Gemini SDK already does internal retries for some errors,
        # but RPM-rate-limit 429s and transient 503s show up as bare
        # exceptions here; we need to handle them ourselves.
        resp = None
        for attempt in range(3):
            try:
                resp = client.models.generate_content(
                    model=DEFAULT_MODEL,
                    contents=contents,
                    config=config,
                )
                break
            except Exception as exc:  # pragma: no cover
                msg = str(exc)
                # Try to parse server-suggested retryDelay from the error
                m = re.search(r"retry in (\d+(?:\.\d+)?)s", msg)
                wait = float(m.group(1)) + 1 if m else (5 * (2**attempt))
                # If it's a daily-quota exhaustion (RPD), retrying won't
                # help — surface immediately.
                if "PerDay" in msg or "RPD" in msg or "daily" in msg.lower():
                    print(f"  ERROR: daily quota exhausted on {DEFAULT_MODEL}: {msg.splitlines()[0]}", file=sys.stderr)
                    print(f"  Try GEMINI_MODEL=gemini-2.0-flash or wait until quota resets.", file=sys.stderr)
                    raise
                print(f"  attempt {attempt + 1}/3 failed: {msg.splitlines()[0]}", file=sys.stderr)
                if attempt == 2:
                    raise
                print(f"  sleeping {wait:.0f}s before retry…", file=sys.stderr)
                time.sleep(wait)
        assert resp is not None
        text = (resp.text or "").strip()
        # Save raw output for debugging (now JSON, not CSV).
        (in_dir / f"raw-chunk-{idx:02d}.json").write_text(text, encoding="utf-8")
        try:
            rows = parse_rows(text)
        except (json.JSONDecodeError, ValueError) as exc:
            print(f"  PARSE ERROR: {exc}", file=sys.stderr)
            print(f"  raw saved at raw-chunk-{idx:02d}.json", file=sys.stderr)
            rows = []
        all_rows.extend(rows)
        elapsed = time.time() - t0
        print(f"  → {len(rows)} rows in {elapsed:.1f}s")

    # Split rows into ok / needs_review based on import_status (col index 27).
    STATUS_IDX = SCHEMA_COLUMNS.index("import_status")
    ok_rows = [r for r in all_rows if (r[STATUS_IDX] or "").strip().lower() == "ok"]
    nr_rows = [
        r for r in all_rows
        if (r[STATUS_IDX] or "").strip().lower() == "needs_review"
    ]
    leftover = [
        r for r in all_rows
        if (r[STATUS_IDX] or "").strip().lower() not in ("ok", "needs_review")
    ]

    questions_csv = in_dir / "questions.csv"
    needs_review_csv = in_dir / "questions_needs_review.csv"
    write_csv(questions_csv, ok_rows)
    write_csv(needs_review_csv, nr_rows)

    print()
    print(f"  total rows       : {len(all_rows)}")
    print(f"  → ok             : {len(ok_rows)}  → {questions_csv}")
    print(f"  → needs_review   : {len(nr_rows)}  → {needs_review_csv}")
    if leftover:
        print(
            f"  → unclassified   : {len(leftover)}  "
            "(import_status was empty/garbage — inspect raw-chunk-NN.txt)"
        )
    print()
    print("Inspect the CSVs. If quality looks good, upload via")
    print("  /admin/questions/import  (the existing bulk-importer page).")


if __name__ == "__main__":
    main()
