# AGENTS.md

Codex (and any other AI coding agent working in this repo) should follow
the same conventions, dev workflow, test layers, and deployment rules as
Claude Code. To keep one source of truth, those are documented in
[`CLAUDE.md`](./CLAUDE.md) — read that file first.

Specific things worth re-reading any time you touch this repo:

- Branch model + lint-as-error rules + 5 required CI checks (CLAUDE.md
  §"Repo defaults you must respect").
- The testing-layer hierarchy — start at the cheapest layer that can
  answer the question (CLAUDE.md §"Testing & verification workflow").
- The dev-only Clerk auth bypass for browsing as different personas
  (CLAUDE.md §"Dev-only auth bypass").
- The pipeline v2 phase guardrails (`docs/ingestion/pipeline-v2-redesign-plan.md`):
  publish_status opt-in semantics, source_assets as source of truth,
  `quiz_questions.question_bbox` is cache only, Phase 4 visual
  classification is rule-based (no LLM), and the new gates are opt-in
  via `source_assets_processed_at` + `phase4_visual_relevance_checked`.

If you need anything that's NOT in CLAUDE.md, add it THERE — not here —
so every agent (Claude, Codex, future) reads the same canonical
playbook.
