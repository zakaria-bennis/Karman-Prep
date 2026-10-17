import { expect, it, vi } from "vitest";
import type { MathField } from "../../math-field/MathField";
import { FIELD_WAIT_FRAMES, whenFieldReady } from "./when-field-ready";

/** A stub MathField: whenFieldReady only hands it to `run`. */
const field = { element: null } as unknown as MathField;

it("API-12 whenFieldReady runs at once, waits frames for a new field, cancels, and gives up after exactly FIELD_WAIT_FRAMES frames", () => {
  const frames: (() => void)[] = [];
  const schedule = vi.fn((cb: () => void) => {
    frames.push(cb);
  });
  const fields = new Map<string, MathField>();
  const focus = { field: (id: string) => fields.get(id) ?? null };
  const run = vi.fn();
  fields.set("0", field);
  whenFieldReady(focus, "0", run, schedule);
  expect([run.mock.calls.length, schedule.mock.calls.length]).toEqual([1, 0]);
  whenFieldReady(focus, "1", run, schedule);
  fields.set("1", field);
  frames.shift()!();
  expect(run).toHaveBeenLastCalledWith(field);
  whenFieldReady(focus, "2", run, schedule)();
  fields.set("2", field);
  frames.splice(0).forEach((cb) => cb());
  expect(run).toHaveBeenCalledTimes(2);
  schedule.mockClear();
  whenFieldReady(focus, "3", run, schedule);
  while (frames.length) frames.shift()!();
  expect([schedule.mock.calls.length, run.mock.calls.length]).toEqual([FIELD_WAIT_FRAMES, 2]);
});
