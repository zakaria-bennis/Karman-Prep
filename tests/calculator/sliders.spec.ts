// Sliders in a real calculator (SLIDERS-4 to SLIDERS-35) on the harness page: add-slider chips,
// the track (press, drag, keys), the limits editor, play and pause, and the options popover.

import { expect, test, type Page } from "@playwright/test";
import { enc, openShell, rowField, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const latexOf = (page: Page, id: string) =>
  page.evaluate(
    (id) => globalThis.__calculatorHarness!.engine.getExpressions().find((r) => r.id === id)?.latex,
    id
  );
const sliderOf = (page: Page, id: string) =>
  page.evaluate(
    (id) =>
      globalThis.__calculatorHarness!.engine.getExpressions().find((r) => r.id === id)?.slider,
    id
  );
const row = (page: Page, id: string) => page.locator(`#calc [data-row-id="${id}"]`);

test("SLIDERS-4, SLIDERS-8 chips add name=1 rows after the source row; all adds every name", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=ax^2+bx+c", "y=2"])}`);
  const chips = row(page, "1").getByRole("group", { name: "Add slider" });
  await expect(chips.getByRole("button")).toHaveText(["a", "b", "c", "all"]);
  await chips.getByRole("button", { name: "Add slider for b" }).click();
  await expect(chips.getByRole("button")).toHaveText(["a", "c", "all"]);
  await chips.getByRole("button", { name: "Add sliders for all" }).click();
  const latex = await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.getExpressions().map((r) => r.latex)
  );
  expect(latex).toEqual(["y=ax^2+bx+c", "a=1", "c=1", "b=1", "y=2"]);
  await expect(row(page, "1").getByRole("group", { name: "Add slider" })).toHaveCount(0);
});

test("SLIDERS-24 to SLIDERS-26 the track takes presses, drags and keys", async ({ page }) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=ax", "a=1"])}`);
  const thumb = row(page, "2").getByRole("slider", { name: "a" });
  await expect(thumb).toHaveAttribute("aria-valuenow", "1");
  const track = row(page, "2").locator(".kc-slider-interior");
  const box = (await track.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.1, box.y + box.height / 2);
  await expect.poll(() => latexOf(page, "2")).toBe("a=-8");
  await expect(thumb).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => latexOf(page, "2")).toBe("a=-7");
  await page.keyboard.press("End");
  await expect.poll(() => latexOf(page, "2")).toBe("a=10");
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => latexOf(page, "2")).toBe("a=5");
  // One drag is one undo step.
  await page.evaluate(() => globalThis.__calculatorHarness!.engine.undo());
  await expect.poll(() => latexOf(page, "2")).toBe("a=10");
});

test("SLIDERS-15 to SLIDERS-18 the limits editor types hard limits and shows their errors", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=ax", "a=1"])}`);
  await row(page, "2").getByRole("button", { name: 'Edit "a" Limits' }).click();
  await expect(row(page, "2").getByRole("textbox", { name: "Slider Minimum:" })).toBeFocused();
  await page.keyboard.type("0");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.type("5");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.type("0.5");
  await expect
    .poll(() => sliderOf(page, "2"))
    .toEqual({ hardMin: true, min: "0", hardMax: true, max: "5", step: "0.5" });
  await page.keyboard.press("Enter");
  const thumb = row(page, "2").getByRole("slider", { name: "a" });
  await expect(thumb).toBeFocused();
  await expect(thumb).toHaveAttribute("aria-valuemax", "5");
  await expect(row(page, "2").locator(".kc-slider-tick")).toHaveCount(9);

  await rowField(page, "2").click();
  await row(page, "2").locator('.kc-slider-limit[data-field="max"]').click();
  await expect(row(page, "2").getByRole("textbox", { name: "Slider Maximum:" })).toBeFocused();
  await page.keyboard.press("Backspace");
  await page.keyboard.type("-1");
  await expect
    .poll(() =>
      page.evaluate(
        () => globalThis.__calculatorHarness!.engine.getSnapshot().rows[1].error?.message
      )
    )
    .toBe("Invalid slider limits. Min should be less than max.");
  await expect(row(page, "2").getByRole("button", { name: "Error" })).toBeVisible();
  // The editor stays open while a limit is invalid.
  await expect(row(page, "2").locator('.kc-slider-limit[data-field="max"]')).toHaveAttribute(
    "data-invalid",
    "true"
  );
});

test("SLIDERS-29 to SLIDERS-34 Play animates the value; the popover changes mode and speed", async ({
  page,
}) => {
  await openShell(page, `?w=900&h=600&rows=${enc(["y=ax", "a=0"])}`);
  const play = row(page, "2").getByRole("button", { name: "Play a Animation" });
  await play.click();
  const pause = row(page, "2").getByRole("button", { name: "Pause a Animation" });
  await expect(pause).toBeVisible();
  await expect.poll(() => latexOf(page, "2"), { timeout: 3000 }).not.toBe("a=0");
  await pause.click();
  const paused = await latexOf(page, "2");
  await page.waitForTimeout(300);
  expect(await latexOf(page, "2")).toBe(paused);

  await row(page, "2").getByRole("button", { name: "Loop forwards and backwards" }).click();
  const menu = page.getByRole("dialog", { name: "Animation options for a" });
  await expect(menu.getByRole("radio")).toHaveCount(4);
  await menu.getByRole("radio", { name: "Play once" }).check();
  await menu.getByRole("button", { name: "Animate Faster" }).click();
  await expect(menu.getByText("1.5x")).toBeVisible();
  await expect
    .poll(() => sliderOf(page, "2"))
    .toMatchObject({ loopMode: "PLAY_ONCE", animationPeriod: 4000 / 1.5 });
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
});
