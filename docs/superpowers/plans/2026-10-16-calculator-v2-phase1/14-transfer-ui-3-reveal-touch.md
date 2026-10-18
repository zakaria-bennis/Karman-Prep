# 14 transfer-ui, part 3 of 4: geometry, tooltip and Escape, answer-choice clusters and the touch flow (Tasks 8 to 10)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 3 of 4 of package `14-transfer-ui.md`, which holds the package header (commands, type
checks, preconditions), the package-internal names, the DOM contract, the Decisions, the Notes for
the lead and the package gate; they apply to every task here. Tasks run in number order across
the four parts; each part starts where the previous one ends (part 2 ends with task 7, which
created `transfer-helpers.ts` and `transfer.spec.ts`).

---

### Task 8: Geometry, tooltip, focus and Escape (resolves OI-2); TR-43 and TR-46 baselines

**Files:**

- Create: `tests/calculator/v2/transfer-visual.spec.ts` and its baselines in `tests/calculator/v2/transfer-visual.spec.ts-snapshots/` (six here, two more in task 9)
- Modify: `src/components/calculator/TransferControl.tsx`, `src/components/calculator/TransferControl.module.css`, `src/components/calculator/transfer-control.css`, `tests/calculator/v2/transfer-helpers.ts`, `tests/calculator/v2/transfer.spec.ts`, `docs/superpowers/specs/calculator-v2/c-transfer.md` (TR-47)
- Ownership (lead edits outside this part file): add `tests/calculator/v2/transfer-visual.spec.ts` and `tests/calculator/v2/transfer-visual.spec.ts-snapshots/` to 14's Owns line in `00-index.md` section 2, and to the Owns list, test-file table and gate `wc -l` list of `14-transfer-ui.md`. Steps 6 to 9 apply note 2's preferred option inside 14 (TR-43 and TR-46 get the visual layer the spec names; 15 and section 6.2 are unchanged), so that file's decision "TR-43 and TR-46 say verified by visual test" and note 2 become "tasks 8 and 9 record baselines in `transfer-visual.spec.ts`". Tell task 14 (part 4) that its border fallback, if applied, re-records and reviews these baselines in its own commit.

**Interfaces:**

- Consumes: task 7 helpers; `SKIN_COLORS` (`SKIN_COLORS[skin].normal.dark`, 03) for the visual spec's skin switch.
- Produces: `placeControl` (package-internal block); the cluster `data-hover` and `data-escaped` attributes; the CSS listed in step 4; the helpers below; in `transfer-visual.spec.ts` (spec-local, not exported): `setSkin(page: Page, skin: "ivory" | "observatory"): Promise<void>`, `glyph(page: Page, latex: string): Locator`, `hoverCorner(l: Locator): Promise<void>`, `shoot(page: Page, name: string, parts: Locator[]): Promise<void>` and the baselines `tr-43-46-{inline,block}-fine-{ivory,observatory}-calculator-chrome-darwin.png` and `tr-43-46-inline-coarse-{ivory,observatory}-calculator-ios-darwin.png`.

- [ ] **Step 1: Apply OI-2 to the spec.** In `c-transfer.md` TR-47 replace `answer-choice controls show and hide with their tool cluster (TR-42)` with `answer-choice controls follow TR-42 and AR-11: always visible while (any-pointer: coarse) matches, otherwise shown only while the pointer is over the choice or focus is within its tool cluster, even when the host keeps the cluster itself visible (for example a crossed-out diagnostic choice)`. Run Prettier on the file; the phrase occurs once.
- [ ] **Step 2: Write the failing browser tests.** Change the helpers' import to `import { expect, test, type Locator, type Page } from "@playwright/test";` and append to `transfer-helpers.ts`:

```
export const DESKTOP = { width: 1280, height: 800 };
export const item = (page: Page, latex: string, n = 0) => anchor(page, latex, n).locator("xpath=preceding-sibling::*[1]");
export const control = (page: Page, latex: string, n = 0) => anchor(page, latex, n).locator("button");
export const tooltip = (page: Page, latex: string, n = 0) => anchor(page, latex, n).locator("[data-transfer-tooltip]");
export const choiceAnchor = (page: Page, letter: string) => choiceControl(page, letter).locator("xpath=..");
export const choiceContainer = (page: Page, letter: string) => choiceControl(page, letter).locator("xpath=ancestor::*[@data-calculator='v2']/..");
export const box = async (l: Locator) => (await l.boundingBox())!;
export const opacity = (l: Locator) => l.evaluate((el) => getComputedStyle(el).opacity);
export const outline = (l: Locator) => l.evaluate((el) => { const s = getComputedStyle(el); return [s.outlineStyle, s.outlineWidth, s.outlineOffset]; });
export const blurActive = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
export const chromeOnly = (name: string) => test.skip(name !== "calculator-chrome", "mouse hover and fixed viewport sizes");
export async function open(page: Page, size = DESKTOP, flow = "diagnostic", extra = "") { await page.setViewportSize(size); await page.goto(url(flow, extra)); await expect(page.getByText(/Lines|Which line|Question 1:/).first()).toBeVisible(); }
export async function tapItem(page: Page, latex: string, n = 0) { await item(page, latex, n).scrollIntoViewIfNeeded(); const b = await box(item(page, latex, n)); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); }
```

Extend the spec's imports to `import { expect, test, type Locator } from "@playwright/test";`, `import { BLOCK_SYSTEM, T1_STEM_CONTROLS, T1_STEM_DENIED } from "../fixture/v2/transfer-questions";` and the helpers `DESKTOP, anchor, blurActive, box, choiceAnchor, choiceContainer, choiceControl, chromeOnly, control, item, opacity, open, outline, tapItem, tooltip` (merged with task 7's), then append:

