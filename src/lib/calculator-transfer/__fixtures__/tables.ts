// Question-table fixtures (TR-22 to TR-24, c-transfer table 5.1 and section 14): every row of the
// section 5 example table, plus `30,000`, `\frac{1}{3}`, `0.\overline{3}`, `-2 1/2`, a blank cell,
// a nine-column table and the count limits. Original synthetic data only.

export interface TableFixture {
  id: string;
  rules: string[];
  headers: string[] | null; // figure_table_data.header_row
  rows: string[][];
  expect:
    | { control: false; rule: string }
    | { control: true; headers: (string | null)[]; columns: string[][] };
}

let n = 0;
const id = () => `tables-${++n}`;
const range = (count: number, from = 0) => Array.from({ length: count }, (_, k) => `${from + k}`);

export const TABLE_FIXTURES: readonly TableFixture[] = [
  // Table 5.1's examples, in order.
  {
    id: id(),
    rules: ["TR-22", "TR-23"],
    headers: ["x", "y"],
    rows: [
      ["1", "3"],
      ["2", "5"],
    ],
    expect: {
      control: true,
      headers: ["x", "y"],
      columns: [
        ["1", "2"],
        ["3", "5"],
      ],
    },
  },
  {
    id: id(),
    rules: ["TR-22", "TR-23"],
    headers: ["t", "$h(t)$"],
    rows: [
      ["0", "10"],
      ["1", "14"],
      ["2", "18"],
    ],
    expect: {
      control: true,
      headers: ["t", "h(t)"],
      columns: [
        ["0", "1", "2"],
        ["10", "14", "18"],
      ],
    },
  },
  {
    id: id(),
    rules: ["TR-22", "TR-23"],
    headers: ["x", "f(x)", "g(x)"],
    rows: [
      ["1", "2", "3"],
      ["4", "5", "6"],
    ],
    expect: {
      control: true,
      headers: ["x", "f(x)", "g(x)"],
      columns: [
        ["1", "4"],
        ["2", "5"],
        ["3", "6"],
      ],
    },
  },
  {
    id: id(),
    rules: ["TR-22", "TR-23"],
    headers: ["x", "0", "1", "2"],
    rows: [["y", "3", "5", "7"]],
    expect: {
      control: true,
      headers: ["x", "y"],
      columns: [
        ["0", "1", "2"],
        ["3", "5", "7"],
      ],
    },
  },
  {
    id: id(),
    rules: ["TR-22", "TR-23"],
    headers: null,
    rows: [
      ["x", "0", "1"],
      ["y", "3", "5"],
    ],
    expect: {
      control: true,
      headers: ["x", "y"],
      columns: [
        ["0", "1"],
        ["3", "5"],
      ],
    },
  },
  {
    id: id(),
    rules: ["TR-22", "TR-23"],
    headers: ["", "2019", "2020"],
    rows: [["Sales", "5", "7"]],
    expect: {
      control: true,
      headers: [null, "Sales"],
      columns: [
        ["2019", "2020"],
        ["5", "7"],
      ],
    },
  },
  {
    id: id(),
    rules: ["TR-22", "TR-24"],
    headers: ["Year", "Population"],
    rows: [["1990", "30,000"]],
    expect: { control: true, headers: ["Year", "Population"], columns: [["1990"], ["30000"]] },
  },
  {
    id: id(),
    rules: ["TR-22", "TR-23"],
    headers: ["Score"],
    rows: [["85"], ["90"]],
    expect: { control: true, headers: ["Score"], columns: [["85", "90"]] },
  },
  {
    id: id(),
    rules: ["TR-22"],
    headers: ["", "Yes", "No", "Total"],
    rows: [["Male", "12", "8", "20"]],
    expect: { control: false, rule: "TR-22" },
  },
  {
    id: id(),
    rules: ["TR-24"],
    headers: ["x", "y"],
    rows: [
      ["1", "$12"],
      ["2", "5"],
    ],
    expect: { control: false, rule: "TR-24" },
  },
  {
    id: id(),
    rules: ["TR-24"],
    headers: ["x", "y"],
    rows: [
      ["1", "?"],
      ["2", "5"],
    ],
    expect: { control: false, rule: "TR-24" },
  },
  // Section 14's extra cases.
  {
    id: id(),
    rules: ["TR-24"],
    headers: ["x", "y"],
    rows: [
      ["$\\frac{1}{3}$", "2.50"],
      ["$0.\\overline{3}$", "-2 1/2"],
      ["30{,}000", "−4"],
    ],
    expect: {
      control: true,
      headers: ["x", "y"],
      columns: [
        ["\\frac{1}{3}", "\\frac{1}{3}", "30000"],
        ["2.50", "-\\frac{5}{2}", "-4"],
      ],
    },
  },
  {
    id: id(),
    rules: ["TR-24"],
    headers: ["x", "y"],
    rows: [
      ["1", ""],
      ["2", "5"],
    ],
    expect: { control: false, rule: "TR-24" },
  },
  {
    id: id(),
    rules: ["TR-23"],
    headers: range(9).map((k) => `c${k}`),
    rows: [range(9), range(9, 1)],
    expect: { control: false, rule: "TR-23" },
  },
  {
    id: id(),
    rules: ["TR-23"],
    headers: range(8).map((k) => `c${k}`),
    rows: [range(8)],
    expect: {
      control: true,
      headers: range(8).map((k) => `c${k}`),
      columns: range(8).map((k) => [k]),
    },
  },
  {
    id: id(),
    rules: ["TR-23"],
    headers: ["x", "y"],
    rows: range(201).map((k) => [k, k]),
    expect: { control: false, rule: "TR-23" },
  },
  {
    id: id(),
    rules: ["TR-23"],
    headers: ["x", "y"],
    rows: range(200).map((k) => [k, k]),
    expect: { control: true, headers: ["x", "y"], columns: [range(200), range(200)] },
  },
  {
    id: id(),
    rules: ["TR-23"],
    headers: ["x", "y"],
    rows: [],
    expect: { control: false, rule: "TR-23" },
  },
  // TR-24: units, currency, percent, text, a dash and a stand-in letter.
  ...["5 cm", "\\$4", "15%", "$15\\%$", "many", "—", "-", "k", "$k$", "$2x$"].map(
    (cell): TableFixture => ({
      id: id(),
      rules: ["TR-24"],
      headers: ["x", "y"],
      rows: [
        ["1", cell],
        ["2", "5"],
      ],
      expect: { control: false, rule: "TR-24" },
    })
  ),
  // TR-22: frequency with a total row, a two-way table, a mixed shape and a non-numeric table.
  {
    id: id(),
    rules: ["TR-22"],
    headers: ["Score", "Frequency"],
    rows: [
      ["1", "3"],
      ["2", "5"],
      ["Total", "8"],
    ],
    expect: { control: false, rule: "TR-24" },
  },
  {
    id: id(),
    rules: ["TR-22"],
    headers: ["", "Plan A", "Plan B"],
    rows: [
      ["Adults", "30", "12"],
      ["Children", "18", "9"],
    ],
    expect: { control: false, rule: "TR-22" },
  },
  {
    id: id(),
    rules: ["TR-22"],
    headers: ["x", "y"],
    rows: [["1", "2"], ["3"]],
    expect: { control: false, rule: "TR-22" },
  },
  {
    id: id(),
    rules: ["TR-22"],
    headers: ["Name", "Team"],
    rows: [["Ana", "Red"]],
    expect: { control: false, rule: "TR-24" },
  },
  {
    id: id(),
    rules: ["TR-22"],
    headers: null,
    rows: [
      ["x", "y"],
      ["1", "2"],
    ],
    expect: { control: false, rule: "TR-24" }, // a header written as a body row
  },
];
