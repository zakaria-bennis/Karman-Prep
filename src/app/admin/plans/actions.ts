"use server";

// ============================================================
// Server actions: comp a plan, end a comp, and change a Stripe
// TEST subscription's plan. Each action Zod-validates its input,
// checks the admin role on the server, and returns a plain
// message. Nothing here throws to the page.
// ============================================================

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AdminRequiredError, requireAdmin, type AdminUser } from "@/lib/auth/admin-guard";
import { stripe } from "@/lib/integrations/stripe/client";
import { isStripeTestKey } from "@/lib/scholarship/payout";
import { COMPS_MISSING_MESSAGE, PLAN_LABEL, adminDb, isMissingTable } from "@/lib/admin/plans";

export type PlanActionResult = { ok: true; message?: string } | { ok: false; error: string };

class PlanActionError extends Error {}

const PATH = "/admin/plans";

async function run(fn: (admin: AdminUser) => Promise<string>): Promise<PlanActionResult> {
  try {
    const admin = await requireAdmin();
    const message = await fn(admin);
    revalidatePath(PATH);
    return { ok: true, message };
  } catch (err) {
    if (err instanceof PlanActionError || err instanceof AdminRequiredError) {
      return { ok: false, error: err.message };
    }
    console.error("[admin/plans]", err);
    return { ok: false, error: "Something went wrong. Nothing was changed." };
  }
}

function invalid(error: { issues: { message: string }[] }): PlanActionResult {
  return { ok: false, error: error.issues[0]?.message ?? "Check the form and try again." };
}

const compSchema = z.object({
  userId: z.guid(),
  planId: z.enum(["practice", "pro"]),
  endsOn: z.union([z.literal(""), z.iso.date()]).optional(),
  reason: z
    .string()
    .trim()
    .min(3, "Add a short reason.")
    .max(200, "Keep the reason under 200 characters."),
});

/** Grants Practice or Pro for free (plan_grants, source 'admin'). */
export async function actionCompPlan(input: unknown): Promise<PlanActionResult> {
  const v = compSchema.safeParse(input);
  if (!v.success) return invalid(v.error);
  return run(async (admin) => {
    const { userId, planId, endsOn, reason } = v.data;
    const expiresAt = endsOn ? `${endsOn}T23:59:59.000Z` : null;
    if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
      throw new PlanActionError("Pick an end date in the future, or leave it empty.");
    }
    const db = adminDb();
    const { data: user, error: userError } = await db
      .from("users")
      .select("id, clerk_id")
      .eq("id", userId)
      .maybeSingle();
    if (userError) throw new PlanActionError(`Couldn't read the user: ${userError.message}`);
    const clerkId = (user as { clerk_id?: string | null } | null)?.clerk_id;
    if (!clerkId)
      throw new PlanActionError("This user has no sign-in id yet, so a comp can't attach.");

    // One admin row per (admin, user): a second comp from the same admin
    // replaces the first and clears any end, as the unique index expects.
    const { error } = await db.from("plan_grants").upsert(
      {
        user_id: clerkId,
        plan_id: planId,
        source: "admin",
        source_ref: admin.userId,
        sponsor_user_id: null,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
        revoked_at: null,
      },
      { onConflict: "source,source_ref,user_id" }
    );
    if (error) {
      if (isMissingTable(error)) throw new PlanActionError(COMPS_MISSING_MESSAGE);
      throw new PlanActionError(`The comp wasn't saved: ${error.message}`);
    }
    // plan_grants has no reason column, so the reason goes to the server log.
    console.info("[admin/plans] comp", { admin: admin.userId, userId, planId, expiresAt, reason });
    return `${PLAN_LABEL[planId]} comped${endsOn ? ` until ${endsOn}` : " with no end date"}.`;
  });
}

const endSchema = z.object({ grantId: z.guid() });

/** Ends an admin comp now (revoked_at). Purchases and school seats are left alone. */
export async function actionEndComp(input: unknown): Promise<PlanActionResult> {
  const v = endSchema.safeParse(input);
  if (!v.success) return invalid(v.error);
  return run(async () => {
    const { data, error } = await adminDb()
      .from("plan_grants")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", v.data.grantId)
      .eq("source", "admin")
      .is("revoked_at", null)
      .select("id");
    if (error) {
      if (isMissingTable(error)) throw new PlanActionError(COMPS_MISSING_MESSAGE);
      throw new PlanActionError(`The comp wasn't ended: ${error.message}`);
    }
    if (!data || data.length === 0) throw new PlanActionError("That comp has already ended.");
    return "Comp ended.";
  });
}

