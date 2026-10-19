import { expect, it } from "vitest";
import type { RowView } from "@/lib/calculator/core/api/engine";
import { parameterValues, regressionSummary, statisticValues } from "./regression-text";

const view = (fit: Partial<NonNullable<NonNullable<RowView["regression"]>["result"]>>) =>
  ({
    regression: {
      analysis: {} as never,
      result: {
        ok: true,
        error: null,
        params: [],
        r2: null,
        r: null,
        rmse: null,
        residuals: [],
        logMode: { available: false, on: false },
        approximate: false,
        residualName: "e_{1}",
        ...fit,
      },
    },
  }) as unknown as RowView;

it("A11Y-10 the summary reads each parameter, R squared and r", () => {
  const row = view({
    params: [
      { name: "m", value: 600 },
      { name: "b", value: -1164000 },
    ],
    r2: 1,
    r: 1,
  });
  expect(regressionSummary(row)).toBe(
    "Regression: m equals 600, b equals negative 1164000, R squared equals 1, r equals 1"
  );
  expect(parameterValues(row).map((v) => `${v.shown} = ${v.value}`)).toEqual([
    "m = 600",
    "b = -1164000",
  ]);
});

it("D-32 RMSE shows in R squared's place only when R squared is undefined", () => {
  const row = view({ params: [{ name: "a_{1}", value: 2.0000004 }], r2: null, rmse: 0 });
  expect(statisticValues(row).map((v) => v.spoken)).toEqual(["RMSE equals 0"]);
  expect(parameterValues(row)[0]).toMatchObject({
    shown: "a₁",
    value: "2",
    spoken: "a sub 1 equals 2",
  });
  expect(regressionSummary(view({ ok: false }))).toBeNull();
});
