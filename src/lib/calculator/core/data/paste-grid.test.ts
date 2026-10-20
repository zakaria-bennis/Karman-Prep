import { expect, it } from "vitest";
import { parsePastedGrid } from "./paste-grid";

it("TABLES-49 tab, comma, semicolon, pipe and quoted CSV grids become columns", () => {
  expect(parsePastedGrid("1\t2\n3\t4\n5\t6")).toEqual([
    ["1", "3", "5"],
    ["2", "4", "6"],
  ]);
  expect(parsePastedGrid("time,height\n1,2\n3,4\n5,6")).toEqual([
    ["1", "3", "5"],
    ["2", "4", "6"],
  ]);
  expect(parsePastedGrid("1;2\n3;4")).toEqual([
    ["1", "3"],
    ["2", "4"],
  ]);
  expect(parsePastedGrid("1|2\n3|4\n5|6")).not.toBeNull();
  expect(parsePastedGrid('"1,000","2"\n"3","4,500"')).toEqual([
    ["1000", "3"],
    ["2", "4500"],
  ]);
  expect(parsePastedGrid("1\t\n3\t4\n\n-.25\t2.")).toEqual([
    ["1", "3", "-.25"],
    ["", "4", "2."],
  ]);
});

it("TABLES-49 at most 6 columns are kept", () => {
  const grid = parsePastedGrid("1,2,3,4,5,6,7,8\n1,2,3,4,5,6,7,8");
  expect(grid).toHaveLength(6);
});

it("TABLES-50 one data row, text, 1e3, spaces and ragged rows are not grids", () => {
  for (const text of [
    "x\ty\n1\t2",
    "1\tx\n3\t4",
    "1 2\n3 4",
    "1e3\t2\n3\t4",
    "1\n2\t3\n4\t5",
    "1,000\t2\n\n3\t4,500",
    "1\n2\n3",
  ]) {
    expect(parsePastedGrid(text)).toBeNull();
  }
});
