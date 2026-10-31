import { addDays, TODAY } from "./clock";
import { seeded } from "@/design-system/backgrounds/useCanvasLoop";
import { DAILY10_TOKENS } from "./questions";
import type { AccessoryId } from "@/design-system/marks/accessories";
import type { DayValue } from "@/design-system/components/Heatmap";

/**
 * Tokens, boxes, companions and streaks per student. Tokens work like Crossy
 * Road: collect them, spend 300 on a mystery box. The owl is the first earned
 * companion, for 7 days in a row. Totals are computed, never typed twice.
 */
export const BOX_COST = 300;

export interface Rewards {
  studentId: string;
  tokensBefore: number;
  tokensToday: number;
  tokens: number;
  boxes: number;
  tokensAfterBoxes: number;
  streak: number;
  companions: ("fox" | "owl")[];
  wearing?: AccessoryId;
  owned: AccessoryId[];
}

function build(
  studentId: string,
  tokensBefore: number,
  tokensToday: number,
  streak: number,
  owned: AccessoryId[],
  wearing?: AccessoryId
): Rewards {
  const tokens = tokensBefore + tokensToday;
  const boxes = Math.min(1, Math.floor(tokens / BOX_COST));
  return {
    studentId,
    tokensBefore,
    tokensToday,
    tokens,
    boxes,
    tokensAfterBoxes: tokens - boxes * BOX_COST,
    streak,
    companions: streak >= 7 ? ["fox", "owl"] : ["fox"],
    owned,
    wearing,
  };
}

export const REWARDS: Record<string, Rewards> = {
  maya: build("maya", 240, DAILY10_TOKENS, 7, ["glasses", "cap"], "cap"),
  noah: build("noah", 0, 0, 0, []),
  lin: build("lin", 120, 60, 3, ["bow"]),
  sofia: build("sofia", 410, 70, 12, ["headphones", "scarf"], "headphones"),
  ava: build("ava", 185, 80, 5, ["glasses"], "glasses"),
  theo: build("theo", 95, 0, 1, []),
};

/** Practice minutes per day for the heatmap, 16 weeks back, seeded; the streak is counted from these. */
export function practiceDays(studentId: string): DayValue[] {
  const r = REWARDS[studentId];
  const rnd = seeded(studentId.length * 97 + (r?.tokens ?? 1));
  const out: DayValue[] = [];
  for (let i = 111; i >= 0; i--) {
    const date = addDays(TODAY, -i);
    const inStreak = i < (r?.streak ?? 0);
    const active =
      inStreak ||
      (r &&
        r.streak > 0 &&
        rnd() < (studentId === "maya" || studentId === "sofia" ? 0.72 : 0.45) &&
        i > (r?.streak ?? 0));
    out.push({ date, value: active ? 6 + Math.round(rnd() * 20) : 0 });
  }
  return out;
}

export function streakFrom(days: DayValue[]): number {
  let n = 0;
  for (let i = days.length - 1; i >= 0 && days[i].value > 0; i--) n++;
  return n;
}

console.assert(
  REWARDS.maya.tokens === 325 && REWARDS.maya.boxes === 1 && REWARDS.maya.tokensAfterBoxes === 25,
  "Maya: 240 + 85 = 325, one box, 25 left"
);
console.assert(
  REWARDS.noah.tokens === 0 && REWARDS.noah.companions.join() === "fox",
  "Noah starts with the fox and no tokens"
);
console.assert(
  Object.values(REWARDS).every((r) => r.tokens === r.tokensBefore + r.tokensToday),
  "totals add up"
);
console.assert(
  Object.keys(REWARDS).every((id) => streakFrom(practiceDays(id)) === REWARDS[id].streak),
  "the heatmap's streak matches the rewards streak"
);
