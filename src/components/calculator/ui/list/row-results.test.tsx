// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  getDefaultNormalizer,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { panelProps, renderEditor, rowItem, textbox } from "./__fixtures__/render-editor";
import { ExpressionPanel } from "./ExpressionPanel";
import { ExpressionRow } from "./ExpressionRow";
import { rowDomIds } from "./row-model";

// Testing Library's default normalizer collapses \s+, U+2009 included, so T-10 text is matched
// with whitespace collapsing off.
const keepSpaces = { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) };

it("R-5 a numeric row shows its value below the math with NM-1, NM-2 and T-10 display, and only a value with a fraction form offers the R-5 toggle", async () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["\\frac{1}{3}", "12340+5", "2^{40}"],
  });
  expect(await screen.findByText("0.333333333333")).toBeInTheDocument();
  expect(await screen.findByText("12 345", keepSpaces)).toBeInTheDocument(); // U+2009 (T-10)
  expect(await screen.findByText("1.09951162778×10^12")).toBeInTheDocument();
  expect(textbox(2)).toHaveAccessibleDescription(/ equals 12345$/);
  expect(within(rowItem("1")).getByRole("button", { name: /^Displaying as decimal/ })).toBeTruthy();
  for (const id of ["2", "3"])
    expect(within(rowItem(id)).queryByRole("button", { name: /fraction|decimal/i })).toBeNull();
});

const SYNTAX_MESSAGE = "You need something on both sides of the '+' symbol.";

it("R-2 an error row shows the warning marker in place of the tab, with a tooltip that opens on hover and focus, closes on leave, blur and Escape, and is pinned by a click or tap until a second one or a press outside; the message is the textbox's description", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=2+"] });
  const ids = rowDomIds("1");
  const row = rowItem("1");
  const marker = within(row.querySelector<HTMLElement>(".kc-row-gutter")!).getByRole("button", {
    name: "Error",
  });
  expect(marker).toHaveClass("kc-row-warning");
  expect(marker).toHaveAttribute("type", "button");
  expect(marker).toHaveAttribute("aria-describedby", ids.error);
  expect(row.querySelector(".kc-row-tab")).toBeNull(); // replaces the swatch, no hide toggle
  expect(within(row).queryByRole("button", { name: /^(Hide|Show): Expression/ })).toBeNull();
  expect(row.querySelector(".kc-row-error")).toBeNull(); // no inline message
  expect(kit.engine.expressionAnalysis["1"]).toMatchObject({ isGraphable: false, isError: true });

  // A11Y-3: the textbox is invalid and described by the message even while the tooltip is closed.
  expect(textbox(1)).toHaveAttribute("aria-invalid", "true");
  expect(textbox(1).getAttribute("aria-describedby")!.split(" ")).toContain(ids.error);
  expect(textbox(1)).toHaveAccessibleDescription(expect.stringContaining(SYNTAX_MESSAGE));
  expect(screen.queryByRole("tooltip")).toBeNull();
  expect(marker).toHaveAttribute("aria-expanded", "false");

  // Pointer: opens 500 ms after hover, closes 170 ms after leave.
  const user = userEvent.setup();
  await user.hover(marker);
  expect(screen.queryByRole("tooltip")).toBeNull();
  const tip = await screen.findByRole("tooltip");
  expect(tip).toHaveAttribute("id", ids.error);
  expect(tip).toHaveTextContent(SYNTAX_MESSAGE);
  expect(marker).toHaveAttribute("aria-expanded", "true");
  await user.unhover(marker);
  await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());

  // A click pins it: it stays after the pointer leaves until a press outside.
  await user.click(marker);
  expect(screen.getByRole("tooltip")).toHaveAttribute("data-pinned", "true");
  await user.unhover(marker);
  await new Promise((resolve) => setTimeout(resolve, 250));
  expect(screen.getByRole("tooltip")).toBeInTheDocument();
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("tooltip")).toBeNull();
  act(() => marker.blur());

  // Keyboard: focus opens, Escape closes one KB-3 layer and focus stays, blur closes.
  act(() => marker.focus());
  expect(screen.getByRole("tooltip")).toBeInTheDocument();
  act(() => kit.pressEscape());
  expect(screen.queryByRole("tooltip")).toBeNull();
  expect(marker).toHaveFocus();
  act(() => marker.blur());
  act(() => marker.focus());
  expect(screen.getByRole("tooltip")).toBeInTheDocument();
  act(() => marker.blur());
  expect(screen.queryByRole("tooltip")).toBeNull();
  expect(kit.escape.handleEscape()).toBe(false); // no layer left behind

  // Mouse: a click pins it (black, as the reference's), so leaving no longer closes it.
  await user.click(marker);
  expect(screen.getByRole("tooltip")).toHaveAttribute("data-pinned", "true");
  await user.unhover(marker);
  expect(screen.getByRole("tooltip")).toBeInTheDocument();
  fireEvent.pointerDown(document.body, { pointerType: "mouse" });
  expect(screen.queryByRole("tooltip")).toBeNull();
  act(() => marker.blur());

  // Touch: a tap toggles it; a press outside closes it.
  fireEvent.pointerDown(marker, { pointerType: "touch" });
  fireEvent.click(marker, { detail: 1 });
  expect(screen.getByRole("tooltip")).toBeInTheDocument();
  fireEvent.pointerDown(marker, { pointerType: "touch" });
  fireEvent.click(marker, { detail: 1 });
  expect(screen.queryByRole("tooltip")).toBeNull();
  fireEvent.pointerDown(marker, { pointerType: "touch" });
  fireEvent.click(marker, { detail: 1 });
  expect(screen.getByRole("tooltip")).toBeInTheDocument();
  fireEvent.pointerDown(document.body, { pointerType: "touch" });
  expect(screen.queryByRole("tooltip")).toBeNull();
});

