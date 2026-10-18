// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type {
  TransferPayload,
  TransferResult,
  TransferTrigger,
} from "@/lib/calculator-transfer/payload";
import { classifyStem, type TransferItem } from "@/lib/calculator-transfer/classify";
import { TransferControl } from "./TransferControl";
import { resetLastFormats } from "./TransferChooser";
import { transferSelection } from "./transfer-selection";

const h = vi.hoisted(() => ({ bridge: null as unknown }));
// bridge-context holds useCalculator; CalculatorScope re-exports it (AR-33).
vi.mock("./bridge-context", async (original) => {
  const real = await original<typeof import("./bridge-context")>();
  return { ...real, useCalculator: () => h.bridge as ReturnType<typeof real.useCalculator> };
});

const bridge = (questionKey = "attempt:q1") => {
  const b = {
    version: "v2",
    open: false,
    status: "idle",
    failure: null,
    questionKey,
    toggle: vi.fn(),
    prefetch: vi.fn(),
    transfer: vi.fn(
      async (_p: TransferPayload, _t: TransferTrigger): Promise<TransferResult> => ({
        status: "added",
        message: "Added.",
        focusRowId: "1",
      })
    ),
  };
  h.bridge = b;
  return b;
};
const itemOf = (text: string): TransferItem => {
  const [item] = classifyStem({ text, serializedFunctionLines: false }).values();
  return item;
};
const PAIR = itemOf("The line passes through $(2,5)$.");
const COORDINATE = itemOf("For the function $f$, $f(2)=5$.");
function Control({ item = PAIR }: { item?: TransferItem }) {
  return (
    <>
      <button type="button">before</button>
      <p>
        <span>math</span>
        <TransferControl
          item={item}
          accessibleName="Transfer to Calculator: x"
          placement="inline"
        />
      </p>
      <button type="button">after</button>
    </>
  );
}
const control = () => screen.getByRole("button", { name: "Transfer to Calculator: x" });
const menu = () => screen.queryByRole("menu");
const items = () => screen.getAllByRole("menuitem");
const focused = () => document.activeElement?.textContent;
const key = (k: string) => {
  const target = document.activeElement;
  if (target === null) throw new Error("no focus");
  fireEvent.keyDown(target, { key: k });
};

beforeEach(() => {
  resetLastFormats();
  transferSelection.resetForTests();
});
afterEach(() => vi.restoreAllMocks());

it("TR-60 a pair's control is a menu button with the menu keyboard model", async () => {
  const b = bridge();
  render(<Control />);
  const button = control();
  expect(button).toHaveAttribute("aria-haspopup", "menu");
  expect(button).toHaveAttribute("aria-expanded", "false");
  // click opens; Escape closes and returns focus to the control
  fireEvent.click(button);
  expect(menu()).not.toBeNull();
  expect(button).toHaveAttribute("aria-expanded", "true");
  expect(button.getAttribute("aria-controls")).toBe(menu()?.id);
  key("Escape");
  expect(menu()).toBeNull();
  expect(document.activeElement).toBe(button);
  // Enter, Space and ArrowDown on the control open it
  for (const k of ["Enter", " ", "ArrowDown"]) {
    button.focus();
    fireEvent.keyDown(button, { key: k });
    if (k !== "ArrowDown") fireEvent.click(button); // a button's own activation
    expect(menu(), k).not.toBeNull();
    key("Escape");
  }
  // ArrowDown and ArrowUp move with wrapping, Home and End jump, a letter finds its item
  fireEvent.keyDown(button, { key: "ArrowDown" });
  expect(items().map((i) => i.textContent)).toEqual(["Point", "Table row"]);
  expect(focused()).toBe("Point");
  key("ArrowDown");
  expect(focused()).toBe("Table row");
  key("ArrowDown");
  expect(focused()).toBe("Point");
  key("ArrowUp");
  expect(focused()).toBe("Table row");
  key("Home");
  expect(focused()).toBe("Point");
  key("End");
  expect(focused()).toBe("Table row");
  key("p");
  expect(focused()).toBe("Point");
  key("t");
  expect(focused()).toBe("Table row");
  // Tab closes and leaves focus to move on from the control
  key("Tab");
  expect(menu()).toBeNull();
  expect(document.activeElement).toBe(button);
  // a click outside closes without a transfer
  fireEvent.click(button);
  fireEvent.pointerDown(screen.getByRole("button", { name: "before" }));
  expect(menu()).toBeNull();
  // Enter activates the focused item: one keyboard transfer of that format, and the menu closes
  fireEvent.keyDown(button, { key: "ArrowDown" });
  key("ArrowDown");
  key("Enter");
  expect(menu()).toBeNull();
  await waitFor(() => expect(b.transfer).toHaveBeenCalledTimes(1));
  expect(b.transfer.mock.calls[0]).toEqual([
    { ...PAIR.chooser?.tableRow, questionKey: "attempt:q1" },
    "keyboard",
  ]);
  // Space activates too; a mouse click on an item is a mouse transfer of the Point payload
  fireEvent.keyDown(button, { key: "ArrowDown" });
  key("Home");
  key(" ");
  await waitFor(() => expect(b.transfer).toHaveBeenCalledTimes(2));
  fireEvent.click(button);
  const point = items()[0];
  fireEvent.pointerDown(point, { pointerType: "mouse" });
  fireEvent.click(point);
  await waitFor(() => expect(b.transfer).toHaveBeenCalledTimes(3));
  expect(b.transfer.mock.calls.slice(1).map((c) => [c[0].format, c[1]])).toEqual([
    ["point", "keyboard"],
    ["point", "mouse"],
  ]);
});

