# Quiz calculator

The quiz calculator lives in two folders: the engine in `src/lib/calculator/` and the quiz window
and UI here. The living spec is
[the design doc](../../../docs/superpowers/specs/2026-10-16-calculator-design.md) plus
[`docs/superpowers/specs/calculator/`](../../../docs/superpowers/specs/calculator/).

## Eager quiz seam (the top-level files)

These load with every quiz page, so they import the calculator itself only through `import()` and
as types (AR-1, AR-2).

- `CalculatorScope.tsx`: Math eligibility, the per-question key, the bridge, docking, inertness and
  focus return; renders `CalculatorWindow` and `CalculatorLoader`.
- `CalculatorLoader.tsx`: the one `import()` of `host/quiz-host.ts`, with the loading and Retry
  panels.
- `CalculatorWindow.tsx` and `calculator-window-store.ts`: the floating, docked, maximized and full
  screen window, and its page-session geometry.
- `CalculatorSourceAction.tsx`, `TransferControl.tsx`, `TransferChooser.tsx` and the
  `transfer-*.ts` files: the Transfer to Calculator controls and the transfer bridge
  (`use-transfer-bridge.ts`, `bridge-context.ts`).
- `breakpoints.ts`, `font-warmup.ts`, `question-key.ts`, `report-error*.ts`.

## Lazy calculator (loaded on first open)

`KarmanCalculator.ts` and the subfolders `host/`, `icons/`, `math-field/`, `styles/`,
`transfer/`, `ui/` and `__fixtures__/` (test helpers). `seam-boundaries.test.ts` enforces the
split and fails when a new subfolder is not classified.

## Generated files

`npm run calculator:build` regenerates `styles/generated.ts`, the skin colours and
`calculator-chrome.generated.css`; `npm run calculator:check` fails when they are out of date.

## Tests

Unit and component tests sit beside the code (`npm test`). Browser tests are in
`tests/calculator/` (`npm run test:calculator`), with harness pages in
`tests/calculator/fixture/harness/`.
