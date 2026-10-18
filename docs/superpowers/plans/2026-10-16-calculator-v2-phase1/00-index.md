# Karman calculator v2, Phase 1 (Foundations and typing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase 1 of calculator v2 behind `CALCULATOR_V2_ROLLOUT`: an original Karman graphing
calculator (parser, worker-computed values and graphs, MathQuill rows, keypads, settings, window
modes, 12-skin contrast) that admins use in real Math questions, plus Transfer to Calculator for
expressions, equations, inequalities, functions, systems and their answer choices, with every
Phase 1 checklist ID passing its stated test.

**Architecture:** A framework-free TypeScript core (`src/lib/calculator-v2/`: parser, analysis,
evaluator, plot, engine, worker executor) runs unchanged in a compute worker (a module worker under
Vite and esbuild; Turbopack emits a classic bootstrap worker that loads the worker chunks) and on
the main thread; a React UI renders into a shadow root behind the `KarmanCalculator` facade
(`src/components/calculator-v2/`), loaded by one client-only `import()` when a v2 calculator first
opens. The quiz seam (`src/components/calculator/`) resolves the version from the Worker secret,
keeps v1 byte-identical when off, and hosts the light-DOM window, loader, docking and the eager
Transfer control fed by a server-safe classifier (`src/lib/calculator-transfer/`).

**Tech Stack:** TypeScript, React 19 (`createRoot` in a shadow root), MathQuill vendored at commit
`1cbc1c4128` as an ES module, KaTeX 0.18.2 fonts, Zod 4, lucide-react, Vitest 4.1.11 (node and
jsdom with React Testing Library), Playwright (`playwright.calculator.config.ts` on the Vite
fixture; `tests/e2e/` on `next dev`; `tests/cf-preview/` on `npm run cf:preview`), esbuild for the
standalone page, Next 16.3.8 (Turbopack) with OpenNext on Cloudflare Workers, Node 22 (`.nvmrc`).

**Spec:** `docs/superpowers/specs/2026-10-16-karman-calculator-v2-design.md` and its appendices in
`docs/superpowers/specs/calculator-v2/` (`a-math-semantics.md`, `b-functions-and-data.md`,
`c-transfer.md`, `d-architecture-integration.md`, `e-ux-keypad-accessibility-theme.md`), with the
open items in `docs/superpowers/specs/calculator-v2/open-items.md` resolved as section 6 assigns.
Contracts: `01-interfaces.md` (sections 0 to 5), `01-interfaces-runtime.md` (6 to 10) and
`01-interfaces-integration.md` (11 to 16), split so each file stays under 700 lines.

## Global Constraints

Copied verbatim from the spec; every task's requirements include them.

- "**CLAUDE.md:** the calculator is implemented locally. No hosted calculator API, proprietary SDK or license key. Open-source dependencies keep their licenses and notices in `public/calculator-notices.txt`. Files stay under ~700 lines. Server actions validate with Zod. Physical-phone review is optional; automated mobile, keyboard, theme and integration checks remain required." (overview section 3)
- "**Research boundary (owner decision):** research is limited to observable behaviour … Desmos code, scripts, DOM, assets, icons, fonts, logo and exact visual design are never copied. Observation artifacts stay outside the repository." (overview section 3) Plan executors do not visit Desmos sites.
- "**Brand (`docs/brand.md`, `docs/enhanced-quiz-engine.md`):** colours come from the active site theme (12 skins). Calculator UI uses system Arial; math uses KaTeX fonts. Motion respects `prefers-reduced-motion`." (overview section 3)
- "**Existing contracts kept:** math-only availability, hidden in Reading and Writing, fresh state per question, question export entry points, scoring and persistence untouched." "No phase changes scoring, persistence or question data." (overview section 3)
- D3: "MathQuill (github.com/mathquill/mathquill), vendored at jQuery-free master commit `1cbc1c4128` behind a `MathField` adapter and styled with KaTeX fonts". "Vendoring any other commit is a change to D3 and goes back to the owner."
- D4: "Framework-free TypeScript core plus React UI rendered in a shadow root".
- D5: "Radians; degrees in settings; reset per question".
- D8: "The flag is the runtime Worker variable `CALCULATOR_V2_ROLLOUT` with the values `off`, `admins` and `everyone` (AR-6, AR-7)."
- D9: "UI text, axis numbers and point labels at least 7:1; axes at least 7:1; curves at least 4.5:1 in every skin, with each skin's six curve colours generated to meet that while staying distinguishable, including for colour-blind students; major gridlines at least 3:1 and minor gridlines lighter; inequality shading never drops a curve below 4.5:1; Reverse contrast raises everything to at least 7:1".
- AR-33: "Gzip budgets: JS and CSS added to quiz routes eagerly, including `calculator-chrome.generated.css` (TH-5), at most 10 KB; JS fetched on first open, excluding the worker and fonts, at most 400 KB; worker at most 250 KB; standalone JS at most 600 KB".
- AR-44: "no module under `src/lib/calculator-v2/`, `src/components/calculator-v2/` or `vendor/mathquill/` calls `eval`, `new Function` or string-argument `setTimeout`/`setInterval`".
- Section 8.1: "Every deploy runs `npm run cf:build && npm run cf:deploy` as one step, never `cf:deploy` alone, after the AR-66 checks pass on the built output."
- Section 9: "Every ID has at least one automated test whose title, or whose corpus `rules` field, names it." "One golden corpus (PR-39) is the only source of expected parse, classification and display results". "v2 browser specs and their synthetic fixtures live in `tests/calculator/v2/` … Fixtures use synthetic questions only and never submit student answers." "With the flag off, the existing suite runs unmodified (AR-8)".
- Section 1: "Parity is claimed only for checklist items with passing tests. No complete numerical or visual parity is claimed".
- Section 7.3, shipped-part rule: "When a statement also names behaviour that another ID delivers in a later phase, its test covers the shipped part in its own phase … An ID never passes by skipping a case that has shipped."
- Repository (CLAUDE.md): `@typescript-eslint/no-unused-vars` and `react/no-unescaped-entities` are errors; the five required CI checks are TypeScript, ESLint, Prettier, Vitest and the Cloudflare build; component tests are co-located `.test.tsx` files starting with `// @vitest-environment jsdom`.

## Review Focus

Five inputs the spec implies but no ID's test exercises, most likely to bite first. Each owning
package adds the named test to the task that owns the code, in that task's step style.

1. **Half-typed MathQuill output while typing** (`\frac{}{}`, `x^{}`, `\sqrt{}`, `2+`, `\left(`
   with no `\right)`, `\operatorname{}` from a deleted name, a lone `=`): each returns a `syntax`
   `ParseError` with a span, never throws, and the row's previous graph disappears in the same
   generation. Owner: 02-parser, task "parse never throws", adds
   `it("PR-38 half-typed MathQuill structures return syntax errors", …)` asserting
   `parseLatex(input).ok === false` and `error.code === "syntax"` for all seven inputs.
2. **Question changes while work is in flight** (Next pressed five times within one second with
   the window open, during the first `import()` and with a 2,000-node implicit row computing):
   one live calculator and one worker afterwards, no value, plot or announcement from an earlier
   question, no unhandled promise rejection. Owner: 11-seam, task "per-question reset", adds
   `test("AR-61 five question changes in one second leave one calculator and no stale output", …)`
   reading `globalThis.__karmanCalculatorCounters` and `page.on("pageerror")`.
3. **Zero-size and hidden containers** (Minimize, Collapse list, a parent with `display:none`, a
   400 px dock in a 501 px tall viewport): `ResizeObserver` reports 0, the engine keeps the last
   finite viewport, the renderer skips the frame, and the graph redraws when size returns. Owner:
   08-graph, task "GraphPanel sizing", adds
   `it("G-5 a zero-size container keeps a finite viewport and skips rendering", …)` asserting every
   `getSnapshot().viewport` bound is finite after a 0×0 then 800×600 resize.
4. **Views at the G-23 limits** (span `1e-9·max(1,|centre|)` and `1e15`, centre near `±1e15`) for
   closures equivalent to `y=x`, `y=\sin x`, `y=e^{x}` and `x^{2}+y^{2}=25`: sampling and
   `axisTicks` terminate within the G-15 budgets and no tick step underflows to 0. Owner: 06-plot,
   task "viewport limits", adds `it("G-23 sampling and ticks at the limits stay finite and in budget", …)`.
5. **Touch device with a hardware keyboard** (iPad or touch laptop, `(any-pointer: coarse)` true,
   keypad open so `inputmode="none"`): physical typing still edits the focused row, Escape closes
   the keypad as KB-3 orders it, and after the student hides the keypad a row tap does not reopen
   it (K-2). Owner: 10-shell, task "keypad visibility policy", adds
   `test("K-2 hardware typing edits the row while the touch keypad is open", …)` on
   `calculator-ios`.

---

## 1. Increments, branch and release

| Increment | Waves  | Packages | Deployable result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1A        | 0 to 5 | 02 to 11 | Behind `CALCULATOR_V2_ROLLOUT=admins`: flag off leaves v1 untouched (AR-8); with admins the toolbar and side button open v2 in Math questions with MathQuill typing, live results, explicit, implicit, inequality and point graphs (pixel-checked on canvas), desktop and phone keypads, settings (angle, grid, axes, complex mode), undo and redo, Clear all, floating and full-screen windows, per-question reset, the 12 skins at the D9 targets, worker plotting with containment, lazy loading with the import and bundle rules (AR-32, AR-33 and AR-66 checked on the release build), and screen-reader essentials for those features. Docked mode, its AR-23 geometry and the AR-26 dock transitions are built and verified on the fixture in 1A; production reaches the dock only through a transfer (AR-21), so admins can dock from 1B |
| 1B        | 6 to 8 | 12 to 15 | Phase 1 complete: Transfer to Calculator (every Phase 1 TR- ID) and production docking, paste and the title-bar controls, the standalone build, the V1 parity ports, visual baselines, perf budgets, the AR-65 spec and the `--phase 1` spec-ID gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

**Branch and pull requests.** All work happens on `zakaria/calculator-v2`, at `e33c197`
(`08c8c76` plus the spec commit). Each increment is one pull request whose base is
`zakaria/calculator-regression-release`, the deployed lineage
(`origin/zakaria/calculator-regression-release` is `08c8c76`), unless the owner names another
production branch before the 1A PR opens. The base is never `main`: `08c8c76` is
104 commits ahead of `origin/main` (`fade5fe`), including five `supabase/migrations/` files, and a
merge to `main` would carry them unreviewed and trigger `.github/workflows/db-deploy.yml`.
`ci.yml` runs only for pull requests to `main`, so 11-seam adds the release branch to its
`on.pull_request.branches`. The 1A PR merges with a merge commit, and wave 6 starts only after it
has merged and the lead has merged the updated base into `zakaria/calculator-v2`. If the owner
squash-merges 1A instead, the lead recreates `zakaria/calculator-v2` from the new base tip before
wave 6 (no 1B commit exists yet).

**Before wave 0: commit the plan.** The plan directory starts untracked, and wave worktrees are
cut from the branch head, so an uncommitted plan file is missing inside them. Several steps read
these files there: 02 Task 3's test reads `INDEX_PATH` (this file), every wave's
`check-spec-ids.mjs --packages` reads section 2, and 04 Task 1 Step 0 greps `01-interfaces.md` and
`07-engine-worker.md`; the lead applies 03's notes 3 and 4 and 07's contract edits to the
`01-interfaces*.md` files before wave 0; 03 Tasks 4 and 8 (Step 1) and 07 Task 11 (Step 3) only
check them. Before the commit below the lead (1) lands the contract and index edits that the
packages' "Notes for the lead" request before wave 0 and the pending plan-file edits of section
5.4, after which section 5.4's check prints nothing (the plan commit waits until it does),
(2) numbers the proposed open items and renames them in the package files as section 6.2 says
(P07-1, P07-2, P03-2 and P03-1 become OI-32, OI-35, OI-33 and OI-34), after which, run in this
directory, `grep -n "P03-1\|P03-2\|P07-1\|P07-2" 03-foundations.md 05-editor-foundation-1-vendor.md 07-engine-worker*.md`
prints nothing, (3) appends the section 6.2 rows OI-28 to OI-37 to `open-items.md`, recording each
owner decision before the owning task's wave (section 6.2), and (4) checks that
`npx prettier --check docs/superpowers/plans/2026-10-16-calculator-v2-phase1` exits 0 and every plan file is under 700 lines.
Then run on `zakaria/calculator-v2`:

