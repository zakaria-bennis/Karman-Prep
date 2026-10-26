// @vitest-environment jsdom
// FN-59: the inference wizard and the inference row, as live Desmos (College Board version)
// behaves (captured 2026-10-26): every wizard screen writes Desmos's row, the row's sections,
// fields and tails change what it shows, and its numerical outputs export rows.

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ExpressionPanel } from "../ExpressionPanel";
import { panelProps, renderEditor, rowItem } from "../__fixtures__/render-editor";

const SLOW = { timeout: 8000 };
const latexes = (kit: ReturnType<typeof renderEditor>) =>
  kit.engine.getSnapshot().rows.map((r) => r.latex);

async function openWizard(rows: string[] = [""]) {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Add item" }));
  await user.click(screen.getByRole("menuitem", { name: "Add inference object" }));
  return { kit, user, dialog: () => screen.queryByRole("dialog", { name: /inference|test|Distribution/ }) }; // prettier-ignore
}

const type = (kit: ReturnType<typeof renderEditor>, label: string, latex: string) =>
  act(() => kit.fields.byLabel(label).emitEdit(latex));
const create = () => screen.getByRole("button", { name: /^Create (Test|Distribution)$/ });

describe("the inference wizard (FN-59)", { timeout: 30000 }, () => {
  it("adds an empty row and opens beside it with Desmos's start screen; Escape leaves the row", async () => {
    const { kit, dialog } = await openWizard();
    expect(latexes(kit)).toEqual(["", ""]);
    const start = dialog()!;
    expect(start).toHaveAccessibleName("Add inference");
    expect(
      within(start)
        .getAllByRole("button")
        .map((b) => b.textContent)
    ).toEqual([
      "Probability Distribution",
      "z-test",
      "t-test",
      "z-test for proportions",
      "χ2 test for independence",
      "χ2 goodness of fit test",
    ]);
    expect(within(start).getAllByRole("button")[0]).toHaveFocus();
    expect(screen.getByRole("button", { name: "Close dialog" })).toBeInTheDocument();
    act(() => kit.pressEscape());
    expect(dialog()).toBeNull();
    expect(latexes(kit)).toEqual(["", ""]);
  });

  it("z-test for proportions: Create waits for both cells, then writes zproptest(12,40)", async () => {
    const { kit, user } = await openWizard();
    await user.click(screen.getByRole("button", { name: "z-test for proportions" }));
    expect(create()).toBeDisabled();
    type(kit, "Sample 1 successes", "12");
    expect(create()).toBeDisabled();
    type(kit, "Sample 1 sample size", "40");
    await user.click(create());
    expect(latexes(kit)[1]).toBe("\\operatorname{zproptest}\\left(12,40\\right)");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("z-test Data and Stats, one and two samples", async () => {
    const { kit, user } = await openWizard();
    await user.click(screen.getByRole("button", { name: "z-test" }));
    type(kit, "Sample 1 list of data", "1,2,3");
    type(kit, "Sample 1 pop stdev", "2");
    await user.click(screen.getByRole("button", { name: /Sample 2/ }));
    type(kit, "Sample 2 list of data", "4,5,6,7");
    type(kit, "Sample 2 pop stdev", "3");
    await user.click(create());
    expect(latexes(kit)[1]).toBe(
      "\\operatorname{ztest}\\left(\\left[1,2,3\\right],2,\\left[4,5,6,7\\right],3\\right)"
    );
  });

  it("t-test Stats writes ttest(n, mean, stdev); Back returns to the start", async () => {
    const { kit, user } = await openWizard();
    await user.click(screen.getByRole("button", { name: "t-test" }));
    await user.click(screen.getByRole("radio", { name: "Stats" }));
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "sample size",
      "mean",
      "stdev",
    ]);
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "t-test" }));
    type(kit, "Sample 1 list of data", "1,2,3,4,5");
    await user.click(create());
    expect(latexes(kit)[1]).toBe("\\operatorname{ttest}\\left(\\left[1,2,3,4,5\\right]\\right)");
  });

  it("χ² test for independence: the filled table's columns, growing as it fills", async () => {
    const { kit, user } = await openWizard();
    await user.click(screen.getByRole("button", { name: "χ2 test for independence" }));
    expect(screen.getAllByRole("rowheader").map((h) => h.textContent)).toEqual([
      "Group A",
      "Group B",
      "Group C",
    ]);
    type(kit, "Group A, Group 1", "10");
    type(kit, "Group A, Group 2", "20");
    type(kit, "Group B, Group 1", "30");
    expect(create()).toBeDisabled();
    type(kit, "Group B, Group 2", "25");
    type(kit, "Group A, Group 3", ""); // an empty cell beyond the filled table is no column
    await user.click(create());
    expect(latexes(kit)[1]).toBe(
      "\\operatorname{chisqtest}\\left(\\left[10,30\\right],\\left[20,25\\right]\\right)"
    );
  });

  it("χ² goodness of fit: observed alone, or with expected, and the totals warning", async () => {
    const { kit, user } = await openWizard();
    await user.click(screen.getByRole("button", { name: "χ2 goodness of fit test" }));
    type(kit, "Observed 1", "10");
    type(kit, "Observed 2", "20");
    type(kit, "Observed 3", "30");
    type(kit, "Expected (optional) 1", "1");
    expect(create()).toBeDisabled(); // expected only part-filled
    type(kit, "Expected (optional) 2", "1");
    type(kit, "Expected (optional) 3", "2");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Expected and observed totals don't match."
    );
    await user.click(create());
    expect(latexes(kit)[1]).toBe(
      "\\operatorname{chisqgof}\\left(\\left[10,20,30\\right],\\left[1,1,2\\right]\\right)"
    );
  });

  it("Probability Distribution: normaldist() with no parameters, binomialdist once trials are in", async () => {
    const { kit, user } = await openWizard();
    await user.click(screen.getByRole("button", { name: "Probability Distribution" }));
    await user.click(create());
    expect(latexes(kit)[1]).toBe("\\operatorname{normaldist}\\left(\\right)");
    await user.click(screen.getByRole("button", { name: "Add item" }));
    await user.click(screen.getByRole("menuitem", { name: "Add inference object" }));
    await user.click(screen.getByRole("button", { name: "Probability Distribution" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Distribution" }), {
      target: { value: "binomialdist" },
    });
    expect(create()).toBeDisabled();
    type(kit, "trials", "10");
    await user.click(create());
    expect(latexes(kit)[2]).toBe("\\operatorname{binomialdist}\\left(10\\right)");
  });
});

