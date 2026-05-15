"use client";

// ============================================================
// Billing page client — self-serve subscription management.
// Upgrades/downgrades/cancellation are handled via Stripe portal.
// New subscriptions go through Stripe Checkout.
// ============================================================

import { useState } from "react";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type PricingTier } from "@/types";
import DashboardLayout from "./DashboardLayout";

interface Props {
  subscription: {
    tier: string;
    status: string;
    trial_end: string | null;
    stripe_customer_id: string;
  } | null;
  currentTier: PricingTier | null;
  allTiers: PricingTier[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "text-emerald-600" },
  trialing: { label: "Free Trial", color: "text-blue-600" },
  canceled: { label: "Canceled", color: "text-red-500" },
  past_due: { label: "Past Due", color: "text-amber-600" },
  incomplete: { label: "Incomplete", color: "text-slate-500" },
};

/** Tier-specific gradients used for the giant tier-name display in the Current Plan card. */
const TIER_GRADIENTS: Record<string, string> = {
  group: "linear-gradient(90deg, #7dd3fc 0%, #38bdf8 60%, #0ea5e9 100%)", // Seminar — light blue
  small_group: "linear-gradient(90deg, #6ee7b7 0%, #22c55e 60%, #059669 100%)", // Small Group — green
  private: "linear-gradient(90deg, #c4b5fd 0%, #a855f7 60%, #7c3aed 100%)", // Private — violet
  elite: "linear-gradient(90deg, #fde68a 0%, #facc15 50%, #ca8a04 100%)", // Elite — gold
  default: "linear-gradient(90deg, #EC4899 0%, #A855F7 50%, #38BDF8 100%)",
};

export default function BillingClient({ subscription, currentTier, allTiers }: Props) {
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);

  const statusInfo = subscription ? STATUS_LABELS[subscription.status] : null;
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";

  const [portalError, setPortalError] = useState<string | null>(null);
  const [fallbackOpen, setFallbackOpen] = useState(false);

  /** Opens Stripe Customer Portal for self-serve management.
   *  Falls back to an inline management modal if the portal can't open
   *  (e.g. dev-mode fake customer IDs, misconfigured Stripe, etc.). */
  async function openPortal() {
    setLoadingPortal(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = await res.json();
      if (json?.url) {
        window.location.href = json.url;
        return;
      }
      // Anything else → show inline fallback
      setPortalError(json?.error ?? "Stripe portal unavailable");
      setFallbackOpen(true);
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : "Network error");
      setFallbackOpen(true);
    } finally {
      setLoadingPortal(false);
    }
  }

  /** Cancels the current subscription (dev-safe: hits a local action). */
  async function cancelSubscription() {
    if (
      !confirm(
        "Cancel your subscription? You'll keep access through the end of the current billing period."
      )
    )
      return;
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (res.ok) window.location.reload();
      else alert("Could not cancel — please contact support.");
    } finally {
      setLoadingPortal(false);
    }
  }

  /** Starts a new Stripe Checkout for a chosen tier */
  async function startCheckout(tierId: string) {
    setLoadingCheckout(tierId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierId }),
      });
      const { url, error } = await res.json();
      if (url) window.location.href = url;
      else console.error("Checkout error:", error);
    } finally {
      setLoadingCheckout(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Billing & Subscription
        </h1>

        {/* Current plan card */}
        <div className="glass-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-500" />
                <h2 className="font-bold text-slate-900 dark:text-white">Current Plan</h2>
              </div>
              {isActive && currentTier ? (
                <>
                  <p
                    className="mt-2 bg-clip-text text-4xl font-extrabold uppercase tracking-tight text-transparent"
                    style={{
                      backgroundImage: TIER_GRADIENTS[currentTier.id] ?? TIER_GRADIENTS.default,
                    }}
                  >
                    {currentTier.name}
                  </p>
                  {statusInfo && (
                    <p className={cn("mt-1 text-sm font-semibold", statusInfo.color)}>
                      {statusInfo.label}
                      {subscription?.trial_end && subscription.status === "trialing" && (
                        <span className="ml-1 font-normal text-slate-400">
                          · Ends {new Date(subscription.trial_end).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-slate-500 dark:text-slate-400">No active subscription</p>
              )}
            </div>

            {isActive && (
              <button
                onClick={openPortal}
                disabled={loadingPortal}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {loadingPortal ? "Loading..." : "Manage Plan"}
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Features of current plan */}
          {currentTier && (
            <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-700">
              {currentTier.features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
                >
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* No subscription — show plans */}
        {!isActive && (
          <>
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Subscribe to access all lessons, diagnostics, and progress tracking.</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {allTiers.map((tier) => (
                <div
                  key={tier.id}
                  className={cn(
                    "rounded-2xl border-2 p-5 transition-all",
                    tier.highlighted
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                  )}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{tier.name}</h3>
                      <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                        {tier.price}
                        <span className="text-sm font-normal text-slate-400">{tier.period}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {tier.highlighted && (
                        <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">
                          Popular
                        </span>
                      )}
                      {tier.bestValue && (
                        <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-amber-950">
                          Best Value
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Compact perks list */}
                  <ul className="mb-4 space-y-1.5">
                    {tier.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => startCheckout(tier.id)}
                    disabled={loadingCheckout === tier.id}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all",
                      tier.highlighted ? "bg-blue-600 text-white hover:bg-blue-700" : "btn-primary"
                    )}
                  >
                    {loadingCheckout === tier.id ? "Loading..." : tier.cta}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* FAQ */}
        <div className="glass-card space-y-4 p-6 text-sm">
          <h3 className="font-bold text-slate-900 dark:text-white">Billing FAQ</h3>
          {[
            [
              "When will I be charged?",
              "Your card is charged on day 8 of your free trial, or immediately if you skip the trial.",
            ],
            [
              "Can I cancel anytime?",
              "Yes — cancel via the Manage Plan button or email support before your renewal date.",
            ],
            [
              "What's the refund policy?",
              "We offer a 50-point score guarantee. If your score doesn't improve by 50 points after 16 weeks, contact us for a full refund.",
            ],
          ].map(([q, a]) => (
            <div key={q}>
              <p className="font-semibold text-slate-900 dark:text-white">{q}</p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fallback self-serve modal (shown if Stripe portal can't open) ── */}
      {fallbackOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setFallbackOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Manage your plan
            </h3>
            {portalError && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Stripe customer portal not reachable — using in-app management instead.
              </p>
            )}

            {/* Plan options */}
            <div className="mt-5 space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Switch plan
              </p>
              {allTiers
                .filter((t) => t.id !== currentTier?.id)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => startCheckout(t.id)}
                    disabled={loadingCheckout === t.id}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                  >
                    <span>
                      <span className="font-bold text-slate-900 dark:text-white">{t.name}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        {t.price}
                        <span className="text-slate-400">{t.period}</span>
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-blue-500">
                      {loadingCheckout === t.id ? "Loading…" : "Switch →"}
                    </span>
                  </button>
                ))}
            </div>

            {/* Cancel */}
            <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
              <button
                onClick={cancelSubscription}
                disabled={loadingPortal}
                className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/30"
              >
                {loadingPortal ? "Processing…" : "Cancel subscription"}
              </button>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                You keep access through the end of your current billing period.
              </p>
            </div>

            <button
              onClick={() => setFallbackOpen(false)}
              className="mt-4 w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
