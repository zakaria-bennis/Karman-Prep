"use client";

// ============================================================
// Email capture form — for visitors not ready to subscribe.
// Sends email to Resend audience via /api/email/subscribe.
//
// Observatory treatment: a quiet espresso interlude with a gold
// hairline above — not a loud color band.
// ============================================================

import { useState } from "react";
import { Mail, ArrowRight, CheckCircle } from "lucide-react";

export default function EmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");

    try {
      const res = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        setStatus("success");
        setMessage("You're on the list! We'll send you SAT tips and early access.");
        setEmail("");
      } else {
        const data = await res.json();
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <section className="relative bg-espresso py-20">
      <div className="rule-gold absolute inset-x-0 top-0" aria-hidden="true" />
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-bronze bg-surface">
          <Mail className="h-6 w-6 text-gold" />
        </div>

        <h2 className="type-display-md mb-3 text-ivory">Not ready to start yet?</h2>
        <p className="type-body mb-8 text-taupe">
          Get free SAT tips, strategy guides, and exclusive study resources delivered to your inbox.
          No spam — unsubscribe anytime.
        </p>

        {status === "success" ? (
          <div className="card-surface flex items-center justify-center gap-3 px-6 py-4">
            <CheckCircle className="h-5 w-5 text-gold-bright" />
            <p className="font-medium text-ivory">{message}</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 rounded-xl border border-bronze bg-surface px-4 py-3.5 text-sm text-ivory placeholder-taupe/70 transition-colors duration-fast focus:border-gold focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="btn-primary shrink-0 px-6 py-3.5 text-sm disabled:opacity-70"
            >
              {status === "loading" ? "Sending..." : "Get Free Tips"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {status === "error" && <p className="mt-3 text-sm text-rw-glow">{message}</p>}
      </div>
    </section>
  );
}
