// Tones of the calculator theme (TH-1, TH-3): the reference calculator draws secondary text,
// popover fields and the selected segment as its ink at a fixed strength over the list
// (row numbers 65%, Step: 73%, field lines 42%, …). The classic skin keeps those strengths; each
// site skin raises a tone, in 1% steps, until it meets its 10.3 target on every background it sits
// on, so the reference greys keep their look on the classic skin and stay legible on the others.
// Stylesheets mix with the tone's custom property, `color-mix(in srgb, var(--kc-text)
// var(--kc-tone-row-number), …)`, never with a fixed percentage.
import { compositeOver, contrastRatio } from "./contrast";
import type { ColorRole, Tone } from "./skins";
import { ADJUST_MARGIN } from "./targets";
import { TONES } from "./vars";

/**
 * The gutter tab behind row numbers: the text at 6.7% over the list (styles/tokens.css `--kc-tab`).
 */
export const TAB_MIX = 0.067;

export interface ToneSpec {
  ink: ColorRole; // the colour mixed
  on: readonly (ColorRole | "tab")[]; // the backgrounds it is mixed over and measured against
  reference: number; // the classic skin's strength, the reference calculator's measured value
  min: number; // the 10.3 target on every background in `on`
}

/** Every tone, in `TONES` order. Text is 7:1 (10.3 secondary text); lines are 3:1 boundaries. */
export const TONE_SPECS: Readonly<Record<Tone, ToneSpec>> = {
  rowNumber: { ink: "text", on: ["tab", "list"], reference: 0.65, min: 7 },
  textMuted: { ink: "text", on: ["list"], reference: 0.6, min: 7 },
  equals: { ink: "text", on: ["list"], reference: 0.55, min: 7 },
  fieldText: { ink: "text", on: ["list"], reference: 0.73, min: 7 },
  fieldPlaceholder: { ink: "text", on: ["list"], reference: 0.47, min: 7 },
  segmentText: { ink: "text", on: ["list"], reference: 0.85, min: 7 },
  // VIS-12: the selected segment is filled with this tone and labelled in the list colour.
  selectedFill: { ink: "text", on: ["list"], reference: 0.65, min: 7 },
  fieldLine: { ink: "text", on: ["list"], reference: 0.42, min: 3 },
  // VIS-35: the error tooltip box, labelled in the tooltip label colour.
  errorTip: { ink: "tooltip", on: ["tooltipLabel"], reference: 0.6, min: 7 },
};

/** The hex of the background `bg` names in a skin with these roles. */
export function toneBackground(roles: Record<ColorRole, string>, bg: ColorRole | "tab"): string {
  return bg === "tab" ? compositeOver(roles.text, TAB_MIX, roles.list) : roles[bg];
}

/** The tone's colour drawn over `bg`, as CSS mixes it. */
export function toneOver(
  roles: Record<ColorRole, string>,
  tone: Tone,
  strength: number,
  bg: string
) {
  return compositeOver(roles[TONE_SPECS[tone].ink], strength, bg);
}

/** Each tone's reference strength: the classic skin's tones. */
export function referenceTones(): Record<Tone, number> {
  return Object.fromEntries(TONES.map((t) => [t, TONE_SPECS[t].reference])) as Record<Tone, number>;
}

/**
 * Each tone at the smallest strength, from its reference up in 1% steps, that meets its target
 * plus the TH-4 margin on every background it sits on; throws when even full strength misses.
 */
export function deriveTones(roles: Record<ColorRole, string>): Record<Tone, number> {
  const out = {} as Record<Tone, number>;
  for (const tone of TONES) {
    const spec = TONE_SPECS[tone];
    const backgrounds = spec.on.map((bg) => toneBackground(roles, bg));
    const meets = (p: number) =>
      backgrounds.every(
        (bg) => contrastRatio(toneOver(roles, tone, p, bg), bg) >= spec.min + ADJUST_MARGIN
      );
    let percent = Math.round(spec.reference * 100);
    while (percent <= 100 && !meets(percent / 100)) percent++;
    if (percent > 100) throw new Error(`Tone ${tone} misses ${spec.min}:1 at full strength`);
    out[tone] = percent / 100;
  }
  return out;
}
