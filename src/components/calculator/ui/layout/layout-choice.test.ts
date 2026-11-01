// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  LAYOUT_CHOICE_STORAGE_KEY,
  layoutChoice,
  resetLayoutChoiceForTest,
  setLayoutChoice,
  subscribeLayoutChoice,
} from "./layout-choice";

afterEach(() => {
  window.localStorage.clear();
  resetLayoutChoiceForTest();
});

it("defaults to graph on top, remembers side by side on the device and tells subscribers", () => {
  expect(layoutChoice()).toBe("graph-top");
  const heard = vi.fn();
  subscribeLayoutChoice(heard);
  setLayoutChoice("side-by-side");
  expect([layoutChoice(), window.localStorage.getItem(LAYOUT_CHOICE_STORAGE_KEY)]).toEqual([
    "side-by-side",
    "side-by-side",
  ]);
  expect(heard).toHaveBeenCalledTimes(1);
  setLayoutChoice("side-by-side"); // unchanged: no notice
  expect(heard).toHaveBeenCalledTimes(1);
  resetLayoutChoiceForTest();
  expect(layoutChoice()).toBe("side-by-side"); // read back from storage
});

it("an unknown stored value reads as graph on top", () => {
  window.localStorage.setItem(LAYOUT_CHOICE_STORAGE_KEY, "diagonal");
  expect(layoutChoice()).toBe("graph-top");
});
