// Calculator v2 window in the quiz hosts (11 tasks 7 to 9).

import { expect, test } from "@playwright/test";
import { frame, openV2, phoneSized, side, trigger, v2Requests } from "./quiz-helpers";

test("L-4 the toolbar and the phone side button open v2 in Math questions only", async ({
  page,
}) => {
  for (const flow of ["practice", "diagnostic", "catalog", "daily"]) {
    await openV2(page, flow);
    await expect(
      page.getByRole("region", { name: "Graphing calculator", exact: true })
    ).toBeVisible();
  }
  await page.goto("/?flow=practice&calc=v2&subject=reading");
  await expect(page.getByText(/^Question 1:/).first()).toBeVisible();
  await expect(trigger(page)).toHaveCount(0);
  await expect(side(page)).toHaveCount(0);
});

test("AR-8 without calc=v2 every flow opens v1 and requests no v2 module", async ({ page }) => {
  const urls = v2Requests(page);
  for (const flow of ["practice", "diagnostic", "catalog", "daily"]) {
    await page.goto(`/?flow=${flow}`);
    await (phoneSized(page) ? side(page) : trigger(page)).click();
    await expect(page.getByRole("button", { name: "Paste math", exact: true })).toBeVisible();
    await expect(frame(page)).toHaveCount(0);
  }
  expect(urls).toEqual([]);
});
