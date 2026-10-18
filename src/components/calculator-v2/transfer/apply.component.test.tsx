// @vitest-environment jsdom
import { act, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { TransferPayload } from "@/lib/calculator-transfer/payload";
import { ExpressionPanel } from "../ui/list/ExpressionPanel";
import { panelProps, renderEditor } from "../ui/list/__fixtures__/render-editor";
import { applyTransfer } from "./apply";

const P = (rows: string[], extra: Record<string, unknown> = {}): TransferPayload =>
  ({
    version: 1,
    questionKey: "a1:q1",
    sourceId: "stem:1",
    description: "test",
    format: "rows",
    dependencies: [],
    rows,
    ...extra,
  }) as TransferPayload;
const rowIds = () =>
  [...document.querySelectorAll("li[data-row-id]")].map((li) => li.getAttribute("data-row-id"));

afterEach(() => vi.useRealTimers());

it("TR-32 a transfer into a collapsed list expands it and renders the new rows after the existing ones", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x"] });
  act(() => kit.engine.updateSettings({ expressionsCollapsed: true }));
  expect(document.querySelector("section.kc-list-panel")).toHaveAttribute(
    "data-list-state",
    "collapsed"
  );
  act(() => void applyTransfer(kit.engine, P(["y=2x", "y=3x"]), "mouse"));
  expect(document.querySelector("section.kc-list-panel")).toHaveAttribute(
    "data-list-state",
    "expanded"
  );
  expect(screen.getAllByRole("listitem").map((li) => li.dataset.rowId)).toEqual(["1", "2", "3"]);
});

it("TR-38 undo after a transfer removes its rows from the rendered list and the panel stays mounted", () => {
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, { rows: ["y=x", ""] });
  act(() => void applyTransfer(kit.engine, P(["y=2x", "y=3x"]), "keyboard"));
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  act(() => kit.engine.undo());
  expect(screen.getAllByRole("listitem").map((li) => li.dataset.rowId)).toEqual(["1", "2"]);
  expect(screen.getByRole("list", { name: "Expressions" })).toBeInTheDocument();
});

it("TR-32 a transfer right after the last row is deleted writes the freed id once: one list item per id while the deleted row exits and after (P4)", () => {
  vi.useFakeTimers();
  const kit = renderEditor(<ExpressionPanel {...panelProps()} />, {
    rows: ["y=x", "y=2x"],
    durationMs: 100,
  });
  act(() => kit.engine.removeExpression({ id: "2" }));
  expect(document.querySelector('li[data-row-id="2"]')).toHaveAttribute("data-motion", "exit");
  act(() => void applyTransfer(kit.engine, P(["y=3x"]), "mouse"));
  expect(kit.engine.getExpressions().map((r) => [r.id, r.latex])).toEqual([
    ["1", "y=x"],
    ["2", "y=3x"],
  ]);
  expect(rowIds()).toEqual(["1", "2"]);
  expect(document.querySelector('li[data-row-id="2"]')).not.toHaveAttribute("data-motion", "exit");
  act(() => vi.advanceTimersByTime(100));
  expect(rowIds()).toEqual(["1", "2"]);
  expect(screen.getAllByRole("listitem").map((li) => li.dataset.rowId)).toEqual(["1", "2"]);
});
