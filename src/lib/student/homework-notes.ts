/*
 * One-line notes on finished homework, signed "David" (founder, 2026-11-07 and 2026-11-08;
 * David agreed in writing). They are written by rules from the result, not by a paid AI call,
 * so they cost nothing and read the same every time the page loads. Each result band has a few
 * phrasings, picked by the homework's id, so a list of notes doesn't repeat itself.
 */

export const NOTE_AUTHOR = "David";

export interface NoteInput {
  /** Stable id of the homework, so the same item always gets the same line. */
  key: string;
  correct?: number;
  total?: number;
  /** Active seconds spent, when known. */
  seconds?: number | null;
  /** Typical seconds per question for this student, to spot fast, careful work. */
  paceSeconds?: number;
  /** Timed work (time trials, tests) gets lines about the clock instead of videos. */
  timed?: boolean;
}

const LINES = {
  fast: [
    "Fast and accurate. Try a harder set next.",
    "Quick and clean. You're ready for tougher questions.",
  ],
  great: [
    "Excellent work. This skill is looking solid.",
    "Nearly perfect. Keep it fresh with a quick review next week.",
    "Great set. Skim the explanations for any misses and move on.",
  ],
  good: [
    "Nice work. Look over the misses, then keep going.",
    "Good set. The explanations for the misses are worth two minutes.",
  ],
  mixed: [
    "Good effort. Rewatch the video before your next set.",
    "Halfway there. Read each explanation, then try it again tomorrow.",
  ],
  low: [
    "Tough set, and that's fine. Rewatch the video, then try again.",
    "This one is still new. Start with the video, then a fresh set.",
  ],
  done: ["Done. Thanks for staying on top of it.", "Finished on your end. Nice follow-through."],
  timedGreat: [
    "Strong and steady under the clock. Keep that pace.",
    "Fast and accurate. That pace holds up on test day.",
  ],
  timedGood: [
    "Good pace. The misses are worth a second look.",
    "Solid under time. Check where the misses came from.",
  ],
  timedLow: [
    "The clock is the hard part. Practice untimed first, then try again.",
    "Tough under time. Slow down in practice, then come back to it.",
  ],
} as const;

function pick(lines: readonly string[], key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return lines[h % lines.length];
}

/** The note line for a finished piece of homework. */
export function homeworkNote(input: NoteInput): string {
  const { key, correct, total } = input;
  if (correct === undefined || !total) return pick(LINES.done, key);
  const share = correct / total;
  if (input.timed) {
    if (share >= 0.85) return pick(LINES.timedGreat, key);
    if (share >= 0.65) return pick(LINES.timedGood, key);
    return pick(LINES.timedLow, key);
  }
  const perQuestion = input.seconds ? input.seconds / total : null;
  const quick =
    perQuestion !== null && !!input.paceSeconds && perQuestion < input.paceSeconds * 0.75;
  if (share >= 0.9 && quick) return pick(LINES.fast, key);
  if (share >= 0.9) return pick(LINES.great, key);
  if (share >= 0.7) return pick(LINES.good, key);
  if (share >= 0.5) return pick(LINES.mixed, key);
  return pick(LINES.low, key);
}
