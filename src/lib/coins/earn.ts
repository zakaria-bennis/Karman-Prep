// How coins are earned (founder, 2026-11-20; shared contract 7 of the overnight build). Pure.
//
// His rules: coins come from every right answer, finishing an activity, level-ups, streaks, and the
// challenge multiplier, which multiplies ALL coins earned (capped at x3). Weak skills pay more. The
// brake is shrinking pay for repeats (a repeat is answering the same question again); no daily cap
// and no "no pay for guessing" rule. A steady student earns about 3,000 coins a week.
//
// STAND-INS: every amount below is mine, not his (he has not set the per-answer amounts, how fast
// repeat pay shrinks, or how coins scale with time trials and endless). They are aimed at about
// 3,000 a week for a steady student once the multiplier has grown (a Daily 10, a skill set and the
// two challenge questions every day come to about 1,100 a week before the multiplier, so about 2,200
// at x2 and 3,300 at x3). Change them here and nowhere else.

export type CoinActivity =
  | "skill-set"
  | "daily-ten"
  | "endless"
  | "time-trial"
  | "challenge"
  | "strategy"
  | "review";

export const COIN_STAND_INS = {
  /** A right answer; a hard one (difficulty 5 to 7) pays more. */
  right: 4,
  rightHard: 6,
  /** By the skill's level when it was answered: Not started, Learning, Understanding, Proficient. */
  weak: [1.5, 1.5, 1.25, 1] as readonly number[],
  /** The same question answered again: the first time pays in full, then a half, a quarter, a tenth. */
  repeat: [1, 0.5, 0.25, 0.1] as readonly number[],
  /** Finishing the activity. */
  finish: {
    "skill-set": 15,
    "daily-ten": 25,
    endless: 10,
    "time-trial": 20,
    challenge: 10,
    strategy: 10,
    review: 10,
  } as Record<CoinActivity, number>,
  /** An endless run pays its finishing coins only from this many answers. */
  endlessFinishFrom: 10,
  /** Each level a skill gains. */
  levelUp: 40,
  /** The Daily 10's streak: this much a day in a row, up to the cap. */
  streakPerDay: 4,
  streakCap: 40,
} as const;

export const MAX_MULTIPLIER = 3;

export type EarnAnswer = {
  ok: boolean;
  /** 1 to 7. */
  difficulty: number;
  /** The skill's level (0 to 3) when the activity started. */
  level: number;
  /** How many times the student answered this question before (in earlier activities). */
  before: number;
};

export type EarnInput = {
  activity: CoinActivity;
  answers: readonly EarnAnswer[];
  /** Levels gained by skills (a skill set's level-up, a Daily 10's moves up). */
  levelsUp: number;
  /** Daily 10: days in a row, today included. */
  streakDays?: number;
  /** The challenge multiplier, 1 to 3. */
  multiplier: number;
};

export type Earned = {
  total: number;
  lines: { label: string; coins: number }[];
  multiplier: number;
};

const round = (n: number) => Math.round(n);

/** What one right answer pays, before the multiplier. */
export function answerCoins(a: EarnAnswer): number {
  if (!a.ok) return 0;
  const base = a.difficulty >= 5 ? COIN_STAND_INS.rightHard : COIN_STAND_INS.right;
  const weak = COIN_STAND_INS.weak[Math.max(0, Math.min(3, Math.round(a.level)))] ?? 1;
  const repeats = COIN_STAND_INS.repeat;
  const shrink = repeats[Math.min(repeats.length - 1, Math.max(0, Math.floor(a.before)))] ?? 0.1;
  return base * weak * shrink;
}

/** Every coin an activity earns, line by line, multiplied at the end. */
export function coinsFor(input: EarnInput): Earned {
  const lines: { label: string; coins: number }[] = [];
  const right = round(input.answers.reduce((n, a) => n + answerCoins(a), 0));
  if (right > 0) lines.push({ label: "Right answers", coins: right });
  const finishes =
    input.activity !== "endless" || input.answers.length >= COIN_STAND_INS.endlessFinishFrom;
  if (finishes && input.answers.length > 0)
    lines.push({ label: "Finished", coins: COIN_STAND_INS.finish[input.activity] });
  if (input.levelsUp > 0)
    lines.push({ label: "Level up", coins: input.levelsUp * COIN_STAND_INS.levelUp });
  if (input.streakDays && input.streakDays > 0)
    lines.push({
      label: `${input.streakDays}-day streak`,
      coins: Math.min(COIN_STAND_INS.streakCap, input.streakDays * COIN_STAND_INS.streakPerDay),
    });
  const before = lines.reduce((n, l) => n + l.coins, 0);
  const multiplier = Math.max(1, Math.min(MAX_MULTIPLIER, input.multiplier || 1));
  const total = round(before * multiplier);
  if (total > before)
    lines.push({ label: `Multiplier ×${multiplier.toFixed(2)}`, coins: total - before });
  return { total, lines, multiplier };
}
