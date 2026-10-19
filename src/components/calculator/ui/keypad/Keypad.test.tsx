// @vitest-environment jsdom
// Testing Library's ByRoleOptions has no `exact` (that option is Playwright's): a string `name`
// already matches the whole accessible name, so `ABC` never finds a longer name.
import { act, cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import { renderEditor } from "../list/__fixtures__/render-editor";
import { Keypad, type KeypadProps } from "./Keypad";
import { keypadLayout, layoutKeys } from "./keys";

const keypad = (props: Partial<KeypadProps> = {}) => (
  <Keypad containerWidth={900} pointer="fine" open onOpenChange={vi.fn()} {...props} />
);
/** A keypad whose open state follows its own onOpenChange, as the shell's does. */
function StatefulKeypad(props: { initialOpen: boolean }) {
  const [open, setOpen] = useState(props.initialOpen);
  return <Keypad containerWidth={900} pointer="fine" open={open} onOpenChange={setOpen} />;
}
const keyIds = () =>
  [...document.querySelectorAll(".kc-keypad [data-key]")].map((k) => k.getAttribute("data-key"));

it("K-1 the tray renders the 123 page's keys in row order and Hide and Show keypad report a student change", async () => {
  const onOpenChange = vi.fn();
  renderEditor(keypad({ onOpenChange }), { rows: [""] });
  const region = screen.getByRole("region", { name: "Keypad" });
  expect(region).toHaveAttribute("data-page", "main");
  expect(keyIds()).toEqual(layoutKeys(keypadLayout("main", 900, false)).map((k) => k.id));
  await userEvent.setup().click(screen.getByRole("button", { name: "Hide keypad" }));
  expect(onOpenChange).toHaveBeenCalledWith(false, "student");
  cleanup();
  renderEditor(keypad({ open: false, onOpenChange }), { rows: [""] });
  expect(screen.queryByRole("region", { name: "Keypad" })).toBeNull();
  await userEvent.setup().click(screen.getByRole("button", { name: "Show keypad" }));
  expect(onOpenChange).toHaveBeenLastCalledWith(true, "student");
});

it("VIS-KEYPAD-32, 40 coarse pointers and keypads under 450 px have no Show or Hide keypad control", () => {
  for (const props of [{ pointer: "coarse" as const }, { containerWidth: 449 }]) {
    renderEditor(keypad(props), { rows: [""] });
    expect(screen.queryByRole("button", { name: "Hide keypad" })).toBeNull();
    cleanup();
    renderEditor(keypad({ ...props, open: false }), { rows: [""] });
    expect(screen.queryByRole("button", { name: "Show keypad" })).toBeNull();
    cleanup();
  }
});

it("K-3 ABC switches to the letters page and back; Shift is a pressed toggle that stays on", async () => {
  renderEditor(keypad(), { rows: [""] });
  const user = userEvent.setup();
  const abc = () => screen.getByRole("button", { name: "ABC" });
  expect(abc()).toHaveAttribute("aria-pressed", "false");
  expect(abc()).toHaveTextContent("A B C");
  await user.click(abc());
  expect(abc()).toHaveAttribute("aria-pressed", "true");
  expect(abc()).toHaveTextContent("1 2 3");
  expect(keyIds()).toEqual(layoutKeys(keypadLayout("letters", 900, false)).map((k) => k.id));
  await user.click(screen.getByRole("button", { name: "Shift" }));
  expect(screen.getByRole("button", { name: "Shift" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Q" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Tau" })).toBeInTheDocument();
  await user.click(abc());
  expect(keyIds()).toEqual(layoutKeys(keypadLayout("main", 900, false)).map((k) => k.id));
});

it("K-9 the audio key sits on the 123 page at every width, named Audio trace with aria-pressed, disabled with nothing to trace, and not on the letters page", async () => {
  renderEditor(keypad(), { rows: [""] });
  const audio = screen.getByRole("button", { name: "Audio trace" });
  expect(audio).toHaveAttribute("aria-pressed", "false");
  expect(audio).toHaveAttribute("aria-disabled", "true");
  await userEvent.setup().click(screen.getByRole("button", { name: "ABC" }));
  expect(screen.queryByRole("button", { name: "Audio trace" })).toBeNull();
  cleanup();
  renderEditor(keypad({ containerWidth: 390, pointer: "coarse" }), { rows: [""] });
  expect(screen.getByRole("button", { name: "Audio trace" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
});

it("A11Y-5 the keypad is a region named Keypad whose keys are named in words; ABC uses aria-pressed and Functions aria-expanded", () => {
  renderEditor(keypad({ pointer: "coarse" }), { rows: [""] });
  const region = screen.getByRole("region", { name: "Keypad" });
  for (const name of [
    "Squared",
    "Power",
    "Square root",
    "Pi",
    "Less than or equal to",
    "Absolute value",
    "Left arrow",
    "Backspace",
  ])
    expect(within(region).getByRole("button", { name })).toBeInTheDocument();
  for (const button of within(region).getAllByRole("button"))
    expect(button.getAttribute("aria-label") ?? button.textContent).toMatch(/^[A-Za-z0-9][\w ,]*$/);
  expect(within(region).getByRole("button", { name: "ABC" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  expect(within(region).getByRole("button", { name: "Functions" })).toHaveAttribute(
    "aria-expanded",
    "false"
  );
});

it("KB-13 Show and Hide keypad from the keyboard keep focus on the control that takes their place", async () => {
  renderEditor(<StatefulKeypad initialOpen={false} />, { rows: [""] });
  const user = userEvent.setup();
  screen.getByRole("button", { name: "Show keypad" }).focus();
  await user.keyboard("{Enter}");
  expect(screen.getByRole("button", { name: "Hide keypad" })).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(screen.getByRole("button", { name: "Show keypad" })).toHaveFocus();
});

it("KB-13 Escape with focus on a key closes the keypad and focuses Show keypad", () => {
  const kit = renderEditor(<StatefulKeypad initialOpen />, { rows: [""] });
  screen.getByRole("button", { name: "Pi" }).focus();
  act(() => kit.pressEscape());
  expect(screen.getByRole("button", { name: "Show keypad" })).toHaveFocus();
});
