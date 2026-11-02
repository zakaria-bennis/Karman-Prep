// Subscript and superscript typing, keystroke for keystroke as live Desmos types it (T-4, T-6).
// Every expected value below is the latex window.Calc.getExpressions() returned on
// https://www.desmos.com/calculator on 2026-10-22 after the same keys were typed into an empty
// row (black-box observation; Desmos's MathQuill settings were read with REA). The rows run on
// the editor harness /harness/editor.html; the phone-keypad and rendering cases on
// /harness/calculator.html. Founder decision, 2026-10-26 (marked where Desmos differs): `+`, `-`, `*`
// and `/` stay inside an exponent or subscript (only → leaves), `~` leaves as `=`, `<` and `>` do,
// and they leave every exponent or subscript the caret sits directly in (vendored patch 0013).

import { expect, test, type Locator, type Page } from "@playwright/test";
import { openShell, rowField, useConsoleGuard } from "./shell-helpers";

// eslint-disable-next-line react-hooks/rules-of-hooks -- registers Playwright hooks; not a React hook
useConsoleGuard();

type Step = string | { key: string } | { paste: string };

/** Typed text, a pressed key, or plain text pasted into the focused field. */
async function run(page: Page, steps: readonly Step[]): Promise<void> {
  for (const step of steps) {
    if (typeof step === "string") await page.keyboard.type(step);
    else if ("key" in step) await page.keyboard.press(step.key);
    else
      await page.evaluate((text) => {
        let at = document.activeElement;
        while (at?.shadowRoot?.activeElement) at = at.shadowRoot.activeElement;
        const data = new DataTransfer();
        data.setData("text/plain", text);
        at!.dispatchEvent(
          new ClipboardEvent("paste", {
            clipboardData: data,
            bubbles: true,
            cancelable: true,
            composed: true,
          })
        );
      }, step.paste);
  }
}

const label = (steps: readonly Step[]) =>
  steps
    .map((s) => (typeof s === "string" ? s : "key" in s ? `[${s.key}]` : `paste(${s.paste})`))
    .join("");