describe("the inference row (FN-59)", { timeout: 30000 }, () => {
  it("opens its sections, shows Desmos's numbers, follows the tails and exports to the list", async () => {
    const kit = renderEditor(<ExpressionPanel {...panelProps()} />, {
      rows: ["\\operatorname{zproptest}\\left(12,40\\right)"],
    });
    const user = userEvent.setup();
    const row = () => within(rowItem("1"));
    await row().findByText("successes, sample size", {}, SLOW);
    const ci = row().getByRole("button", { name: "Confidence Interval" });
    expect(ci).toHaveAttribute("aria-expanded", "false");
    await user.click(ci);
    expect(row().getByRole("img", { name: /from 0.158 to 0.442/ })).toBeInTheDocument();
    await user.click(row().getByRole("button", { name: "Hypothesis Test" }));
    expect(row().getByRole("img", { name: /p-value 0.011, z = −2.53, both tails shaded/ })).toBeInTheDocument(); // prettier-ignore
    await user.click(row().getByRole("radio", { name: "Left" }));
    expect(row().getByRole("img", { name: /p-value 0.006, z = −2.53, the left tail shaded/ })).toBeInTheDocument(); // prettier-ignore
    act(() => kit.engine.undo());
    expect(row().getByRole("radio", { name: "Both" })).toBeChecked();

    // the CI outputs: export the lower bound; the test is named T_1 and the row goes after it
    await user.click(row().getAllByRole("button", { name: "View numerical outputs" })[0]);
    const outputs = screen.getByRole("dialog", { name: "Confidence interval outputs" });
    expect(
      within(outputs)
        .getAllByRole("row")
        .map((r) => r.textContent)
    ).toEqual([
      "Lower bound0.15799",
      "Upper bound0.44201",
      "Point estimate0.3",
      "Standard error0.07246",
      "Degrees of freedomundefined",
    ]);
    await user.click(within(outputs).getByRole("button", { name: "Export Lower bound to the expression list" })); // prettier-ignore
    expect(latexes(kit)).toEqual([
      "T_{1}=\\operatorname{zproptest}\\left(12,40\\right)",
      "T_{1}.\\operatorname{conf}\\left(0.95\\right).\\operatorname{lower}",
    ]);
    expect(kit.announcer.texts).toContain("Expression 2 added");
    await waitFor(
      () => expect(kit.engine.getSnapshot().rows[1].valueText).toBe("0.157987117455"),
      SLOW
    );
  });

  it("a null value typed in the field moves the score, and its export carries it", async () => {
    const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["T=\\operatorname{zproptest}\\left(12,40\\right)"] }); // prettier-ignore
    const user = userEvent.setup();
    const row = () => within(rowItem("1"));
    await user.click(await row().findByRole("button", { name: "Hypothesis Test" }, SLOW));
    type(kit, "Null hypothesis value", "0.4");
    await row().findByRole("img", { name: /z = −1.291/ }, SLOW);
    await user.click(row().getByRole("radio", { name: "Left" }));
    await user.click(row().getByRole("button", { name: "View numerical outputs" }));
    await user.click(screen.getByRole("button", { name: "Export p-value to the expression list" }));
    expect(latexes(kit)[1]).toBe("T.\\operatorname{null}\\left(0.4\\right).\\operatorname{pleft}");
    await waitFor(
      () => expect(kit.engine.getSnapshot().rows[1].valueText).toBe("0.0983528012295"),
      SLOW
    );
  });

  it("a χ² test shows the Observed (Expected) table with contributions and totals, and no tails", async () => {
    renderEditor(<ExpressionPanel {...panelProps()} />, {
      rows: ["\\operatorname{chisqtest}\\left(\\left[10,30\\right],\\left[20,25\\right]\\right)"],
    });
    const user = userEvent.setup();
    const row = () => within(rowItem("1"));
    await user.click(await row().findByRole("button", { name: "Observed (Expected)" }, SLOW));
    expect(row().getByRole("checkbox", { name: "Expected" })).toBeChecked();
    expect(
      row()
        .getAllByRole("cell")
        .map((c) => c.textContent)
    ).toEqual(["", "10 (14.12)", "20 (15.88)", "30 (25.88)", "25 (29.12)"]);
    await user.click(row().getByRole("checkbox", { name: "Totals" }));
    expect(row().getByRole("rowheader", { name: "Total" })).toBeInTheDocument();
    await user.click(row().getByRole("button", { name: "Hypothesis Test" }));
    expect(row().queryByRole("radio")).toBeNull();
    expect(row().getByRole("img", { name: /p-value 0.061, df 1, χ² = 3.506/ })).toBeInTheDocument();
  });

  it("`T.null(h)` shows the tails and the diagram only, `T.conf(c)` the interval only", async () => {
    renderEditor(<ExpressionPanel {...panelProps()} />, {
      rows: [
        "T=\\operatorname{ttest}\\left(\\left[1,2,3,4,5\\right]\\right)",
        "T.\\operatorname{null}\\left(1\\right)",
        "T.\\operatorname{conf}\\left(0.9\\right)",
      ],
    });
    expect(await within(rowItem("2")).findByRole("img", { name: /p-value 0.047, df 4, t = 2.828/ })).toBeInTheDocument(); // prettier-ignore
    expect(within(rowItem("2")).getAllByRole("radio")).toHaveLength(3);
    expect(within(rowItem("3")).getByRole("img", { name: /from 1.493 to 4.507/ })).toBeInTheDocument(); // prettier-ignore
    expect(within(rowItem("3")).queryByRole("radio")).toBeNull();
  });
});
