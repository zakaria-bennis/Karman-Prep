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
import { BOX_PRICE, PASSES, PASSES_COMING_SOON } from "@/app/dashboard/student/_portal/rewardsData";
import { nextPrize } from "./box-order";
import { loadRewardRow } from "./rewards";

export type SpendResult =
  | { ok: true; coins: number; owned?: string[] }
  | { ok: false; error: string; owned?: string[] };

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

const SAY: Record<string, string> = {
  not_enough: "Not enough coins yet.",
  owned: "That one is already yours.",
  full: "Every box has been opened.",
  max: "You have as many as you can keep.",
};

/** Charges `price` and applies the prize in one step in the database (portal_spend, migration
 *  20261122040100): the balance counts everything earned less everything spent, old boxes too,
 *  under the same lock, so the same coins are never spent twice. */
async function spend(
  clerkId: string,
  price: number,
  prize: { owned?: string; pass?: string; passMax?: number }
): Promise<SpendResult> {
  const db = createAdminClient() as unknown as SupabaseClient;
  const { data, error } = await db.rpc("portal_spend", {
    p_student: clerkId,
    p_price: price,
    p_add_owned: prize.owned ?? null,
    p_pass: prize.pass ?? null,
    p_pass_max: prize.passMax ?? null,
  });
  if (error || !data) return { ok: false, error: "No coins were spent. Try again." };
  const r = data as { ok: boolean; error?: string; coins?: number; owned?: string[] };
  if (!r.ok)
    return { ok: false, error: SAY[r.error ?? ""] ?? "No coins were spent.", owned: r.owned };
  return { ok: true, coins: r.coins ?? 0, owned: r.owned };
}

/** Opens a box. What it gives is decided here, by the box's own order, never by the page: the
 *  page's guess must match, and when it does not (another tab opened one) the page is handed the
 *  student's things to catch up. */
export async function actionOpenBox(input: { prizeId: string }): Promise<SpendResult> {
  const { prizeId } = z.object({ prizeId: itemId }).parse(input);
  const clerkId = await student();
  if (!clerkId) return { ok: false, error: "Sign in as a student to spend coins." };
  const db = createAdminClient() as unknown as SupabaseClient;
  let owned: string[];
  try {
    owned = (await loadRewardRow(db, clerkId)).owned;
  } catch {
    return { ok: false, error: "No coins were spent. Try again." };
  }
  const expected = nextPrize(owned);
  if (!expected) return { ok: false, error: SAY.full, owned };
  if (expected !== prizeId) return { ok: false, error: "Your boxes caught up. Try again.", owned };
  return spend(clerkId, BOX_PRICE, { owned: expected });
}

/** Buys a pass, up to as many as may be kept. */
export async function actionBuyPass(input: { name: string }): Promise<SpendResult> {
  const { name } = z.object({ name: z.string().min(1).max(60) }).parse(input);
  const pass = PASSES.find((p) => p.name === name);
  if (!pass) return { ok: false, error: "No such pass." };
  if (PASSES_COMING_SOON.includes(name)) return { ok: false, error: "This pass is coming soon." };
  const clerkId = await student();
  if (!clerkId) return { ok: false, error: "Sign in as a student to spend coins." };
  return spend(clerkId, pass.price, { pass: name, passMax: pass.bank });
}

/** What the character has on: only things the student has won. Writes only the face and outfit,
 *  and nothing at all when the student's things cannot be read. */
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
  let owned: string[];
  try {
    owned = (await loadRewardRow(db, clerkId)).owned;
  } catch {
    return { ok: false };
  }
  const outfit = Object.fromEntries(
    Object.entries(parsed.outfit).filter(
      (e): e is [string, string] => typeof e[1] === "string" && owned.includes(e[1])
    )
  );
  const { error } = await db.from("portal_rewards").upsert({
    student_id: clerkId,
    face: parsed.face,
    outfit,
    updated_at: new Date().toISOString(),
  });
  return { ok: !error };
}
