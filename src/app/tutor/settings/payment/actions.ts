"use server";

// ============================================================
// Server actions for /tutor/settings/payment.
//
//  · actionStartOnboarding — create the Connect account if
//    needed, generate a Stripe-hosted onboarding link, return
//    the URL for the client to redirect to.
//  · actionUpdatePaymentDetails — for tutors who already onboarded
//    and want to swap bank account or add a debit card.
//  · actionRefreshAccountStatus — re-pulls live status from
//    Stripe (call after returning from the Stripe-hosted flow).
//  · actionGetExpressDashboardLink — login link to Stripe's
//    Express dashboard for the tutor (transactions, tax forms).
// ============================================================

import { revalidatePath } from "next/cache";
import { safeAuth } from "@/lib/auth/dev-auth";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import {
  createExpressAccount,
  createOnboardingLink,
  createUpdateLink,
  createLoginLink,
  fetchAccountStatus,
} from "@/lib/integrations/stripe/connect";

async function callerRow() {
  const { userId: clerkId } = await safeAuth();
  if (!clerkId) throw new Error("not_signed_in");

  const supabase = createAdminClient();
  const { data: u } = await supabase
    .from("users")
    .select(
      "id, role, email, first_name, last_name, stripe_connect_account_id, stripe_payouts_enabled"
    )
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!u) throw new Error("user_not_found");
  if (u.role !== "tutor" && u.role !== "admin") throw new Error("forbidden");
  if (!u.email) throw new Error("missing_email");
  return { caller: u, supabase };
}

async function publicBaseUrl(): Promise<string> {
  // Prefer the explicit env var; fall back to the request origin.
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("host");
  if (!host) throw new Error("no_host_header");
  return `${proto}://${host}`;
}

// ──────────────────────────────────────────────────────────
// Start (or resume) onboarding
// ──────────────────────────────────────────────────────────
export async function actionStartOnboarding(): Promise<{ url: string }> {
  console.log("[onboarding] start");

  let caller, supabase;
  try {
    ({ caller, supabase } = await callerRow());
    console.log(
      "[onboarding] caller resolved:",
      caller.id,
      caller.email,
      "existing acct:",
      caller.stripe_connect_account_id ?? "none"
    );
  } catch (err) {
    console.error("[onboarding] callerRow failed:", err instanceof Error ? err.message : err);
    throw err;
  }

  let accountId = caller.stripe_connect_account_id as string | null;

  if (!accountId) {
    try {
      accountId = await createExpressAccount({
        email: caller.email!,
        firstName: caller.first_name,
        lastName: caller.last_name,
      });
      console.log("[onboarding] created Stripe account:", accountId);
    } catch (err) {
      console.error(
        "[onboarding] createExpressAccount failed:",
        err instanceof Error ? err.message : err
      );
      throw err;
    }

    const { error: dbErr } = await supabase
      .from("users")
      .update({ stripe_connect_account_id: accountId })
      .eq("id", caller.id);
    if (dbErr) {
      console.error("[onboarding] save_account_failed:", dbErr.message);
      throw new Error(`save_account_failed: ${dbErr.message}`);
    }
    console.log("[onboarding] saved account id to users row");
  }

  let baseUrl: string;
  try {
    baseUrl = await publicBaseUrl();
    console.log("[onboarding] baseUrl:", baseUrl);
  } catch (err) {
    console.error("[onboarding] publicBaseUrl failed:", err instanceof Error ? err.message : err);
    throw err;
  }

  let url: string;
  try {
    url = await createOnboardingLink(accountId, baseUrl);
    console.log("[onboarding] onboarding link created");
  } catch (err) {
    console.error(
      "[onboarding] createOnboardingLink failed:",
      err instanceof Error ? err.message : err
    );
    throw err;
  }

  return { url };
}

// ──────────────────────────────────────────────────────────
// Update bank / debit card — routes the tutor to their Express
// Dashboard where banks + cards are managed. Stripe Express
// doesn't support `account_update` type Account Links for fully
// onboarded accounts, so we use a login link instead. This lands
// the tutor on Stripe's hosted dashboard with a Payouts section
// for adding/swapping debit cards and bank accounts.
// ──────────────────────────────────────────────────────────
export async function actionUpdatePaymentDetails(): Promise<{ url: string }> {
  const { caller } = await callerRow();
  if (!caller.stripe_connect_account_id) {
    throw new Error("not_onboarded_yet");
  }
  // The createUpdateLink path is kept for accounts that aren't
  // fully verified yet (Stripe still requires onboarding fields).
  // Once payouts are enabled, switch to the login link.
  if (caller.stripe_payouts_enabled) {
    const url = await createLoginLink(caller.stripe_connect_account_id as string);
    return { url };
  }
  const baseUrl = await publicBaseUrl();
  const url = await createUpdateLink(caller.stripe_connect_account_id as string, baseUrl);
  return { url };
}

// ──────────────────────────────────────────────────────────
// Refresh status from Stripe — call after redirect back from
// the Stripe-hosted onboarding to immediately reflect the new
// state (the webhook will catch up shortly too).
// ──────────────────────────────────────────────────────────
export async function actionRefreshAccountStatus(): Promise<{
  payouts_enabled: boolean;
  charges_enabled: boolean;
  ready: boolean;
  instant_payouts_active: boolean;
}> {
  const { caller, supabase } = await callerRow();
  if (!caller.stripe_connect_account_id) {
    return {
      payouts_enabled: false,
      charges_enabled: false,
      ready: false,
      instant_payouts_active: false,
    };
  }
  const status = await fetchAccountStatus(caller.stripe_connect_account_id as string);

  await supabase
    .from("users")
    .update({
      stripe_payouts_enabled: status.payouts_enabled,
      stripe_connect_onboarded_at: status.payouts_enabled ? new Date().toISOString() : null,
      payment_info_updated_at: new Date().toISOString(),
    })
    .eq("id", caller.id);

  revalidatePath("/tutor/settings/payment");
  revalidatePath("/tutor/payouts");
  revalidatePath("/tutor/earnings");
  return {
    payouts_enabled: status.payouts_enabled,
    charges_enabled: status.charges_enabled,
    ready: status.ready,
    instant_payouts_active: status.instant_payouts_active,
  };
}

// ──────────────────────────────────────────────────────────
// Express dashboard login link
// ──────────────────────────────────────────────────────────
export async function actionGetExpressDashboardLink(): Promise<{ url: string }> {
  const { caller } = await callerRow();
  if (!caller.stripe_connect_account_id) throw new Error("not_onboarded_yet");
  const url = await createLoginLink(caller.stripe_connect_account_id as string);
  return { url };
}
