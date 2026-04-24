"use client";

// ============================================================
// Billing page client — self-serve subscription management.
// Upgrades/downgrades/cancellation are handled via Stripe portal.
// New subscriptions go through Stripe Checkout.
// ============================================================

import { useState } from "react";
import { CreditCard, CheckCircle, AlertCircle, ExternalLink, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRICING_TIERS, type PricingTier } from "@/types";
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
  active:     { label: "Active",    color: "text-emerald-600" },
  trialing:   { label: "Free Trial", color: "text-blue-600" },
  canceled:   { label: "Canceled",  color: "text-red-500" },
  past_due:   { label: "Past Due",  color: "text-amber-600" },
  incomplete: { label: "Incomplete", color: "text-slate-500" },
};

/** Tier-specific gradients used for the giant tier-name display in the Current Plan card. */
const TIER_GRADIENTS: Record<string, string> = {
  group:       "linear-gradient(90deg, #7dd3fc 0%, #38bdf8 60%, #0ea5e9 100%)",   // Seminar — light blue
  small_group: "linear-gradient(90deg, #6ee7b7 0%, #22c55e 60%, #059669 100%)",   // Small Group — green
  private:     "linear-gradient(90deg, #c4b5fd 0%, #a855f7 60%, #7c3aed 100%)",   // Private — violet
  elite:       "linear-gradient(90deg, #fde68a 0%, #facc15 50%, #ca8a04 100%)",   // Elite — gold
  default:     "linear-gradient(90deg, #EC4899 0%, #A855F7 50%, #38BDF8 100%)",
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
    if (!confirm("Cancel your subscription? You'll keep access through the end of the current billing period.")) return;
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Billing & Subscription</h1>

        {/* Current plan card */}
        <div className="glass-card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-5 h-5 text-blue-500" />
                <h2 className="font-bold text-slate-900 dark:text-white">Current Plan</h2>
              </div>
              {isActive && currentTier ? (
                <>
                  <p
                    className="text-4xl font-extrabold mt-2 uppercase tracking-tight bg-clip-text text-transparent"
                    style={{ backgroundImage: TIER_GRADIENTS[currentTier.id] ?? TIER_GRADIENTS.default }}
                  >
                    {currentTier.name}
                  </p>
                  {statusInfo && (
                    <p className={cn("text-sm font-semibold mt-1", statusInfo.color)}>
                      {statusInfo.label}
                      {subscription?.trial_end && subscription.status === "trialing" && (
                        <span className="text-slate-400 font-normal ml-1">
                          · Ends {new Date(subscription.trial_end).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 mt-2">No active subscription</p>
              )}
            </div>

            {isActive && (
              <button
                onClick={openPortal}
                disabled={loadingPortal}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                {loadingPortal ? "Loading..." : "Manage Plan"}
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Features of current plan */}
          {currentTier && (
            <ul className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-700 pt-4">
              {currentTier.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* No subscription — show plans */}
        {!isActive && (
          <>
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Subscribe to access all lessons, diagnostics, and progress tracking.</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {allTiers.map((tier) => (
                <div
                  key={tier.id}
                  className={cn(
                    "rounded-2xl p-5 border-2 transition-all",
                    tier.highlighted
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{tier.name}</h3>
                      <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                        {tier.price}<span className="text-sm font-normal text-slate-400">{tier.period}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {tier.highlighted && (
                        <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">Popular</span>
                      )}
                      {tier.bestValue && (
                        <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">Best Value</span>
                      )}
                    </div>
                  </div>

                  {/* Compact perks list */}
                  <ul className="space-y-1.5 mb-4">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => startCheckout(tier.id)}
                    disabled={loadingCheckout === tier.id}
                    className={cn(
                      "w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
                      tier.highlighted
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "btn-primary"
                    )}
                  >
                    {loadingCheckout === tier.id ? "Loading..." : tier.cta}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* FAQ */}
        <div className="glass-card p-6 space-y-4 text-sm">
          <h3 className="font-bold text-slate-900 dark:text-white">Billing FAQ</h3>
          {[
            ["When will I be charged?", "Your card is charged on day 8 of your free trial, or immediately if you skip the trial."],
            ["Can I cancel anytime?", "Yes — cancel via the Manage Plan button or email support before your renewal date."],
            ["What's the refund policy?", "We offer a 50-point score guarantee. If your score doesn't improve by 50 points after 16 weeks, contact us for a full refund."],
          ].map(([q, a]) => (
            <div key={q}>
              <p className="font-semibold text-slate-900 dark:text-white">{q}</p>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fallback self-serve modal (shown if Stripe portal can't open) ── */}
      {fallbackOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6" onClick={() => setFallbackOpen(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Manage your plan</h3>
            {portalError && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Stripe customer portal not reachable — using in-app management instead.
              </p>
            )}

            {/* Plan options */}
            <div className="mt-5 space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Switch plan</p>
              {allTiers.filter((t) => t.id !== currentTier?.id).map((t) => (
                <button
                  key={t.id}
                  onClick={() => startCheckout(t.id)}
                  disabled={loadingCheckout === t.id}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
                >
                  <span>
                    <span className="font-bold text-slate-900 dark:text-white">{t.name}</span>
                    <span className="text-xs text-slate-500 ml-2">{t.price}<span className="text-slate-400">{t.period}</span></span>
                  </span>
                  <span className="text-xs font-semibold text-blue-500">
                    {loadingCheckout === t.id ? "Loading…" : "Switch →"}
                  </span>
                </button>
              ))}
            </div>

            {/* Cancel */}
            <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={cancelSubscription}
                disabled={loadingPortal}
                className="w-full px-4 py-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-900/30 disabled:opacity-50"
              >
                {loadingPortal ? "Processing…" : "Cancel subscription"}
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2">
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
