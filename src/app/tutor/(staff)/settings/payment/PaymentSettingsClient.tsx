"use client";

// ============================================================
// PaymentSettingsClient — drives the three-state UX (no
// account / incomplete / ready) plus the just-returned notes.
// Rendered inside the page's `.wb` box in the painted shell.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { Card, Cta, Row, SectionHeader } from "@/components/portal";
import { WbPill } from "@/components/admin/workbench";
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

const WARN_ALERT: CSSProperties = {
  borderColor: "var(--warn)",
  background: "color-mix(in srgb, var(--warn) 8%, transparent)",
};

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

  const busy = (label: string) => (isPending ? "Working…" : label);

  return (
    <>
      {state.justOnboarded && status === "ready" && (
        <Alert tone="ok">Stripe is set up. You can now ask for payouts.</Alert>
      )}
      {state.justOnboarded && status === "incomplete" && (
        <Alert style={WARN_ALERT}>Stripe still needs a few details.</Alert>
      )}
      {state.justUpdated && <Alert tone="ok">Payment details updated.</Alert>}
      {error && <Alert role="alert">{error}</Alert>}

      <Card>
        <SectionHeader title="Payment account" note={<StatusPill status={status} />} />

        {status === "not_started" && (
          <>
            <p className="kp-meta">
              Stripe asks for your name, address, date of birth and a bank account (or a debit card
              for instant payouts). About 3 minutes.
            </p>
            <Cta
              onClick={() => call(actionStartOnboarding, (r) => go(r.url))}
              disabled={isPending}
              aria-busy={isPending}
            >
              {busy("Set up payments with Stripe")}
            </Cta>
          </>
        )}

        {status === "incomplete" && (
          <>
            <p className="kp-meta">Stripe needs a few more details before it can pay you.</p>
            {state.requirements.length > 0 && (
              <details className="wb-note" style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer" }}>
                  What Stripe still needs ({state.requirements.length})
                </summary>
                <ul style={{ margin: "4px 0 0 16px", listStyle: "disc" }}>
                  {state.requirements.map((r) => (
                    <li key={r}>
                      <code>{r}</code>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <Cta
              onClick={() => call(actionStartOnboarding, (r) => go(r.url))}
              disabled={isPending}
              aria-busy={isPending}
            >
              {busy("Resume onboarding")}
            </Cta>
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="wb-btn"
                onClick={() => call(actionRefreshAccountStatus, () => router.refresh())}
                disabled={isPending}
              >
                {busy("Refresh status")}
              </button>
            </div>
          </>
        )}

        {status === "ready" && (
          <>
            <Row title="ACH, 2 to 3 days" right={<OnOff active={state.payoutsEnabled} />} />
            <Row
              title="Instant, to a debit card"
              sub={
                !state.instantPayoutsActive ? "Add a debit card in Stripe to turn it on" : undefined
              }
              right={<OnOff active={state.instantPayoutsActive} />}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="wb-btn"
                onClick={() => call(actionUpdatePaymentDetails, (r) => go(r.url))}
                disabled={isPending}
              >
                {busy("Update bank or card")}
              </button>
              <button
                type="button"
                className="wb-btn"
                onClick={() => call(actionGetExpressDashboardLink, (r) => go(r.url))}
                disabled={isPending}
              >
                {busy("Open Stripe dashboard")}
              </button>
            </div>
          </>
        )}
      </Card>

      <Card>
        <SectionHeader title="Payouts" />
        <p className="kp-meta">
          <b>ACH.</b> Free. Reaches your bank in 1 to 2 business days.
        </p>
        <p className="kp-meta">
          <b>Instant.</b> 2.5% fee. Reaches your debit card within 30 minutes.
        </p>
        <p className="wb-note" style={{ marginTop: 8 }}>
          You pick the method each time. No minimum.
        </p>
      </Card>
    </>
  );
}

// ──────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────
function StatusPill({ status }: { status: "not_started" | "incomplete" | "ready" }) {
  if (status === "ready") return <WbPill tone="ok">Ready</WbPill>;
  if (status === "incomplete") return <WbPill tone="warn">Incomplete</WbPill>;
  return <WbPill tone="neutral">Not set up</WbPill>;
}

function OnOff({ active }: { active: boolean }) {
  return active ? <WbPill tone="ok">On</WbPill> : <WbPill tone="neutral">Off</WbPill>;
}

function Alert({
  tone,
  role = "status",
  style,
  children,
}: {
  tone?: "ok";
  role?: "status" | "alert";
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <p className="wb-alert" data-tone={tone} role={role} style={style}>
      {children}
    </p>
  );
}

function humanize(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === "missing_email") return "Your account has no email on file. Contact an admin.";
  if (msg === "not_onboarded_yet") return "Finish initial onboarding before updating details.";
  if (msg === "forbidden") return "Tutors only.";
  if (msg.startsWith("save_account_failed")) return "Your Stripe account didn't save. Try again.";
  return msg;
}
