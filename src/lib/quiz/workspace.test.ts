// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearWorkspaces,
  emptyWorkspace,
  loadWorkspaces,
  saveWorkspaces,
  workspaceReducer,
} from "./workspace";

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("workspaceReducer", () => {
  it("crossing out the selected answer clears the answer", () => {
    let ws = workspaceReducer({}, "q1", { type: "answer", value: "B" });
    ws = workspaceReducer(ws, "q1", { type: "toggleCross", letter: "B" });
    expect(ws.q1.answer).toBeNull();
    expect(ws.q1.crossedOut).toEqual(["B"]);
    ws = workspaceReducer(ws, "q1", { type: "toggleCross", letter: "B" });
    expect(ws.q1.crossedOut).toEqual([]);
  });
  it("mark for review is ignored unless allowed", () => {
    let ws = workspaceReducer({}, "q1", { type: "toggleReview", allowed: false });
    expect(ws.q1?.markedForReview ?? false).toBe(false);
    ws = workspaceReducer(ws, "q1", { type: "toggleReview", allowed: true });
    expect(ws.q1.markedForReview).toBe(true);
  });
  it("leaves other questions untouched", () => {
    const before = { q2: emptyWorkspace() };
    const after = workspaceReducer(before, "q1", { type: "answer", value: "A" });
    expect(after.q2).toBe(before.q2);
  });
});

describe("session storage mirror", () => {
  it("round-trips", () => {
    const ws = workspaceReducer({}, "q1", { type: "answer", value: "C" });
    saveWorkspaces("att-1", ws);
    expect(loadWorkspaces("att-1")).toEqual(ws);
  });
  it("loads empty when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadWorkspaces("att-1")).toEqual({});
  });
  it("save does not throw when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveWorkspaces("att-1", {})).not.toThrow();
  });
  it("clear removes the key", () => {
    saveWorkspaces("att-1", workspaceReducer({}, "q1", { type: "answer", value: "C" }));
    clearWorkspaces("att-1");
    expect(sessionStorage.getItem("karman-quiz-ws:att-1")).toBeNull();
  });
});

describe("section start", () => {
  it("clearing a section also forgets its start time", () => {
    sessionStorage.setItem("karman-quiz-start:att-9", "123");
    clearWorkspaces("att-9");
    expect(sessionStorage.getItem("karman-quiz-start:att-9")).toBeNull();
  });
});
