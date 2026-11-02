// @vitest-environment jsdom
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/calculator/core/api/types";
import { panelProps, renderEditor } from "../list/__fixtures__/render-editor";
import { ExpressionPanel } from "../list/ExpressionPanel";
import { SettingsPopover } from "./SettingsPopover";

const ORDER = [
  ["slider", "Text Size"],
  ["checkbox", "Grid"],
  ["button", "Cartesian Grid"],
  ["button", "Polar Grid"],
  ["checkbox", "Minor Gridlines"],
  ["checkbox", "Axis Numbers"],
  ["checkbox", "Arrows"],
  ["checkbox", "X-Axis"],
  ["textbox", "X Axis Minimum:"],
  ["textbox", "X Axis Maximum:"],
  ["button", "Label and step"],
  ["checkbox", "Y-Axis"],
  ["textbox", "Y Axis Minimum:"],
  ["textbox", "Y Axis Maximum:"],
  ["button", "Label and step"],
  ["checkbox", "Complex Mode"],
  ["radio", "Radians"],
  ["radio", "Degrees"],
  ["checkbox", "Key Sounds"],
  ["button", "More Options"],
] as const;
const popover = (onClose: () => void = vi.fn()) => (
  <SettingsPopover
    anchor={document.body.appendChild(document.createElement("button"))}
    open
    onClose={onClose}
  />
);

