// The quiz's reward jingles (spec: Small wins, Sound). Founder decision 2026-10-27: on by default
// with a switch in More. This is separate from the app-wide sound switch in sound-preference.ts,
// which stays off until a student turns it on.
export type RewardSound = "correct" | "correctStreak" | "levelUp";

const KEY = "karman-quiz-sounds";
const FILES: Record<RewardSound, string> = {
  correct: "/sounds/quiz-correct.mp3",
  correctStreak: "/sounds/quiz-streak.mp3",
  levelUp: "/sounds/quiz-level-up.mp3",
};
const listeners = new Set<() => void>();
let memory: boolean | null = null;

export function quizSoundsEnabled(): boolean {
  if (memory !== null) return memory;
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setQuizSounds(on: boolean) {
  memory = on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* Kept in memory when storage is blocked. */
  }
  for (const l of listeners) l();
}

export function subscribeQuizSounds(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

type Howlish = { play(): number };
let cache: Partial<Record<RewardSound, Howlish>> = {};

/** Plays a reward jingle at a low volume. Never throws: sound is only an extra. */
export function playRewardSound(name: RewardSound) {
  if (typeof window === "undefined" || !quizSoundsEnabled()) return;
  try {
    if (!cache[name]) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Howl } = require("howler");
      cache = { ...cache, [name]: new Howl({ src: [FILES[name]], volume: 0.45 }) };
    }
    cache[name]!.play();
  } catch {
    /* Audio blocked or unavailable. */
  }
}
