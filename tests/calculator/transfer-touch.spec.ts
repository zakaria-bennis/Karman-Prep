// Answer-choice clusters in the browser (14 task 9, OI-36) and the touch selection flow (task 10).
import { expect, test } from "@playwright/test";
import { BLOCK_SYSTEM } from "./fixture/harness/transfer-questions";
import {
  DESKTOP,
  anchor,
  answerState,
  box,
  choiceContainer,
  choiceControl,
  control,
  frame,
  item,
  opacity,
  outline,
  press,
  rows,
  selected,
  tapItem,
  touchGesture,
  touchOnly,
  url,
} from "./transfer-helpers";

test("TR-42 answer-choice controls sit after cross-out, always visible at the coarse size on touch screens and shown only on hover or focus within the cluster otherwise", async ({
  page,
}, info) => {
  const touch = /ios|android/.test(info.project.name);
  test.skip(!touch && info.project.name !== "calculator-chrome", "pointer-specific visibility");
  for (const flow of ["practice", "catalog", "daily", "diagnostic"]) {
    if (!touch) await page.setViewportSize(DESKTOP);
    await page.goto(url(flow));
    const clusterAnchors = page.locator("[data-calculator-cluster] > [data-transfer-control]");
    await expect(clusterAnchors.first()).toBeAttached();
    for (const a of await clusterAnchors.all()) {
      if (flow !== "daily")
        await expect(a.locator("xpath=preceding-sibling::*[1]")).toHaveAttribute(
          "aria-label",
          /^Cross out choice /
        );
      if (touch) {
        await a.scrollIntoViewIfNeeded();
        expect(await opacity(a)).toBe("1");
        const b = await box(a.locator("button"));
        expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44);
        expect((await box(a.locator("[data-transfer-glyph]"))).width).toBe(20);
        await page.keyboard.press("Escape");
        expect(await opacity(a)).toBe("1");
      } else {
        await page.mouse.move(5, 790);
        expect(await opacity(a)).toBe("0");
        await a.locator("xpath=ancestor::*[@data-calculator-cluster]/..").hover();
        expect(await opacity(a)).toBe("1");
        await page.mouse.move(5, 790);
        await a.locator("button").focus();
        expect(await opacity(a)).toBe("1");
      }
    }
  }
});

test("TR-41 a transfer from an answer choice never selects, changes, crosses out or submits an answer in any mode", async ({
  page,
}, info) => {
  const touch = info.project.name === "calculator-ios";
  test.skip(!touch && info.project.name !== "calculator-chrome", "desktop mouse and iPhone touch");
  const expected: Record<string, string[]> = {
    practice: ["1"],
    catalog: ["1"],
    daily: ["y=2x-1"],
    diagnostic: ["3p+4=19"],
  };
  for (const flow of ["practice", "catalog", "daily", "diagnostic"]) {
    if (!touch) await page.setViewportSize(DESKTOP);
    await page.goto(url(flow));
    await expect(choiceControl(page, "A")).toBeAttached();
    await expect(
      page.locator(
        "button [data-transfer-control], label [data-transfer-control], [role=radio] [data-transfer-control]"
      )
    ).toHaveCount(0);
    const before = await answerState(page);
    if (touch) await choiceControl(page, "A").tap();
    else {
      await choiceContainer(page, "A").hover();
      await choiceControl(page, "A").click();
    }
    await expect.poll(() => rows(page)).toEqual(expected[flow]);
    await page.getByRole("button", { name: "Close calculator", exact: true }).click();
    expect(await answerState(page), flow).toEqual(before);
  }
});

