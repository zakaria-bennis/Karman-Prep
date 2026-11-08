# merge-rest report (overnight, 8 November 2026)

Branch: `claude/overnight-merge-rest-f41847`, cut from `claude/overnight-ship`
at `bbe7e094`. Nothing pushed, nothing deployed, no database touched.

Updated 08:15 CST: at the question import session's request, the import tool
merges are reverted (commit `3e8c4a9f`). Everything else below stays merged.

## What is done

I merged every remaining work channel except the import tools and the ones
merge-ui owns (quiz engine, student dashboard, figures, display fixes, grading,
calendar).

### Merged

| Branch                                                                                                 | What it brings                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `origin/zakaria/calculator-regression-release`                                                         | Nothing new: main already had its one fix. Merged so the branch shows as done.                                                                                                                                            |
| `claude/regression-desmos-parity`                                                                      | Calculator regressions now match Desmos when a fit is underdetermined or restricted.                                                                                                                                      |
| PR #215 `origin/claude/vibrant-hamilton-trk66e`                                                        | A failed lead-table insert no longer blocks a signup.                                                                                                                                                                     |
| PR #214 `origin/claude/project-thread-et6pn8`                                                          | `docs/import.md`, an index that points to the import rules.                                                                                                                                                               |
| PR #211 `origin/claude/laughing-cray-mi7t23`                                                           | Three October import-process docs.                                                                                                                                                                                        |
| PR #205 `zakaria/r2-cors-config`                                                                       | `config/r2-cors.json`, the upload bucket's CORS policy.                                                                                                                                                                   |
| `claude/first-pass` (includes `claude/site-redesign` and `claude/fable-portals-prompt-extract-f56cd4`) | The portal prototypes (`prototypes/`), the Daily 10 end screen, the redesign mocks (`.impeccable/`), the asset manifests, the docs, and your newest design rules (1 November). Also `npm run portals` and `npm run copy`. |
| `claude/bluebook-difficulty-research`                                                                  | Nothing new: its research note already came in with first-pass.                                                                                                                                                           |

### Skipped, with the reason

