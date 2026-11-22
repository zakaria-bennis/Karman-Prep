"use server";

/*
 * Spending coins in the portal's Rewards, and dressing the character. Each action works only on
 * the signed-in student's own row, reads their balance on the server, and charges the price set in
 * rewardsData.ts (his prices, 2026-11-16), never one sent by the page. An admin previewing a
 * student can look, never spend.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { fetchUserRole, resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { BOX_PRICE, PASSES } from "@/app/dev/shell/rewardsData";
import { earnedOf, loadAwards, loadRewardRow, type RewardRow } from "./rewards";

export type SpendResult = { ok: true; coins: number } | { ok: false; error: string };

const itemId = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9-]+$/);

async function student(): Promise<string | null> {
  const { userId } = await safeAuth();
  if (!userId) return null;
  const { clerkId, isImpersonating } = await resolveEffectiveClerkId(userId);
  if (isImpersonating) return null;
  return (await fetchUserRole(clerkId)) === "student" ? clerkId : null;
}

async function save(db: SupabaseClient, clerkId: string, row: RewardRow) {
  const { error } = await db
    .from("portal_rewards")
    .upsert({ student_id: clerkId, ...row, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Charges `price` and applies `change`, if the student has the coins. */
async function spend(price: number, change: (row: RewardRow) => RewardRow | string) {
  const clerkId = await student();
  if (!clerkId) return { ok: false, error: "Sign in as a student to spend coins." } as const;
  const db = createAdminClient() as unknown as SupabaseClient;
  const [awards, row] = await Promise.all([loadAwards(db, clerkId), loadRewardRow(db, clerkId)]);
  const balance = earnedOf(awards, Date.now()) - row.spent;
  if (balance < price) return { ok: false, error: "Not enough coins yet." } as const;
  const next = change(row);
  if (typeof next === "string") return { ok: false, error: next } as const;
  await save(db, clerkId, { ...next, spent: row.spent + price });
  return { ok: true, coins: balance - price } as const;
}

/** Opens a box: the thing it gave is kept. */
export async function actionOpenBox(input: { prizeId: string }): Promise<SpendResult> {
  const { prizeId } = z.object({ prizeId: itemId }).parse(input);
  return spend(BOX_PRICE, (row) =>
    row.owned.includes(prizeId)
      ? "That one is already yours."
      : row.owned.length >= 100
        ? "Every box has been opened."
        : { ...row, owned: [...row.owned, prizeId] }
  );
}

/** Buys a pass, up to as many as may be kept. */
export async function actionBuyPass(input: { name: string }): Promise<SpendResult> {
  const { name } = z.object({ name: z.string().min(1).max(60) }).parse(input);
  const pass = PASSES.find((p) => p.name === name);
  if (!pass) return { ok: false, error: "No such pass." };
  return spend(pass.price, (row) => {
    const held = row.passes[name] ?? 0;
    if (pass.bank !== undefined && held >= pass.bank) return `You can keep ${pass.bank} at most.`;
    return { ...row, passes: { ...row.passes, [name]: held + 1 } };
  });
}

/** What the character has on: only things the student has won. */
export async function actionWear(input: {
  face: string;
  outfit: Record<string, string | undefined>;
}): Promise<{ ok: boolean }> {
  const parsed = z
    .object({
      face: itemId,
      outfit: z.record(z.string().max(20), itemId.optional()),
    })
    .parse(input);
  const clerkId = await student();
  if (!clerkId) return { ok: false };
  const db = createAdminClient() as unknown as SupabaseClient;
  const row = await loadRewardRow(db, clerkId);
  const outfit = Object.fromEntries(
    Object.entries(parsed.outfit).filter(
      (e): e is [string, string] => typeof e[1] === "string" && row.owned.includes(e[1])
    )
  );
  await save(db, clerkId, { ...row, face: parsed.face, outfit });
  return { ok: true };
}