test("AR-11 at 1024×768 with touch emulation every diagnostic choice control shows without hover and without transitions; the coarse rule never depends on hover", async ({
  browser,
}, info) => {
  test.skip(info.project.name !== "calculator-chrome", "Chromium touch emulation");
  const context = await browser.newContext({
    baseURL: info.project.use.baseURL,
    viewport: { width: 1024, height: 768 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(url());
  expect(await page.evaluate(() => matchMedia("(any-pointer: coarse)").matches)).toBe(true);
  const clusterAnchors = page.locator("[data-calculator-cluster] > [data-transfer-control]");
  await expect(clusterAnchors).toHaveCount(3);
  for (const a of await clusterAnchors.all()) {
    expect(await opacity(a)).toBe("1");
    expect(await opacity(a.locator(".."))).toBe("1");
    expect(await a.locator("..").evaluate((el) => getComputedStyle(el).transitionDuration)).toBe(
      "0s"
    );
  }
  // Stands in for the both-match profile (decision "AR-11's second browser profile"; note 3;
  // OI-36, accepted 2026-10-17): the coarse rule's media condition names no hover or pointer
  // feature besides any-pointer: coarse, so it applies whatever hover reports.
  const coarseOnly = await page.evaluate(() =>
    [...document.styleSheets]
      .flatMap((s) => {
        try {
          return [...s.cssRules];
        } catch {
          return [];
        }
      })
      .filter(
        (r): r is CSSMediaRule =>
          r instanceof CSSMediaRule && /any-pointer:\s*coarse/.test(r.conditionText)
      )
      .some(
        (r) =>
          !/hover|pointer:\s*fine/.test(r.conditionText) &&
          [...r.cssRules].some(
            (x) => x.cssText.includes("data-calculator-cluster") && /opacity:\s*1/.test(x.cssText)
          )
      )
  );
  expect(coarseOnly).toBe(true);
  await context.close();
});

test("TR-55 a tap selects one stem item with a 2 px solid outline offset 2 px and a 44 px control on top of it; answer choices are never tap-selected", async ({
  page,
}, info) => {
  touchOnly(info.project.name);
  await page.goto(url());
  await tapItem(page, "y>2x+1");
  const it = item(page, "y>2x+1");
  await expect(it).toHaveAttribute("data-transfer-selected", "true");
  expect(await outline(it)).toEqual(["solid", "2px", "2px"]);
  const c = await box(control(page, "y>2x+1"));
  expect(Math.min(c.width, c.height)).toBeGreaterThanOrEqual(44);
  expect(
    await control(page, "y>2x+1").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    })
  ).toBe(true);
  await tapItem(page, BLOCK_SYSTEM);
  await expect(selected(page)).toHaveCount(1);
  await expect(item(page, BLOCK_SYSTEM)).toHaveAttribute("data-transfer-selected", "true");
  await page.goto(url("practice"));
  await page.locator(".group > button").first().tap();
  await expect(selected(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit Answer" })).toBeVisible();
});

test("TR-56 tapping the control transfers the selected item at once and tapping the selected item again deselects it", async ({
  page,
}, info) => {
  touchOnly(info.project.name);
  await page.goto(url());
  await tapItem(page, "y>2x+1");
  await tapItem(page, "y>2x+1");
  await expect(selected(page)).toHaveCount(0);
  await expect(anchor(page, "y>2x+1")).toHaveAttribute("data-visible", "false");
  await tapItem(page, "y>2x+1");
  await control(page, "y>2x+1").tap();
  await expect(frame(page)).toHaveAttribute("data-mode", "fullscreen");
  await expect.poll(() => rows(page)).toEqual(["y>2x+1"]);
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("TR-57 selection clears on an outside tap, Escape, opening the calculator, a transfer and a question change, never times out and moves with the item when scrolled", async ({
  page,
}, info) => {
  touchOnly(info.project.name);
  await page.goto(url());
  await tapItem(page, "y>2x+1");
  await page.waitForTimeout(2500);
  await expect(selected(page)).toHaveCount(1);
  const before = [await box(item(page, "y>2x+1")), await box(control(page, "y>2x+1"))];
  // Scrolls 120 px at once (the site scrolls smoothly), upward when the item's scroll into view
  // left the page at its bottom.
  const y0 = await page.evaluate(() => scrollY);
  await page.evaluate(() =>
    window.scrollBy({ top: scrollY >= 120 ? -120 : 120, behavior: "instant" })
  );
  expect(Math.abs((await page.evaluate(() => scrollY)) - y0)).toBeGreaterThan(0);
  await expect(selected(page)).toHaveCount(1);
  const after = [await box(item(page, "y>2x+1")), await box(control(page, "y>2x+1"))];
  expect(after[1].y - after[0].y).toBeCloseTo(before[1].y - before[0].y, 0);
  expect(after[1].x - after[0].x).toBeCloseTo(before[1].x - before[0].x, 0);
  await page.locator("h2").first().scrollIntoViewIfNeeded();
  const h2 = await box(page.locator("h2").first());
  await page.touchscreen.tap(h2.x + 3, h2.y + 3);
  await expect(selected(page)).toHaveCount(0);
  await tapItem(page, "y>2x+1");
  await page.keyboard.press("Escape");
  await expect(selected(page)).toHaveCount(0);
  await tapItem(page, "y>2x+1");
  await press(page, "Open Karman calculator");
  await expect(selected(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Close calculator", exact: true }).tap();
  await tapItem(page, "y>2x+1");
  await control(page, "y>2x+1").tap();
  await expect(selected(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Close calculator", exact: true }).tap();
  await tapItem(page, "y>2x+1");
  await press(page, "Skip this question");
  await expect(page.getByText("The function", { exact: false })).toBeVisible();
  await expect(selected(page)).toHaveCount(0);
});

test("TR-58 a long press, a drag (even one that returns to its start) or a gesture ending with selected text never selects an item, and the native selection survives", async ({
  page,
}, info) => {
  touchOnly(info.project.name);
  await page.goto(url());
  const it = item(page, "y>2x+1");
  await it.scrollIntoViewIfNeeded();
  await touchGesture(page, it, { holdMs: 600 });
  await expect(selected(page)).toHaveCount(0);
  await touchGesture(page, it, { dx: 30 });
  await expect(selected(page)).toHaveCount(0);
  await touchGesture(page, it, { dx: 30, back: true });
  await expect(selected(page)).toHaveCount(0);
  await page.evaluate(() => {
    const h2 = document.querySelector("h2");
    if (h2 !== null) getSelection()?.selectAllChildren(h2);
  });
  await touchGesture(page, it, {});
  await expect(selected(page)).toHaveCount(0);
  expect(await page.evaluate(() => getSelection()?.toString().length ?? 0)).toBeGreaterThan(0);
  await page.evaluate(() => getSelection()?.removeAllRanges());
  await touchGesture(page, it, {});
  await expect(selected(page)).toHaveCount(1);
});