| Branch                                                                                                                                                                                                       | Why not                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claude/import-dedup-spec`, `claude/new-exams-import`, and the `release-snapshot` publish-gate commit `68be05d4`                                                                                             | The import session asked to keep them off the product branch. Its toolkit is still being committed, and that session merges it to main itself. new-exams-import is stale. I had merged them, then reverted them. That also takes out their migration (`20261021000000_question_comparison_key.sql`) and the four `/dev` review pages. |
| `zakaria/karman-calculator-design`                                                                                                                                                                           | Superseded. Main already has the integrated version of this calculator and everything built on it since.                                                                                                                                                                                                                              |
| `claude/cv2-desmos-colours`                                                                                                                                                                                  | Superseded. Main redid all 10 commits after the calculator folders were renamed. Merging would bring back the deleted `calculator-v2` folder.                                                                                                                                                                                         |
| `origin/codex/restart-safe-import-20261013` and the rest of `refs/remotes/release-snapshot/main`                                                                                                             | Import pipeline code (resume after interruption, older section-only PDFs), plus old pinned calculator builds and migration copies. Superseded, or the import session's to decide.                                                                                                                                                     |
| `zakaria/dev`, plus `claude/intelligent-burnell-11bdc1`, `zakaria/dev-shadow`, `claude/wonderful-chandrasekhar-c13cf8`, `claude/eloquent-sinoussi-2369bf`                                                    | Already in main: PR #1 has the same files. Its migrations have no timestamps and would break the database deploy.                                                                                                                                                                                                                     |
| `zakaria/extractor-gemini-3-5-flash-swap`                                                                                                                                                                    | Paid AI extraction, which is retired.                                                                                                                                                                                                                                                                                                 |
| `zakaria/pipeline-v2-phase3-impl`, `zakaria/geometry-render-gate`, `origin/zakaria/cal-oauth-tutor-event-types`                                                                                              | Already in main.                                                                                                                                                                                                                                                                                                                      |
| `zakaria/inspector-batch2-figure-uploader`                                                                                                                                                                   | Main redid it as PR #137.                                                                                                                                                                                                                                                                                                             |
| `origin/zakaria/fix-clerk-proxy-rename`                                                                                                                                                                      | It would break the Cloudflare build: the build tool stops on Next 16's `proxy.ts`.                                                                                                                                                                                                                                                    |
| `origin/zakaria/remove-coming-soon-fix-jobs`                                                                                                                                                                 | The jobs fix is already in main. Main keeps the launch switch on purpose.                                                                                                                                                                                                                                                             |
| `claude/gracious-dirac-148d1f` (its 3 extra commits)                                                                                                                                                         | Static mocks of six site pages that main has since built for real.                                                                                                                                                                                                                                                                    |
| `zakaria/catalog-evidence-format-compat`, `zakaria/status-draft-deepseek`, `zakaria/admin-geometry-review`, `origin/zakaria/fix-learn-revalidate-during-render`, `origin/claude/question-calibration-fields` | Already in main.                                                                                                                                                                                                                                                                                                                      |
| `origin/zakaria/portal-reviewed-current-release`, `origin/zakaria/portal-vocabulary-next-release`                                                                                                            | Student calendar and parent portal work from 8 October: merge-ui's area. They conflict in 5 files, and tonight's painting rebuild replaces both views. I told merge-ui in the shared notes.                                                                                                                                           |

Left to merge-ui: `claude/quiz-engine`, `claude/quiz-engine-spec`,
`claude/student-dashboard-13d0a0`, the figure branches, the display-fix
branches, `claude/calendar-ics-feed` and `claude/cal-route-matcher`.

## Conflicts I settled by judgment

- **first-pass and the live site.** first-pass rebuilt the site and moved every
  app page into a new `src/app/(app)` folder so the site could have its own
  layout. I kept all of `src/`, `public/` and `tests/` exactly as main has them.
  - The move would break every other session's work tonight.
  - Layouts are shared files.
  - The live look wins.

  I took only two fixes that change neither the look nor the words:
  - the home films re-encoded so iPhones can play them (main's films use a
    format iPhones can't decode);
  - a crash fix in the guarantee drawing animation.

- **first-pass's speed work** (separate site layout, edge caching, a
  `browserslist`) stays out. It only works together with the layout move.
- **CLAUDE.md** stays as main has it. first-pass's copy says to branch from
  `claude/site-redesign` and describes the retired test-date cohort.
- **docs/business/ and docs/business-plan.md** stay as main has them, because
  tonight's prices replace the 30 October ladder and the pricing session owns
  those files. `docs/design-rules.md` is now your 1 November version.
- **PR #205:** the label fix in `scripts/pdf-pipeline/orchestrate.mjs` was
  dropped, because main deleted that file when paid orchestration was retired.

## Fixes the merges needed

- ESLint now ignores `.wrangler/`, `tmp/`, `prototypes/` and `.impeccable/`.
  The mocks include CommonJS scripts that crashed lint.
- Prettier now ignores `prototypes/`, `.impeccable/` and `assets/`. Four merged
  design docs were reformatted.
- TypeScript skips `prototypes/`, which is a separate Vite project.

## What the branch changes in the product

Outside prototypes, mocks and docs, only these files differ from
`claude/overnight-ship`:

- the regression-parity calculator files;
- `src/app/api/email/subscribe/route.ts` (PR #215);
- `src/components/site/GuaranteeDeal.tsx` and the two home films;
- `config/r2-cors.json`;
- the lint, format and TypeScript settings;
- the two npm scripts.

`supabase/` is unchanged.

## How I checked it (after the revert)

- `npx tsc --noEmit`: passes.
- `npm run lint`: passes.
- `npm run check:sizes`: passes.
- `npm run format:check`: three files fail, and they already failed on
  `claude/overnight-ship` before my work: `docs/overnight/BRIEF.md`,
  `docs/design/student-portal-laws.md` and
  `docs/design/student-portal-research-2026-11-07.md`.
- `npm test`: all 505 test files pass (9,035 tests, plus 254 marked as
  expected failures by design), with no timeouts. Before the revert, while
  about ten sessions shared the machine, 25 tests timed out. They passed when
  run again on their own.
- `npm run test:calculator` (browser tests, run before the revert, which
  touches no calculator code): 2,525 passed, 25 failed and 580 skipped, in
  49 minutes.
  - Two layout checks fail in every browser: R-5 (the value box under the
    math) and R-6 (the "add slider" row).
  - The other 21 failures are Firefox-only (clipboard, paste, tab order, theme
    repaint) or iOS-only (a tap test and a table transfer).
  - The only calculator code merged tonight changes regression maths, which
    those tests don't drive. So the failures are likely already on main or
    caused by load, but I have not proved that.
- Migrations: `supabase/migrations` is the same 72 files as
  `claude/overnight-ship`. The local-db session replayed those 72 on a fresh
  local database tonight, so they apply cleanly.

## Not done

- `npm run cf:build` was not run.
- No screens were clicked in a browser. The app's Browser pane froze the app,
  and the only screen changes are the two site fixes above.

## Decisions I made

- Kept main's app layout and the live site files over first-pass's rebuild.
- Took the first-pass prototypes and docs, about 240 MB. The largest file is
  14.5 MB, so the branch can still be pushed to GitHub.
- Reverted the import tool merges as one commit, together with their
  follow-ups: two deleted draft figure files, a moved test, a size-check entry
  and a dev page fix. The tree now matches `claude/overnight-ship` in every
  import path.
- During `git fetch --prune`, a few remote branches that GitHub had already
  deleted were removed from the local list (among them
  `zakaria/kimi-stage1-official` and `zakaria/phase-9b-charts`). Their commits
  still exist locally.

## For the founder

- PR #215 means a signup succeeds even if the lead can't be saved. Such a lead
  then goes only to the email list. The original code chose to fail the signup
  instead. Keep #215?
- The live site has no Cookie Policy page (design rule 32). first-pass has one,
  but it needs a route added. I left that to the site-audit session.
- The Private tutoring page drops a comma in the Private 20 package text. I
  left that fix to the pricing session, which owns that page tonight.
- The home page speed work in first-pass (Lighthouse 36–45 to 100, by its own
  claim) needs its own session: it moves the app's layout.
- The calculator's browser tests have 25 failures to check against main. Two
  of them fail in every browser.
