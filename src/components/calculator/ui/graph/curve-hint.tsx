// The one-time curve hint (owner decision, 2026-10-21): the first time a student graphs a curve,
// a small quiet line under the graph says "Tap a curve to see key points" ("Click…" with a fine
// pointer). It goes on the student's first press anywhere in the calculator except a keypad key
// or the math being typed, or after HINT_MS, and never shows again: localStorage remembers it,
// and when storage fails it shows at most once per page load. Only a student's own edit of the
// rows arms it, so a question's preset graph never shows it.

import { useEffect, useState, type JSX } from "react";
import type { CalculatorEngine, EngineSnapshot } from "@/lib/calculator/core/api/engine";
import type { Geometry } from "@/lib/calculator/plot/geometry";

export const HINT_STORAGE_KEY = "karman-calculator:curve-hint-seen";
export const HINT_MS = 6000;
export const HINT_TEXT = {
  coarse: "Tap a curve to see key points",
  fine: "Click a curve to see key points",
} as const;
/** Presses here keep the hint: typing the curve goes on through them. */
const KEEPS_HINT = ".kc-keypad, .mq-editable-field";

let shownThisLoad = false;

function seen(): boolean {
  if (shownThisLoad) return true;
  try {
    return globalThis.localStorage?.getItem(HINT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function remember(): void {
  shownThisLoad = true;
  try {
    globalThis.localStorage?.setItem(HINT_STORAGE_KEY, "1");
  } catch {
    // storage blocked: the page-load flag still holds it to one showing
  }
}

/** For tests: forgets the page-load flag. */
export function resetCurveHintForTests(): void {
  shownThisLoad = false;
}

/** Whether `g` draws a curve or line a student can tap. */
const isCurve = (g: Geometry): boolean =>
  g.kind === "curve" ||
  g.kind === "lines" ||
  g.kind === "region" ||
  (g.kind === "table" && g.regression !== undefined);

function finePointer(fallback: boolean): boolean {
  try {
    return globalThis.matchMedia?.("(pointer: fine)").matches ?? fallback;
  } catch {
    return fallback;
  }
}

/** The hint's text while it shows, else null. `root` is the calculator's shadow root or document. */
export function useCurveHint(
  engine: CalculatorEngine,
  snapshot: Pick<EngineSnapshot, "geometry">,
  root: () => Node | null,
  coarse: boolean
): string | null {
  const [armed, setArmed] = useState(false);
  const [text, setText] = useState<string | null>(null);

  // A student's change of the rows arms it; a view move (also a student's) or a preset does not.
  useEffect(() => {
    const rowsKey = () =>
      engine
        .getSnapshot()
        .rows.map((r) => `${r.id}\u0000${r.latex}`)
        .join("\u0001");
    let last = rowsKey();
    return engine.observeEvent("change", (event) => {
      const next = rowsKey();
      if (event.isUserInitiated && next !== last) setArmed(true);
      last = next;
    });
  }, [engine]);

  const graphed = armed && [...snapshot.geometry.values()].some(isCurve);
  useEffect(() => {
    if (!graphed || text !== null || seen()) return;
    remember();
    setText(finePointer(!coarse) ? HINT_TEXT.fine : HINT_TEXT.coarse);
  }, [graphed, text, coarse]);

  const showing = text !== null && text !== "";
  useEffect(() => {
    if (!showing) return;
    const timer = setTimeout(() => setText(""), HINT_MS);
    const node = root();
    const onPress = (event: Event) => {
      const target = event.composedPath()[0];
      if (target instanceof Element && target.closest(KEEPS_HINT) !== null) return;
      setText("");
    };
    node?.addEventListener("pointerdown", onPress, true);
    return () => {
      clearTimeout(timer);
      node?.removeEventListener("pointerdown", onPress, true);
    };
  }, [showing, root]);

  return text === null || text === "" ? null : text;
}

export function CurveHint(props: { text: string; insetPx: number }): JSX.Element {
  return (
    <div
      className="kc-curve-hint"
      role="status"
      data-curve-hint=""
      style={{ bottom: `${12 + props.insetPx}px` }}
    >
      {props.text}
    </div>
  );
}
