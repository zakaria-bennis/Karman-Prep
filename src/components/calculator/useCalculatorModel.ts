"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { newExpression, type CalculatorInstance, type Expression } from "@/lib/calculator/types";
export function useCalculatorModel() {
  const [initialRows] = useState(() => [newExpression()]);
  const history = useRef<{
    past: Expression[][];
    present: Expression[];
    future: Expression[][];
    group: string;
    time: number;
  }>({ past: [], present: initialRows, future: [], group: "", time: 0 });
  const listeners = useRef(new Set<() => void>());
  const [revision, setRevision] = useState(0);
  const notify = useCallback(() => {
    setRevision((n) => n + 1);
    listeners.current.forEach((fn) => fn());
  }, []);
  const commit = useCallback(
    (next: Expression[], group = "") => {
      const h = history.current;
      if (JSON.stringify(h.present) === JSON.stringify(next)) return;
      if (!group || h.group !== group || Date.now() - h.time > 700)
        h.past = [...h.past.slice(-79), h.present];
      h.present = next;
      h.future = [];
      h.group = group;
      h.time = Date.now();
      notify();
    },
    [notify]
  );
  const undo = useCallback(() => {
    const h = history.current;
    if (!h.past.length) return;
    h.future = [h.present, ...h.future];
    h.present = h.past.at(-1)!;
    h.past = h.past.slice(0, -1);
    h.group = "";
    notify();
  }, [notify]);
  const redo = useCallback(() => {
    const h = history.current;
    if (!h.future.length) return;
    h.past = [...h.past, h.present];
    h.present = h.future[0];
    h.future = h.future.slice(1);
    h.group = "";
    notify();
  }, [notify]);
  const bridge = useMemo<CalculatorInstance>(
    () => ({
      getExpressions: () => history.current.present,
      setExpressions: (incoming) => {
        if (history.current.present.length + incoming.length > 250)
          throw new Error("Use at most 250 calculator rows.");
        let next = history.current.present.filter(
          (e) => e.latex || e.type === "table" || e.type === "folder" || e.type === "text"
        );
        for (const row of incoming) {
          const i = next.findIndex((e) => e.id === row.id);
          if (i < 0) next = [...next, { ...newExpression(row.type), ...row }];
          else next = next.map((e, j) => (j === i ? { ...e, ...row } : e));
        }
        commit(next);
      },
      subscribe: (fn) => {
        listeners.current.add(fn);
        return () => {
          listeners.current.delete(fn);
        };
      },
    }),
    [commit]
  );
  const update = useCallback(
    (id: string, patch: Partial<Expression>, group = "") =>
      commit(
        history.current.present.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        group
      ),
    [commit]
  );
  return {
    rows: history.current.present,
    revision,
    bridge,
    commit,
    update,
    undo,
    redo,
    canUndo: history.current.past.length > 0,
    canRedo: history.current.future.length > 0,
  };
}
