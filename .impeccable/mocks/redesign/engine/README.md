# Quiz engine renders for the site

Real screens of the real quiz engine, showing real Karman-original questions, for the marketing
pages to use instead of drawn or invented questions (design rule 45; the founder's note of
October 31). Nothing here is a mock-up: every capture is a Playwright screenshot of the app's own
`QuizEngine` component tree, mounted on an original question through a small Vite harness.

Generated 2026-11-01 on branch `claude/first-pass`.

## What is in this folder

| Path | What it is |
| --- | --- |
| `questions.json` | The eight questions (plus one format variant), with ids, source, skill, answer and the state each capture shows. |
| `renders/<id>-<device>-<mode>-<state>.png` and `.webp` | Captures at 2x. `device` is `phone` (440 x 956) or `desktop` (1200 x 800); `mode` is `dark` (theme `observatory`, the app default) or `light` (theme `ivory`). PNG + WebP for `question`, `correct-explain` and `wrong`; WebP only for `selected`, `tools` and `guide` (dark only). 270 files, about 31 MB. |
| `fragments/<id>.html` | One embeddable static fragment per question: the real screen's DOM in the `question` state, serialized from the harness. Drop it into a page with `engine.css` next to it. |
| `engine.css` | The real cascade (globals.css through Tailwind, KaTeX, the quiz CSS modules, the calculator chrome, the theme sheet from `src/lib/themes/palettes.ts`) re-scoped under `.karman-engine`, with every viewport breakpoint turned into a container query so a fragment lays out by its own width. 77 KB. |
| `fonts/` | The KaTeX woff2 fonts and Geist Mono (numeric entry), referenced by `engine.css`. |

## The questions

All eight come from `src/data/diagnostic-questions.ts`, the only Karman originals in the repo.
A read-only count of the live question bank on 2026-11-01 found 9,780 live rows, every one with a
`source_pdf` naming an exam form, so no live bank row qualifies as an original under rule 45.

| id | Section | Skill (curriculum node) | Layout | Answer |
| --- | --- | --- | --- | --- |
| `info-2` | Reading and Writing | Inference & implicit meaning | intro line + passage left, question right | B |
| `craft-4` | Reading and Writing | Cross-text synthesis | Text 1 and Text 2 left, question right | B |
| `expr-2` | Reading and Writing | Rhetorical synthesis | student notes with bullets left, question right | B |
| `conv-2` | Reading and Writing | Pronouns & nouns | one-sentence passage with a blank, one-word choices | C |
| `alg-1` | Math | Linear equations (one variable) | single centred column | C |
| `adv-3` | Math | Exponential growth & decay | single centred column | C |
| `data-4` | Math | Probability basics | single column, KaTeX fractions in the choices | B |
| `geo-5` | Math | Trigonometric ratios | single column, fractions in stem and choices | B |

Plus `alg-1-numeric`: the alg-1 stem and answer (7) shown through the engine's numeric-entry
input. The published original is multiple choice; no Karman original is numeric entry. It is kept
apart so the founder can decide whether a format variant may appear on the site.

Not covered: a question with a figure. No Karman original carries a table, chart or geometry
figure, and every figure question in the live bank traces to an exam PDF, so none was rendered.

How an original becomes an engine row (no word changes): the `A) ` prefix is stripped from the
choices the way the diagnostic's own `AnswerChoiceButton` strips it; `craft-4`'s passage, authored
as `Text 1 ... Text 2 ...`, goes into the engine's `passage_a` and `passage_b` fields (the engine
draws the labels); `topic_cluster` is `CLUSTER_BY_DOMAIN[domain]`, what the importer writes;
`node_id` is the curriculum node with the matching `concept_slug`. The set the engine loads is the
requested original first, then the other originals of the same subject at the same or a harder
level, so the question guide shows a real set and the Next button reads "Next question".

## The states

| State | What the student sees |
| --- | --- |
| `question` | Fresh screen. Top bar with section and skill, calculator (math), scratch pad, Highlight, elapsed timer with Hide Timer, bookmark, theme toggle, Settings, Menu; the passage column with the marking tools (R&W); eyebrow, stem, four choices with the cross-out control (always visible on phones, on hover on desktop); bottom bar with flag, Questions guide, Previous, Next. |
| `selected` | The right answer chosen; Submit Answer appears. |
| `correct-explain` | Right answer submitted, Show explanations pressed: the question panel (choice marked with a check) and the explanation panel, scrolled so the choices are in view. |
| `wrong` | A wrong answer submitted: chosen choice in the error tint, the right one marked with a check, Show explanations and Next question buttons. |
| `tools` | Scratch pad open with a pen stroke (resized and moved on desktop, as a student would) and, for R&W, a highlight on the passage. |
| `guide` | The Questions guide open: the set indicator with answered, unanswered and bookmarked marks. |

