"use client";

// ============================================================
// Per-user actions on /admin/plans, inside a <details> so the
// table stays dense: comp Practice or Pro, end a comp, and
// change a Stripe TEST subscription's plan.
// ============================================================

import { useRouter } from "next/navigation";
import { useState, useTransition, type CSSProperties } from "react";
import { actionChangePlan, actionCompPlan, actionEndComp, type PlanActionResult } from "./actions";

export interface RowGrant {
  id: string;
  label: string;
  canEnd: boolean;
}

interface Props {
  userId: string;
  name: string;
  grants: RowGrant[];
  compsAvailable: boolean;
  compsNote: string | null;
  change: { subscriptionId: string } | null;
  stripeTestMode: boolean;
}

const box: CSSProperties = { display: "grid", gap: 8, padding: "10px 0", maxWidth: 360 };
const form: CSSProperties = { display: "grid", gap: 8 };

export default function PlanRowActions(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [planId, setPlanId] = useState<"practice" | "pro">("practice");
  const [endsOn, setEndsOn] = useState("");
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState("practice:month");

  function run(fn: () => Promise<PlanActionResult>, after?: () => void) {
    setMessage(null);
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setMessage({ ok: true, text: r.message ?? "Done." });
        after?.();
        router.refresh();
      } else {
        setMessage({ ok: false, text: r.error });
      }
    });
  }

  const ids = `plan-${p.userId}`;

  return (
    <details style={{ flex: "1 1 auto", textAlign: "left", minWidth: 0 }}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>Manage</summary>
      <div style={box}>
        {p.grants.length > 0 && (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {p.grants.map((g) => (
              <li key={g.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ flex: 1 }}>{g.label}</span>
                {g.canEnd && (
                  <button
                    type="button"
                    className="wb-btn"
                    data-variant="danger"
                    disabled={pending}
                    onClick={() => run(() => actionEndComp({ grantId: g.id }))}
                  >
                    End comp
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <form
          style={form}
          aria-label={`Comp a plan for ${p.name}`}
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => actionCompPlan({ userId: p.userId, planId, endsOn, reason }),
              () => setReason("")
            );
          }}
        >
          <label className="wb-field">
            <span>Comp a plan</span>
            <select
              className="wb-select"
              value={planId}
              disabled={!p.compsAvailable}
              onChange={(e) => setPlanId(e.target.value === "pro" ? "pro" : "practice")}
            >
              <option value="practice">Practice</option>
              <option value="pro">Pro</option>
            </select>
          </label>
          <label className="wb-field">
            <span>Ends on (optional)</span>
            <input
              className="wb-input"
              type="date"
              value={endsOn}
              disabled={!p.compsAvailable}
              onChange={(e) => setEndsOn(e.target.value)}
            />
          </label>
          <label className="wb-field">
            <span>Reason</span>
            <input
              className="wb-input"
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={reason}
              disabled={!p.compsAvailable}
              onChange={(e) => setReason(e.target.value)}
              aria-describedby={p.compsNote ? `${ids}-comp-note` : undefined}
            />
          </label>
          {p.compsNote && (
            <p id={`${ids}-comp-note`} className="wb-note">
              {p.compsNote}
            </p>
          )}
          <button type="submit" className="wb-btn" disabled={pending || !p.compsAvailable}>
            {pending ? "Saving…" : "Comp plan"}
          </button>
        </form>

        {p.change && (
          <form
            style={form}
            aria-label={`Change plan for ${p.name}`}
            onSubmit={(e) => {
              e.preventDefault();
              const [plan, term] = target.split(":");
              const subscriptionId = p.change?.subscriptionId ?? "";
              run(() => actionChangePlan({ subscriptionId, planId: plan, term }));
            }}
          >
            <label className="wb-field">
              <span>Change plan (test mode)</span>
              <select
                className="wb-select"
                value={target}
                disabled={!p.stripeTestMode}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="practice:month">Practice, monthly</option>
                <option value="practice:quarter">Practice, every 3 months</option>
                <option value="pro:month">Pro, monthly</option>
                <option value="pro:quarter">Pro, every 3 months</option>
              </select>
            </label>
            {!p.stripeTestMode && (
              <p className="wb-note">Plan changes need a Stripe test key on this server.</p>
            )}
            <button type="submit" className="wb-btn" disabled={pending || !p.stripeTestMode}>
              Change plan
            </button>
          </form>
        )}

        {message &&
          (message.ok ? (
            <p role="status" className="wb-alert" data-tone="ok">
              {message.text}
            </p>
          ) : (
            <p role="alert" className="wb-alert">
              {message.text}
            </p>
          ))}
      </div>
    </details>
  );
}
