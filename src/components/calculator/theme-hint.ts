// The quiz's colours where the calculator opens, for choosing the calculator theme closest to them
// while the student has not picked one in Settings (founder, 2026-11-08). Eager module: DOM only,
// no calculator import (AR-1, AR-2); the lazy host turns the hint into a skin (host/nearest-skin.ts).

export interface ThemeHint {
  background: [number, number, number]; // sRGB 0..255
  accent: [number, number, number];
}

/** "rgb(r, g, b)", "rgba(...)" or "color(srgb r g b)" as 0..255 channels, else null. */
export function parseCssColor(value: string): [number, number, number] | null {
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(value.trim());
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const srgb = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i.exec(value.trim());
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255];
  return null;
}

/** The resolved --quiz-bg and --quiz-accent of the quiz around `element`, or null outside a quiz. */
export function readThemeHint(element: HTMLElement | null): ThemeHint | null {
  const shell = element?.closest<HTMLElement>("[data-quiz-shell]");
  if (!shell) return null;
  const probe = document.createElement("span");
  probe.style.cssText =
    "position:absolute;width:0;height:0;overflow:hidden;background-color:var(--quiz-bg);color:var(--quiz-accent)";
  shell.appendChild(probe);
  try {
    const style = getComputedStyle(probe);
    const background = parseCssColor(style.backgroundColor);
    const accent = parseCssColor(style.color);
    return background && accent ? { background, accent } : null;
  } finally {
    probe.remove();
  }
}