The timer reads 0:00 because the harness freezes the clock (`page.clock.setFixedTime`) so captures
are repeatable. Reduced motion is emulated so framer-motion entrances are settled.

## What is real and what is reproduced

Real, with no changes:

- The whole component tree: `src/components/learn/QuizEngine.tsx`, `quiz/ActiveQuizScreen.tsx`,
  `quiz/PracticeToolbar.tsx`, `quiz/QuizTools.tsx` (timer, Highlight, Questions guide),
  `quiz/QuizMenu.tsx`, `quiz/PassageAnnotations.tsx`, `Scratchpad.tsx`, `MathText.tsx`,
  `ReviewedSinglePassage.tsx`, the calculator trigger and Transfer controls, `ThemeProvider`.
- The state machine `src/contexts/QuizContext.tsx`, grading through `evaluateQuizAnswer` in
  `src/lib/quiz-session.ts`, the student payloads from `src/lib/student-quiz-payload.ts`.
- The styles: `src/app/globals.css` compiled by the repo's Tailwind config, the CSS modules, KaTeX,
  and the theme variables from `src/lib/themes/palettes.ts` (observatory and ivory).

Replaced, the same way `tests/calculator/fixture/server.mjs` does it:

- `@clerk/nextjs`, `next/navigation`, `next/link`, `@sentry/nextjs`, `@/lib/sounds` and
  `@/app/appearance/actions` are stubs.
- The server actions in `src/app/(app)/learn/quiz-actions` are replaced by `actions.ts`, which
  serves the originals and grades with the real library code instead of Supabase.
- Fonts: the app loads IBM Plex Sans through `next/font`; the harness and the fragments load the same
  family from Google Fonts and point `--font-plex-sans` at it. Passages use Tailwind's default
  serif stack (Georgia on a Mac), as in the app. Geist Mono (numeric entry) is copied from
  `src/app/fonts`.

