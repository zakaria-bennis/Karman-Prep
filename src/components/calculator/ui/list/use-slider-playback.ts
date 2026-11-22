// SLIDERS-30, SLIDERS-35: the one animation loop for every playing slider. While any slider row is
// playing it runs tickSliders once per animation frame, which writes each playing slider's next
// value as one change with no undo step; it stops when none plays and when the panel unmounts.
// 2026-11-22: a host that hides the calculator (the quiz closes it with `hidden`) pauses the loop,
// not the sliders: they stay playing and pick up where they were when it shows again.

import { useEffect, type RefObject } from "react";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import { restartSliderClocks, tickSliders } from "@/lib/calculator/core/api/sliders";

/** The shadow host `anchor` lives in, or null outside a shadow root. */
function hostOf(anchor: Element | null | undefined): HTMLElement | null {
  const root = anchor?.getRootNode();
  return typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot
    ? (root.host as HTMLElement)
    : null;
}

export function useSliderPlayback(
  engine: CalculatorEngine,
  anchor?: RefObject<Element | null>
): void {
  useEffect(() => {
    let frame: number | null = null;
    let watcher: ResizeObserver | null = null;
    const hidden = () => hostOf(anchor?.current)?.closest("[hidden]") != null;
    const playing = () =>
      engine.getSnapshot().rows.some((r) => r.slider != null && r.slider.settings.isPlaying);
    // Resizes come when a hidden calculator shows again (display none to its size).
    const watch = () => {
      const host = hostOf(anchor?.current);
      if (host === null || watcher !== null || typeof ResizeObserver === "undefined") return;
      watcher = new ResizeObserver(() => {
        if (hidden()) return;
        watcher?.disconnect();
        watcher = null;
        check();
      });
      watcher.observe(host);
    };
    const loop = (now: number) => {
      frame = null;
      if (hidden() && typeof ResizeObserver !== "undefined") {
        restartSliderClocks(engine); // no jump for the time it was away
        watch();
        return;
      }
      if (tickSliders(engine, now)) frame = requestAnimationFrame(loop);
    };
    const check = () => {
      if (playing() && frame === null && watcher === null) frame = requestAnimationFrame(loop);
    };
    check();
    const unsubscribe = engine.subscribe(check);
    return () => {
      unsubscribe();
      watcher?.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [engine, anchor]);
}
