# PDF → CSV via Gemini (no Claude, no daemon)

Two scripts that turn an SAT practice PDF into the 30-column CSV your
`/admin/questions/import` page already accepts. Designed to be:

- **Free.** Uses the Gemini API free tier (no Anthropic/OpenAI billing).
- **Fast.** ~5 minutes per PDF end-to-end on a 99-page practice test.
- **Hands-off.** No daemons, no detached processes, no auto-retries.
  Each script runs to completion and exits. Ctrl-C kills it cleanly.
- **Resumable by re-running.** Stage 1 is deterministic; Stage 2 writes
  every chunk's raw response to disk, so you can inspect or re-run a
  single chunk if it looks wrong.

## One-time setup (~5 minutes)

```bash
# 1. System dep — for rendering PDF pages to images
brew install poppler

# 2. Python deps
pip3 install pdfplumber google-genai

# 3. Get a free Gemini API key (separate from Gemini Pro / Google One)
#    https://aistudio.google.com/apikey
#    Save it once in your shell:
echo 'export GEMINI_API_KEY="your-key-here"' >> ~/.zshrc
source ~/.zshrc
```

That's it. No Claude installed required for this path.

## Running

From the repo root (`/Users/zakariabennis/strata`):

```bash
# Stage 1 — local, free, ~30s for a 99-page PDF.
# Extracts text per page + renders each page as a 150 DPI PNG.
python3 question-imports/stage1_extract.py \
    question-imports/incoming/c461e2ae-.../202603usv1.pdf

# Stage 2 — calls Gemini, ~3-5 min for a 99-page PDF.
# Reads stage 1's output and produces the 30-column CSV.
python3 question-imports/stage2_classify.py \
    question-imports/extract-out/202603usv1
```

Output lives in `question-imports/extract-out/<pdf-stem>/`:

```
extract-out/202603usv1/
  page-001.txt … page-099.txt    text per page
  page-001.png … page-099.png    150 DPI image per page
  summary.json                   metadata + answer-key-page guesses
  raw-chunk-01.txt … raw-chunk-04.txt
                                 verbatim Gemini responses (for debugging)
  questions.csv                  rows with import_status=ok
  questions_needs_review.csv     rows flagged needs_review
```

## Uploading

Open `/admin/questions/import` in the website (this is the existing
manual CSV importer that pre-dates the daemon) and drop the
`questions.csv` file in. The bulk importer dedupes by
`(source_pdf, content_hash)` so re-uploads are safe.

If you want it through the same `csv-inbox/` cron path the daemon uses,
upload the CSV to R2 under `csv-inbox/` and ping `/api/cron/ingest-csv-inbox`.
Both paths land rows in the same `quiz_questions` table.

## Tuning

Set env vars before invoking Stage 2:

| Var              | Default            | Use when                                                      |
| ---------------- | ------------------ | ------------------------------------------------------------- |
| `GEMINI_API_KEY` | (none — required)  | Always. Get one at aistudio.google.com/apikey                 |
| `GEMINI_MODEL`   | `gemini-2.5-flash` | `gemini-2.5-pro` for higher quality (~25 RPD free-tier limit) |
| `CHUNK_PAGES`    | `25`               | Lower if Gemini truncates output past 65 k tokens             |

## When to reach for `marker` (heavier but math-aware)

If Stage 1's `page-NNN.txt` files mangle inline math (e.g. `x²` → `x2`,
fractions collapsed to `5/9` losing context), upgrade to
[`marker`](https://github.com/VikParuchuri/marker) which is purpose-built
for academic PDFs:

```bash
pip3 install marker-pdf
marker_single path/to.pdf question-imports/extract-out/<pdf-stem>/
```

`marker` writes one big `<pdf-stem>.md` (markdown with KaTeX-style
equations) instead of per-page text files. Stage 2 ignores the .md but
will use the per-page text it already wrote — concatenate the markdown
into `page-001.txt` if you want Gemini to consume it directly. (This is
the only manual step in the upgrade path.)

Tradeoff: `marker` downloads ~3 GB of model weights on first run and
uses ~5 GB RAM during conversion. Skip it unless `pdfplumber`'s output
is genuinely unusable.

## When to reach for Mathpix (cloud OCR)

If `marker` is also too rough on graphs/tables, use [Mathpix](https://mathpix.com/)
— their OCR is the gold standard for math content. Free tier covers
~200 pages/month, which is several PDFs. Replace Stage 1 with a Mathpix
batch call; Stage 2 stays the same.

## Why this replaces the Claude daemon path

| Failure mode (Claude daemon)                                 | Why it disappears here                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| Hits Claude Max rate limit mid-run                           | No Claude in the loop                                          |
| 30–90 minute extraction times                                | ~5 min total per PDF                                           |
| 78 GB RAM crash                                              | Stage 1 ≈ 200 MB, Stage 2 ≈ 50 MB                              |
| "Claude finished without creating runs/<ts>/" silent failure | Both stages either return text or hard-fail with a clear error |
| Long-running detached processes                              | Each script runs to completion in the foreground               |

The Claude routine (`ROUTINE_PROMPT.md`), the `pull-pdf-job.mjs`
daemon, and `/admin/jobs` all still exist and still work for anyone who
prefers that flow. This is an alternative path, not a replacement.
