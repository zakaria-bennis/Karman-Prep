// @vitest-environment jsdom
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { expect, it, vi } from "vitest";
import { renderEditor } from "../list/__fixtures__/render-editor";
import { ShortcutsHost } from "./ShortcutsHost";
import { SHORTCUT_SECTIONS, shortcutParts } from "./shortcut-rows";

function Root(props: { zoom?: (name: string) => void; home?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const zoom = props.zoom ?? (() => undefined);
  return (
    <section ref={ref} data-testid="root">
      <div className="kc-graph-controls">
        <button aria-label="Zoom in" onClick={() => zoom("in")} />
        <button aria-label="Zoom out" onClick={() => zoom("out")} />
        {props.home === true && <button aria-label="Home" onClick={() => zoom("home")} />}
      </div>
      <input aria-label="inside" />
      <ShortcutsHost rootRef={ref} />
    </section>
  );
}

const press = (code: string, mods: KeyboardEventInit = {}) =>
  act(() => {
    fireEvent.keyDown(screen.getByRole("textbox", { name: "inside" }), { code, ...mods });
  });

it("SETTINGS-33 Ctrl+/ opens the Keyboard Shortcuts dialog with this platform's tab; Escape closes it and returns focus", async () => {
  const kit = renderEditor(<Root />, { rows: [""] });
  const inside = screen.getByRole("textbox", { name: "inside" });
  inside.focus();
  await press("Slash", { ctrlKey: true });
  const dialog = screen.getByRole("dialog", { name: "Keyboard Shortcuts" });
  expect(dialog).toHaveAttribute("aria-modal", "true");
  const os = within(dialog).getByRole("radiogroup", { name: "Operating System" });
  expect(within(os).getByRole("radio", { name: "Windows / ChromeOS Shortcuts" })).toBeChecked();
  expect(
    within(dialog)
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent)
  ).toEqual(SHORTCUT_SECTIONS.map((s) => s.title));
  expect(
    within(dialog).getAllByRole("columnheader", { name: "Windows / ChromeOS Shortcut" })
  ).not.toHaveLength(0);
  await userEvent.setup().click(within(os).getByRole("radio", { name: "Mac Shortcuts" }));
  expect(within(dialog).getAllByRole("columnheader", { name: "Mac Shortcut" })).not.toHaveLength(0);
  act(() => kit.pressEscape());
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(inside);
});

it("SETTINGS-33 the Close Dialog button closes the dialog", async () => {
  renderEditor(<Root />, { rows: [""] });
  await press("Slash", { ctrlKey: true });
  await userEvent.setup().click(screen.getByRole("button", { name: "Close Dialog" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("SETTINGS-32 Alt+D switches degrees and radians and announces it; in complex mode it announces radians only", async () => {
  const kit = renderEditor(<Root />, { rows: [""] });
  await press("KeyD", { altKey: true });
  expect(kit.engine.settings.angleMode).toBe("degrees");
  await press("KeyD", { altKey: true });
  expect(kit.engine.settings.angleMode).toBe("radians");
  await press("KeyD", { altKey: true });
  expect(kit.announcer.texts).toEqual(["Degrees", "Radians", "Degrees"]);
  act(() => kit.engine.updateSettings({ complex: true }));
  await press("KeyD", { altKey: true });
  expect(kit.engine.settings.angleMode).toBe("degrees");
  expect(kit.announcer.texts.at(-1)).toBe("Complex mode uses radians");
});

it("SETTINGS-3, -32 Alt+=, Alt+- and Alt+0 press Zoom in, Zoom out and Home and announce them; with no Home they do nothing", async () => {
  const pressed: string[] = [];
  const kit = renderEditor(<Root zoom={(name) => pressed.push(name)} />, { rows: [""] });
  await press("Equal", { altKey: true });
  await press("NumpadSubtract", { altKey: true });
  await press("Digit0", { altKey: true });
  expect(pressed).toEqual(["in", "out"]);
  expect(kit.announcer.texts).toEqual(["Graph zoom in", "Graph zoom out"]);
});

it("SETTINGS-32 Alt+0 restores the default viewport while Home shows", async () => {
  const pressed: string[] = [];
  const kit = renderEditor(<Root home zoom={(name) => pressed.push(name)} />, { rows: [""] });
  await press("Digit0", { altKey: true });
  expect(pressed).toEqual(["home"]);
  expect(kit.announcer.texts).toEqual(["Graph viewport default"]);
});

it("SETTINGS-33 shortcut strings become key caps with the separators as text", () => {
  expect(shortcutParts("CTRL + SHIFT + Z")).toEqual([
    { cap: "CTRL" },
    { text: "+" },
    { cap: "SHIFT" },
    { text: "+" },
    { cap: "Z" },
  ]);
  expect(shortcutParts("UP ARROW, SHIFT + Tab")).toEqual([
    { cap: "UP ARROW" },
    { text: "," },
    { cap: "SHIFT" },
    { text: "+" },
    { cap: "Tab" },
  ]);
  expect(shortcutParts("^ (SHIFT + 6)")).toEqual([
    { cap: "^" },
    { text: "(" },
    { cap: "SHIFT" },
    { text: "+" },
    { cap: "6" },
    { text: ")" },
  ]);
  expect(shortcutParts("ALT + +")).toEqual([{ cap: "ALT" }, { text: "+" }, { cap: "+" }]);
  expect(shortcutParts("~sum")).toEqual([{ cap: "s" }, { cap: "u" }, { cap: "m" }]);
});

it("R-5 Alt+Shift+A switches a row that offers the toggle; on a regression parameter it does nothing and announces nothing", async () => {
  const kit = renderEditor(<Root />, { rows: [""] });
  act(() =>
    kit.engine.setExpressions([
      {
        id: "t",
        type: "table",
        columns: [
          { latex: "x_{1}", values: ["1", "2", "3"] },
          { latex: "y_{1}", values: ["2", "4", "6.5"] },
        ],
      },
      { id: "r", latex: "y_{1}\\sim mx_{1}+b" },
      { id: "m", latex: "m" },
      { id: "b", latex: " b " },
      { id: "m2", latex: "2m" },
      { id: "h", latex: "\\frac{1}{2}" },
    ])
  );
  const row = (id: string) => kit.engine.getSnapshot().rows.find((r) => r.id === id)!;
  await vi.waitFor(() => expect(row("m").value).not.toBeNull());
  act(() => kit.engine.setFocusedRow("m"));
  await press("KeyA", { altKey: true, shiftKey: true });
  expect(row("m")).toMatchObject({ fraction: null, asFraction: false });
  expect(kit.engine.getExpressions().find((e) => e.id === "m")).not.toHaveProperty(
    "displayEvaluationAsFraction"
  );
  expect(kit.announcer.texts).toEqual([]);
  act(() => kit.engine.setFocusedRow("h"));
  await press("KeyA", { altKey: true, shiftKey: true });
  expect(row("h").asFraction).toBe(true);
  expect(kit.announcer.texts).toEqual(["Show as Fraction"]);
});
