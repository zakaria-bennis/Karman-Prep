// A slider's stored settings (SLIDERS-11), their saved form under the `slider` key, the older
// `sliderBounds` input, the four loop modes (SLIDERS-31) and the speed list (SLIDERS-33). Pure
// TypeScript: no DOM (AR-44).

export const LOOP_MODES = [
  "LOOP_FORWARD_REVERSE",
  "LOOP_FORWARD",
  "PLAY_ONCE",
  "PLAY_INDEFINITELY",
] as const;
export type LoopMode = (typeof LOOP_MODES)[number];

/** SLIDERS-31: each mode's radio name in the options menu, which the mode button also carries. */
export const LOOP_MODE_LABELS: Readonly<Record<LoopMode, string>> = {
  LOOP_FORWARD_REVERSE: "Loop forwards and backwards",
  LOOP_FORWARD: "Repeat in one direction",
  PLAY_ONCE: "Play once",
  PLAY_INDEFINITELY: "Play indefinitely",
};

export interface SliderSettings {
  readonly hardMin: boolean; // the min was typed (SLIDERS-16); soft limits grow to fit (SLIDERS-20)
  readonly hardMax: boolean;
  readonly min: string; // latex; a soft limit's last saved number
  readonly max: string;
  readonly step: string; // latex; "" for none
  readonly loopMode: LoopMode;
  readonly animationPeriod: number; // ms for one pass at this speed: 4000 / speed
  readonly playDirection: 1 | -1;
  readonly isPlaying: boolean;
}
export type SavedSlider = { -readonly [K in keyof SliderSettings]?: SliderSettings[K] };

/** One pass at 1x takes this long (SLIDERS-30). */
export const BASE_PERIOD = 4000;

export const DEFAULT_SLIDER: SliderSettings = Object.freeze({
  hardMin: false,
  hardMax: false,
  min: "-10",
  max: "10",
  step: "",
  loopMode: "LOOP_FORWARD_REVERSE",
  animationPeriod: BASE_PERIOD,
  playDirection: 1,
  isPlaying: false,
});

const KEYS = Object.keys(DEFAULT_SLIDER) as (keyof SliderSettings)[];

/**
 * SLIDERS-11: the saved `slider` object, every field equal to its default left out; undefined when
 * nothing differs (a default slider has no `slider` key).
 */
export function savedSlider(settings: SliderSettings): SavedSlider | undefined {
  const out: Record<string, unknown> = {};
  for (const key of KEYS) {
    if (settings[key] !== DEFAULT_SLIDER[key]) out[key] = settings[key];
  }
  return Object.keys(out).length === 0 ? undefined : (out as SavedSlider);
}

/** The full settings for a saved object (missing fields take their defaults). */
export function sliderFromSaved(saved: SavedSlider | undefined): SliderSettings {
  return Object.freeze({ ...DEFAULT_SLIDER, ...saved });
}

/** SLIDERS-11: the older `sliderBounds` input; each non-empty bound becomes a hard limit. */
export function sliderFromBounds(bounds: { min: string; max: string; step: string }): SavedSlider {
  const out: { -readonly [K in keyof SliderSettings]?: SliderSettings[K] } = {};
  if (bounds.min.trim() !== "") Object.assign(out, { hardMin: true, min: bounds.min });
  if (bounds.max.trim() !== "") Object.assign(out, { hardMax: true, max: bounds.max });
  if (bounds.step.trim() !== "") out.step = bounds.step;
  return out;
}

/** True when both hold the same settings. */
export function sameSlider(a: SliderSettings | undefined, b: SliderSettings | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return KEYS.every((key) => a[key] === b[key]);
}

/** SLIDERS-33: the speeds the Slower and Faster buttons step through. */
export const SPEEDS = [0.05, 0.1, 0.15, 0.2, 0.35, 0.5, 0.75, 1, 1.5, 2, 3.5, 5, 7.5, 10, 15, 20];

/** SLIDERS-33: the speed an animation period stands for, to 3 decimals (2000 ms is 2). */
export function speedOf(period: number): number {
  return Number((BASE_PERIOD / period).toFixed(3));
}

/** SLIDERS-33: the readout under Speed, such as `1x` or `0.05x`. */
export function speedText(period: number): string {
  return `${speedOf(period)}x`;
}

/** SLIDERS-33: the next listed speed's period above (+1) or below (-1), or null at the end. */
export function nextPeriod(period: number, direction: 1 | -1): number | null {
  const speed = BASE_PERIOD / period;
  const next =
    direction > 0
      ? SPEEDS.find((s) => s > speed + 1e-9)
      : [...SPEEDS].reverse().find((s) => s < speed - 1e-9);
  return next === undefined ? null : BASE_PERIOD / next;
}
