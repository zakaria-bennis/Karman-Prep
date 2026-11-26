"use server";

/*
 * Settings, Plan and billing: how the student's plan is held and until when, read when the folder
 * opens (the same sources the plan gate reads: Stripe plans and plan grants). Billing itself stays
 * Stripe's: checkout (/checkout/start) and the customer portal (/api/stripe/portal) are unchanged.
 */
import {
  getPlan,
  setTesterPlan,
  TesterSwitchOffError,
  testerPlanInputSchema,
  testerSwitchOn,
  type TesterPlanId,
} from "@/lib/plans";
import { ownStudent, portalDb, viewedStudent, type Failure } from "./own-student";
import { isDevAuthBypassActive, safeAuth } from "@/lib/auth/dev-auth";
import type { PlanState } from "./settings-rules";
import { emptySchema } from "./settings-schemas";

/** Renewing plans that still hold the student (start-checkout.ts refuses a second one). */
const LIVE = new Set(["active", "trialing", "past_due", "incomplete"]);

export async function actionPlanState(
  input: unknown
): Promise<({ ok: true } & PlanState) | Failure> {
  if (!emptySchema.safeParse(input).success) return { ok: false, error: "Try that again." };
  const who = await viewedStudent();
  if (!who.ok) return who;
  try {
    const [resolved, subs] = await Promise.all([
      getPlan(who.student.clerkId),
      portalDb()
        .from("subscriptions")
        .select("status, stripe_customer_id")
        .eq("user_id", who.student.clerkId)
        .order("created_at", { ascending: false }),
    ]);
    const rows = (subs.data ?? []) as { status: string; stripe_customer_id: string | null }[];
    const source = resolved.sources.find((s) => s.planId === resolved.planId) ?? null;
    return {
      ok: true,
      planId: resolved.planId,
      source: source?.kind ?? null,
      endsAt: source?.endsAt ?? null,
      status: source?.kind === "subscription" ? (rows[0]?.status ?? null) : null,
      hasBilling: rows.some((r) => Boolean(r.stripe_customer_id)),
      renewing: rows.some((r) => LIVE.has(r.status)),
      testing: testerSwitchOn(),
      testAccount: isDevAuthBypassActive() ? ((await safeAuth()).userId ?? null) : undefined,
      testAccounts: isDevAuthBypassActive()
        ? await (await import("@/lib/auth/test-accounts-list")).testAccounts()
        : undefined,
    };
  } catch (e) {
    console.error("[settings] plan read failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "Your plan didn't load. Try again in a moment." };
  }
}

/*
 * The testing switch (founder, 2026-11-23): while the site lock is on, a signed-in student picks any
 * of the five plans and has it at once, on the server too. The choice is saved with their account
 * (src/lib/plans/tester.ts). Stripe is never called. With the lock off it is refused.
 */
export async function actionSetTesterPlan(
  input: unknown
): Promise<{ ok: true; planId: TesterPlanId } | Failure> {
  const parsed = testerPlanInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick one of the five plans." };
  if (!testerSwitchOn()) return { ok: false, error: "The testing switch is off." };
  const who = await ownStudent();
  if (!who.ok) return who;
  try {
    const plan = await setTesterPlan(who.student.clerkId, parsed.data);
    return { ok: true, planId: plan.planId as TesterPlanId };
  } catch (e) {
    if (e instanceof TesterSwitchOffError)
      return { ok: false, error: "The testing switch is off." };
    console.error("[settings] tester plan save failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "That didn't switch. Try again in a moment." };
  }
}
