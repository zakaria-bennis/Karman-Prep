import { expect, it } from "vitest";
import { keypadLayout, type KeyGroup } from "./keys";

const ids = (group: KeyGroup) =>
  group.rows.map((row) => row.map((k) => (k.span > 1 ? `${k.id}*${k.span}` : k.id)));
const chars = (s: string) => s.split("");

it("K-1 the fine-pointer tray has the left, centre and right groups of the K-1 table", () => {
  const tray = keypadLayout("main", 900, "fine", false);
  expect(tray.groups.map((g) => [g.id, g.columns])).toEqual([
    ["left", 4],
    ["centre", 4],
    ["right", 2],
  ]);
  expect(ids(tray.groups[0])).toEqual([
    ["x", "y", "squared", "power"],
    ["lparen", "rparen", "lt", "gt"],
    ["abs", "comma", "le", "ge"],
    ["letters", "audio", "sqrt", "pi"],
  ]);
  expect(ids(tray.groups[1])).toEqual([
    ["7", "8", "9", "divide"],
    ["4", "5", "6", "times"],
    ["1", "2", "3", "minus"],
    ["0", "point", "equals", "plus"],
  ]);
  expect(ids(tray.groups[2])).toEqual([
    ["functions*2"],
    ["left", "right"],
    ["backspace*2"],
    ["enter*2"],
  ]);
  const byId = new Map(tray.groups.flatMap((g) => g.rows.flat()).map((k) => [k.id, k]));
  expect(byId.get("backspace")).toMatchObject({ id: "backspace", icon: "Delete", label: "" });
  expect(["left", "right", "enter", "audio"].map((id) => byId.get(id)!.icon)).toEqual([
    "ArrowLeft",
    "ArrowRight",
    "CornerDownLeft",
    "Volume2",
  ]);
  expect(byId.get("7")).toMatchObject({ label: "7", name: "7" });
  expect(byId.get("7")!.icon).toBeUndefined();
});

it("K-6 under 600 px the 7 x 6 phone keypad holds every tray key plus ~ whatever the pointer; wider coarse trays add ~ to the right group", () => {
  expect(keypadLayout("main", 599, "fine", false).id).toBe("phone");
  expect(keypadLayout("main", 599, "fine", false)).toEqual(
    keypadLayout("main", 599, "coarse", false)
  );
  for (const width of [320, 599]) {
    const phone = keypadLayout("main", width, "coarse", false);
    expect([phone.id, phone.groups[0].columns]).toEqual(["phone", 7]);
    expect(ids(phone.groups[0])).toEqual([
      ["functions*2", "left", "right", "tilde", "backspace*2"],
      ["x", "y", "squared", "7", "8", "9", "divide"],
      ["lparen", "rparen", "power", "4", "5", "6", "times"],
      ["lt", "gt", "sqrt", "1", "2", "3", "minus"],
      ["le", "ge", "pi", "0", "point", "equals", "plus"],
      ["letters", "abs", "comma", "audio", "enter*3"],
    ]);
  }
  expect(ids(keypadLayout("letters", 390, "coarse", false).groups[0])).toEqual([
    chars("abcdefg"),
    chars("hijklmn"),
    chars("opqrstu"),
    [...chars("vwxyz"), "theta", "shift"],
    ["subscript", "factorial", "percent", "lbracket", "lbrace", "tilde", "colon"],
    ["letters", "prime", "left", "right", "backspace", "enter*2"],
  ]);
  expect(keypadLayout("main", 844, "coarse", false).id).toBe("tray");
  expect(ids(keypadLayout("main", 600, "coarse", false).groups[2])).toEqual([
    ["functions*2"],
    ["left", "right"],
    ["tilde", "backspace"],
    ["enter*2"],
  ]);
});

it("K-3 the desktop letters page replaces the left and centre groups with 10 columns, and Shift capitalises", () => {
  const page = keypadLayout("letters", 900, "fine", false);
  expect(page.groups.map((g) => [g.id, g.columns])).toEqual([
    ["letters", 10],
    ["right", 2],
  ]);
  expect(ids(page.groups[0])).toEqual([
    chars("qwertyuiop"),
    [...chars("asdfghjkl"), "theta"],
    ["shift", ...chars("zxcvbnm"), "prime", "tilde"],
    ["letters*4", "subscript", "factorial", "percent", "lbracket", "lbrace", "colon"],
  ]);
  expect(page.groups[0].rows[2][0]).toMatchObject({ id: "shift", icon: "ArrowBigUp", label: "" });
  expect(keypadLayout("letters", 900, "fine", true).groups[0].rows[0][0]).toMatchObject({
    label: "Q",
    name: "Q",
    behaviour: { type: "insert", action: { op: "typedText", arg: "Q" } },
  });
});
