// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.doUnmock("@/lib/calculator-transfer/classify");
});

// D4 (00-index section 7): 12's classifier and the Transfer control are too large for AR-33's
// eager budget, so quiz code reaches them only through this loader's import()s, in their own chunks.
it("AR-33 the eager transfer code reaches the classifier and TransferControl only through the loader's import(), never a static value import", () => {
  const eager = [
    "src/components/calculator/use-transfer-bridge.ts",
    "src/components/calculator/transfer-selection.ts",
    "src/components/calculator/transfer-report.ts",
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
  // any value import (or side-effect import) of TransferControl or its two stylesheets
  const controlImport =
    /^import\s+(?!type\b)(?:[^;]*?from\s+)?"[^"]*(?:\/TransferControl(?:\.module\.css)?|\/transfer-control\.css)";/m;
  for (const file of eager) {
    const source = readFileSync(file, "utf8");
    expect(source, file).not.toMatch(staticImport);
    expect(source, file).not.toMatch(controlImport);
  }
  const loader = readFileSync("src/components/calculator/transfer-classifier.ts", "utf8");
  expect(loader).toMatch(/import\("@\/lib\/calculator-transfer\/classify"\)/);
  expect(loader).toMatch(/import\("\.\/TransferControl"\)/);
  // the control's stylesheets are imported only by the lazily loaded control
  const control = readFileSync("src/components/calculator/TransferControl.tsx", "utf8");
  expect(control).toMatch(/^import styles from "\.\/TransferControl\.module\.css";$/m);
  expect(control).toMatch(/^import "\.\/transfer-control\.css";$/m);
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
  // a later caller gets the loaded module on its first render
  const later = renderHook(() => useTransferClassifier(true));
  expect(later.result.current?.classifyChoice).toBe(classify.classifyChoice);
  idle.rerender();
  expect(idle.result.current).toBeNull();
});

it("AR-33 a failed classifier chunk renders no control and never throws, and the next caller retries the import", async () => {
  let fail = true;
  vi.doMock("@/lib/calculator-transfer/classify", async () => {
    if (fail) throw new Error("chunk failed");
    return {
      classifyStem: () => new Map(),
      classifyChoice: () => null,
      accessibleNames: () => new Map(),
    };
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
