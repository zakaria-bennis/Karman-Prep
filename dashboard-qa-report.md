# Independent dashboard QA — dashboard `887f33b` plus resume fix `a535e38`

2026-10-07. Isolated `qa-dashboard` checkout. No production writes, account changes, or deployment.

## Prior high-severity finding: resolved in the resume fix

**Route:** `/learn` and `/dashboard/student` → `Continue practice` for a saved unfinished quiz (for example, `ma-00`).

**Expected:** The action opens the saved quiz or a path that lets the student resume that quiz.

**Before fix:** `buildLearnDashboard` sent the student to `/learn/math/ma-00`. That route rendered `NodeDetail`, whose Practice Questions section is an in-development placeholder.

**After fix:** The CTA uses `/learn/earlier/math?resume={attemptId}`. The server route validates the exact owned unfinished attempt and its subject before opening `ConstellationMap` and `QuizEngine`. The start action validates owner, node and unfinished status, then requires the atomic start RPC to return the same attempt ID. Lesson CTAs use `/learn/earlier/{subject}?lesson={nodeId}` and open the real overlay.

**Evidence:** `src/lib/learn/dashboard.ts`, `src/app/learn/earlier/[subject]/page.tsx`, `src/components/learn/ConstellationMap.tsx`, `src/contexts/QuizContext.tsx`, and `src/app/learn/quiz-actions.ts`. I updated one stale component assertion that still expected the broken URL. No browser screenshot was possible in this workspace.

**Synthetic recheck:** `buildLearnDashboard([], [unfinished attempt for ma-00])` returns `Continue practice` at `/learn/earlier/math?resume={attemptId}`. Route fixtures reject missing, completed and wrong-subject attempts; action fixtures reject mismatched IDs. No real student attempt was modified.

## Other bounded results

- After the fix and stale assertion update, 35 focused Vitest tests passed across dashboard data, dashboard component, earlier route, quiz actions, quiz engine, and quiz navigation fixtures. TypeScript check passed.
- Empty student fixture offers subject links and does not invent mastery. Returning fixture shows the saved review link to an exact completed attempt; review route scopes lookup to the current student and preserves saved answer/result labels.
- Dashboard CTAs are anchors with visible focus styles and 44 px minimum target heights in source. Keyboard tab order, repeated physical clicks, back navigation, mobile layout and zoom were not verified in a browser.
- Static token review: new dashboard uses theme variables for main text, background and CTA. The legacy `NodeDetail` destination hardcodes a dark background. Theme integration and authenticated browser screenshots are needed for a visual and contrast verdict.

## Blockers and scope

There is no authorized synthetic student browser session or dev server in this task. Earlier live-browser attempts in this workspace were unavailable. I did not use real accounts or state writes. No feature files were changed in this QA checkout.
