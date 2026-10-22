import { expect, it, vi } from "vitest";
import { createShellStore, type ShellState } from "./shell-store";

const SHELL0: ShellState = {
  size: { width: 0, height: 0 },
  layout: "stacked",
  skin: "ivory",
  themeChoice: "auto",
  themeRevision: 0,
  reducedMotionMedia: false,
  pointer: "fine",
};

it("AR-29 createShellStore notifies subscribers only when a value changes", () => {
  const store = createShellStore(SHELL0);
  const heard = vi.fn();
  const off = store.subscribe(heard);
  store.set({ layout: "stacked", size: { width: 0, height: 0 } });
  expect(heard).not.toHaveBeenCalled();
  store.set({ layout: "desktop" });
  expect([heard.mock.calls.length, store.get().layout]).toEqual([1, "desktop"]);
  off();
  store.set({ layout: "stacked" });
  expect(heard).toHaveBeenCalledTimes(1);
});
