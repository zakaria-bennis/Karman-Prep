# merge-rest report (overnight, 8 November 2026)

Branch: `claude/overnight-merge-rest-f41847`, cut from `claude/overnight-ship`
at `bbe7e094`. Nothing pushed, nothing deployed, no database touched.

## What is done

I merged every remaining work channel except the ones merge-ui owns (quiz
engine, student dashboard, figures, display fixes, grading, calendar).

### Merged

| Branch                                                                                                 | What it brings                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claude/import-dedup-spec` (newest import line, includes `claude/new-exams-import`)                    | The question import tools in `scripts/import-tools`, the duplicate and publish gates, `k qa certify`, and four dev-only review pages under `/dev` (they return 404 in production). Adds one database migration, `20261021000000_question_comparison_key.sql`. |
| `origin/zakaria/calculator-regression-release`                                                         | Nothing new: main already had its one fix. Merged so the branch shows as done.                                                                                                                                                                                |
| `claude/regression-desmos-parity`                                                                      | Calculator regressions now match Desmos when a fit is underdetermined or restricted.                                                                                                                                                                          |
| PR #215 `origin/claude/vibrant-hamilton-trk66e`                                                        | A failed lead-table insert no longer blocks a signup.                                                                                                                                                                                                         |
| PR #214 `origin/claude/project-thread-et6pn8`                                                          | `docs/import.md`, an index that points to the import rules.                                                                                                                                                                                                   |
| PR #211 `origin/claude/laughing-cray-mi7t23`                                                           | Three October import-process docs.                                                                                                                                                                                                                            |
| PR #205 `zakaria/r2-cors-config`                                                                       | `config/r2-cors.json`, the upload bucket's CORS policy.                                                                                                                                                                                                       |
| `claude/first-pass` (includes `claude/site-redesign` and `claude/fable-portals-prompt-extract-f56cd4`) | The portal prototypes (`prototypes/`), the Daily 10 end screen, the redesign mocks (`.impeccable/`), the asset manifests, the docs, and your newest design rules (1 November). Also `npm run portals` and `npm run copy`.                                     |
| `claude/bluebook-difficulty-research`                                                                  | Nothing new: its research note already came in with first-pass.                                                                                                                                                                                               |
| `refs/remotes/release-snapshot/main`, one commit (`68be05d4`)                                          | The publish gate now checks each question's skill tag against the approved list.                                                                                                                                                                              |

### Skipped, with the reason

| Branch                                                                                                                                                                                                       | Why not                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zakaria/karman-calculator-design`                                                                                                                                                                           | Superseded. Main already has the integrated version of this calculator and everything built on it since.                                                                                                                                 |
| `claude/cv2-desmos-colours`                                                                                                                                                                                  | Superseded. Main redid all 10 commits after the calculator folders were renamed. Merging would bring back the deleted `calculator-v2` folder.                                                                                            |
| `origin/codex/restart-safe-import-20261013` and the restart-safe commit in `release-snapshot` (`68f6c1d2`)                                                                                                   | Your current import tools stage SQL for your OK and never use this resume feature. It only serves the older direct-write path. I tried the snapshot version, then took it back out because it also pushed `import-core.ts` to 756 lines. |
| `release-snapshot` commit `11ec7aa8` (older Reading and Writing PDFs with section numbers only)                                                                                                              | It edits the same lines of `import-core.ts` as tonight's "kept source identity" rule. Combining them means rewriting import logic, which tonight's rules forbid.                                                                         |
| The rest of `release-snapshot/main`                                                                                                                                                                          | Superseded: old pinned calculator builds, migration copies, layout tools.                                                                                                                                                                |
| `zakaria/dev`, plus `claude/intelligent-burnell-11bdc1`, `zakaria/dev-shadow`, `claude/wonderful-chandrasekhar-c13cf8`, `claude/eloquent-sinoussi-2369bf`                                                    | Already in main: PR #1 has the same files. Its migrations have no timestamps and would break the database deploy.                                                                                                                        |
| `zakaria/extractor-gemini-3-5-flash-swap`                                                                                                                                                                    | Paid AI extraction, which is retired.                                                                                                                                                                                                    |
| `zakaria/pipeline-v2-phase3-impl`, `zakaria/geometry-render-gate`, `origin/zakaria/cal-oauth-tutor-event-types`                                                                                              | Already in main.                                                                                                                                                                                                                         |
| `zakaria/inspector-batch2-figure-uploader`                                                                                                                                                                   | Main redid it as PR #137.                                                                                                                                                                                                                |
| `origin/zakaria/fix-clerk-proxy-rename`                                                                                                                                                                      | It would break the Cloudflare build: the build tool stops on Next 16's `proxy.ts`.                                                                                                                                                       |
| `origin/zakaria/remove-coming-soon-fix-jobs`                                                                                                                                                                 | The jobs fix is already in main. Main keeps the launch switch on purpose.                                                                                                                                                                |
| `claude/gracious-dirac-148d1f` (its 3 extra commits)                                                                                                                                                         | Static mocks of six site pages that main has since built for real.                                                                                                                                                                       |
| `zakaria/catalog-evidence-format-compat`, `zakaria/status-draft-deepseek`, `zakaria/admin-geometry-review`, `origin/zakaria/fix-learn-revalidate-during-render`, `origin/claude/question-calibration-fields` | Already in main.                                                                                                                                                                                                                         |
| `origin/zakaria/portal-reviewed-current-release`, `origin/zakaria/portal-vocabulary-next-release`                                                                                                            | Student calendar and parent portal work from 8 October: merge-ui's area. They conflict in 5 files, and tonight's painting rebuild replaces both views. I told merge-ui in the shared notes.                                              |

