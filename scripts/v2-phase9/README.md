# Phase 9 scripts — figure pipeline pre-work

Helpers for Phase 9 of the pipeline redesign — turning cropped PDF figure screenshots into structured embedded representations (HTML tables, custom SVG charts, etc.) with screenshots as a graceful fallback.

See [`docs/phase-9-figure-pipeline-proposal.md`](../../docs/phase-9-figure-pipeline-proposal.md) for the architectural plan.

## benchmark-figure-extraction.mjs

Pre-9A benchmark. Picks N figure crops from `source_assets`, downloads each PNG from R2, and runs:

1. **Classification** via Gemini 2.5 Flash + Gemini 2.5 Pro + Claude Sonnet 4.6 vision
2. **Structured extraction** (per kind) via Gemini Pro + Sonnet vision for tables/charts/geometric

Saves a Markdown report so a human can eyeball results side-by-side.

### Usage

```bash
# Default: 10 figures, any source PDF
node --env-file=.env.local scripts/v2-phase9/benchmark-figure-extraction.mjs

# 20 figures from a specific PDF
node --env-file=.env.local scripts/v2-phase9/benchmark-figure-extraction.mjs \
  --limit 20 --source-pdf 202406asiav2.pdf

# Single asset sanity check (before running the full benchmark)
node --env-file=.env.local scripts/v2-phase9/benchmark-figure-extraction.mjs \
  --asset-id <uuid>

# Custom report output path
node --env-file=.env.local scripts/v2-phase9/benchmark-figure-extraction.mjs \
  --limit 30 --out /tmp/my-benchmark.md
```

### What to look for in the report

For each figure:

- **Classification agreement** — when all 3 providers agree on `figure_kind`, that's a strong signal. Disagreement means the figure is genuinely ambiguous or one model is wrong.
- **Cost vs accuracy** — Flash is ~10× cheaper than Sonnet. If Flash gets the right classification, no need to escalate.
- **Extraction quality** — for tables, do row/column counts match the screenshot? For charts, are data values plausible? Compare each model's structured output to the linked PNG.
- **JSON validity rate** — how often does each model return malformed structured output?

### How to lock model choice from the report

After running a benchmark on 20-40 figures, decide per type:

- **Classifier:** use the cheapest model that achieves > 90% accuracy. Likely Flash.
- **Table extractor:** the model with the highest row/column accuracy. Compare row counts to ground truth (eyeball PNG).
- **Chart extractor:** the model with the highest "data point count + axis label" accuracy. Charts are spatial — Gemini Pro might win.
- **Geometric extractor:** v1 stores extraction as admin tool only, so accuracy bar is lower. Pick by JSON validity.

Document findings in `docs/phase-9-figure-pipeline-proposal.md` under a new "Benchmark results" section.

### Cost per benchmark run

Rough estimate per figure:

- 3 classification calls (Flash + Pro + Sonnet) — ~$0.02
- 2 extraction calls (Pro + Sonnet) for table/chart/geometric — ~$0.30
- Total per figure: ~$0.32

20-figure benchmark: ~$6. 40-figure benchmark: ~$12.

### What comes next (per the design doc)

After the benchmark locks model choice:

- **Pre-9A migration:** add `figure_graph_data`, `figure_geometry_data`, `figure_svg`, `figure_quality`, `figure_extraction_model` columns
- **9A:** ship table extraction + HTML rendering + schema validation + fallback chain
- **9B:** ship simple chart extraction + custom SAT-style SVG renderers
- **9C / 9D / 9E:** coordinate graphs, geometry, 3D — each in its own PR
