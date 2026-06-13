"use client";

// ============================================================
// PaymentSettingsClient — drives the three-state UX (no
// account / incomplete / ready) plus the just-returned banners.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  CreditCard,
  Banknote,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  actionStartOnboarding,
  actionUpdatePaymentDetails,
  actionRefreshAccountStatus,
  actionGetExpressDashboardLink,
} from "./actions";

interface State {
  hasConnectAccount: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  instantPayoutsActive: boolean;
  requirements: string[];
  justOnboarded: boolean;
  justUpdated: boolean;
}

export default function PaymentSettingsClient({ state }: { state: State }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function call<T>(fn: () => Promise<T>, then?: (res: T) => void) {
    setError(null);
    startTransition(async () => {
      try {
        const r = await fn();
        if (then) then(r);
      } catch (err) {
        setError(humanize(err));
      }
    });
  }

  function go(url: string) {
    window.location.href = url;
  }

  // ──── Status ────────────────────────────────────────
  const status = !state.hasConnectAccount
    ? ("not_started" as const)
    : state.payoutsEnabled
      ? ("ready" as const)
      : ("incomplete" as const);

  return (
    <div className="space-y-5">
      {state.justOnboarded && status === "ready" && (
        <Banner color="emerald" icon={<CheckCircle2 className="h-4 w-4" />}>
          Onboarding complete — you can now request payouts.
        </Banner>
      )}
      {state.justOnboarded && status === "incomplete" && (
        <Banner color="amber" icon={<AlertTriangle className="h-4 w-4" />}>
          Almost done — Stripe still needs a few details before you can receive payouts.
        </Banner>
      )}
      {state.justUpdated && (
        <Banner color="emerald" icon={<CheckCircle2 className="h-4 w-4" />}>
          Payment details updated.
        </Banner>
      )}
      {error && (
        <Banner color="rose" icon={<AlertTriangle className="h-4 w-4" />}>
          {error}
        </Banner>
      )}

      {/* ── Status card ─────────────────────────────── */}
      <section className="rounded-xl border border-bronze bg-surface p-5 dark:border-bronze dark:bg-surface/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-ivory dark:text-ivory">Payment account</h2>
          </div>
          <StatusPill status={status} />
        </div>

        {status === "not_started" && (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-taupe dark:text-ivory">
              You haven&apos;t set up payouts yet. Stripe will ask for your name, address, date of
              birth, and a bank account (or debit card for instant payouts). Takes about 3 minutes.
            </p>
            <button
              onClick={() => call(actionStartOnboarding, (r) => go(r.url))}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-info px-5 py-2.5 text-sm font-bold text-ivory hover:bg-info-bright disabled:opacity-40"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Set up payments with Stripe
            </button>
          </div>
        )}

        {status === "incomplete" && (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-taupe dark:text-ivory">
              Stripe still needs more information before you can receive payouts. Click below to
              finish onboarding.
            </p>
            {state.requirements.length > 0 && (
              <details className="text-xs text-taupe">
                <summary className="cursor-pointer hover:text-taupe dark:hover:text-ivory">
                  What does Stripe need? ({state.requirements.length})
                </summary>
                <ul className="ml-4 mt-1 list-disc">
                  {state.requirements.map((r) => (
                    <li key={r} className="font-mono text-[11px]">
                      {r}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => call(actionStartOnboarding, (r) => go(r.url))}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-info px-5 py-2.5 text-sm font-bold text-ivory hover:bg-info-bright disabled:opacity-40"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Resume onboarding
              </button>
              <button
                onClick={() => call(actionRefreshAccountStatus, () => router.refresh())}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-bronze px-4 py-2.5 text-sm font-semibold text-ivory hover:bg-surface disabled:opacity-40 dark:border-bronze dark:text-ivory dark:hover:bg-surface-raised"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh status
              </button>
            </div>
          </div>
        )}

        {status === "ready" && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Capability
                icon={<Banknote className="h-4 w-4" />}
                label="ACH (2-3 days)"
                active={state.payoutsEnabled}
              />
              <Capability
                icon={<CreditCard className="h-4 w-4" />}
                label="Instant (debit card)"
                active={state.instantPayoutsActive}
                hint={
                  !state.instantPayoutsActive ? "Add a debit card in Stripe to enable" : undefined
                }
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => call(actionUpdatePaymentDetails, (r) => go(r.url))}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-bronze px-4 py-2 text-sm font-semibold text-ivory hover:bg-surface disabled:opacity-40 dark:border-bronze dark:text-ivory dark:hover:bg-surface-raised"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Update bank / card
              </button>
              <button
                onClick={() => call(actionGetExpressDashboardLink, (r) => go(r.url))}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-bronze px-4 py-2 text-sm font-semibold text-ivory hover:bg-surface disabled:opacity-40 dark:border-bronze dark:text-ivory dark:hover:bg-surface-raised"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Open Stripe dashboard
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Fee breakdown ───────────────────────────── */}
      <section className="rounded-xl border border-bronze bg-surface p-5 dark:border-bronze dark:bg-surface/60">
        <h2 className="mb-3 text-sm font-bold text-ivory dark:text-ivory">How payouts work</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-bronze p-3 dark:border-bronze">
            <div className="flex items-center gap-2 font-bold text-ivory dark:text-ivory">
              <Banknote className="h-4 w-4 text-success" />
              ACH (Standard)
            </div>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-taupe dark:text-taupe">
              <li>Free — you receive 100% of your earnings</li>
              <li>Arrives in 2–5 business days</li>
              <li>Goes to your bank account</li>
            </ul>
          </div>
          <div className="rounded-lg border border-bronze p-3 dark:border-bronze">
            <div className="flex items-center gap-2 font-bold text-ivory dark:text-ivory">
              <CreditCard className="h-4 w-4 text-info" />
              Instant
            </div>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-taupe dark:text-taupe">
              <li>2.5% fee — you receive 97.5%</li>
              <li>Arrives in seconds</li>
              <li>Goes to your linked debit card</li>
            </ul>
          </div>
        </div>
        <p className="mt-3 text-xs text-taupe">
          You pick the method when requesting a payout. No hidden fees, no minimum.
        </p>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────
function StatusPill({ status }: { status: "not_started" | "incomplete" | "ready" }) {
  const map = {
    not_started: {
      label: "Not set up",
      cls: "bg-surface dark:bg-surface-raised text-taupe dark:text-ivory",
    },
    incomplete: {
      label: "Incomplete",
      cls: "bg-warning/10 dark:bg-warning/15 text-warning dark:text-warning-bright",
    },
    ready: {
      label: "Ready",
      cls: "bg-success/10 dark:bg-success/15 text-success dark:text-success-bright",
    },
  } as const;
  const m = map[status];
  return (
    <span
      className={cn("rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", m.cls)}
    >
      {m.label}
    </span>
  );
}

function Capability({
  icon,
  label,
  active,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        active
          ? "border-success/40 bg-success/40 dark:border-success/40 dark:bg-success/5"
          : "border-bronze dark:border-bronze"
      )}
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ivory dark:text-ivory">
        {icon}
        {label}
        {active && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
      </div>
      {hint && <div className="mt-1 text-[11px] text-taupe">{hint}</div>}
    </div>
  );
}

function Banner({
  color,
  icon,
  children,
}: {
  color: "emerald" | "amber" | "rose";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const map = {
    emerald:
      "border-success/40 dark:border-success/40 bg-success/10 dark:bg-success/10 text-success dark:text-success-bright",
    amber:
      "border-warning/40 dark:border-warning/40 bg-warning/10 dark:bg-warning/10 text-warning dark:text-warning-bright",
    rose: "border-error/40 dark:border-error/40 bg-error/10 dark:bg-error/10 text-error dark:text-error-bright",
  };
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border px-4 py-3 text-sm", map[color])}>
      <span className="mt-0.5">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function humanize(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === "missing_email") return "Your account doesn't have an email on file. Contact admin.";
  if (msg === "not_onboarded_yet") return "Finish initial onboarding before updating details.";
  if (msg === "forbidden") return "Tutor access required.";
  if (msg.startsWith("save_account_failed"))
    return "Failed to save your Stripe account ID. Try again.";
  return msg;
}
