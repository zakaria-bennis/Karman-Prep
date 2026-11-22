"use server";

/*
 * Settings, Plan and billing: how the student's plan is held and until when, read when the folder
 * opens (the same sources the plan gate reads: Stripe plans and plan grants). Billing itself stays
 * Stripe's: checkout (/checkout/start) and the customer portal (/api/stripe/portal) are unchanged.
 */
import { getPlan } from "@/lib/plans";
import { portalDb, viewedStudent, type Failure } from "./own-student";
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
    };
  } catch (e) {
    console.error("[settings] plan read failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "Your plan didn't load. Try again in a moment." };
  }
}
