// @vitest-environment jsdom
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { mountQuizCalculator } from "../host/quiz-host";

const h = vi.hoisted(() => ({
  instance: null as unknown,
  apply: vi.fn(() => ({
    status: "added",
    message: "Added to calculator: y = x.",
    focusRowId: "1",
  })),
}));
vi.mock("../KarmanCalculator", () => ({
  KarmanCalculator: class {
    engine = {};
    constructor() {
      h.instance = this;
    }
    getExpressions() {
      return [{ id: "1" }];
    }
    observe() {
      return () => undefined;
    }
    destroy() {
      return undefined;
    }
  },
  lastFocusedRow: () => null,
}));
vi.mock("@/components/calculator/report-error", () => ({ reportCalculatorError: vi.fn() }));
vi.mock("../ui/hooks/dev-hooks", () => ({ exposeEngineForTests: () => () => undefined }));
vi.mock("./apply", () => ({ applyTransfer: h.apply }));

/** `.ts`/`.tsx` files under `dir`, recursively, as repo-relative POSIX paths. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name).split("\\").join("/");
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

it("TR-71 the quiz handle applies a bridge payload through transfer/apply.ts with the mounted calculator as target", () => {
  const div = () => document.createElement("div");
  const handle = mountQuizCalculator({
    element: div(),
    frame: div(),
    chromeSlot: div(),
    reducedMotion: false,
    announceReset: false,
  });
  const payload = { version: 1 };
  expect(handle.applyTransfer(payload, "touch")).toEqual({
    status: "added",
    message: "Added to calculator: y = x.",
    focusRowId: "1",
  });
  expect(h.apply).toHaveBeenCalledWith(h.instance, payload, "touch");
});

it("TR-71 transfer/apply.ts is imported only by the quiz host among non-test modules", () => {
  const importers = sourceFiles("src").filter(
    (f) =>
      !/\.test\.tsx?$|__fixtures__/.test(f) &&
      /from "[^"]*transfer\/apply"/.test(readFileSync(f, "utf8"))
  );
  expect(importers).toEqual(["src/components/calculator/host/quiz-host.ts"]);
});
