// @vitest-environment jsdom
import { createElement } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { TransferItem } from "@/lib/calculator-transfer/classify";
import type { TransferResult } from "@/lib/calculator-transfer/payload";
import { TransferControl } from "./TransferControl";
import { isCoreRejection, markCoreRejection, reportTransferRejection } from "./transfer-report";

const h = vi.hoisted(() => ({ capture: vi.fn(), bridge: null as unknown }));
vi.mock("@sentry/nextjs", () => ({ captureException: h.capture }));
// bridge-context holds useCalculator; CalculatorScope re-exports it (AR-33).
vi.mock("./bridge-context", () => ({ useCalculator: () => h.bridge }));

const REJECTED: TransferResult = {
  status: "rejected",
  message: "This can't be added to the calculator.",
  focusRowId: null,
};

beforeEach(() => h.capture.mockClear());

// The send loads lazily (as report-error.ts's does, AR-33), so the capture is awaited.
it("TR-73 the reporter receives only the question id and the rule ID", async () => {
  reportTransferRejection("q7", "TR-11");
  await vi.waitFor(() => expect(h.capture).toHaveBeenCalledTimes(1));
  const [error, context] = h.capture.mock.calls[0];
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe("calculator-transfer-rejected");
  expect(context).toEqual({ tags: { questionId: "q7", ruleId: "TR-11" } });
});

it("TR-73 only a result the drain marks as a core-check rejection is reportable, and the mark adds no field", () => {
  const core = { ...REJECTED };
  const stale = { ...REJECTED };
  expect(markCoreRejection(core)).toBe(core);
  expect([isCoreRejection(core), isCoreRejection(stale)]).toEqual([true, false]);
  expect(core).toEqual(stale);
});

const ITEM: TransferItem = {
  sourceId: "stem:1",
  kind: "equation",
  ruleId: "TR-11",
  description: "y=2x+3",
  payload: {
    version: 1,
    sourceId: "stem:1",
    description: "y=2x+3",
    format: "rows",
    dependencies: [],
    rows: ["y=2x+3"],
  },
};
const bridgeReturning = (result: TransferResult) => ({
  open: false,
  status: "ready",
  failure: null,
  questionKey: "attempt-9:q7",
  toggle: vi.fn(),
  prefetch: vi.fn(),
  transfer: vi.fn(async () => result),
});
const renderControl = () =>
  render(
    createElement(
      "p",
      null,
      createElement("span", null, "m"),
      createElement(TransferControl, {
        item: ITEM,
        accessibleName: "Transfer to Calculator: y=2x+3",
        placement: "inline",
      })
    )
  );

it("TR-73 a core-check rejection from the control reports only the question id and the rule ID, and an unmarked rejection reports nothing", async () => {
  h.bridge = bridgeReturning(markCoreRejection({ ...REJECTED }));
  const first = renderControl();
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(h.capture).toHaveBeenCalledTimes(1));
  expect(h.capture.mock.calls[0][1]).toEqual({ tags: { questionId: "q7", ruleId: "TR-11" } });
  expect((h.capture.mock.calls[0][0] as Error).message).toBe("calculator-transfer-rejected");
  first.unmount();
  const stale = bridgeReturning({ ...REJECTED });
  h.bridge = stale;
  renderControl();
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(stale.transfer).toHaveBeenCalledTimes(1));
  // the send is lazy, so give a (wrong) report time to arrive before checking there was none
  await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
  expect(h.capture).toHaveBeenCalledTimes(1);
});