```
test("TR-43, TR-44 the icon-only control is a Calculator with an ArrowUpRight at 16 px on a 24 px target when hovered, and 20 px on a 44 px target when tap-selected or in a choice cluster on touch", async ({ page }, info) => {
  const touch = /ios|android/.test(info.project.name); test.skip(!touch && info.project.name !== "calculator-chrome", "pointer-specific sizes");
  const check = async (button: Locator, glyph: number, target: number) => {
    await expect(button.locator("svg.lucide-calculator")).toHaveCount(1); await expect(button.locator("svg.lucide-arrow-up-right")).toHaveCount(1); expect((await button.textContent())!.trim()).toBe("");
    const g = await box(button.locator("[data-transfer-glyph]")); expect([g.width, g.height]).toEqual([glyph, glyph]);
    const b = await box(button); expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(target);
  };
  if (touch) { await page.goto(url()); await tapItem(page, "y>2x+1"); await check(control(page, "y>2x+1"), 20, 44); await check(choiceControl(page, "A"), 20, 44); return; }
  await open(page); await item(page, "y>2x+1").hover(); await check(control(page, "y>2x+1"), 16, 24);
  await choiceContainer(page, "A").hover(); await check(choiceControl(page, "A"), 16, 44);
});
test("TR-46 the control overlays without moving text: above the end of an inline item's last line overlapping it by 4 px, inside the top-right corner of display math", async ({ page }, info) => {
  chromeOnly(info.project.name);
  for (const size of [DESKTOP, { width: 390, height: 844 }]) {
    await open(page, size);
    const layout = () => page.locator("h2, h2 .katex").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY, r.width, r.height]; }));
    const before = await layout();
    await item(page, "y>2x+1").hover(); await expect(anchor(page, "y>2x+1")).toHaveAttribute("data-visible", "true"); expect(await layout()).toEqual(before);
    const [last, b] = await item(page, "y>2x+1").evaluate((el) => { const rs = el.getClientRects(); const r = rs[rs.length - 1]; const c = el.nextElementSibling!.querySelector("button")!.getBoundingClientRect(); return [{ top: r.top, right: r.right }, { top: c.top, bottom: c.bottom, right: c.right }]; });
    expect(b.top).toBeLessThan(last.top); expect(b.bottom - last.top).toBeGreaterThanOrEqual(4); expect(Math.abs(b.right - last.right)).toBeLessThanOrEqual(1);
    await item(page, BLOCK_SYSTEM).hover(); expect(await layout()).toEqual(before);
    const [blockBox, c] = [await box(item(page, BLOCK_SYSTEM)), await box(control(page, BLOCK_SYSTEM))];
    expect(Math.abs(c.x + c.width - (blockBox.x + blockBox.width))).toBeLessThanOrEqual(1); expect(Math.abs(c.y - blockBox.y)).toBeLessThanOrEqual(1);
  }
});
test("TR-47 hover shows the control at once along the path to it, keeps it with no timer and hides it at once; choice controls follow AR-11 even when the cluster stays visible (OI-2)", async ({ page }, info) => {
  chromeOnly(info.project.name); await open(page); const visible = () => anchor(page, "y=2x+3").getAttribute("data-visible");
  const it = await box(item(page, "y=2x+3")); const from = { x: it.x + it.width / 2, y: it.y + it.height / 2 };
  await page.mouse.move(from.x, from.y); expect(await visible()).toBe("true");
  const c = await box(control(page, "y=2x+3")); const to = { x: c.x + c.width / 2, y: c.y + c.height / 2 };
  for (let i = 1; i <= 10; i++) { await page.mouse.move(from.x + ((to.x - from.x) * i) / 10, from.y + ((to.y - from.y) * i) / 10); expect(await visible(), `step ${i}`).toBe("true"); }
  await page.waitForTimeout(2000); expect(await visible()).toBe("true"); await page.mouse.move(5, 790); expect(await visible()).toBe("false");
  await page.keyboard.press("Shift"); await control(page, "y=2x+3").focus(); await page.mouse.move(from.x, from.y); await page.mouse.move(5, 790); expect(await visible()).toBe("true");
  await page.getByRole("button", { name: "Cross out choice A", exact: true }).click(); await blurActive(page); await page.mouse.move(5, 790); // the click focused the cross-out button inside the cluster
  expect(await opacity(page.locator('[data-calculator="v2"]').first())).toBe("1"); expect(await opacity(choiceAnchor(page, "A"))).toBe("0");
  await choiceContainer(page, "A").hover(); expect(await opacity(choiceAnchor(page, "A"))).toBe("1");
  await page.mouse.move(5, 790); expect(await opacity(choiceAnchor(page, "A"))).toBe("0");
  await page.getByRole("button", { name: "Restore choice A", exact: true }).focus(); expect(await opacity(choiceAnchor(page, "A"))).toBe("1");
});
test("TR-48 keyboard focus shows the control with a 2 px focus ring and gives the item a 2 px selected outline", async ({ page }, info) => {
  chromeOnly(info.project.name); await open(page);
  for (let i = 0; i < 80 && !(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")?.startsWith("Transfer to Calculator: "))); i++) await page.keyboard.press("Tab");
  const focused = page.locator(":focus"); const a = focused.locator("xpath=.."); const it = a.locator("xpath=preceding-sibling::*[1]");
  await expect(a).toHaveAttribute("data-visible", "true"); expect(await outline(focused)).toEqual(["solid", "2px", "2px"]);
  await expect(it).toHaveAttribute("data-transfer-selected", "true"); expect(await outline(it)).toEqual(["solid", "2px", "2px"]);
  await page.keyboard.press("Tab"); await expect(it).not.toHaveAttribute("data-transfer-selected", "true");
});
test("TR-49 Escape hides a hover-revealed control and its tooltip without moving focus, keeps it hidden until the pointer leaves and re-enters the item, and is consumed only when it hid something", async ({ page }, info) => {
  chromeOnly(info.project.name); await open(page);
  await page.evaluate(() => { const w = window as unknown as { esc: boolean[] }; w.esc = []; window.addEventListener("keydown", (e) => { if (e.key === "Escape") w.esc.push(e.defaultPrevented); }); });
  const escapes = () => page.evaluate(() => (window as unknown as { esc: boolean[] }).esc.splice(0));
  const focusBefore = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 60));
  await item(page, "y>2x+1").hover(); await control(page, "y>2x+1").hover(); await expect(tooltip(page, "y>2x+1")).toBeVisible();
  await page.keyboard.press("Escape"); await expect(anchor(page, "y>2x+1")).toHaveAttribute("data-visible", "false"); await expect(tooltip(page, "y>2x+1")).toBeHidden();
  expect(await escapes()).toEqual([]); expect(await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 60))).toBe(focusBefore);
  const it = await box(item(page, "y>2x+1")); await page.mouse.move(it.x + 2, it.y + it.height / 2); await expect(anchor(page, "y>2x+1")).toHaveAttribute("data-visible", "false");
  await page.keyboard.press("Escape"); expect(await escapes()).toEqual([false]);
  await page.mouse.move(5, 790); await item(page, "y>2x+1").hover(); await expect(anchor(page, "y>2x+1")).toHaveAttribute("data-visible", "true");
});
test("TR-51 the tooltip reads Transfer to Calculator after 300 ms of hover or at once on keyboard focus, adjoins the control, persists over itself and never shows on touch", async ({ page }, info) => {
  const touch = /ios|android/.test(info.project.name); test.skip(!touch && info.project.name !== "calculator-chrome", "hover and touch projects");
  if (touch) { await page.goto(url()); await tapItem(page, "y>2x+1"); await page.waitForTimeout(600); await expect(tooltip(page, "y>2x+1")).toBeHidden(); return; }
  await open(page);
  await anchor(page, "y>2x+1").evaluate((a) => { const b = a.querySelector("button")!; const t = a.querySelector("[data-transfer-tooltip]")!; const w = window as unknown as { tip?: number }; let t0 = 0;
    b.addEventListener("pointerenter", () => (t0 = performance.now())); new MutationObserver(() => { if (!t.hasAttribute("hidden") && w.tip === undefined) w.tip = performance.now() - t0; }).observe(t, { attributes: true }); });
  await item(page, "y>2x+1").hover(); await control(page, "y>2x+1").hover(); await page.waitForTimeout(600);
  const delay = await page.evaluate(() => (window as unknown as { tip?: number }).tip!); expect(delay).toBeGreaterThanOrEqual(295); expect(delay).toBeLessThan(450);
  await expect(tooltip(page, "y>2x+1")).toHaveText("Transfer to Calculator");
  const [b, t] = [await box(control(page, "y>2x+1")), await box(tooltip(page, "y>2x+1"))];
  expect(Math.min(Math.abs(t.x - (b.x + b.width)), Math.abs(b.x - (t.x + t.width)))).toBeLessThanOrEqual(0.5); expect(t.y < b.y + b.height && t.y + t.height > b.y).toBe(true);
  await tooltip(page, "y>2x+1").hover(); await page.waitForTimeout(400); await expect(tooltip(page, "y>2x+1")).toBeVisible();
  await page.keyboard.press("Escape"); await expect(tooltip(page, "y>2x+1")).toBeHidden();
  await page.mouse.move(5, 790); await page.keyboard.press("Shift"); await control(page, "y=2x+3").focus(); expect(await tooltip(page, "y=2x+3").isVisible()).toBe(true);
});
test("TR-52, AN-12 the control, tooltip, selected outline and choice clusters appear and disappear with no animation or transition", async ({ page }, info) => {
  const touch = /ios|android/.test(info.project.name); test.skip(!touch && info.project.name !== "calculator-chrome", "hover and touch projects");
  const still = (l: Locator) => l.evaluate((el) => [el.getAnimations({ subtree: true }).length, getComputedStyle(el).transitionDuration]);
  if (touch) { await page.goto(url()); for (const c of await page.locator('[data-calculator="v2"]').all()) expect(await still(c)).toEqual([0, "0s"]);
    await tapItem(page, "y>2x+1"); for (const l of [anchor(page, "y>2x+1"), item(page, "y>2x+1")]) expect(await still(l)).toEqual([0, "0s"]); return; }
  await open(page); const a = anchor(page, "y>2x+1");
  const steps = [() => item(page, "y>2x+1").hover(), () => control(page, "y>2x+1").hover(), () => page.waitForTimeout(350), () => page.keyboard.press("Escape"), () => page.mouse.move(5, 790), () => control(page, "y>2x+1").focus()];
  for (const step of steps) { await step(); for (const l of [a, a.locator("button"), a.locator("[data-transfer-tooltip]"), item(page, "y>2x+1")]) expect(await still(l)).toEqual([0, "0s"]); }
  for (const c of await page.locator('[data-calculator="v2"]').all()) { await c.hover(); expect(await still(c)).toEqual([0, "0s"]); }
});
```

