import { describe, expect, it } from "vitest";
import { PlanLimitError, isPlanLimit, withPlanLimit } from "./plan-limit";

describe("plan limit results", () => {
  it("turns a PlanLimitError into a result the client can show", async () => {
    const result = await withPlanLimit(async () => {
      throw new PlanLimitError("used up");
    });
    expect(result).toEqual({ planLimit: true, message: "used up" });
    expect(isPlanLimit(result)).toBe(true);
  });

  it("passes values through and rethrows other errors", async () => {
    expect(await withPlanLimit(async () => 3)).toBe(3);
    expect(isPlanLimit({ isCorrect: true })).toBe(false);
    await expect(
      withPlanLimit(async () => {
        throw new Error("other");
      })
    ).rejects.toThrow("other");
  });
});
