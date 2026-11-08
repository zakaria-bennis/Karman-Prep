export type DotState = "open" | "current" | "correct" | "wrong" | "locked";
export type RewardState = {
  streak: number;
  seenKeys: string[];
  setPoints: number;
  dots: DotState[];
};
export type RewardEvent = {
  kind: "graded";
  key: string;
  index: number;
  correct: boolean;
  points: number;
};
export type RewardTier = "none" | "correct" | "streak5";

export const STREAK_SHOWN_AT = 3;
export const STREAK_BONUS_EVERY = 5;
export const MAX_DOTS = 12;

export function initialRewards(length: number): RewardState {
  return { streak: 0, seenKeys: [], setPoints: 0, dots: Array<DotState>(length).fill("open") };
}

/** Counts one graded answer. A key already seen (double tap, retry) changes nothing. */
export function rewardReducer(state: RewardState, ev: RewardEvent): RewardState {
  if (state.seenKeys.includes(ev.key)) return state;
  const dots = state.dots.slice();
  if (ev.index >= 0 && ev.index < dots.length) dots[ev.index] = ev.correct ? "correct" : "wrong";
  return {
    streak: ev.correct ? state.streak + 1 : 0,
    seenKeys: [...state.seenKeys, ev.key],
    setPoints: state.setPoints + (ev.correct ? ev.points : 0),
    dots,
  };
}

export function rewardFor(state: RewardState): { tier: RewardTier; showStreak: boolean } {
  const lastCorrect = state.streak > 0;
  return {
    tier: !lastCorrect ? "none" : state.streak % STREAK_BONUS_EVERY === 0 ? "streak5" : "correct",
    showStreak: state.streak >= STREAK_SHOWN_AT,
  };
}

export function showsDots(length: number): boolean {
  return length <= MAX_DOTS;
}
