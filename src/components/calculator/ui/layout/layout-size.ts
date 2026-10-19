// AR-29, L-8, RS-1: the calculator picks its layout from its own container width through a
// ResizeObserver, never from viewport media queries: side by side ("desktop") from 450 px wide,
// stacked below that, at any height, as the reference calculator does (owner decision 2026-10-19
// replaces the 560 px / 1.2-aspect rule).

import type { PixelSize } from "@/lib/calculator/plot/viewport";

export const LAYOUT_DESKTOP_MIN_WIDTH = 450;

/** L-1 when `width >= 450`, otherwise L-2; the height plays no part. */
export function layoutFor(size: PixelSize): "desktop" | "stacked" {
  return size.width >= LAYOUT_DESKTOP_MIN_WIDTH ? "desktop" : "stacked";
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