- [ ] **Step 3: Run them and see them fail** — `npm run test:calculator -- --project=calculator-chrome --project=calculator-ios --project=calculator-android tests/calculator/v2/transfer.spec.ts -g "TR-43|TR-46|TR-47|TR-48|TR-49|TR-51|TR-52"`; Expected: FAIL:
  - The glyph measures 32 × 16 (two inline svgs).
  - The button sits at the anchor's origin, so `b.top < last.top` fails.
  - Choice controls stay at opacity 0 on hover.
  - There is no focus ring, and Escape hides nothing.
  - The tooltip is not beside the control.
  - The diagnostic cluster has a 150 ms opacity transition.
- [ ] **Step 4: Implement**
  - `TransferControl.tsx`:
    - Placement: a layout effect calls `placeControl(anchor, item, button, placement, reveal === "coarse" ? COARSE_TARGET_PX : FINE_TARGET_PX)` whenever an inline or block control becomes visible or its reveal changes. While visible, a `ResizeObserver` on the item calls it again.
    - Tooltip position: absolute in the anchor, vertically centred on the button with no gap. It sits right of the button, or left when its right edge would pass `innerWidth - 8`.
    - Cluster hover: native `pointerenter` and `pointerleave` (hover pointers) on the choice container write `anchor.dataset.hover` and `hoverPointerType`; a `pointerenter` after a `pointerleave` from the container deletes `data-escaped`.
    - Escape: while the control is revealed by hover or tap, or its tooltip shows, a `document` bubble-phase `keydown` listener handles Escape (a cluster is skipped when `matchMedia("(any-pointer: coarse)").matches`). The listener:
      - hides the tooltip;
      - unless the control has focus, sets `escaped` (for a cluster, `data-escaped="true"`), sets the `leftItemSinceEscape` ref to `false` and writes `data-visible="false"`;
      - calls `transferSelection.clear()` when selected;
      - calls `preventDefault()` and `stopPropagation()` only when it hid something.
    - While `escaped`, inline and block controls keep `data-visible="false"` whatever `overItem` and `overControl` say. `escaped` clears in exactly two cases: a `pointerenter` on the item while `leftItemSinceEscape` is `true` (the item's own `pointerleave` sets it, but only one that fires after the Escape), or a tap on the item. Pointer events on the anchor or the button never clear it, including the `pointerleave` that clipping the button causes under a still pointer.
  - `TransferControl.module.css` (every selector keeps a local class):
    - Button: `.button` gets `min-width/min-height: 24px`, `border-radius: 6px`, `padding: 0` and centred content. `.anchor[data-reveal="coarse"] .button` and `.anchor[data-placement="cluster"] .button` get `min-width/min-height: 44px`.
    - Glyph: `.glyph { position: relative; display: block; width: 16px; height: 16px }`. The first svg fills it; the second is `width: 55%; height: 55%; position: absolute; right: -3px; top: -3px`. `.anchor[data-reveal="coarse"] .glyph { width: 20px; height: 20px }`.
    - Focus: `.button:focus-visible { outline: 2px solid var(--kcc-focus); outline-offset: 2px }`.
    - Clusters: `.anchor[data-placement="cluster"][data-hover="true"]:not([data-escaped="true"]), :global([data-calculator="v2"]):focus-within > .anchor[data-placement="cluster"] { opacity: 1 }` (each selector holds `.anchor`).
    - No motion: `.anchor, .button, .tooltip { transition: none; animation: none }`.
  - `transfer-control.css` (global; attribute-keyed rules only): `[data-calculator="v2"][data-calculator] { transition: none; }`, and the task 4 `[data-transfer-selected="true"]` rule gains `transition: none; animation: none;`.
- [ ] **Step 5: Run them and see them pass** — the step 3 command; Expected: PASS. Then `npx vitest run src/components/calculator/TransferControl.test.tsx -t "TH-2"` (the local-class rule), `npx tsc --noEmit` and, with the gate environment of `00-index.md` section 1, `npm run cf:build`; Expected: PASS, tsc exit 0, and the build exits 0 (no "is not pure" error).
- [ ] **Step 6: Write the visual test** (TR-43 and TR-46 say "verified by visual test"; the geometry tests above stay as the browser layer). It records note 2's states on the `?flow=diagnostic&calc=v2&questions=transfer` diagnostic in ivory and observatory: fine reveal on calculator-chrome at 1280×800 (inline `y>2x+1` hovered, display `BLOCK_SYSTEM` hovered) and coarse reveal on calculator-ios (inline `y>2x+1` tap-selected). Note 2's fourth state, the choice A cluster at coarse reveal, joins this test in task 9: it needs task 9's coarse rule, and recorded here it would capture the control at opacity 0. Create `tests/calculator/v2/transfer-visual.spec.ts`:

```
import { expect, test, type Locator, type Page } from "@playwright/test";
import { SKIN_COLORS } from "../../../src/lib/calculator-v2/theme/skin-colors.generated";
import { BLOCK_SYSTEM } from "../fixture/v2/transfer-questions";
import { DESKTOP, anchor, box, control, item, open, tapItem } from "./transfer-helpers";
const SKINS = ["ivory", "observatory"] as const;
const PAD = 8; // CSS px of page kept around the item and control in each clip
const setSkin = async (page: Page, skin: (typeof SKINS)[number]) => { await page.evaluate(([s, dark]) => { const r = document.documentElement; r.classList.toggle("dark", dark); r.dataset.theme = s; }, [skin, SKIN_COLORS[skin].normal.dark] as const); }; // as applyTheme does; task 14's applySkin does not exist yet
const glyph = (page: Page, latex: string) => control(page, latex).locator("[data-transfer-glyph]");
async function hoverCorner(l: Locator) { const b = await box(l); await l.hover({ position: { x: 2, y: b.height - 2 } }); } // on the item, clear of the control, so no tooltip
async function shoot(page: Page, name: string, parts: Locator[]) {
  await parts[0].scrollIntoViewIfNeeded(); const bs = await Promise.all(parts.map(box)); const vp = page.viewportSize()!;
  const x = Math.max(0, Math.min(...bs.map((b) => b.x)) - PAD); const y = Math.max(0, Math.min(...bs.map((b) => b.y)) - PAD);
  const right = Math.min(vp.width, Math.max(...bs.map((b) => b.x + b.width)) + PAD); const bottom = Math.min(vp.height, Math.max(...bs.map((b) => b.y + b.height)) + PAD);
  await expect(page).toHaveScreenshot(`tr-43-46-${name}`, { clip: { x, y, width: right - x, height: bottom - y } });
}
test("TR-43, TR-46 the revealed Transfer control matches its baselines at fine and coarse reveal", async ({ page }, info) => {
  const touch = info.project.name === "calculator-ios"; test.skip(!touch && info.project.name !== "calculator-chrome", "one fine (calculator-chrome, 1280×800) and one coarse (calculator-ios) baseline set");
  for (const s of SKINS) {
    await open(page, touch ? page.viewportSize()! : DESKTOP); await setSkin(page, s); await page.evaluate(() => document.fonts.ready.then(() => true));
    if (!touch) {
      for (const [name, latex] of [["inline", "y>2x+1"], ["block", BLOCK_SYSTEM]] as const) {
        await page.mouse.move(5, 790); await hoverCorner(item(page, latex));
        await expect(anchor(page, latex)).toHaveAttribute("data-visible", "true"); await expect(anchor(page, latex)).toHaveAttribute("data-reveal", "fine"); expect((await box(glyph(page, latex))).width).toBe(16);
        await shoot(page, `${name}-fine-${s}.png`, [item(page, latex), control(page, latex)]);
      }
    } else {
      await tapItem(page, "y>2x+1"); await expect(item(page, "y>2x+1")).toHaveAttribute("data-transfer-selected", "true"); await expect(anchor(page, "y>2x+1")).toHaveAttribute("data-reveal", "coarse");
      expect((await box(glyph(page, "y>2x+1"))).width).toBe(20);
      await shoot(page, `inline-coarse-${s}.png`, [item(page, "y>2x+1"), control(page, "y>2x+1")]);
    }
  }
});
```

- [ ] **Step 7: Run it and see it fail** — `npm run test:calculator -- --project=calculator-chrome --project=calculator-ios tests/calculator/v2/transfer-visual.spec.ts`; Expected: FAIL in both projects at the first screenshot: `A snapshot doesn't exist at …/tests/calculator/v2/transfer-visual.spec.ts-snapshots/tr-43-46-inline-fine-ivory-calculator-chrome-darwin.png, writing actual.` and the same for `tr-43-46-inline-coarse-ivory-calculator-ios-darwin.png`. The attribute and glyph checks before them already pass on step 4's code.
- [ ] **Step 8: Record and review the baselines** — the step 7 command with `--update-snapshots`. `ls tests/calculator/v2/transfer-visual.spec.ts-snapshots/` lists exactly six files: `tr-43-46-{inline,block}-fine-{ivory,observatory}-calculator-chrome-darwin.png` and `tr-43-46-inline-coarse-{ivory,observatory}-calculator-ios-darwin.png`. Open each PNG with the Read tool and check:
  - Every image (TR-43): the button shows only a calculator outline with a small arrow pointing up and to the right at its top-right corner, and no text. Observatory images have a dark page and a light glyph; ivory images have a light page and a dark glyph. No tooltip shows.
  - `inline-fine` (TR-46): the button sits above the right end of `y > 2x + 1`, and its lower edge overlaps the top of the math, so no gap shows between them. The math stays on one line.
  - `block-fine` (TR-46): the button sits inside the system's top-right corner, with its top and right edges on the block's.
  - `inline-coarse` (TR-43 coarse size, TR-55 outline): a 2 px outline surrounds `y > 2x + 1` with a 2 px gap. The button is the coarse one (44 px, against the fine 24 px), and it sits on top of the item's end.
  - A wrong image is fixed in step 4's code and then re-recorded. Never accept a wrong image or re-record it as it is.
- [ ] **Step 9: Run it and see it pass** — the step 7 command, twice; Expected: PASS both runs (the baselines are stable). Then `npx tsc --noEmit`; Expected: exit 0.
- [ ] **Step 10: Commit** — `git add src/components/calculator tests/calculator docs/superpowers/specs && git commit -m "Place the Transfer control, its tooltip and outline without motion, dismiss with Escape (OI-2) and record its TR-43 and TR-46 baselines"`
- [ ] **Step 11: Mutation check (baselines).** In `src/components/calculator/TransferControl.module.css` change the second glyph svg's `right: -3px; top: -3px` to `right: 0; top: 0`. Then run `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/transfer-visual.spec.ts`. Expected: FAIL at the `tr-43-46-inline-fine-ivory.png` screenshot with a count of differing pixels. The glyph box, the attributes and the TR-43 geometry test are unchanged, so only the baseline catches the moved arrow. Then `git checkout -- src/components/calculator/TransferControl.module.css` and rerun; Expected: PASS.

### Task 9: Answer-choice clusters in the browser (OI-36)

**Files:**

- Create: `tests/calculator/v2/transfer-touch.spec.ts`; in `tests/calculator/v2/transfer-visual.spec.ts-snapshots/`: `tr-43-46-choice-a-coarse-ivory-calculator-ios-darwin.png`, `tr-43-46-choice-a-coarse-observatory-calculator-ios-darwin.png`
- Modify: `src/components/calculator/transfer-control.css` and `src/components/calculator/TransferControl.module.css` (the coarse rules), `tests/calculator/v2/transfer-helpers.ts`, `tests/calculator/v2/transfer-visual.spec.ts` (note 2's fourth state)
- Ownership (lead edits outside this part file): in `14-transfer-ui.md`, add `; OI-36` to the IDs cell of Tasks-and-IDs row 9, add the header line `**Open items:** OI-21 (Task 4), OI-16 and OI-18 (Task 5), OI-2 (Task 8), OI-36 (Task 9).`, and begin Note 3 with `Numbered OI-36 in 00-index section 6.2.`

**Interfaces:**

- Consumes: task 7 and 8 helpers; task 8's spec-local `shoot` in `transfer-visual.spec.ts`; task 6 clusters.
- Produces: the `(any-pointer: coarse)` rule of AR-11; the helpers below; the two choice A cluster baselines.

- [ ] **Step 0: Check the OI-36 decision.** `grep -cE '^\| OI-36 .*\| (accepted|amended) [0-9]{4}-[0-9]{2}-[0-9]{2}' docs/superpowers/specs/calculator-v2/open-items.md` prints 1; otherwise stop and ask the lead (a rejection re-plans this task's AR-11 case, 00-index section 6.2).
- [ ] **Step 1: Write the failing browser tests.** Append to `transfer-helpers.ts`:

```
export const rows = (page: Page) => page.evaluate(() => globalThis.__calculatorHarness?.engine.getExpressions().map((e) => e.latex ?? "") ?? null);
export const answerState = (page: Page) => page.evaluate(() => ({
  checked: [...document.querySelectorAll<HTMLInputElement>("input[type=radio]")].filter((r) => r.checked).length,
  crossed: document.querySelectorAll('[aria-label^="Restore choice"]').length,
  ready: [...document.querySelectorAll<HTMLButtonElement>("button")].filter((b) => /^(Submit Answer|Check answer|Next Question)/.test(b.textContent!.trim()) && !b.disabled).length,
  skip: [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("Skip this question")) }));
```

`tests/calculator/v2/transfer-touch.spec.ts`:

```
import { expect, test } from "@playwright/test";
import { DESKTOP, answerState, box, choiceContainer, choiceControl, opacity, rows, url } from "./transfer-helpers";
test("TR-42 answer-choice controls sit after cross-out, always visible at the coarse size on touch screens and shown only on hover or focus within the cluster otherwise", async ({ page }, info) => {
  const touch = /ios|android/.test(info.project.name); test.skip(!touch && info.project.name !== "calculator-chrome", "pointer-specific visibility");
  for (const flow of ["practice", "catalog", "daily", "diagnostic"]) {
    if (!touch) await page.setViewportSize(DESKTOP); await page.goto(url(flow)); const clusterAnchors = page.locator('[data-calculator="v2"] > [data-transfer-control]');
    await expect(clusterAnchors.first()).toBeAttached();
    for (const a of await clusterAnchors.all()) {
      if (flow !== "daily") await expect(a.locator("xpath=preceding-sibling::*[1]")).toHaveAttribute("aria-label", /^Cross out choice /);
      if (touch) { await a.scrollIntoViewIfNeeded(); expect(await opacity(a)).toBe("1"); const b = await box(a.locator("button")); expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44);
        expect((await box(a.locator("[data-transfer-glyph]"))).width).toBe(20); await page.keyboard.press("Escape"); expect(await opacity(a)).toBe("1"); }
      else { await page.mouse.move(5, 790); expect(await opacity(a)).toBe("0"); await a.locator("xpath=ancestor::*[@data-calculator='v2']/..").hover(); expect(await opacity(a)).toBe("1");
        await page.mouse.move(5, 790); await a.locator("button").focus(); expect(await opacity(a)).toBe("1"); }
    }
  }
});
test("TR-41 a transfer from an answer choice never selects, changes, crosses out or submits an answer in any mode", async ({ page }, info) => {
  const touch = info.project.name === "calculator-ios"; test.skip(!touch && info.project.name !== "calculator-chrome", "desktop mouse and iPhone touch");
  const expected: Record<string, string[]> = { practice: ["1"], catalog: ["1"], daily: ["y=2x-1"], diagnostic: ["3p+4=19"] };
  for (const flow of ["practice", "catalog", "daily", "diagnostic"]) {
    if (!touch) await page.setViewportSize(DESKTOP); await page.goto(url(flow)); await expect(choiceControl(page, "A")).toBeAttached();
    await expect(page.locator("button [data-transfer-control], label [data-transfer-control], [role=radio] [data-transfer-control]")).toHaveCount(0);
    const before = await answerState(page);
    if (touch) await choiceControl(page, "A").tap(); else { await choiceContainer(page, "A").hover(); await choiceControl(page, "A").click(); }
    await expect.poll(() => rows(page)).toEqual(expected[flow]); await page.getByRole("button", { name: "Close calculator", exact: true }).click();
    expect(await answerState(page), flow).toEqual(before);
  }
});
test("AR-11 at 1024×768 with touch emulation every diagnostic choice control shows without hover and without transitions; the coarse rule never depends on hover", async ({ browser }, info) => {
  test.skip(info.project.name !== "calculator-chrome", "Chromium touch emulation");
  const context = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: { width: 1024, height: 768 }, hasTouch: true }); const page = await context.newPage();
  await page.goto(url()); expect(await page.evaluate(() => matchMedia("(any-pointer: coarse)").matches)).toBe(true);
  const clusterAnchors = page.locator('[data-calculator="v2"] > [data-transfer-control]'); await expect(clusterAnchors).toHaveCount(3);
  for (const a of await clusterAnchors.all()) { expect(await opacity(a)).toBe("1"); expect(await opacity(a.locator(".."))).toBe("1"); expect(await a.locator("..").evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s"); }
  const coarseOnly = await page.evaluate(() => [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules]; } catch { return []; } })
    .filter((r): r is CSSMediaRule => r instanceof CSSMediaRule && /any-pointer:\s*coarse/.test(r.conditionText))
    .some((r) => !/hover|pointer:\s*fine/.test(r.conditionText) && [...r.cssRules].some((x) => x.cssText.includes('data-calculator="v2"') && /opacity:\s*1/.test(x.cssText))));
  expect(coarseOnly).toBe(true); await context.close(); // stands in for the both-match profile (decision "AR-11's second browser profile"; note 3; OI-36, Step 0)
});
```

- [ ] **Step 2: Run them and see them fail** — `npm run test:calculator -- --project=calculator-chrome --project=calculator-ios --project=calculator-android tests/calculator/v2/transfer-touch.spec.ts -g "TR-42|TR-41|AR-11"`; Expected: FAIL on TR-42 and AR-11 (touch controls stay at opacity 0; no coarse rule); TR-41 passes already (task 6 built it; step 10 shows it can fail).
- [ ] **Step 3: Implement** the coarse rules, with no `hover` or `pointer` condition:
  - `transfer-control.css`: `@media (any-pointer: coarse) { [data-calculator="v2"][data-calculator] { opacity: 1; } }`.
  - `TransferControl.module.css`: `@media (any-pointer: coarse) { .anchor[data-placement="cluster"][data-placement] { opacity: 1 } .anchor[data-placement="cluster"] .glyph { width: 20px; height: 20px } }`.
- [ ] **Step 4: Run them and see them pass** — the step 2 command; Expected: PASS. Then `npx vitest run src/components/calculator/TransferControl.test.tsx -t "TH-2"`, `npx tsc --noEmit` and, with the gate environment, `npm run cf:build`; Expected: PASS, tsc exit 0, build exit 0.
- [ ] **Step 5: Add the coarse cluster to the TR-43, TR-46 visual test** (note 2's fourth state, which needs step 3's rule). In `transfer-visual.spec.ts`, extend the helper import with `choiceAnchor, choiceContainer, choiceControl, opacity`. Then append inside the test's coarse (`else`) branch, after the `inline-coarse` shot:

```
await expect.poll(() => opacity(choiceAnchor(page, "A"))).toBe("1"); expect((await box(choiceControl(page, "A").locator("[data-transfer-glyph]"))).width).toBe(20);
await shoot(page, `choice-a-coarse-${s}.png`, [choiceContainer(page, "A")]);
```

- [ ] **Step 6: Run it and see it fail** — `npm run test:calculator -- --project=calculator-ios tests/calculator/v2/transfer-visual.spec.ts`; Expected: FAIL with `A snapshot doesn't exist at …/tests/calculator/v2/transfer-visual.spec.ts-snapshots/tr-43-46-choice-a-coarse-ivory-calculator-ios-darwin.png, writing actual.` Task 8's `inline-coarse` baselines still match.
- [ ] **Step 7: Record and review the baselines** — the step 6 command with `--update-snapshots`. `git status --short tests/calculator/v2/transfer-visual.spec.ts-snapshots` shows exactly two new files, `tr-43-46-choice-a-coarse-{ivory,observatory}-calculator-ios-darwin.png`, and task 8's six unchanged. Open both with the Read tool and check:
  - The control sits after the cross-out button in choice A's tool cluster and shows without hover.
  - It is the coarse control: the calculator-and-arrow glyph at 20 px on the 44 px button, with no text.
  - The choice text is not covered (the `pr-40` padding).
  - Observatory is dark and ivory light, as in task 8.
  - A wrong image is fixed in step 3's rules and then re-recorded. Never accept a wrong image or re-record it as it is.
- [ ] **Step 8: Run it and see it pass** — the step 6 command, twice, then `npx tsc --noEmit`; Expected: PASS both runs, tsc exit 0.
- [ ] **Step 9: Commit** — `git add src/components/calculator tests/calculator && git commit -m "Keep answer-choice Transfer controls visible on coarse pointers and record the coarse cluster baseline"`
- [ ] **Step 10: Mutation check (TR-41).** Append `[data-calculator="v2"] > [data-transfer-control] { pointer-events: none; }` to `src/components/calculator/transfer-control.css`, run `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/transfer-touch.spec.ts -g "TR-41"`; Expected: FAIL in practice, `locator.click: Timeout` with the answer choice `<button>` named as intercepting pointer events (the click would reach the answer). Then `git checkout -- src/components/calculator/transfer-control.css` and rerun; Expected: PASS.

### Task 10: Touch selection flow

**Files:**

- Modify: `src/components/calculator/TransferControl.tsx` (outside-tap clearing), `tests/calculator/v2/transfer-helpers.ts`, `tests/calculator/v2/transfer-touch.spec.ts`

**Interfaces:**

- Consumes: `isTap`, `transferSelection` (task 2); task 8's `tapItem`.
- Produces: while an inline or block item is selected, capture-phase `pointerdown`, `pointermove`, `pointercancel` and `pointerup` listeners on `document` track one contact as task 4 does (largest movement, cancel ends it) and clear the selection on a tap (`isTap`) whose target is outside both the item and the anchor.

- [ ] **Step 1: Write the failing browser tests.** Append to `transfer-helpers.ts`:

```
export const touchOnly = (name: string) => test.skip(!/ios|android/.test(name), "touch projects only");
export const frame = (page: Page) => page.locator("[data-calculator-window]");
export const selected = (page: Page) => page.locator('[data-transfer-selected="true"]');
export async function touchGesture(page: Page, target: Locator, o: { holdMs?: number; dx?: number; back?: boolean }) {
  const b = await box(target); const x = b.x + b.width / 2; const y = b.y + b.height / 2; const init = { pointerType: "touch", isPrimary: true, clientY: y, bubbles: true };
  await target.dispatchEvent("pointerdown", { ...init, clientX: x }); if (o.dx) await target.dispatchEvent("pointermove", { ...init, clientX: x + o.dx });
  if (o.holdMs) await page.waitForTimeout(o.holdMs); await target.dispatchEvent("pointerup", { ...init, clientX: o.back ? x : x + (o.dx ?? 0) });
}
```

Append to `transfer-touch.spec.ts`, adding `import { BLOCK_SYSTEM } from "../fixture/v2/transfer-questions";` and the helpers `anchor, control, frame, item, outline, press, selected, tapItem, touchGesture, touchOnly`:

```
test("TR-55 a tap selects one stem item with a 2 px solid outline offset 2 px and a 44 px control on top of it; answer choices are never tap-selected", async ({ page }, info) => {
  touchOnly(info.project.name); await page.goto(url()); await tapItem(page, "y>2x+1"); const it = item(page, "y>2x+1");
  await expect(it).toHaveAttribute("data-transfer-selected", "true"); expect(await outline(it)).toEqual(["solid", "2px", "2px"]);
  const c = await box(control(page, "y>2x+1")); expect(Math.min(c.width, c.height)).toBeGreaterThanOrEqual(44);
  expect(await control(page, "y>2x+1").evaluate((el) => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
  await tapItem(page, BLOCK_SYSTEM); await expect(selected(page)).toHaveCount(1); await expect(item(page, BLOCK_SYSTEM)).toHaveAttribute("data-transfer-selected", "true");
  await page.goto(url("practice")); await page.locator(".group > button").first().tap();
  await expect(selected(page)).toHaveCount(0); await expect(page.getByRole("button", { name: "Submit Answer" })).toBeVisible();
});
test("TR-56 tapping the control transfers the selected item at once and tapping the selected item again deselects it", async ({ page }, info) => {
  touchOnly(info.project.name); await page.goto(url());
  await tapItem(page, "y>2x+1"); await tapItem(page, "y>2x+1"); await expect(selected(page)).toHaveCount(0); await expect(anchor(page, "y>2x+1")).toHaveAttribute("data-visible", "false");
  await tapItem(page, "y>2x+1"); await control(page, "y>2x+1").tap();
  await expect(frame(page)).toHaveAttribute("data-mode", "fullscreen"); await expect.poll(() => rows(page)).toEqual(["y>2x+1"]); await expect(page.getByRole("menu")).toHaveCount(0);
});
test("TR-57 selection clears on an outside tap, Escape, opening the calculator, a transfer and a question change, never times out and moves with the item when scrolled", async ({ page }, info) => {
  touchOnly(info.project.name); await page.goto(url());
  await tapItem(page, "y>2x+1"); await page.waitForTimeout(2500); await expect(selected(page)).toHaveCount(1);
  const before = [await box(item(page, "y>2x+1")), await box(control(page, "y>2x+1"))]; const y0 = await page.evaluate(() => scrollY);
  await page.evaluate(() => window.scrollBy(0, 120)); expect(await page.evaluate(() => scrollY)).toBeGreaterThan(y0); await expect(selected(page)).toHaveCount(1);
  const after = [await box(item(page, "y>2x+1")), await box(control(page, "y>2x+1"))];
  expect(after[1].y - after[0].y).toBeCloseTo(before[1].y - before[0].y, 0); expect(after[1].x - after[0].x).toBeCloseTo(before[1].x - before[0].x, 0);
  await page.locator("h2").first().scrollIntoViewIfNeeded(); const h2 = await box(page.locator("h2").first()); await page.touchscreen.tap(h2.x + 3, h2.y + 3); await expect(selected(page)).toHaveCount(0);
  await tapItem(page, "y>2x+1"); await page.keyboard.press("Escape"); await expect(selected(page)).toHaveCount(0);
  await tapItem(page, "y>2x+1"); await press(page, "Open Karman calculator"); await expect(selected(page)).toHaveCount(0); await page.getByRole("button", { name: "Close calculator", exact: true }).tap();
  await tapItem(page, "y>2x+1"); await control(page, "y>2x+1").tap(); await expect(selected(page)).toHaveCount(0); await page.getByRole("button", { name: "Close calculator", exact: true }).tap();
  await tapItem(page, "y>2x+1"); await press(page, "Skip this question"); await expect(page.getByText("The function", { exact: false })).toBeVisible(); await expect(selected(page)).toHaveCount(0);
});
test("TR-58 a long press, a drag (even one that returns to its start) or a gesture ending with selected text never selects an item, and the native selection survives", async ({ page }, info) => {
  touchOnly(info.project.name); await page.goto(url()); const it = item(page, "y>2x+1"); await it.scrollIntoViewIfNeeded();
  await touchGesture(page, it, { holdMs: 600 }); await expect(selected(page)).toHaveCount(0);
  await touchGesture(page, it, { dx: 30 }); await expect(selected(page)).toHaveCount(0);
  await touchGesture(page, it, { dx: 30, back: true }); await expect(selected(page)).toHaveCount(0);
  await page.evaluate(() => getSelection()!.selectAllChildren(document.querySelector("h2")!)); await touchGesture(page, it, {}); await expect(selected(page)).toHaveCount(0);
  expect(await page.evaluate(() => getSelection()!.toString().length)).toBeGreaterThan(0);
  await page.evaluate(() => getSelection()!.removeAllRanges()); await touchGesture(page, it, {}); await expect(selected(page)).toHaveCount(1);
});
```

- [ ] **Step 2: Run them and see them fail** — `npm run test:calculator -- --project=calculator-ios --project=calculator-android tests/calculator/v2/transfer-touch.spec.ts -g "TR-55|TR-56|TR-57|TR-58"`; Expected: FAIL on TR-57 (an outside tap leaves the item selected). TR-55, TR-56 and TR-58 pass already on tasks 4 and 8; step 6 shows each can fail.
- [ ] **Step 3: Implement** the produced outside-tap clearing in `TransferControl.tsx`; the listeners are added in an effect while `selected` and removed when it ends.
- [ ] **Step 4: Run them and see them pass** — the step 2 command, then `npx tsc --noEmit`; Expected: PASS, tsc exit 0.
- [ ] **Step 5: Commit** — `git add src/components/calculator tests/calculator && git commit -m "Clear a tap-selected transfer item on an outside tap"`
- [ ] **Step 6: Mutation checks** (command for each: `npm run test:calculator -- --project=calculator-ios tests/calculator/v2/transfer-touch.spec.ts -g "<ID>"`; after each, `git checkout -- <file>` and rerun to PASS):
  - TR-55: in `src/components/calculator/transfer-control.css` change the `[data-transfer-selected="true"]` outline to `1px solid`; Expected: FAIL at `outline(it)`, received `["solid", "1px", "2px"]`.
  - TR-56: in `src/components/calculator/transfer-selection.ts` make `toggle` re-select an equal selection instead of clearing it; Expected: FAIL at the first `expect(selected(page)).toHaveCount(0)`.
  - TR-58: in `src/components/calculator/TransferControl.tsx` pass `0` instead of the tracked `maxMove` to the item's `isTap` call; Expected: FAIL at the `{ dx: 30, back: true }` gesture's `toHaveCount(0)` (received 1).
