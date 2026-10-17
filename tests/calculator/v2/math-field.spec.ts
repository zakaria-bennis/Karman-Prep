import { expect, test, type Page } from "@playwright/test";
import CORPUS_KEYS from "../../../src/lib/calculator-v2/core/corpus/cases/keys";
import { CORPUS } from "../../../src/lib/calculator-v2/core/corpus";
import { runnerFor } from "../../../src/lib/calculator-v2/core/corpus/runners";
import { parseLatex, toSExpr } from "../../../src/lib/calculator-v2/core/latex";

async function open(page: Page, query = "") {
  await page.goto(`/v2/math-field.html${query}`);
  await page.locator("body[data-ready=true]").waitFor();
}
const textarea = (page: Page, i = 0) => page.locator("#host textarea").nth(i);
const fieldEl = (page: Page, i = 0) => page.locator("#host .kc-math-field").nth(i);
const latexOf = (page: Page, i = 0) =>
  page.evaluate((n) => window.__mathFieldHarness!.fields[n].latex(), i);
const eventLog = (page: Page, types: string[]) =>
  page.evaluate(
    (t) =>
      window
        .__mathFieldHarness!.events.filter((e) => t.includes(e.type))
        .map((e) => `${e.field}:${e.type}:${e.detail}`),
    types
  );

const pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors.length = 0;
  page.on("pageerror", (e) => pageErrors.push(e.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

test("AR-42 typing, focus, blur and the caret echo work inside the shadow root", async ({
  page,
}) => {
  await open(page);
  await fieldEl(page, 0).click();
  await page.keyboard.type("y=x^2");
  expect(await latexOf(page)).toBe("y=x^{2}");
  expect(
    await page.evaluate(() => {
      const host = document.getElementById("host")!;
      return [
        document.activeElement === host,
        host.shadowRoot!.activeElement === host.shadowRoot!.querySelector("textarea"),
      ];
    })
  ).toEqual([true, true]);
  await page.keyboard.press("ArrowLeft");
  await expect(fieldEl(page, 0).locator(".mq-aria-alert")).not.toHaveText(""); // patch 0003
  await fieldEl(page, 1).click();
  expect(await eventLog(page, ["focus", "blur"])).toEqual([
    "0:focus:null",
    "0:blur:null",
    "1:focus:null",
  ]);
  expect(await eventLog(page, ["edit"])).toContain("0:edit:y=x^{2}");
});
test("AR-42 the adapter methods drive the field", async ({ page }) => {
  await open(page);
  expect(
    await page.evaluate(() => {
      const f = window.__mathFieldHarness!.fields[0];
      const shadow = window.__mathFieldHarness!.shadow;
      const out: (string | null)[] = [];
      f.latex("x+1");
      out.push(f.latex());
      f.write("\\frac{1}{2}");
      out.push(f.latex());
      f.latex("");
      f.cmd("\\sqrt");
      f.typedText("x");
      out.push(f.latex());
      f.keystroke("Right");
      f.typedText("+1");
      out.push(f.latex());
      f.select();
      out.push(f.selectedLatex());
      f.clearSelection();
      out.push(f.selectedLatex());
      f.latex("y=x^{2}+\\frac{3}{4}");
      out.push(f.speechText());
      f.focus();
      out.push(shadow.activeElement?.tagName ?? null);
      f.blur();
      out.push(shadow.activeElement?.tagName ?? null);
      return out;
    })
  ).toEqual([
    "x+1",
    "x+1\\frac{1}{2}",
    "\\sqrt{x}",
    "\\sqrt{x}+1",
    "\\sqrt{x}+1",
    null,
    "y equals x squared plus 3 fourths",
    "TEXTAREA",
    null,
  ]);
});
test("AR-42 keyboard selection, reflow and setInputMode work inside the shadow root", async ({
  page,
}) => {
  await open(page);
  await textarea(page, 0).focus();
  await page.keyboard.type("x+1");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");
  expect(await page.evaluate(() => window.__mathFieldHarness!.fields[0].selectedLatex())).toBe(
    "+1"
  );
  expect(
    await page.evaluate(() => {
      const before = globalThis.__karmanCalculatorCounters?.reflows ?? 0;
      window.__mathFieldHarness!.fields[0].reflow();
      return (globalThis.__karmanCalculatorCounters?.reflows ?? 0) - before;
    })
  ).toBe(1);
  await page.evaluate(() => window.__mathFieldHarness!.fields[0].setInputMode("none"));
  await expect(textarea(page, 0)).toHaveAttribute("inputmode", "none");
  expect(await latexOf(page)).toBe("x+1");
});
test("AR-42 Enter, Up, Down and Backspace or Delete at an edge raise events", async ({ page }) => {
  await open(page);
  await textarea(page, 0).focus();
  await page.keyboard.type("x");
  for (const key of ["Enter", "ArrowUp", "ArrowDown", "Home", "Backspace", "End", "Delete"])
    await page.keyboard.press(key);
  expect(await eventLog(page, ["enter", "arrow-out", "delete-out"])).toEqual([
    "0:enter:null",
    "0:arrow-out:up",
    "0:arrow-out:down",
    "0:delete-out:left",
    "0:delete-out:right",
  ]);
  expect(await latexOf(page)).toBe("x");
});
test("AR-42 native undo, redo, copy, cut and MathQuill paste are disabled in the field", async ({
  page,
}) => {
  await open(page);
  await textarea(page, 0).focus();
  await page.keyboard.type("x");
  for (const chord of ["Control+z", "Meta+z", "Control+Shift+KeyZ", "Meta+Shift+KeyZ", "Control+y"])
    await page.keyboard.press(chord);
  const keydowns = await page.evaluate(() => window.__mathFieldHarness!.keydowns);
  // only the chord keys (the harness skips modifier keydowns; Shift+KeyZ sends key "Z", as a
  // real keyboard does, while Playwright sends Shift+z as key "z")
  expect(keydowns.filter((k) => /^[zZy]:/.test(k))).toEqual([
    "z:true",
    "z:true",
    "Z:true",
    "Z:true",
    "y:true",
  ]);
  expect(
    await page.evaluate(async () => {
      const f = window.__mathFieldHarness!.fields[0];
      const t = window.__mathFieldHarness!.shadow.querySelector("textarea")!;
      const fire = (event: Event) => (t.dispatchEvent(event), event.defaultPrevented);
      const prevented = [
        fire(new Event("paste", { bubbles: true, cancelable: true })),
        fire(
          new InputEvent("beforeinput", {
            inputType: "historyUndo",
            bubbles: true,
            cancelable: true,
          })
        ),
      ];
      f.select();
      prevented.push(fire(new Event("copy", { bubbles: true, cancelable: true })));
      prevented.push(fire(new Event("cut", { bubbles: true, cancelable: true })));
      // MathQuill's cut path would act in a setTimeout; read after it would have run
      await new Promise((resolve) => setTimeout(resolve, 50));
      return [...prevented, f.latex(), f.selectedLatex()];
    })
  ).toEqual([true, true, true, true, "x", "x"]);
});
test("AR-42 a keystroke past maxLength is refused and leaves the field unchanged", async ({
  page,
}) => {
  await open(page, "?fields=1&maxLength=8");
  await textarea(page).focus();
  await page.keyboard.type("x+123456");
  await page.keyboard.type("7");
  expect(await latexOf(page)).toBe("x+123456");
  expect(await eventLog(page, ["refused"])).toEqual(["0:refused:char-limit"]);
});
test("API-15 mounting MathFields defines no window.MathQuill", async ({ page }) => {
  await open(page);
  expect(await page.evaluate(() => "MathQuill" in window)).toBe(false);
});
test("T-11 the hidden textarea has the typing attributes and inputmode follows setInputMode", async ({
  page,
}) => {
  await open(page);
  const attributes = () =>
    textarea(page).evaluate((t) =>
      ["autocapitalize", "autocorrect", "spellcheck", "inputmode"].map((a) => t.getAttribute(a))
    );
  expect(await attributes()).toEqual(["off", "off", "false", "text"]);
  await page.evaluate(() => window.__mathFieldHarness!.fields[0].setInputMode("none"));
  expect(await attributes()).toEqual(["off", "off", "false", "none"]);
  await page.evaluate(() => window.__mathFieldHarness!.fields[0].setInputMode("text"));
  expect(await attributes()).toEqual(["off", "off", "false", "text"]);
});

const RUNNER = "tests/calculator/v2/math-field.spec.ts";
const KEY_NAMES: Record<string, string> = {
  Left: "ArrowLeft",
  Right: "ArrowRight",
  Up: "ArrowUp",
  Down: "ArrowDown",
  Backspace: "Backspace",
  Del: "Delete",
  Home: "Home",
  End: "End",
  "Shift-Left": "Shift+ArrowLeft",
  "Shift-Right": "Shift+ArrowRight",
};
async function typeKeys(page: Page, keys: readonly string[]) {
  for (const key of keys) {
    if (key.length === 1) await page.keyboard.type(key);
    else if (KEY_NAMES[key]) await page.keyboard.press(KEY_NAMES[key]);
    else throw new Error(`unknown key name ${key}`);
  }
}
const keyCases = CORPUS.filter((c) => runnerFor(c, "latex")?.file === RUNNER);

test("PR-36 this runner owns every keys.ts case", () => {
  expect(keyCases).toEqual([...CORPUS_KEYS]);
  expect(keyCases).toHaveLength(56);
});
for (const c of keyCases) {
  const keys = (c.input as { keys: string[] }).keys;
  test(`${c.rules.join(", ")} ${c.id} typing ${keys.join(" ")} gives ${c.latex}`, async ({
    page,
  }) => {
    await open(page, "?fields=1");
    await textarea(page).focus();
    await typeKeys(page, keys);
    const latex = await latexOf(page);
    expect(latex).toBe(c.latex);
    if (c.tree !== undefined) {
      const parsed = parseLatex(latex);
      expect(parsed.ok ? toSExpr(parsed.tree) : parsed.error.code).toBe(c.tree);
    }
  });
}
