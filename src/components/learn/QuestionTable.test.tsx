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

const withHeaderAndRowLabels = {
  caption: "State data",
  header_row: ["State", "Population", "Capital"],
  rows: [
    ["California", "39M", "Sacramento"],
    ["Texas", "30M", "Austin"],
  ],
  footer_note: "Source: 2020 Census",
};

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
    const { getByText } = render(
      <QuestionTable data={withHeaderAndRowLabels} renderMath={false} />
    );
    expect(getByText("Source: 2020 Census")).toBeTruthy();
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
