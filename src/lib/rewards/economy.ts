/*
 * The reward economy's rules, pure so the server, the client and the tests share them
 * (founder's reward layer, prototypes/quiz-modes/src/reward/economy.ts, on real data):
 *
 * - Tokens are earned per right answer (src/lib/quiz/points.ts: 10, or 15 for a hard one).
 * - Tokens only buy mystery boxes. The balance is every token earned, minus each box's cost,
 *   plus each box's token bonus. The database applies the same rule atomically when a box opens
 *   (open_reward_box in supabase/migrations/20261112231500_rewards.sql).
 * - A box holds an accessory the student does not own yet; once all five are owned, tokens back.
 * - Each companion joins for a real milestone; the fox is everyone's first.
 */
import {
  ACCESSORY_IDS,
  ANIMALS,
  BOX_BONUS_TOKENS,
  BOX_COST,
  STARTER,
  type AccessoryId,
  type AnimalId,
} from "./catalog";

export interface OpenedBox {
  cost: number;
  bonus: number;
}

/** Tokens to spend: earned, minus every box's cost, plus every box's bonus. Never below zero. */
export function balanceOf(earned: number, boxes: readonly OpenedBox[]): number {
  const net = boxes.reduce((n, b) => n + b.cost - b.bonus, 0);
  return Math.max(0, Math.floor(earned) - net);
}

/** How close the next box is: whether one can be opened now, the tokens to go and the share. */
export function boxProgress(balance: number): { ready: boolean; toGo: number; share: number } {
  const b = Math.max(0, Math.floor(balance));
  if (b >= BOX_COST) return { ready: true, toGo: 0, share: 1 };
  return { ready: false, toGo: BOX_COST - b, share: b / BOX_COST };
}

/** How many boxes the balance pays for. */
export const boxesAffordable = (balance: number) => Math.floor(Math.max(0, balance) / BOX_COST);

export type Prize = { kind: "accessory"; id: AccessoryId } | { kind: "tokens"; bonus: number };

/**
 * The prize a box holds (the database makes the same pick under its lock): the first accessory in
 * `order` the student does not own, or tokens back when they own them all.
 */
export function pickPrize(owned: readonly AccessoryId[], order: readonly AccessoryId[]): Prize {
  const have = new Set(owned);
  const id = order.find((a) => !have.has(a));
  return id ? { kind: "accessory", id } : { kind: "tokens", bonus: BOX_BONUS_TOKENS };
}

/** The accessories in a random order (Fisher-Yates), so each box is a surprise. */
export function shuffledAccessories(random: () => number = Math.random): AccessoryId[] {
  const out = [...ACCESSORY_IDS];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const DAY_MS = 86_400_000;

/** The longest run of consecutive days among `YYYY-MM-DD` keys (duplicates count once). */
export function longestRun(days: readonly string[]): number {
  const stamps = [...new Set(days)]
    .map((d) => Date.parse(`${d}T00:00:00Z`))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < stamps.length; i++) {
    run = i > 0 && stamps[i] - stamps[i - 1] === DAY_MS ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/** What the server reads to decide which companions a student has earned. */
export interface RewardFacts {
  /** Days with a finished Daily 10, as `YYYY-MM-DD`. */
  dailyTenDays: readonly string[];
  /** Finished full-length practice tests. */
  fullTests: number;
  /** Whether any Time Trial beat its pace. */
  trialBeaten: boolean;
  /** Questions answered in the quiz flows. */
  answered: number;
  /** Skills at Conquered, the top level. */
  conquered: number;
}

export const BUNNY_DAYS = 7;
export const BEAR_ANSWERS = 500;

/** Every companion these facts earn, the fox first. */
export function earnedCompanions(facts: RewardFacts): AnimalId[] {
  const out: AnimalId[] = [STARTER];
  if (longestRun(facts.dailyTenDays) >= BUNNY_DAYS) out.push("bunny");
  if (facts.conquered > 0) out.push("cat");
  if (facts.fullTests > 0) out.push("owl");
  if (facts.answered >= BEAR_ANSWERS) out.push("bear");
  if (facts.trialBeaten) out.push("wolf");
  return out;
}

/** "The bunny joins you", for a companion's moment. */
export function joinLine(animal: AnimalId): string {
  return `The ${ANIMALS[animal].name.toLowerCase()} joins you`;
}

export type EndingPhase = "companion" | "box" | "results";

/**
 * The Daily 10's "Box first" ending, in order: a new companion's moment when one joined, then the
 * box when today earned tokens (it can be opened when the balance pays for a mystery box), then
 * the results. Reduced motion keeps the order; each moment simply holds still.
 */
export function endingPhases(input: { newCompanions: number; tokensToday: number }): EndingPhase[] {
  const out: EndingPhase[] = [];
  if (input.newCompanions > 0) out.push("companion");
  if (input.tokensToday > 0) out.push("box");
  out.push("results");
  return out;
}

/** The state the Rewards page and the Daily 10 ending draw from. */
export interface RewardState {
  earned: number;
  balance: number;
  boxesOpened: number;
  companions: { animal: AnimalId; seen: boolean }[];
  accessories: AccessoryId[];
  wear: { animal: AnimalId; accessory: AccessoryId | null };
}
