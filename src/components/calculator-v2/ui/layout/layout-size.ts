// AR-29: the calculator picks its layout from its own container width through a ResizeObserver,
// never from viewport media queries: L-1 ("desktop") at 560 px and wider, L-2 ("stacked") below,
// so a 461 px dock shows L-2.

import type { PixelSize } from "@/lib/calculator-v2/plot/viewport";

export const LAYOUT_DESKTOP_MIN_WIDTH = 560;

export function layoutFor(width: number): "desktop" | "stacked" {
  return width >= LAYOUT_DESKTOP_MIN_WIDTH ? "desktop" : "stacked";
}

/**
 * Reports the host's content-box size on every ResizeObserver entry; `measure()` re-reads it at
 * once with getBoundingClientRect() (API-12's `resize()`). Nothing is reported until one of them runs.
 */
export function observeHostSize(
  host: HTMLElement,
  on: (size: PixelSize) => void
): { measure(): void; dispose(): void } {
  const observer = new ResizeObserver((entries) => {
    const entry = entries.at(-1);
    if (entry === undefined) return;
    on({ width: entry.contentRect.width, height: entry.contentRect.height });
  });
  observer.observe(host);
  return {
    measure() {
      const rect = host.getBoundingClientRect();
      on({ width: rect.width, height: rect.height });
    },
    dispose: () => observer.disconnect(),
  };
}
