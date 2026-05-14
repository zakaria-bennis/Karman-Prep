"use client";

// ============================================================
// Notify-me form on the /coming-soon page. Posts to the existing
// /api/email/subscribe endpoint (Resend audience).
// ============================================================

import { useState } from "react";
import { Mail, ArrowRight, CheckCircle } from "lucide-react";

export default function ComingSoonForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, source: "coming-soon" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setStatus("success");
      setMessage("You're on the list. We'll be in touch.");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-emerald-300 py-3">
        <CheckCircle className="w-4 h-4" />
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 focus-within:border-indigo-500/60 transition-colors">
        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
          aria-label="Email address"
        />
        <button
          type="submit"
          disabled={status === "loading" || !email.trim()}
          className="text-slate-400 hover:text-white disabled:opacity-50"
          aria-label="Subscribe"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      {status === "error" && (
        <p className="text-xs text-rose-300">{message}</p>
      )}
      {status === "loading" && (
        <p className="text-xs text-slate-500">Submitting…</p>
      )}
    </form>
  );
}
