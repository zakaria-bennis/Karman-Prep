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
    <section className="py-20 bg-gradient-to-b from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-6 h-6 text-white" />
        </div>

        <h2 className="text-3xl font-bold text-white mb-3">
          Not ready to start yet?
        </h2>
        <p className="text-blue-100 mb-8">
          Get free SAT tips, strategy guides, and exclusive study resources delivered to your inbox. No spam — unsubscribe anytime.
        </p>

        {status === "success" ? (
          <div className="flex items-center justify-center gap-3 bg-white/20 text-white px-6 py-4 rounded-2xl">
            <CheckCircle className="w-5 h-5 text-emerald-300" />
            <p className="font-medium">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 px-6 py-3.5 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors disabled:opacity-70 shrink-0"
            >
              {status === "loading" ? "Sending..." : "Get Free Tips"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-3 text-red-300 text-sm">{message}</p>
        )}
      </div>
    </section>
  );
}