```sh
git add docs/superpowers/plans/2026-10-16-calculator-v2-phase1 docs/superpowers/specs/calculator-v2/open-items.md \
  && git commit -m "Add the calculator v2 Phase 1 plan and its open items"
```

Then cut the wave 0 worktrees. A later lead edit to a plan file is committed on
`zakaria/calculator-v2` the same way before the next wave's worktrees are cut.

**Worktrees.** Packages in one wave run in separate worktrees cut from the branch head at the
start of the wave and merge back in package-number order before the next wave starts; every task
ends in its own commit. After creating any worktree, run `npm install --no-audit --no-fund` (the
CI command) inside it before any gate, then `git checkout -- package-lock.json` unless the package
changes dependencies. Never symlink `node_modules`: the parent checkout's tree has other versions
(next 16.2.4, vitest 4.1.6, wrangler 4.85.0 against the lockfile's 16.3.8, 4.1.11, 4.148.0), and
Turbopack panics on a `node_modules` outside the project root. Re-run the install after merging a
wave that changes `package.json` or `package-lock.json`. Every gate runs from the worktree root.

**Gate environment.** Gates run under Node 22 (`.nvmrc`; on this machine `n exec 22 <command>`,
since the default Node is 25.9.0 and about 20 jsdom storage tests fail on newer Node). `n` has
only Node 26.12.0 cached here, so once, before wave 0, the lead runs `n download 22` (it caches
Node 22 without changing the default `node`; `n install 22` would also switch the default) and
checks that `n exec 22 node --version` prints `v22.x` (some 22.x release). Gate builds export
the `ci.yml` placeholder env first and are never deployed:

```sh
export NEXT_PUBLIC_APP_URL=https://karmanprep.com NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder \
  CLERK_SECRET_KEY=sk_test_placeholder STRIPE_SECRET_KEY=sk_test_placeholder \
  RESEND_API_KEY=re_placeholder RESEND_FROM_EMAIL=hello@karmanprep.com
```

`npm run test:e2e`, `npm run test:visual:regression` and the AR-65 specs additionally need the
developer's `.env.local` copied from the main checkout (seeded Supabase and Clerk dev values); it
must not define `CALCULATOR_V2_ROLLOUT`, which local runs set in the shell or a Playwright
`webServer.env` (OI-30).

**1A release** (after 11-seam merges; every step in the 1A worktree, Node 22):

1. The common checks of section 3, plus
   `npx tsx scripts/calculator-v2/check-spec-ids.mjs --packages 02,03,04,05,06,07,08,09,10,11`,
   `npm run test:calculator` (all five projects: the unmodified v1 specs for AR-8 and every v2
   spec, including the canvas pixel tests in `graph.spec.ts`), `npm run test:e2e`,
   `npm run test:visual:regression`, and
   `npx playwright test --config=playwright.calculator-v2-e2e.config.ts` (the Turbopack smoke,
   including the chunk-failure case).
2. Once, before the first v2 deploy: `printf admins | npx wrangler secret put CALCULATOR_V2_ROLLOUT`.
   Secrets survive deploys, and a change publishes a new version with no rebuild.
3. With the production public env exported in the shell (never written to a file; the scripts do
   not log values): `scripts/calculator-v2/release.sh`. It is one `set -euo pipefail` step that runs
   `npm run cf:build:release` (`check-release-env.mjs`, then `cf:build`),
   `node scripts/build/check-calculator-v2-bundle.mjs` (AR-32, AR-33 and the AR-66 worker
   discovery), `npx playwright test --config=playwright.cf-preview.config.ts` (AR-66),
   `npm run cf:deploy`, and finally checks that `npx wrangler secret list` names
   `CALCULATOR_V2_ROLLOUT`. This is section 8.1's paired `cf:build` and `cf:deploy` in one step
   after the AR-66 checks: the deployed output is exactly the checked output, and `cf:deploy`
   never runs outside this script. Rebuilding after the checks would ship unchecked output.
4. An admin signs in on production and repeats AR-65's steps except docking on a transfer (1B).

Rollback at any time: `printf off | npx wrangler secret put CALCULATOR_V2_ROLLOUT` (or `admins`).

**1B release** (after 15-release-gates merges): step 1 of the 1A release with
`check-spec-ids.mjs --phase 1` in place of `--packages` (the same Playwright runs now include the
full AR-65 spec, the perf specs and the visual baselines), then step 3 (`release.sh`), and in step 4
the admin repeats every AR-65 step on production, including docking on a transfer at 1280 px.

During 1A, v2 renders no Transfer control and no Paste or Keyboard shortcuts buttons, and the v1
"Export to Karman" controls render only on the v1 path (11-seam narrows `PasteAction` when it
introduces the `useCalculator()` union, so admins never see a v1 control that cannot work).

## 2. Work packages

| File                      | Key               | Title                                                                                     | Inc. | Wave | Depends on         | IDs |
| ------------------------- | ----------------- | ----------------------------------------------------------------------------------------- | ---- | ---- | ------------------ | --- |
| `02-parser.md`            | parser            | Parser, printer, operator names, deadline, corpus registry and the spec-ID checker        | 1A   | 0    | none               | 29  |
| `03-foundations.md`       | foundations       | Skin colours and contrast, chrome sheet, rollout flag, provider and import rules          | 1A   | 0    | none               | 14  |
| `04-semantics.md`         | semantics         | Row analysis with graph descriptors, evaluator, Phase 1 built-ins and number display      | 1A   | 1    | 02                 | 57  |
| `05-editor-foundation.md` | editor-foundation | Vendored MathQuill (ES module), MathField adapter, speech text and the announcer          | 1A   | 1    | 02, 03             | 14  |
| `06-plot.md`              | plot              | Viewport, explicit and implicit sampling, regions, lines, points and axis ticks           | 1A   | 1    | 02                 | 12  |
| `07-engine-worker.md`     | engine-worker     | Headless engine and public API, worker protocol, executor, backends and plot inputs       | 1A   | 2    | 02, 03, 04, 05, 06 | 23  |
| `08-graph.md`             | graph             | Canvas renderer and graph panel: pan, zoom, Home, tick labels and the graph's name        | 1A   | 3    | 03, 04, 05, 06, 07 | 4   |
| `09-editor-ui.md`         | editor-ui         | Expression list and rows, desktop and phone keypads, functions panel, settings            | 1A   | 3    | 02, 03, 04, 05, 07 | 34  |
| `10-shell.md`             | shell             | KarmanCalculator facade, shadow root, styles, layouts, keyboard and quiz host             | 1A   | 4    | 03, 05, 07, 08, 09 | 27  |
| `11-seam.md`              | seam              | Window modes, loader, hosts, reset, fonts, bundle and worker checks, release tooling      | 1A   | 5    | 03, 10             | 36  |
| `12-transfer-core.md`     | transfer-core     | Classifier, payload, question-dialect normalisation, apply step and transfer corpus       | 1B   | 6    | 02, 04, 07, 09, 10 | 36  |
| `13-paste-standalone.md`  | paste-standalone  | Clipboard paste, LaTeX copy and paste, title-bar controls, help popover, standalone       | 1B   | 7    | 05, 07, 10, 11, 12 | 10  |
| `14-transfer-ui.md`       | transfer-ui       | Transfer control, wrappers and call sites, docking on transfer, touch flow and the bridge | 1B   | 7    | 03, 10, 11, 12     | 42  |
| `15-release-gates.md`     | release-gates     | V1 parity ports, corpus coverage, visual, perf, the AR-65 spec and the phase gate         | 1B   | 8    | 02 to 14           | 53  |

**Plan files.** The file named in the table is each package's entry point (header, IDs,
decisions, notes for the lead). Eight packages keep their tasks in part files, copied from each
entry file's "Plan files" table; tasks run in number order across the parts:

- 04: `04-semantics-1-analysis.md` (Tasks 1 to 4), `04-semantics-2-eval.md` (5 to 10).
- 05: `05-editor-foundation-1-vendor.md` (1 to 3), `05-editor-foundation-2-config.md` (4 and 5), `05-editor-foundation-3-adapter.md` (6 and 7), `05-editor-foundation-4-browser.md` (8 to 11).
- 07: `07-engine-worker-1-contracts.md` (1 to 3), `07-engine-worker-2-executor.md` (4 to 6), `07-engine-worker-3-backends.md` (7 and 8), `07-engine-worker-4-rows.md` (9), `07-engine-worker-5-state.md` (10), `07-engine-worker-6-results.md` (11), `07-engine-worker-7-helpers-ui.md` (12 to 14).
- 09: `09-editor-ui-1-rows.md` (1 to 3), `09-editor-ui-2-list.md` (4 to 6), `09-editor-ui-3-keypad.md` (7 to 9), `09-editor-ui-4-panels.md` (10 to 12), `09-editor-ui-5-browser.md` (13 to 15).
- 12: `12-transfer-core-1-normalize.md` (1 to 3), `12-transfer-core-2-lex.md` (4 and 5), `12-transfer-core-3-classify.md` (6 to 8), `12-transfer-core-4-apply.md` (9 and 10), `12-transfer-core-5-corpus.md` (11 to 14).
- 13: `13-paste-standalone-1-clipboard.md` (1 and 2), `13-paste-standalone-2-paste-plan.md` (3 to 5), `13-paste-standalone-3-chrome.md` (6 to 8), `13-paste-standalone-4-browser.md` (9 to 11), `13-paste-standalone-5-standalone.md` (12 to 15).
- 14: `14-transfer-ui-1-control.md` (1 to 4), `14-transfer-ui-2-call-sites.md` (5 to 7), `14-transfer-ui-3-reveal-touch.md` (8 to 10), `14-transfer-ui-4-scope.md` (11 to 14).
- 15: `15-release-gates-1-checks.md` (Tasks 1 to 6), `15-release-gates-2-parity.md` (7 to 9), `15-release-gates-3-gates.md` (10 to 13).

The 391 Phase 1 IDs (the 390 of overview section 7.2 plus K-4, which section 9 treats as due from
Phase 1 because it is "staged from Phase 1") are allocated below, each to exactly one package.
`check-spec-ids.mjs --packages` reads the `- **IDs:**` lines of this section, so they hold only
IDs, commas, semicolons and "to" ranges.

### 02 parser

- **Owns:** `src/lib/calculator-v2/core/latex/`; `src/lib/calculator-v2/core/deadline.ts` and its test; `src/lib/calculator-v2/dev-counters.ts`; in `src/lib/calculator-v2/core/corpus/`: `types.ts`, `runners.ts`, `index.ts`, `corpus.test.ts`, `cases/index.ts`, `cases/parse-literals.ts`, `cases/parse-operators.ts`, `cases/parse-calls.ts`, `cases/parse-relations.ts`, `cases/parse-errors.ts`, `cases/printer.ts`, `cases/sat-forms.ts`; `scripts/calculator-v2/check-spec-ids.mjs`; `tests/unit/calculator-v2/check-spec-ids.test.ts`. Scaffolds the other case files (section 5.1).
- **IDs:** PR-3, PR-4, PR-7 to PR-27, PR-29, PR-37 to PR-40, PR-42.
- **Open items:** OI-9, OI-13, OI-14 (spec text only, first task), OI-27.
- **Decisions:** the allowlist in `operator-names.ts` holds every K-4 name with its shipping phase; calls to unshipped names return `unsupported` (PR-9). The corpus is a static registry (no `import.meta.glob`, no `vite/client`), so Vitest, `tsx` scripts and Playwright specs all import it. `corpus.test.ts` runs the parse runner of `01-interfaces.md` section 2.2.

### 03 foundations

