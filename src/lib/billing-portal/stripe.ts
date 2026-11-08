import "server-only";
/*
 * Stripe customer portal links for families (parent portal) and schools (school portal).
 * Overnight builds run Stripe in test mode only. Development seeds carry placeholder
 * customer ids ("cus_dev_..."); outside production those are swapped for a real test-mode
 * customer the first time someone opens billing, so the portal genuinely opens.
 */
import type Stripe from "stripe";
import { stripe } from "@/lib/integrations/stripe/client";

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function stripeTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}

/** True for seed placeholders that Stripe has never heard of. */
export function isPlaceholderCustomer(id: string | null | undefined): boolean {
  return !id || id.startsWith("cus_dev");
}

/** Whether this environment may create test customers in place of placeholders. */
export function mayCreateTestCustomer(): boolean {
  return process.env.NODE_ENV !== "production" && stripeTestMode();
}

export async function createTestCustomer(input: {
  email: string | null;
  name: string;
  metadata: Record<string, string>;
}): Promise<string> {
  const customer = await stripe.customers.create({
    email: input.email ?? undefined,
    name: input.name,
    metadata: { ...input.metadata, karman_env: "overnight-test" },
  });
  return customer.id;
}

let cachedConfiguration: string | null = null;

async function portalConfiguration(): Promise<string> {
  if (cachedConfiguration) return cachedConfiguration;
  const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 1 });
  if (existing.data[0]) {
    cachedConfiguration = existing.data[0].id;
    return cachedConfiguration;
  }
  const created = await stripe.billingPortal.configurations.create({
    business_profile: { headline: "Karman billing" },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ["email", "name", "address"] },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
    },
  } as Stripe.BillingPortal.ConfigurationCreateParams);
  cachedConfiguration = created.id;
  return created.id;
}

/** A one-time link into Stripe's customer portal that returns to `returnPath`. */
export async function customerPortalUrl(customerId: string, returnPath: string): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl()}${returnPath}`,
    configuration: await portalConfiguration(),
  });
  return session.url;
}
