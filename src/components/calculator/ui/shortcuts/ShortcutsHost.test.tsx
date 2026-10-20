// @vitest-environment jsdom
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { expect, it } from "vitest";
import { renderEditor } from "../list/__fixtures__/render-editor";
import { EDITOR_MESSAGES } from "../list/messages";
import { ShortcutsHost } from "./ShortcutsHost";
import { SHORTCUT_SECTIONS, shortcutParts } from "./shortcut-rows";

function Root() {
  const ref = useRef<HTMLElement>(null);
  return (
    <section ref={ref} data-testid="root">
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
  expect(kit.announcer.texts).toEqual([EDITOR_MESSAGES.angle("degrees")]);
  act(() => kit.engine.updateSettings({ complex: true }));
  await press("KeyD", { altKey: true });
  expect(kit.engine.settings.angleMode).toBe("degrees");
  expect(kit.announcer.texts.at(-1)).toBe("Complex mode uses radians");
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
  expect(shortcutParts("~sum")).toEqual([{ cap: "s" }, { cap: "u" }, { cap: "m" }]);
});