it("TR-61 Point then Table row, initial focus on the last format used", async () => {
  const b = bridge();
  const view = render(<Control />);
  fireEvent.click(control());
  expect(focused()).toBe("Point"); // nothing used yet in this question
  key("End");
  key("Enter");
  await waitFor(() => expect(b.transfer).toHaveBeenCalledTimes(1));
  fireEvent.click(control());
  expect(focused()).toBe("Table row"); // the format last used in this question
  key("Escape");
  view.unmount();
  // a function coordinate adds Evaluate with its real name and argument
  const second = render(<Control item={COORDINATE} />);
  fireEvent.click(control());
  expect(items().map((i) => i.getAttribute("aria-label") ?? i.textContent)).toEqual([
    "Point",
    "Table row",
    "Evaluate f(2)",
  ]);
  expect(focused()).toBe("Table row"); // the same question
  key("Escape");
  second.unmount();
  // another question starts from Point
  bridge("attempt:q2");
  render(<Control item={COORDINATE} />);
  act(() => fireEvent.click(control()));
  expect(focused()).toBe("Point");
});

it("TR-62, TR-56 a disabled Evaluate is focusable but cannot be activated and shows its reason; a tap on the control opens the chooser", async () => {
  const b = bridge();
  render(<Control item={COORDINATE} />);
  const button = control();
  fireEvent.pointerDown(button, { pointerType: "touch" });
  fireEvent.click(button);
  expect(menu()).toHaveAttribute("data-reveal", "coarse");
  expect(b.transfer).not.toHaveBeenCalled();
  key("End");
  const evaluate = items()[2];
  expect(document.activeElement).toBe(evaluate);
  expect(evaluate).toHaveAttribute("aria-disabled", "true");
  const reason = document.getElementById(evaluate.getAttribute("aria-describedby") ?? "");
  expect(reason?.textContent).toBe("f isn't defined in the calculator or this question");
  expect(evaluate).toHaveAccessibleDescription(
    "f isn't defined in the calculator or this question"
  );
  key("Enter");
  fireEvent.click(evaluate);
  expect(menu()).not.toBeNull();
  expect(b.transfer).not.toHaveBeenCalled();
  // a touch choice is a touch transfer
  const point = items()[0];
  fireEvent.pointerDown(point, { pointerType: "touch" });
  fireEvent.click(point);
  await waitFor(() => expect(b.transfer).toHaveBeenCalledTimes(1));
  expect(b.transfer.mock.calls[0][1]).toBe("touch");
});
