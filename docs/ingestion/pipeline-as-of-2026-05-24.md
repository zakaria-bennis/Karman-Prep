# Karman Prep — PDF question-import pipeline as of 2026-05-24

Reference snapshot of the pipeline as it actually runs today, before redesign. Reads as a tour of the code on disk — every claim is anchored to a file path so you can verify it without digging.

The high-level flow has two front doors:
- **Web upload** → `pdf_processing_jobs` row → GitHub Action → `orchestrate.mjs` → six sub-stages → finished `quiz_questions` rows + grader verdicts.
- **Local shell** → `npm run pdf:extract` (extraction only) followed manually by `npm run pdf:fill` and `npm run pdf:grade`. Same scripts, different driver.

Both paths share the same scripts; the orchestrator just chains them and writes progress back to a DB row.

---

## 1. Current step-by-step pipeline

The orchestrator is `scripts/pdf-pipeline/orchestrate.mjs`. Stages are numbered as it logs them; async boundaries called out explicitly.

### Step 0 — PDF enters the system

Two ways:

- **Web upload (admin UI).** Operator drops a PDF on `/admin/pdf-pipeline/upload` (Cloudflare Worker). Server action uploads the bytes to Cloudflare R2 under `pdf-inbox/<jobId>/source.pdf` and inserts a `pdf_processing_jobs` row with `status='queued'`. Then it fires a GitHub `repository_dispatch` of type `process-pdf` carrying `client_payload.job_id`. **Async boundary #1**: HTTP request returns; everything else happens in CI.

- **Local shell.** Operator runs `npm run pdf:extract -- question-imports/incoming/<file>.pdf`. No job row, no R2, no CI. Drives `scripts/pdf-pipeline/run-extraction.mjs` which is a 3-step wrapper (extract + figures + CSV — no DB insert, no fill, no grade).

The job row schema is in `supabase/migrations/20260514002444_pdf_processing_jobs.sql`. Per-stage progress writes to a JSONB column `progress` (see `supabase/migrations/20260514002445_pdf_jobs_progress.sql`); the website polls that column to render the live progress bar.

### Step 1 — GitHub Actions runner boots (web path only)

