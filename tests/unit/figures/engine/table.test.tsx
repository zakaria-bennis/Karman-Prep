// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import MathText from "@/components/learn/MathText";
import TableView from "@/components/learn/figures/TableView";
import { tableDataToSpec, TableDataError } from "@/lib/figures/engine/from-table-data";
import { parseFigureSpec, type FigureSpec } from "@/lib/figures/engine/spec";
import {
  isNumericCell,
  layoutTable,
  plainWords,
  splitDecimal,
  textWidthEm,
  tightenUnits,
} from "@/lib/figures/engine/table";
import type { QuestionTableData } from "@/types/question-table";

const dir = path.resolve(__dirname, "../../../fixtures/tables");
type Fixture = {
  id: string;
  figure_table_data?: QuestionTableData;
  choice_table_data?: QuestionTableData;
};
const fixtures: Fixture[] = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")));
const dataOf = (f: Fixture) => (f.figure_table_data ?? f.choice_table_data)!;
const fixture = (id: string) => {
  const found = fixtures.find((f) => f.id === id);
  if (!found) throw new Error(`missing fixture ${id}`);
  return dataOf(found);
};

/** Seigniorage of US coins: negative decimals under long headings, with a title. */
const COINS = "74e6c53a-8da4-4f0c-9236-0501763174e7";
/** Days of lake ice: eight columns, the widest live table. */
const LAKES = "02c3a10d-dc67-408c-9101-a015ec5878fd";
/** A table answer choice of fractions in math. */
const FRACTIONS = "ee2e493b-d558-43c6-b98a-e4ac276863be";
/** Subject by grade level: a merged "Grade level" heading over four columns. */
const GRADES = "368cec6c-7481-4044-8b13-2631235b6ba9";

const twoWay: FigureSpec = {
  version: "figure-spec/1",
  type: "table",
  parts: [
    {
      kind: "table",
      id: "t1",
      header: ["", "Black", "Brown", "Total"],
      rows: [
        ["Male", "4", "6", "10"],
        ["Female", "5", "5", "10"],
      ],
      blankCorner: true,
    },
  ],
  labels: [],
  marks: [],
};

/** Body cells of column `c`, row by row. */
const column = (container: HTMLElement, c: number) =>
  Array.from(container.querySelectorAll("tbody tr")).map((tr) => tr.children[c] as HTMLElement);

