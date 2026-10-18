import { expect, test } from "@playwright/test";
import { T1_STEM_CONTROLS, T1_STEM_DENIED } from "../fixture/v2/transfer-questions";
import {
  allControls,
  anchor,
  anchors,
  annotations,
  choiceControl,
  press,
  url,
} from "./transfer-helpers";

test("TR-4 controls render only where useCalculator() returns a v2 bridge: v2 Math questions, never Reading and Writing", async ({
  page,
}) => {
  await page.goto(url());
  await expect(page.getByText("Lines", { exact: false }).first()).toBeVisible();
  for (const latex of new Set(T1_STEM_CONTROLS))
    await expect(anchors(page, latex), latex).toHaveCount(
      T1_STEM_CONTROLS.filter((l) => l === latex).length
    );
  for (const latex of T1_STEM_DENIED) {
    await expect(annotations(page, latex).first()).toBeAttached();
    await expect(anchors(page, latex), latex).toHaveCount(0);
  }
  await expect(page.locator("[data-transfer-control]")).toHaveCount(T1_STEM_CONTROLS.length + 3);
  await expect(choiceControl(page, "D")).toHaveCount(0);
  await page.goto(url("practice", "&subject=reading"));
  await expect(page.getByText(/^Question 1:/).first()).toBeVisible();
  await expect(allControls(page)).toHaveCount(0);
  await page.goto(url());
  await press(page, "Skip this question");
  await press(page, "Skip this question");
  await expect(page.getByText("is quoted", { exact: false })).toBeVisible();
  await expect(allControls(page)).toHaveCount(0);
});

test("TR-76 with calculatorV2 off every call site renders Export to Karman unchanged; with it on only Transfer controls render", async ({
  page,
}) => {
  await page.goto("/?flow=practice");
  await expect(
    page.getByRole("button", { name: "Paste \\sin(30) into calculator", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Paste table into calculator as x₁, y₁", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Paste choice [ABCD] into calculator$/ })
  ).toHaveCount(4);
  await expect(allControls(page)).toHaveCount(0);
  await page.goto("/?flow=practice&calc=v2");
  await expect(page.getByText(/^Question 1:/).first()).toBeVisible();
  await expect(page.getByText(/Export to Karman|Copy for Desmos/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export options" })).toHaveCount(0);
  await expect(anchors(page, "\\sin(30)")).toHaveCount(1);
  await expect(anchors(page, "(1,2)")).toHaveCount(0);
  await expect(anchor(page, "\\sin(30)")).toBeAttached();
  await expect(
    page.getByRole("button", { name: /^Transfer to Calculator: choice [ABCD]$/ })
  ).toHaveCount(4);
  for (const flow of ["diagnostic", "catalog", "daily"]) {
    await page.goto(`/?flow=${flow}&questions=transfer`);
    await expect(page.getByText("Export to Karman").first()).toBeVisible();
    await expect(allControls(page)).toHaveCount(0);
    await page.goto(url(flow));
    await expect(allControls(page).first()).toBeAttached();
    await expect(page.getByText(/Export to Karman|Copy for Desmos/)).toHaveCount(0);
  }
});
