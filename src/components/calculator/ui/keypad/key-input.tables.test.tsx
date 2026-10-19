// @vitest-environment jsdom
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ExpressionPanel } from "../list/ExpressionPanel";
import { panelProps, renderEditor } from "../list/__fixtures__/render-editor";
import { Keypad } from "./Keypad";

const editor = () => (
  <>
    <ExpressionPanel {...panelProps({ keypadOpen: true })} />
    <Keypad containerWidth={900} layout="desktop" pointer="coarse" open onOpenChange={vi.fn()} />
  </>
);
const key = (name: string) => screen.getByRole("button", { name });
const box = (name: string) => screen.getByRole("textbox", { name });

function withTable() {
  const kit = renderEditor(editor(), { rows: ["y=x"] });
  act(() =>
    kit.engine.setExpression({
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["1"] },
        { latex: "y_{1}", values: ["2"] },
      ],
    })
  );
  return kit;
}
const cells = (kit: ReturnType<typeof withTable>) =>
  kit.engine
    .getSnapshot()
    .rows.find((r) => r.id === "t")!
    .columns!.map((c) => c.values);

it("D-41 the keypad's arrows cross into the next cell at the caret's edge and its Enter moves down a column", async () => {
  const kit = withTable();
  const user = userEvent.setup();
  act(() => box("y₁, row 1").focus());
  const field = kit.fields.byLabel("y₁, row 1");
  field.calls = [];
  await user.click(key("7"));
  expect(field.calls).toEqual([{ method: "typedText", arg: "7" }]);
  expect(cells(kit)).toEqual([["1"], ["27"]]); // the keypad wrote the cell, not a row
  act(() => kit.engine.undo());
  expect(cells(kit)).toEqual([["1"], ["2"]]); // one undo step
  field.calls = [];
  await user.click(key("Left arrow"));
  // The keystroke goes to the cell; at the caret's edge MathQuill reports moveOutOf (browser spec).
  expect(field.calls).toEqual([{ method: "keystroke", arg: "Left" }]);
  await user.click(key("Enter"));
  expect(box("y₁, row 2, blank")).toHaveFocus();
  expect(kit.engine.getSnapshot().rows).toHaveLength(2); // no expression row was added
});

it("D-41 keypad keys always reach an editable cell, never the header slot", async () => {
  const kit = withTable();
  act(() => box("x₁, row 1").focus());
  act(() => box("New column header").focus());
  await userEvent.setup().click(key("7"));
  const table = kit.engine.getSnapshot().rows.find((r) => r.id === "t")!;
  expect(table.columns).toHaveLength(2); // no column was added
  expect(cells(kit)).toEqual([
    ["1", "7"],
    ["2", ""],
  ]);
});
