import { test, expect } from "@playwright/test";
import { SITE_THEMES } from "../../src/lib/themes/palettes";
for (const flow of ["practice", "diagnostic"])
  test(`${flow}: standalone regression, sliders, implicit graph and reset`, async ({
    page,
    isMobile,
  }) => {
    const errors: string[] = [];
    const forbidden: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (/desmos.*(?:api|calculator|\.js)/i.test(r.url())) forbidden.push(r.url());
    });
    await page.goto(`/?flow=${flow}`);
    await page
      .getByRole("button", {
        name: isMobile ? "Open Karman calculator" : "Toggle Karman calculator",
        exact: true,
      })
      .click();
    await expect(page.locator('[data-calculator-engine="standalone"]')).toBeVisible();
    const row = page.getByRole("textbox", { name: "Expression 1", exact: true });
    await expect(row).toBeVisible();
    await expect(page.locator("#karman-virtual-keypad")).toHaveAttribute("aria-hidden", "true");
    await row.fill("a12=2");
    await expect(row).toHaveValue("a₁₂=2");
    await expect(page.getByRole("slider", { name: "Slider a₁₂", exact: true })).toBeVisible();
    await page.getByRole("slider", { name: "Slider a₁₂", exact: true }).fill("4");
    await expect(row).toHaveValue("a₁₂=4");
    await row.fill("x^2+y^2=25");
    await expect(page.locator("#karman-graph-canvas")).toHaveAttribute("aria-label", /1 plots/);
    expect(
      await page.evaluate(() => {
        const e = window.KarmanEngineInstance as unknown as {
          rows: { plot: { fn: (x: number, y: number) => number } }[];
        };
        return e.rows[0].plot.fn(3, 4);
      })
    ).toBe(0);
    await page.getByRole("button", { name: "Add table", exact: true }).click();
    for (const [index, x, y] of [
      [1, "0", "1"],
      [2, "1", "3"],
    ]) {
      await page.getByRole("textbox", { name: `x1 row ${index}`, exact: true }).fill(String(x));
      await page.getByRole("textbox", { name: `y1 row ${index}`, exact: true }).fill(String(y));
    }
    await page.getByRole("button", { name: "Add data row", exact: true }).click();
    await page.getByRole("textbox", { name: "x1 row 3", exact: true }).fill("2");
    await page.getByRole("textbox", { name: "y1 row 3", exact: true }).fill("5");
    await page.getByRole("button", { name: "Add regression", exact: true }).click();
    await expect(page.locator(".fit-metrics")).toContainText("R² = 1");
    await expect(page.locator(".fit-metrics")).toContainText("r = 1");
    await page.getByRole("slider", { name: "Slider m", exact: true }).fill("0");
    await expect(page.locator(".fit-metrics")).toContainText("Adjusted model");
    await page.evaluate(() =>
      window.KarmanEngineInstance!.setExpressions([
        { id: "additional-work", type: "expression", latex: "z12=3" },
      ])
    );
    await expect(page.locator(".fit-metrics")).toContainText("Adjusted model");
    await expect(page.getByRole("slider", { name: "Slider m", exact: true })).toHaveValue("0");
    await page.getByRole("button", { name: "Refit data", exact: true }).click();
    await expect(page.locator(".fit-metrics")).toContainText("Regression fit");
    await page.getByRole("button", { name: "Fixture theme" }).click();
    await expect(page.locator("#karman-calculator")).toHaveClass(/karman-theme-light/);
    const background = () =>
      page.locator("#karman-graph-canvas").evaluate((el) => {
        const canvas = el as HTMLCanvasElement;
        return [...canvas.getContext("2d")!.getImageData(13, 17, 1, 1).data];
      });
    const before = await background();
    await page.locator('[data-calculator-engine="standalone"]').evaluate((el) => {
      (el as HTMLElement).style.setProperty("--background", "#a4c6bd");
    });
    await expect.poll(background).not.toEqual(before);
    await page.getByRole("button", { name: "Show calculator keypad", exact: true }).click();
    await expect(page.locator("#karman-virtual-keypad")).toHaveAttribute("aria-hidden", "false");
    await expect(
      page.getByRole("button", { name: "Recenter graph", exact: true })
    ).toBeInViewport();
    await page.getByRole("button", { name: "Close calculator", exact: true }).click();
    if (flow === "diagnostic")
      await page.getByRole("button", { name: "Skip this question" }).click();
    else await page.getByRole("button", { name: "Fixture retake" }).click();
    await page
      .getByRole("button", {
        name: isMobile ? "Open Karman calculator" : "Toggle Karman calculator",
        exact: true,
      })
      .click();
    await expect(row).toHaveValue("");
    await expect(page.locator(".data-table")).toHaveCount(0);
    await expect(page.getByRole("slider")).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(forbidden).toEqual([]);
  });
test("every site theme keeps a lightly tinted/dark canvas and contrasting lines", async ({
  page,
}) => {
  await page.goto("/karman-calculator/index.html");
  await expect(page.getByRole("textbox", { name: "Expression 1", exact: true })).toBeVisible();
  for (const theme of SITE_THEMES) {
    const result = await page.evaluate((theme) => {
      const e = window.KarmanEngineInstance as unknown as {
        root: HTMLElement;
        setTheme: (mode: string) => void;
        resolvedColor: (name: string) => string;
      };
      e.root.style.setProperty("--background", theme.canvas);
      e.root.style.setProperty("--text-primary", theme.text);
      e.setTheme(theme.dark ? "dark" : "light");
      const canvas = document.createElement("canvas"),
        ctx = canvas.getContext("2d")!;
      const luminance = (name: string) => {
        ctx.fillStyle = e.resolvedColor(name);
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data]
          .slice(0, 3)
          .map((v) => {
            const n = v / 255;
            return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      };
      const bg = luminance("primary-bg"),
        contrast = (name: string) => {
          const line = luminance(name);
          return (Math.max(bg, line) + 0.05) / (Math.min(bg, line) + 0.05);
        };
      return {
        bg,
        grid: contrast("grid"),
        lines: [1, 2, 3, 4, 5, 6].map((i) => contrast("plot-" + i)),
        axis: contrast("axis"),
      };
    }, theme);
    expect(result.bg, theme.id).toBeGreaterThanOrEqual(theme.dark ? 0 : 0.85);
    if (theme.dark) expect(result.bg, theme.id).toBeLessThan(0.025);
    expect(result.grid, theme.id).toBeGreaterThanOrEqual(3);
    expect(result.axis, theme.id).toBeGreaterThanOrEqual(7);
    for (const line of result.lines) expect(line, theme.id).toBeGreaterThanOrEqual(4.5);
  }
});
