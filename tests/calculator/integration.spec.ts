import { test, expect, type Page } from "@playwright/test";
const shell = (page: Page) => page.getByRole("dialog", { name: "Karman calculator", exact: true });
async function open(page: Page, mobile: boolean) {
  await page
    .getByRole("button", {
      name: mobile ? "Open Karman calculator" : "Toggle Karman calculator",
      exact: true,
    })
    .click();
  await expect(page.getByRole("button", { name: "Graph settings", exact: true })).toBeVisible();
}
async function transfer(page: Page, text: string, html = "") {
  await shell(page).evaluate(
    (el, data) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/plain", data.text);
      if (data.html) clipboardData.setData("text/html", data.html);
      el.dispatchEvent(
        new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData })
      );
    },
    { text, html }
  );
}
async function next(page: Page, flow: string) {
  if (flow === "diagnostic") await page.getByRole("button", { name: "Skip this question" }).click();
  else {
    await page.getByRole("button", { name: /^B(?:\s|$)/ }).click();
    await page.getByRole("button", { name: /Submit Answer/ }).click();
    await page.getByRole("button", { name: "Next", exact: true }).last().click();
  }
}
for (const flow of ["practice", "diagnostic"]) {
  test(`${flow}: source paste, themes, keypad, local-only loading and question reset`, async ({
    page,
    isMobile,
  }, info) => {
    const external: string[] = [],
      errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
        external.push(url.hostname);
        return route.abort();
      }
      return route.continue();
    });
    await page.goto(`/?flow=${flow}`);
    await page
      .getByRole("button", { name: "Paste \\sin(30) into calculator", exact: true })
      .click();
    await expect(page.getByLabel("Result 1", { exact: true })).toHaveText("0.5");
    await expect(page.getByRole("textbox", { name: "Expression 1", exact: true })).toHaveValue(
      "sin(30)"
    );
    await expect(page.getByRole("region", { name: "Calculator keypad" })).toHaveCount(0);
    await page.getByRole("button", { name: "Show calculator keypad" }).click();
    await expect(page.getByRole("button", { name: "7", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Hide calculator keypad" }).click();
    for (const theme of ["light", "dark"]) {
      await page.getByRole("button", { name: "Fixture theme", exact: true }).click();
      await expect(shell(page)).toHaveAttribute("data-theme", theme);
      await expect(page.getByLabel("Result 1", { exact: true })).toHaveText("0.5");
      await info.attach(`${flow}-${theme}`, {
        body: await shell(page).screenshot(),
        contentType: "image/png",
      });
    }
    await page.getByRole("button", { name: "Close calculator", exact: true }).click();
    await open(page, isMobile);
    await expect(page.getByLabel("Result 1", { exact: true })).toHaveText("0.5");
    await page.getByRole("button", { name: "Close calculator", exact: true }).click();
    await next(page, flow);
    await open(page, isMobile);
    await expect(page.getByRole("textbox", { name: "Expression 1", exact: true })).toHaveValue("");
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  });
  test(`${flow}: math tools absent in reading`, async ({ page }) => {
    await page.goto(`/?flow=${flow}&subject=reading`);
    await expect(
      page.getByRole("button", { name: /Karman calculator|into calculator/ })
    ).toHaveCount(0);
  });
}
test("keyboard editing, undo, tables, regressions, angles, scientific mode and import rejection", async ({
  page,
  isMobile,
}) => {
  await page.goto("/?flow=diagnostic");
  await open(page, isMobile);
  const field = page.getByRole("textbox", { name: "Expression 1", exact: true });
  await field.fill("2+3*4");
  await expect(page.getByLabel("Result 1", { exact: true })).toHaveText("14");
  await field.press("Enter");
  await page.getByRole("textbox", { name: "Expression 2", exact: true }).fill("x^2=4");
  await expect(page.locator("#karman-graph-canvas")).toHaveAttribute("aria-label", /1 plots/);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Expression 2", exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await transfer(page, "x,y\n1,3\n2,5\n3,7\n4,9");
  await page.getByRole("combobox", { name: "Regression model 1" }).selectOption("m*x+b");
  await page.getByRole("button", { name: "Add regression", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Slider m", exact: true })).toBeVisible();
  await expect(page.getByLabel("Regression results")).toContainText("R² = 1");
  await transfer(page, "sin(30)");
  await expect(page.getByLabel("Result 5", { exact: true })).toHaveText("0.5");
  await page.getByRole("button", { name: "Graph settings", exact: true }).click();
  await expect(page.getByRole("button", { name: "DEG", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.getByRole("button", { name: "RAD", exact: true }).click();
  await expect(page.getByLabel("Result 5", { exact: true })).toHaveText("-0.9880316241");
  await page.getByRole("checkbox", { name: "Complex mode", exact: true }).check();
  await page.locator("#grid-mode").selectOption("radial");
  await page.getByRole("button", { name: "Close graph settings" }).click();
  await transfer(page, "sqrt(-1)");
  await expect(page.getByLabel("Result 6", { exact: true })).toHaveText("i");
  await transfer(page, "y=x", "<svg></svg>");
  await expect(page.getByRole("alert")).toContainText(
    "Figures and saved graphs cannot be imported"
  );
  await page
    .getByRole("combobox", { name: "Calculator mode", exact: true })
    .selectOption("scientific");
  const scientific = page.getByRole("application", { name: "Karman scientific calculator" });
  await scientific.getByRole("textbox", { name: "Expression 1", exact: true }).fill("2^5");
  await expect(scientific.getByLabel("Result 1", { exact: true })).toHaveText("32");
  await page
    .getByRole("combobox", { name: "Calculator mode", exact: true })
    .selectOption("graphing");
  await expect(page.getByLabel("Regression results")).toContainText("R² = 1");
});
