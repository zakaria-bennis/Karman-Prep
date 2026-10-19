import { expect, it } from "vitest";
import { DeadlineExceeded, NO_DEADLINE } from "../core/deadline";
import { DEADLINE_CHECK_EVERY, EvaluationBudget, EXPLICIT_BUDGET, IMPLICIT_BUDGET } from "./budget";

it("G-15 EvaluationBudget grants calls up to its limit and checks the deadline every 1,024", () => {
  expect([EXPLICIT_BUDGET, IMPLICIT_BUDGET, DEADLINE_CHECK_EVERY]).toEqual([20_000, 250_000, 1024]);
  const b = new EvaluationBudget(10, NO_DEADLINE);
  expect([b.take(4), b.take(6), b.take(1), b.take()]).toEqual([true, true, false, false]);
  expect([b.used, b.remaining]).toEqual([10, 0]);
  let checks = 0;
  const expire = (): void => {
    if (++checks > 2) throw new DeadlineExceeded("row-1");
  };
  const c = new EvaluationBudget(5000, { check: expire });
  expect(() => Array.from({ length: 5000 }, () => c.take())).toThrow(DeadlineExceeded);
  expect([checks, c.used]).toEqual([3, 3072]);
});
