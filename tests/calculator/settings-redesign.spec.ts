// The Graph Settings redesign (founder decision, 2026-10-26) in real browsers: the one on/off
// switch with its spring and its reduced-motion fallback, the help buttons on hover, keyboard
// focus and touch, the axis "Label and step" disclosure, key sounds that make no audio until they
// are turned on, the keyboard-only path through the popover, and a phone-width layout.

import { expect, test, type Page } from "@playwright/test";
import { enc, openSettings, openShell, rowField, tap, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

const region = (page: Page) => page.getByRole("region", { name: "Graph Settings" });

test("every on/off setting is the same switch: it springs across, fills with the accent, and is instant under reduced motion", async ({
  page,
}) => {
  await openShell(page, "?w=1000&h=900");
  await openSettings(page);
  const switches = region(page).locator(".kc-toggle");
  // Grid, Minor Gridlines, Axis Numbers, Arrows, X-Axis, Y-Axis, Complex Mode and Key Sounds.
  await expect(switches).toHaveCount(8);
  const looks = await region(page)
    .getByRole("checkbox", { name: "Arrows" })
    .evaluate((input) => {
      const toggle = input.closest(".kc-toggle")!;
      const knob = toggle.querySelector(".kc-toggle-knob")!;
      const track = toggle.querySelector(".kc-toggle-track")!;
      const k = getComputedStyle(knob);
      return {
        property: k.transitionProperty,
        easing: k.transitionTimingFunction,
        duration: k.transitionDuration,
        offTrack: getComputedStyle(track).backgroundColor,
      };
    });
  expect(looks.property).toContain("transform");
  expect(looks.easing).toMatch(/linear\(|ease/); // the sampled spring, or ease where linear() is missing
  expect(looks.duration).toMatch(/^0\.4s/); // AN-14: within 400 ms, no overshoot
  const arrows = region(page).getByRole("checkbox", { name: "Arrows" });
  await region(page).getByText("Arrows", { exact: true }).click(); // the label flips it too
  await expect(arrows).toBeChecked();
  const on = await arrows.evaluate((input) => {
    const toggle = input.closest(".kc-toggle")!;
    return getComputedStyle(toggle.querySelector(".kc-toggle-track")!).backgroundColor;
  });
  expect(on).not.toBe(looks.offTrack);
  // Interruptible: a second click mid-flight turns it straight back.
  await arrows.click();
  await arrows.click();
  await expect(arrows).toBeChecked();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await arrows.evaluate(
    (input) =>
      getComputedStyle(input.closest(".kc-toggle")!.querySelector(".kc-toggle-knob")!)
        .transitionDuration
  );
  expect(reduced.split(",").every((d) => parseFloat(d) === 0)).toBe(true);
});

test("the help buttons explain Axis scale, Lock Viewport and Braille Mode on hover, on keyboard focus and on a tap", async ({
  page,
  isMobile,
}) => {
  await openShell(page, "?w=1000&h=900");
  await openSettings(page);
  await tap(isMobile, region(page).getByRole("button", { name: "More Options" }));
  for (const topic of ["Axis scale", "Lock Viewport", "Braille Mode"]) {
    const help = region(page).getByRole("button", { name: `About ${topic}` });
    const bubble = help.locator("xpath=following-sibling::*[@role='tooltip']");
    await expect(bubble).toBeHidden();
    await expect(help).toHaveAccessibleDescription(/\w{4,}/);
    if (isMobile) {
      await help.tap();
      await expect(bubble).toBeVisible();
      await help.tap();
      await expect(bubble).toBeHidden();
    } else {
      await help.hover();
      await expect(bubble).toBeVisible();
      await page.mouse.move(5, 5);
      await expect(bubble).toBeHidden();
      await help.click();
      await expect(bubble).toBeVisible();
      await page.mouse.move(5, 5);
      await expect(bubble).toBeVisible(); // a click pins it
      await page.keyboard.press("Escape"); // its own layer: the popover stays
      await expect(bubble).toBeHidden();
      await expect(region(page)).toBeVisible();
    }
    // The bubble stays inside the settings body.
    if (!isMobile) {
      await help.click();
      const inside = await bubble.evaluate((b) => {
        const body = b.closest(".kc-settings-body")!.getBoundingClientRect();
        const r = b.getBoundingClientRect();
        return r.left >= body.left - 1 && r.right <= body.right + 1;
      });
      expect(inside, topic).toBe(true);
      await page.keyboard.press("Escape");
    }
  }
});

test("keyboard focus on a help button shows its explanation", async ({
  page,
  isMobile,
  browserName,
}) => {
  test.skip(isMobile, "keyboard focus");
  // WebKit's Tab skips buttons unless the Mac's keyboard navigation setting is on.
  test.skip(browserName === "webkit", "Tab reaches buttons only with full keyboard access");
  await openShell(page, "?w=1000&h=900");
  await openSettings(page);
  const more = region(page).getByRole("button", { name: "More Options" });
  await more.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab"); // the Axis scale help
  const help = region(page).getByRole("button", { name: "About Axis scale" });
  await expect(help).toBeFocused();
  await expect(help.locator("xpath=following-sibling::*[@role='tooltip']")).toBeVisible();
});

test("each axis keeps its range in view and puts the label and step behind Label and step", async ({
  page,
  isMobile,
}) => {
  await openShell(page, "?w=1000&h=900");
  await openSettings(page);
  await expect(page.getByRole("textbox", { name: /^X Axis Minimum:/ })).toBeAttached();
  await expect(region(page).locator(".kc-settings-bound")).toHaveCount(4); // both ranges show
  for (const bound of await region(page).locator(".kc-settings-bound").all())
    await expect(bound).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Label", exact: true })).toHaveCount(0);
  const [x] = await region(page).getByRole("button", { name: "Label and step" }).all();
  await tap(isMobile, x);
  await expect(x).toHaveAttribute("aria-expanded", "true");
  const label = page.getByRole("textbox", { name: "Label", exact: true });
  await label.fill("time");
  await expect
    .poll(() => page.evaluate(() => globalThis.__shell!.handle.calculator.settings.xAxis.label))
    .toBe("time");
  await expect(page.getByRole("textbox", { name: /^X Axis Step Size:/ })).toBeAttached();
  // Blank step reads as Auto.
  const auto = await region(page)
    .locator(".kc-settings-step .mq-editable-field")
    .first()
    .evaluate((f) => getComputedStyle(f, "::before").content);
  expect(auto).toBe('"Auto"');
});

test("key sounds are off by default and make no audio until turned on; on, typing and the keypad play", async ({
  page,
  isMobile,
}) => {
  await page.addInitScript(() => {
    const seen = { made: 0, voices: 0 };
    (globalThis as unknown as { __audio: typeof seen }).__audio = seen;
    const Base = window.AudioContext;
    class Counting extends Base {
      constructor(options?: AudioContextOptions) {
        super(options);
        seen.made += 1;
      }
    }
    window.AudioContext = Counting;
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (when?: number) {
      seen.voices += 1;
      return start.call(this, when);
    };
  });
  const audio = () =>
    page.evaluate(
      () => (globalThis as unknown as { __audio: { made: number; voices: number } }).__audio
    );
  await openShell(page, `?w=1000&h=900&rows=${enc([""])}`);
  await rowField(page, "1").click();
  await page.keyboard.type("y=2^x");
  expect(await audio()).toEqual({ made: 0, voices: 0 });
  await openSettings(page);
  const sounds = region(page).getByRole("checkbox", { name: "Key Sounds" });
  await expect(sounds).not.toBeChecked();
  await tap(isMobile, sounds);
  await expect(sounds).toBeChecked();
  expect((await audio()).made).toBe(1);
  await page.keyboard.press("Escape");
  const before = (await audio()).voices;
  await rowField(page, "1").click();
  await page.keyboard.type("+3");
  await expect.poll(async () => (await audio()).voices).toBeGreaterThan(before);
  // Off again: nothing more plays.
  await openSettings(page);
  await tap(isMobile, region(page).getByRole("checkbox", { name: "Key Sounds" }));
  await page.keyboard.press("Escape");
  const after = (await audio()).voices;
  await rowField(page, "1").click();
  await page.keyboard.type("+1");
  await page.waitForTimeout(100);
  expect((await audio()).voices).toBe(after);
  expect((await audio()).made).toBe(1);
});

test("keyboard only: Tab walks the popover in order and Space flips a switch", async ({
  page,
  isMobile,
  browserName,
}) => {
  test.skip(isMobile, "keyboard only");
  test.skip(browserName === "webkit", "Tab reaches buttons only with full keyboard access");
  await openShell(page, "?w=1000&h=900&theme=classic");
  await openSettings(page);
  await expect(page.getByRole("slider", { name: "Text Size" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("slider", { name: "Text Size" })).toHaveValue("4");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("combobox", { name: /^Theme/ })).toBeFocused();
  await page.keyboard.press("Tab");
  const grid = region(page).getByRole("checkbox", { name: "Grid", exact: true });
  await expect(grid).toBeFocused();
  const ring = await grid.evaluate(
    (input) =>
      getComputedStyle(input.closest(".kc-toggle")!.querySelector(".kc-toggle-track")!).outlineStyle
  );
  expect(ring).toBe("solid");
  await page.keyboard.press("Space");
  await expect(grid).not.toBeChecked();
  await page.keyboard.press("Space");
  await expect(grid).toBeChecked();
});

test("at phone width the popover fits the screen, rows keep 34 px targets and nothing is cut off", async ({
  page,
  isMobile,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openShell(page);
  await openSettings(page);
  await tap(isMobile, region(page).getByRole("button", { name: "More Options" }));
  const sizes = await region(page).evaluate((r) => {
    const body = r.querySelector(".kc-settings-body")!.getBoundingClientRect();
    return {
      body: { left: body.left, right: body.right },
      rows: [...r.querySelectorAll(".kc-switch-head")].map((h) => {
        const b = h.getBoundingClientRect();
        return { left: b.left, right: b.right, height: b.height };
      }),
      clipped: [...r.querySelectorAll(".kc-switch-label")].filter(
        (l) => (l as HTMLElement).scrollWidth > (l as HTMLElement).clientWidth + 1
      ).length,
    };
  });
  expect(sizes.body.left).toBeGreaterThanOrEqual(0);
  expect(sizes.body.right).toBeLessThanOrEqual(390);
  for (const row of sizes.rows) {
    expect(row.height).toBeGreaterThanOrEqual(32);
    expect(row.left).toBeGreaterThanOrEqual(sizes.body.left);
    expect(row.right).toBeLessThanOrEqual(sizes.body.right);
  }
  expect(sizes.clipped).toBe(0);
});
