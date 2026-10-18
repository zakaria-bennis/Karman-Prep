import { test, expect } from "@playwright/test";
test("late clipboard, fallback, and retake cannot restore stale question data", async ({
  page,
  isMobile,
}) => {
  await page.goto("/?flow=diagnostic");
  const open = async () => {
    await page
      .getByRole("button", {
        name: isMobile ? "Open Karman calculator" : "Toggle Karman calculator",
        exact: true,
      })
      .click();
    await expect(page.getByRole("textbox", { name: "Expression 1", exact: true })).toBeVisible();
  };
  await open();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        read: () =>
          new Promise((resolve) => {
            (window as unknown as { finishPaste: () => void }).finishPaste = () =>
              resolve([{ types: ["text/plain"], getType: async () => new Blob(["sin(30)"]) }]);
          }),
      },
    })
  );
  await page.getByRole("button", { name: "Paste math", exact: true }).click();
  await page.getByRole("button", { name: "Close calculator", exact: true }).click();
  await page.getByRole("button", { name: "Skip this question" }).click();
  await page.evaluate(() => (window as unknown as { finishPaste: () => void }).finishPaste());
  await open();
  await expect(page.getByRole("textbox", { name: "Expression 1", exact: true })).toHaveValue("");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        read: async () => {
          throw new Error("Paste below.");
        },
      },
    })
  );
  await page.getByRole("button", { name: "Paste math", exact: true }).click();
  await page.getByRole("textbox", { name: "Math to paste" }).fill("sin(30)");
  await page.getByRole("button", { name: "Insert math" }).click();
  await expect(page.getByLabel("Result 1", { exact: true })).toHaveText("0.5");
  await page.getByRole("button", { name: "Close calculator", exact: true }).click();
  await page.getByRole("button", { name: "Fixture retake" }).click();
  await open();
  await expect(page.getByRole("textbox", { name: "Expression 1", exact: true })).toHaveValue("");
});
