// The graph's CSS size and device pixel ratio (G-5; 08 Decision "Resizes"; 00-index Review Focus
// 3). A ResizeObserver on the layers element reports the size and a resolution media query the
// dpr. Each new usable size or dpr goes to the engine through setView, with a default view kept
// default and any other view keeping its centre and units per px (nextViewportForSize). A size with
// a 0 side (Minimize, a collapsed list, a display:none parent) is ignored: the hook keeps returning
// the last non-zero size and never reports 0 as the previous size.

import { useEffect, useRef, useState, type RefObject } from "react";
import type { CalculatorEngine } from "@/lib/calculator-v2/core/api/engine";
import type { PixelSize } from "@/lib/calculator-v2/plot/viewport";
import { nextViewportForSize } from "@/lib/calculator-v2/render/view-input";

export type GraphSize = { size: PixelSize; dpr: number };
type Target = RefObject<HTMLElement | null>;

const readDpr = (): number => window.devicePixelRatio || 1;

const sameGraphSize = (p: GraphSize, size: PixelSize, dpr: number): boolean =>
  p.size.width === size.width && p.size.height === size.height && p.dpr === dpr;

/**
 * The last size and dpr reported to the engine, or null before the first non-zero size. That
 * report is the hook's only setView; it never replaces a viewport otherwise.
 */
export function useGraphSize(target: Target, engine: CalculatorEngine): GraphSize | null {
  const [graphSize, setGraphSize] = useState<GraphSize | null>(null);
  /** The last size and dpr this hook reported to `engine` (null before the first). */
  const reported = useRef<GraphSize | null>(null);

  useEffect(() => {
    const element = target.current;
    if (element === null) return;
    reported.current = null; // a new engine has had no report yet
    let size: PixelSize | null = null;
    let dpr = readDpr();

    const report = (): void => {
      const previous = reported.current;
      if (size === null || (previous !== null && sameGraphSize(previous, size, dpr))) return;
      const next: GraphSize = { size, dpr };
      const viewport = nextViewportForSize(
        engine.getSnapshot().viewport,
        previous?.size ?? null,
        size
      );
      reported.current = next;
      engine.setView({ viewport, size, dpr });
      setGraphSize(next);
    };

    const observer = new ResizeObserver((entries) => {
      const rect = entries[entries.length - 1]?.contentRect;
      if (rect === undefined || !(rect.width > 0 && rect.height > 0)) return;
      size = { width: rect.width, height: rect.height };
      report();
    });
    observer.observe(element);

    // A resolution query matches only the current dpr, so its change event marks a new one.
    let query: MediaQueryList | null = null;
    const onDprChange = (): void => {
      dpr = readDpr();
      watchDpr();
      report();
    };
    const watchDpr = (): void => {
      query?.removeEventListener("change", onDprChange);
      query = window.matchMedia(`(resolution: ${dpr}dppx)`);
      query.addEventListener("change", onDprChange);
    };
    watchDpr();

    return () => {
      observer.disconnect();
      query?.removeEventListener("change", onDprChange);
    };
  }, [target, engine]);

  return graphSize;
}
