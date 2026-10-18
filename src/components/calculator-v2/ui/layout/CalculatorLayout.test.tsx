// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { fireEvent, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { installDomStubs, triggerResize } from "../../__fixtures__/dom-stubs";
import { KarmanCalculator } from "../../KarmanCalculator";
import { EDITOR_MESSAGES } from "../list/messages";

const ID_ATTRIBUTES = [
  "aria-describedby",
  "aria-labelledby",
  "aria-controls",
  "aria-activedescendant",
];

let restoreDom: () => void = () => {};
beforeEach(() => {
  restoreDom = installDomStubs();
});
afterEach(() => {
  restoreDom();
  document.body.replaceChildren();
});

function mount(): HTMLElement {
  return document.body.appendChild(document.createElement("div"));
}
/** The .ts and .tsx files under `dirs`, leaving out test files and every `__fixtures__` path. */
function sourceFiles(dirs: string[]): string[] {
  return dirs
    .flatMap((dir) =>
      readdirSync(dir, { recursive: true, encoding: "utf8" }).map((file) => join(dir, file))
    )
    .filter(
      (file) =>
        /\.tsx?$/.test(file) &&
        !/\.test\.tsx?$/.test(file) &&
        !file.split(sep).includes("__fixtures__")
    );
}
function layoutOf(el: HTMLElement): string | null {
  return el.shadowRoot!.querySelector("[data-kc-layout]")?.getAttribute("data-kc-layout") ?? null;
}
/** The shadow button whose aria-label or text matches `re`. */
function button(root: ShadowRoot, re: RegExp): HTMLButtonElement | undefined {
  return [...root.querySelectorAll("button")].find((b) =>
    re.test(b.getAttribute("aria-label") ?? b.textContent ?? "")
  );
}
/** Every id referenced by the four ID-based ARIA attributes inside `root`. */
function ariaIds(root: ShadowRoot): string[] {
  const selector = ID_ATTRIBUTES.map((name) => `[${name}]`).join(",");
  return [...root.querySelectorAll(selector)].flatMap((el) =>
    ID_ATTRIBUTES.flatMap((name) => (el.getAttribute(name) ?? "").split(/\s+/).filter(Boolean))
  );
}

it("AR-29 the layout follows the host's ResizeObserver size (560x400 desktop; 559, a 461 dock and a 576x750 portrait dock stacked), never a media query", async () => {
  const media = vi.spyOn(window, "matchMedia");
  const el = mount();
  new KarmanCalculator(el);
  for (const [w, h, l] of [
    [560, 400, "desktop"],
    [559, 400, "stacked"],
    [461, 400, "stacked"],
    [1024, 600, "desktop"],
    [576, 750, "stacked"],
    [800, 500, "desktop"],
    [900, 800, "stacked"],
  ] as const) {
    triggerResize(el, { width: w, height: h });
    await vi.waitFor(() => expect(layoutOf(el)).toBe(l));
  }
  expect(media.mock.calls.map(([q]) => q).filter((q) => /width|height/.test(q))).toEqual([]);
});

it("A11Y-7 ID-based ARIA references resolve inside the shadow root, the host has an id, and no element reflection is used", async () => {
  const el = mount();
  new KarmanCalculator(el).updateSettings({ keypad: true });
  const root = el.shadowRoot!;
  await vi.waitFor(() => expect(button(root, /^functions$/i)).toBeDefined());
  button(root, /^functions$/i)!.click();
  button(root, /^graph settings$/i)!.click();
  await vi.waitFor(() =>
    expect(root.querySelectorAll(".kc-functions-panel, .kc-settings").length).toBe(2)
  ); // the clicks commit in a microtask
  const ids = ariaIds(root);
  expect(ids.length).toBeGreaterThan(0);
  expect(el.id).not.toBe("");
  for (const id of ids)
    expect([!!root.getElementById(id), !!document.getElementById(id)]).toEqual([true, false]);
  const reflection = new RegExp(
    "aria" +
      "(Controls|DescribedBy|LabelledBy|Details|FlowTo|Owns)Elements|aria" +
      "ActiveDescendantElement"
  ); // split, so no file holds the names (sourceFiles also skips tests)
  expect(
    sourceFiles(["src/components/calculator-v2"]).filter((f) =>
      reflection.test(readFileSync(f, "utf8"))
    )
  ).toEqual([]);
});

it("S-6 Graph settings opens with Radians checked; Degrees sets the angle and announces it; a new calculator starts in radians", async () => {
  const el = mount();
  const calc = new KarmanCalculator(el);
  const root = el.shadowRoot!;
  await vi.waitFor(() => expect(button(root, /^graph settings$/i)).toBeDefined());
  button(root, /^graph settings$/i)!.click();
  const app = within(root.querySelector<HTMLElement>(".kc-app")!);
  await vi.waitFor(() => expect(app.getByRole("radio", { name: "Radians" })).toBeChecked());
  fireEvent.click(app.getByRole("radio", { name: "Degrees" }));
  expect(calc.settings.angleMode).toBe("degrees");
  await vi.waitFor(() =>
    expect(root.querySelector('[role="status"]')!.textContent).toBe(
      EDITOR_MESSAGES.angle("degrees")
    )
  );
  calc.destroy();
  expect(new KarmanCalculator(mount()).settings.angleMode).toBe("radians");
});