// Rows joined by " ⏎ " (Down from the last row's math makes a new row, as on Desmos).
const LIVE_DESMOS: readonly (readonly [readonly Step[], string])[] = [
  [["y_12=40"], "y_{12}=40"],
  [["y_{12}=40"], "y_{\\left\\{12\\right\\}}=40"],
  [["a_1b=3"], "a_{1b}=3"],
  [["x_1^2"], "x_{1^{2}}"],
  [["y_1{x>0}"], "y_{1\\left\\{x>0\\right\\}}"],
  [["a_{bc}=1"], "a_{\\left\\{bc\\right\\}}=1"],
  [["x_1+2"], "x_{1+2}"], // founder, 2026-10-26: Desmos differs
  [["x_1=5"], "x_{1}=5"],
  [["x_1-2"], "x_{1-2}"], // founder, 2026-10-26: Desmos differs
  [["x_1<3"], "x_{1}<3"],
  [["(x_1,y_1)"], "\\left(x_{1,y_{\\left(1\\right)}}\\right)"],
  [["x_1~a"], "x_{1}\\sim a"], // founder, 2026-10-26: Desmos differs
  [["a_1", { key: "Backspace" }, { key: "Backspace" }], "a"],
  [["a_1", { key: "Backspace" }, { key: "Backspace" }, "b"], "ab"],
  [["a_1", { key: "Backspace" }, { key: "Backspace" }, { key: "Backspace" }, "c"], "c"],
  [["y_", { key: "Backspace" }, "2"], "y_{2}"],
  [["y_1", { key: "Backspace" }, "2"], "y_{2}"],
  [["a_1", { key: "ArrowRight" }, "b"], "a_{1}b"],
  [["a_", { key: "ArrowRight" }, "b"], "a_{ }b"],
  [["a_1", { key: "ArrowLeft" }, "2"], "a_{21}"],
  [["a_1+b", { key: "Home" }, { key: "ArrowRight" }, { key: "ArrowRight" }, "2"], "a_{1+2b}"], // founder, 2026-10-26: Desmos differs
  [["ab", { key: "ArrowLeft" }, "_1"], "a_{1}b"],
  [["x_1", { key: "ArrowRight" }, "^2"], "x_{1}^{2}"],
  [["x_(1)"], "x_{\\left(1\\right)}"],
  [["x_[1]"], "x_{\\left[1\\right]}"],
  [["x_|1|"], "x_{\\left|1\\right|}"],
  [["x_("], "x_{\\left(\\right)}"],
  [["x_1(2)"], "x_{1\\left(2\\right)}"],
  [["x_1a"], "x_{1a}"],
  [["x_12a"], "x_{12a}"],
  [["a1"], "a_{1}"],
  [["a12"], "a_{12}"],
  [["a1b"], "a_{1}b"],
  [["x2+1"], "x_{2}+1"],
  [["x_alpha"], "x_{alpha}"],
  [["x_theta=1"], "x_{theta}=1"],
  [["x_pi"], "x_{pi}"],
  [["alpha_1"], "\\alpha_{1}"],
  [["theta1"], "\\theta_{1}"],
  [["x^2+1"], "x^{2+1}"], // founder, 2026-10-26: Desmos differs
  [["x^-1"], "x^{-1}"],
  [["x^2_1"], "x^{2_{1}}"],
  [["x^{2}"], "x^{\\left\\{2\\right\\}}"],
  [["2^x_1"], "2^{x_{1}}"],
  [["x^2=4"], "x^{2}=4"],
  [["x_ab"], "x_{ab}"],
  [["v_max=3"], "v_{max}=3"],
  [["x_1*2"], "x_{1\\cdot2}"], // founder, 2026-10-26: Desmos differs
  [["x_1/2"], "x_{\\frac{1}{2}}"],
  [["a_1.5"], "a_{1.5}"],
  [["x_1!"], "x_{1!}"],
  [["x_1'"], "x_{1'}"],
  [["x_n+1"], "x_{n+1}"], // founder, 2026-10-26: Desmos differs
  [["x_1 +1"], "x_{1\\ +1}"], // founder, 2026-10-26: Desmos differs
  [["x_0^2+y_0^2=1"], "x_{0^{2+y_{0^{2}}}}=1"], // founder, 2026-10-26: Desmos differs
  [["x_1^", { key: "Backspace" }, "3"], "x_{13}"],
  [["y_{", { key: "Backspace" }, "1"], "y_{1}"],
  [["y_{}", "=2"], "y_{\\left\\{\\right\\}}=2"],
  [["a_{1}", { key: "ArrowRight" }, "b"], "a_{\\left\\{1\\right\\}}b"],
  [[{ paste: "y_1=17" }], "y_{1}=17"],
  [[{ paste: "y_{1}=17" }], "y_{1}=17"],
  [[{ paste: "y_12=4" }], "y_{1}2=4"],
  [[{ paste: "x_1^2" }], "x_{1}^{2}"],
  [["x_1>3"], "x_{1}>3"],
  [["x_1,"], "x_{1,}"],
  [["x_1:"], "x_{1:}"],
  [["x_1;"], "x_{1;}"],
  [["x_1_2"], "x_{1_{2}}"],
  [["x__1"], "x_{1}"],
  [["x_1^2+1"], "x_{1^{2+1}}"], // founder, 2026-10-26: Desmos differs
  [["x_1^2=1"], "x_{1^{2}}=1"], // founder, 2026-10-26: Desmos differs
  [["y_1=x_1^2"], "y_{1}=x_{1^{2}}"],
  [["x_1)"], "x_{\\left(1\\right)}"],
  [["(1,2)"], "\\left(1,2\\right)"],
  [["(x_1,2)"], "\\left(x_{\\left(1,2\\right)}\\right)"],
  [["x_1<=3"], "x_{1}\\le3"],
  [["x_1>=3"], "x_{1}\\ge3"],
  [["x_1->"], "x_{1\\to}"], // founder, 2026-10-26: Desmos differs
  [["x_1 "], "x_{1\\ }"],
  [["x_1\\"], "x_{1\\backslash}"],
  [["x_1%"], "x_{1\\%\\operatorname{of}}"],
  [["x_1sin"], "x_{1sin}"],
  [["x_1sqrt"], "x_{1sqrt}"],
  [["x_1pi"], "x_{1pi}"],
  [["x_1@"], "x_{1@}"],
  [["x_1#"], "x_{1#}"],
  [["x_1&"], "x_{1\\&}"],
  [["x_1?"], "x_{1?}"],
  [['x_1"'], 'x_{1"}'],
  [["x_1.."], "x_{1..}"],
  [["x_1..."], "x_{1...}"],
  [["x_ab", { key: "Backspace" }, { key: "Backspace" }, { key: "Backspace" }, "c"], "xc"],
  [["x_1", { key: "ArrowUp" }, "2"], "x_{12}"],
  [["x_1", { key: "ArrowDown" }, "2"], "x_{1} ⏎ 2"],
  [["x^2", { key: "ArrowDown" }, "1"], "x_{1}^{2}"],
  [["x_1", { key: "End" }, "2"], "x_{12}"],
  [["x_1", { key: "Delete" }], "x1"],
  [["ab", { key: "ArrowLeft" }, { key: "ArrowLeft" }, { key: "Delete" }], "b"],
  [["x_+"], "x_{+}"],
  [["x_-1"], "x_{-1}"],
  [["x_=1"], "x_{=1}"],
  [["x_*"], "x_{\\cdot}"],
  [["x_,"], "x_{,}"],
  [["y_1", { key: "Shift+ArrowLeft" }, "2"], "y_{2}"],
  [["_1"], "1"],
  [["^2"], "2"],
  [["x_^2"], "x_{2}"],
  [["(^2)"], "\\left(2\\right)"],
  [["x\\"], "x\\backslash"],
  [["a\\b"], "a\\backslash b"],
  [["x_\\"], "x_{\\backslash}"],
  [["x^2*3"], "x^{2\\cdot3}"], // founder, 2026-10-26: Desmos differs
  [["x^2,1"], "x^{2,1}"],
  [["(x^2,1)"], "\\left(x^{\\left(2,1\\right)}\\right)"],
  [["x^2~1"], "x^{2}\\sim1"], // founder, 2026-10-26: Desmos differs
  [["x^2:1"], "x^{2:1}"],
  [["x^_1"], "x^{1}"],
  [["x_1^2", { key: "ArrowRight" }, "+1"], "x_{1^{2}+1}"], // founder, 2026-10-26: Desmos differs
  [["x_1^2", { key: "ArrowRight" }, { key: "ArrowRight" }, "+1"], "x_{1^{2}}+1"],
  [["x_{1}^2"], "x_{\\left\\{1\\right\\}^{2}}"],
  [["x_1", { key: "Backspace" }, { key: "Backspace" }, { key: "Backspace" }], ""],
  [["x_(1)", { key: "Backspace" }, { key: "Backspace" }], "x_{\\left(\\right)}"],
  [["y_1(x)=x^2"], "y_{1\\left(x\\right)}=x^{2}"],
  [["f_1(x)=2x"], "f_{1\\left(x\\right)}=2x"],
  [["x_1[2]"], "x_{1\\left[2\\right]}"],
  [["x_1|"], "x_{1\\left|\\right|}"],
  [["x_1|2|"], "x_{1\\left|2\\right|}"],
  [["x_1{"], "x_{1\\left\\{\\right\\}}"],
  [["alpha"], "\\alpha"],
  [["alpha+1"], "\\alpha+1"],
  [["alpha1"], "\\alpha_{1}"],
  [["beta_1"], "\\beta_{1}"],
  [["gamma"], "gamma"],
  [["Delta"], "Delta"],
  [["rho"], "\\rho"],
  [["varepsilon"], "\\operatorname{var}epsilon"],
  [["x_beta+1"], "x_{beta+1}"], // founder, 2026-10-26: Desmos differs
  [["a_lambda"], "a_{lambda}"],
  [["y_1~mx_1", { key: "ArrowRight" }, "+b"], "y_{1}\\sim mx_{1}+b"],
  [["x^2", { key: "ArrowRight" }, "+n=5"], "x^{2}+n=5"],
  [["a_x^2=3"], "a_{x^{2}}=3"],
];

