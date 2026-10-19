// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.doUnmock("@/lib/calculator-transfer/classify");
  vi.doUnmock("./transfer-lazy");
});

// D4 (00-index section 7): 12's classifier and the Transfer control are too large for AR-33's
// eager budget, so quiz code reaches them only through this loader's import()s, in their own chunks.
it("AR-33 the eager transfer code reaches the classifier, TransferControl and the bridge's pipeline only through the one import() of the lazy Transfer chunk, never a static value import", () => {
  const eager = [
    "src/components/calculator/use-transfer-bridge.ts",
    "src/components/calculator/transfer-classifier.ts",
    "src/components/calculator/CalculatorScope.tsx",
    "src/components/calculator/CalculatorSourceAction.tsx",
    "src/components/learn/MathText.tsx",
    "src/components/learn/quiz/ActiveQuizScreen.tsx",
    "src/components/learn/quiz/TableChoiceOption.tsx",
    "src/components/learn/catalog-practice/CatalogQuestion.tsx",
    "src/components/learn/QuestionTable.tsx",
    "src/components/learn/DailyChallenge.tsx",
    "src/components/diagnostic/parts/AnswerChoiceButton.tsx",
  ];
  // a value import of any calculator-transfer module but the eager payload leaf
  const staticImport =
    /^import\s+(?!type\b)[^;]*?from\s+"@\/lib\/calculator-transfer\/(?!payload")[^"]*";/m;
  // any value import (or side-effect import) of TransferControl, its chooser (TR-60), its two
  // stylesheets or the wrappers' lazy item lookup
  const controlImport =
    /^import\s+(?!type\b)(?:[^;]*?from\s+)?"[^"]*(?:\/TransferControl(?:\.module\.css)?|\/TransferChooser|\/transfer-control\.css|\/transfer-items|\/transfer-lazy)";/m;
  // the bridge's pipeline and the modules only it and the control use (moved out of the eager
  // budget with D4's extension): the key check, queue, drain, announcements, selection store and
  // rejection marks
  const pipelineImport =
    /^import\s+(?!type\b)(?:[^;]*?from\s+)?"[^"]*\/(?:transfer-bridge-core|transfer-selection|transfer-report)";/m;
  // eager code takes the payload contract as types only (TRANSFER_MESSAGES and the queue limit
  // live in the lazy pipeline)
  const payloadValue = /^import\s+(?!type\b)[^;]*?from\s+"@\/lib\/calculator-transfer\/payload";/m;
  for (const file of eager) {
    const source = readFileSync(file, "utf8");
    expect(source, file).not.toMatch(staticImport);
    expect(source, file).not.toMatch(controlImport);
    expect(source, file).not.toMatch(pipelineImport);
    expect(source, file).not.toMatch(payloadValue);
  }
  // the hook's one import() is its pipeline; the loader's one import() is the controls' chunk entry,
  // re-exporting the classifier, the item lookup and the control, and it preloads the pipeline
  const dynamic = /(?<!typeof )import\("[^"]*"\)/g;
  const bridge = readFileSync("src/components/calculator/use-transfer-bridge.ts", "utf8");
  expect(bridge.match(dynamic)).toEqual(['import("./transfer-bridge-core")']);
  const lazy = readFileSync("src/components/calculator/transfer-lazy.ts", "utf8");
  for (const target of [
    "@/lib/calculator-transfer/classify",
    "./transfer-items",
    "./TransferControl",
  ])
    expect(lazy, target).toContain(`from "${target}";`);
  // the stem registry and the wrapper bodies live in the lazy transfer-items.tsx
  const wrappers = readFileSync("src/components/calculator/CalculatorSourceAction.tsx", "utf8");
  expect(wrappers).not.toMatch(/useSyncExternalStore|useLayoutEffect/);
  const loader = readFileSync("src/components/calculator/transfer-classifier.ts", "utf8");
  expect(loader.match(dynamic)).toEqual(['import("./transfer-lazy")']);
  expect(loader).toMatch(/loadTransferCore\(\)/); // the pipeline loads with the controls
  // the control's stylesheet is imported only by the lazily loaded control
  const control = readFileSync("src/components/calculator/TransferControl.tsx", "utf8");
  expect(control).toMatch(/^import "\.\/transfer-control\.css";$/m);
  expect(control).not.toMatch(/\.module\.css"/);
  // the chooser, the table and pair classifiers load only with the lazy control (TR-60, TR-22)
  expect(control).toMatch(/^import \{ TransferChooser \} from "\.\/TransferChooser";$/m);
  const chooser = readFileSync("src/components/calculator/TransferChooser.tsx", "utf8");
  expect(chooser).not.toMatch(/^import\s+(?!type\b)[^;]*?from\s+"@\/lib\/calculator-transfer\//m);
  const items = readFileSync("src/components/calculator/transfer-items.tsx", "utf8");
  expect(items).toMatch(/from "@\/lib\/calculator-transfer\/table";/);
  // A value import of an eager module from the lazy chunk regroups the quiz routes' eager chunks
  // (about 400 gzip bytes on /learn/daily): the control reads the bridge from bridge-context, and
  // the classifier gets MathText's splitter from the loader through math-split.ts.
  expect(control).not.toMatch(/^import\s+(?!type\b)[^;]*?from\s+"\.\/CalculatorScope";/m);
  expect(control).toMatch(/^import \{ useCalculator \} from "\.\/bridge-context";/m);
  const segmentsValue = /^import\s+(?!type\b)[^;]*?from\s+"[^"]*\/math-segments";/m;
  for (const file of [
    "src/components/calculator/transfer-items.tsx",
    "src/lib/calculator-transfer/classify.ts",
    "src/lib/calculator-transfer/table.ts",
    "src/lib/calculator-transfer/math-split.ts",
  ])
    expect(readFileSync(file, "utf8"), file).not.toMatch(segmentsValue);
  expect(loader).toMatch(/m\.installMathSplit\(splitMathText\)/);
});

