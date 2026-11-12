/*
 * The reward layer's sounds, ported from the founder's prototype (prototypes/quiz-modes/src/reward
 * sfx.ts, the round-one set from prototypes/daily10-end/core.js): soft sine tones in C major, one
 * sound per real moment, synthesised in code (./synth.ts), never a shipped sample.
 *
 * They follow the quiz's "Practice sounds" switch (src/lib/sound-preference.ts, in the quiz menu):
 * off for every new page session until the student turns it on. Turning "Quiz sounds" off in
 * Settings silences them too.
 */
import { soundEnabled, subscribeSoundPreference } from "@/lib/sound-preference";
import { quizSoundsEnabled } from "@/lib/quiz/reward-sound";
import { N, S, ac, coin, noise, tone } from "./synth";

export type SfxName =
  | "select"
  | "correct"
  | "miss"
  | "pop"
  | "thud"
  | "chime"
  | "score"
  | "levelUp"
  | "drain"
  | "open"
  | "companion"
  | "tokens";

const allowed = () => soundEnabled() && quizSoundsEnabled();
if (typeof window !== "undefined") {
  S.muted = !allowed();
  subscribeSoundPreference(() => {
    S.muted = !allowed();
    if (!S.muted) unlock();
  });
}

/** Creates the audio context on a gesture, so the first sound is not swallowed. */
export function unlock() {
  if (S.muted) return;
  try {
    ac();
  } catch {
    /* no audio on this device */
  }
}

// every voice takes its start offset first; all notes sit in C major
const RAW: Record<SfxName, (...a: number[]) => void> = {
  // a choice is picked: one soft G6
  select: (t = 0) => tone(N(79), t, 0.035, 0.3),
  // a right answer: the round-one "Correct", a rising G major triad over a low G (streak3)
  correct: (t = 0) => {
    [
      [79, 0],
      [83, 0.075],
      [86, 0.15],
    ].forEach(([n, d]) => tone(N(n), t + d, 0.08));
    tone(N(67), t + 0.15, 0.035);
  },
  // a miss: the round-one drain, quieter, a gentle step down and nothing more
  miss: (t = 0) => {
    [
      [74, 0],
      [71, 0.14],
    ].forEach(([n, d]) => tone(N(n), t + d, 0.03, 0.6));
  },
  pop: (t = 0) =>
    tone(N(76), t, 0.06, 0.25, "triangle", [
      [1, 1],
      [2, 0.3],
    ]),
  thud: (t = 0) =>
    tone(N(43), t, 0.12, 0.35, "sine", [
      [1, 1],
      [1.5, 0.3],
    ]),
  chime: (t = 0) => {
    [
      [84, 0],
      [88, 0.09],
      [91, 0.18],
    ].forEach(([n, d]) => tone(N(n), t + d, 0.06));
  },
  score: (t = 0) => {
    [
      [72, 0],
      [76, 0.1],
      [79, 0.2],
      [84, 0.32],
    ].forEach(([n, d]) => tone(N(n), t + d, 0.075));
    tone(N(60), t + 0.32, 0.045, 1.6);
  },
  levelUp: (t = 0) => {
    [
      [67, 0],
      [72, 0.11],
      [76, 0.22],
      [79, 0.33],
      [84, 0.5],
      [88, 0.5],
    ].forEach(([n, d]) => tone(N(n), t + d, 0.07, 1.4));
    tone(N(48), t + 0.5, 0.05, 2);
  },
  drain: (t = 0) => {
    [
      [74, 0],
      [71, 0.14],
      [67, 0.28],
    ].forEach(([n, d]) => tone(N(n), t + d, 0.04, 0.7));
  },
  open: (t = 0) => {
    noise(t, 0.6, 0.045, 500, 4000, 0.6);
    [
      [84, 0.15],
      [88, 0.24],
      [91, 0.33],
      [96, 0.42],
    ].forEach(([n, d]) => tone(N(n), t + d, 0.06, 1.3));
  },
  // a new companion: one warm rising chord
  companion: (t = 0) => {
    [
      [72, 0],
      [79, 0.12],
      [84, 0.24],
      [88, 0.36],
    ].forEach(([n, d]) => tone(N(n), t + d, 0.06, 1.5));
    tone(N(55), t + 0.36, 0.04, 1.8);
  },
  // the payout, after a pool game's coin shower: bright small coins (5.6 to 8.5 kHz, rings up to
  // 19 kHz) pour onto a pile, one cluster per token landing, louder as it fills, with little jingles
  // between; then one burst as the count lands, a weight under it, and one coin left ringing (E8)
  tokens: (t = 0, n = 14, gap = 0.05) => {
    let seed = 11;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const hz = () => 5600 * Math.pow(2, r() * 0.6);
    const span = n * gap;
    for (let i = 0; i < n; i++) {
      const at = t + i * gap;
      const lvl = 0.03 + 0.02 * (i / Math.max(1, n - 1));
      const m = 2 + Math.floor(r() * 3);
      for (let j = 0; j < m; j++)
        coin(
          at + j * (0.006 + r() * 0.016),
          hz(),
          lvl * (j ? 0.5 + r() * 0.3 : 1),
          0.035 + r() * 0.06
        );
    }
    for (let x = t + 0.01; x < t + span + 0.05; x += 0.008 + r() * 0.012)
      coin(x, hz() * 1.08, 0.009 + r() * 0.009, 0.025);
    const end = t + span + 0.02;
    for (let j = 0; j < 10; j++)
      coin(end + j * (0.006 + r() * 0.008), hz(), 0.052 * (1 - j * 0.05), 0.08 + r() * 0.1);
    tone(N(43), end, 0.016, 0.18, "sine", [
      [1, 1],
      [2.02, 0.35],
    ]);
    coin(end + 0.05, N(112), 0.04, 0.75);
    [0.2, 0.31, 0.47].forEach((d, i) => coin(end + d, hz(), 0.016 / (i + 1), 0.1));
  },
};

/** Plays one moment's sound when sounds are on. Never throws: sound is only an extra. */
export const SFX = Object.fromEntries(
  (Object.keys(RAW) as SfxName[]).map((k) => [
    k,
    (...args: number[]) => {
      S.muted = !allowed();
      if (S.muted) return;
      try {
        RAW[k](...args);
      } catch {
        /* audio unavailable */
      }
    },
  ])
) as Record<SfxName, (...args: number[]) => void>;
