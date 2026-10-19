// AR-29, L-8: the calculator picks its layout from its own container size through a ResizeObserver,
// never from viewport media queries: L-1 ("desktop") when the container is at least 560 px wide and
// at least 1.2 times as wide as tall, L-2 ("stacked") otherwise, so a 461 px dock shows L-2 and so
// does a 576 x 750 portrait dock.

import type { PixelSize } from "@/lib/calculator-v2/plot/viewport";

export const LAYOUT_DESKTOP_MIN_WIDTH = 560;

/**
 * Minimum width / height ratio for L-1. A portrait or near-square dock (say 576 x 750 on a laptop)
 * would leave the side-by-side graph only about 345 px of width; the stacked layout gives the graph
 * the full container width and at least 40% of the height (L-2), so L-1 needs a landscape container.
 */
export const LAYOUT_DESKTOP_MIN_ASPECT = 1.2;

/**
 * L-1 when `width >= 560` and `width >= 1.2 * height`, otherwise L-2. A height that is not a
 * positive finite number (the 0 x 0 first measurement before layout, a detached host) cannot
 * express an aspect ratio, so the width-only rule applies; otherwise the layout would flicker
 * between L-2 on that first measurement and L-1 on the real one.
 */
export function layoutFor(size: PixelSize): "desktop" | "stacked" {
  const { width, height } = size;
  if (!(width >= LAYOUT_DESKTOP_MIN_WIDTH)) return "stacked";
  if (!Number.isFinite(height) || height <= 0) return "desktop";
  return width >= LAYOUT_DESKTOP_MIN_ASPECT * height ? "desktop" : "stacked";
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
