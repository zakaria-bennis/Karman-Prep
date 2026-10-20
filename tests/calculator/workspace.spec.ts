import { test, expect } from "@playwright/test";

for (const flow of ["practice", "diagnostic"]) {
  test(`${flow}: responsive scratchpad, theme, typing, ink, navigation and guide`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/?flow=${flow}`);
    await page.getByRole("button", { name: "Hide Timer", exact: true }).click();
    await expect(page.getByRole("button", { name: "Show Timer", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Show Timer", exact: true }).click();
    await page
      .getByRole("button", {
        name: flow === "practice" ? "Scratchpad" : "Toggle scratchpad",
        exact: true,
      })
      .click();
    const pad = page.getByRole("region", { name: "Scratchpad", exact: true });
    await expect(pad).toBeVisible();
    const bounds = await pad.boundingBox();
    const viewport = page.viewportSize()!;
    expect(bounds!.height).toBeLessThanOrEqual(viewport.height * 0.63);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    await pad.getByRole("button", { name: "Typing", exact: true }).click();
    await pad.getByRole("textbox", { name: "Scratchpad notes" }).fill("My scratch work");
    await page.getByRole("button", { name: "Close scratchpad" }).click();
    await page
      .getByRole("button", {
        name: flow === "practice" ? "Scratchpad" : "Toggle scratchpad",
        exact: true,
      })
      .click();
    await expect(pad.getByRole("textbox", { name: "Scratchpad notes" })).toHaveValue(
      "My scratch work"
    );
    for (const theme of ["light", "dark"]) {
      await page.getByRole("button", { name: "Fixture theme", exact: true }).click();
      await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);
      await info.attach(`${flow}-scratchpad-${theme}`, {
        body: await pad.screenshot(),
        contentType: "image/png",
      });
    }
    await pad.getByRole("button", { name: "Drawing", exact: true }).click();
    const paper = pad.getByRole("img", { name: "Scratchpad drawing" });
    const b = (await paper.boundingBox())!;
    await page.mouse.move(b.x + 40, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width - 50, b.y + b.height / 2, { steps: 10 });
    await page.mouse.up();
    await expect(paper.locator("path")).toHaveCount(1);
    await pad.getByLabel("Drawing tool").selectOption("stroke");
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await expect(paper.locator("path")).toHaveCount(0);
    await pad.getByRole("button", { name: "Clear All", exact: true }).click();
    await pad.getByRole("button", { name: "Typing", exact: true }).click();
    await expect(pad.getByRole("textbox")).toHaveValue("");
    await pad.getByRole("textbox").fill("Must be cleared on next question");
    await page.getByRole("button", { name: "Close scratchpad" }).click();
    await page.getByRole("button", { name: "Bookmark for review", exact: true }).click();
    if (flow === "practice") {
      await page.getByRole("button", { name: /^B(?:\s|$)/ }).click();
      await page.getByRole("button", { name: "Submit Answer", exact: true }).click();
      await page.getByRole("button", { name: "Next", exact: true }).last().click();
    } else await page.getByRole("button", { name: "Skip this question", exact: true }).click();
    await page.getByRole("button", { name: "Previous", exact: true }).click();
    await page
      .getByRole("button", {
        name: flow === "practice" ? "Scratchpad" : "Toggle scratchpad",
        exact: true,
      })
      .click();
    await pad.getByRole("button", { name: "Typing", exact: true }).click();
    await expect(pad.getByRole("textbox")).toHaveValue("");
    await page.getByRole("button", { name: "Close scratchpad" }).click();
    await page
      .getByRole("button", {
        name: flow === "practice" ? "Questions" : "Open question navigator",
        exact: true,
      })
      .click();
    const guide = page.getByRole("dialog", { name: "Question guide" });
    await expect(guide).toBeVisible();
    if (flow === "diagnostic")
      await expect(guide.getByRole("button", { name: /locked/i })).toBeDisabled();
    await info.attach(`${flow}-guide`, {
      body: await guide.screenshot(),
      contentType: "image/png",
    });
    await guide.getByRole("button", { name: "Close question guide" }).click();
    expect(errors).toEqual([]);
  });

  test(`${flow}: highlighting cycles colors, strike controls and reduced motion`, async ({
    page,
  }) => {
    await page.goto(`/?flow=${flow}&subject=reading`);
    const passage = page.locator(".select-text").first();
    for (const [start, end] of [
      [0, 11],
      [17, 28],
    ]) {
      await passage.evaluate(
        (el, { start, end }) => {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          const range = document.createRange();
          let offset = 0;
          let n: Node | null;
          while ((n = walker.nextNode())) {
            const len = n.textContent?.length ?? 0;
            if (start >= offset && start < offset + len) range.setStart(n, start - offset);
            if (end > offset && end <= offset + len) {
              range.setEnd(n, end - offset);
              break;
            }
            offset += len;
          }
          const sel = window.getSelection()!;
          sel.removeAllRanges();
          sel.addRange(range);
        },
        { start, end }
      );
      await page.getByRole("button", { name: "Highlight", exact: true }).first().click();
    }
    const marks =
      flow === "practice" ? page.locator("[data-highlight-color]") : passage.locator("mark");
    await expect(marks).toHaveCount(2);
    expect(await marks.nth(0).evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
      await marks.nth(1).evaluate((el) => getComputedStyle(el).backgroundColor)
    );
    const strike = page.getByRole("button", { name: "Cross out choice B", exact: true });
    await strike.focus();
    await strike.press("Enter");
    await expect(page.getByRole("button", { name: "Restore choice B", exact: true })).toBeVisible();
    await page.getByLabel("Quiz settings").click();
    await page.getByLabel("Question animations").uncheck();
    await expect(page.locator('[data-animate="false"]')).toHaveCount(1);
    await page.getByLabel("Question animations").check();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("[data-question-content]").first()).toHaveCSS(
      "animation-name",
      "none"
    );
  });
}
