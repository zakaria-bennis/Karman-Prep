import { expect, test } from "@playwright/test";

test.skip(process.env.E2E_DIRECT_STUDENT !== "1", "requires the direct synthetic student server");

test("direct synthetic student resumes and completes a short quiz once", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/learn/math");
  const replayConsent = page.getByRole("dialog", { name: /Help us debug/i });
  if (await replayConsent.isVisible()) {
    await replayConsent.getByRole("button", { name: "Decline" }).click();
  }
  const openQuiz = async () => {
    if (!(await page.getByRole("button", { name: "Start Quiz" }).isVisible())) {
      await page.getByRole("button", { name: "Linear equations (one variable)" }).first().click();
    }
    await page.getByRole("button", { name: "Start Quiz" }).first().click();
  };
  await openQuiz();
  const correctByAddend: Record<string, string> = { "1": "A", "2": "B", "3": "C", "4": "D" };
  for (let i = 0; i < 4; i++) {
    await expect(page.locator("body")).toContainText(/Solve x \+ [1-4] = [3-9]/);
    const body = await page.locator("body").innerText();
    const addend = body.match(/Solve x \+ ([1-4]) = [3-9]/)?.[1];
    expect(addend).toBeTruthy();
    await page
      .getByRole("button", { name: new RegExp(`^${correctByAddend[addend!]}\\s`) })
      .first()
      .click();
    await page.getByRole("button", { name: "Submit Answer" }).click();
    if (i === 3) {
      await page.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((el) =>
          el.textContent?.includes("See results")
        );
        button?.click();
        button?.click();
      });
      break;
    }
    await page.getByRole("button", { name: "Next question →" }).click();
    await expect(page.locator("body")).toContainText(`Question ${i + 2} of 4`);
    if (i === 1) {
      await page.getByRole("button", { name: "Close quiz" }).click();
      await openQuiz();
      await expect(page.locator("body")).toContainText("Question 3 of 4");
    }
  }
  await expect(page.locator("body")).toContainText(
    "Perfect run. Time to push into harder material."
  );
});
