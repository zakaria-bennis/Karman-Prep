// @vitest-environment jsdom
import { expect, it } from "vitest";
import { createEngine } from "@/lib/calculator/core/api/engine";
import { createMainThreadBackend } from "@/lib/calculator/worker/backend";
import {
  createFakeFieldFactory,
  fakeOptions,
  type FakeFieldFactory,
} from "../list/__fixtures__/fake-math-field";
import { createFocusController } from "./focus-controller";

function setup(rows: string[]) {
  const engine = createEngine(undefined, { backend: createMainThreadBackend() });
  engine.setExpressions(rows.map((latex, i) => ({ id: String(i + 1), latex })));
  return { engine, focus: createFocusController(engine), fake: createFakeFieldFactory() };
}
function mountField(fake: FakeFieldFactory, rowId: string) {
  const li = document.body.appendChild(document.createElement("li"));
  li.dataset.rowId = rowId;
  return fake.factory(
    li.appendChild(document.createElement("div")),
    fakeOptions(`Expression ${rowId}`)
  );
}

it("focus controller: focusRow waits for a field that registers later, then focuses it at the requested edge", () => {
  const { focus, fake } = setup(["a", ""]);
  focus.focusRow("2", "start");
  const f2 = mountField(fake, "2");
  focus.registerField("2", f2);
  expect(f2.calls).toEqual([
    { method: "focus", arg: undefined },
    { method: "keystroke", arg: "Ctrl-Home" },
  ]);
  const f1 = mountField(fake, "1");
  const unregister = focus.registerField("1", f1);
  focus.focusRow("1", "end");
  expect(f1.calls.at(-1)).toEqual({ method: "keystroke", arg: "Ctrl-End" });
  expect(focus.fields()).toEqual([f1, f2]);
  unregister();
  expect(focus.field("1")).toBeNull();
});

it("R-10 lastFocusedRowId follows the engine's focused row; after setBlank() it is null and row 1 is the only row, the reopen target", () => {
  const { engine, focus } = setup(["y=x", "a=2", "y=a"]);
  engine.setFocusedRow("3");
  expect(focus.lastFocusedRowId()).toBe("3");
  engine.setFocusedRow(null);
  expect(focus.lastFocusedRowId()).toBe("3");
  engine.activateExpression("2");
  expect(focus.activeRowId()).toBe("2");
  engine.setBlank();
  expect(focus.lastFocusedRowId()).toBeNull();
  expect(engine.getSnapshot().rows.map((r) => [r.id, r.latex])).toEqual([["1", ""]]);
});
