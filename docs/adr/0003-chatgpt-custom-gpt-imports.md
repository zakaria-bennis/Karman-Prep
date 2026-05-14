# 0003 — ChatGPT Custom GPT (not Claude API daemon) for SAT question imports

- **Status**: Accepted
- **Date**: 2026-05-03
- **Deciders**: @zakaria-bennis

## Context

KarmanPrep needs ~500-1500 SAT practice questions extracted from College Board released-exam PDFs. Each PDF is 70-90 pages with ~98 questions across 4 modules (R&W M1, R&W M2, Math M1, Math M2). The extracted output is a 32-column CSV ready for the bulk-importer at `/admin/questions/import`.

Two main approaches were considered:

**(a) Claude API daemon** — local long-running script (`scripts/pdf-pipeline/pull-pdf-job.mjs`) that polls the `pdf_processing_jobs` queue, downloads PDFs from R2, invokes the Claude CLI on each, parses output, writes results to Supabase. Originally built and deployed; ran via launchd on the founder's Mac.

**(b) ChatGPT Plus Custom GPT** — drop a PDF into a chat with a Custom GPT that has full instructions + 89-slug taxonomy + image-handling protocol baked into its Knowledge file. ChatGPT runs Code Interpreter to OCR + extract + classify + emit a single CSV. Founder downloads the CSV and uploads via `/admin/questions/import`.

## Decision

Use the **ChatGPT Plus Custom GPT** approach. The Custom GPT (named "KarmanGPT") loads a single Knowledge file at `question-imports/chatgpt/KarmanGPT.txt` covering: filename convention, full 32-column CSV schema, 89 concept slugs, difficulty calibration, R&W vs Math explanation depth, answer-key handling, image extraction with vision-driven cropping + Pillow polish, and tone rules.

The Claude API daemon at `scripts/pdf-pipeline/*` is preserved but deprecated.

## Alternatives considered

- **Claude API daemon (the original)** — high reliability, scriptable, runs unattended. Rejected because:
  - Cost: ~$0.10-0.30 per PDF × monthly batches = real money
  - Required complex local infra (launchd, queue table, file-watching) that the founder had to babysit
  - Crashed the founder's Mac with a 78GB RAM leak (Turbopack + sustained admin polling)
- **Gemini API + manual orchestration** — cheaper than Claude, but Gemini RECITATION filter blocks SAT content (copyright protection); had to switch to text-only inputs which lost figure context
- **Build our own ML pipeline** — pdfplumber + pytesseract + custom classifier. Rejected: months of effort to match what GPT-4 does out of the box

## Consequences

- ✅ Cost: $20/month flat for ChatGPT Plus subscription regardless of PDF volume
- ✅ Founder can extract a PDF in ~5 min during a coffee break, no infra to babysit
- ✅ All extraction logic lives in ONE file (`KarmanGPT.txt`) — easy to iterate as the rules evolve
- ✅ The bulk-importer is the same regardless of source — Custom GPT, manual CSV, or future automated pipeline all flow through `/admin/questions/import`
- ⚠️ Quality varies — Code Interpreter timeouts on math-heavy PDFs, occasional hallucinated slugs, image cropping not perfect. Mitigated via auto-flag-for-review on every image-bearing question
- ⚠️ Manual step in the loop (founder has to click "Send" in ChatGPT and download the CSV) — doesn't scale to 100+ PDFs/month
- 🔄 Future revisit: if PDF volume exceeds ~20/month or quality issues become unmanageable, automate via OpenAI's Assistants API or GPT-4 Vision direct calls