it("AR-33 useTransferClassifier gives null until the lazy classifier and TransferControl resolve, then both, loading them once; an inactive caller gets null and loads nothing", async () => {
  const { loadTransferClassifier, useTransferClassifier } = await import("./transfer-classifier");
  const idle = renderHook(() => useTransferClassifier(false));
  expect(idle.result.current).toBeNull();
  const first = renderHook(() => useTransferClassifier(true));
  expect(first.result.current).toBeNull();
  // the first import of both chunks transforms them, so it gets more than the default second
  await waitFor(() => expect(first.result.current).not.toBeNull(), { timeout: 10_000 });
  const classify = await import("@/lib/calculator-transfer/classify");
  expect(first.result.current?.classifyStem).toBe(classify.classifyStem);
  const control = await import("./TransferControl");
  expect(first.result.current?.TransferControl).toBe(control.TransferControl);
  expect(loadTransferClassifier()).toBe(loadTransferClassifier());
  // the loader handed the chunk MathText's splitter (math-split.ts)
  const split = await import("@/lib/calculator-transfer/math-split");
  const { splitMathText } = await import("@/components/learn/math-segments");
  expect(split.splitMathText("$x$", false, true, true)).toEqual(
    splitMathText("$x$", false, true, true)
  );
  // a later caller gets the loaded module on its first render
  const later = renderHook(() => useTransferClassifier(true));
  expect(later.result.current?.classifyChoice).toBe(classify.classifyChoice);
  idle.rerender();
  expect(idle.result.current).toBeNull();
});

it("AR-33 a failed classifier chunk renders no control and never throws, and the next caller retries the import", async () => {
  let fail = true;
  // the controls' chunk entry fails once, as a lost chunk request would
  vi.doMock("./transfer-lazy", async (original) => {
    if (fail) throw new Error("chunk failed");
    return original();
  });
  const { loadTransferClassifier, useTransferClassifier } = await import("./transfer-classifier");
  const view = renderHook(() => useTransferClassifier(true));
  // vitest wraps the factory error in its own message
  await expect(loadTransferClassifier()).rejects.toThrow();
  expect(view.result.current).toBeNull();
  fail = false;
  const retry = renderHook(() => useTransferClassifier(true));
  await waitFor(() => expect(retry.result.current).not.toBeNull(), { timeout: 10_000 });
});