- **Owns:** `src/lib/calculator-v2/theme/`; `scripts/calculator-v2/generate-skin-colors.ts`; `src/components/calculator/calculator-chrome.generated.css`; `scripts/check-file-sizes.mjs` (adds `src/lib/calculator-v2/theme/skin-colors.generated.ts` and `src/components/calculator-v2/styles/generated.ts` to `GENERATED`); `src/lib/calculator-version.ts` and its test; in `src/components/calculator/`: `CalculatorVersion.tsx`, `breakpoints.ts`, `report-error.ts` with their tests, and `seam-boundaries.test.ts`; `src/app/learn/layout.tsx`; `src/app/diagnostic/page.tsx`; `src/components/learn/learn-header.ts`; `src/components/learn/LearnLayout.tsx` (re-export only); `scripts/build/check-release-env.mjs`; `tests/unit/build/check-release-env.test.ts`.
- **IDs:** TH-1, TH-3 to TH-8, TH-10, TH-11; AR-1, AR-2, AR-6, AR-7, AR-19.
- **Open items:** OI-1, OI-30, OI-33 (Task 3), OI-34 (Task 6).
- **Decisions:** `resolveCalculatorVersion` never throws: any throw or rejection from its deps gives `"v1"`, and it is wrapped in React `cache()` per request (`it("AR-6 a failing role lookup resolves v1", …)`). In production it reads only the Worker binding (`getCloudflareContext().env`), so no value baked from a `.env*` file can apply; `check-release-env.mjs` also fails when any `.env*` file defines `CALCULATOR_V2_ROLLOUT`. The AR-1 and AR-2 scans see synthetic violating fixtures fail before any v2 code exists, and they enumerate files at run time, so modules later packages add are covered without edits. `LEARN_HEADER_CLEARANCE = 72` lives in the dependency-free `learn-header.ts`; `LearnLayout.tsx` re-exports it (AR-24's wording) and hosts import the leaf, so the Vite fixture never links Clerk widgets through a host. Generators format their output with Prettier's API and the repo config before writing and before drift comparison.

### 04 semantics

- **Owns:** `src/lib/calculator-v2/core/analysis/`, `core/eval/`, `core/lib/`; case files `core/corpus/cases/classify-rows.ts`, `classify-definitions.ts`, `classify-relations.ts`, `display-numbers.ts`, `display-complex.ts`, `domain-real.ts`, `domain-functions.ts`; `core/corpus/semantics.corpus.test.ts`; `core/corpus/reference/elementary.json`; `scripts/calculator-v2/reference-elementary.mjs`.
- **IDs:** RC-1 to RC-15, RC-17, RC-19, RC-20; NM-1 to NM-6, NM-8 to NM-14, NM-17 to NM-22, NM-25 to NM-28, NM-43; G-6; FN-1, FN-4, FN-6, FN-11 to FN-14, FN-17 to FN-22, FN-60.
- **Decisions:** tasks run analysis first (RC-, G-6 and `RowAnalysis.graph`), then evaluation and display (NM-, FN-). The package stays whole (the 14-package cap; a split would serialise the halves anyway, because `evaluateRows` consumes `AnalysisResult`). NM-8 lives here because `formatAxisLabel` is in `core/eval/format.ts`; NM-21 lives here because the real-plot threshold is in `compileRealFunction1`/`2`. NM-43 reference values come from mathjs BigNumber at precision 40, generated offline as Prettier-formatted JSON. RC-17's r and θ cases assert the Phase 1 `unsupported` error of RC-2.

### 05 editor-foundation

- **Owns:** `vendor/mathquill/`; `src/components/calculator-v2/math-field/`; `src/components/calculator-v2/ui/a11y/`; `src/components/calculator-v2/styles/tokens.css` and, when OI-34 is accepted, `src/components/calculator-v2/styles/math-field.css` (section 5.4); `core/corpus/cases/keys.ts`; `public/calculator-notices.txt` (MathQuill, KaTeX and each KaTeX font served, react, react-dom, scheduler, lucide-react, zod); `eslint.config.mjs` and `.prettierignore` (`vendor/**`); `tests/calculator/fixture/v2/env.d.ts`, `math-field.html`, `math-field.tsx`; `tests/calculator/v2/math-field.spec.ts`.
- **IDs:** PR-2, PR-36; AR-5, AR-42; T-1 to T-4, T-6 to T-11.
- **Decisions:** the first task commits the `vendor/**` ESLint and Prettier ignores before any vendored file, so the lint-staged `prettier --write` hook never rewrites `mathquill.js` (the AR-5 sha256 test depends on it). `vendor/mathquill/PATCHES.md` records: the outro becomes an ES-module default export with no `window.MathQuill` assignment (API-15); Symbola removed and fonts mapped to KaTeX (AR-39); MathQuill's paste handling and undo disabled (AR-14, KB-2). A browser test asserts `"MathQuill" in window` is false after a MathField mounts; the adapter smoke also runs under Turbopack (11's smoke) and esbuild (13's standalone spec). Speech text comes from the v2 parser tree. `env.d.ts` declares `*.css?inline` for every harness page.

### 06 plot

- **Owns:** `src/lib/calculator-v2/plot/` except `from-analysis.ts`, `from-analysis.test.ts` and `golden.test.ts` (07).
- **IDs:** G-1, G-7 to G-13, G-15 to G-17, G-23.
- **Decisions:** tests use plain closures (no evaluator exists in wave 1); G-15 is a deterministic evaluation-count test (`*.perf.test.ts`); region shading is CSS-px spans for the current `ViewSpec`; `axisTicks` returns positions only and the renderer labels them with `formatAxisLabel` (NM-8, 04).

### 07 engine-worker

- **Owns:** `src/lib/calculator-v2/core/api/`; `src/lib/calculator-v2/worker/` except `create.standalone.ts`; `src/lib/calculator-v2/plot/from-analysis.ts`, `plot/from-analysis.test.ts`, `plot/golden.test.ts`; `core/corpus/cases/graph.ts`; `src/components/calculator-v2/ui/hooks/`; `src/components/calculator-v2/__fixtures__/dom-stubs.ts`; `tests/calculator/fixture/v2/harness-kit.tsx`, `worker.html`, `worker.tsx`; `tests/calculator/v2/worker.spec.ts`.
- **IDs:** NM-16, NM-42; AR-4, AR-43 to AR-50, AR-54; API-1, API-2, API-4 to API-11, API-13.
- **Open items:** OI-10, OI-23, OI-24, OI-32 (Task 11), OI-35 (Task 7).
- **Decisions:** `plotInputFor` maps each graphing `RowAnalysis.graph` to a `PlotInput`; it lives here because it needs both 04's compiler and 06's types, and the executor only calls it. The `ready` message carries `worker: "karman-compute-v1"` (OI-29). The main thread's `analyzeRows` is the source of kind, error, chips and complex hint; worker messages only add values, plots, `overrun` and the `timeout` error. `SkinContext` lives in `ui/hooks/` so 08 and 09 consume it before 10 provides it.

### 08 graph

- **Owns:** `src/lib/calculator-v2/render/`; `src/components/calculator-v2/ui/graph/`; `src/components/calculator-v2/styles/graph.css`; `tests/calculator/fixture/v2/graph.html`, `graph.tsx`; `tests/calculator/v2/graph.spec.ts`, `graph-pixels.ts`.
- **IDs:** G-5; KB-8; AN-8; A11Y-1.
- **Decisions:** G-5's buttons change the view instantly in Phase 1 (AN-7 animates from Phase 2); the polar grid draws in Phase 1 (V1-40). Shading goes through `compositeShading` (03). `GraphRenderer` treats a null 2D context as "skip the frame". `graph.spec.ts` samples canvas pixels on `/v2/graph.html` in all 12 skins for the G-1, G-7, G-17 and TH-8 cases of section 5.3.

### 09 editor-ui

- **Owns:** `src/components/calculator-v2/ui/list/`, `ui/keypad/`, `ui/settings/`, `ui/focus/`; `src/components/calculator-v2/icons/`; `styles/list.css`, `keypad.css`, `settings.css`; `tests/calculator/fixture/v2/editor.html`, `editor.tsx`; `tests/calculator/v2/editor.spec.ts`.
- **IDs:** FN-16; R-1 to R-3, R-5, R-9, R-10; T-13; K-1, K-3 to K-7, K-9 to K-11; S-1, S-5, S-7; KB-2, KB-5; L-3; AN-1 to AN-5, AN-11; A11Y-2 to A11Y-5, A11Y-15.
- **Open items:** OI-4.
- **Decisions:** Phase 1 Edit list shows Clear all and Done only; Add item adds an expression row; the functions panel shows categories 1, 2 and 8 (exp, ln, log, logₐ) under `CATEGORY_HEADINGS` in K-4 order (`it("K-4 Functions panel shows the shipped categories 1, 2 and 8 in K-4 order under CATEGORY_HEADINGS, category 8 holding exp, ln, log, logₐ only", …)` reading `panelCategories()`); L-3's gutter numbers and focused or active row cue ship here (component test; 15 adds visual snapshots); row swatches use `resolveRowColor(row.color, skin)` and show `EXPLICIT_COLOUR_NOTE` when adjusted; S-7 bounds evaluate through `HelperExpression`; a row containing `\sim` shows the PR-9 `unsupported` error after K-7's edit.

### 10 shell

- **Owns:** `src/components/calculator-v2/KarmanCalculator.ts` and its test; `ui/App.tsx`, `ui/ErrorBoundary.tsx`, `ui/layout/`, `ui/controller/` (with `ui/controller/__fixtures__/`); `src/components/calculator-v2/host/`; `styles/base.css`, `styles/generated.ts`; `scripts/build/calculator-v2.mjs`; `tests/calculator/fixture/v2/calculator.html`, `calculator.tsx`; in `tests/calculator/v2/`: `shell.spec.ts`, `shell-keyboard.spec.ts`, `shell-motion-theme.spec.ts`, `shell-settings.spec.ts`, `shell-helpers.ts`, `shell-probes.ts`.
- **IDs:** NM-29; AR-29, AR-35, AR-36, AR-38 to AR-40, AR-52, AR-57, AR-60; API-12; L-1, L-2, L-8, L-14; K-2, K-12; S-6; KB-3, KB-7, KB-13; AN-13, AN-14; A11Y-7; TH-14, TH-15, TH-17.
- **Open items:** OI-3, OI-7, OI-31 (Task 12).
- **Decisions:** AR-36's script `scripts/build/calculator-v2.mjs` runs in styles-only mode (`--styles`) until 13 adds the standalone bundle. The constructor writes `element.dataset.karmanCalculator = KARMAN_CALCULATOR_SENTINEL`, so the AR-32 sentinel survives tree shaking. The forwarding test `vi.mock`s `ui/App` so only engine forwarding runs in jsdom. TH-14 is a browser test of computed outline and contrast over every shell focusable in all 12 skins. `focusOnOpen` implements OI-7 and the reset announcement implements OI-3; 11 only passes the `OpenTrigger`, the frame and `announceReset`.

### 11 seam

- **Owns:** in `src/components/calculator/`: `calculator-window-store.ts`, `CalculatorWindow.tsx`, `CalculatorWindow.module.css`, `CalculatorLoader.tsx`, `CalculatorScope.tsx`, `CalculatorSourceAction.tsx`, `font-warmup.ts`, `question-key.ts`, with their tests; `src/components/learn/QuizEngine.tsx`, `DailyChallenge.tsx`, `catalog-practice/CatalogPractice.tsx`, `ExternalCalculatorLink.tsx`, `ExternalCalculatorLink.test.tsx`; `src/components/diagnostic/DiagnosticClient.tsx`, `diagnostic/parts/DiagnosticHeader.test.tsx`; `tests/calculator/fixture/main.tsx`, `platform.tsx`, `server.mjs`, `daily-actions.ts`; `scripts/build/check-calculator-v2-bundle.mjs`, `scripts/build/turbopack-output.mjs`, `scripts/build/__fixtures__/turbopack-16.3.8/`; `tests/unit/calculator-v2/bundle-check.test.ts`; `docs/calculator-v2-bundle-baseline.json`; `scripts/calculator-v2/release.sh`; `playwright.cf-preview.config.ts`, `tests/cf-preview/worker.spec.ts`; `playwright.calculator-v2-e2e.config.ts`, `tests/e2e/calculator-v2-smoke.spec.ts`; `playwright.config.ts`; `.github/workflows/ci.yml`, `.github/pull_request_template.md`; in `tests/calculator/v2/`: `quiz-helpers.ts`, `quiz-window.spec.ts`, `quiz-reset.spec.ts`, `quiz-loading.spec.ts`, `quiz-dock.spec.ts`, `quiz-chrome-theme.spec.ts`.
- **IDs:** RC-21; NM-24; AR-8, AR-9, AR-13, AR-18, AR-20, AR-22 to AR-28, AR-30 to AR-33, AR-41, AR-53, AR-56, AR-58, AR-59, AR-61, AR-66; L-4 to L-6, L-10, L-11; S-9; KB-6, KB-10, KB-12; AN-10; A11Y-6.
- **Open items:** OI-28, OI-29.
- **Decisions:** the first task captures Next 16.3.8's Turbopack output shapes (the async chunk group that loads `quiz-host`, the worker creation call, the bootstrap's `#params=` encoding and the client reference manifest) into `scripts/build/__fixtures__/turbopack-16.3.8/` and writes `turbopack-output.mjs` against them; any other installed Next version fails loudly. AR-33's eager budget is the per-route gzip delta against a recorded build of `08c8c76`. The AR-32 scan covers every file under `.open-next/server-functions/**`, after a positive control finds the sentinel and `mq-root-block` in a non-eager chunk. Docked mode ships through the window store and a fixture-only control that calls `calculatorWindowStore.set({ mode: "docked" })`. Hosts pass `questionKey`; catalog and daily pass `dockTop={LEARN_HEADER_CLEARANCE}` from `learn-header.ts`. `platform.tsx` gains `SignIn`, `SignUp` and `UserButton` stubs so the real `LearnLayout` renders in `?flow=catalog` and `?flow=daily` (AR-24); `server.mjs` aliases `@/app/learn/daily-challenge-actions` to `daily-actions.ts`. `CalculatorWindow.module.css` styles `.titleSlot > button` for 13's title-bar buttons within the eager budget. `ExternalCalculatorLink` passes `questionKey ?? useId()` and gets a v2 test. `playwright.config.ts` only adds `testIgnore: /calculator-v2/` to its e2e projects, so existing suites stay on v1.