In the fragments only (static HTML cannot run the engine's JavaScript):

- The timer is a static `0:00`; hover reveals and the focus ring do not happen; the Transfer to
  Calculator controls keep the positions the script measured on desktop; the phone-only calculator
  side tab is absent; passage highlights use the CSS Highlight API and are not serialized.
- `position: fixed` became `absolute` on the engine root, and the wrapper
  (`.karman-engine`, explicit width and height, `container-type: inline-size`) stands in for the
  viewport. Tailwind's `sm:` and `md:` media queries became `@container engine (min-width: ...)`.
- Only the rules some captured state matched were kept, so `engine.css` is 77 KB instead of the
  full dev cascade.

To use a fragment: copy the `<div class="karman-engine ...">` block into the page, link
`engine.css` and the IBM Plex Sans stylesheet, set `data-theme` (`observatory` dark, `ivory`
light, or any other id in `palettes.ts`) and keep class `dark` for dark themes, and give the box
the width and height you want. Below 768 px wide it lays out as the phone does.

## Checks

Fragment against capture, Playwright screenshot of the fragment page at 1x versus the 1x capture
of the same state (harness page), same viewport, same device emulation:

| id | device | mode | any pixel differs | differs by more than 16/255 |
| --- | --- | --- | --- | --- |
| adv-3 | phone | dark | 0.749 % | 0.240 % |
| adv-3 | phone | light | 0.749 % | 0.402 % |
| adv-3 | desktop | dark | 0.007 % | 0.005 % |
| adv-3 | desktop | light | 0.008 % | 0.005 % |
| alg-1-numeric | phone | dark | 1.551 % | 0.544 % |
| alg-1-numeric | phone | light | 1.551 % | 0.529 % |
| alg-1-numeric | desktop | dark | 0.489 % | 0.248 % |
| alg-1-numeric | desktop | light | 0.489 % | 0.248 % |
| alg-1 | phone | dark | 0.737 % | 0.235 % |
| alg-1 | phone | light | 0.737 % | 0.361 % |
| alg-1 | desktop | dark | 0.007 % | 0.005 % |
| alg-1 | desktop | light | 0.008 % | 0.005 % |
| conv-2 | phone | dark | 0.006 % | 0.004 % |
| conv-2 | phone | light | 0.006 % | 0.005 % |
| conv-2 | desktop | dark | 0.007 % | 0.005 % |
| conv-2 | desktop | light | 0.008 % | 0.005 % |
| craft-4 | phone | dark | 0.006 % | 0.004 % |
| craft-4 | phone | light | 0.006 % | 0.005 % |
| craft-4 | desktop | dark | 0.007 % | 0.005 % |
| craft-4 | desktop | light | 0.008 % | 0.005 % |
| data-4 | phone | dark | 0.720 % | 0.206 % |
| data-4 | phone | light | 0.720 % | 0.334 % |
| data-4 | desktop | dark | 0.007 % | 0.005 % |
| data-4 | desktop | light | 0.008 % | 0.005 % |
| expr-2 | phone | dark | 0.006 % | 0.004 % |
| expr-2 | phone | light | 0.006 % | 0.005 % |
| expr-2 | desktop | dark | 0.007 % | 0.005 % |
| expr-2 | desktop | light | 0.008 % | 0.005 % |
| geo-5 | phone | dark | 0.727 % | 0.234 % |
| geo-5 | phone | light | 0.728 % | 0.377 % |
| geo-5 | desktop | dark | 0.007 % | 0.005 % |
| geo-5 | desktop | light | 0.008 % | 0.005 % |
| info-2 | phone | dark | 0.006 % | 0.004 % |
| info-2 | phone | light | 0.006 % | 0.005 % |
| info-2 | desktop | dark | 0.007 % | 0.005 % |
| info-2 | desktop | light | 0.008 % | 0.005 % |

The non-zero rows are the JavaScript-only parts listed above: the phone-only calculator side tab
and the measured Transfer control positions (math on phone, about 0.7 %), the focus ring on the
autofocused numeric input (`alg-1-numeric`), and a sub-pixel glyph shift in two top-bar labels
(0.007 %). R&W fragments match to within 0.008 %.

Console: zero console errors and zero page errors across all 162 captured states and the 36
fragment renders.

Text at phone width: the harness lists every visible text run under 13 px in the engine itself
(not in the fragments, which reproduce it). These are engine facts the site cannot change from
here: top-bar section label, tool buttons, Questions, Previous, Next, Menu, Settings and the
scratch pad controls at 12 px; the cluster eyebrow ("Algebra", "Information & Ideas") and the
"Explanation" heading at 11 px; the Text 1 / Text 2 labels and the Calculator side tab at 10 px;
KaTeX fraction numerators and denominators at 11.2 px (0.7 em of the 16 px choice text). Stems are
19 px (20 px on desktop), choices 16 px, passages 17 px.

One engine finding at 440 px wide: the top bar wraps to three rows (about 130 px tall) while the
content area starts at 112 px (`top-28`), so the first lines of a passage sit under the bar until
the student scrolls. Visible in every `phone-*-question` capture of a Reading and Writing question.

## How to regenerate

The harness lives outside the repo so it never touches lint, tsc or the build:
`/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/9fad26ef-dd92-4e98-8387-7e81608f80d5/scratchpad/engine-harness/`
(`server.mjs`, `main.tsx`, `questions.ts`, `actions.ts`, `platform.tsx`, `link.tsx`,
`index.html`, `tsconfig.json`, `capture.mjs`, `diff.mjs`; `node_modules` is a symlink to the
repo's). If that folder is gone, recreate it from this description: it is the
`tests/calculator/fixture` pattern with `QuizEngine` mounted on `poolFor(?q)`.

1. From the repo root: `ENGINE_HARNESS_PORT=4377 node <harness>/server.mjs`
   (open `http://127.0.0.1:4377/?q=info-2&theme=ivory` to look).
2. `node <harness>/capture.mjs` writes the renders, fragments, `engine.css` and `fonts/`;
   `node <harness>/capture.mjs geo-5` does one question. `CSS_ONLY=1` rebuilds only `engine.css`.
3. `node <harness>/diff.mjs` renders every fragment and prints the mismatch table.

Playwright 1.60 with Chromium, sharp for WebP and the pixel diff, both already in the repo.