const changeSchema = z.object({
  subscriptionId: z.guid(),
  planId: z.enum(["practice", "pro"]),
  term: z.enum(["month", "quarter"]),
});

const TERM_LABEL = { month: "every month", quarter: "every 3 months" } as const;

function stripeCode(err: unknown): { code?: string; statusCode?: number; message: string } {
  const e = err as { code?: string; statusCode?: number; message?: string };
  return { code: e?.code, statusCode: e?.statusCode, message: e?.message ?? String(err) };
}

async function retrieveSubscription(stripeId: string) {
  try {
    return await stripe.subscriptions.retrieve(stripeId);
  } catch (err) {
    const e = stripeCode(err);
    if (e.code === "resource_missing" || e.statusCode === 404) {
      throw new PlanActionError(
        `Stripe has no subscription ${stripeId}. Seeded rows use made-up ids. Only a real test checkout can change plan.`
      );
    }
    throw new PlanActionError(`Stripe didn't answer: ${e.message}`);
  }
}

/** Swaps a Stripe TEST subscription to another plan and term by price lookup key. */
export async function actionChangePlan(input: unknown): Promise<PlanActionResult> {
  const v = changeSchema.safeParse(input);
  if (!v.success) return invalid(v.error);
  return run(async () => {
    if (!isStripeTestKey(process.env.STRIPE_SECRET_KEY)) {
      throw new PlanActionError(
        "Plan changes run in Stripe test mode only. This server doesn't have a Stripe test key."
      );
    }
    const { subscriptionId, planId, term } = v.data;
    const db = adminDb();
    const { data: row, error: rowError } = await db
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .maybeSingle();
    if (rowError) throw new PlanActionError(`Couldn't read the subscription: ${rowError.message}`);
    const local = row as Record<string, unknown> | null;
    if (!local) throw new PlanActionError("That subscription isn't in the database anymore.");
    const stripeId =
      typeof local.stripe_subscription_id === "string" ? local.stripe_subscription_id : "";
    if (!stripeId.startsWith("sub_")) {
      throw new PlanActionError(
        "This subscription has no Stripe id, so there's nothing to change."
      );
    }

    const sub = await retrieveSubscription(stripeId);
    if (sub.status === "canceled" || sub.status === "incomplete_expired") {
      throw new PlanActionError("This subscription has ended in Stripe, so it can't change plan.");
    }
    const item = sub.items.data[0];
    if (!item) throw new PlanActionError("This Stripe subscription has no item to change.");

    const lookupKey = `${planId}_${term === "month" ? "monthly" : "3_months"}`;
    let priceId: string | undefined;
    try {
      const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
      priceId = prices.data[0]?.id;
    } catch (err) {
      throw new PlanActionError(`Stripe didn't answer: ${stripeCode(err).message}`);
    }
    if (!priceId) {
      throw new PlanActionError(`Stripe has no active price with the lookup key ${lookupKey} yet.`);
    }
    const label = `${PLAN_LABEL[planId]}, billed ${TERM_LABEL[term]}`;
    if (item.price.id !== priceId) {
      try {
        await stripe.subscriptions.update(sub.id, { items: [{ id: item.id, price: priceId }] });
      } catch (err) {
        throw new PlanActionError(`Stripe refused the change: ${stripeCode(err).message}`);
      }
    }

    if (!("plan_id" in local)) {
      return `Stripe now bills ${label}. The local row will update when the pricing migration lands.`;
    }
    const patch: Record<string, string> = { plan_id: planId };
    if ("billing_term" in local) patch.billing_term = term;
    const { error: updateError } = await db
      .from("subscriptions")
      .update(patch)
      .eq("id", subscriptionId);
    if (updateError) {
      return `Stripe now bills ${label}, but the local row didn't update (${updateError.message}). The Stripe webhook should catch up.`;
    }
    return `Changed to ${label}.`;
  });
}
