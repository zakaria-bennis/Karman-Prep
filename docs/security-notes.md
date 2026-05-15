# Security notes

Closing out **audit S6** (`npm audit` advisories) from `docs/audit-2026-05-15.md`.

## Current state of `npm audit` (2026-05-15)

`npm audit` reports 5 vulnerabilities (2 moderate, 3 high). All are
nested transitive deps inside Next.js' own dependency tree. The
"fixes" suggested by `npm audit fix` cascade into breaking-change
upgrades we don't want to make in isolation:

### `postcss <8.5.10` (moderate — XSS via unescaped `</style>`)

- Advisory: GHSA-qx2v-qp2m-jg93
- Where: `node_modules/next/node_modules/postcss`
- Suggested fix: downgrade Next to 9.3.3 (breaking; would lose
  App Router, RSC, and ~7 years of features).
- Real-world risk for us: **none**. The advisory matters when
  user-supplied CSS is run through PostCSS' stringify output and
  re-rendered. We don't take user-supplied CSS anywhere. The
  postcss subdep is used by Next.js' internal build pipeline on
  trusted source files.

### `glob 10.2.0-10.4.5` (high — CLI command injection)

- Advisory: GHSA-5j98-mcp5-4vw2
- Where: `node_modules/glob` (under `@next/eslint-plugin-next`
  → `eslint-config-next`)
- Suggested fix: bump `eslint-config-next` to 16, which requires
  `eslint >= 9` (we use `eslint@8`). Bumping eslint to 9 has its
  own breaking changes (flat config, several rule renames).
- Real-world risk for us: **none**. The CLI injection only matters
  if we run `glob -c "<user input>"`. We don't run the glob CLI
  at all — it's a transitive dep used internally by ESLint.

## What to do about it

- **Today:** acknowledged; not fixing in isolation.
- **Next major version bump:** when Next.js releases a minor that
  pulls in `postcss >= 8.5.10`, the moderate goes away
  automatically. Watch for it in [Next.js release notes].
- **When we do the eslint 8→9 migration** (separate project),
  bump `eslint-config-next` to 16 in the same PR. That clears
  the glob advisory.

[Next.js release notes]: https://github.com/vercel/next.js/releases

## Posture

We do not run `npm audit fix --force` reflexively — the suggested
breaking changes are worse than the unexploitable advisories. We
do verify on every dependabot / minor-bump PR that the count of
high-severity vulnerabilities doesn't increase.