### 12 transfer-core

- **Owns:** `src/lib/calculator-transfer/` except `clipboard.ts` and `clipboard.test.ts`; `src/lib/calculator-transfer/question-dialect.corpus.test.ts`; `src/components/learn/math-segments.ts` and its test (`math-segments.test.tsx`); `src/components/learn/MathText.tsx`; `src/components/calculator-v2/transfer/`; `core/corpus/cases/question-dialect.ts`.
- **IDs:** PR-1, PR-5, PR-6, PR-44; TR-1, TR-3, TR-5 to TR-14, TR-18 to TR-21, TR-26 to TR-28, TR-32, TR-35 to TR-38, TR-40, TR-71 to TR-73, TR-77, TR-79; AR-3, AR-16.
- **Open items:** OI-6 (spec text, applied before its PR-1 and PR-6 tests), OI-22.

### 13 paste-standalone

- **Owns:** `src/lib/calculator-transfer/clipboard.ts`, `clipboard.test.ts`; `src/components/calculator-v2/chrome/`, `standalone/`; `src/lib/calculator-v2/worker/create.standalone.ts`; `package.json`, `package-lock.json` (esbuild pinned devDependency; `calculator:build` runs v1 then v2); `playwright.calculator.config.ts`; `core/corpus/cases/paste.ts`; `tests/unit/calculator-v2/standalone-config.test.ts` (AR-63's config and `/karman-calculator-v2/` checks); `tests/calculator/fixture/serve-standalone.mjs`; `tests/calculator/v2/paste.spec.ts`, `standalone.spec.ts`.
- **IDs:** CB-1; AR-14, AR-62, AR-63; API-15; L-12, L-13; T-5, T-12; KB-1.
- **Open items:** OI-6 (clipboard routing and the `paste.ts` case), OI-26, OI-37 (Task 9).
- **Decisions:** App wraps `CalculatorLayout` in 13's `CalculatorChrome`, which installs the shadow-root `paste` (capture phase), `copy`, `cut`, `dragover` and `drop` listeners, portals `TitleBarControls` into the chrome slot and renders the shortcuts popover and "Math to paste" in the shadow root; T-5's copy and paste round trips run through those listeners; the shortcuts popover's title-bar button uses `aria-controls` on the host id (A11Y-7); the title-bar buttons take their layout from 11's `.titleSlot > button` rule.

### 14 transfer-ui

- **Owns:** `src/components/calculator/TransferControl.tsx`, `TransferControl.module.css`, `transfer-control.css`, `transfer-selection.ts`, `transfer-report.ts`, `use-transfer-bridge.ts` (tested in `CalculatorScope.transfer.test.tsx`), with their tests, and `CalculatorScope.transfer.test.tsx`, `transfer-call-sites.test.tsx`; `src/components/learn/QuestionTable.tsx`, `quiz/TableChoiceOption.tsx`, `quiz/ActiveQuizScreen.tsx`, `catalog-practice/CatalogQuestion.tsx`; `src/components/diagnostic/parts/AnswerChoiceButton.tsx`; `tests/calculator/fixture/v2/transfer-questions.ts`; in `tests/calculator/v2/`: `transfer-helpers.ts`, `transfer.spec.ts`, `transfer-touch.spec.ts`, `transfer-docking.spec.ts`, `transfer-failures.spec.ts`, `transfer-visual.spec.ts` and `transfer-visual.spec.ts-snapshots/`.
- **IDs:** TR-2, TR-4, TR-41 to TR-59, TR-64 to TR-70, TR-76; AR-10 to AR-12, AR-17, AR-21, AR-37, AR-55; L-7, L-9; KB-4; AN-12; A11Y-11; TH-2.
- **Open items:** OI-2, OI-16, OI-18, OI-21, OI-36 (Task 9).
- **Decisions:** L-7 and KB-4 are tested with real transfers; TH-2 and AR-37 are owned here because the last light-DOM surfaces (TransferControl, its tooltip, outline and chooser) land here; 11 contributes the window-chrome cases.

### 15 release-gates

- **Owns:** `tests/calculator/v2/parity.spec.ts`, `parity-rows.spec.ts`, `parity-settings.spec.ts`, `parity-helpers.ts`, `visual.spec.ts` (and its snapshot folder), `perf.spec.ts`; `tests/unit/calculator-v2/parity.test.ts`, `standalone-budget.test.ts`; `tests/e2e/calculator-v2.spec.ts`; `src/lib/calculator-v2/core/corpus/coverage.test.ts`; `src/lib/calculator-v2/assets-scan.test.ts`; `CLAUDE.md`.
- **IDs:** V1-1 to V1-12, V1-14 to V1-21, V1-23, V1-24, V1-26, V1-27, V1-29 to V1-34, V1-38 to V1-46, V1-49, V1-51, V1-61 to V1-64; PR-41; FN-15; TR-74, TR-75; AR-34, AR-51, AR-65; TH-18.
- **Open items:** OI-11, OI-20.
- **Decisions:** each V1 item's v1 case is ported into the parity specs (browser and component items) or `parity.test.ts` (unit items, section 7) with the deliberate changes of overview section 6.1. AR-34 warms the module graph with one discarded open in a throwaway page, then measures in a fresh page; the method is recorded beside the baseline. Gate tasks state their expected result as "PASS on first run; a failure becomes a fix task" (15's rule R4, with a mutation check per test).

## 3. Execution order

| Wave | Packages (parallel)                         | Gate before the next wave (in addition to the common checks below)                                                                                                     |
| ---- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | 02 parser, 03 foundations                   | `npx tsx scripts/calculator-v2/generate-skin-colors.ts --check`                                                                                                        |
| 1    | 04 semantics, 05 editor-foundation, 06 plot | `npm run test:calculator -- --project=calculator-chrome --project=calculator-safari tests/calculator/v2/math-field.spec.ts`                                            |
| 2    | 07 engine-worker                            | `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/worker.spec.ts`                                                                            |
| 3    | 08 graph, 09 editor-ui                      | graph and editor specs on calculator-chrome and calculator-ios                                                                                                         |
| 4    | 10 shell                                    | `node scripts/build/calculator-v2.mjs --styles --check`; `npm run test:calculator -- tests/calculator/v2/shell` (the four shell specs) on all five calculator projects |
| 5    | 11 seam                                     | the 1A release of section 1, then the 1A PR                                                                                                                            |
| 6    | 12 transfer-core                            | none beyond the common checks                                                                                                                                          |
| 7    | 13 paste-standalone, 14 transfer-ui         | `npm run test:calculator` (all projects, now started through `npm run dev:calculator`); `npx playwright test --config=playwright.calculator-v2-e2e.config.ts`          |
| 8    | 15 release-gates                            | the 1B release of section 1, then the 1B PR                                                                                                                            |

Common checks at every wave, in the integration worktree with the gate environment of section 1:
`npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm test`, `npm run cf:build`,
`node scripts/check-file-sizes.mjs`, and
`npx tsx scripts/calculator-v2/check-spec-ids.mjs --packages <every package merged so far>`.
A package starts only when every package it depends on has merged. Within a package, tasks run in
file order; each ends with a commit. 05 depends on 03 as well as 02: 05 Task 2 imports 03's
`ROLE_VARS` from `src/lib/calculator-v2/theme` and runs 03's `no-raw-colours.test.ts`, so 03 must
have merged before 05 Task 2 starts. Wave 0 (02 and 03) merges before the wave 1 worktrees are
cut, which guarantees this; 05 never starts in wave 0.

## 4. Working rules for every package

- **File ownership.** Each file has one owning package (section 2). Another package touches it
  only through a scaffold or an extension edit in section 5, always in a later wave, never two in
  one wave.
- **Spec documents.** Files under `docs/superpowers/specs/` are edited only by the open-item tasks
  of section 6, with the exact replacement text, in the same commit as the code and tests that
  the fix changes. These edits are exempt from file ownership because each replaces distinct text.
- **Generated files.** `skin-colors.generated.ts` and `calculator-chrome.generated.css` (03),
  `styles/generated.ts` (10), `core/corpus/reference/elementary.json` (04) and
  `docs/calculator-v2-bundle-baseline.json` (11) are written only by their scripts, which format
  output with Prettier's API and the repo config before writing and before any drift comparison;
  each has a drift test. A package that edits calculator CSS after wave 4 reruns
  `node scripts/build/calculator-v2.mjs --styles` in the same commit; harness pages import CSS with
  Vite's `?inline` (declared in `tests/calculator/fixture/v2/env.d.ts`). Nothing references
  `vite/client` or `import.meta.glob`.
- **Test layout.** Unit and component tests are co-located `*.test.ts(x)` files (jsdom files
  start with `// @vitest-environment jsdom` and call `installDomStubs()` from
  `src/components/calculator-v2/__fixtures__/dom-stubs.ts` when they mount v2 UI). Browser specs
  live in `tests/calculator/v2/` and run on the Vite fixture, on a harness page under
  `tests/calculator/fixture/v2/` or on the quiz fixture with `?calc=v2`. Synthetic questions only;
  no answer is ever submitted.
- **Commands.** Unit: `npx vitest run <file> -t "<ID>"`. Browser:
  `npm run test:calculator -- --project=calculator-chrome <spec> -g "<ID>"`, adding
  `--project=calculator-ios` and `--project=calculator-android` for touch IDs and
  `--project=calculator-firefox --project=calculator-safari` for cross-engine IDs (KB-1, AR-40,
  AR-42). Turbopack: `npx playwright test --config=playwright.calculator-v2-e2e.config.ts -g "<ID>"`
  (stop any other `next dev` in the worktree first; Next allows one dev server per project).
- **Chromium-only checks.** The AR-40 CDP `CSS.getPlatformFontsForNode` case calls
  `test.skip(browserName !== "chromium", "<reason>")`. AR-51's long-animation-frame observer, the
  4× CPU throttling of AR-34 and TR-75 and the `perf.spec.ts` timings skip unless the project is
  calculator-chrome (`test.skip(testInfo.project.name !== "calculator-chrome", "<reason>")`):
  calculator-android is Chromium too, but AR-34 names desktop Chromium and 15's R5 keeps one
  measurement set. Every other v2 browser test runs on all five projects unless its task names
  projects.
