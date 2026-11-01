import { expect, test } from "@playwright/test";
import { openShell } from "./shell-helpers";

// The quiz calculator's layout (founder, 2026-11-01): graph on top with the rows under it at every
// width by default; Graph Settings switch it to side by side, at once, and the device remembers.
// The /calculator page is always side by side (unit test: CalculatorLayout.test.tsx).

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1280, height: 800 } });

const layout = (page: import("@playwright/test").Page) =>
  page.locator("#calc [data-kc-layout]").getAttribute("data-kc-layout");

test("the quiz calculator opens graph on top on a wide screen, and Side by Side in Graph Settings switches and is remembered", async ({
  page,
}) => {
  await openShell(page);
  expect(await layout(page)).toBe("stacked");
  const graph = await page.locator("#calc .kc-graph-region").boundingBox();
  const list = await page.locator("#calc .kc-list-region").boundingBox();
  expect(graph!.y + graph!.height).toBeLessThanOrEqual(list!.y + 1); // the graph sits above the rows

  await page.getByRole("button", { name: "Graph settings" }).click();
  const group = page.getByRole("radiogroup", { name: "Layout" });
  await expect(group.getByRole("radio", { name: "Graph on Top" })).toBeChecked();
  await group.getByRole("radio", { name: "Side by Side" }).click();
  await expect.poll(() => layout(page)).toBe("desktop");

  await page.reload();
  await page.locator("#calc [data-kc-layout]").waitFor({ state: "attached" });
  expect(await layout(page)).toBe("desktop");
  expect(await page.evaluate(() => localStorage.getItem("karman.calculator.layout"))).toBe(
    "side-by-side"
  );
});
