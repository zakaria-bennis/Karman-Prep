import { expect, it } from "vitest";
import { isSpacer, keypadLayout, layoutKeys, placeRow, type KeypadLayout } from "./keys";

/** Each row as tokens: a key id, `id*w` for a cell w of the block's inner width, `_w` / `_` spacers. */
const ids = (layout: KeypadLayout) =>
  layout.rows.map((row) =>
    row.map((item) => {
      if (isSpacer(item)) return item.spacer === "fill" ? "_" : `_${+item.spacer.toFixed(4)}`;
      return `${item.id}*${+item.width.toFixed(4)}`;
    })
  );
const u11 = (n: number) => +(n / 11).toFixed(4);
const u10 = +(1 / 10).toFixed(4);

it("VIS-KEYPAD-3, 4 the 123 page is an 11-unit grid with half-unit gaps, the same at every width", () => {
  for (const width of [1440, 900, 600, 375, 320]) {
    const page = keypadLayout("main", width, false);
    const gap = `_${u11(0.5)}`;
    const keys = (s: string) => s.split(" ").map((id) => `${id}*${u11(1)}`);
    expect(ids(page)).toEqual([
      [...keys("x y squared power"), gap, ...keys("7 8 9 divide"), gap, `functions*${u11(2)}`],
      [...keys("lparen rparen lt gt"), gap, ...keys("4 5 6 times"), gap, ...keys("left right")],
      [
        ...keys("abs comma le ge"),
        gap,
        ...keys("1 2 3 minus"),
        `_${u11(1)}`,
        `backspace*${u11(1.5)}`,
      ],
      [
        ...keys("letters audio sqrt pi"),
        gap,
        ...keys("0 point equals plus"),
        gap,
        `enter*${u11(2)}`,
      ],
    ]);
    expect(
      page.rows.map((r) =>
        r.reduce((sum, i) => sum + (isSpacer(i) ? (i.spacer as number) : i.width), 0)
      )
    ).toEqual([1, 1, 1, 1].map((n) => expect.closeTo(n, 9)));
  }
});

it("VIS-KEYPAD-6 to 8 digits, the point and the control keys are grey; operators and variables white; Enter is the accent", () => {
  const keys = layoutKeys(keypadLayout("main", 900, false));
  const tone = (t: string) => keys.filter((k) => k.tone === t).map((k) => k.id);
  expect(tone("dark").sort()).toEqual(
    [..."0123456789", "point", "letters", "audio", "functions", "left", "right", "backspace"].sort()
  );
  expect(tone("accent")).toEqual(["enter"]);
  expect(keys.find((k) => k.id === "x")).toMatchObject({
    name: "x",
    face: { kind: "math", text: "x", italic: true },
  });
  expect(keys.find((k) => k.id === "backspace")).toMatchObject({
    face: { kind: "icon", icon: "backspace" },
    label: "",
  });
});

it("VIS-KEYPAD-39 word labels follow the keypad width", () => {
  const label = (id: string, width: number) =>
    layoutKeys(keypadLayout("main", width, false)).find((k) => k.id === id)!.label;
  expect([label("functions", 450), label("functions", 449)]).toEqual(["functions", "funcs"]);
  expect([label("letters", 601), label("letters", 600)]).toEqual(["A B C", "ABC"]);
  expect(
    layoutKeys(keypadLayout("letters", 900, false)).find((k) => k.id === "letters")!.label
  ).toBe("1 2 3");
});

it("VIS-KEYPAD-21 the letters page has 10 columns, with 1.5- and 2-unit keys and spacers in its last rows", () => {
  const page = keypadLayout("letters", 900, false);
  const letters = (s: string) => s.split("").map((c) => `${c}*${u10}`);
  expect(ids(page)).toEqual([
    letters("qwertyuiop"),
    [...letters("asdfghjkl"), `theta*${u10}`],
    [`shift*${u11(1.5)}`, "_", ...letters("zxcvbnm"), "_", `backspace*${u11(1.5)}`],
    [
      `letters*${u11(2)}`,
      "_",
      ...["subscript", "bang", "bracket", "brace", "tilde", "colon"].map((id) => `${id}*${u10}`),
      "_",
      `enter*${u11(2)}`,
    ],
  ]);
});

it("VIS-KEYPAD-23 Shift capitalises letters, swaps θ for τ, aᵦ for aᵇ and selects each dual key's second symbol", () => {
  const key = (shift: boolean, id: string) =>
    layoutKeys(keypadLayout("letters", 900, shift)).find((k) => k.id === id)!;
  expect(key(true, "q")).toMatchObject({
    label: "Q",
    name: "Q",
    behaviour: { type: "insert", action: { op: "typedText", arg: "Q" } },
  });
  expect([key(false, "theta").name, key(true, "theta").name]).toEqual(["Theta", "Tau"]);
  expect([key(false, "subscript").name, key(true, "subscript").name]).toEqual([
    "Subscript",
    "Superscript",
  ]);
  // Desmos names these keys by their symbols, and the page's 123 key "Toggle Numbers" (owner
  // decision, 2026-10-21).
  const duals = ["bang", "bracket", "brace", "tilde", "colon"];
  expect(duals.map((id) => key(false, id).name)).toEqual(["!", "[", "{", "~", ":"]);
  expect(duals.map((id) => key(true, id).name)).toEqual(["'", "]", "}", "%", ";"]);
  expect([key(false, "letters").name, key(true, "letters").name]).toEqual([
    "Toggle Numbers",
    "Toggle Numbers",
  ]);
  expect(duals.map((id) => key(true, id).behaviour)).toEqual(
    ["'", "]", "}", "%", ";"].map((arg) => ({ type: "insert", action: { op: "typedText", arg } }))
  );
  expect(key(true, "tilde").face).toMatchObject({ kind: "dual", selected: 1, raised: true });
  // Shift has no effect on the 123 page.
  expect(layoutKeys(keypadLayout("main", 900, true))).toEqual(
    layoutKeys(keypadLayout("main", 900, false))
  );
});

it("VIS-KEYPAD-21 placeRow shares a row's leftover between its fill spacers", () => {
  const [shift, z, , , , , , m, backspace] = placeRow(keypadLayout("letters", 900, false).rows[2]);
  const gap = (1 - 3 / 11 - 7 / 10) / 2;
  expect([shift.key.id, shift.x]).toEqual(["shift", 0]);
  expect(z.x).toBeCloseTo(1.5 / 11 + gap, 9);
  expect(m.x).toBeCloseTo(1.5 / 11 + gap + 0.6, 9);
  expect(backspace.x + backspace.width).toBeCloseTo(1, 9);
});