- **Test titles** start with the spec IDs (`01-interfaces.md` section 0). A test in a package other
  than the ID's owner is a contribution and must appear in section 5.3.
- **Owning task.** An ID's owning task is the first task of its owning package whose failing-test
  step titles it; later tasks of that package may add tests titled with it, and other packages only
  through section 5.3. Tasks run in file order, so where a package header lists IDs by task, the
  lowest-numbered task listed for an ID is its owning task, and its test is the one the ID requires.
- **Wave 8.** 15-release-gates may edit a file another package owns only to fix a failing gate,
  one commit per fix whose message names the ID and the owning package. Every other package edits
  only its own files, scaffolds and section 5 extension edits.
- **Releases.** Nobody runs `npm run cf:deploy` outside `scripts/calculator-v2/release.sh`, and no
  `.env*` file ever defines `CALCULATOR_V2_ROLLOUT`.
- **Phase 1 scope of shipped-part IDs** (overview section 7.3): K-4 shows categories 1, 2 and 8
  (exp, ln, log, logₐ); Edit list has Clear all and Done; Add item adds an expression row; L-12's
  title bar has no mode control; L-13 covers math paste, the manual box and refusals; S-1's order
  test covers the controls that ship; R-5 has no fraction toggle; RC-10 and NM-17 check chips on
  analysis output while FN-16 renders the hint and its action (OI-4); zoom buttons and Home change
  the view instantly; a `\sim` row shows `unsupported`; AR-56 uses a 2,000-node implicit row;
  TH-11 covers API hex colours; reverse-contrast cases wait for TH-13; AR-45 never sends
  `regression` or `poi`; API-8's `mode` observer never fires before Phase 2; TH-8 covers inequality
  regions only; AR-33's standalone budget joins when 13 lands the standalone build; KB-1's help
  popover lists the Phase 1 shortcuts and omits the table and regression usage until tables ship
  in Phase 3.

## 5. Shared files

### 5.1 Scaffolds

02-parser creates each case file below as a one-line stub
(`const cases: CorpusCase[] = []; export default cases;`) and imports all of them in
`cases/index.ts`. From then on only the named package edits the file.

| Case files under `src/lib/calculator-v2/core/corpus/cases/`                                                                                                 | Owner |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `classify-rows.ts`, `classify-definitions.ts`, `classify-relations.ts`, `display-numbers.ts`, `display-complex.ts`, `domain-real.ts`, `domain-functions.ts` | 04    |
| `keys.ts`                                                                                                                                                   | 05    |
| `graph.ts`                                                                                                                                                  | 07    |
| `question-dialect.ts`                                                                                                                                       | 12    |
| `paste.ts`                                                                                                                                                  | 13    |

### 5.2 Extension edits