`.github/workflows/process-pdf.yml`:
1. Listens for `repository_dispatch` (type `process-pdf`) or manual `workflow_dispatch`.
2. Spins up `ubuntu-latest` with `timeout-minutes: 360` (six hours; the earlier 60-minute cap was hit by long grader runs — run #26324439132 in comments).
3. Installs Node 22, pins npm to v11, runs `apt-get install -y poppler-utils` (for `pdftoppm`), then `npm ci`.
4. Exports secrets: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, plus the five R2 vars.
5. Runs `node scripts/pdf-pipeline/orchestrate.mjs --from-r2`.
6. On any failure, an `always`-style step PATCHes the job row to `status='failed'` as a backstop.

### Step 2 — Orchestrator downloads PDF from R2

`scripts/pdf-pipeline/orchestrate.mjs`:
- Reads `JOB_ID` from env, queries `pdf_processing_jobs` for `pdf_storage_path` and `source_pdf`.
- Streams the R2 object body into `Buffer.concat(...)` and writes it to `os.tmpdir()/pdf-job-<jobId>/<source_pdf>`.
- Instantiates `JobStatus` (`scripts/lib/job-status.mjs`) which is the helper that writes the `progress` JSONB on every stage transition.

### Step 3 — Stage 1/6: extract structure

`scripts/pdf-pipeline/extract-with-gemini.mjs` (despite the filename — it now calls Claude Sonnet 4.6 by default; see step 3 of §12 below).
- Reads the PDF into a `Buffer`. Aborts if > 18 MB (Gemini inline-upload limit; legacy guard, kept for Claude path too).
- Loads `question-imports/chatgpt/KarmanGPT.txt` as the system prompt (~the full 32-column schema + 89-slug taxonomy + figure rules + answer-key reconciliation).
- Calls `callClaude({ model: "claude-sonnet-4-6", pdf: {buf}, systemPrompt, toolSchema, maxTokens: 64_000 })`.
- The tool schema mirrors the Gemini `responseSchema` but lowercased — see the `schemaForAnthropic()` adapter at lines 336-350. Schema declares each question's fields (`question_text`, `choice_a..d`, `correct_answer`, `difficulty`, `topic_cluster` enum, `passage*`, `question_format`, `numeric_tolerance`, `domain` enum, `concept_slug`, `answer_source`, `source_page`, `import_status`, `has_figure`, `figure_alt`).
- Writes JSON to `/tmp/<pdf-stem>-gemini-extracted.json` (filename preserved for backward compat).
- Post-validates two things in JS:
  - Every `concept_slug` is in the canonical 89 (set at module top). Invalid → row's `import_status` becomes `needs_review`.
  - For R&W rows, `question_text` doesn't duplicate the first 80 chars of `passage` (see §5).
- Fast-fails if 0 questions extracted (exit code 4), so downstream stages don't silently process nothing.

### Step 4 — Stage 2/6: extract figures

`scripts/pdf-pipeline/extract-figures.mjs`:
- Filters extracted rows to `has_figure === true`.
- For each candidate (cached per page so duplicate figures on one page don't re-render):
  1. `pdftoppm -f <page> -l <page> -r 200 -png <pdf> <out>` renders the page to PNG at 200 DPI.
  2. Sends the PNG + a prompt to `callGemini({ model: "gemini-3.5-flash", image, responseSchema: bbox, thinkingBudget: 0 })`. Asks for `[y_min, x_min, y_max, x_max]` in Gemini's 0–1000 normalized space.
  3. Validates the bbox (must be in-bounds, ≥60 px each side, confidence not `low`). On invalid → whole-page fallback at 150 DPI; row flagged `needs_review` with reason "whole-page figure fallback used".
  4. Crops with `sharp.extract({left, top, width, height})`, normalises, sharpens, white-pads 24 px, resizes to 1500 px longest side, PNG encode compression level 9.
  5. Uploads to R2: `question-figures/<pdfStem>/p<page>-<i>.png` with `Cache-Control: public, max-age=31536000, immutable`.
  6. Writes the public URL into the row's `image_url` and the `figure_alt` seed into `image_alt`.
- Re-writes the JSON in place and emits a `<stem>-figures-log.json` side-car.

### Step 5 — Stage 3/6: emit CSV

`scripts/pdf-pipeline/json-to-import-csv.mjs`:
- 32 columns in locked order (see `CSV_HEADERS` at lines 59-92).
- Direct copies for most fields. Computes:
  - `content_hash = sha1(lowercase(strip_whitespace(question_text + "|" + choice_a + "|" + choice_b + "|" + choice_c + "|" + choice_d)))`. For `numeric_entry`, hash `question_text` alone.
  - `source_pdf = basename(pdfPath)`.
- Leaves blank: `hint`, `explanation_text`, `explanation_a..d`, `desmos_strategy` — filled at Stage 5.
- Writes `/tmp/<stem>-import.csv`.

**Note on the docs-vs-code mismatch:** `docs/ingestion/spec.md` §2 documents a "30-column" CSV. The code emits 32 (the spec doesn't list `image_url` + `image_alt`). The importer accepts both.

### Step 6 — Stage 4/6: import CSV to database

`scripts/pdf-pipeline/import-csv-direct.mjs`:
- Parses CSV inline (it has its own RFC-4180-ish parser at lines 97-151 — does not reuse `src/lib/question-bank/csv-parser.ts`).
- Loads `src/data/curriculum.ts` and regexes out `{id, concept_slug}` pairs to build `SLUG_TO_NODE` map. If the file is missing (e.g. on a leaner CI), inserts with `node_id=null` and logs a warning.
- Per row:
  - Validates `domain` against the 8 valid set; bad → error and skip.
  - Validates `concept_slug` against the regex-extracted map; unknown → still inserts with `node_id=null` and logs "inserting unattached" (does NOT flag for review at this layer; the slug constraint in the DB catches genuinely invalid slugs).
  - Maps difficulty (1–7) → legacy enum (`legacyDifficulty()` at lines 154-161) for back-compat with the older `difficulty` column. New column is `difficulty_level`.
  - Builds `insertPayload` covering all 30-ish columns including `image_url` / `image_alt` (added in fix commit `6866ed1`, see §12).
  - INSERTs into `quiz_questions`. On `code='23505'` (unique violation on `(source_pdf, content_hash)`), counts as `skipped_duplicate` and moves on. Other errors → `errored` list.
  - For MC rows, separately INSERTs 4 rows into `answer_choices` with the appropriate `is_correct` flag.

Note: `import-csv-direct.mjs` is a thin standalone script that writes directly to Supabase via service-role key. It does **not** call the more thorough `src/lib/question-bank/bulk-import.ts` (which handles base64 image uploads, R2 materialisation, and richer flag logic). The two import paths diverge — the web admin upload route hits `bulk-import.ts`, the orchestrator hits `import-csv-direct.mjs`.

### Step 7 — Stage 5/6: fill explanations

`scripts/content-generation/fill-all.mjs` runs three sub-scripts in series:

1. `generate-explanation-text.mjs` — Sonnet 4.6, all subjects. Pulls every `quiz_questions` row where `explanation_text` is null/empty, sends question + passage + choices to Claude with a depth-laddered prompt (R&W = synthesis paragraph, math = numbered steps with KaTeX). Writes back to `explanation_text`. Skips already-filled rows unless `--force`.
2. `generate-per-choice-explanations.mjs` — Sonnet 4.6, MC only. Fills `explanation_per_choice` JSONB ({A,B,C,D}). Heuristic for "needs work": empty OR < 30 chars without sentence-ending punctuation (OCR-truncation guard). Math MC also gets per-choice now (the doc says R&W only but the script doesn't gate on subject).
3. `generate-desmos-tips.mjs` — Haiku 4.5, math only. Fills `desmos_strategy` text. Returns `{useful: bool, tip: string}`; "Not applicable — solve algebraically" written when not useful so the field is always populated.

Each script uses `callClaude({ toolSchema })` for guaranteed structured JSON (LaTeX-in-strings can't break parsing).

### Step 8 — Stage 6/6: multi-vote grader

`scripts/question-audit/multi-vote-grader.mjs --from-db`:
- Pulls all `quiz_questions` rows (optionally filtered by env `FILTER_ANSWER_SOURCE`, `FILTER_IMPORT_STATUS`, `FILTER_SOURCE_PDF`).
- Three-tier cascade:
  - **Pass 1 (every row, parallel)**: Gemini Flash + DeepSeek V3 + Llama 3.3 70B (Groq). Tally votes; unanimous / majority / split.
  - **Pass 2 (Pass-1 disagreement or split)**: Gemini 2.5 Pro solo solve.
  - **Pass 3 (Pro also disagrees)**: Claude Opus 4.7 arbiter.
- Final verdict per row: `verified`, `verified_pro`, `verified_opus`, `likely_wrong`, `pass1_split`, `uncertain_parse`, `skip_no_text`, `error`.
- Writes `audit-out/multi-vote-grader-report.{json,md}`.
- Persists per-row verdict to `quiz_questions.grader_votes` JSONB (added in migration `20260523090000_quiz_questions_grader_votes.sql`).

### Step 9 — Orchestrator marks job done

`JobStatus.complete()` flips `pdf_processing_jobs.status='complete'` and writes the final progress blob.

**Note**: there's also a separate older `llm-grader.mjs` (used by the nightly audit-alert workflow + `audit-out/grader-report.json` for the Inspector UI) that does an 8-pass grader (figure coherence, explanation consistency, well-formedness, vision diff vs source PDF, slug verification). It is NOT in the main orchestrator path. The orchestrator uses the newer `multi-vote-grader.mjs` for the answer-key check only.

### Deprecated paths still on disk

- `scripts/pdf-pipeline/pull-pdf-job.mjs` — the original local Claude-API daemon, then the local Python-stage1+2 driver. Banner at top says DEPRECATED. Still callable but not wired to npm.
- `scripts/pdf-pipeline/finalize-pdf-job.mjs` — used by the Hybrid Lite flow that uploaded CSVs to R2 `csv-inbox/` for a cron route to pick up. The folder-watch cron route (`/api/cron/ingest-csv-inbox`) is still alive, used by the deprecated path; the current orchestrator never calls it.
- `question-imports/stage1_extract.py` / `stage2_classify.py` / `stage3_figures.py` — the older Python Tesseract+Gemini pipeline driven by `pull-pdf-job.mjs`. Still on disk.

---

## 2. Models / tools used at each step

| Step | Tool / Service | Model | Provider | Runs on | Why |
| --- | --- | --- | --- | --- | --- |
| 3 (extract structure) | LLM | `claude-sonnet-4-6` | Anthropic Messages API | GitHub Actions runner | Was `gemini-3.5-flash` until commit `c0d8546` (#153); switched to Claude because Gemini hits `RECITATION` filter on SAT prose. Tool-use enforces structured output. |
| 4 (figure bbox) | LLM (vision) | `gemini-3.5-flash` | Google Generative Language REST | GitHub Actions runner | Cheap (~$0.001/figure); 0–1000 normalised bbox format. `thinkingBudget: 0` to keep it fast. |
| 4 (page render) | binary | `pdftoppm` (Poppler) | local | GitHub Actions runner | 200 DPI render of each figure-bearing page. Installed via apt-get in the workflow. |
| 4 (image processing) | library | `sharp` (libvips) | local | GitHub Actions runner | Crop, normalise, sharpen, pad, resize. |
| 4 (image storage) | object storage | — | Cloudflare R2 (S3 API) | n/a | Public bucket `karmanprep-question-images`; key prefix `question-figures/<stem>/p<page>-<i>.png`. |
| 6 (DB insert) | client | `@supabase/supabase-js` (service-role key) | Supabase | GitHub Actions runner | Direct INSERTs to `quiz_questions` + `answer_choices`. |
| 7a (explanation_text) | LLM | `claude-sonnet-4-6` | Anthropic | GitHub Actions runner | Tool-use; max 1024 tokens R&W, 2048 math. |
| 7b (per-choice) | LLM | `claude-sonnet-4-6` | Anthropic | GitHub Actions runner | Tool-use; default max tokens. |
| 7c (Desmos) | LLM | `claude-haiku-4-5` | Anthropic | GitHub Actions runner | Tool-use; 512 tokens max. |
| 8 (grader Pass 1) | LLMs (parallel) | `gemini-2.5-flash`, `deepseek-chat` (V3), `llama-3.3-70b-versatile` | Google REST, OpenRouter (preferred) / DeepSeek direct, Groq | GitHub Actions runner | Three cheap independent voters. Llama is text-only. |
| 8 (grader Pass 2) | LLM | `gemini-2.5-pro` | Google | GitHub Actions runner | Solo tie-break on Pass-1 disagreements. |
| 8 (grader Pass 3) | LLM | `claude-opus-4-7` | Anthropic | GitHub Actions runner | Final arbiter on Pro disagreements. Tool-use. |
| (older grader) | LLMs | `gemini-2.5-flash` + `gemini-2.5-pro` + `llama-3.3-70b` fallback | Google + Groq | local / nightly Actions | The 8-pass `llm-grader.mjs`. Not in main orchestrator. |
| (table extraction backfill) | LLM (vision) | `gemini-2.5-flash` | Google | local | `scripts/figure-extraction/extract-table-data.mjs`. |
| (chart extraction backfill) | LLM (vision) | `gemini-2.5-pro` | Google | local | `scripts/figure-extraction/extract-chart-data.mjs`. |
| storage of source PDFs | object storage | — | Cloudflare R2 | n/a | `pdf-inbox/<jobId>/source.pdf`. |
| job orchestration | infra | — | GitHub Actions + `pdf_processing_jobs` table | CI | Status updates round-trip via `progress` JSONB. |

The `scripts/lib/llm-providers.mjs` module is the single import surface (`callClaude`, `callGemini`, `callDeepSeek`, `callGroq`). Notable quirks it handles:
- Sets a global `undici` Agent with 15-minute headers/body timeouts (Node's 5-min default tore down long Gemini calls — see comment lines 30-45 referencing Actions run #26315666375).
- `extractJsonObject()` bracket-balanced parse fallback because Claude tool-use outputs contain LaTeX like `$\frac{1}{2}$` whose `{}` braces break naive parsers.
- Logs `[gemini-diag]` / `[claude-diag]` stderr lines on every call — finish reason, safety ratings, token usage, content blocks. Added after silent empty responses (`text_chars:0`, `finishReason:RECITATION`).
- OpenRouter is preferred over direct DeepSeek (US-hosted, same price, gets around Texas gov network blocks on `api.deepseek.com`). HTTP headers are ASCII-only — the em dash in a previous `X-Title` header silently 500-errored every DeepSeek call, dropping one voter (comment lines 425-431).

---

## 3. Input / output format for each step

| Step | Input | Output |
| --- | --- | --- |
| 0 (upload) | PDF bytes from operator's browser | R2 object + `pdf_processing_jobs` row (`status='queued'`, `pdf_storage_path` set) |
| 1 (Action boot) | `repository_dispatch` payload `{job_id: "<uuid>"}` | env vars + checked-out repo on Ubuntu runner |
| 2 (R2 download) | `pdf_processing_jobs.id` + R2 key | local PDF file at `/tmp/pdf-job-<jobId>/<filename>` |
| 3 (extract) | PDF file path | `/tmp/<stem>-gemini-extracted.json`: array of question objects, each `{question_text, choice_a..d, correct_answer, difficulty, topic_cluster, passage, passage_a, passage_b, passage_intro, question_format, numeric_tolerance, domain, concept_slug, answer_source, source_page, import_status, import_flag_reason, has_figure, figure_alt}` |
| 4 (figures) | PDF + the JSON from step 3 | Same JSON mutated in place: `image_url` and `image_alt` filled where `has_figure=true`. Side-car `<stem>-figures-log.json` with bbox + bytes + URL per attempt |
| 5 (CSV) | JSON + PDF path (for `source_pdf` basename) | `/tmp/<stem>-import.csv` (32 columns) |
| 6 (DB) | CSV path | INSERTs into `quiz_questions` + `answer_choices`. stdout summary: `inserted / flagged / skipped_duplicate / errored` counts |
| 7a-c (fill) | Reads `quiz_questions` rows from DB | UPDATEs `quiz_questions.explanation_text`, `.explanation_per_choice`, `.desmos_strategy` |
| 8 (grade) | Reads `quiz_questions` rows from DB | `audit-out/multi-vote-grader-report.{json,md}` + writes `quiz_questions.grader_votes` JSONB |

### Sample JSON row out of step 3

```json
{
  "question_text": "Which choice completes the text with the most logical and precise word?",
  "choice_a": "remote",
  "choice_b": "vital",
  "choice_c": "obscure",
  "choice_d": "modest",
  "correct_answer": "B",
  "difficulty": 3,
  "topic_cluster": "Craft & Structure",
  "passage": "Researcher Philip Metzger continues to use Apollo's data, demonstrating that the missions' value to science ______.",
  "question_format": "multiple_choice",
  "domain": "craft_structure",
  "concept_slug": "precise-word-choice-in-context",
  "answer_source": "extracted",
  "source_page": 14,
  "import_status": "ok",
  "has_figure": false
}
```

### Sample CSV row out of step 5

```
"Which choice completes the text with the most logical and precise word?","remote","vital","obscure","modest","B","3","Craft & Structure",,,,,,,,,"Researcher Philip Metzger continues to use Apollo's data, demonstrating that the missions' value to science ______.",,,multiple_choice,,craft_structure,precise-word-choice-in-context,extracted,202603asiav1.pdf,14,a3b1c9d4e2f7,ok,,
```

### Sample grader_votes JSONB out of step 8

```json
{
  "graded_at": "2026-05-23T12:34:56Z",
  "stored_answer": "B",
  "verdict": "verified",
  "pass1": {"flash": "B", "deepseek": "B", "llama": "B", "consensus": "unanimous", "majority": "B"}
}
```

---

## 4. Current database schema

Source of truth: `src/types/supabase.ts` (lines 1798-1924 for `quiz_questions`, lines 11-42 for `answer_choices`) and the migrations under `supabase/migrations/`. The most recent shape comes from migrations:

- `20260514002443_question_ingestion.sql` (passage_*, domain, concept_slug, answer_source, source_pdf, source_page, content_hash, import_status, import_flag_type, import_flag_reason, the `(source_pdf, content_hash)` unique index).
- `20260518003000_concept_slug_check.sql` (89-slug CHECK).
- `20260518004500_quiz_questions_live_view.sql` (`is_live` generated column + `quiz_questions_live` view).
- `20260518130917_question_findings.sql`.
- `20260518140651_quiz_questions_figure_native.sql` (`figure_kind`, `figure_table_data`).
- `20260518153300_question_history.sql`.
- `20260519000000_quiz_questions_figure_chart.sql` (`figure_chart_data` + extends `figure_kind` to include `'chart'`).
- `20260523090000_quiz_questions_grader_votes.sql`.
- `20260524000000_rejected_questions.sql`.
- `20260524010000_edit_source_add_preview.sql`.

### `quiz_questions`

| Column | Type | Nullable | Default | Written by | Read by |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | DB | everything |
| `node_id` | `text` | yes | — | importer (slug→node map) | quiz selectors, admin |
| `question_text` | `text` | no | — | extractor (step 3) | renderer, grader, audit |
| `correct_answer` | `text` | no | — | extractor, grader fix | answer-eval, grader |
| `question_type` | enum | no | — | importer (derived from subject) | renderer |
| `answer_format` | enum (`multiple_choice` / `numeric_entry`) | no | `multiple_choice` | extractor | renderer, grader |
| `difficulty` | enum (`foundational`/`intermediate`/`advanced`/`mastery`) | no | — | importer (legacy mapping) | adaptive pick |
| `difficulty_level` | `int2` (1–7) | no | 4 | extractor | adaptive pick, audit |
| `display_order` | `int` | yes | — | — | admin sort |
| `subject` | enum (`reading`/`math`) | no | — | importer (derived from domain) | filters |
| `topic_cluster` | `text` | no | `''` | importer (derived from domain) | filters |
| `domain` | `text` (8-value CHECK) | yes | — | extractor | filters, adaptive |
| `concept_slug` | `text` (89-value CHECK) | yes | — | extractor | slug→node mapping |
| `passage` | `text` | yes | — | extractor | renderer |
| `passage_intro` | `text` | yes | — | extractor | renderer |
| `passage_a` | `text` | yes | — | extractor | renderer |
| `passage_b` | `text` | yes | — | extractor | renderer |
| `hint` | `text` | yes | — | future Sonnet pass (not currently filled by pipeline) | renderer |
| `explanation_text` | `text` | no | `''` | `generate-explanation-text.mjs` | renderer |
| `explanation_per_choice` | `jsonb` | yes | — | `generate-per-choice-explanations.mjs` | renderer |
| `desmos_strategy` | `text` | yes | — | `generate-desmos-tips.mjs` | renderer (math) |
| `numeric_tolerance` | `numeric` | yes | — | extractor (SPR) | answer-eval |
| `image_url` | `text` | yes | — | `extract-figures.mjs` → CSV → importer | renderer |
| `image_alt` | `text` | yes | — | extractor (seed) + figure stage | renderer (a11y) |
| `image_storage_path` | `text` | yes | — | `bulk-import.ts` `materializeImage()` | n/a (audit) |
| `figure_kind` | enum (`image`/`table`/`svg`/`chart` or null) | yes | `image` | `extract-table-data.mjs` / `extract-chart-data.mjs` | renderer (picks native vs raster) |
| `figure_table_data` | `jsonb` | yes | — | `extract-table-data.mjs` | `QuestionTable.tsx` |
| `figure_chart_data` | `jsonb` (`ChartFigure` shape in `src/types/chart.ts`) | yes | — | `extract-chart-data.mjs` | `ChartFigure.tsx` |
| `answer_source` | `text` (`extracted`/`inferred`/`hand_corrected`) | yes | `extracted` | extractor | grader filter, admin |
| `source_pdf` | `text` | yes | — | importer (from arg) | dedup key, admin filter |
| `source_page` | `int` | yes | — | extractor | admin |
| `content_hash` | `text` (SHA-1) | yes | — | CSV emitter | dedup key |
| `import_status` | `text` (`ok`/`needs_review`) | yes | `ok` | extractor + importer + figure stage | `is_live` generated column |
| `import_flag_type` | `text` (`skip`/`partial_emit`) | yes | — | extractor / importer | review UI |
| `import_flag_reason` | `text` | yes | — | extractor / importer / grader fix | review UI |
| `grader_votes` | `jsonb` | yes | — | `multi-vote-grader.mjs` | review UI badges |
| `is_live` | `bool` GENERATED | yes | `import_status IS NULL OR import_status = 'ok'` | DB | `quiz_questions_live` view |
| `is_flagged` | `bool` | yes | — | student flag action | admin |
| `flag_count` | `int` | yes | 0 | student flag action | admin |
| `created_at` / `updated_at` | `timestamptz` | yes | `now()` | DB / triggers | audit |

**Denormalised / mirrored fields worth calling out:**
- `subject` is derived from `domain` at import time. Drifts if domain changes without subject update.
- `topic_cluster` is derived from `domain` via the static 8-entry map. Same drift risk.
- `difficulty` (legacy enum) is derived from `difficulty_level` (1–7 int) via `legacyDifficulty()` (`scripts/pdf-pipeline/import-csv-direct.mjs:154-161`). Drift if one is updated without the other.
- `correct_answer` is duplicated by `answer_choices.is_correct=true`. Out-of-sync rows are a real risk; `apply-grader-fixes.mjs --from-db` updates both together.
- `source_pdf` is repeated on every question from the PDF — used as a filter key and as half of the dedup unique index.
- `image_url` is sometimes an R2 https URL (current pipeline), sometimes a `data:image/png;base64,…` URL (legacy ChatGPT path; `bulk-import.ts` calls `materializeImage()` to upload these on the fly).

### `answer_choices`

| Column | Type | Nullable | Default | Written by | Read by |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | DB | n/a |
| `question_id` | `uuid` FK → `quiz_questions(id)` | no | — | importer | renderer, grader |
| `letter` | enum (`A`/`B`/`C`/`D`) | no | — | importer | renderer |
| `choice_text` | `text` | no | — | importer | renderer |
| `is_correct` | `bool` | no | `false` | importer (matches `correct_answer`) | answer-eval |

### `question_findings` (`20260518130917_question_findings.sql`)

| Column | Type | Nullable | Default | Written by | Read by |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | DB | n/a |
| `question_id` | `uuid` FK ON DELETE CASCADE | no | — | `ingest-findings.mjs` | Inspector UI |
| `source` | `text` CHECK (`auditor`/`grader`) | no | — | ingest | Inspector UI |
| `severity` | `text` CHECK (`BLOCKING`/`WARNING`/`NOTICE`) | no | — | ingest | Inspector UI sort |
| `category` | `text` | no | — | ingest | Inspector UI filter |
| `code` | `text` | no | — | ingest | dedup + Inspector UI |
| `message` | `text` | no | — | ingest | Inspector UI |
| `value` | `text` | yes | — | ingest | Inspector UI |
| `detail` | `jsonb` | yes | — | ingest | Inspector UI |
| `resolved_at` | `timestamptz` | yes | — | Inspector resolve action | filters |
| `resolved_by` | `text` (Clerk id) | yes | — | Inspector | audit |
| `resolved_note` | `text` | yes | — | Inspector | audit |
| `created_at` | `timestamptz` | no | `now()` | DB | sort |

UNIQUE constraint on `(question_id, source, code)` — re-running upserts.

### `question_history` (`20260518153300_question_history.sql` + `…010000_edit_source_add_preview.sql`)

| Column | Type | Nullable | Default | Written by | Read by |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | DB | n/a |
| `question_id` | `uuid` FK ON DELETE CASCADE | no | — | server action | history UI |
| `before_state` | `jsonb` | no | — | server action (snapshot pre-edit) | restore button, diff UI |
| `after_state` | `jsonb` | no | — | server action (snapshot post-edit) | diff UI |
| `changed_fields` | `text[]` | no | `{}` | server action | history list summary |
| `edited_by` | `text` (Clerk id) | no | — | server action | audit |
| `edit_source` | `text` CHECK (`inspector`/`bulk`/`api`/`apply-fix`/`preview`) | no | — | server action | audit |
| `edit_note` | `text` | yes | — | server action | audit |
| `created_at` | `timestamptz` | no | `now()` | DB | sort |

### `rejected_questions` (`20260524000000_rejected_questions.sql`)

| Column | Type | Nullable | Default | Written by | Read by |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | DB | n/a |
| `original_id` | `uuid` | no | — | preview-validation page | restore logic |
| `question_snapshot` | `jsonb` | no | — | preview-validation page | restore |
| `choices_snapshot` | `jsonb` | no | `'[]'` | preview-validation page | restore |
| `rejected_at` | `timestamptz` | no | `now()` | DB | sort |
| `rejected_by_user_id` | `text` (Clerk id) | yes | — | preview-validation page | audit |
| `rejected_reason` | `text` | yes | — | preview-validation page | UI |
| `source_pdf` | `text` (denormalised from snapshot) | yes | — | preview-validation page | list filter |
| `source_page` | `int` (denormalised) | yes | — | preview-validation page | list |
| `domain` | `text` (denormalised) | yes | — | preview-validation page | list filter |
| `subject` | `text` (denormalised) | yes | — | preview-validation page | list |
| `question_preview` | `text` (denormalised) | yes | — | preview-validation page | list display |
| `created_at` | `timestamptz` | no | `now()` | DB | sort |

The denormalised columns are computed at insert from `question_snapshot`. They go stale if the snapshot ever changes — but the snapshot is immutable by design.

### `pdf_processing_jobs` (`20260514002444_pdf_processing_jobs.sql` + `…2445_pdf_jobs_progress.sql`)

Schema noted in step 1 above. Key bits: `status` enum (`queued`/`running`/`partial`/`complete`/`failed`), `pdf_storage_path` (R2 key), `module_status` JSONB (legacy 5-key shape from when the Claude-CLI runner processed each module separately — pipeline now just writes `key:complete` in the modern path), `progress` JSONB updated every stage.

---

## 5. How modules / question numbers / answer choices / answer keys are detected

The short version: **the LLM does it.** There is no regex parsing of page numbers, module headers, or letter labels in the current pipeline. The detection logic lives entirely in the prompts.

### What `extract-with-gemini.mjs` actually sends

System prompt (`question-imports/chatgpt/KarmanGPT.txt`) — kilobyte-sized doc that says (paraphrased):
- "Process every solvable question from this PDF."
- "Answer-key pages are at the END of the PDF — vision-process them carefully."
- "For each question, also produce `source_page` (1-indexed)."
- Full 32-column schema definitions.
- 89 concept-slug taxonomy.
- Difficulty calibration scale.
- KaTeX rules.
- Hand-correction protocol (key page reconciliation).

User prompt (in the script, lines 252-330):
- "Expected ~98 questions total across 4 modules" (R&W M1 ~27, R&W M2 ~27, Math M1 ~22, Math M2 ~22).
- "Do NOT stop early; if your output has < 80 questions you skipped pages."
- "EVERY R&W `question_text` MUST begin with one of these canonical phrases at a sentence boundary: 'As used in the text', 'Based on the text(s)', 'Which', 'What', 'How', 'According', 'The student'."
- WRONG vs RIGHT examples of how to split passage from stem.
- "Cross-reference each question's `correct_answer` against the answer-key page per §11 of the spec."
- Verification step: "Count your questions. If under 80, you have missed pages — extract them now."

So the answers are detected by: model reads the whole PDF (Claude's document content block; the entire PDF is base64-encoded as a single `application/pdf` document — see `callClaude` in `scripts/lib/llm-providers.mjs:226-235`), and reasons over module boundaries, question numbers, and the answer key all in one inference call. The choices (A/B/C/D) are pulled from the same response — the schema explicitly asks for `choice_a..d` per question.

**There is no OCR step.** The Claude path passes the PDF bytes directly; the model sees the rendered pages. There also isn't a per-page parser or a separate "scan the answer-key page" call — it's one document-level inference per PDF.

### What does NOT happen

- No regex on page text to find "Module 1" or "Question 17".
- No bbox detection for letter labels.
- No separate vision call for the answer-key page.
- No structured number→letter map. The model is just trusted to read the key and assign each row a `correct_answer`.

### What happens if it gets a question wrong

- If `answer_source` is set to `"inferred"`, the row arrives `import_status='needs_review'` with a flag reason like "Inferred answer (B) disagrees with key (D) — verify". The downstream multi-vote grader is the safety net for this — three LLMs vote, escalate to Pro, escalate to Opus.

**Caveat**: this works decently because Claude Sonnet 4.6 with a 64K token budget can keep an ~80-page PDF in working memory and produce ~98 structured rows in one go. The deprecated Python pipeline (`stage1_extract.py` + `stage2_classify.py`) did do per-page chunking and a separate Gemini vision call for the answer-key page; that code is still on disk but not in the active pipeline.

---

## 6. How screenshots / figures / charts / graphs / tables are handled

### Detection (step 3)

`extract-with-gemini.mjs` asks the extractor to set two fields per question:
- `has_figure: true` if the question's MEANING depends on a visual element on the PDF page (scatterplot, geometry diagram, table, chart, function plot, the stem says "the figure shown" or "based on the graph").
- `figure_alt`: 1–2-sentence description of what the figure shows. Used as the seed for both the bbox prompt and the eventual a11y alt-text.

### Bbox detection + crop (step 4)

`extract-figures.mjs` iterates all `has_figure=true` rows:
1. `pdftoppm` renders the `source_page` to PNG at 200 DPI (cached per page).
2. Sends the page PNG + a structured prompt to Gemini Flash. The prompt includes `question_text` (first 280 chars) and `figure_alt` as context, plus explicit guidance: include axis labels, ticks, legends, title; exclude question stem, answer choices, page headers/footers, UI chrome.
3. Gemini returns `{y_min, x_min, y_max, x_max, confidence, notes}` in 0–1000 normalised space (Gemini's standard for bbox; documented in the prompt as "y BEFORE x — this is Gemini's standard").
4. The script converts 0–1000 → absolute pixels using the actual page dimensions from `sharp.metadata()`.
5. Validates: bounds in-image, area ≥ 60 × 60 px, confidence not `low`.
6. If valid → `sharp.extract({left, top, width, height})` crops, then `polishImage()`:
   - `normalise()` — autocontrast.
   - `sharpen({sigma: 1, m1: 1, m2: 1.2, x1: 3})` — gentle unsharp mask.
   - `extend({top:24, bottom:24, left:24, right:24, background: white})` — 24-px white pad.
   - `resize(1500, 1500, {fit: "inside", withoutEnlargement: true})` — cap longest side at 1500 px.
   - PNG encode at compression level 9.
7. If bbox invalid OR confidence low → **whole-page fallback**: re-render at 150 DPI, polish it as-is, mark row `import_status='needs_review'` with reason "whole-page figure fallback used (bbox confidence=…, valid=…)".

### Upload + DB attachment

R2 key: `question-figures/<pdf-stem>/p<page>-<i>.png`. Cache-Control: `public, max-age=31536000, immutable`. The public URL (computed as `<R2_PUBLIC_URL>/<key>`) is written back into the row's `image_url`. The `figure_alt` seed becomes `image_alt`.

This URL eventually rides through the CSV (step 5) into the DB (step 6). The whole reason commit `6866ed1` exists is that **for months** the CSV-to-DB import step silently dropped `image_url` + `image_alt` from its `insertPayload`, so all those R2 figures were orphaned (0/654 rows had a URL despite hundreds of figures uploaded). Now fixed; backfilled via `scripts/maintenance/backfill-figure-urls.mjs`.

### `figure_kind` paths (native rendering)

`quiz_questions.figure_kind` is one of `image` (default raster), `table` (HTML), `svg` (reserved), `chart` (SVG from data). These are populated by separate backfill scripts, run manually after the main pipeline:

- **Tables (`figure_kind='table'`).** `scripts/figure-extraction/extract-table-data.mjs`. For every row with `image_url` set AND `figure_table_data IS NULL` AND `figure_kind IN (NULL, 'image')` (partial index `idx_quiz_questions_figure_pending_table`), calls `gemini-2.5-flash` vision on the image URL with a prompt that asks "is this a data table?". If yes, transcribes to `{caption, header_row[], rows[][], footer_note}` JSON (KaTeX wrapping for any math). Sets `figure_kind='table'` and writes `figure_table_data`. If not a table, sets `figure_kind='image'` (terminal — won't re-call). Renderer: `QuestionTable.tsx`.

- **Charts (`figure_kind='chart'`).** `scripts/figure-extraction/extract-chart-data.mjs`. Same partial-index pattern. Calls `gemini-2.5-pro` (Pro is needed for spatial reasoning — Flash often misses). Returns a `ChartFigure` JSON matching `src/types/chart.ts` (scatter / line / bar / function plot, axes, series, confidence 0–1). **Auto-publish threshold: 0.8.** Above → write `figure_chart_data` + flip `figure_kind='chart'`. Below → write the JSON but leave `figure_kind='image'` so the Inspector can flag it for manual review. Renderer: `ChartFigure.tsx`.

- **SVG primitives (`figure_kind='svg'`).** Reserved for Phase 4c (small geometry diagrams). No extractor wired yet.

The CHECK constraint on `figure_kind` was added in `…140651_quiz_questions_figure_native.sql` and extended in `…19000000_quiz_questions_figure_chart.sql`.

---

## 7. How missing exponents / parentheses / math notation are repaired

**Short answer: largely they aren't, in the extraction step.** The repairs happen at three different layers, each catching a different slice:

1. **Prompt-level (extractor and post-fill).** The Sonnet system prompt for `generate-explanation-text.mjs` (`scripts/content-generation/generate-explanation-text.mjs:67-97`) says: "KaTeX is REQUIRED for all math notation. Wrap fractions $\dfrac{a}{b}$, exponents $x^2$, square roots $\sqrt{5}$, etc." The model produces the explanation_text already in KaTeX form. But the **stem** that comes out of step 3 is taken at face value — there's no "rewrite stem to add missing exponents" pass. The extractor prompt does ask the model to use `^` and `\frac` properly, but if the PDF rendered "x2" and Sonnet doesn't fix it on the way out, the stem stays "x2".

2. **Audit-time detection (no repair).** `src/lib/question-bank/audit-rules.ts:319-340` ships rule `F1_bare_digit_after_letter`:
   ```js
   const re = /(?<![\^_0-9\\])([a-zA-Z])([2-9])(?![0-9])/g;
   ```
   Inside any `$…$` math region, a bare letter immediately followed by 2-9 (not preceded by `^`, `_`, digit, or backslash) is flagged as "math expression has bare letter+digit (likely missing exponent)" with severity WARNING and category `ocr_pattern`. The audit only flags; it does not auto-repair. The finding lands in `question_findings` for the admin to fix via the Inspector UI.

3. **Older grader's vision cross-check (no repair).** `scripts/question-audit/llm-grader.mjs` Pass 7 renders the source PDF page and asks Gemini Flash to diff the extracted CSV text against what's visible on the page. The prompt explicitly lists "Missing exponents (page shows 'x²' but extracted has 'x2')" as a thing to flag. Findings land in `question_findings` with category `ocr_mismatch`. Again, detection only — no rewrite.

4. **Brace balance.** `audit-rules.ts:226-247` has rule `B5_unbalanced_braces` which scans every text field and reports if `{` / `}` don't balance. Severity BLOCKING. Catches `\frac{1}` (missing `}`). Detection only.

5. **KaTeX rendering.** `MathText.tsx` calls `katex.renderToString(latex, {throwOnError: false, ...})`. Bad LaTeX falls back to displaying the raw string or `<pre>{latex}</pre>`. No server-side KaTeX validation step — bad math survives all the way to the renderer where it shows up as a fallback.

**Summary:** the pipeline detects but does not repair math notation. The only "repair" is whatever the LLM happens to write correctly in its initial extraction. The fill scripts can produce new KaTeX-correct explanations on top of broken stems, which is why some questions look like "x2 + 5x = 37" in the stem but render the explanation with $x^2 + 5x = 37$.

---

## 8. How questions are classified into the 89 slugs

The 89-slug taxonomy is the canonical "what topic does this question test" vocabulary. Source of truth: `src/lib/question-bank/taxonomy.ts:56-61`, derived at module load from `src/data/curriculum/{math,reading-writing}.ts`. The same list is duplicated in three other places for use cases that can't import the TS module:

- `scripts/pdf-pipeline/extract-with-gemini.mjs:80-178` (hardcoded `CONCEPT_SLUGS` array — used for post-validation).
- `question-imports/chatgpt/KarmanGPT.txt` §6 (Claude Sonnet's system prompt for extraction).
- `supabase/migrations/20260518003000_concept_slug_check.sql` (DB CHECK constraint, marked NOT VALID so legacy rows aren't re-validated).

### Classification path

**The LLM emits the slug directly.** No separate classifier model, no fuzzy match. In step 3, the extractor's tool schema declares:

```json
"concept_slug": { "type": "STRING" }
```

Notice: **no `enum` constraint at the schema layer**. The comment at `extract-with-gemini.mjs:212-217` explains why:

> Gemini 3.5 Flash rejects responseSchema enums larger than ~50 items (probed empirically). Our taxonomy has 89 slugs, so we cannot enforce at the schema layer. Instead we lean on the system prompt to list them and post-validate after extraction — any invalid slug flips import_status to needs_review.

So Sonnet is told via the system prompt to pick one of 89 specific slugs (the prompt enumerates them, grouped by domain), and emits whatever string it likes. Then post-validation in `extract-with-gemini.mjs:441-472` does:

```js
const validSlugs = new Set(CONCEPT_SLUGS);
for (const r of rows) {
  if (!validSlugs.has(r.concept_slug)) {
    invalidSlugCount++;
    if (r.import_status === "ok") {
      r.import_status = "needs_review";
      r.import_flag_reason = `Invalid concept_slug "${r.concept_slug}" — not in 89-slug taxonomy`;
    }
  }
}
```

### What happens at import time

`import-csv-direct.mjs:201-212`:
- Looks up `concept_slug` in `SLUG_TO_NODE` (a map built by regex-parsing `src/data/curriculum.ts` at script start).
- If hit → sets `node_id` to the matching node id.
- If miss but the slug is non-empty → still inserts with `node_id=null`, logs "inserting unattached" but does NOT add a flag. The DB CHECK constraint on `concept_slug` is `NOT VALID` so it doesn't bounce historical bad slugs, but new INSERTs with a bad slug WILL hit the constraint.

`src/lib/question-bank/bulk-import.ts:191-193` (the richer importer for the web admin path) is stricter:

```ts
if (r.concept_slug && !isValidSlug(r.concept_slug)) {
  throw new Error(`unknown concept_slug "${r.concept_slug}"`);
}
```

So unknown slugs error there. The two import paths disagree slightly.

### "Unattached" bank questions

If `concept_slug` is valid but the slug→node mapping isn't found (e.g. the curriculum file isn't checked into the runner's filesystem, or the slug has no corresponding node yet), the question lands in the bank with `node_id=null`. The admin Question Review UI at `/admin/questions/review` is responsible for triage. The `quiz_questions_bank_idx` partial index (`WHERE node_id IS NULL`) is the support for that page.

### Slug verification (the OLDER grader's Pass 8)

`scripts/question-audit/llm-grader.mjs:929-1017` does a separate per-row slug check: pass the full 89-slug catalog grouped by domain to Gemini Flash, ask "given this question, does this slug fit?" If no, suggest a replacement. Lands as a `concept_slug_mismatch` WARNING finding. **This pass runs in the nightly audit, not in the main process-pdf orchestrator.** The Inspector "Apply suggested slug" button (mentioned in `ingest-findings.mjs:273-275`) can one-click swap.

---

## 9. How explanations and tips are generated

`scripts/content-generation/fill-all.mjs` runs three scripts in series. Each is **idempotent on the `explanation_*` / `desmos_strategy` columns** — re-runs are safe; rows with content already there are skipped unless `--force`.

### Stage 7a — `explanation_text` (Sonnet 4.6, all subjects)

`scripts/content-generation/generate-explanation-text.mjs`:
- Query: `SELECT id, question_text, correct_answer, difficulty, domain, subject, answer_format, explanation_text, passage*, image_alt, answer_choices(letter, choice_text)` filtered by `explanation_text.is.null OR explanation_text.eq.''`.
- Per row, picks a system prompt:
  - **R&W** (`SYSTEM_PROMPT_RW`, lines 54-67): "synthesis paragraph the student sees when they get a question wrong"; depth scales 1–2 / 2–3 / 3–4 sentences by difficulty; "ALWAYS anchor reasoning to the passage. Quote specific phrases."
  - **Math** (`SYSTEM_PROMPT_MATH`, lines 69-97): "full step-by-step walkthrough"; 2–3 / 4–6 / 6–10 numbered steps by difficulty; "KaTeX is REQUIRED for all math notation"; lists SAT-Math trap names (Sign error, Inverse error, Exponent rule confusion, etc.) to name in the walkthrough; ends with a CHECK (substitute the answer back).
- Calls `callClaude({ model: "claude-sonnet-4-6", systemPrompt, toolSchema: {explanation_text: string}, maxTokens: isMath ? 2048 : 1024 })`. Tool-use guarantees clean JSON despite the LaTeX/quote content.
- Rejects answers < 30 chars.
- UPDATE `quiz_questions SET explanation_text=…, updated_at=now()` on success.
- Partial failure: on `QuotaExhaustedError` (Anthropic), stops the whole batch cleanly. On other API errors, logs and continues.

### Stage 7b — `explanation_per_choice` (Sonnet 4.6, MC only)

`scripts/content-generation/generate-per-choice-explanations.mjs`:
- Query: rows with `answer_format='multiple_choice'`. Filter in JS to rows where `lettersNeedingExplanation()` returns non-empty.
- `lettersNeedingExplanation()` (lines 90-108): a letter needs work if the existing entry is empty OR `< 30 chars` AND doesn't end with sentence punctuation (OCR-truncation guard). The Force flag overrides.
- System prompt (lines 53-62): "For the CORRECT choice: explain the reasoning… For each WRONG choice: name the trap or misconception ('sign error', 'off-by-one', 'swapped units', 'misread the question', 'common partial-completion'). Each 50–150 chars."
- `callClaude({ toolSchema: {A,B,C,D: string} })`.
- Merges into existing JSONB (preserves human-written entries that were long enough); writes only the letters in `need`. Rejects entries < 20 chars.
- Despite the doc comment at the top saying "R&W MC only", the script doesn't gate on subject — it runs on math MC too. (One of those reality-vs-docs drift moments.)

### Stage 7c — `desmos_strategy` (Haiku 4.5, math only)

`scripts/content-generation/generate-desmos-tips.mjs`:
- Query: `WHERE subject='math'` filtered by `desmos_strategy.is.null OR desmos_strategy.eq.''`.
- System prompt (lines 50-71): "When Desmos is useful, write a real tip with concrete syntax (`y = x^2 - 4x + 3`, `y₁ ~ a + bx`). When NOT useful, write 'Not applicable — <one sentence why>.' Maximum 2 sentences, < 200 chars."
- `callClaude({ model: "claude-haiku-4-5", toolSchema: {useful: bool, tip: string}, maxTokens: 512 })`.
- Always writes the tip (even when `useful=false`) — the field is consistently populated; UI decides whether to show.

### `hint` field

**Not currently filled by the pipeline.** The CSV header includes it, the DB has a column, the routine prompt says to generate it, but no script in `content-generation/` targets it. Empty for every pipeline-imported row.

### Partial failure handling

- All three scripts catch `QuotaExhaustedError` from `llm-providers.mjs` and break out of the loop with "QUOTA EXHAUSTED — stopping". Already-written rows are kept.
- Non-quota API errors are caught per-row, counted, and the script continues to the next row.
- The orchestrator (stage 5/6) treats the script's exit code as the failure signal — a non-zero exit means the orchestrator marks the whole pipeline `failed`, even if 90% of rows got their explanations.

---

## 10. How KaTeX is validated

### Server-side audit checks

`src/lib/question-bank/audit-rules.ts` ships two formatting checks per text field (`question_text`, `hint`, `explanation_text`, `passage*`, `choice_*`):

- **`B1_unbalanced_dollar`** (`audit-rules.ts:214-225`) — counts non-escaped `$` delimiters; an odd count fires BLOCKING. Catches "$x^2 = 4 (with a missing closing `$`).
- **`B5_unbalanced_braces`** (`audit-rules.ts:226-247`) — scans for stack-balanced `{ }` across the whole field, not just inside math regions. Catches `\frac{1}` (missing brace), `\sqrt{x}}` (extra closing).

These are deterministic JS checks, run by `audit-csv.mjs` against CSVs or DB rows, then ingested into `question_findings` by `ingest-findings.mjs`. Nightly cron via `.github/workflows/audit-nightly.yml`. No actual KaTeX rendering is attempted server-side.

### Client-side rendering

`src/components/learn/MathText.tsx:137-147`:

```ts
function renderKaTeX(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode,
      output: "htmlAndMathml",
    });
  } catch {
    return displayMode ? `<pre>${latex}</pre>` : latex;
  }
}
```

`throwOnError: false` means KaTeX returns markup with a red-tinted error span for invalid syntax instead of throwing. Truly catastrophic LaTeX (which shouldn't reach here because the rendering uses `htmlAndMathml`) falls back to the raw string in a `<pre>` block.

The `$…$` and `$$…$$` matcher in `parse()` was patched (lines 35-79) to accept `\$` so that "$\$80$ is on sale" doesn't get truncated as a missing-currency mid-math string.

### What's NOT done

- No automated test renders every question in the DB to surface render-time KaTeX warnings.
- No server-side KaTeX validation in the importer or fill scripts. A bad `\frac{1}{` lands in `explanation_text` and is only caught by the next audit run.
- No CI step that fails on a KaTeX-broken question.

The visual-regression suite (`tests/visual/`) captures personas × pages and would catch broken-looking math if a relevant page were in the persona set, but it's not exhaustive over the question bank.

---

## 11. How grader conclusions are stored

Two storage surfaces; both wire into the admin Review UI.

### `quiz_questions.grader_votes` JSONB (per-row latest verdict)

Migration: `supabase/migrations/20260523090000_quiz_questions_grader_votes.sql`. Documented shape:

```jsonc
{
  "graded_at": "2026-05-23T12:34:56Z",
  "stored_answer": "B",
  "verdict": "verified" | "verified_pro" | "verified_opus" |
             "likely_wrong" | "pass1_split" | "pass1_disagree" |
             "pass2_disagree" | "uncertain_parse" | "error",
  "pass1": { "flash": "B", "deepseek": "B", "llama": "C",
             "consensus": "majority" | "unanimous" | "split",
             "majority": "B" },
  "pass2_pro": "B",      // present only when Pass 2 ran
  "pass3_opus": "B"      // present only when Pass 3 ran
}
```

Written by `multi-vote-grader.mjs:554-598` (`persistGraderVotesToDb()`). Each `quiz_questions` row gets one latest grader_votes; re-grading overwrites. PR #158 added the per-LLM badges in the review queue that read this column.

### `question_findings` table (multi-source, multi-finding)

Migration: `20260518130917_question_findings.sql`. Shape in §4. Populated by `scripts/question-audit/ingest-findings.mjs`, which reads:
- `audit-out/audit-report.json` (output of the deterministic auditor `audit-csv.mjs`) → category `schema` / `formatting` / `cross_field` / `quality` / `ocr_pattern`, source `auditor`.
- `audit-out/grader-report.json` (output of `llm-grader.mjs`, the 8-pass grader — NOT `multi-vote-grader.mjs`) → categories `llm_grader`, `figure`, `explanation`, `well_formed`, `ocr_mismatch`, `taxonomy`. Source `grader`.

Per the unique constraint `(question_id, source, code)`, re-running upserts. `ingest-findings.mjs` also re-opens findings whose `resolved_note` starts with "Auto-resolved" if the same code re-fires (triage-memory feature from PR #132).

### Relationship between findings and the multi-vote pass1 + adjudicator + final

The multi-vote-grader writes its verdict directly to `grader_votes` JSONB. It does **not** write to `question_findings` itself — that surface is fed by the older `llm-grader.mjs`. There are effectively two grader systems in play:

| | `multi-vote-grader.mjs` | `llm-grader.mjs` |
| --- | --- | --- |
| Verdict shape | unanimous/majority/split + Pro/Opus escalation | 8 passes (solve, figure coherence, explanation, well-formed, vision diff, slug) |
| Storage | `quiz_questions.grader_votes` JSONB | `audit-out/grader-report.json` → `question_findings` table via `ingest-findings.mjs` |
| UI | Review queue per-row badges | Inspector findings panel |
| Wired into orchestrator? | Yes — stage 6/6 | No — runs separately in `audit-alert.yml` |

Both are in active use. Likely a redesign target.

### The CSV-mode older path (legacy)

`audit-csv.mjs` and `llm-grader.mjs` historically operated on CSV files (pre-DB). `ingest-findings.mjs:75-91` `matchQuestionId()` falls back to `(source_pdf, source_page, question_text_snippet)` matching when the finding doesn't carry a `question_id` directly — used to link CSV-derived findings to DB rows after import.

---

## 12. Current failure cases the team has noticed

Pulled from code comments, `docs/bugs.md`, the recent audit, and `git log`.

### Recently fixed (commits visible in `main`)

- **`image_url` silently dropped during DB import.** `Fix: import-csv-direct dropping image_url + image_alt on insert (#162)` — commit `6866ed1`. The `insertPayload` in `import-csv-direct.mjs` literally didn't include `image_url` or `image_alt`. Every figure extracted by `extract-figures.mjs` was uploaded to R2 correctly but orphaned. 0/654 rows in the bank had a question-figures URL despite hundreds existing in R2. Backfilled via `scripts/maintenance/backfill-figure-urls.mjs`.
- **Prod hydration crash from `toLocaleString`.** `Hotfix: remove toLocaleString from badge — caused prod hydration crash (#160)`. The grader-votes badge had `title={`graded ${new Date(votes.graded_at).toLocaleString()}`}`. Cloudflare Worker (UTC) vs browser (PT) produced different strings → React hydration mismatch → every admin page errored "This page couldn't load."
- **R&W question_text duplicating the passage.** `R&W stem/passage split — prompt + backfill fixer (#157)`. Extractor was putting passage prose into `question_text` instead of just the stem ("Which choice…"). Fix had two parts: prompt update (enumerate the 7 canonical stem starters: "As used in the text", "Based on the text", "Which", "What", "How", "According", "The student") AND a backfill script. Post-validation in `extract-with-gemini.mjs:459-472` now flags rows where `question_text` starts with the first 80 chars of `passage`.
- **Gemini returning a bare array instead of `{questions: [...]}`.** `Fix: accept bare array from Gemini + fast-fail on 0 questions (#152)`. The schema asked for `{questions: [...]}` but Gemini sometimes dropped the outer wrapper. 100 KB of valid extraction data was silently discarded because `result?.questions` was `undefined`. Fix accepts both shapes; also added fast-fail with exit code 4 if 0 questions returned.
- **Gemini `RECITATION` filter on SAT prose.** `Switch PDF extractor from Gemini Flash to Claude Sonnet 4.6 (#153)`. Gemini has a non-deterministic copyright filter that blocks long SAT passages — `finishReason: RECITATION`, `text_chars: 0`. Confirmed on Actions run #26322250769. Switched to Claude Sonnet 4.6 (no equivalent filter for educational content). Filename `extract-with-gemini.mjs` was kept.
- **DeepSeek voter silently failing.** Em-dash character in the `X-Title` HTTP header threw "character > 255" on every OpenRouter call, zeroing out one of the three voters with no log line. Fixed in `llm-providers.mjs:425-431` — ASCII-only headers.
- **Gemini `maxTokens=32_000` truncating Sonnet's structured output mid-stream.** Fixed in `Claude diagnostics + bump maxTokens to 64K (#154)`. 98 questions × ~500 tokens needs ~50K, headroom required.
- **Hidden Llama voter failures.** Errors on Pass 1 voters were swallowed silently — `ok=false` with no detail. `multi-vote-grader.mjs:410-417` now includes `error` text in the persisted verdict so silent failures are visible in the report.
- **GitHub Actions HTTP timeout.** `undici` default 5-minute `headersTimeout` tore down long Gemini calls on Actions networking. Fixed in `llm-providers.mjs:36-45` with a 15-minute ceiling. Triggering bug: Actions run #26315666375.
- **60-minute Actions cap.** Grader was at 85/654 when the job got cancelled at 60 min. `process-pdf.yml` now sets `timeout-minutes: 360`.

### Known live failure modes (from `docs/bugs.md` 2026-04-28 + audit)

- **Diagnostic test isn't connected to the question bank** (CRIT-1). Hand-typed 35 questions in `src/data/diagnostic-questions.ts`. Submit endpoint trusts the browser to say whether each answer was correct (CRIT-5).
- **Slug+node typeahead pain in Review UI** (bug #1). 89-node list manually picked for every accept; auto-pick from slug not done.
- **Per-choice explanations + hint + desmos hidden from Review UI** (bugs #5 + #6). DB has the data; the Review tab only renders `explanation_text`.
- **Paste-from-Finder doesn't work** (bug #7). Browser security; drag-drop dropzone is the fix.
- **Web upload PDF → 4-module fan-out architecture** (bug #3). Originally aspirational; the current Sonnet-with-document path handles 80–98-question PDFs in one inference, so the multi-Claude-session design didn't ship.
- **Cross-text questions can hash-collide** (CRIT-4). `content_hash` doesn't include passages. The CSV emitter still doesn't (per `json-to-import-csv.mjs:102-120`). `routine.md` §7 documents the issue and says "forward-only fix" but the script wasn't updated.
- **`fetchAllQuestionsForAdmin` doesn't filter `import_status`** (CRIT-2). The `is_live` generated column + `quiz_questions_live` view mitigate this — student-facing code should read the view; admin code reads the table. Still relies on convention not being broken.
- **Multi-source taxonomy drift** (CRIT-3). 89 slugs canonical in `taxonomy.ts`; older drafts of the docs said 72; some tests still reference the legacy slugs. Mostly cleaned in recent migrations but the test issue may still bite.
- **Whole-page figure fallback overused.** `extract-figures.mjs:289-297` — if Gemini bbox confidence is `low` or invalid, the whole rendered page becomes the figure (with `needs_review` flag). On figure-dense pages, this happens a lot.
- **Image-bearing rows auto-flagged for review** (`bulk-import.ts:204-218`). Every image row lands `needs_review` for a human visual sanity check, regardless of figure quality. Creates a constant review backlog.
- **`SKIP_STAGE3` shortcut in the deprecated path.** `pull-pdf-job.mjs` honors `SKIP_STAGE3=true` to skip figure extraction. The new path has no equivalent flag — if figures fail you have to debug.
- **Two parallel import code paths.** `import-csv-direct.mjs` (used by orchestrator) and `src/lib/question-bank/bulk-import.ts` (used by admin web upload). They have different validation, different image-handling, different flag logic. A real source of drift.
- **Two parallel grader systems.** `multi-vote-grader.mjs` (orchestrator stage 6) writes `grader_votes` JSONB. `llm-grader.mjs` (nightly audit) writes `question_findings` rows. Inspector reads the latter; Review queue reads the former.
- **Llama as silent fallback.** When Gemini Flash refuses (RECITATION) or parse-fails on a row in the older grader, Llama via Groq fills in. The grader keeps a `pass1_solver` field so this is visible in the report, but rows graded by Llama may have different quality characteristics — there's no per-solver agreement floor.

### Inline `console.warn` patterns

A scan of `console.warn` / `console.error` in the pipeline scripts surfaces:
- `pdftoppm` failure on a page → throws (`extract-figures.mjs:118-122`); the row's figure is errored.
- DB write failure on a per-row UPDATE → counts as `errors++` and continues (every `generate-*.mjs`).
- `[progress] failed to update job` → warned but never aborts (`pull-pdf-job.mjs:299-301`). Progress is "purely a UI signal, not a correctness requirement."
- `[gemini-diag]` / `[claude-diag]` lines on every call. Useful but voluminous in CI logs.

---

## 13. Current cost / time per PDF or per question

### Wall time per PDF

Stage weights in `scripts/lib/job-status.mjs:54-61` (tuned from observed runs):
- extracting (Sonnet): ~35 s (8% of weight) — but real production runs are often 5–8 min on a 90-page PDF with ~98 questions and 64K output tokens.
- figures (bbox + crop + R2 per figure): ~45 s (12%) — typical figure-bearing PDFs have ~30 figures.
- csv: ~1 s (1%).
- importing: ~5 s (4%).
- filling (Sonnet + Sonnet + Haiku across the whole bank): ~15 min (60%) — note this runs across ALL un-filled bank rows, not just the new PDF's rows.
- grading (multi-vote across the whole bank): ~5 min (15%).

Total budgeted ceiling: `timeout-minutes: 360` (6 hours). Typical observed: 5–10 minutes per PDF when the fill + grade stages aren't doing a giant backlog.

### Cost per PDF (~98 questions)

From `extract-with-gemini.mjs:35` and the ADR `0004-gemini-local-pdf-pipeline.md` plus the per-script comments. **All numbers are documented in comments; actual token logging exists (`[claude-diag]` / `[gemini-diag]` stderr lines log `input_tokens` / `output_tokens` per call) but isn't aggregated:**

| Stage | Documented cost | Source |
| --- | --- | --- |
| extract (Sonnet 4.6) | "~$0.03 per PDF" (was Flash); Sonnet is ~5–10× pricier than Flash on the same input → estimated $0.15–$0.30 per PDF | `extract-with-gemini.mjs:27-29` |
| figures (Gemini Flash bbox) | "~$0.001 per figure" → ~$0.03 for ~30 figures | `extract-figures.mjs:33-35` |
| import | DB writes only, no LLM | — |
| explanation_text (Sonnet) | ~$0.02/question (longer math) → ~$1.50/PDF, ~$160 across the documented 100-PDF batch | `fill-all.mjs:38-43`, `generate-explanation-text.mjs:27-29` |
| per-choice (Sonnet) | ~$0.013/question on MC; ~$0.60/PDF; ~$20 across 1500 candidates | `generate-per-choice-explanations.mjs:29-33` |
| desmos (Haiku) | ~$0.002/question; ~$0.10/PDF; ~$6 across 3000 math | `generate-desmos-tips.mjs:27-29` |
| grader Pass 1 (Flash + DeepSeek + Llama) | ~$0.025/PDF | `multi-vote-grader.mjs:48-53` |
| grader Pass 2 (Pro on ~5% disagreements) | ~$0.013/PDF | same |
| grader Pass 3 (Opus on ~1% double-disagreements) | ~$0.050/PDF | same |
| Total per PDF | "~$2.20/PDF" documented; "~$2.25/PDF" in ADR; actual closer to **$2.30–$2.50/PDF** with the Sonnet switch | `fill-all.mjs:43`, ADR |

**These are author-supplied estimates in code comments.** They were calibrated for Gemini Flash extraction; the recent switch to Claude Sonnet 4.6 for extraction (commit `c0d8546`) likely added $0.10–$0.25 per PDF that the documented numbers haven't been updated to reflect. **CLEARLY MARKED AS ESTIMATE.**

The Anthropic and Gemini API responses are logged per call to stderr (input/output tokens) but no script aggregates them into a cost summary per PDF. To compute actual cost, parse the `[gemini-diag]` / `[claude-diag]` lines from `audit-out/` or workflow logs.

### Cloudflare R2 cost

Negligible. `question-figures/<stem>/p<page>-<i>.png` images at ~140 KB each; bucket-level cost is sub-dollar even at 10,000 questions. Storage is `public, max-age=31536000, immutable` so re-imports of the same figure are read-cache hits.

### GitHub Actions cost

Within free tier on standard `ubuntu-latest` runners. No per-PDF charge until the 2000 free minutes per month run out, which 100 PDFs at 10 min each won't hit (1000 min).

---

## Appendix: file paths quick index

- Orchestrator entry: `/Users/zakariabennis/Karman-Prep/scripts/pdf-pipeline/orchestrate.mjs`
- Local-only wrapper: `/Users/zakariabennis/Karman-Prep/scripts/pdf-pipeline/run-extraction.mjs`
- Stage 1 extractor: `/Users/zakariabennis/Karman-Prep/scripts/pdf-pipeline/extract-with-gemini.mjs` (now Claude Sonnet)
- Stage 2 figures: `/Users/zakariabennis/Karman-Prep/scripts/pdf-pipeline/extract-figures.mjs`
- Stage 3 CSV emit: `/Users/zakariabennis/Karman-Prep/scripts/pdf-pipeline/json-to-import-csv.mjs`
- Stage 4 DB import: `/Users/zakariabennis/Karman-Prep/scripts/pdf-pipeline/import-csv-direct.mjs`
- Stage 5 fill driver: `/Users/zakariabennis/Karman-Prep/scripts/content-generation/fill-all.mjs`
- Stage 5a–c fill scripts: `/Users/zakariabennis/Karman-Prep/scripts/content-generation/{generate-explanation-text,generate-per-choice-explanations,generate-desmos-tips}.mjs`
- Stage 6 grader: `/Users/zakariabennis/Karman-Prep/scripts/question-audit/multi-vote-grader.mjs`
- LLM client library: `/Users/zakariabennis/Karman-Prep/scripts/lib/llm-providers.mjs`
- Job-status helper: `/Users/zakariabennis/Karman-Prep/scripts/lib/job-status.mjs`
- Older 8-pass grader: `/Users/zakariabennis/Karman-Prep/scripts/question-audit/llm-grader.mjs`
- Deterministic auditor: `/Users/zakariabennis/Karman-Prep/scripts/question-audit/audit-csv.mjs`
- Findings ingest: `/Users/zakariabennis/Karman-Prep/scripts/question-audit/ingest-findings.mjs`
- Apply fixes: `/Users/zakariabennis/Karman-Prep/scripts/question-audit/apply-grader-fixes.mjs`
- Audit rules (server-importable): `/Users/zakariabennis/Karman-Prep/src/lib/question-bank/audit-rules.ts`
- Taxonomy: `/Users/zakariabennis/Karman-Prep/src/lib/question-bank/taxonomy.ts`
- Web-path bulk importer: `/Users/zakariabennis/Karman-Prep/src/lib/question-bank/bulk-import.ts`
- KaTeX renderer: `/Users/zakariabennis/Karman-Prep/src/components/learn/MathText.tsx`
- Chart type: `/Users/zakariabennis/Karman-Prep/src/types/chart.ts`
- Figure backfill (tables): `/Users/zakariabennis/Karman-Prep/scripts/figure-extraction/extract-table-data.mjs`
- Figure backfill (charts): `/Users/zakariabennis/Karman-Prep/scripts/figure-extraction/extract-chart-data.mjs`
- Image-URL backfill: `/Users/zakariabennis/Karman-Prep/scripts/maintenance/backfill-figure-urls.mjs`
- R&W backfill: `/Users/zakariabennis/Karman-Prep/scripts/maintenance/fix-rw-stem-passage-split.mjs`
- Workflow (process): `/Users/zakariabennis/Karman-Prep/.github/workflows/process-pdf.yml`
- Workflow (grade): `/Users/zakariabennis/Karman-Prep/.github/workflows/grade-only.yml`
- Workflow (nightly audit): `/Users/zakariabennis/Karman-Prep/.github/workflows/audit-nightly.yml`
- Schema (jobs): `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260514002444_pdf_processing_jobs.sql`
- Schema (questions extension): `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260514002443_question_ingestion.sql`
- Schema (slug CHECK): `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260518003000_concept_slug_check.sql`
- Schema (live view): `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260518004500_quiz_questions_live_view.sql`
- Schema (findings): `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260518130917_question_findings.sql`
- Schema (table figures): `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260518140651_quiz_questions_figure_native.sql`
- Schema (history): `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260518153300_question_history.sql`
- Schema (chart figures): `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260519000000_quiz_questions_figure_chart.sql`
- Schema (grader_votes): `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260523090000_quiz_questions_grader_votes.sql`
- Schema (rejected_questions): `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260524000000_rejected_questions.sql`
- KarmanGPT system prompt: `/Users/zakariabennis/Karman-Prep/question-imports/chatgpt/KarmanGPT.txt`
- Older docs: `/Users/zakariabennis/Karman-Prep/docs/ingestion/spec.md`, `/Users/zakariabennis/Karman-Prep/docs/ingestion/routine.md`
- ADRs: `/Users/zakariabennis/Karman-Prep/docs/adr/0003-chatgpt-custom-gpt-imports.md`, `/Users/zakariabennis/Karman-Prep/docs/adr/0004-gemini-local-pdf-pipeline.md`
- Bug list: `/Users/zakariabennis/Karman-Prep/docs/bugs.md`
- Audit (May 17): `/Users/zakariabennis/Karman-Prep/docs/question-bank-audit-2026-05-17.md`
