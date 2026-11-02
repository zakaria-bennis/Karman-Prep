// Held payloads, failures and question keys in the browser.
import { expect, test } from "@playwright/test";
import {
  HOST,
  chromeOnly,
  clickControl,
  failMountOnce,
  frame,
  open,
  press,
  rowItem,
  rows,
  snapshot,
  statusRegion,
  transferByMouse,
  windowStore,
} from "./transfer-helpers";

test("TR-69 pressing Transfer starts the load and the held payload applies once when ready; after a mount failure it applies once after Retry; a load failure is announced", async ({
  page,
  context,
}, info) => {
  chromeOnly(info.project.name);
  let requested = 0;
  page.on("request", (r) => {
    if (HOST.test(r.url())) requested++;
  });
  await page.route(HOST, async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.continue();
  });
  await open(page);
  expect(requested).toBe(0);
  await clickControl(page, "y>2x+1");
  await expect.poll(() => requested).toBe(1);
  await expect(page.getByText("Loading calculator…")).toBeVisible();
  await expect.poll(() => rows(page)).toEqual(["y>2x+1"]);
  await page.waitForTimeout(500);
  expect(await rows(page)).toEqual(["y>2x+1"]);
  const second = await context.newPage();
  await second.addInitScript(failMountOnce);
  await open(second);
  await transferByMouse(second, "y>2x+1");
  await expect(second.getByText("The calculator could not load.", { exact: true })).toBeVisible();
  await expect(statusRegion(second)).toHaveText(
    "Calculator unavailable. Use Retry in the calculator panel."
  );
  await second.getByRole("button", { name: "Retry" }).click();
  await expect.poll(() => rows(second)).toEqual(["y>2x+1"]);
  await second.waitForTimeout(500);
  expect(await rows(second)).toEqual(["y>2x+1"]);
  await expect(statusRegion(second)).toHaveText(/^Added to calculator: .+\.$/);
  const third = await context.newPage();
  await third.route(HOST, (route) => route.abort());
  await open(third);
  await transferByMouse(third, "y>2x+1");
  await expect(statusRegion(third)).toHaveText(
    "Calculator unavailable. Reload the page to use it."
  );
});

test("AR-55 after a failed load a transfer opens the window on the failure panel with focus on its button and announces the table 11.1 message instead of failing silently", async ({
  page,
  context,
}, info) => {
  chromeOnly(info.project.name);
  await page.route(HOST, (route) => route.abort());
  await open(page);
  await page.getByRole("button", { name: "Toggle Karman calculator", exact: true }).click();
  await expect(
    page.getByText("The calculator could not load. Reload the page to try again.")
  ).toBeVisible();
  await page.getByRole("button", { name: "Close calculator", exact: true }).click();
  await transferByMouse(page, "y>2x+1");
  await expect(frame(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload page" })).toBeFocused();
  await expect(statusRegion(page)).toHaveText("Calculator unavailable. Reload the page to use it.");
  const mount = await context.newPage();
  await mount.addInitScript(failMountOnce);
  await open(mount);
  await mount.getByRole("button", { name: "Toggle Karman calculator", exact: true }).click();
  await expect(mount.getByRole("button", { name: "Retry" })).toBeVisible();
  await mount.getByRole("button", { name: "Close calculator", exact: true }).click();
  await transferByMouse(mount, "y>2x+1");
  await expect(frame(mount)).toBeVisible();
  await expect(mount.getByRole("button", { name: "Retry" })).toBeFocused();
  await expect(statusRegion(mount)).toHaveText(
    "Calculator unavailable. Use Retry in the calculator panel."
  );
});

test("TR-70 a question change discards held payloads, and transfers never change the display size", async ({
  page,
}, info) => {
  chromeOnly(info.project.name);
  await page.route(HOST, async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await open(page);
  await clickControl(page, "y>2x+1");
  await press(page, "Skip this question");
  await expect(rowItem(page)).toBeVisible();
  expect(await rows(page)).toEqual([""]);
  await page.waitForTimeout(500);
  expect(await rows(page)).toEqual([""]);
  await transferByMouse(page, "f(x)=x^{2}-3");
  await expect.poll(() => rows(page)).toEqual(["f(x)=x^{2}-3"]); // the transfer itself has landed
  const s = await snapshot(page);
  expect(s?.displaySize).toBe(3);
  // The carried student settings (owner decision, 2026-10-21) are untouched by the transfer:
  // none yet (the first question's calculator never mounted), or the defaults.
  const carried = (await windowStore(page))?.preferences ?? null;
  expect(carried?.displaySize).toBe(carried === null ? undefined : 3);
});
