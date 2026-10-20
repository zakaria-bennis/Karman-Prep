// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { renderEditor } from "../list/__fixtures__/render-editor";
import { fieldTextbox } from "../list/row-model";
import { isValidAxis, stepFromValue } from "./AxisSection";
import { SettingsPopover } from "./SettingsPopover";

const popover = (onClose: () => void = vi.fn()) => (
  <SettingsPopover
    anchor={document.body.appendChild(document.createElement("button"))}
    open
    onClose={onClose}
  />
);

it("SETTINGS-24 bounds apply as typed while valid; an invalid pair marks both fields and keeps the view", async () => {
  const kit = renderEditor(popover(), { rows: [""] });
  const [min, max] = [kit.fields.byLabel("X Axis Minimum:"), kit.fields.byLabel("X Axis Maximum:")];
  expect(min.latex()).toBe("-10");
  // Typing -20 into xmax: "-2" is valid and applies, "-20" is below xmin and leaves that view.
  act(() => max.emitEdit("-2"));
  await waitFor(() => expect(kit.engine.getSnapshot().viewport.right).toBe(-2));
  act(() => max.emitEdit("-20"));
  await waitFor(() => expect(fieldTextbox(min)).toHaveAttribute("aria-invalid", "true"));
  expect(fieldTextbox(max)).toHaveAttribute("aria-invalid", "true");
  expect(fieldTextbox(max).getAttribute("aria-label")).toMatch(
    /^X Axis Maximum:.*expression has error$/
  );
  expect(kit.engine.getSnapshot().viewport.right).toBe(-2);
  // A valid edit clears both marks; an expression is evaluated (-2π) and kept as typed.
  act(() => max.emitEdit("10"));
  await waitFor(() => expect(fieldTextbox(min)).not.toHaveAttribute("aria-invalid"));
  act(() => min.emitEdit("-2\\pi"));
  await waitFor(() =>
    expect(kit.engine.getSnapshot().viewport.left).toBeCloseTo(-6.283185307179586, 12)
  );
  expect(min.latex()).toBe("-2\\pi");
  // A blank bound is an error.
  act(() => min.emitEdit(""));
  await waitFor(() => expect(fieldTextbox(min)).toHaveAttribute("aria-invalid", "true"));
  expect(kit.engine.getSnapshot().viewport.left).toBeCloseTo(-6.283185307179586, 12);
  // The view moving from elsewhere shows it again in both fields.
  act(() => kit.engine.setMathBounds({ left: -4, right: 4, bottom: -3, top: 3 }));
  await waitFor(() => expect(min.latex()).toBe("-4"));
  expect(fieldTextbox(min)).not.toHaveAttribute("aria-invalid");
});

it("SETTINGS-25 the step takes any expression of 0 or more; blank or 0 is automatic, negative is invalid", async () => {
  const kit = renderEditor(popover(), { rows: [""] });
  const step = kit.fields.byLabel("X Axis Step Size:");
  act(() => step.emitEdit("\\pi"));
  await waitFor(() => expect(kit.engine.settings.xAxis.step).toBeCloseTo(Math.PI, 12));
  act(() => step.emitEdit("-1"));
  await waitFor(() => expect(fieldTextbox(step)).toHaveAttribute("aria-invalid", "true"));
  expect(kit.engine.settings.xAxis.step).toBeCloseTo(Math.PI, 12);
  act(() => step.emitEdit("0"));
  await waitFor(() => expect(kit.engine.settings.xAxis.step).toBeNull());
  expect(fieldTextbox(step)).not.toHaveAttribute("aria-invalid");
  act(() => step.emitEdit("2"));
  await waitFor(() => expect(kit.engine.settings.xAxis.step).toBe(2));
  act(() => step.emitEdit(""));
  await waitFor(() => expect(kit.engine.settings.xAxis.step).toBeNull());
});

it("SETTINGS-24, -25 the axis and step value rules", () => {
  expect(isValidAxis(-10, 10)).toBe(true);
  expect(isValidAxis(10, -10)).toBe(false);
  expect(isValidAxis(1, 1)).toBe(false);
  expect(isValidAxis(1e300, 1e300 * (1 + 1e-12))).toBe(false); // below the 1e-8 relative span
  expect(isValidAxis(-1e300, 1e300)).toBe(false);
  expect(isValidAxis(0, Infinity)).toBe(false);
  expect(stepFromValue(Math.PI)).toEqual({ step: Math.PI });
  expect(stepFromValue(0)).toEqual({ step: null });
  expect(stepFromValue(-1)).toBeNull();
  expect(stepFromValue(null)).toBeNull();
});
