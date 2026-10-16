# Karman calculator and quiz workspace verification

Date: October 15, 2026. Branch: `zakaria/karman-calculator-design`.

This record covers the original local calculator and enhanced workspace, replacing the earlier hosted-calculator evidence.

## Automated checks

| Check                         | Observed result                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------- |
| Full Vitest suite             | 1,167 passed in 83 files                                                          |
| Calculator/quiz browser suite | 22 passed on Chromium desktop and WebKit iPhone 14 emulation                      |
| TypeScript                    | Passed                                                                            |
| ESLint                        | Passed without warnings                                                           |
| Prettier                      | Passed                                                                            |
| File-size guard               | Passed                                                                            |
| Cloudflare production build   | Fresh build required after the final display fixes; release result recorded below |

Both real quiz components are exercised using synthetic data and stubbed persistence. The integration tests block all non-local requests and observe no external calculator requests. They cover math-only availability, both themes, initially hidden keypad, keyboard entry, undo/redo, equation solving, regression, scientific mode, grids and angles, slider/point drag, proportional home, portrait/landscape, clipboard rejection and fallback, late clipboard completion, per-question reset, and retake reset.

The workspace checks cover both flows: hide/show timer, typing and drawing, erasing a stroke, Clear All, close/reopen persistence, reset on navigation, panel bounds, bookmarks, question guide, module locks, Previous, highlight color cycling, answer strike-through, animation preferences, and reduced motion. Unit checks independently verify negative Pearson correlation, selecting the correct table column, noisy-fit R², zero variance, constant regression, transformed log-mode statistics, invalid log domains, and partial/whole stroke erasing.

## Findings fixed during verification

- Correlation incorrectly selected the first x-column rather than the model's predictor.
- Function arguments were omitted from the expression's dependency list, affecting log-model detection.
- Already-LaTeX trigonometric input was double-escaped in the rendered preview.
- The docked calculator left too little width for a two-column stimulus/question split; that workspace now stacks while docked.
- Practice review navigation needed to preserve drafts and avoid triggering automatic advancement.
- A broad answer-choice test locator also matched the new Bookmark button; it now identifies choice B exactly.

## Visual scope and limits

Reviewed desktop/mobile screenshots of the calculator, scratch pad, themes, and question guide. Buttons intentionally follow the requested very large export treatment. No exact Blue Book reference image was provided, so pixel-identical matching is not claimed. This release does not claim the full feature set or exact numerical behavior of Desmos.

No physical-phone review is required. Browser emulation does not establish actual hardware touch latency or VoiceOver behavior. The full unrelated admin visual matrix and Firefox matrix were not rerun; testing focused on the changed student flows plus the complete unit suite and required static/build checks.

Numerical limits and unsupported features are in [the calculator design](karman-calculator-design.md). The [enhanced workspace specification](enhanced-quiz-engine.md) documents all controls and the existing-module mapping.

## Artifacts and release

- `tmp/calculator/report/index.html`: browser report and attached screenshots.
- `tmp/calculator/*-workspace.png`, `*-scratch.png`, `*-export-docked.png`: local visual-review captures (some earlier captures show the formatting issue fixed afterward).
- `/tmp/karman-unit-release-final.log`, `/tmp/karman-browser-release-final.log`, `/tmp/karman-types-release-final.log`, `/tmp/karman-lint-release-final.log`, `/tmp/karman-format-release.log`, `/tmp/karman-build-release-final.log`: local check logs.
- Deployment status will be updated after Cloudflare confirms the release.
