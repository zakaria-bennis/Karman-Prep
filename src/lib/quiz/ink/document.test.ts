import { describe, expect, it } from "vitest";
import {
  applyInkOp,
  capStroke,
  invertInkOp,
  MAX_POINTS,
  MAX_STROKES,
  simplifyStroke,
} from "./document";
import type { InkDocument, InkStroke } from "./types";
import { workspaceReducer } from "../workspace";

const stroke = (id: number): InkStroke => ({
  id,
  pen: 1,
  anchor: { kind: "block", blockId: "stem" },
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 10 },
  ],
});

describe("ink document", () => {
  it("add, undo, redo restores the same document", () => {
    const op = { kind: "add" as const, stroke: stroke(1) };
    const added = applyInkOp({ strokes: [] }, op);
    const undone = applyInkOp(added, invertInkOp(op));
    expect(undone).toEqual({ strokes: [] });
    expect(applyInkOp(undone, op)).toEqual(added);
  });
  it("clear then undo restores strokes in order", () => {
    const doc: InkDocument = { strokes: [stroke(1), stroke(2), stroke(3)] };
    const clear = { kind: "clear" as const, removed: doc.strokes };
    const cleared = applyInkOp(doc, clear);
    expect(cleared.strokes).toEqual([]);
    expect(applyInkOp(cleared, invertInkOp(clear)).strokes.map((s) => s.id)).toEqual([1, 2, 3]);
  });
  it("a 501st stroke drops the oldest", () => {
    let doc: InkDocument = { strokes: [] };
    for (let i = 1; i <= MAX_STROKES + 1; i++)
      doc = applyInkOp(doc, { kind: "add", stroke: stroke(i) });
    expect(doc.strokes).toHaveLength(MAX_STROKES);
    expect(doc.strokes[0].id).toBe(2);
  });
  it("simplify keeps the endpoints of a straight line", () => {
    const pts = Array.from({ length: 100 }, (_, i) => ({ x: i, y: i * 2 }));
    expect(simplifyStroke(pts)).toEqual([pts[0], pts[99]]);
  });
  it("simplify keeps the shape of a closed loop", () => {
    const loop = Array.from({ length: 41 }, (_, i) => ({
      x: 50 + 20 * Math.cos((i / 40) * 2 * Math.PI),
      y: 50 + 20 * Math.sin((i / 40) * 2 * Math.PI),
    }));
    loop[40] = { ...loop[0] }; // a pen lifts exactly where it started
    expect(simplifyStroke(loop).length).toBeGreaterThan(8);
  });
  it("cap keeps at most 5000 points", () => {
    const pts = Array.from({ length: 6000 }, (_, i) => ({ x: i, y: 0 }));
    expect(capStroke(pts)).toHaveLength(MAX_POINTS);
  });
});

describe("workspace ink history", () => {
  it("undo then redo around an erase", () => {
    let ws = workspaceReducer({}, "q", { type: "inkOp", op: { kind: "add", stroke: stroke(1) } });
    ws = workspaceReducer(ws, "q", { type: "inkOp", op: { kind: "erase", removed: [stroke(1)] } });
    expect(ws.q.ink.strokes).toEqual([]);
    ws = workspaceReducer(ws, "q", { type: "undo" });
    expect(ws.q.ink.strokes.map((s) => s.id)).toEqual([1]);
    ws = workspaceReducer(ws, "q", { type: "redo" });
    expect(ws.q.ink.strokes).toEqual([]);
  });
  it("a new op clears the redo stack", () => {
    let ws = workspaceReducer({}, "q", { type: "inkOp", op: { kind: "add", stroke: stroke(1) } });
    ws = workspaceReducer(ws, "q", { type: "undo" });
    ws = workspaceReducer(ws, "q", { type: "inkOp", op: { kind: "add", stroke: stroke(2) } });
    expect(ws.q.redo).toEqual([]);
  });
});
