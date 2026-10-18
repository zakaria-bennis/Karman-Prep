// @vitest-environment jsdom
import { getDefaultNormalizer, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { panelProps, renderEditor, rowItem, textbox } from "./__fixtures__/render-editor";
import { ExpressionPanel } from "./ExpressionPanel";
import { fieldTextbox, rowDomIds } from "./row-model";

// Testing Library's default normalizer collapses \s+, U+2009 included, so T-10 text is matched
// with whitespace collapsing off.
const keepSpaces = { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) };

it("R-5 a numeric row shows its value below the math with NM-1, NM-2 and T-10 display and no fraction toggle", async () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["\\frac{1}{3}", "12340+5", "2^{40}"],
  });
  expect(await screen.findByText("= 0.333333333333")).toBeInTheDocument();
  expect(await screen.findByText("= 12 345", keepSpaces)).toBeInTheDocument(); // U+2009 (T-10)
  expect(await screen.findByText("= 1.09951162778×10^12")).toBeInTheDocument();
  expect(textbox(2)).toHaveAccessibleDescription(/ equals 12345$/);
  expect(screen.queryByRole("button", { name: /fraction|decimal/i })).toBeNull();
});

it("R-2 an error row shows the gutter marker, the message below the math, aria-invalid and no graph", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=2+"] });
  expect(rowItem("1").querySelector(".kc-row-gutter .kc-row-warning")).not.toBeNull();
  const message = within(rowItem("1")).getByText(
    "This can't be read. Check for a missing bracket or operator."
  );
  expect(textbox(1)).toHaveAttribute("aria-invalid", "true");
  expect(textbox(1).getAttribute("aria-describedby")!.split(" ")).toContain(message.id);
  expect(kit.engine.expressionAnalysis["1"]).toMatchObject({ isGraphable: false, isError: true });
});

it("A11Y-3 the value element and the error element are linked from the textbox by aria-describedby; only the error row is aria-invalid", async () => {
  renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["2+3", "y=2+"] });
  const [one, two] = [rowDomIds("1"), rowDomIds("2")];
  await screen.findByText("= 5");
  expect(textbox(1).getAttribute("aria-describedby")!.split(" ")).toEqual([one.speech, one.value]);
  expect(document.getElementById(one.value)).toHaveTextContent("equals 5");
  expect(textbox(1)).not.toHaveAttribute("aria-invalid");
  expect(textbox(2).getAttribute("aria-describedby")!.split(" ")).toEqual([two.speech, two.error]);
  expect(document.getElementById(two.error)).toHaveTextContent(
    "This can't be read. Check for a missing bracket or operator."
  );
  expect(textbox(2)).toHaveAttribute("aria-invalid", "true");
});

it("FN-16 a row whose only undefined name is i shows the complex-mode hint, whose action turns on complex mode (OI-4)", async () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["2i", "a+i"] });
  expect(kit.engine.getSnapshot().rows.map((r) => r.chips)).toEqual([["i"], ["a", "i"]]);
  expect(within(rowItem("1")).getByText("Turn on complex mode to use i.")).toBeInTheDocument();
  expect(within(rowItem("2")).queryByText("Turn on complex mode to use i.")).toBeNull();
  expect(textbox(1)).not.toHaveAttribute("aria-invalid");
  await userEvent
    .setup()
    .click(within(rowItem("1")).getByRole("button", { name: "Turn on complex mode" }));
  expect(kit.engine.settings.complex).toBe(true);
  expect(await within(rowItem("1")).findByText("= 2i")).toBeInTheDocument();
  expect(fieldTextbox(kit.fields.forRow("1"))).toHaveFocus();
});
