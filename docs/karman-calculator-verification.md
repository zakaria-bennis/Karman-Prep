# Karman calculator release verification

This update starts from the existing calculator release branch at `e6d0474`,
whose runtime was released as `2ff35c1` / Worker
`9138e50d-7f22-4f0a-82e8-6366274d9041`. The homepage, catalog, source-aware
question rendering, account themes, server scoring and review contracts are
preserved. The earlier prototype on `fade5fe` is not the deployed baseline.

## Scope

- Original standalone graphing/scientific calculator, with no runtime library,
  proprietary component, remote API or API key. Both quiz flows now mount the
  same self-contained engine in a theme-inheriting shadow root. The preceding
  React calculator UI was removed; its pure helpers remain as historical tests.
- Math-only integration in adaptive practice, diagnostic, catalog skill practice
  and daily Math challenges. Reading/Writing never receives calculator controls.
- Theme-aware graph/editor, degree default, initially hidden keypad, paste actions,
  square/radial grid, regression with R² and signed Pearson r, sliders and points.
- Editable tables, linear/quadratic/exponential/constant regression, adjustable
  fitted parameters, refitting, RMSE and numeric suffix subscripts. Importing
  unrelated work preserves an adjusted fit. Changing its source data refits it.
- Implicit equations and inequalities use bounded marching-square sampling.
  Light backgrounds blend the active canvas toward white; dark backgrounds
  blend it toward black. All site palettes meet the tested curve/grid/axis
  contrast thresholds of 4.5:1 / 3:1 / 7:1 respectively.
- Shared responsive scratchpad, typed/vector work, erasers and per-question clearing.
- Quiz toolbar, theme settings, timer visibility, highlights, bookmarks, navigation.
- Existing fixed diagnostic sections remain the module boundaries. Cross-section
  jumps stay locked. Sequential practice still delivers the next question after
  a saved response; available questions can be reviewed without resubmitting.

## Validation commands

```sh
# Use Node 22 as specified by .nvmrc.
npm run calculator:build
npx tsc --noEmit
npm run lint
npm run format:check
npm test
npm run check:sizes
npm run sync:taxonomy
npm run test:calculator -- --project=calculator-chrome --project=calculator-ios
node karman-calculator/tests/smoke.mjs
npm run cf:build:release
```

The browser suite uses real React question and calculator components with
synthetic questions; it stubs server actions, navigation, Clerk identity,
sound and telemetry. It does not submit real student answers. Cases cover
source transfer, rejected graph/image imports, keyboard isolation, touch
layout, regression, themes, late clipboard completion, retakes, scratchpad
clearing, saved-response review, highlights, guides and reduced motion.

Unit/component validation: **2,267 tests in 220 files passed on Node 22**.
The machine's Node 26 runtime failed 20 existing browser-storage tests because
its global localStorage conflicts with jsdom; the supported Node 22 run passes
those tests without changes to application or test behavior. The full
database-backed E2E and historical whole-site visual baseline suites are not
part of this run; calculator/workspace coverage uses the scoped browser harness.

All **30 desktop Chromium and iPhone WebKit browser cases pass**, including
a targeted rerun of the layout case after replacing an overly exact viewport
string assertion with a numerical aspect-ratio check. Separate standalone
checks pass over file URLs and a strict CSP that forbids dynamic compilation;
these verify painted implicit-curve pixels, arithmetic, theme changes and reset.
TypeScript, ESLint, Prettier, file-size checks, taxonomy regeneration stability
and the fresh Node 22 Cloudflare release build pass. All three static assets
match the built Worker distribution; 89 built HTML/JS files passed the forbidden
API/component audit. The loader uses content version `f451e3dd46c84fe6`.

Physical-phone approval is not required, as explicitly directed by the user.
WebKit iPhone emulation is not physical-iPhone testing. No approved Blue Book
screenshot was supplied; this is an original implementation with a familiar
layout, not a claim of pixel-identical or complete Desmos parity. Audio/Braille
and undocumented advanced inference panels are intentionally omitted.

## Previous release result (retained for rollback provenance)

Deployed runtime commit: `2ff35c1a35ff67ec5c2adbb04055181ef5453507`.
Cloudflare activated Worker `9138e50d-7f22-4f0a-82e8-6366274d9041` at
`2026-10-16T01:04:27.949Z` (October 15 in America/Chicago), serving 100%
of traffic on `karmanprep.com` and `www.karmanprep.com`.

Post-deploy verification confirmed:

- Public homepage and `/free-diagnostic` return HTTP 200 and retain their content.
- Live JavaScript hashes match the freshly built calculator, regression,
  scratchpad, export and catalog-navigation assets.
- Source and built-artifact audits found no Desmos API/SDK requests, imports
  or proprietary calculator components.
- The live Math workspace opens the local calculator; `sin(30)` returns `0.5`
  with degree mode, the keypad toggles, and `y=x^2` draws a parabola in the
  active Observatory theme.
- The live [scatterplot skill preview](https://karmanprep.com/learn/practice/ma-skill-two-variable-data-models-and-scatterplots)
  loads its reviewed question and one-click answer-choice export correctly
  opens Karman with the selected numeric expression. This read-only preview
  check did not start a graded attempt or submit a student answer.

### Separate live question-data issue

The live linear-equations and probability skill previews rejected their
question pools. A read-only database check found inconsistent approval
bindings in the linear-equations evidence (29 identity mismatches among
86 evidence rows). The catalog reader, approval validator, student payload
projection and page loader are unchanged from the prior live release.
Their existing validation remains enforced. No question records, approval
metadata, saved answers or scoring rules were changed for this release.

The calculator works independently of this pool failure, but these findings
mean the release is **not** evidence that every live skill can currently
deliver questions. Those data bindings require a separate source-verified
repair; do not bypass validation or relabel unverified content to clear it.
