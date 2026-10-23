import { describe, expect, it } from "vitest";
import { describeChoiceTable, isValidChoiceTableData } from "./choice-table";

const sourceTable = {
  header_row: ["x", "y"],
  rows: [
    ["1", "69/10"],
    ["2", "63/10"],
    ["4", "51/10"],
  ],
};

describe("answer-choice table validation", () => {
  it("accepts a complete source table and makes its data readable as text", () => {
    expect(isValidChoiceTableData(sourceTable)).toBe(true);
    expect(describeChoiceTable(sourceTable)).toBe("x 1, y 69/10; x 2, y 63/10; x 4, y 51/10");
  });

  it("rejects missing cells and inconsistent row widths", () => {
    expect(isValidChoiceTableData({ ...sourceTable, rows: [["1", ""]] })).toBe(false);
    expect(isValidChoiceTableData({ ...sourceTable, rows: [["1"]] })).toBe(false);
    expect(isValidChoiceTableData({ ...sourceTable, rows: [] })).toBe(false);
  });

  it("accepts a blank top-left corner on a two-way table, and no other blank header", () => {
    const twoWay = {
      header_row: ["", "Black", "Brown", "Total"],
      rows: [
        ["Male", "4", "6", "10"],
        ["Female", "5", "5", "10"],
      ],
    };
    expect(isValidChoiceTableData(twoWay)).toBe(true);
    expect(describeChoiceTable(twoWay)).toBe(
      "Male, Black 4, Brown 6, Total 10; Female, Black 5, Brown 5, Total 10"
    );
    expect(isValidChoiceTableData({ ...twoWay, header_row: ["", "", "Brown", "Total"] })).toBe(
      false
    );
    expect(isValidChoiceTableData({ ...twoWay, header_row: ["Eye", "Black", "", "Total"] })).toBe(
      false
    );
    expect(
      isValidChoiceTableData({ ...twoWay, header_row: [" ", "Black", "Brown", "Total"] })
    ).toBe(false);
    expect(isValidChoiceTableData({ header_row: [""], rows: [["4"]] })).toBe(false);
  });
});
