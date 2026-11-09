"use client";

// ============================================================
// Billing page client — self-serve plan management.
// Plan changes and cancellation go through the Stripe portal;
// a new plan goes through Stripe Checkout, only on a click.
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
import {
  CONTACT,
  FREE_PLAN,
  PLAN_RENEWAL,
  PRACTICE_PLAN,
  PRO_PLAN,
  TUTOR_AFFILIATE_PLAN,
} from "@/lib/marketing/offer";
import { findStripePrice, priceLabel, type BillingTerm } from "@/lib/integrations/stripe/prices";
import type { SubscriptionPlanId } from "@/lib/plans/catalog";

export interface BillingSelection {
  planId: SubscriptionPlanId;
  term: BillingTerm;
}

interface Props {
  subscription: {
    plan_id: string;
    billing_term: string;
    status: string;
    current_period_end: string | null;
  } | null;
  /** The plan picked on the pricing or For tutors page, already validated. */
  selected: BillingSelection | null;
  /** Sent here because a page needs a plan. */
  required: boolean;
}

const PLANS: Record<SubscriptionPlanId, { name: string; includes: readonly string[] }> = {
  practice: PRACTICE_PLAN,
  pro: PRO_PLAN,
  "tutor-affiliate": TUTOR_AFFILIATE_PLAN,
};

/** The plans offered here: Practice and Pro, each monthly or every 3 months. */
const OPTIONS: BillingSelection[] = [
  { planId: "practice", term: "month" },
  { planId: "practice", term: "quarter" },
  { planId: "pro", term: "month" },
  { planId: "pro", term: "quarter" },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "text-success" },
  trialing: { label: "Active", color: "text-success" },
  past_due: { label: "Payment due", color: "text-warning" },
  unpaid: { label: "Unpaid", color: "text-warning" },
  incomplete: { label: "Payment incomplete", color: "text-taupe" },
  incomplete_expired: { label: "Expired", color: "text-taupe" },
  paused: { label: "Paused", color: "text-taupe" },
  canceled: { label: "Canceled", color: "text-error" },
};

/** Plan-specific gradients for the plan name in the Current Plan card. */
const PLAN_GRADIENTS: Record<string, string> = {
  practice: "linear-gradient(90deg, #7FC4FF 0%, #2FA8FF 60%, #2B7FC4 100%)",
  pro: "linear-gradient(90deg, #F0BE72 0%, #E4C86A 50%, #B0883E 100%)",
  "tutor-affiliate": "linear-gradient(90deg, #C2D9A8 0%, #8BA86A 60%, #6E8A50 100%)",
  default: "linear-gradient(90deg, #D84F73 0%, #C8AB6A 50%, #2FA8FF 100%)",
};

/** "Practice, $39 a month" */
function planLine(planId: string, term: string): string | null {
  const plan = PLANS[planId as SubscriptionPlanId];
  const spec = findStripePrice(planId, term as BillingTerm);
  return plan && spec ? `${plan.name}, ${priceLabel(spec)}` : null;
}

const sameOption = (a: BillingSelection | null, b: BillingSelection) =>
  !!a && a.planId === b.planId && a.term === b.term;

