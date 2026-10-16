import { test, expect } from "@playwright/test";
test("graph controls, slider, draggable point, responsive layout and keyboard isolation", async ({
  page,
  isMobile,
}, info) => {
  await page.goto("/?flow=diagnostic");
  await page
    .getByRole("button", {
      name: isMobile ? "Open Karman calculator" : "Toggle Karman calculator",
      exact: true,
    })
    .click();
  const row = page.getByRole("textbox", { name: "Expression 1", exact: true });
  await row.fill("a=2");
  await expect(page.getByRole("slider", { name: "Slider a" })).toBeVisible();
  await page.getByRole("slider", { name: "Slider a" }).fill("4");
  await expect(row).toHaveValue("a=4");
  await row.press("Enter");
  await page.getByRole("textbox", { name: "Expression 2", exact: true }).fill("y=a*x^2");
  await page.getByRole("button", { name: "Add expression", exact: true }).click();
  await page.getByRole("textbox", { name: "Expression 3", exact: true }).fill("(2,3)");
  const graph = page.getByRole("img", { name: /^Graph\./ });
  await expect(graph).toHaveAttribute("aria-label", /2 plots/);
  const label = await graph.getAttribute("aria-label");
  await graph.focus();
  await graph.press("+");
  await expect(graph).not.toHaveAttribute("aria-label", label!);
  await graph.press("Home");
  await expect(graph).toHaveAttribute("aria-label", label!);
  if (!isMobile) {
    const box = (await graph.boundingBox())!;
    const point = { x: box.x + box.width * 0.6, y: box.y + box.height / 2 - (3 * box.width) / 20 };
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + box.width / 20, point.y - box.width / 20, { steps: 4 });
    await page.mouse.up();
    await expect(page.getByRole("textbox", { name: "Expression 3", exact: true })).not.toHaveValue(
      "(2,3)"
    );
  }
  await page.getByRole("button", { name: "Hide expression list" }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole("button", { name: "Show expression list" }).click();
  await expect(row).toHaveValue("a=4");
  const dialog = page.getByRole("dialog", { name: "Karman calculator", exact: true });
  const sizes = isMobile
    ? [
        { width: 390, height: 844 },
        { width: 844, height: 390 },
      ]
    : [{ width: 1280, height: 900 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expect(
      page.getByRole("button", { name: "Close calculator", exact: true })
    ).toBeInViewport();
    await page.getByRole("button", { name: "Show calculator keypad" }).click();
    await expect(page.getByRole("button", { name: "7", exact: true })).toBeInViewport();
    await expect(
      page.getByRole("button", { name: "Default viewport", exact: true })
    ).toBeInViewport({ ratio: 1 });
    await info.attach(`layout-${size.width}`, {
      body: await dialog.screenshot(),
      contentType: "image/png",
    });
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.getByRole("button", { name: "Hide calculator keypad" }).click();
  }
  if (!isMobile) {
    await page.getByRole("button", { name: "Maximize calculator" }).click();
    expect(Math.round((await dialog.boundingBox())!.width)).toBe(1280);
    await page.getByRole("button", { name: "Restore calculator size" }).click();
  }
  await page.getByRole("button", { name: "Clear all expressions" }).click();
  await page.getByRole("button", { name: "Show calculator keypad" }).click();
  for (const name of ["7", "+", "2"]) {
    await page.getByRole("button", { name, exact: true }).click();
  }
  await expect(page.getByLabel("Result 1", { exact: true })).toHaveText("9");
  await page.getByRole("button", { name: "Backspace", exact: true }).click();
  await page.getByRole("button", { name: "3", exact: true }).click();
  await expect(page.getByLabel("Result 1", { exact: true })).toHaveText("10");
});
