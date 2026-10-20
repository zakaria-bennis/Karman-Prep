// SLIDERS-30, SLIDERS-35: the one animation loop for every playing slider. While any slider row is
// playing it runs tickSliders once per animation frame, which writes each playing slider's next
// value as one change with no undo step; it stops when none plays and when the panel unmounts.

import { useEffect } from "react";
import type { CalculatorEngine } from "@/lib/calculator/core/api/engine";
import { tickSliders } from "@/lib/calculator/core/api/sliders";

export function useSliderPlayback(engine: CalculatorEngine): void {
  useEffect(() => {
    let frame: number | null = null;
    const loop = (now: number) => {
      frame = null;
      if (tickSliders(engine, now)) frame = requestAnimationFrame(loop);
    };
    const check = () => {
      const playing = engine
        .getSnapshot()
        .rows.some((r) => r.slider != null && r.slider.settings.isPlaying);
      if (playing && frame === null) frame = requestAnimationFrame(loop);
    };
    check();
    const unsubscribe = engine.subscribe(check);
    return () => {
      unsubscribe();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [engine]);
}
