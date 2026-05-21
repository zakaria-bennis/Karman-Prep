# 0004 — Gemini local PDF pipeline (supersedes the ChatGPT Custom GPT path)

- **Status**: Accepted (supersedes ADR [0003](./0003-chatgpt-custom-gpt-imports.md))
- **Date**: 2026-05-21
- **Deciders**: @zakaria-bennis

## Context

ADR #3 chose ChatGPT Plus Custom GPT (KarmanGPT) for SAT PDF extraction. That decision was right when PDF volume was low (<20/month) and avoiding infra was the priority. The ADR's stated revisit triggers were _both_ tripped:

- **Volume**: 100 PDFs queued for the upcoming build phase (10,000 questions). At 5 minutes of manual ChatGPT clicking per PDF that's 8+ hours of pure mouse-clicking before any review work begins.
- **Quality**: Persistent CSV column-misalignment (when a question contained an un-escaped comma) plus near-total failure on figure extraction. On the validation PDF (`202603asiav1.pdf`), ChatGPT extracted **0 figures** — the math questions that depend on graphs, geometry diagrams, and tables had empty `image_url` columns across the board.

The Custom GPT also showed inconsistency across runs — same PDF, different day, different CSV — which made debugging individual extraction errors nearly impossible.

## Decision

Replace the Custom GPT step with a **local Node pipeline** that calls Gemini 3.5 Flash directly. Four scripts under `scripts/pdf-pipeline/`:

| Script                    | Job                                                                                                                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extract-with-gemini.mjs` | PDF → 32-column structured JSON. Gemini 3.5 Flash + the KarmanGPT.txt schema as `systemInstruction`. `responseSchema` enforces the 8-item enums (domain, format, etc.); the 89-slug concept_slug list is too large for Gemini's enum cap and is post-validated. |
| `extract-figures.mjs`     | JSON + PDF → R2-hosted figure URLs. For each `has_figure=true` question: render via `pdftoppm` at 200 DPI, send back to Gemini for a 0-1000-normalized bbox, crop with `sharp`, polish (autocontrast + sharpen + white pad + 1500px cap), upload to R2.         |
| `json-to-import-csv.mjs`  | JSON → 32-column CSV ready for the existing `/admin/questions/import` bulk-importer.                                                                                                                                                                            |
| `run-extraction.mjs`      | Orchestrator. One command per PDF: `npm run pdf:extract -- <path-to-pdf>`.                                                                                                                                                                                      |

Post-import generators (Sonnet + Haiku) then fill the explanation_text + per-choice + Desmos fields via `npm run pdf:fill`.

The local Claude-API daemon (`pull-pdf-job.mjs`, etc.) and the `PdfUploadClient` UI are deprecated — the daemon file is preserved with a banner comment but no longer wired to npm; the UI is deleted.

## Alternatives considered

- **Keep ChatGPT, add validators** — bolt a CSV pre-flight check + a second-pass Gemini vision verifier onto the existing flow. Cheaper to build (~1 day), but doesn't fix the underlying quality variance, doesn't fix the 0-figure problem, and keeps the manual-clicking bottleneck.
- **Replace ChatGPT with Claude Opus** — better quality on individual extractions but ~30× more expensive than Gemini Flash (~$700 vs ~$4 for the 100-PDF batch). For structured extraction with verification downstream, Opus is overkill.
- **Replace ChatGPT with Gemini 2.5 Pro** — more thorough than Flash but ~30× more expensive ($150 vs $4 batch). On the validation pass, Pro timed out the default Node HTTP client (>5min response time) while Flash returned 98 questions in 35 seconds. Pro is reserved as a fallback if Flash ever fails on a given PDF.
- **Rebuild the Claude API daemon** — the original 2025 design. The RAM-leak failure mode that killed it was specific to Turbopack + sustained polling + launchd; a one-shot script doesn't have any of those. Still rejected because (a) ChatGPT had moved us off that infra entirely, and (b) Gemini Flash beats Claude Opus on cost by 30× for the same task quality.

## Consequences

- ✅ **No more manual clicking.** `npm run pdf:extract -- <path>` does it all, ~3 minutes wall time per PDF.
- ✅ **Cost: ~$0.04/PDF for extraction + figures**. ~$2.25/PDF including post-import explanation generation (Sonnet for text + per-choice, Haiku for Desmos). 100-PDF batch: ~$225 in API costs, vs $20/month ChatGPT Plus + ~8 hours of mouse-clicks.
- ✅ **Reproducibility.** Re-running on the same PDF produces the same JSON. The bulk-importer's content_hash dedup means re-importing is idempotent.
- ✅ **Better quality on validation.** Vs ChatGPT on the same PDF: 98 q vs 86 (caught 2 pages ChatGPT skipped entirely), 0 vs 0 invalid concept_slugs, 13/13 vs 0/13 figures cleanly cropped, 98.5% answer-key agreement on matched pairs.
- ⚠️ **Five real Gemini quirks** had to be worked around during build, all documented in lib + script comments: 89-enum responseSchema rejection, early-stop bias on long-form structured output, R&W passage/stem confusion, thinking-token budget starving small structured tasks, and the 0-1000 normalized bbox coordinate system.
- ⚠️ **Explanation_text generator is new** — the old ChatGPT flow generated this during extraction. We now generate it post-import with Sonnet, which adds ~$1.50/PDF but produces higher-quality output than ChatGPT did.
- 🔄 **Future revisit**: If Gemini Flash's quality degrades on a given PDF type (handwritten scans, non-English passages, unusual layouts), the lib already supports falling back to Gemini 2.5 Pro by changing the `model` arg. If the bbox detection fails on figure-dense pages, the script auto-falls back to whole-page screenshots with `needs_review` flag.