Left to merge-ui: `claude/quiz-engine`, `claude/quiz-engine-spec`,
`claude/student-dashboard-13d0a0`, the figure branches, the display-fix
branches, `claude/calendar-ics-feed` and `claude/cal-route-matcher`.

## Conflicts I settled by judgment

- **Import branch vs main's figures.** The import branch carried 21–22 October
  drafts of 18 figure, quiz and display files. Main has newer versions (the
  figure engine), so I kept main's. Two draft files that nothing used any more
  were deleted. The import rules doc kept both new sections. No import logic
  was changed.
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

- ESLint now ignores `.wrangler/`, `tmp/`, `prototypes/` and `.impeccable/`. The
  mocks include CommonJS scripts that crashed lint.
- Prettier now ignores `prototypes/`, `.impeccable/` and `assets/`. Four merged
  design docs were reformatted.
- TypeScript skips `prototypes/`. One dev page lost a prop that only the import
  branch's draft quiz screen had.
- File sizes: some catalog-tag tests moved to their own file.
  `import-core.ts` (709 lines, as the import branch has it) is now on the size
  check's known-offenders list. Splitting it is import work.

## How I checked it

- `npx tsc --noEmit`: passes.
- `npm run lint`: passes.
- `npm run check:sizes`: passes.
- `npm run format:check`: three files fail, and they already failed on
  `claude/overnight-ship` before my work: `docs/overnight/BRIEF.md`,
  `docs/design/student-portal-laws.md` and
  `docs/design/student-portal-research-2026-11-07.md`.
- `npm test`: 9,104 tests pass and 25 fail.
  - 21 of the failures are timeouts while about ten sessions shared the
    machine.
  - The other 4 are timing-sensitive calculator tests.
  - Run again on their own, all 9 failing files I re-ran pass (83 tests).
  - All 940 import tests pass.
- Migrations: 73 files, all names unique and in order. The new one (adds an
  empty column and an index; safe to re-run) sorts between 18 and
  26 October. The production deploy uses `--include-all`, so that order is fine.

## Not done yet

- `npm run test:calculator` (3,130 browser tests, one worker) was still
  running at 07:15. About 1,500 had passed and 8 had failed: layout checks
  (R-5, R-6, a fraction toggle) and Firefox clipboard and typing tests. The
  only calculator code merged tonight changes regression maths, which those
  tests don't touch. So these failures are likely already on main or caused by
  machine load, but I have not proved that. The full log is in my session's
  scratchpad.
- I have not yet replayed all migrations on a fresh local database. The
  local-db guide wasn't committed yet, and I won't reset the shared local
  database.
- `npm run cf:build` was not run.
- Not clicked in a browser: I changed no screens beyond the two site fixes.

## Decisions I made

- Kept main's app layout and the live site files over first-pass's rebuild.
- Took the first-pass prototypes and docs, about 240 MB. The largest file is
  14.5 MB, so the branch can still be pushed to GitHub.
- Took one importer fix from a stray snapshot ref and left its other commits
  out.
- Merging hands-off branches with "taking one side" kept import logic as the
  import branch wrote it.
- During `git fetch --prune`, a few remote branches that GitHub had already
  deleted were removed from the local list (among them
  `zakaria/kimi-stage1-official` and `zakaria/phase-9b-charts`). Their commits
  still exist locally.

## For the founder

- When this reaches `main`, the database deploy will add the new migration to
  production: an empty `comparison_key` column on `quiz_questions`, plus an
  index.
- PR #215 means a signup succeeds even if the lead can't be saved. Such a lead
  then goes only to the email list. The original code chose to fail the signup
  instead. Keep #215?
- The live site has no Cookie Policy page (design rule 32). first-pass has one,
  but it needs a route added. I left that to the site-audit session.
- The Private tutoring page drops a comma in the Private 20 package text. I
  left that fix to the pricing session, which owns that page tonight.
- The home page speed work in first-pass (Lighthouse 36–45 to 100, by its own
  claim) needs its own session: it moves the app's layout.
