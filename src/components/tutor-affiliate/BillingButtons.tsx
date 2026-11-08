"use client";

import { useState } from "react";
import { Cta } from "@/components/portal";
import { openBillingPortalAction } from "@/app/tutor/affiliate-actions";
import "./affiliate.css";

async function postForUrl(path: string, body: unknown): Promise<string> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error || "That isn't available right now.");
  return data.url;
}

/** Opens Stripe's customer portal (card, invoices, cancel). */
export function ManageBillingButton({ asMain = false }: { asMain?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    setError(null);
    const result = await openBillingPortalAction();
    if (result.ok) {
      window.location.assign(result.url);
      return;
    }
    setError(result.error);
    setBusy(false);
  }
  return (
    <span>
      {asMain ? (
        <Cta onClick={open} disabled={busy}>
          {busy ? "Opening Stripe…" : "Manage billing"}
        </Cta>
      ) : (
        <button type="button" className="ka-textbtn" onClick={open} disabled={busy}>
          {busy ? "Opening Stripe…" : "Manage billing"}
        </button>
      )}
      {error && (
        <span className="ka-status" role="alert" data-tone="error">
          {" "}
          {error}
        </span>
      )}
    </span>
  );
}

/** Starts Stripe checkout for the $199 tutor plan (test mode overnight). */
export function StartTutorPlanButton({ label }: { label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function start() {
    setBusy(true);
    setError(null);
    try {
      window.location.assign(
        await postForUrl("/api/stripe/checkout", { plan: "tutor-affiliate", term: "month" })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout isn't available right now.");
      setBusy(false);
    }
  }
  return (
    <div className="ka-stack">
      <div>
        <Cta onClick={start} disabled={busy}>
          {busy ? "Opening checkout…" : label}
        </Cta>
      </div>
      {error && (
        <p className="ka-status" role="alert" data-tone="error">
          {error}
        </p>
      )}
    </div>
  );
}
