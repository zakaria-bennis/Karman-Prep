// @vitest-environment jsdom
//
// Tests for QuestionTable — the Phase 9A accessible HTML table renderer.
// The structured-figure pipeline's whole point is that tables become
// real, accessible HTML instead of screenshots, so the a11y semantics
// are the contract worth locking:
//   · header cells are <th scope="col">
//   · with a multi-column header, each row's first cell is <th scope="row">
//   · the caption renders as a semantic <caption>
//   · footer notes render
//   · a headerless / captionless table still has an accessible name
//
// renderMath={false} keeps cells as plain text (no KaTeX) so queries are
// simple — KaTeX rendering is exercised elsewhere.

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import QuestionTable from "./QuestionTable";
import { TableChoiceOption } from "./quiz/TableChoiceOption";

const withHeaderAndRowLabels = {
  caption: "State data",
  header_row: ["State", "Population", "Capital"],
  rows: [
    ["California", "39M", "Sacramento"],
    ["Texas", "30M", "Austin"],
  ],
  footer_note: "Source: 2020 Census",
};

describe("QuestionTable — two-way table with a blank corner", () => {
  const twoWay = {
    header_row: ["", "Black", "Brown", "Total"],
    rows: [
      ["Male", "4", "6", "10"],
      ["Female", "5", "5", "10"],
    ],
  };

  it("draws the blank corner as a ruled cell, not a column heading", () => {
    const { container, getAllByRole } = render(<QuestionTable data={twoWay} renderMath={false} />);
    const headRow = container.querySelector("thead tr");
    expect(headRow?.children).toHaveLength(4);
    const corner = headRow?.children[0] as HTMLElement;
    expect(corner.tagName).toBe("TD");
    expect(corner.hasAttribute("data-table-corner")).toBe(true);
    expect(corner.className).toContain("border-b");
    expect(getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Black",
      "Brown",
      "Total",
    ]);
    expect(getAllByRole("rowheader").map((th) => th.textContent)).toEqual(["Male", "Female"]);
  });
});

describe("QuestionTable — accessibility semantics", () => {
  it("marks header cells with scope=col", () => {
    const { getAllByRole } = render(
      <QuestionTable data={withHeaderAndRowLabels} renderMath={false} />
    );
    const colHeaders = getAllByRole("columnheader");
    expect(colHeaders).toHaveLength(3);
    for (const th of colHeaders) {
      expect(th.tagName).toBe("TH");
      expect(th.getAttribute("scope")).toBe("col");
    }
  });

  it("promotes each row's first cell to th scope=row when the header is multi-column", () => {
    const { getAllByRole } = render(
      <QuestionTable data={withHeaderAndRowLabels} renderMath={false} />
    );
    const rowHeaders = getAllByRole("rowheader");
    expect(rowHeaders.map((th) => th.textContent)).toEqual(["California", "Texas"]);
    for (const th of rowHeaders) expect(th.getAttribute("scope")).toBe("row");
  });

  it("renders the caption as a semantic <caption> element", () => {
    const { container } = render(
      <QuestionTable data={withHeaderAndRowLabels} renderMath={false} />
    );
    const caption = container.querySelector("table > caption");
    expect(caption).not.toBeNull();
    expect(caption?.textContent).toContain("State data");
  });

  it("renders the footer note", () => {
    const { container } = render(
      <QuestionTable data={withHeaderAndRowLabels} renderMath={false} />
    );
    expect(container.querySelector("tfoot")?.textContent).toBe("Source: 2020 Census");
  });
});

describe("QuestionTable — headerless / captionless tables", () => {
  const headerless = {
    caption: null,
    header_row: null,
    rows: [
      ["1", "2"],
      ["3", "4"],
    ],
    footer_note: null,
  };

  it("does not produce row headers without a multi-column header", () => {
    const { queryAllByRole } = render(<QuestionTable data={headerless} renderMath={false} />);
    expect(queryAllByRole("rowheader")).toHaveLength(0);
    expect(queryAllByRole("columnheader")).toHaveLength(0);
  });

  it("gives the figure an accessible name when there is no caption", () => {
    const { container } = render(<QuestionTable data={headerless} renderMath={false} />);
    const figure = container.querySelector("figure");
    expect(figure?.getAttribute("aria-label")).toBe("Question data table");
  });
});

describe("QuestionTable — grouped column headers", () => {
  it("spans a group heading over only its columns", () => {
    const { container } = render(
      <QuestionTable
        data={{
          header_groups: [
            { label: "", span: 1 },
            { label: "Grade level", span: 2 },
          ],
          header_row: ["Subject", "Sixth", "Seventh"],
          rows: [["English", "4", "9"]],
        }}
        renderMath={false}
      />
    );
    const group = container.querySelector("th[scope=colgroup]")!;
    expect(group.textContent).toBe("Grade level");
    expect(group.getAttribute("colspan")).toBe("2");
    expect(group.getAttribute("scope")).toBe("colgroup");
  });
});

