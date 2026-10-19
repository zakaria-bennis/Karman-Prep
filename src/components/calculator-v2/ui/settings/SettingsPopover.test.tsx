// @vitest-environment jsdom
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/calculator-v2/core/api/types";
import { panelProps, renderEditor } from "../list/__fixtures__/render-editor";
import { ExpressionPanel } from "../list/ExpressionPanel";
import { SettingsPopover } from "./SettingsPopover";

const ORDER = [
  ["checkbox", "Grid"],
  ["radio", "Cartesian"],
  ["radio", "Polar"],
  ["checkbox", "Arrows"],
  ["checkbox", "Axis numbers"],
  ["checkbox", "Minor gridlines"],
  ["checkbox", "Show x-axis"],
  ["textbox", "x-axis label"],
  ["textbox", "x minimum"],
  ["textbox", "x maximum"],
  ["textbox", "x-axis step"],
  ["checkbox", "Show y-axis"],
  ["textbox", "y-axis label"],
  ["textbox", "y minimum"],
  ["textbox", "y maximum"],
  ["textbox", "y-axis step"],
  ["checkbox", "Complex mode"],
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

it("S-1 the settings popover lists the Phase 1 controls in S-1 order", () => {
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
  expect(count("checkbox") + count("radio") + count("textbox")).toBe(ORDER.length);
});

it("S-1 each display control writes its setting and Escape closes the popover", async () => {
  const onClose = vi.fn();
  const kit = renderEditor(popover(onClose), { rows: [""] });
  const user = userEvent.setup();
  const toggles = [
    ["Grid", "showGrid"],
    ["Arrows", "arrows"],
    ["Axis numbers", "axisNumbers"],
    ["Minor gridlines", "minorGridlines"],
  ] as const;
  for (const [name, setting] of toggles) {
    await user.click(screen.getByRole("checkbox", { name }));
    expect(kit.engine.settings[setting]).toBe(!DEFAULT_SETTINGS[setting]);
  }
  await user.click(screen.getByRole("radio", { name: "Polar" }));
  expect(kit.engine.settings.polarGrid).toBe(true);
  await user.click(screen.getByRole("checkbox", { name: "Show x-axis" }));
  expect(kit.engine.settings.xAxis.show).toBe(false);
  await user.type(screen.getByRole("textbox", { name: "x-axis label" }), "t{Enter}");
  expect(kit.engine.settings.xAxis.label).toBe("t");
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
  const box = screen.getByRole("checkbox", { name: "Complex mode" });
  expect(box).not.toBeChecked();
  expect(await screen.findByText("undefined")).toBeInTheDocument();
  await userEvent.setup().click(box);
  expect(kit.engine.settings.complex).toBe(true);
  expect(await screen.findByText("2i")).toBeInTheDocument();
});

it("A11Y-15 no Braille setting is offered", () => {
  renderEditor(popover(), { rows: [""] });
  expect(screen.queryByText(/braille/i)).toBeNull();
  expect(screen.queryByRole("checkbox", { name: /braille/i })).toBeNull();
});

it("A11Y-2 changing Angle announces it once", async () => {
  const kit = renderEditor(popover(), { rows: [""] });
  expect(screen.getByRole("radio", { name: "Radians" })).toBeChecked();
  await userEvent.setup().click(screen.getByRole("radio", { name: "Degrees" }));
  expect(kit.engine.settings.angleMode).toBe("degrees");
  expect(kit.announcer.texts).toEqual(["Angle set to degrees."]);
});
