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
  ["radio", "Display size: default"],
  ["radio", "Display size: large"],
  ["checkbox", "Reverse contrast"],
  ["checkbox", "Braille Mode"],
  ["checkbox", "Grid"],
  ["button", "Cartesian Grid"],
  ["button", "Polar Grid"],
  ["checkbox", "Arrows"],
  ["checkbox", "Axis Numbers"],
  ["checkbox", "Minor Gridlines"],
  ["checkbox", "X-Axis"],
  ["textbox", "x-axis label"],
  ["textbox", "x minimum"],
  ["textbox", "x maximum"],
  ["textbox", "x-axis step"],
  ["checkbox", "Y-Axis"],
  ["textbox", "y-axis label"],
  ["textbox", "y minimum"],
  ["textbox", "y maximum"],
  ["textbox", "y-axis step"],
  ["button", "More Options"],
  ["checkbox", "Complex Mode"],
  ["radio", "Radians"],
  ["radio", "Degrees"],
] as const;
const popover = (onClose: () => void = vi.fn()) => (
  <SettingsPopover
    anchor={document.body.appendChild(document.createElement("button"))}
    open
    onClose={onClose}
  />
);

it("SETTINGS-9 the settings popover lists the controls in the reference's order", () => {
  renderEditor(popover(), { rows: [""] });
  const dialog = screen.getByRole("dialog", { name: "Graph settings" });
  // ByRoleOptions has no `exact` (tsc rejects it); a string name already matches the whole name.
  const controls = ORDER.map(([role, name]) => within(dialog).getByRole(role, { name }));
  controls
    .slice(1)
    .forEach((el, i) =>
      expect(
        controls[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
    );
  const count = (role: string) => within(dialog).queryAllByRole(role).length;
  expect(count("checkbox") + count("radio") + count("textbox") + count("button")).toBe(
    ORDER.length
  );
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
  await user.type(screen.getByRole("textbox", { name: "x-axis label" }), "t{Enter}");
  expect(kit.engine.settings.xAxis.label).toBe("t");
  await user.click(screen.getByRole("checkbox", { name: "X-Axis" }));
  expect(kit.engine.settings.xAxis.show).toBe(false);
  // SETTINGS-19: the Label field leaves with its axis.
  expect(screen.queryByRole("textbox", { name: "x-axis label" })).toBeNull();
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

it("SETTINGS-11, -12, -13 display size, reverse contrast and Braille write their settings", async () => {
  const kit = renderEditor(popover(), { rows: [""] });
  const user = userEvent.setup();
  expect(screen.getByRole("radiogroup", { name: "Display Size" })).toBeInTheDocument();
  await user.click(screen.getByRole("radio", { name: "Display size: large" }));
  expect(kit.engine.settings.displaySize).toBe("large");
  await user.click(screen.getByRole("checkbox", { name: "Reverse contrast" }));
  expect(kit.engine.settings.reverseContrast).toBe(true);
  expect(screen.queryByRole("radiogroup", { name: "Braille Mode" })).toBeNull();
  await user.click(screen.getByRole("checkbox", { name: "Braille Mode" }));
  expect(kit.engine.settings.brailleMode).toBe("nemeth");
  await user.click(screen.getByRole("radio", { name: "UEB" }));
  expect(kit.engine.settings.brailleMode).toBe("ueb");
  await user.click(screen.getByRole("checkbox", { name: "Six Key Braille Input" }));
  expect(kit.engine.settings.sixKeyInput).toBe(true);
  await user.click(screen.getByRole("checkbox", { name: "Braille Mode" }));
  expect(kit.engine.settings.brailleMode).toBe("none");
});

it("SETTINGS-14, -15 grid off hides the grid type and Minor Gridlines; polar hides Minor Gridlines and Step", async () => {
  renderEditor(popover(), { rows: [""] });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Polar Grid" }));
  expect(screen.queryByRole("checkbox", { name: "Minor Gridlines" })).toBeNull();
  expect(screen.queryByRole("textbox", { name: "x-axis step" })).toBeNull();
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
  const x = screen.getByRole("radiogroup", { name: "X-Axis:" });
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
  expect(screen.getByText(/Note: complex values will be plotted as \(real, imag\)/)).toBeVisible();
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