describe("QuestionTable — wide-table density", () => {
  const wide = (n: number) => ({
    header_row: Array.from({ length: n }, (_, i) => `Column heading ${i + 1}`),
    rows: [Array.from({ length: n }, (_, i) => `v${i}`)],
  });
  it("uses large, roomy, compact, then dense cells as columns grow", () => {
    const tier = (n: number) =>
      render(<QuestionTable data={wide(n)} renderMath={false} />).container.querySelector("figure")
        ?.dataset.tableDensity;
    expect([tier(4), tier(5), tier(6), tier(8)]).toEqual(["large", "roomy", "compact", "dense"]);
  });
  it("shrinks padding and type but keeps legible size and wrapping headers", () => {
    const { container } = render(<QuestionTable data={wide(8)} renderMath={false} />);
    const th = container.querySelector("thead th") as HTMLElement;
    expect(th.className).toContain("group-data-[table-density=dense]/table:px-1.5");
    expect(th.className).toContain("group-data-[table-density=dense]/table:text-[13px]");
    expect(th.className).not.toContain("whitespace-nowrap");
    // The sideways scroll lives inside the frame, not on the frame itself.
    expect(container.querySelector("figure > div > div")?.className).toContain("overflow-x-auto");
  });
});

describe("QuestionTable — words never break", () => {
  const data = {
    header_row: ["Country", "Exports (millions)"],
    rows: [
      ["Mexico", "1,250"],
      ["United States", "12.5%"],
    ],
  };
  it("wraps only at spaces in every cell, with no hyphenation", () => {
    const { container } = render(<QuestionTable data={data} renderMath={false} />);
    const cells = Array.from(container.querySelectorAll("th, td"));
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.className).toContain("[word-break:normal]");
      expect(cell.className).toContain("[overflow-wrap:normal]");
      expect(cell.className).toContain("[hyphens:none]");
      expect(cell.className).not.toContain("overflow-wrap:anywhere");
      expect(cell.className).not.toContain("break-all");
    }
  });
  it("keeps numbers on one line but lets word cells wrap at spaces", () => {
    const { getByText } = render(<QuestionTable data={data} renderMath={false} />);
    expect(getByText("1,250").closest("td")?.className).toContain("whitespace-nowrap");
    expect(getByText("12.5%").closest("td")?.className).toContain("whitespace-nowrap");
    expect(getByText("United").closest("th")?.className).not.toContain("whitespace-nowrap");
  });
  it("renders each word unbreakable so hyphenated words like 1980-81 stay whole", () => {
    const { container } = render(
      <QuestionTable
        data={{ header_row: ["Lake", "1980-81"], rows: [["Lake Neusiedl", "77"]] }}
        renderMath={false}
      />
    );
    const words = Array.from(container.querySelectorAll("span.whitespace-nowrap")).map(
      (s) => s.textContent
    );
    expect(words).toEqual(expect.arrayContaining(["1980-81", "Lake", "Neusiedl"]));
    expect(container.querySelector("tbody th")?.textContent).toBe("Lake Neusiedl");
  });
});

describe("QuestionTable — founder review 2026-10-22", () => {
  it("centres numeric row labels and keeps word labels left", () => {
    const { getByText } = render(
      <QuestionTable
        data={{
          header_row: ["UV index", "Days"],
          rows: [
            ["1", "9"],
            ["Cloudy", "4"],
          ],
        }}
        renderMath={false}
      />
    );
    expect(getByText("1").closest("th")?.className).toContain("text-center");
    expect(getByText("Cloudy").closest("th")?.className).toContain("text-left");
    expect(getByText("9").closest("td")?.className).toContain("text-center");
  });
  it("keeps currency and percent symbols tight to the number", () => {
    const { container } = render(
      <QuestionTable
        data={{
          header_row: ["Item", "Cost"],
          rows: [
            ["Pen", "$ 4"],
            ["Tax", "8 %"],
          ],
        }}
        renderMath={false}
      />
    );
    expect(container.textContent).toContain("$4");
    expect(container.textContent).toContain("8%");
  });
  it("starts with 18px type and gives the frame no padding, so row rules reach the border", () => {
    const { container } = render(
      <QuestionTable data={{ header_row: ["x", "y"], rows: [["0", "1"]] }} renderMath={false} />
    );
    const figure = container.querySelector("figure")!;
    expect(figure.className).not.toMatch(/(^|\s)p[xy]?-\d/);
    expect(container.querySelector("td")?.className).toContain("text-lg");
  });
});

describe("TableChoiceOption — answer-choice tables", () => {
  it("adds no padding inside the table frame, so row rules touch its border", () => {
    const { container } = render(
      <TableChoiceOption
        id="c-a"
        groupName="g"
        letter="A"
        table={{ header_row: ["x", "y"], rows: [["0", "43"]] }}
        selected={false}
        submitted={false}
        correct={false}
        onSelect={() => undefined}
        readOnly
      />
    );
    const figure = container.querySelector("figure")!;
    expect(figure.className).not.toMatch(/(^|\s)p[xy]?-\d/);
  });
});
