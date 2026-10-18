// Answer-choice clusters in the browser (14 task 9, OI-36) and the touch selection flow (task 10).
import { expect, test } from "@playwright/test";
import {
  DESKTOP,
  answerState,
  box,
  choiceContainer,
  choiceControl,
  opacity,
  rows,
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
    const clusterAnchors = page.locator('[data-calculator="v2"] > [data-transfer-control]');
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
        await a.locator("xpath=ancestor::*[@data-calculator='v2']/..").hover();
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
  const clusterAnchors = page.locator('[data-calculator="v2"] > [data-transfer-control]');
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
            (x) => x.cssText.includes('data-calculator="v2"') && /opacity:\s*1/.test(x.cssText)
          )
      )
  );
  expect(coarseOnly).toBe(true);
  await context.close();
});
