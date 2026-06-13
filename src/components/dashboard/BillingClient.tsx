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
  active: { label: "Active", color: "text-success" },
  trialing: { label: "Free Trial", color: "text-info" },
  canceled: { label: "Canceled", color: "text-error" },
  past_due: { label: "Past Due", color: "text-warning" },
  incomplete: { label: "Incomplete", color: "text-taupe" },
};

/** Tier-specific gradients used for the giant tier-name display in the Current Plan card. */
const TIER_GRADIENTS: Record<string, string> = {
  group: "linear-gradient(90deg, #7FC4FF 0%, #2FA8FF 60%, #2B7FC4 100%)", // Seminar — light blue
  small_group: "linear-gradient(90deg, #C2D9A8 0%, #8BA86A 60%, #6E8A50 100%)", // Small Group — green
  private: "linear-gradient(90deg, #E4C86A 0%, #C8AB6A 60%, #B0883E 100%)", // Private — violet
  elite: "linear-gradient(90deg, #F0BE72 0%, #E4C86A 50%, #B0883E 100%)", // Elite — gold
  default: "linear-gradient(90deg, #D84F73 0%, #C8AB6A 50%, #2FA8FF 100%)",
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
        <h1 className="text-2xl font-bold text-ivory dark:text-ivory">Billing & Subscription</h1>

        {/* Current plan card */}
        <div className="glass-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-info" />
                <h2 className="font-bold text-ivory dark:text-ivory">Current Plan</h2>
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
                        <span className="ml-1 font-normal text-taupe">
                          · Ends {new Date(subscription.trial_end).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-taupe dark:text-taupe">No active subscription</p>
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
            <ul className="mt-4 space-y-2 border-t border-bronze pt-4 dark:border-bronze">
              {currentTier.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-taupe dark:text-ivory">
                  <CheckCircle className="h-4 w-4 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* No subscription — show plans */}
        {!isActive && (
          <>
            <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning dark:border-warning/40 dark:bg-warning/20 dark:text-warning-bright">
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
                      ? "border-info/40 bg-info/10 dark:bg-info/20"
                      : "border-bronze bg-surface dark:border-bronze dark:bg-surface-raised"
                  )}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-ivory dark:text-ivory">{tier.name}</h3>
                      <p className="mt-1 text-2xl font-extrabold text-ivory dark:text-ivory">
                        {tier.price}
                        <span className="text-sm font-normal text-taupe">{tier.period}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {tier.highlighted && (
                        <span className="rounded-full bg-info px-2.5 py-1 text-xs font-bold text-ivory">
                          Popular
                        </span>
                      )}
                      {tier.bestValue && (
                        <span className="rounded-full bg-warning px-2.5 py-1 text-xs font-bold text-night">
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
                        className="flex items-start gap-2 text-xs text-taupe dark:text-ivory"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => startCheckout(tier.id)}
                    disabled={loadingCheckout === tier.id}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all",
                      tier.highlighted ? "bg-info text-ivory hover:bg-info-bright" : "btn-primary"
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
          <h3 className="font-bold text-ivory dark:text-ivory">Billing FAQ</h3>
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
              <p className="font-semibold text-ivory dark:text-ivory">{q}</p>
              <p className="mt-0.5 text-taupe dark:text-taupe">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fallback self-serve modal (shown if Stripe portal can't open) ── */}
      {fallbackOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-night/70 p-6"
          onClick={() => setFallbackOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-bronze bg-surface p-6 shadow-2xl dark:border-bronze dark:bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold text-ivory dark:text-ivory">Manage your plan</h3>
            {portalError && (
              <p className="mt-1 text-xs text-warning dark:text-warning">
                Stripe customer portal not reachable — using in-app management instead.
              </p>
            )}

            {/* Plan options */}
            <div className="mt-5 space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-taupe">Switch plan</p>
              {allTiers
                .filter((t) => t.id !== currentTier?.id)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => startCheckout(t.id)}
                    disabled={loadingCheckout === t.id}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-bronze bg-surface px-4 py-3 text-left transition-colors hover:bg-surface dark:border-bronze dark:bg-surface-raised/50 dark:hover:bg-surface-raised"
                  >
                    <span>
                      <span className="font-bold text-ivory dark:text-ivory">{t.name}</span>
                      <span className="ml-2 text-xs text-taupe">
                        {t.price}
                        <span className="text-taupe">{t.period}</span>
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-info">
                      {loadingCheckout === t.id ? "Loading…" : "Switch →"}
                    </span>
                  </button>
                ))}
            </div>

            {/* Cancel */}
            <div className="mt-5 border-t border-bronze pt-5 dark:border-bronze">
              <button
                onClick={cancelSubscription}
                disabled={loadingPortal}
                className="w-full rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm font-bold text-error hover:bg-error/10 disabled:opacity-50 dark:border-error/60 dark:bg-error/20 dark:text-error dark:hover:bg-error/30"
              >
                {loadingPortal ? "Processing…" : "Cancel subscription"}
              </button>
              <p className="mt-2 text-center text-[11px] text-taupe">
                You keep access through the end of your current billing period.
              </p>
            </div>

            <button
              onClick={() => setFallbackOpen(false)}
              className="mt-4 w-full text-center text-xs font-semibold text-taupe hover:text-ivory dark:hover:text-ivory"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