it("SETTINGS-8, -9 the settings popover is the region Graph Settings with its controls in order (founder layout, 2026-10-26)", () => {
  renderEditor(popover(), { rows: [""] });
  const dialog = screen.getByRole("region", { name: "Graph Settings" });
  // ByRoleOptions has no `exact` (tsc rejects it); a string name already matches the whole name.
  // Both axes have a "Label and step" button, so the nth one of a name is the nth in the order.
  const seen = new Map<string, number>();
  const controls = ORDER.map(([role, name]) => {
    const n = seen.get(role + name) ?? 0;
    seen.set(role + name, n + 1);
    return within(dialog).getAllByRole(role, { name })[n];
  });
  controls
    .slice(1)
    .forEach((el, i) =>
      expect(
        controls[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
    );
  const count = (role: string) => within(dialog).queryAllByRole(role).length;
  expect(
    count("slider") + count("checkbox") + count("radio") + count("textbox") + count("button")
  ).toBe(ORDER.length);
});

it("S-1 each display control writes its setting and Escape closes the popover", async () => {
  const onClose = vi.fn();
  const kit = renderEditor(popover(onClose), { rows: [""] });
  const user = userEvent.setup();
  const toggles = [
    ["Arrows", "arrows"],
    ["Axis Numbers", "axisNumbers"],
    ["Minor Gridlines", "minorGridlines"],
    ["Grid", "showGrid"],
  ] as const;
  for (const [name, setting] of toggles) {
    await user.click(screen.getByRole("checkbox", { name }));
    expect(kit.engine.settings[setting]).toBe(!DEFAULT_SETTINGS[setting]);
  }
  // The label and step sit behind each axis's "Label and step" disclosure.
  expect(screen.queryByRole("textbox", { name: "Label" })).toBeNull();
  for (const more of screen.getAllByRole("button", { name: "Label and step" })) {
    expect(more).toHaveAttribute("aria-expanded", "false");
    await user.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
  }
  expect(screen.getByRole("textbox", { name: "X Axis Step Size:" })).toBeInTheDocument();
  // SETTINGS-19: each keystroke in Label sets the label.
  await user.type(screen.getAllByRole("textbox", { name: "Label" })[0], "ti");
  expect(kit.engine.settings.xAxis.label).toBe("ti");
  await user.click(screen.getByRole("checkbox", { name: "X-Axis" }));
  expect(kit.engine.settings.xAxis.show).toBe(false);
  // SETTINGS-19: the Label field leaves with its axis.
  expect(screen.getAllByRole("textbox", { name: "Label" })).toHaveLength(1);
  await user.click(screen.getByRole("checkbox", { name: "Grid" }));
  await user.click(screen.getByRole("button", { name: "Polar Grid" }));
  expect(kit.engine.settings.polarGrid).toBe(true);
  expect(screen.getByRole("button", { name: "Polar Grid" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  act(() => kit.pressEscape());
  expect(onClose).toHaveBeenCalledOnce();
});

it("S-5 Complex mode is off by default and switches complex evaluation", async () => {
  const kit = renderEditor(
    <>
      <ExpressionPanel {...panelProps()} />
      {popover()}
    </>,
    { rows: ["\\sqrt{-4}"] }
  );
  const box = screen.getByRole("checkbox", { name: "Complex Mode" });
  expect(box).not.toBeChecked();
  expect(await screen.findByText("undefined")).toBeInTheDocument();
  await userEvent.setup().click(box);
  expect(kit.engine.settings.complex).toBe(true);
  expect(await screen.findByText("2i")).toBeInTheDocument();
});

it("SETTINGS-11 the Text Size slider has seven notches with the default marked, and writes the size", () => {
  const kit = renderEditor(popover(), { rows: [""] });
  const slider = screen.getByRole("slider", { name: "Text Size" });
  expect(slider).toHaveAttribute("min", "1");
  expect(slider).toHaveAttribute("max", "7");
  expect(slider).toHaveAttribute("step", "1");
  expect(slider).toHaveValue("3");
  expect(slider).toHaveAttribute("aria-valuetext", "Size 3 of 7, default");
  expect(slider).toHaveFocus(); // SETTINGS-32
  const notches = document.querySelectorAll(".kc-size-notch");
  expect(notches).toHaveLength(7);
  expect([...notches].map((n) => n.getAttribute("data-default"))).toEqual([
    null,
    null,
    "true",
    null,
    null,
    null,
    null,
  ]);
  act(() => {
    // A native range's change, as a drag or arrow key makes it.
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    set.call(slider, "6");
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(kit.engine.settings.displaySize).toBe(6);
  expect(slider).toHaveAttribute("aria-valuetext", "Size 6 of 7");
  expect(screen.queryByRole("checkbox", { name: "Reverse contrast" })).toBeNull();
});

it("SETTINGS-13 Braille Mode lives in More Options and writes its settings", async () => {
  const kit = renderEditor(popover(), { rows: [""] });
  const user = userEvent.setup();
  expect(screen.queryByRole("checkbox", { name: "Braille Mode" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "More Options" }));
  expect(screen.queryByRole("radiogroup", { name: "Braille code" })).toBeNull();
  await user.click(screen.getByRole("checkbox", { name: "Braille Mode" }));
  expect(kit.engine.settings.brailleMode).toBe("nemeth");
  await user.click(screen.getByRole("radio", { name: "UEB" }));
  expect(kit.engine.settings.brailleMode).toBe("ueb");
  await user.click(screen.getByRole("checkbox", { name: "Six Key Braille Input" }));
  expect(kit.engine.settings.sixKeyInput).toBe(true);
  await user.click(screen.getByRole("checkbox", { name: "Braille Mode" }));
  expect(kit.engine.settings.brailleMode).toBe("none");
});

it("More Options explains the axis scale, Lock Viewport and Braille Mode on a help button: hover, focus and tap", async () => {
  renderEditor(popover(), { rows: [""] });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "More Options" }));
  for (const topic of ["Axis scale", "Lock Viewport", "Braille Mode"]) {
    const help = screen.getByRole("button", { name: `About ${topic}` });
    // Screen readers hear the explanation as the button's description.
    expect(help).toHaveAccessibleDescription(/\w{3,}/);
    expect(help).toHaveAttribute("aria-expanded", "false");
    await user.click(help); // a tap or click pins it open
    expect(help).toHaveAttribute("aria-expanded", "true");
    await user.click(help);
    expect(help).toHaveAttribute("aria-expanded", "false");
  }
  const lock = screen.getByRole("button", { name: "About Lock Viewport" });
  expect(lock).toHaveAccessibleDescription(/dragging, scrolling and the zoom buttons/);
});

it("Key Sounds is off by default and remembers a change on the device", async () => {
  localStorage.removeItem("karman.calculator.keySounds");
  renderEditor(popover(), { rows: [""] });
  const box = screen.getByRole("checkbox", { name: "Key Sounds" });
  expect(box).not.toBeChecked();
  expect(box).toHaveAccessibleDescription("A soft sound for each key you type or press.");
  await userEvent.setup().click(box);
  expect(box).toBeChecked();
  expect(localStorage.getItem("karman.calculator.keySounds")).toBe("on");
  await userEvent.setup().click(box);
  expect(localStorage.getItem("karman.calculator.keySounds")).toBe("off");
});

it("SETTINGS-14, -15 grid off hides the grid type and Minor Gridlines; polar hides Minor Gridlines and Step", async () => {
  renderEditor(popover(), { rows: [""] });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Polar Grid" }));
  expect(screen.queryByRole("checkbox", { name: "Minor Gridlines" })).toBeNull();
  expect(screen.queryByRole("textbox", { name: "X Axis Step Size:" })).toBeNull();
  await user.click(screen.getByRole("checkbox", { name: "Grid" }));
  expect(screen.queryByRole("button", { name: "Cartesian Grid" })).toBeNull();
});

it("SETTINGS-20 More Options opens to the axis scales and Lock Viewport, and reopens open while locked", async () => {
  const kit = renderEditor(popover(), { rows: [""] });
  const user = userEvent.setup();
  const more = screen.getByRole("button", { name: "More Options" });
  expect(more).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("checkbox", { name: "Lock Viewport" })).toBeNull();
  await user.click(more);
  expect(more).toHaveAttribute("aria-expanded", "true");
  const x = screen.getByRole("radiogroup", { name: "X-axis scale" });
  expect(within(x).getByRole("radio", { name: "Linear" })).toBeChecked();
  await user.click(within(x).getByRole("radio", { name: "Logarithmic" }));
  expect(within(x).getByRole("radio", { name: "Linear" })).toBeChecked();
  await user.click(screen.getByRole("checkbox", { name: "Lock Viewport" }));
  expect(kit.engine.settings.lockViewport).toBe(true);
});

it("SETTINGS-20 the popover opened while locked starts with More Options expanded", async () => {
  function Later() {
    const [shown, setShown] = useState(false);
    return shown ? popover() : <button onClick={() => setShown(true)}>show</button>;
  }
  const kit = renderEditor(<Later />, { rows: [""] });
  act(() => kit.engine.updateSettings({ lockViewport: true }));
  await userEvent.setup().click(screen.getByRole("button", { name: "show" }));
  expect(screen.getByRole("button", { name: "More Options" })).toHaveAttribute(
    "aria-expanded",
    "true"
  );
});

it("SETTINGS-23 complex mode shows its hint and greys Angle, keeping the angle mode", async () => {
  const kit = renderEditor(popover(), { rows: [""] });
  const user = userEvent.setup();
  await user.click(screen.getByRole("checkbox", { name: "Complex Mode" }));
  expect(screen.getByText(/Complex values are plotted as \(real, imag\)/)).toBeVisible();
  const angle = screen.getByRole("radiogroup", { name: "Angle Settings" });
  expect(angle).toHaveAttribute("title", "Complex mode uses radians");
  expect(within(angle).getByRole("radio", { name: "Degrees" })).toBeDisabled();
  expect(kit.engine.settings.angleMode).toBe("radians");
});

it("A11Y-2 changing Angle announces it once", async () => {
  const kit = renderEditor(popover(), { rows: [""] });
  expect(screen.getByRole("radio", { name: "Radians" })).toBeChecked();
  await userEvent.setup().click(screen.getByRole("radio", { name: "Degrees" }));
  expect(kit.engine.settings.angleMode).toBe("degrees");
  expect(kit.announcer.texts).toEqual(["Angle set to degrees."]);
});
