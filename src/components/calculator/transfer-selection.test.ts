import { beforeEach, expect, it, vi } from "vitest";
import {
  TAP_MAX_MOVE_PX,
  TAP_MAX_MS,
  isHoverPointer,
  isTap,
  transferSelection,
  triggerFor,
} from "./transfer-selection";

const at = (x: number, y: number, t: number, pointerType = "touch") => ({ pointerType, x, y, t });

beforeEach(() => transferSelection.resetForTests());

it("TR-54, AR-10 only a mouse or a hovering pen reveals by hover, and the trigger follows the activating pointer: a pen tap is touch, a click from a hovering pen is mouse", () => {
  expect(typeof globalThis.matchMedia).toBe("undefined");
  expect(
    [
      { pointerType: "mouse", buttons: 0 },
      { pointerType: "pen", buttons: 0 },
      { pointerType: "pen", buttons: 1 },
      { pointerType: "touch", buttons: 0 },
    ].map(isHoverPointer)
  ).toEqual([true, true, false, false]);
  const touch = { pointerType: "touch" };
  const pen = { pointerType: "pen" };
  const mouse = { pointerType: "mouse" };
  expect([
    triggerFor(touch, false),
    triggerFor(touch, true),
    triggerFor(pen, false),
    triggerFor(pen, true),
    triggerFor(mouse, false),
    triggerFor(null, false),
    triggerFor(null, true),
  ]).toEqual(["touch", "touch", "touch", "mouse", "mouse", "keyboard", "keyboard"]);
});

it("TR-55 a tap is a touch or pen contact that moves at most 10 px and lifts within 500 ms", () => {
  expect([TAP_MAX_MOVE_PX, TAP_MAX_MS]).toEqual([10, 500]);
  expect(isTap(at(0, 0, 0), at(6, 8, 499), 10, true)).toBe(true);
  expect(isTap(at(0, 0, 0, "pen"), at(0, 10, 100, "pen"), 10, true)).toBe(true);
  expect(isTap(at(0, 0, 0, "mouse"), at(0, 0, 50, "mouse"), 0, true)).toBe(false);
});

it("TR-58 a long press, a drag (even one that returns to its start) or a gesture that ends with selected text is never a tap", () => {
  expect(isTap(at(0, 0, 0), at(0, 0, 500), 0, true)).toBe(false);
  expect(isTap(at(0, 0, 0), at(6, 8.1, 100), 0, true)).toBe(false);
  expect(isTap(at(0, 0, 0), at(0, 0, 200), 30, true)).toBe(false);
  expect(isTap(at(0, 0, 0), at(1, 1, 100), 10.01, true)).toBe(false);
  expect(isTap(at(0, 0, 0), at(1, 1, 100), 1.5, false)).toBe(false);
});

it("TR-55, TR-56 one item is selected at a time and toggling the selected item deselects it", () => {
  const heard = vi.fn();
  transferSelection.subscribe(heard);
  const a = { questionKey: "k:q1", sourceId: "stem:1" };
  const b = { questionKey: "k:q1", sourceId: "stem:3" };
  transferSelection.toggle(a);
  expect(transferSelection.get()).toEqual(a);
  transferSelection.toggle(b);
  expect(transferSelection.get()).toEqual(b);
  transferSelection.toggle({ ...b });
  expect(transferSelection.get()).toBeNull();
  transferSelection.clear();
  expect(heard).toHaveBeenCalledTimes(3);
});

it("TR-57 a selection never times out and ends only on clear()", () => {
  vi.useFakeTimers();
  transferSelection.toggle({ questionKey: "k:q1", sourceId: "stem:1" });
  vi.advanceTimersByTime(600_000);
  expect(transferSelection.get()).not.toBeNull();
  transferSelection.clear();
  expect(transferSelection.get()).toBeNull();
  vi.useRealTimers();
});
