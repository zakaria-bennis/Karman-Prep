"use client";

// The plan an account already has, named above the plan cards on /billing, with one button into
// Stripe's own portal (card, invoices, switching and cancelling all happen there). If the portal
// cannot open, it says so and gives the support address. Styles: pricing.css (.pz-now).
import { useState } from "react";

export default function PlanNow({
  line,
  due,
  renews,
  manage,
  trouble,
}: {
  /** "You're on Pro, $69 a month." */
  line: string;
  /** Said when the last payment did not go through; otherwise empty. */
  due: string;
  renews: string;
  manage: string;
  trouble: string;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const open = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = (await res.json().catch(() => null)) as { url?: string } | null;
      if (json?.url) {
        window.location.href = json.url;
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  };

  return (
    <div className="pz-now">
      <p>
        <b>{line}</b> {due || renews}
      </p>
      <button type="button" onClick={open} disabled={busy} aria-busy={busy || undefined}>
        {manage}
      </button>
      {failed ? <small role="alert">{trouble}</small> : null}
    </div>
  );
}