const latexes = (page: Page) =>
  page.evaluate(() =>
    globalThis
      .__calculatorHarness!.engine.getSnapshot()
      .rows.map((r) => r.latex)
      .join(" ⏎ ")
  );

test.describe("typed like live Desmos", () => {
  for (const [steps, desmos] of LIVE_DESMOS)
    test(`${label(steps)} gives ${desmos}`, async ({ page }) => {
      await page.goto(`/harness/editor.html?rows=${encodeURIComponent(JSON.stringify([""]))}`);
      await page.getByRole("textbox", { name: "Expression 1", exact: true }).focus();
      await run(page, steps);
      await expect.poll(() => latexes(page)).toBe(desmos);
    });
});

// The phone keypad's letters page (ABC): Desmos's labels "Toggle Letters", "Superscript" and
// "Right Arrow" are our "ABC", "Power" and "Right arrow".
const KEYPAD_DESMOS: readonly (readonly [readonly string[], string])[] = [
  [["y", "Subscript", "Toggle Numbers", "1", "2"], "y_{12}"],
  [["y", "Subscript", "{"], "y_{\\left\\{\\right\\}}"],
  [["y", "Subscript", "Toggle Numbers", "1", "ABC", "{"], "y_{1\\left\\{\\right\\}}"],
  [["Subscript", "Toggle Numbers", "1"], "1"],
  [["a", "Subscript", "!"], "a_{!}"],
  [["x", "Subscript", "["], "x_{\\left[\\right]}"],
  [["x", "Subscript", "Toggle Numbers", "1", "Power", "2"], "x_{1^{2}}"],
  [["x", "Subscript", "Toggle Numbers", "1", "Plus", "1"], "x_{1+1}"], // founder, 2026-10-26: Desmos differs
  [["x", "Subscript", "Toggle Numbers", "1", "Right arrow", "Plus", "1"], "x_{1}+1"],
  [["x", "Subscript", "Toggle Numbers", "1", "Left parenthesis", "2"], "x_{1\\left(2\\right)}"],
];

