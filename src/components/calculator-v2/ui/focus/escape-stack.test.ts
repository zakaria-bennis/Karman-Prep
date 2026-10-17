import { expect, it } from "vitest";
import { createEscapeStack } from "./escape-stack";

it("escape stack: closes one layer per press by ESCAPE_RANK, any popover before the Functions panel, the panel before the ABC page and the keypad, whatever the push order", () => {
  const stack = createEscapeStack();
  const closed: string[] = [];
  const layer = (id: string) => ({ id, close: () => closed.push(id) });
  const removePopover = stack.push(layer("popover"));
  stack.push(layer("keypad"));
  stack.push(layer("functions"));
  stack.push(layer("letters"));
  expect([1, 2, 3, 4, 5].map(() => stack.handleEscape())).toEqual([true, true, true, true, false]);
  expect(closed).toEqual(["popover", "functions", "letters", "keypad"]);
  removePopover();
  stack.push(layer("menu-a"));
  stack.push(layer("menu-b"));
  stack.handleEscape();
  expect(closed.at(-1)).toBe("menu-b");
});
