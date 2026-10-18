// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import type { TransferResult } from "@/lib/calculator-transfer/payload";
import { isCoreRejection, markCoreRejection, reportTransferRejection } from "./transfer-report";

const h = vi.hoisted(() => ({ capture: vi.fn(), bridge: null as unknown }));
vi.mock("@sentry/nextjs", () => ({ captureException: h.capture }));

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