it("R-2 a row that broke while hidden offers no hide or show tab, and the tab returns once the error is fixed", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  act(() => kit.engine.setRowHidden("1", true));
  expect(rowItem("1").querySelector(".kc-row-tab")).not.toBeNull();
  act(() => kit.engine.editRow("1", "y=2+", "typing"));
  expect(rowItem("1").querySelector(".kc-row-tab")).toBeNull();
  expect(rowItem("1").querySelector(".kc-row-warning")).not.toBeNull();
  act(() => kit.engine.editRow("1", "y=x", "typing"));
  expect(rowItem("1").querySelector(".kc-row-warning")).toBeNull();
  expect(
    within(rowItem("1")).getByRole("button", { name: "Show: Expression 1" })
  ).toBeInTheDocument();
});

it("R-5 the value sits in a box after a muted =; a list shows one box per element and … after 30 (NM-38)", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["12340+5"] });
  await screen.findByText("12 345", keepSpaces);
  const single = rowItem("1").querySelector(".kc-row-value")!;
  expect(single.querySelectorAll(".kc-row-value-box")).toHaveLength(1);
  expect(single.querySelector(".kc-row-equals")).toHaveTextContent("=");
  expect(single.querySelector(".kc-row-value-box")!.textContent).toBe("12 345");

  // A hand-built list result: a separate package adds list syntax, so only this row has one.
  const base = kit.engine.getSnapshot().rows[0];
  const listRow = (n: number) => {
    const value = {
      type: "list" as const,
      value: Array.from({ length: n }, (_, i) => ({ type: "number" as const, value: i + 1 })),
    };
    return { ...base, value, valueText: `[${value.value.map((v) => v.value).join(", ")}]` };
  };
  const listItem = (n: number): HTMLElement => {
    cleanup();
    renderEditor(
      <ol>
        <ExpressionRow
          row={listRow(n)}
          number={1}
          keypadOpen={false}
          onTouchFocus={() => undefined}
          motion="idle"
          onExitDone={() => undefined}
        />
      </ol>
    );
    return rowItem(base.id);
  };
  const three = listItem(3);
  expect([...three.querySelectorAll(".kc-row-value-box")].map((b) => b.textContent)).toEqual([
    "1",
    "2",
    "3",
  ]);
  expect(three.querySelector(".kc-row-value .kc-visually-hidden")).toHaveTextContent(
    "equals 1, 2, 3"
  );

  const long = listItem(40);
  const boxes = [...long.querySelectorAll(".kc-row-value-box")].map((b) => b.textContent);
  expect(boxes).toHaveLength(31);
  expect(boxes.slice(0, 3)).toEqual(["1", "2", "3"]);
  expect(boxes[29]).toBe("30");
  expect(boxes[30]).toBe("…");
  expect(long.querySelector(".kc-row-value .kc-visually-hidden")!.textContent).toMatch(
    /^equals 1, 2, 3, .*, 30, …$/
  );
});

it("A11Y-3 the value element and the error element are linked from the textbox by aria-describedby; only the error row is aria-invalid", async () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["2+3", "y=2+"] });
  const [one, two] = [rowDomIds("1"), rowDomIds("2")];
  await screen.findByText("5");
  expect(textbox(1).getAttribute("aria-describedby")!.split(" ")).toEqual([one.speech, one.value]);
  expect(document.getElementById(one.value)).toHaveTextContent("equals 5");
  expect(textbox(1)).not.toHaveAttribute("aria-invalid");
  expect(textbox(2).getAttribute("aria-describedby")!.split(" ")).toEqual([two.speech, two.error]);
  expect(document.getElementById(two.error)).toHaveTextContent(SYNTAX_MESSAGE);
  expect(textbox(2)).toHaveAttribute("aria-invalid", "true");
});

it("FN-16 in real mode i is an ordinary undefined name, as in Desmos: 2i offers its slider and a lone i none (owner decision, 2026-10-21)", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["2i", "i"] });
  expect(kit.engine.getSnapshot().rows.map((r) => r.chips)).toEqual([["i"], ["i"]]);
  expect(
    within(rowItem("1")).getByRole("button", { name: "Add slider for i" })
  ).toBeInTheDocument();
  expect(within(rowItem("2")).queryByRole("button", { name: "Add slider for i" })).toBeNull();
  expect(textbox(1)).toHaveAttribute("aria-invalid", "true");
  expect(textbox(2)).toHaveAttribute("aria-invalid", "true");
  expect(screen.queryByText(/complex mode/i)).toBeNull();
});
