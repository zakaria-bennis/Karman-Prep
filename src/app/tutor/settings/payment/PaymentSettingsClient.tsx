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
      <section className="rounded-xl border border-[color:var(--line)] bg-[color:var(--card)] p-5 dark:border-[color:var(--line)] dark:bg-[color-mix(in_srgb,var(--card)_60%,transparent)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[color:var(--ink)] dark:text-[color:var(--ink)]">Payment account</h2>
          </div>
          <StatusPill status={status} />
        </div>

        {status === "not_started" && (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-[color:var(--mute)] dark:text-[color:var(--ink)]">
              You haven&apos;t set up payouts yet. Stripe will ask for your name, address, date of
              birth, and a bank account (or debit card for instant payouts). Takes about 3 minutes.
            </p>
            <button
              onClick={() => call(actionStartOnboarding, (r) => go(r.url))}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--info)] px-5 py-2.5 text-sm font-bold text-[color:var(--ink)] hover:bg-[color:var(--info)] disabled:opacity-40"
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
            <p className="text-sm text-[color:var(--mute)] dark:text-[color:var(--ink)]">
              Stripe still needs more information before you can receive payouts. Click below to
              finish onboarding.
            </p>
            {state.requirements.length > 0 && (
              <details className="text-xs text-[color:var(--mute)]">
                <summary className="cursor-pointer hover:text-[color:var(--mute)] dark:hover:text-[color:var(--ink)]">
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
                className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--info)] px-5 py-2.5 text-sm font-bold text-[color:var(--ink)] hover:bg-[color:var(--info)] disabled:opacity-40"
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
                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--line)] px-4 py-2.5 text-sm font-semibold text-[color:var(--ink)] hover:bg-[color:var(--card)] disabled:opacity-40 dark:border-[color:var(--line)] dark:text-[color:var(--ink)] dark:hover:bg-[color:var(--raised)]"
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
                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--line)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)] hover:bg-[color:var(--card)] disabled:opacity-40 dark:border-[color:var(--line)] dark:text-[color:var(--ink)] dark:hover:bg-[color:var(--raised)]"
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
                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--line)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)] hover:bg-[color:var(--card)] disabled:opacity-40 dark:border-[color:var(--line)] dark:text-[color:var(--ink)] dark:hover:bg-[color:var(--raised)]"
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
      <section className="rounded-xl border border-[color:var(--line)] bg-[color:var(--card)] p-5 dark:border-[color:var(--line)] dark:bg-[color-mix(in_srgb,var(--card)_60%,transparent)]">
        <h2 className="mb-3 text-sm font-bold text-[color:var(--ink)] dark:text-[color:var(--ink)]">How payouts work</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-[color:var(--line)] p-3 dark:border-[color:var(--line)]">
            <div className="flex items-center gap-2 font-bold text-[color:var(--ink)] dark:text-[color:var(--ink)]">
              <Banknote className="h-4 w-4 text-[color:var(--good)]" />
              ACH (Standard)
            </div>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[color:var(--mute)] dark:text-[color:var(--mute)]">
              <li>Free — you receive 100% of your earnings</li>
              <li>Arrives in 2–5 business days</li>
              <li>Goes to your bank account</li>
            </ul>
          </div>
          <div className="rounded-lg border border-[color:var(--line)] p-3 dark:border-[color:var(--line)]">
            <div className="flex items-center gap-2 font-bold text-[color:var(--ink)] dark:text-[color:var(--ink)]">
              <CreditCard className="h-4 w-4 text-[color:var(--info)]" />
              Instant
            </div>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[color:var(--mute)] dark:text-[color:var(--mute)]">
              <li>2.5% fee — you receive 97.5%</li>
              <li>Arrives in seconds</li>
              <li>Goes to your linked debit card</li>
            </ul>
          </div>
        </div>
        <p className="mt-3 text-xs text-[color:var(--mute)]">
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
      cls: "bg-[color:var(--card)] dark:bg-[color:var(--raised)] text-[color:var(--mute)] dark:text-[color:var(--ink)]",
    },
    incomplete: {
      label: "Incomplete",
      cls: "bg-[color-mix(in_srgb,var(--warn)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--warn)_15%,transparent)] text-[color:var(--warn)] dark:text-[color:var(--warn)]",
    },
    ready: {
      label: "Ready",
      cls: "bg-[color-mix(in_srgb,var(--good)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--good)_15%,transparent)] text-[color:var(--good)] dark:text-[color:var(--good)]",
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
          ? "border-[color-mix(in_srgb,var(--good)_40%,transparent)] bg-[color-mix(in_srgb,var(--good)_40%,transparent)] dark:border-[color-mix(in_srgb,var(--good)_40%,transparent)] dark:bg-[color-mix(in_srgb,var(--good)_5%,transparent)]"
          : "border-[color:var(--line)] dark:border-[color:var(--line)]"
      )}
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[color:var(--ink)] dark:text-[color:var(--ink)]">
        {icon}
        {label}
        {active && <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--good)]" />}
      </div>
      {hint && <div className="mt-1 text-[11px] text-[color:var(--mute)]">{hint}</div>}
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
      "border-[color-mix(in_srgb,var(--good)_40%,transparent)] dark:border-[color-mix(in_srgb,var(--good)_40%,transparent)] bg-[color-mix(in_srgb,var(--good)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--good)_10%,transparent)] text-[color:var(--good)] dark:text-[color:var(--good)]",
    amber:
      "border-[color-mix(in_srgb,var(--warn)_40%,transparent)] dark:border-[color-mix(in_srgb,var(--warn)_40%,transparent)] bg-[color-mix(in_srgb,var(--warn)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--warn)_10%,transparent)] text-[color:var(--warn)] dark:text-[color:var(--warn)]",
    rose: "border-[color-mix(in_srgb,var(--late)_40%,transparent)] dark:border-[color-mix(in_srgb,var(--late)_40%,transparent)] bg-[color-mix(in_srgb,var(--late)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--late)_10%,transparent)] text-[color:var(--late)] dark:text-[color:var(--late)]",
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
