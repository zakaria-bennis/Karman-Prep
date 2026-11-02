// @vitest-environment jsdom
// Testing Library's ByRoleOptions has no `exact` (that option is Playwright's): a string `name`
// already matches the whole accessible name, so `Delete expression 1` never finds
// `Delete expression 10`.
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import { resolveRowColor } from "@/lib/calculator/theme/roles";
import { panelProps, renderEditor, rowItem, textbox } from "./__fixtures__/render-editor";
import { ExpressionPanel } from "./ExpressionPanel";
import { fieldTextbox } from "./row-model";

it("A11Y-3 rows are list items with an Expression n textbox and Delete and Hide controls, renumbered on removal", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x", "y=2x"] });
  const list = screen.getByRole("list", { name: "Expressions" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  expect(textbox(2)).toBe(fieldTextbox(kit.fields.forRow("2")));
  expect(screen.getByRole("button", { name: "Delete expression 2" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Hide: Expression 2" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  act(() => kit.engine.removeExpression({ id: "1" }));
  expect(textbox(1)).toBe(fieldTextbox(kit.fields.forRow("2")));
  expect(screen.getByRole("button", { name: "Delete expression 1" })).toBeInTheDocument();
});

it("A11Y-4 each textbox's accessible description is the T-5 speech text", () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["y=x^{2}+\\frac{3}{4}", "y=\\sqrt{x}+\\pi"],
  });
  expect(textbox(1)).toHaveAccessibleDescription("y equals x squared plus 3 fourths");
  expect(textbox(2)).toHaveAccessibleDescription("y equals Start Root, x, End Root plus pi");
});

it("L-3 the gutter numbers rows from 1, the ghost row shows the next number, and the focused and active rows are marked", () => {
  const props = panelProps();
  const kit = renderEditor(<ExpressionPanel {...props} />, { rows: ["y=x", "a=2", ""] });
  expect([...document.querySelectorAll("li .kc-row-number")].map((n) => n.textContent)).toEqual([
    "1",
    "2",
    "3",
  ]);
  expect(document.querySelector(".kc-ghost-row")).toHaveTextContent("4");
  expect(document.querySelector(".kc-ghost-row")).toHaveAttribute("aria-hidden", "true");
  fireEvent.pointerDown(rowItem("2").querySelector(".kc-row-field")!, { pointerType: "touch" });
  act(() => kit.focus.focusRow("2", "end"));
  expect(rowItem("2")).toHaveAttribute("data-focused", "true");
  expect(rowItem("2")).toHaveAttribute("data-active", "true");
  expect(props.onTouchFocusRow).toHaveBeenCalledWith("2");
  act(() => kit.focus.activateRow("3"));
  expect(rowItem("3")).toHaveAttribute("data-active", "true");
  expect(rowItem("2")).not.toHaveAttribute("data-active");
  expect(fieldTextbox(kit.fields.forRow("3"))).not.toHaveFocus();
});

it("R-1 the colour icon shows the row colour and a wave or point kind glyph and toggles the graph with aria-pressed", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["y=x", "(2,3)", "2+3"],
  });
  const tab = screen.getByRole("button", { name: "Hide: Expression 1" });
  expect(tab).toHaveAttribute("data-kind", "wave");
  const { hex } = resolveRowColor(kit.engine.getSnapshot().rows[0].color, "white");
  expect(tab.style.getPropertyValue("--kc-row-color")).toBe(hex);
  expect(screen.getByRole("button", { name: "Hide: Expression 2" })).toHaveAttribute(
    "data-kind",
    "point"
  );
  expect(screen.queryByRole("button", { name: "Hide: Expression 3" })).toBeNull();
  await userEvent.setup().click(tab);
  expect(kit.engine.getSnapshot().rows[0].hidden).toBe(true);
  expect(screen.getByRole("button", { name: "Show: Expression 1" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  expect(kit.engine.expressionAnalysis["1"].isGraphable).toBe(false);
});

it("R-1 a list of points shows the four-dot points glyph; a single point keeps one dot", async () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["[(1,2),(3,4)]", "(1,2)"],
  });
  const list = await screen.findByRole("button", { name: "Hide: Expression 1" });
  await vi.waitFor(() => expect(list).toHaveAttribute("data-kind", "points"));
  expect(list.querySelectorAll("circle")).toHaveLength(4);
  const single = screen.getByRole("button", { name: "Hide: Expression 2" });
  expect(single).toHaveAttribute("data-kind", "point");
  expect(single.querySelectorAll("circle")).toHaveLength(1);
});

it("R-1, F-A1 an explicit colour is never adjusted, so no row shows a contrast note", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  act(() => kit.engine.setExpression({ id: "2", latex: "y=2x", color: "#ffff00" }));
  expect(within(rowItem("2")).queryByText(/adjusted for contrast/i)).toBeNull();
});

it("T-11 a row calls setInputMode none while keypadOpen and text after the keypad closes", () => {
  function Panel() {
    const [keypadOpen, setKeypadOpen] = useState(true);
    return (
      <>
        <button type="button" onClick={() => setKeypadOpen(false)}>
          Test close keypad
        </button>
        <ExpressionPanel {...panelProps({ keypadOpen })} />
      </>
    );
  }
  const kit = renderEditor(<Panel />, { rows: ["y=x"] });
  const field = kit.fields.forRow("1");
  const modes = () => field.calls.filter((c) => c.method === "setInputMode");
  expect(modes()).toContainEqual({ method: "setInputMode", arg: "none" });
  expect(modes()).not.toContainEqual({ method: "setInputMode", arg: "text" });
  fireEvent.click(screen.getByRole("button", { name: "Test close keypad" })); // rerender with keypadOpen false
  expect(modes().at(-1)).toEqual({ method: "setInputMode", arg: "text" });
});

it("R-1 clicking a row body focuses its field", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=2x", "y=x"] });
  const user = userEvent.setup();
  const field = kit.fields.forRow("1");
  field.calls = [];
  await user.click(rowItem("1").querySelector(".kc-row-number")!); // the gutter number
  expect(fieldTextbox(field)).toHaveFocus();
  expect(field.calls).toEqual([
    { method: "focus", arg: undefined },
    { method: "keystroke", arg: "Ctrl-End" },
  ]);
  expect(rowItem("1")).toHaveAttribute("data-focused", "true");
  await user.click(rowItem("2").querySelector(".kc-row-main")!); // the space beside the field
  expect(fieldTextbox(kit.fields.forRow("2"))).toHaveFocus();
  // Row controls keep their own action and do not move focus into the field.
  const second = kit.fields.forRow("2");
  second.calls = [];
  await user.click(screen.getByRole("button", { name: "Hide: Expression 2" }));
  expect(second.calls.filter((c) => c.method === "focus")).toEqual([]);
});
