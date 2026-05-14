# KarmanPrep — Documentation Index

Everything that's not application code lives here.

## Operations & deployment

- **[Deployment — Cloudflare](./deployment-cloudflare.md)** — how the app ships to Cloudflare Workers via OpenNext (build, deploy, secrets, custom domains)
- **[Handoff](./handoff.md)** — context for anyone new picking up the codebase
- **[Reconciliation](./reconciliation.md)** — billing / data reconciliation procedures
- **[Bugs](./bugs.md)** — known issues + reproduction notes

## Subject-matter docs

- **[Ingestion / routine](./ingestion/routine.md)** — production routine for the SAT question-import pipeline
- **[Ingestion / spec](./ingestion/spec.md)** — full schema + behavior spec for question imports
- **[Recaps & payouts / phase-0 audit](./recaps-payouts/phase-0-audit.md)** — codebase audit + decisions made before building the recap-email + tutor-payout system

## Reference (non-markdown)

- **[reference/tutor-features.docx](./reference/tutor-features.docx)** — bulleted list of every feature in the tutor portal (compare against external feature proposals)
- **[reference/webpages-inventory.docx](./reference/webpages-inventory.docx)** — every page on karmanprep.com (existing + recommended additions, with priorities)

## Business plan & strategy

- **[business/](./business/)** — early business planning docs from the pre-rename "Strata" era. Kept for historical reference; brand has since changed to Karman Prep.

## Where else to look

- **[`/supabase/migrations/`](../supabase/migrations/)** — every SQL migration ever applied to the database, in numbered order
- **[`/scripts/`](../scripts/)** — admin / maintenance / seed scripts you run from the command line
- **[`/tools/question-imports/`](../tools/question-imports/)** _(planned)_ — Python pipeline + ChatGPT knowledge files for the SAT question import tooling
- **[`/src/`](../src/)** — application code (Next.js app, components, lib helpers)
