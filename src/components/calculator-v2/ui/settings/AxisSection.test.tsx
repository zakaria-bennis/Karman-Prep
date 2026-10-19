// @vitest-environment jsdom
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { renderEditor } from "../list/__fixtures__/render-editor";
import { EDITOR_MESSAGES } from "../list/messages";
import { fieldTextbox } from "../list/row-model";
import { SettingsPopover } from "./SettingsPopover";

const popover = (onClose: () => void = vi.fn()) => (
  <SettingsPopover
    anchor={document.body.appendChild(document.createElement("button"))}
    open
    onClose={onClose}
  />
);

it("S-7 bounds apply on Enter or blur and keep min below max; the step takes a positive number or blank", async () => {
  const kit = renderEditor(popover(), { rows: [""] });
  const user = userEvent.setup();
  const [min, max] = [kit.fields.byLabel("x minimum"), kit.fields.byLabel("x maximum")];
  expect(min.latex()).toBe("-10");
  act(() => {
    max.emitEdit("2\\pi");
    max.options.onEnter();
  });
  await waitFor(() =>
    expect(kit.engine.getSnapshot().viewport.right).toBeCloseTo(6.283185307179586, 12)
  );
  expect(kit.engine.getSnapshot().viewport.left).toBe(-10);
  act(() => {
    min.emitEdit("7");
    min.options.onBlur();
  });
  expect(await screen.findByText(EDITOR_MESSAGES.boundOrder)).toBeInTheDocument();
  expect(fieldTextbox(min)).toHaveAttribute("aria-invalid", "true");
  expect(kit.engine.getSnapshot().viewport.left).toBe(-10);
  act(() => {
    min.emitEdit("\\frac{1}{0}");
    min.options.onEnter();
  });
  expect(await screen.findByText(EDITOR_MESSAGES.boundNotNumber)).toBeInTheDocument();
  const step = screen.getByRole("textbox", { name: "x-axis step" });
  await user.type(step, "0{Enter}");
  expect(screen.getByText(EDITOR_MESSAGES.stepInvalid)).toBeInTheDocument();
  expect(kit.engine.settings.xAxis.step).toBeNull();
  await user.clear(step);
  await user.type(step, "2{Enter}");
  expect(kit.engine.settings.xAxis.step).toBe(2);
  await user.clear(step);
  await user.type(step, "{Enter}");
  expect(kit.engine.settings.xAxis.step).toBeNull();
});