export default function BillingClient({ subscription, selected, required }: Props) {
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [fallbackOpen, setFallbackOpen] = useState(false);

  const statusInfo = subscription ? STATUS_LABELS[subscription.status] : null;
  const hasPlan =
    !!subscription && ["active", "trialing", "past_due"].includes(subscription.status);
  const currentPlan = subscription ? PLANS[subscription.plan_id as SubscriptionPlanId] : null;
  const currentLine = subscription
    ? planLine(subscription.plan_id, subscription.billing_term)
    : null;

  /** Opens the Stripe Customer Portal. Falls back to an in-app modal if it can't open. */
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
      setPortalError(json?.error ?? "Stripe portal unavailable");
      setFallbackOpen(true);
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : "Network error");
      setFallbackOpen(true);
    } finally {
      setLoadingPortal(false);
    }
  }

  /** Cancels at the end of the paid period. */
  async function cancelSubscription() {
    if (!confirm(`Cancel your plan? ${PLAN_RENEWAL}`)) return;
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (res.ok) window.location.reload();
      else alert(`Could not cancel. Please email ${CONTACT.support}.`);
    } finally {
      setLoadingPortal(false);
    }
  }

  /** Starts Stripe Checkout for one plan and term. */
  async function startCheckout(option: BillingSelection) {
    const key = `${option.planId}:${option.term}`;
    setLoadingCheckout(key);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: option.planId, term: option.term }),
      });
      const json = await res.json().catch(() => ({}));
      if (json?.url) {
        window.location.href = json.url;
        return;
      }
      setCheckoutError(json?.error ?? "Checkout could not start. Please try again.");
    } catch {
      setCheckoutError("Checkout could not start. Please check your connection and try again.");
    } finally {
      setLoadingCheckout(null);
    }
  }

  const selectedPlan = selected ? PLANS[selected.planId] : null;
  const selectedLine = selected ? planLine(selected.planId, selected.term) : null;

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        {/* Plan picked on the pricing or For tutors page */}
        {selected && selectedPlan && selectedLine && (
          <div className="rounded-2xl border-2 border-info/40 bg-info/10 p-5 dark:bg-info/20">
            <p className="text-xs font-bold uppercase tracking-widest text-taupe">Your choice</p>
            <h2 className="mt-1 text-2xl font-extrabold text-ivory dark:text-ivory">
              {selectedLine}
            </h2>
            <ul className="mt-3 space-y-1.5">
              {selectedPlan.includes.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-taupe dark:text-ivory">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
            {hasPlan ? (
              <button
                onClick={openPortal}
                disabled={loadingPortal}
                className="btn-secondary mt-4 flex items-center gap-2 text-sm"
              >
                {loadingPortal ? "Loading..." : "You have a plan. Change it in Manage plan"}
                <ExternalLink className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => startCheckout(selected)}
                disabled={loadingCheckout !== null}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-info py-2.5 text-sm font-semibold text-ivory transition-all hover:bg-info-bright"
              >
                {loadingCheckout ? "Loading..." : "Continue to checkout"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {checkoutError && (
          <div className="flex items-center gap-2 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{checkoutError}</span>
          </div>
        )}

        {/* Current plan card */}
        <div className="glass-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-info" />
                <h2 className="font-bold text-ivory dark:text-ivory">Current Plan</h2>
              </div>
              {subscription && currentPlan && hasPlan ? (
                <>
                  <p
                    className="mt-2 bg-clip-text text-4xl font-extrabold uppercase tracking-tight text-transparent"
                    style={{
                      backgroundImage:
                        PLAN_GRADIENTS[subscription.plan_id] ?? PLAN_GRADIENTS.default,
                    }}
                  >
                    {currentPlan.name}
                  </p>
                  {currentLine && (
                    <p className="mt-1 text-sm text-ivory dark:text-ivory">{currentLine}</p>
                  )}
                  {statusInfo && (
                    <p className={cn("mt-1 text-sm font-semibold", statusInfo.color)}>
                      {statusInfo.label}
                      {subscription.current_period_end && (
                        <span className="ml-1 font-normal text-taupe">
                          · Paid through{" "}
                          {new Date(subscription.current_period_end).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-taupe dark:text-taupe">
                  No paid plan. You&apos;re on {FREE_PLAN.name}.
                </p>
              )}
            </div>

            {hasPlan && (
              <button
                onClick={openPortal}
                disabled={loadingPortal}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {loadingPortal ? "Loading..." : "Manage plan"}
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
          </div>

          {currentPlan && hasPlan && (
            <ul className="mt-4 space-y-2 border-t border-bronze pt-4 dark:border-bronze">
              {currentPlan.includes.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-taupe dark:text-ivory">
                  <CheckCircle className="h-4 w-4 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* No paid plan — show Practice and Pro */}
        {!hasPlan && (
          <>
            {required && (
              <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning dark:border-warning/40 dark:bg-warning/20 dark:text-warning-bright">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>That page needs a paid plan.</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {OPTIONS.map((option) => {
                const plan = PLANS[option.planId];
                const spec = findStripePrice(option.planId, option.term);
                if (!spec) return null;
                const key = `${option.planId}:${option.term}`;
                const highlighted = sameOption(selected, option);
                return (
                  <div
                    key={key}
                    className={cn(
                      "rounded-2xl border-2 p-5 transition-all",
                      highlighted
                        ? "border-info/40 bg-info/10 dark:bg-info/20"
                        : "border-bronze bg-surface dark:border-bronze dark:bg-surface-raised"
                    )}
                  >
                    <div className="mb-3">
                      <h3 className="font-bold text-ivory dark:text-ivory">{plan.name}</h3>
                      <p className="mt-1 text-2xl font-extrabold text-ivory dark:text-ivory">
                        {priceLabel(spec)}
                      </p>
                    </div>

                    <ul className="mb-4 space-y-1.5">
                      {plan.includes.map((f) => (
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
                      onClick={() => startCheckout(option)}
                      disabled={loadingCheckout !== null}
                      className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all",
                        highlighted ? "bg-info text-ivory hover:bg-info-bright" : "btn-primary"
                      )}
                    >
                      {loadingCheckout === key ? "Loading..." : `Start ${plan.name}`}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* FAQ */}
        <div className="glass-card space-y-4 p-6 text-sm">
          <h3 className="font-bold text-ivory dark:text-ivory">Billing FAQ</h3>
          {[
            [
              "When will I be charged?",
              `When you check out, then every month or every 3 months, as your plan says. There's no free trial: ${FREE_PLAN.name} gives ${FREE_PLAN.questionLimit} practice questions and one full-length test with no card.`,
            ],
            [
              "Can I cancel anytime?",
              `${PLAN_RENEWAL} Use Manage plan, or email ${CONTACT.support}.`,
            ],
            [
              "What's the refund policy?",
              "Practice and Pro don't carry the guarantee. The Cohort, Private 10 and Private 20 do; see the Guarantee page.",
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
            <p className="mt-4 text-sm text-taupe">
              To switch between Practice and Pro, email {CONTACT.support}.
            </p>

            {/* Cancel */}
            <div className="mt-5 border-t border-bronze pt-5 dark:border-bronze">
              <button
                onClick={cancelSubscription}
                disabled={loadingPortal}
                className="w-full rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm font-bold text-error hover:bg-error/10 disabled:opacity-50 dark:border-error/60 dark:bg-error/20 dark:text-error dark:hover:bg-error/30"
              >
                {loadingPortal ? "Processing…" : "Cancel plan"}
              </button>
              <p className="mt-2 text-center text-[11px] text-taupe">
                You keep access through the end of the time you paid for.
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
    </>
  );
}
