/**
 * The five fox accessories, ported from prototypes/daily10-end/parts.js (ACC and
 * ACCV): drawn in head space (y negative is up), object colours, no marigold.
 */
export const ACCESSORIES = {
  glasses:
    '<g class="acc"><circle cx="-15" cy="-28" r="9.5" fill="rgba(255,255,255,.18)" stroke="#2A1B10" stroke-width="2.4"/><circle cx="15" cy="-28" r="9.5" fill="rgba(255,255,255,.18)" stroke="#2A1B10" stroke-width="2.4"/><path d="M-5.5 -29 Q0 -32 5.5 -29 M-24.5 -30 L-36 -34 M24.5 -30 L36 -34" stroke="#2A1B10" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>',
  headphones:
    '<g class="acc"><path d="M-40 -30 C-44 -86 44 -86 40 -30" fill="none" stroke="#2A2F3A" stroke-width="6" stroke-linecap="round"/><rect x="-50" y="-40" width="14" height="24" rx="6" fill="#2A2F3A"/><rect x="36" y="-40" width="14" height="24" rx="6" fill="#2A2F3A"/><rect x="-48" y="-36" width="6" height="16" rx="3" fill="#E9E4D8"/><rect x="42" y="-36" width="6" height="16" rx="3" fill="#E9E4D8"/></g>',
  cap: '<g class="acc" transform="rotate(-8 0 -62)"><path d="M-14 -62 L-12 -52 L12 -52 L14 -62 Z" fill="#20242C"/><path d="M-34 -64 L0 -76 L34 -64 L0 -54 Z" fill="#2A2F3A"/><path d="M0 -65 L22 -62 L24 -46" stroke="#C4473B" stroke-width="2" fill="none"/><circle cx="24" cy="-44" r="3" fill="#C4473B"/></g>',
  bow: '<g class="acc"><path d="M0 12 L-16 4 L-16 20 Z M0 12 L16 4 L16 20 Z" fill="#B8443A"/><circle cx="0" cy="12" r="4" fill="#8E2E26"/></g>',
  scarf:
    '<g class="acc"><path d="M-34 2 Q0 18 34 2 L32 12 Q0 28 -32 12 Z" fill="#3E6FB0"/><path d="M14 14 L20 36 L30 34 L24 12 Z" fill="#335E97"/><path d="M-20 8 l2 4 4 .5 -3 3 1 4 -4 -2 -3.5 2 .8-4 -3-3 4-.5Z" fill="#F1ECDF"/></g>',
} as const;
export type AccessoryId = keyof typeof ACCESSORIES;

export const ACCESSORY_NAMES: Record<AccessoryId, string> = {
  glasses: "Round glasses",
  headphones: "Headphones",
  cap: "Graduation cap",
  bow: "Bow tie",
  scarf: "Star scarf",
};

/** Each accessory framed on its own, for a prize tile. */
export const ACCESSORY_VIEWBOX: Record<AccessoryId, string> = {
  glasses: "-40 -46 80 36",
  headphones: "-55 -82 110 72",
  cap: "-38 -80 76 44",
  bow: "-21 -4 42 30",
  scarf: "-37 -4 74 44",
};

export function AccessoryIcon({ id, size = 48 }: { id: AccessoryId; size?: number }) {
  return (
    <svg
      viewBox={ACCESSORY_VIEWBOX[id]}
      width={size}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ACCESSORIES[id] }}
    />
  );
}
