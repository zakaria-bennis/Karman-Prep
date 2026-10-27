// FN-59: an inference row's own settings, as live Desmos (College Board version) keeps them with
// the row (captured 2026-10-26): the Confidence Interval section, open or closed, and its level
// field; the Hypothesis Test section and its null-value field and tails (Left, Both, Right); and
// for a chi-square test the Observed (Expected) table's section and its Expected, Contributions
// and Totals checkboxes. Fields hold LaTeX, empty for the default (0.95, and the test's own null).
// Sections start closed and Expected starts ticked. Package-internal apart from the types.

export type InferenceTails = "left" | "both" | "right";

export interface InferenceSettings {
  readonly confidenceOpen: boolean;
  readonly level: string; // LaTeX; "" is 0.95
  readonly testOpen: boolean;
  readonly hypothesis: string; // LaTeX; "" is the test's default null value
  readonly tails: InferenceTails;
  readonly tableOpen: boolean;
  readonly expected: boolean;
  readonly contributions: boolean;
  readonly totals: boolean;
}

export const DEFAULT_INFERENCE: InferenceSettings = Object.freeze({
  confidenceOpen: false,
  level: "",
  testOpen: false,
  hypothesis: "",
  tails: "both",
  tableOpen: false,
  expected: true,
  contributions: false,
  totals: false,
});

/** The public (setState/getState) form: only what differs from the defaults is written. */
export type InferenceState = Partial<InferenceSettings>;

export const INFERENCE_STATE_KEYS: readonly (keyof InferenceSettings)[] = Object.freeze(
  Object.keys(DEFAULT_INFERENCE) as (keyof InferenceSettings)[]
);

export function sameInference(
  a: InferenceSettings | undefined,
  b: InferenceSettings | undefined
): boolean {
  if (a === b) return true;
  const x = a ?? DEFAULT_INFERENCE,
    y = b ?? DEFAULT_INFERENCE;
  return INFERENCE_STATE_KEYS.every((k) => x[k] === y[k]);
}

/** The stored settings for `patch` over `base`; undefined when they are all the defaults. */
export function mergeInference(
  base: InferenceSettings | undefined,
  patch: InferenceState
): InferenceSettings | undefined {
  const merged = Object.freeze({ ...DEFAULT_INFERENCE, ...base, ...patch });
  return sameInference(merged, DEFAULT_INFERENCE) ? undefined : merged;
}

/** The public form of stored settings: the fields that differ from the defaults, or undefined. */
export function inferenceState(
  settings: InferenceSettings | undefined
): InferenceState | undefined {
  if (settings === undefined) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of INFERENCE_STATE_KEYS) {
    if (settings[k] !== DEFAULT_INFERENCE[k]) out[k] = settings[k];
  }
  return Object.keys(out).length === 0 ? undefined : (out as InferenceState);
}
