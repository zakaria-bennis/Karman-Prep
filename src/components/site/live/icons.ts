// Karman's own icons for the marketing site: one set, 24 px grid, 1.75 stroke, round ends
// (design rule 52: custom drawn, never Lucide or a stock set). Constant markup, no visitor input,
// so the drawing scripts can place them as strings and React can place them as elements.

export const ICON_PATHS = {
  check: '<path d="M5 12.5 10 17.5 19 7"/>',
  alert: '<path d="M12 4 21 19.5H3Z"/><path d="M12 10v4.5"/><path d="M12 17.4v.1"/>',
  hours: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4.2l2.6 1.6M9.5 3h5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  parent: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4.5 7 7.5 6 7.5-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  phd: '<path d="M2.5 9.5 12 5l9.5 4.5L12 14Z"/><path d="M6.5 11.6V16c1.6 1.6 3.4 2.3 5.5 2.3s3.9-.7 5.5-2.3v-4.4M21.5 9.5v5"/>',
  quant: '<path d="M17.5 5H6.5l6 7-6 7h11"/>',
  analyst: '<path d="M3.5 19.5h17"/><path d="m5 15.5 4.2-4.6 3.4 2.8L19 7"/><path d="M15 7h4v4"/>',
  research:
    '<path d="M12 6.5C10 5 7 4.7 3.5 5.2v12.6c3.5-.5 6.5-.2 8.5 1.3 2-1.5 5-1.8 8.5-1.3V5.2C17 4.7 14 5 12 6.5Z"/><path d="M12 6.5v12.6"/>',
  professor:
    '<rect x="3.5" y="4.5" width="17" height="10.5" rx="1.8"/><path d="M8 19.5 10.5 15M16 19.5 13.5 15M7.5 8.5h6M7.5 11.5h4"/>',
  certified:
    '<circle cx="12" cy="9.5" r="5.5"/><path d="m9.6 9.6 1.7 1.7 3.2-3.4"/><path d="m8.5 14 -1.5 6 5-2.4 5 2.4-1.5-6"/>',
} as const;

export type IconName = keyof typeof ICON_PATHS;

/** An icon as SVG markup. */
export function iconSvg(name: IconName, cls = ""): string {
  return `<svg class="k-ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]}</svg>`;
}

/** The arrow inside the marigold button. */
export const ARROW_SVG =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4 12.5 8l-4 4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
