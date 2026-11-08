"use client";

/* Opens the Stripe customer portal for the student's billing. Free accounts never reach it. */
import { useState } from "react";
import { MoreLink } from "@/components/portal/primitives";
import s from "./account.module.css";

export default function PlanBilling() {
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<"free" | "signin" | "error" | null>(null);

  async function open() {
    setPending(true);
    setProblem(null);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = (await res.json().catch(() => ({}))) as { url?: string };
      if (res.ok && typeof body.url === "string" && /^https:\/\//.test(body.url)) {
        window.location.assign(body.url);
        return;
      }
      setProblem(res.status === 404 ? "free" : res.status === 401 ? "signin" : "error");
    } catch {
      setProblem("error");
    }
    setPending(false);
  }

  return (
    <div className={s.form}>
      <div className={s.actions}>
        <button type="button" className={s.button} onClick={open} disabled={pending}>
          {pending ? "Opening billing" : "Manage plan and billing"}
        </button>
      </div>
      {problem === "free" && (
        <div>
          <p className={s.status} role="status">
            You&rsquo;re on the Free plan.
          </p>
          <MoreLink href="/pricing">See the plans</MoreLink>
        </div>
      )}
      {problem === "signin" && (
        <p className={s.status} data-tone="error" role="status">
          Sign in again to manage billing.
        </p>
      )}
      {problem === "error" && (
        <p className={s.status} data-tone="error" role="status">
          Billing didn&rsquo;t open. Try again in a minute.
        </p>
      )}
    </div>
  );
}
