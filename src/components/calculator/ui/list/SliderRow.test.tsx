// @vitest-environment jsdom
// Slider rows checked side by side against the live reference (2026-10-19): the controls' spoken
// names (SLIDERS-25, SLIDERS-29), the tab order through a slider row (SLIDERS-25), the snapped
// value in the field (SLIDERS-22), the thumb at min = max (SLIDERS-14) and Escape from the
// options popover (SLIDERS-34).
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { panelProps, renderEditor, rowItem } from "./__fixtures__/render-editor";
import { ExpressionPanel } from "./ExpressionPanel";

const active = () => document.activeElement as HTMLElement | null;

it("SLIDERS-25, SLIDERS-29 controls speak the name as the reference does", () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["\\alpha=1", "a_{1}=2"] });
  const alpha = within(rowItem("1"));
  expect(alpha.getByRole("slider", { name: '"alpha"' })).toBeInTheDocument();
  expect(alpha.getByRole("button", { name: "Play alpha Animation" })).toBeInTheDocument();
  expect(alpha.getByRole("button", { name: 'Edit "alpha" Limits' })).toHaveAttribute(
    "tabindex",
    "-1"
  );
  expect(alpha.getByRole("button", { name: "Slider Maximum: 10" })).toHaveAttribute(
    "tabindex",
    "-1"
  );
  expect(alpha.getByRole("button", { name: "Loop forwards and backwards" })).toHaveAttribute(
    "tabindex",
    "-1"
  );
  expect(within(rowItem("2")).getByRole("slider", { name: '"a_1"' })).toBeInTheDocument();
});

it("SLIDERS-25 Tab walks math, delete, min, max, step, thumb, Play, next row; Shift+Tab back", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["y=x", "a=1", "b=2"],
  });
  const user = userEvent.setup();
  act(() => kit.fields.forRow("2").focus());
  const walk: string[] = [];
  const name = () =>
    active()?.getAttribute("aria-label") ??
    active()?.closest("[data-row-id]")?.getAttribute("data-row-id") ??
    "?";
  for (let i = 0; i < 7; i++) {
    await user.keyboard("{Tab}");
    walk.push(`${active()?.closest("[data-row-id]")?.getAttribute("data-row-id")}:${name()}`);
  }
  expect(walk).toEqual([
    "2:Delete expression 2",
    "2:Slider Minimum:",
    "2:Slider Maximum:",
    "2:Slider Step Size:",
    '2:"a"',
    "2:Play a Animation",
    "3:Expression 3",
  ]);
  act(() => within(rowItem("2")).getByRole("slider").focus());
  const back: string[] = [];
  for (let i = 0; i < 5; i++) {
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    back.push(name());
  }
  expect(back).toEqual([
    "Slider Step Size:",
    "Slider Maximum:",
    "Slider Minimum:",
    "Delete expression 2",
    "Expression 2",
  ]);
  act(() => within(rowItem("2")).getByRole("button", { name: "Play a Animation" }).focus());
  await user.keyboard("{Shift>}{Tab}{/Shift}");
  expect(active()).toBe(within(rowItem("2")).getByRole("slider"));
});

it("SLIDERS-22 the field shows the snapped value for an API write and keeps what is typed", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />);
  act(() =>
    kit.engine.setExpression({
      id: "1",
      latex: "a=15",
      sliderBounds: { min: "0", max: "10", step: "" },
    })
  );
  const field = kit.fields.forRow("1");
  expect(field.latex()).toBe("a=10");
  expect(kit.engine.getExpressions()[0].latex).toBe("a=15");
  act(() => field.focus());
  act(() => field.emitEdit("a=102"));
  expect(kit.engine.getExpressions()[0]).toMatchObject({ latex: "a=102", slider: { min: "0" } });
  act(() => field.blur());
  expect(field.latex()).toBe("a=102"); // past the hard max, which typing made soft
});

it("SLIDERS-14 with min = max the thumb stays, focusable, and keys do nothing", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />);
  act(() =>
    kit.engine.setExpression({
      id: "1",
      latex: "a=1",
      sliderBounds: { min: "1", max: "1", step: "" },
    })
  );
  const thumb = within(rowItem("1")).getByRole("slider");
  expect(thumb.style.left).toBe("");
  act(() => thumb.focus());
  await userEvent.setup().keyboard("{ArrowRight}");
  expect(active()).toBe(thumb);
  expect(kit.engine.getExpressions()[0].latex).toBe("a=1");
});

it("SLIDERS-34 Escape from the options popover returns focus to the Play button", async () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["a=1"] });
  const user = userEvent.setup();
  await user.click(
    within(rowItem("1")).getByRole("button", { name: "Loop forwards and backwards" })
  );
  expect(screen.getByRole("dialog", { name: "Animation options for a" })).toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(active()).toBe(within(rowItem("1")).getByRole("button", { name: "Play a Animation" }));
});