describe("tables", () => {
  it("numbers align on the decimal point", () => {
    const spec = tableDataToSpec(fixture(COINS));
    const { container } = render(<TableView spec={spec} renderMath={false} />);
    const model = layoutTable(spec);
    for (const c of [1, 2, 3, 4]) {
      const cells = column(container, c);
      const ints = cells.map((td) => td.querySelector<HTMLElement>("[data-int]")!);
      const fracs = cells.map((td) => td.querySelector<HTMLElement>("[data-frac]")!);
      for (const td of cells) {
        expect(td.getAttribute("data-align")).toBe("decimal");
        expect(td.className).toContain("text-center");
      }
      // Every cell in the column draws the same two boxes: the integer part right-aligned
      // in one, the decimal point and fraction left-aligned in the other. The boxes are
      // wider than any cell's text, so the decimal point sits at the same x in every row.
      const intWidths = new Set(ints.map((s) => s.style.minWidth));
      const fracWidths = new Set(fracs.map((s) => s.style.minWidth));
      expect(intWidths.size).toBe(1);
      expect(fracWidths.size).toBe(1);
      for (const s of ints) expect(s.className).toContain("text-right");
      for (const s of fracs) expect(s.className).toContain("text-left");
      const layout = model.decimal[c]!;
      expect([...intWidths][0]).toBe(`${layout.intEm}em`);
      for (const [i, td] of cells.entries()) {
        expect(textWidthEm(ints[i].textContent!)).toBeLessThanOrEqual(layout.intEm);
        expect(textWidthEm(fracs[i].textContent!)).toBeLessThanOrEqual(layout.fracEm);
        expect(td.textContent).toBe(ints[i].textContent! + fracs[i].textContent!);
      }
    }
    // A minus sign, not a hyphen, and the fraction keeps its decimal point.
    const seigniorage = column(container, 3);
    expect(seigniorage[0].querySelector("[data-int]")!.textContent).toBe("−86");
    expect(seigniorage[0].querySelector("[data-frac]")!.textContent).toBe(".0");
  });

  it("splits a number at its decimal point", () => {
    expect(splitDecimal("62.79")).toEqual({ int: "62", frac: ".79" });
    expect(splitDecimal("-2.08")).toEqual({ int: "−2", frac: ".08" });
    expect(splitDecimal("$141,510")).toEqual({ int: "$141,510", frac: "" });
    expect(splitDecimal("12.5%")).toEqual({ int: "12", frac: ".5%" });
    expect(splitDecimal("1980–81")).toEqual({ int: "1980–81", frac: "" });
  });

  it("text cells are left-aligned", () => {
    const spec = tableDataToSpec(fixture(COINS));
    const { container } = render(<TableView spec={spec} renderMath={false} />);
    for (const cell of column(container, 0)) {
      expect(cell.getAttribute("data-align")).toBe("left");
      expect(cell.className).toContain("text-left");
    }
    // A number among word labels is still a number; a word among numbers is still text.
    const mixed = layoutTable({
      ...twoWay,
      parts: [
        {
          kind: "table",
          id: "t1",
          header: ["UV index", "Days"],
          rows: [
            ["1", "9"],
            ["Cloudy", "4"],
          ],
        },
      ],
    });
    expect(mixed.rows.map((r) => r[0].align)).toEqual(["decimal", "left"]);
  });

  it("blankCorner leaves the top-left header cell empty", () => {
    const { container, getAllByRole } = render(<TableView spec={twoWay} renderMath={false} />);
    const corner = container.querySelector("thead tr")!.children[0] as HTMLElement;
    expect(corner.tagName).toBe("TD");
    expect(corner.textContent).toBe("");
    expect(corner.hasAttribute("data-table-corner")).toBe(true);
    expect(getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Black",
      "Brown",
      "Total",
    ]);
    expect(getAllByRole("rowheader").map((th) => th.textContent)).toEqual(["Male", "Female"]);
    // Old data marks the corner with an empty first heading.
    const part = tableDataToSpec({ header_row: ["", "Black"], rows: [["Male", "4"]] }).parts[0];
    expect(part).toMatchObject({ kind: "table", blankCorner: true });
  });

  it("math in cells is typeset like question text", () => {
    const spec = tableDataToSpec(fixture(FRACTIONS));
    const { container } = render(<TableView spec={spec} />);
    const cell = column(container, 1)[0];
    const source = String.raw`$\dfrac{59}{15}$`;
    expect(cell.querySelector(".katex")).not.toBeNull();
    const { container: text } = render(<MathText text={source} />);
    expect(cell.firstElementChild!.innerHTML).toBe(text.firstElementChild!.innerHTML);
    expect(cell.getAttribute("data-align")).toBe("center");
    // A number written as math is still a number, aligned with the rest of its column.
    expect(column(container, 0)[0].getAttribute("data-align")).toBe("decimal");
    expect(column(container, 0)[0].textContent).toBe("1");
  });

  it("wrapper has overflow-x:auto and the table never sets a width wider than its container", () => {
    for (const id of [LAKES, COINS]) {
      const { container, unmount } = render(<TableView spec={tableDataToSpec(fixture(id))} />);
      const table = container.querySelector("table")!;
      const frame = table.parentElement!;
      expect(frame.className).toContain("overflow-x-auto");
      expect(frame.className).toContain("max-w-full");
      expect(container.querySelector("figure")!.className).toContain("max-w-full");
      expect(table.hasAttribute("width")).toBe(false);
      expect(table.style.width).toBe("");
      expect(table.style.minWidth).toBe("");
      expect(table.className).not.toMatch(/(^|\s)(min-)?w-(\[|screen|\d)/);
      for (const el of container.querySelectorAll<HTMLElement>("th, td, col")) {
        expect(el.style.width).toBe("");
        expect(el.hasAttribute("width")).toBe(false);
      }
      unmount();
    }
  });

  it("merged headings span their columns, with one header style", () => {
    const { container } = render(
      <TableView spec={tableDataToSpec(fixture(GRADES))} renderMath={false} />
    );
    const group = container.querySelector("th[scope=colgroup]")!;
    expect(group.textContent).toBe("Grade level");
    expect(group.getAttribute("colspan")).toBe("4");
    const heads = Array.from(container.querySelectorAll("thead th"));
    const style = (el: Element) =>
      el.className
        .split(/\s+/)
        .filter((c) => /^(font-|text-(center|left|right|base|lg|sm)|md:text-)/.test(c))
        .sort()
        .join(" ");
    expect(new Set(heads.map(style)).size).toBe(1);
  });

  it("uses one rule weight and only theme colors", () => {
    const { container } = render(<TableView spec={tableDataToSpec(fixture(LAKES))} />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(html).not.toMatch(/border-(2|4|8)\b/);
    expect(html).not.toMatch(/rgb\(|hsl\(/);
  });

  it("tableDataToSpec round-trips every fixture in tests/fixtures/tables", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(8);
    for (const f of fixtures) {
      const data = dataOf(f);
      const spec = tableDataToSpec(data);
      const parsed = parseFigureSpec(spec);
      expect(parsed.ok, f.id).toBe(true);
      expect(spec.type).toBe("table");
      expect(spec.title).toBe(data.caption || undefined);
      const part = spec.parts[0];
      if (part.kind !== "table") throw new Error("not a table");
      expect(part.rows, f.id).toEqual(data.rows);
      expect(part.header, f.id).toEqual(data.header_row?.length ? data.header_row : undefined);
      expect(part.note, f.id).toBe(data.footer_note || undefined);
      expect(part.groups, f.id).toEqual(data.header_groups ?? undefined);
      // and it renders every cell
      const { container, unmount } = render(<TableView spec={spec} />);
      expect(container.querySelectorAll("tbody tr")).toHaveLength(data.rows.length);
      unmount();
    }
  });

  it("refuses data that is not a table", () => {
    expect(() => tableDataToSpec({ rows: "nope" })).toThrow(TableDataError);
    expect(() => tableDataToSpec({ rows: [] })).toThrow(TableDataError);
  });
});

describe("table cell text", () => {
  it("treats counts, money, percents and ranges as numbers", () => {
    for (const v of ["12", "1,250", "3.5", "$4.99", "12.5%", "-3", "(42)", "1980-81", "10–20"])
      expect(isNumericCell(v), v).toBe(true);
    for (const v of ["Mexico", "United States", "12 countries", "Year 2", ""])
      expect(isNumericCell(v), v).toBe(false);
  });

  it("splits plain text into unbreakable words and leaves math for the math renderer", () => {
    expect(plainWords("Lake  Neusiedl 1980-81")).toEqual([
      "Lake",
      "  ",
      "Neusiedl",
      " ",
      "1980-81",
    ]);
    expect(plainWords("$x^2$")).toBeNull();
    expect(plainWords("\\frac{1}{2}")).toBeNull();
    expect(plainWords("<b>bold</b>")).toBeNull();
    expect(plainWords("___")).toBeNull();
  });

  it("keeps currency and unit symbols against the number", () => {
    expect(tightenUnits("$ 4.99")).toBe("$4.99");
    expect(tightenUnits("€ 1,250")).toBe("€1,250");
    expect(tightenUnits("12 %")).toBe("12%");
    expect(tightenUnits("(−$ 3)")).toBe("(−$3)");
    expect(tightenUnits("45 ¢")).toBe("45¢");
    for (const v of ["$4.99", "12.5%", "12 countries", "Year 2", "$x$"])
      expect(tightenUnits(v)).toBe(v);
  });
});
