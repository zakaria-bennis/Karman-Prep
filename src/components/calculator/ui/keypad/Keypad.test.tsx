// @vitest-environment jsdom
// Testing Library's ByRoleOptions has no `exact` (that option is Playwright's): a string `name`
// already matches the whole accessible name, so `ABC` never finds a longer name.
import { act, cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import { renderEditor } from "../list/__fixtures__/render-editor";
import { Keypad, type KeypadProps } from "./Keypad";
import { keypadLayout } from "./keys";

const keypad = (props: Partial<KeypadProps> = {}) => (
  <Keypad containerWidth={900} pointer="fine" open onOpenChange={vi.fn()} {...props} />
);
/** A keypad whose open state follows its own onOpenChange, as the shell's does. */
function StatefulKeypad(props: { initialOpen: boolean }) {
  const [open, setOpen] = useState(props.initialOpen);
  return <Keypad containerWidth={900} pointer="fine" open={open} onOpenChange={setOpen} />;
}
const groupIds = () =>
  [...document.querySelectorAll("[data-group]")].map((g) => g.getAttribute("data-group"));

it("K-1 the tray renders the K-1 groups in order and Hide and Show keypad report a student change", async () => {
  const onOpenChange = vi.fn();
  renderEditor(keypad({ onOpenChange }), { rows: [""] });
  const region = screen.getByRole("region", { name: "Keypad" });
  expect(region).toHaveAttribute("data-layout", "tray");
  expect(groupIds()).toEqual(["left", "centre", "right"]);
  const keys = [...region.querySelectorAll('[data-group="left"] [data-key]')].map((k) =>
    k.getAttribute("data-key")
  );
  expect(keys).toEqual(
    keypadLayout("main", 900, "fine", false)
      .groups[0].rows.flat()
      .map((k) => k.id)
  );
  await userEvent.setup().click(screen.getByRole("button", { name: "Hide keypad" }));
  expect(onOpenChange).toHaveBeenCalledWith(false, "student");
  cleanup();
  renderEditor(keypad({ open: false, onOpenChange }), { rows: [""] });
  expect(screen.queryByRole("region", { name: "Keypad" })).toBeNull();
  await userEvent.setup().click(screen.getByRole("button", { name: "Show keypad" }));
  expect(onOpenChange).toHaveBeenLastCalledWith(true, "student");
});

it("K-3 ABC switches the left and centre groups to the letters page and back; Shift is a pressed toggle", async () => {
  renderEditor(keypad(), { rows: [""] });
  const user = userEvent.setup();
  const abc = () => screen.getByRole("button", { name: "ABC" });
  expect(abc()).toHaveAttribute("aria-pressed", "false");
  expect(abc()).toHaveTextContent("ABC");
  await user.click(abc());
  expect(abc()).toHaveAttribute("aria-pressed", "true");
  expect(abc()).toHaveTextContent("123");
  expect(groupIds()).toEqual(["letters", "right"]);
  await user.click(screen.getByRole("button", { name: "Shift" }));
  expect(screen.getByRole("button", { name: "Shift" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Q" })).toBeInTheDocument();
  await user.click(abc());
  expect(groupIds()).toEqual(["left", "centre", "right"]);
});

it("K-9 the audio key sits on both main pages, named Audio trace with aria-pressed, and not on letters pages", async () => {
  renderEditor(keypad(), { rows: [""] });
  const audio = screen.getByRole("button", { name: "Audio trace" });
  expect(audio).toHaveAttribute("aria-pressed", "false");
  expect(audio).not.toHaveAttribute("aria-disabled");
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
    "Tilde",
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
