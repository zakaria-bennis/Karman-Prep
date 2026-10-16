import { test, expect } from "@playwright/test";
test("live skill flow: math export, saved answer, review navigation and scratch reset", async ({
  page,
  isMobile,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?flow=catalog");
  await page.getByRole("button", { name: "Paste \\sin(30) into calculator", exact: true }).click();
  await expect(page.getByLabel("Result 1", { exact: true })).toHaveText("0.5");
  await page.getByRole("button", { name: "Close calculator", exact: true }).click();
  await page.getByRole("button", { name: "Bookmark for review", exact: true }).click();
  await page.getByRole("button", { name: "Scratchpad", exact: true }).click();
  await page.getByRole("button", { name: "Typing", exact: true }).click();
  await page.getByRole("textbox", { name: "Scratchpad notes" }).fill("Clear on navigation");
  await page.getByRole("button", { name: "Close scratchpad" }).click();
  await page.getByRole("radio", { name: "Choice A", exact: true }).check();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.getByText("Correct · answer saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove bookmark", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Choice A", exact: true })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Choice A", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Scratchpad", exact: true }).click();
  await page.getByRole("button", { name: "Typing", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Scratchpad notes" })).toHaveValue("");
  await page.getByRole("button", { name: "Close scratchpad" }).click();
  await page
    .getByRole("button", {
      name: isMobile ? "Open Karman calculator" : "Toggle Karman calculator",
      exact: true,
    })
    .click();
  await expect(page.getByRole("textbox", { name: "Expression 1", exact: true })).toHaveValue("");
  await info.attach("catalog-calculator", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  expect(errors).toEqual([]);
});