const key = (page: Page, name: string): Locator =>
  page.getByRole("region", { name: "Keypad" }).getByRole("button", { name, exact: true });

test.describe("tapped on the phone keypad like live Desmos", () => {
  for (const [keys, desmos] of KEYPAD_DESMOS)
    test(`${keys.join(" ")} gives ${desmos}`, async ({ page, isMobile }) => {
      test.skip(!isMobile, "the phone keypad");
      await openShell(page);
      await rowField(page, "1").tap();
      await key(page, "ABC").tap();
      for (const name of keys) await key(page, name).tap();
      await expect
        .poll(() =>
          page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().rows[0].latex)
        )
        .toBe(desmos);
    });
});

/** Visible text in the calculator's shadow root outside tooltips (error messages keep 'a_2', as Desmos's do). */
const visibleText = (page: Page) =>
  page.locator("#calc").evaluate((host) => {
    const out: string[] = [];
    const walk = (node: Node) => {
      if (node instanceof Element) {
        if (node.matches("[role=tooltip], textarea, [aria-hidden=true] .mq-selectable")) return;
        if (node instanceof HTMLElement && node.offsetParent === null && node.tagName !== "BODY")
          return;
      }
      if (node.nodeType === Node.TEXT_NODE && node.textContent!.trim() !== "")
        out.push(node.textContent!);
      node.childNodes.forEach(walk);
    };
    host.shadowRoot!.childNodes.forEach(walk);
    return out.join(" ");
  });

test("a subscripted name is typeset everywhere Desmos typesets it: rows, table headers, regression, add-slider buttons and the limits editor", async ({
  page,
}) => {
  await openShell(page, "?w=1100&h=1000");
  await page.evaluate(() =>
    globalThis.__calculatorHarness!.engine.setExpressions([
      {
        id: "t",
        type: "table",
        columns: [
          { latex: "x_{1}", values: ["1", "2", "3", "4"] },
          { latex: "y_{1}", values: ["2", "4.1", "5.9", "8.2"] },
        ],
      },
      { id: "r", type: "expression", latex: "y_{1}\\sim m_{1}x_{1}+b_{1}" },
      { id: "s", type: "expression", latex: "a_{1}=3" },
      { id: "c", type: "expression", latex: "y=a_{2}x+k_{3}" },
    ])
  );
  await page
    .locator('#calc [data-row-id="s"]')
    .getByRole("button", { name: /Edit .* Limits/ })
    .click();
  const relation = page.locator('#calc [data-row-id="s"] .kc-slider-relation');
  await expect(relation.locator("sub")).toHaveText("1");
  await expect(relation).toHaveText("≤a1≤");
  await expect(
    page.locator('#calc [data-row-id="c"]').getByRole("button", { name: "all" })
  ).toBeVisible();
  await expect(
    page.locator("#calc [data-table-regression], #calc [data-regression]").first()
  ).toBeVisible();
  const text = await visibleText(page);
  expect(text).toContain("add slider:");
  expect(text).not.toContain("_");
});
