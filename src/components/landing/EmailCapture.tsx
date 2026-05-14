"use client";

// ============================================================
// Email capture form — for visitors not ready to subscribe.
// Sends email to Resend audience via /api/email/subscribe.
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
    <section className="bg-gradient-to-b from-blue-600 to-blue-700 py-20 dark:from-blue-800 dark:to-blue-900">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
          <Mail className="h-6 w-6 text-white" />
        </div>

        <h2 className="mb-3 text-3xl font-bold text-white">Not ready to start yet?</h2>
        <p className="mb-8 text-blue-100">
          Get free SAT tips, strategy guides, and exclusive study resources delivered to your inbox.
          No spam — unsubscribe anytime.
        </p>

        {status === "success" ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-white/20 px-6 py-4 text-white">
            <CheckCircle className="h-5 w-5 text-emerald-300" />
            <p className="font-medium">{message}</p>
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
              className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-sm text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-70"
            >
              {status === "loading" ? "Sending..." : "Get Free Tips"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {status === "error" && <p className="mt-3 text-sm text-red-300">{message}</p>}
      </div>
    </section>
  );
}