| File                                                   | Owner | Edited by | Edit                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------ | ----- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/calculator-v2/host/quiz-host.ts`       | 10    | 12        | Add `applyTransfer(payload, trigger)` to `QuizCalculatorHandle`, delegating to `transfer/apply.ts`                                                                                                                                                                                        |
| `src/components/calculator-v2/ui/App.tsx`              | 10    | 13        | App wraps `CalculatorLayout` in 13's `CalculatorChrome`, which installs the shadow-root `paste` (capture phase), `copy`, `cut`, `dragover` and `drop` listeners, portals `TitleBarControls` into the chrome slot and renders the shortcuts popover and "Math to paste" in the shadow root |
| `scripts/build/calculator-v2.mjs`                      | 10    | 13        | Default mode adds the standalone bundle after the styles                                                                                                                                                                                                                                  |
| `eslint.config.mjs`, `.prettierignore`                 | 05    | 13        | Ignore `tmp/calculator-v2-standalone/`                                                                                                                                                                                                                                                    |
| `public/calculator-notices.txt`                        | 05    | 13        | Entries for every further package AR-62's metafile test finds                                                                                                                                                                                                                             |
| `tests/calculator/fixture/server.mjs`                  | 11    | 13        | Serve `tmp/calculator-v2-standalone/` at `/karman-calculator-v2/` (AR-63)                                                                                                                                                                                                                 |
| `src/components/calculator/CalculatorScope.tsx`        | 11    | 14        | Calls 14's `useTransferBridge` (`transfer()` on the v2 bridge with the AR-17 queue, AR-21 docking, TR-69 hold and TR-70 key check), forwards the loader's handle to it, skips the open-time `focusOnOpen` for a transfer-opened window (TR-66, TR-68) and renders the TR-67 status region |
| `src/components/calculator/CalculatorSourceAction.tsx` | 11    | 14        | v2 branch renders `TransferControl` with items from `classifyStem`/`classifyChoice`; the AR-11 optional props                                                                                                                                                                             |
| `src/components/learn/DailyChallenge.tsx`              | 11    | 14        | v2-only tool cluster after each choice label holding one `slot="cluster"` wrapper                                                                                                                                                                                                         |
| `tests/calculator/fixture/main.tsx`                    | 11    | 14        | `?questions=transfer` loads `tests/calculator/fixture/v2/transfer-questions.ts`                                                                                                                                                                                                           |
| `src/components/learn/MathText.tsx`                    | 12    | 14        | Pass `segmentIndex` and `stem` to `CalculatorSourceAction`                                                                                                                                                                                                                                |
| `scripts/calculator-v2/check-spec-ids.mjs`             | 02    | 15        | `--phase N` mode reading section 7.2 of the overview, with the "staged from Phase N" rule (K-4 due at `--phase 1`) and its unit test                                                                                                                                                      |
| `scripts/build/check-calculator-v2-bundle.mjs`         | 11    | 15        | Standalone 600 KB budget and the TR-74 eager-import rule                                                                                                                                                                                                                                  |
| `docs/calculator-v2-bundle-baseline.json`              | 11    | 15        | `standaloneGzipBytes` and the `perf` block (written by the scripts)                                                                                                                                                                                                                       |
| `tests/unit/calculator-v2/bundle-check.test.ts`        | 11    | 15        | `syntheticBuild` also writes `CORE_MARKER` into the last lazy file (TR-74 positive control)                                                                                                                                                                                               |

### 5.3 Intra-phase completion

An ID's owner tests every part that exists when the owner runs. Parts built by a later package in
the same phase are added by that package as contributions: titled tests in a file the contributor
owns. They count as allowed edits and appear in the contributor's task Files.

| ID                           | Owner | Contributions (package: cases, file)                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-5                          | 13    | 05: speech text for the T-5 examples, `math-field/speech.test.ts`                                                                                                                                                                                                                                                                                                            |
| T-13                         | 09    | 13: an over-long paste is refused and the row is unchanged, `paste.spec.ts`                                                                                                                                                                                                                                                                                                  |
| TH-1                         | 03    | 10: rendered shadow surfaces, `shell.spec.ts`; 11: window chrome, splitter, grip, loader, `quiz-chrome-theme.spec.ts`; 14: TR-51 tooltip text at 7:1, `transfer.spec.ts`                                                                                                                                                                                                     |
| TH-8                         | 03    | 08: combined canvas shading never exceeds 1.3:1 in all 12 skins, `graph.spec.ts`; 14: a transferred inequality and system shade within 1.3:1 and keep curves at 4.5:1, transfer.spec.ts                                                                                                                                                                                      |
| G-1, G-7, G-17               | 06    | 08: "G-1 strict inequality boundary is dashed and non-strict solid on canvas", "G-7 a point paints within 0.5 px", "G-17 overlap of two regions has higher contrast than either and curves stay ≥4.5:1 over shading", `graph.spec.ts`                                                                                                                                        |
| TH-14                        | 10    | 11: window controls, splitter and grip, `quiz-chrome-theme.spec.ts`; 14: TransferControl, `transfer.spec.ts`                                                                                                                                                                                                                                                                 |
| TH-2, AR-37                  | 14    | 11: window chrome, splitter, grip and loader take only `--kcc-*` colours and repaint on a `data-theme` change, `quiz-chrome-theme.spec.ts`                                                                                                                                                                                                                                   |
| KB-4                         | 14    | 10: opens by mouse, keyboard and touch (OI-7) and reopen restores the last row, `shell.spec.ts`; focusOnOpen per trigger, `host/quiz-host.test.ts`; 11: close returns focus and reopen within a question, `quiz-window.spec.ts`; touch and keyboard triggers reach focusOnOpen (OI-7), CalculatorScope.test.tsx                                                              |
| A11Y-2                       | 09    | 10: reset announcement only when the window stayed open (OI-3), `KarmanCalculator.test.ts` and `shell.spec.ts`; keyboard undo and redo announce Undone. and Redone., `shell.spec.ts`; 13: paste refusals and invalid paste payloads (OI-26), `paste.spec.ts`                                                                                                                 |
| A11Y-7                       | 10    | 11: toolbar trigger and side button `aria-controls` the host, `CalculatorScope.test.tsx`; 13: Keyboard shortcuts button, `chrome/TitleBarControls.test.tsx`                                                                                                                                                                                                                  |
| AR-32                        | 11    | 10: the constructor writes the sentinel to `element.dataset.karmanCalculator`, `KarmanCalculator.test.ts`                                                                                                                                                                                                                                                                    |
| AR-33                        | 11    | 15: the standalone 600 KB rule on recorded fixtures, `tests/unit/calculator-v2/standalone-budget.test.ts` (the release script enforces it on the real build); 14: the classifier is reached only through `import()` (D4), `transfer-classifier.test.tsx`                                                                                                                     |
| AR-41                        | 11    | 15: a transferred row with parentheses and a square root inserted before fonts are warm matches its baseline after reflow, `visual.spec.ts`                                                                                                                                                                                                                                  |
| AR-57                        | 10    | 03: `reportCalculatorError` sends only name, code and tags, `report-error.test.ts`; 13: the standalone page reports nothing, `standalone.spec.ts`                                                                                                                                                                                                                            |
| AR-65                        | 15    | 11: Turbopack smoke (practice opens v2, `y=x^2` graphs, worker bootstrap from `/_next/`, fonts, no globals, chunk failure), `tests/e2e/calculator-v2-smoke.spec.ts`                                                                                                                                                                                                          |
| API-15                       | 13    | 05: no `window.MathQuill`, `math-field.spec.ts`; 11: no calculator globals under `next dev`, `calculator-v2-smoke.spec.ts`                                                                                                                                                                                                                                                   |
| L-3                          | 09    | 15: visual snapshots of the gutter and the focused and active rows, `visual.spec.ts`                                                                                                                                                                                                                                                                                         |
| L-12                         | 13    | 11: label and the window controls of each mode in order, `CalculatorWindow.test.tsx`                                                                                                                                                                                                                                                                                         |
| TR-73                        | 12    | 14: the reporter receives only the question id and the rule ID, `transfer-report.test.ts`                                                                                                                                                                                                                                                                                    |
| PR-1                         | 12    | 13: pasted plain text and pasted rendered question math (OI-6) parse to the tree of their typed twin, clipboard.test.ts                                                                                                                                                                                                                                                      |
| TH-10                        | 03    | 07: new rows take c1…c6 then repeat in getExpressions(), core/api/engine.rows.test.ts                                                                                                                                                                                                                                                                                        |
| NM-8                         | 04    | 06: axisTicks spaces ticks at 1, 2 or 5 × 10^k at least 80 px apart, plot/ticks.test.ts                                                                                                                                                                                                                                                                                      |
| NM-42                        | 07    | 09: typed and keypad refusals, ui/list/ExpressionPanel.test.tsx and ui/keypad/key-input.test.tsx; 10: Alt+Enter row-limit refusal, shell.spec.ts; 12: over-limit transfer inserts nothing, transfer/apply.test.ts; 13: over-long paste, paste.spec.ts; 14: over-limit transfer reported only in the TR-67 region, transfer-docking.spec.ts; 02: corpus case, parse-errors.ts |
| G-5                          | 08    | 06: the default view is x -10..10 with equal units and a resize keeps units per px, plot/viewport.test.ts                                                                                                                                                                                                                                                                    |
| G-8                          | 06    | 08: a line set strokes the full view height or width at its position, render/draw-geometry.test.ts                                                                                                                                                                                                                                                                           |
| R-10                         | 09    | 10: after setBlank() a keyboard reopen focuses Expression 1, shell.spec.ts                                                                                                                                                                                                                                                                                                   |
| AR-7                         | 03    | 11: CalculatorScope renders v1 without a provider and v2 inside a v2 provider, CalculatorScope.test.tsx                                                                                                                                                                                                                                                                      |
| AR-24                        | 11    | 03: learn-header.ts imports nothing and LearnLayout re-exports LEARN_HEADER_CLEARANCE = 72, seam-boundaries.test.ts                                                                                                                                                                                                                                                          |
| AR-43                        | 07    | 13: the standalone page constructs its own worker.js named karman-calculator, standalone.spec.ts                                                                                                                                                                                                                                                                             |
| AR-45                        | 07    | 06: geometryTransferables lists each geometry's own buffers once, plot/geometry.test.ts                                                                                                                                                                                                                                                                                      |
| AR-50                        | 07    | 13: the standalone page opened from file:// graphs, falling back to the main thread where the worker cannot start, standalone.spec.ts                                                                                                                                                                                                                                        |
| TR-50                        | 14    | 12: descriptions and occurrence numbering, ct/describe.test.ts, ct/classify.choice.test.ts                                                                                                                                                                                                                                                                                   |
| PR-2                         | 05    | 02: corpus case, printer.ts                                                                                                                                                                                                                                                                                                                                                  |
| PR-41                        | 15    | 02: corpus case, parse-literals.ts                                                                                                                                                                                                                                                                                                                                           |
| NM-16                        | 07    | 04: corpus case, classify-rows.ts                                                                                                                                                                                                                                                                                                                                            |
| NM-29                        | 10    | 04: corpus case, display-numbers.ts                                                                                                                                                                                                                                                                                                                                          |
| NM-24                        | 11    | 04: corpus case, display-numbers.ts                                                                                                                                                                                                                                                                                                                                          |
| RC-21                        | 11    | 04: corpus case, classify-rows.ts                                                                                                                                                                                                                                                                                                                                            |
| TH-11                        | 03    | 09: an adjusted explicit colour shows EXPLICIT_COLOUR_NOTE on its row, ExpressionRow.test.tsx                                                                                                                                                                                                                                                                                |
| T-9                          | 05    | 09: the functions panel's sin button gives \sin\left(\right) with the caret inside, so typing x gives \sin\left(x\right), ui/keypad/FunctionsPanel.test.tsx                                                                                                                                                                                                                  |
| T-11                         | 05    | 09: a row sets inputmode none while the on-screen keypad is open and text after it closes, ui/list/ExpressionRow.test.tsx                                                                                                                                                                                                                                                    |
| G-1, G-7 to G-13, G-16, G-17 | 06    | 07: golden graph cases graph-1 to graph-19 and graph-21 through analyzeRows, evaluateRows, plotInputFor and plotRow, rules of core/corpus/cases/graph.ts (plot/golden.test.ts)                                                                                                                                                                                               |
| G-6                          | 04    | 07: golden graph case graph-20, a function defined in a later row graphs, core/corpus/cases/graph.ts (plot/golden.test.ts)                                                                                                                                                                                                                                                   |
| PR-15, PR-42                 | 02    | 04: classification corpus cases (kind and chips) for `2e_{3}` and the SAT forms, classify-rows.ts and classify-relations.ts                                                                                                                                                                                                                                                  |

Rows whose text a package quotes are copied verbatim (PR-1 from 12's precondition P2, which 13
Task 3 Step 1 greps for; TR-50 from 12's P2; TH-10, AR-24, AR-7 and G-8 from the notes of 07, 03,
11 and 08; NM-42 from 07's Notes plus 15's corpus case; TH-11 and the TH-8 entry of 14 from 03's
notes 8 and 9; the corpus rows from 15's Notes, whose cases 04 Task 9 already writes and 02
already holds). In the TR-50 row, `ct/` is `src/lib/calculator-transfer/` (12's
abbreviation); in the TH-10 row, `core/` is `src/lib/calculator-v2/core/`; in the NM-42 row,
`transfer/` is `src/components/calculator-v2/transfer/`. Every contribution that a package plan
does not yet hold (NM-42 in 09, 12, 13 and 14; TH-8 in 14; TH-11, T-9 and T-11 in 09) is added by
the lead's edits of section 5.4, whose check names each one still missing.

### 5.4 Plan-file edits the lead applies

Package notes request these edits of other packages' plan files. Items 6 and 7 are already in the
package files. The lead applies items 1 to 5, 8 and 9 (each one not yet present) before the plan
commit of section 1, finding each test by its title (line numbers move), so every contribution in
5.3 is a titled test in the contributor's task Files; then the check after the list, run in this
directory, prints nothing (each line it prints names a missing title or entry).

1. **NM-42 retitles.** Four tests now titled T-13 or TR-73 become: in `09-editor-ui-2-list.md` Task 4 `"T-13, NM-42 a typed edit past 2,048 characters is refused with a status message and leaves the row unchanged"`; in `09-editor-ui-3-keypad.md` Task 9 `"T-13, NM-42 a keypad key at the 2,048-character limit is refused with the status message and leaves the row unchanged"`; in `12-transfer-core-4-apply.md` Task 9 `"TR-73, NM-42 a transfer past the row or character limit inserts nothing"`; in `13-paste-standalone-4-browser.md` Task 10 `"T-13, NM-42 an over-long paste is refused with the status message and leaves the row unchanged"`. 13's task table row 10 then reads `contributions A11Y-2, T-13, NM-42`. The `12-transfer-core.md` Notes bullet that began "07's note asks 12 for" is already gone.
2. **NM-42 in 14.** `14-transfer-ui-4-scope.md` Task 12 Step 1 appends to `tests/calculator/v2/transfer-docking.spec.ts` `test("NM-42 an over-limit transfer inserts nothing and is reported only through the TR-67 region", …)`: fill the calculator to 100 rows through the test-exposed engine and transfer a stem item; the quiz-side status region reads "This can't be added to the calculator.", the calculator's own live region stays empty and the row count stays 100. 12's apply step and 14 Task 3 already build this, so Step 2 lists it as passing on its first run, and Step 6 adds a mutation: the drain skips `announce` when `result.status === "rejected"`; Expected: FAIL at the status region text. 14's "Tasks and IDs" row 12 then reads `TR-66, AR-55, TR-68, KB-4, TR-67, A11Y-11; contribution NM-42`.
3. **TH-8 in 14.** `14-transfer-ui-4-scope.md` Task 14 Step 1 adds to `transfer.spec.ts` `test("TH-8 a transferred inequality and system shade within 1.3:1 and keep curves at 4.5:1", …)` with 03 note 9's assertions: after transferring the fixture's inequality and its system of 2 inequalities, in all 12 skins and with 08's `graph-pixels.ts` helpers, the `shading` layer has no partial pixel, each opaque colour is a `compositeShading` result of the rows' fills at most 1.3:1 on the paper, and every row's curve colour is at least 4.5:1 against each. Step 2's `-g` gains `TH-8`; Step 4 adds a mutation: in `src/lib/calculator-v2/render/shading.ts` colour each run with its last region's `color` in place of the `compositeShading` result; Expected: FAIL at the 1.3:1 bound. 14's "Tasks and IDs" row 14 then reads `TR-53, TH-2, AR-37; contributions TH-1, TH-14, TH-8`.
4. **TH-11 in 09.** In `09-editor-ui-1-rows.md` Task 2 the test "R-1 an explicit colour that the skin adjusts shows the TH-11 note" becomes `it("R-1, TH-11 an explicit colour that the skin adjusts shows the TH-11 note", …)`. With item 5's T-11 test, 09's "ID coverage" row 2 then reads `A11Y-3, A11Y-4, L-3, R-1; contributions TH-11, T-11`.
5. **T-9 and T-11 in 09** (never in `09-editor-ui-5-browser.md`, which is at 697 lines). `09-editor-ui-4-panels.md` Task 10 Step 1 adds to `FunctionsPanel.test.tsx` `it("T-9 the functions panel's sin button inserts \\sin\\left(\\right) with the caret inside, so typing x gives \\sin\\left(x\\right)", …)`: pressing the button records on the row's fake field exactly one `run` call whose `arg` is the sin entry of `panelCategories()`, `[{ op: "write", arg: "\\sin\\left(\\right)" }, { op: "keystroke", arg: "Left" }]` (05 Task 11's T-9 browser test runs these actions in a real MathField, types `x` and gets `\sin\left(x\right)`). `09-editor-ui-1-rows.md` Task 2 Step 1 adds to `ExpressionRow.test.tsx` `it("T-11 a row calls setInputMode none while keypadOpen and text after the keypad closes", …)`: the row's fake field records `{ method: "setInputMode", arg: "none" }` while `keypadOpen` is true and `{ method: "setInputMode", arg: "text" }` after a rerender with it false. With these two tests, 09 Task 2 Step 4's expected result becomes "PASS, 6 tests" and 09 Task 10 Step 4's becomes "PASS, 7 tests". 09's "ID coverage" row 10 then reads `K-4, A11Y-5, K-5; contribution T-9`.
6. **02's counted corpus cases.** Applied: `02-parser.md` Task 7 (`parse-literals` 35), Task 10 (`parse-errors` 51) and Task 11 (`printer` 36); do not add again (15's Notes for the lead record them as in place).
7. **OI-34 in 05.** Applied: `05-editor-foundation-1-vendor.md` Task 2 creates `src/components/calculator-v2/styles/math-field.css` with OI-34's role overrides and commits it with the vendored files, and its rejected-OI-34 path adds LESS patch 0010 instead; only section 6.2's rename touches it.
8. **OI-37 in 13.** `13-paste-standalone-4-browser.md` Task 9 gains a first step: `grep -cE '^\| OI-37 .*\| (accepted|amended) [0-9]{4}-[0-9]{2}-[0-9]{2}' docs/superpowers/specs/calculator-v2/open-items.md` prints 1 (else stop and ask the lead); then apply OI-37's T-12 text to `e-ux-keypad-accessibility-theme.md`, which joins the task's Files and commit. 13's task table row 9 then reads `9 Paste in the browser (OI-37)`, and its header ends `**Open items:** OI-6 (task 3), OI-26 (task 10), OI-37 (task 9).`
9. **OI-36 in 14.** 14 Task 9's three edits of `14-transfer-ui.md`.

```sh
while IFS='|' read -r f a b; do for t in "$a" "$b"; do [ -z "$t" ] || grep -qF -- "$t" "$f" || echo "missing in $f: $t"; done; done <<'EOF'
09-editor-ui-1-rows.md|it("R-1, TH-11 an explicit colour that the skin adjusts|it("T-11 a row calls setInputMode none
09-editor-ui-2-list.md|it("T-13, NM-42 a typed edit past 2,048 characters
09-editor-ui-3-keypad.md|it("T-13, NM-42 a keypad key at the 2,048-character limit
09-editor-ui-4-panels.md|it("T-9 the functions panel's sin button inserts
09-editor-ui.md|R-1; contributions TH-11, T-11|K-5; contribution T-9
12-transfer-core-4-apply.md|it("TR-73, NM-42 a transfer past the row or character limit inserts nothing"
13-paste-standalone-4-browser.md|test("T-13, NM-42 an over-long paste is refused|OI-37
13-paste-standalone.md|contributions A11Y-2, T-13, NM-42|OI-37 (task 9).
14-transfer-ui-4-scope.md|test("NM-42 an over-limit transfer inserts nothing|test("TH-8 a transferred inequality and system
14-transfer-ui.md|A11Y-11; contribution NM-42|contributions TH-1, TH-14, TH-8
14-transfer-ui.md|AR-11; OI-36|OI-36 (Task 9).
EOF
```

## 6. Open items

### 6.1 Items in `open-items.md`

Each Phase 1 item is resolved by one task of its package, which applies the fix text from
`open-items.md` to the spec file and changes code and tests to match in the same commit.

| Item  | Package             | What the resolving task does                                                                                                                                       |
| ----- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OI-1  | 03 foundations      | TH-11 lifts explicit colours to 5.85:1 on the paper; `resolveRowColor` and its contrast test use 5.85                                                              |
| OI-2  | 14 transfer-ui      | TR-47 wording; the answer-choice visibility test follows AR-11 (hidden unless hovered or focused on fine pointers)                                                 |
| OI-3  | 10 shell            | A11Y-2 and AR-58 wording; `mountQuizCalculator` announces the reset only when `announceReset` is true (11 sets it when the window stayed open)                     |
| OI-4  | 09 editor-ui        | Overview 7.3 row; FN-16's hint renders with a "Turn on complex mode" action that sets S-5                                                                          |
| OI-6  | 12, then 13         | 12 applies the PR-1 and PR-6 text before writing those tests; 13 routes pasted rendered question math through `normalizeQuestionMath` and adds the `paste.ts` case |
| OI-7  | 10 shell            | KB-4 wording; `focusOnOpen("touch")` activates row 1 and focuses the window frame, opening neither keyboard                                                        |
| OI-9  | 02 parser           | Overview 7.3 shipped-part list adds PR-44, AR-10, AR-45, AR-60, API-8 and TH-8 (spec text only; section 4 already scopes the tests)                                |
| OI-10 | 07 engine-worker    | D section 11 wording; the engine implements `focusExpression`, `focusFirstExpression`, `activateExpression`                                                        |
| OI-11 | 15 release-gates    | Overview 10.5 wording; `CLAUDE.md` "Calculator launch policy" sentence replaced and the v2 commands added                                                          |
| OI-13 | 02 parser           | Overview section 3 wording (spec text only)                                                                                                                        |
| OI-14 | 02 parser           | Overview 7.3 shipped-part list adds AR-10 and RC-17 (spec text only)                                                                                               |
| OI-16 | 14 transfer-ui      | TR-76 and C section 2 wording name the AR-11 wrappers                                                                                                              |
| OI-18 | 14 transfer-ui      | TR-45 wording; the hidden-control test asserts clipping for stem items and opacity 0 for answer choices                                                            |
| OI-20 | 15 release-gates    | TR-75 wording; the perf spec imports the module first, then measures press to visible row                                                                          |
| OI-21 | 14 transfer-ui      | TR-4 wording names `useCalculator()` eligibility                                                                                                                   |
| OI-22 | 12 transfer-core    | TR-32 wording; the first transferred row fills an empty last row                                                                                                   |
| OI-23 | 07 engine-worker    | API-2 wording; `note`, `folder`, `image`, `text` throw `unsupported`                                                                                               |
| OI-24 | 07 engine-worker    | API-9 wording; `{ type: "other", display }` in `ApiEvaluation`                                                                                                     |
| OI-26 | 13 paste-standalone | A11Y-2 wording lists paste refusals and invalid paste payloads                                                                                                     |
| OI-27 | 02 parser           | PR-15 wording; `e_{…}` is an identifier; the typed `2e3` keystroke case joins PR-36's list in 05's `keys.ts`                                                       |

Carried to later phase plans, because they touch only later-phase IDs or the switch-over: OI-5
(R-6, Phase 2), OI-8 (SC-12, Phase 2), OI-12 and OI-15 (switch-over documents, Phase 3), OI-17
(table 5.1, Phase 3), OI-19 (TR-31, TR-62, Phase 3), OI-25 (SC-2, Phase 2).

### 6.2 Items this plan opens

Found while planning: OI-28 to OI-30 against the installed toolchain, OI-31 and OI-32 against the
spec's own wording, and OI-33 to OI-37 in the packages' notes (OI-33 is 03's P03-2 from
coordination note 7, OI-34 is 03's P03-1 from note 6, OI-35 is 07's P07-2, OI-36 is 14's note 3 and
OI-37 is 13's decision 12). They change spec text or record an owner-accepted substitute check, so
the lead appends every row to `open-items.md` with the text below in the plan commit of section 1,
and records each owner decision as a last cell after Proposed fix (`accepted YYYY-MM-DD`,
`amended YYYY-MM-DD: <wording>` or `rejected YYYY-MM-DD`, the form 10 Task 12 and 11 Tasks 4 and
15 grep for) before the owning task's wave starts: OI-28 to OI-34 before wave 0, OI-35 before
wave 2, OI-36 and OI-37 before wave 7. A decision recorded after the plan commit is committed on
`zakaria/calculator-v2` before that wave's worktrees are cut. The owning task applies the text like
any other item. If the owner rejects OI-28 or OI-29, the named task does not start and the lead
re-plans it; any other rejected item follows the rejection text in its row. The package files call
OI-32 "P07-1" (the `07-engine-worker.md` header, plan-files table and Notes, and Task 11 with its
commit message in `07-engine-worker-6-results.md`), OI-35 "P07-2" (`07-engine-worker.md` and
Task 7 in `07-engine-worker-3-backends.md`), OI-33 "P03-2" (03 Task 3) and OI-34 "P03-1" (03 Task 6,
and 05 Task 2 with its notes in `05-editor-foundation-1-vendor.md`, including Step 4's `-t "P03-1"`
filter and the expected title). In the plan commit the lead replaces each name with its number in
`03-foundations.md`, `05-editor-foundation-1-vendor.md` and the `07-engine-worker*.md` files (the
`grep` of section 1 then prints nothing), so 05's `-t "OI-34"` selects 03 Task 6's renamed
`TH-3, OI-34 …` test. The rename is safe: 03 Tasks 3 and 6 find their rows by text, each phrase on
exactly one `open-items.md` line: `every background role except the accent` (OI-33) and
`every one of whose colour declarations is overridden` (OI-34, also 05 Step 4's spec-file grep).

| Item  | Severity | Owner task                                             | Issue                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Proposed fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----- | -------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OI-28 | blocker  | 11, loader task (14 follows)                           | AR-31's Retry "calls `import()` again", but both runtimes cache a failed dynamic import: Turbopack's chunk loader keeps the rejected chunk promise (and the failed script element), and native ESM caches the failed module fetch (a Chromium and WebKit probe saw one server hit for two imports). Retry never re-fetches, and AR-31's abort-then-allow test cannot pass.                                                                                                                                                                                                                                                                                                                                                                                           | In AR-31 replace 'and on failure "The calculator could not load." with a Retry button that calls `import()` again; the test aborts the chunk request, then allows it on Retry' with 'the module is imported once per page; when that import fails, the panel shows "The calculator could not load. Reload the page to try again." with a "Reload page" button that reloads the document; when the module loaded but mounting or a first API call throws, it shows "The calculator could not load." with a Retry button that mounts again from the loaded module; one test makes the mount throw once and passes on Retry, and one aborts the chunk request and checks the reload panel, on the Vite fixture and under `next dev`'. In AR-55 and table 11.1 ("Calculator failed to load") add: after a load failure the message is "Calculator unavailable. Reload the page to use it.". In TR-69 replace 'and the held payload is applied exactly once after a successful Retry' with 'after a mount failure the held payload is applied exactly once after a successful Retry, and after a load failure held payloads are discarded'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| OI-29 | blocker  | 11, AR-66 task (07 adds the marker)                    | Turbopack compiles `new Worker(new URL("./compute.worker.ts", import.meta.url), { type: "module", name })` into a classic worker: a `static/chunks/turbopack-worker-<hash>.js` bootstrap that reads its chunk list from a `#params=` URL hash and loads anonymous hashed chunks with `importScripts`, plus a raw copy at `static/media/compute.worker.<hash>.ts` that cannot run. Constructing "the emitted worker file" by URL with `type: "module"` throws, and a one-file AR-33 worker size is wrong.                                                                                                                                                                                                                                                             | In AR-43 after '`{ type: "module", name: "karman-calculator" }`' add '(a module worker under Vite and esbuild; Turbopack emits a classic bootstrap worker that loads the worker chunks); the worker's `ready` message carries `worker: "karman-compute-v1"`, which identifies its code in build output'. In AR-66 replace 'the emitted worker file is found under `.open-next/assets/_next/static/`, and a Playwright test against `npm run cf:preview` constructs that worker by URL on the preview origin with the same options as `create.ts`' with 'the emitted worker (the Turbopack bootstrap named by the lazy chunk's worker call and the chunks it loads, one of which contains `karman-compute-v1`) is found under `.open-next/assets/_next/static/`, and a Playwright test against `npm run cf:preview` constructs it on the preview origin the way the Turbopack runtime does (a classic worker on the bootstrap URL carrying its chunk list, named `karman-calculator`)'. In AR-33 after 'worker at most 250 KB' add '(the bootstrap plus the chunks it loads)'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| OI-30 | major    | 03, flag task                                          | OpenNext bakes `.env`, `.env.production` and `.env.local` into the Worker and applies them when no binding exists, and wrangler deletes dashboard plaintext variables on deploy without `keep_vars`. Following "Locally it goes in `.env.local`" can switch every student to v2 after a deploy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | In D section 3 replace 'Locally it goes in `.env.local`;' with 'In production it is a Worker secret (`wrangler secret put CALCULATOR_V2_ROLLOUT`), read only from the Worker binding; locally it is set in the shell or a Playwright `webServer.env`, never in a `.env*` file, and the release build fails when a `.env*` file defines it;'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| OI-31 | major    | 10, Task 12                                            | TH-14 asks for a 2 px offset on every focusable element, but a row's focused element is MathQuill's hidden textarea, so its indicator is L-3's row outline, and a row spans the list's scroll box, which clips an outset ring; 09 draws it with `outline-offset: -2px`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | In TH-14 replace `with a 2 px offset,` with `with a 2 px offset (an expression row's L-3 outline is drawn 2 px inside the row's edge, outline-offset -2px, so the list's scroll box never clips it; its contrast is measured against the row's background),`. If the owner rejects it, Task 12 does not start and the lead re-plans 09's row rule as an outset ring with list padding (a section 5.2 extension edit).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| OI-32 | major    | 07, Task 11                                            | AR-46 says the main thread "discards any message whose generation is not current". A `view` send (every pan or zoom frame) increments the generation without changing any value, so a strict reading drops every value computed for the latest state and blanks the results until the executor re-posts them.                                                                                                                                                                                                                                                                                                                                                                                                                                                        | In AR-46 replace "and the main thread discards any message whose generation is not current." with "and the main thread discards any message whose generation is not current: `plot` and `done` are current only at the latest generation sent, and `analysis`, `value` and `overrun` messages are current while no later `state` was sent, because a view change does not change values." If the owner rejects it: Decision 3 becomes "every message must carry the latest generation sent", the executor re-posts the cached values in a view-only generation, and Task 11's AR-46 acceptance test accepts the value only at the latest generation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| OI-33 | major    | 03, Task 3                                             | 10.3 asks primary text for 7:1 on every background role and the Enter key label (`surface` light, `canvas` dark) for 7:1 on the accent; no colour is 7:1 from both a darker text and a lighter label (that needs 1.05 ≥ 49 × 0.05), and the derived accents give text on accent 1.46 to 2.07:1 in all 12 skins.                                                                                                                                                                                                                                                                                                                                                                                                                                                      | In 10.3's foreground table replace `7:1 on every background role` with `7:1 on every background role except the accent, whose labels use the Enter key label role`. No accent meets both rows, so a rejection means re-planning the accent and label roles before Task 3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| OI-34 | major    | 03, Task 6 (05 Task 2 creates `styles/math-field.css`) | The shadow sheet starts with the byte-exact `vendor/mathquill/mathquill.css` (AR-5), whose raw colours at `1cbc1c4128` (selection `#B4D5FE`, blurred selection `#D4D4D4` with `black` text and border, empty block `rgba(0,0,0,.2)`, `.mq-math-mode *` and over-arc and over-arrow borders `black`, focus shadow `#8bd` and `#6ae`, focus border `#709AC0`, field and command-input borders `gray`, focused command-input border `ActiveBorder`, text-mode cursor shadow `darkgray`) break TH-3, and the explicit `black` borders are nearly invisible on dark skins. The caret is `currentColor` at the pin, so it is not a colour declaration.                                                                                                                     | In TH-3 replace `outside the two generated files of TH-5` with `outside the two generated files of TH-5 and the vendored vendor/mathquill/mathquill.css (AR-5), every one of whose colour declarations is overridden by a later calculator stylesheet rule that takes its colour from a role, except declarations every supported engine ignores (IE progid filters, -moz-box-shadow)`. Accepted: 05 owns `src/components/calculator-v2/styles/math-field.css`, committed with the vendored files (03 Task 6 fails without it), which repeats each vendored selector the check lists and gives each colour declaration a role (05 Task 2's table): field and command-input borders (`gray`) `--kc-boundary`; focused field `box-shadow: none` (for `#8bd` and `#6ae`) and `border-color` (`#709AC0`) `--kc-focus-ring`; focused command-input border (`ActiveBorder`) `--kc-focus-ring`; `.mq-math-mode *`, over-arc and over-arrow borders (`black`) `--kc-text`; empty block (`rgba(0,0,0,.2)`) `--kc-chrome`; text-mode cursor shadow (`darkgray`) `inset 0 0.1em 0.2em var(--kc-boundary)`; selection background (`#B4D5FE`, keeping `!important`) `--kc-focus-bar`, its `color` and `border-color` `--kc-focus-bar-label`; blurred selection background (`#D4D4D4`, keeping `!important`) `--kc-chrome`, its `color` and `border-color` (`black`) `--kc-text`. The sheet also pins the caret's `border-left-color` to `--kc-text` (not a checked entry). Rejected: 05 adds a listed patch (AR-5), `patches/0010-colour-roles.patch`, writing these roles in place into MathQuill's LESS, and 03 Task 6's vendored test asserts `rawColourFindings(MQ_CSS, <its text>)` is `[]` instead. |
| OI-35 | major    | 07, Task 7                                             | AR-47 requires a yield "after at most 8 ms of continuous work", and AR-50 runs the main-thread executor "in 8 ms slices". `evaluateRows` (04) and `plotRow` (06) are synchronous (`01-interfaces.md` sections 4 and 5), so the executor can yield only between units: one values pass, one helper job, one row's plot (07 Decision 1). An implicit row at the G-15 budget (up to 250,000 evaluations) or a 100-row values pass runs well past 8 ms with no yield, which on the main-thread fallback blocks the quiz UI. 07 Task 6's "AR-47 the executor yields after a unit once the slice is spent" and Task 7's "AR-50 the main-thread backend yields after each unit …" count yields between units under fake time, so they pass while the 8 ms bound is not met. | Fix (b): in AR-47 replace "after at most 8 ms of continuous work" with "after each unit of work (one values pass, one helper evaluation or one row's plot) that ends 8 ms or more after its slice began"; in AR-50 replace "in 8 ms slices" with "in the AR-47 slices". 07 Task 7 applies this text to `d-architecture-integration.md` and deletes its `it.fails` gap test. If the owner rejects it, fix (a) applies: `plotRow` and `evaluateRows` become resumable at their deadline checks so the executor can yield inside a unit (a contract change to `01-interfaces.md` sections 4 and 5 owned by 04 and 06, with 07's loop consuming it); Task 7 does not start until the lead re-plans 04, 06 and 07 Tasks 5 to 7, and the gap test becomes an `it` asserting at most 8 ms between ticks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| OI-36 | minor    | 14, Task 9                                             | AR-11's browser test covers "a profile where `(any-pointer: coarse)` and `(hover: hover)` both match". No portable Playwright setting makes `(hover: hover)` match together with a coarse pointer, so 14 Task 9 replaces that profile with a stylesheet check (14's decision "AR-11's second browser profile").                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Record, with no spec edit: "AR-11's both-match profile is verified by a stylesheet check: the loaded coarse-pointer rule's media condition names no hover or pointer feature, so it applies whatever hover reports." If the owner rejects it, the profile needs a harness 14 does not have (a real touch laptop or a device with a hovering pointer and a touch screen), and the lead re-plans 14 Task 9's AR-11 case before wave 7.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| OI-37 | major    | 13, Task 9                                             | T-12 says pasted plain text normalises calculator notation "into the same LaTeX that typing it would produce". Typing some forms builds a different structure (`sqrt(x)` types as `\sqrt{\left(x\right)}`, `3/4x` as `\frac{3}{4x}`, `x^2y` as `x^{2y}`), while PR-6 keeps paste input's own meaning. 13's decision 12 keeps the raw PR-18 meaning, so 13 Task 9's test "T-12 pasted notation that typing reads differently gives decision 12's documented LaTeX" asserts the opposite of T-12's wording.                                                                                                                                                                                                                                                            | In T-12 replace 'into the same LaTeX that typing it would produce' with 'into the LaTeX that typing its meaning would produce, keeping the raw PR-18 meaning where typing the same characters builds something else: `sqrt(x)` pastes as `\sqrt{x}`, `3/4x` as `\frac{3}{4}x`, `x/2` as `x/2` and `x^2y` as `x^{2}y`'. If the owner rejects it, the lead re-plans 13's decision 12 and Tasks 2, 3 and 9 so these forms paste the LaTeX typing gives (`\sqrt{\left(x\right)}`, `\frac{3}{4x}`, `\frac{x}{2}`, `x^{2y}`), and 13 Task 9's T-12 test expects the typed LaTeX.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## 7. Deliberate deviations and limits

- V1 items verified by unit test are ported to `tests/unit/calculator-v2/parity.test.ts`; overview
  6.1 and section 9 name only one `tests/calculator/v2/parity.spec.ts`. The browser and component
  ports are split by concern to stay under 700 lines: `parity.spec.ts` (V1-1 to V1-10),
  `parity-rows.spec.ts` (15 Task 8) and `parity-settings.spec.ts` (15 Task 9), sharing
  `parity-helpers.ts`.
- AR-51 names Chromium's long-task observer; `perf.spec.ts` observes `long-animation-frame`
  entries instead, because they attribute work to scripts (`scripts[].sourceURL`), and counts
  frames whose `blockingDuration` is above 0 (a task, plus render time for the longest task, over
  50 ms) when a script entry's `sourceURL` is calculator code or its `invoker` is a keyboard or
  input listener. Known limit: `scripts[]` lists only entry points of 5 ms or more, names the
  script that registered each one and omits rendering, so calculator work run from React's
  scheduler (`MessagePort.onmessage`) or split into entries under 5 ms is not attributed
  (15 Task 11).
- AR-66 runs in 1A (11-seam), earlier than the increment brief places it, because 1A deploys to
  Cloudflare and must ship only checked output (section 8.1).
- Docked mode is built and verified on the fixture in 1A; production admins reach it only through
  a transfer (AR-21, L-12 has no mode control in Phase 1), so hands-on docking starts in 1B.
- AR-35: besides the public API and `focusBoundary()`, the quiz host uses `reflow()` (AR-41),
  `engine` (only for `exposeEngineForTests`, a no-op in production) and the internal
  `lastFocusedRow(calculator)` (KB-4); 10's AR-35 quiz-host test allows exactly these.
- L-14: the keypad sits in flow below the list, so the list's scroll box ends at the keypad's top
  edge in place of bottom scroll padding, and the shell scrolls the focused or active row into view
  whenever that box resizes (10 Decision 2).
- 12's D1 (PR-6, TR-28): PR-6 says the integer is "followed directly by" `\frac`; 12 also accepts
  spaces between them, so `y=2 \frac{1}{3}x` becomes `y=\left(2+\frac{1}{3}\right)x`, because TeX
  ignores spaces in math mode and the question shows the mixed number 2⅓ either way.
- 12's D2 (TR-9 units): table 4.2 excludes units "directly after a digit"; 12 also excludes a unit
  word separated from the digit by spaces, so `5 mm` is `TR-9`, because it renders as `5mm` and
  would otherwise insert 5·m·m.
- 12's D3 (TR-8): table 4.2 allows `\frac` and `\sqrt`, and TeX and 02's parser read a brace-less
  argument as one token (`\frac12` is ½, `\sqrt2x` is √2·x); 12 gives the brace-less spelling
  `TR-8` instead, because its question-dialect rules are written for braces: the PR-6 pass matches
  `2\frac{1}{2}`, so accepting `2\frac12`, which also renders as 2½, would insert the product 1.
  Denying costs a missing control, and TR-80's bank scan (Phase 3) reports whether the spelling
  occurs in live questions.
- D1, D2 and D3 take effect only after the lead's sign-off (12's precondition P3, before
  12 Task 3); a rejected deviation follows the fallback in `12-transfer-core.md`.
- 14's D4 (AR-33): 12's classifier loads lazily (`14-transfer-ui.md` decision D4); the owner must sign it off.
- 13's decision 12 (T-12): pasted plain text keeps its raw PR-18 meaning where typing the same
  characters builds something else: `sqrt(x)` pastes as `\sqrt{x}` (typing the characters gives
  `\sqrt{\left(x\right)}`), `3/4x` as `\frac{3}{4}x` (typing gives `\frac{3}{4x}`), `x/2` as `x/2`
  (typing gives `\frac{x}{2}`, the same tree) and `x^2y` as `x^{2}y` (typing gives `x^{2y}`). It
  contradicts T-12's wording, so it holds only once the owner accepts OI-37 (section 6.2).
- 09's E1 (R-1, A11Y-3): "each row's gutter tab" and the "Hide expression n" or "Show
  expression n" control are read as each graphing row's: point, curve, implicit, line-set,
  region and constant-relation rows, and an error row while it is hidden. Value, definition and empty rows
  have no graph to hide and show no tab; Delete is on every row. 09 Task 2's R-1 test asserts
  that `2+3` has no Hide control.
- 09's E2 (K-10): `a²` is one `write("^2")` call, because `cmd("^")` opens an empty exponent and
  a second call would fill it; the named symbols π, θ, ≤ and ≥ go through `cmd` (`\pi`,
  `\theta`, `\le`, `\ge`) so the row holds the canonical command; every other character key is
  `typedText`. 09 Task 9's K-10 test asserts the `a²`, π and ≤ calls.
- Packages 04, 05, 07, 09, 12, 13, 14 and 15 keep one entry file (named in section 2) and put their
  tasks in part files so every plan file stays under 700 lines; task numbers run across the parts.
- The release runs `cf:build:release` (a superset of `cf:build`), the checks and `cf:deploy` in one
  scripted step (section 1); section 8.1's pairing and ordering are kept.
- `scripts/calculator-v2/check-spec-ids.mjs` runs through `npx tsx`, because it imports the
  TypeScript corpus.
- `CALCULATOR_V2_BUILD` hashes the generated CSS and `vendor/mathquill/mathquill.js`, so it
  identifies the style and editor build only; a release that changes only other JavaScript keeps
  the same id in Sentry tags (AR-57) and `KarmanCalculator.version` (API-15).
- The AR-65 specs use their own Playwright config on port 3100 with `CALCULATOR_V2_ROLLOUT=admins`,
  so the shared e2e and visual suites keep running v1.

## 8. REA confirmations

Defaults marked "confirm by REA behaviour capture in Phase 1" ship as written. The lead runs the
owner-authorised capture (timing and screenshots of visible behaviour only; nothing copied;
artifacts outside the repository) and records each result in this table before the 1B PR merges
(overview section 8.2 item 7). A capture that contradicts a default changes the rule, its corpus
cases and its tests in one commit in the owning package; a measured animation replaces an AN-
default only at or under 400 ms with no overshoot.

| Defaults                                                            | Package    | Result |
| ------------------------------------------------------------------- | ---------- | ------ |
| PR-7, PR-9 (`\ne`), PR-18, PR-24, PR-26                             | 02         | open   |
| RC-5, RC-6, RC-13, RC-14, RC-17, RC-19                              | 04         | open   |
| NM-1, NM-2, NM-10, NM-13, NM-17, NM-19, NM-27, NM-28                | 04         | open   |
| FN-12, FN-14, FN-16, FN-17, FN-21, FN-22                            | 04, 09     | open   |
| T-6, T-9, T-10                                                      | 05         | open   |
| G-5 zoom factor                                                     | 08         | open   |
| K-2, K-3, K-5, K-6 (main page; the letters page is owner-confirmed) | 09, 10     | open   |
| AN-1 to AN-5, AN-8, AN-10, AN-11                                    | 09, 08, 11 | open   |
| AR-29 internal layout threshold (560 px)                            | 10         | open   |
| S-8 More options defaults (Phase 2 control; recorded now)           | none       | open   |
