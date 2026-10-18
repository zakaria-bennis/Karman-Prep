"use client";

// ============================================================
// LeadForm — the one email form for the marketing site: free
// practice test registration, program interest, scholarship
// enquiries and the newsletter. Posts to /api/email/subscribe,
// which records the lead with its `source`.
//
// Observatory treatment: surface inputs with bronze hairlines,
// gold focus ring, the gold button as the single invitation.
// ============================================================

import { useId, useState } from "react";
import { ArrowRight, CheckCircle } from "lucide-react";
import type { LeadSource } from "@/lib/marketing/offer";
import { cn } from "@/lib/utils";

type Role = "student" | "parent";

interface Props {
  source: LeadSource;
  ctaLabel: string;
  successMessage: string;
  /** Ask for a first name (e.g. practice test registration). */
  askName?: boolean;
  /** Ask whether the visitor is a student or a parent. */
  askRole?: boolean;
  /** Small print under the form. */
  note?: string;
  className?: string;
}

const inputClass =
  "w-full rounded-xl border border-bronze bg-surface px-4 py-3 text-base text-ivory placeholder:text-taupe/70 transition-colors duration-fast focus:border-gold-bright focus:outline-none focus:ring-2 focus:ring-gold-bright/40";

export default function LeadForm({
  source,
  ctaLabel,
  successMessage,
  askName = false,
  askRole = false,
  note,
  className,
}: Props) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          source,
          ...(askName && name.trim() ? { name: name.trim() } : {}),
          ...(askRole && role ? { role } : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Something went wrong. Please try again.");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className={cn("card-surface flex items-center gap-3 px-5 py-4 text-left", className)}
      >
        <CheckCircle className="h-5 w-5 shrink-0 text-gold-bright" aria-hidden="true" />
        <p className="text-sm font-medium text-ivory">{successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-3 text-left", className)} noValidate>
      {askName && (
        <div>
          <label htmlFor={`${id}-name`} className="type-label mb-1.5 block text-taupe">
            First name
          </label>
          <input
            id={`${id}-name`}
            type="text"
            autoComplete="given-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className={inputClass}
          />
        </div>
      )}

      {askRole && (
        <fieldset>
          <legend className="type-label mb-1.5 block text-taupe">I&apos;m a</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["student", "parent"] as const).map((r) => (
              <label
                key={r}
                className={cn(
                  "flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border px-4 text-sm font-medium capitalize transition-colors duration-fast",
                  role === r
                    ? "border-gold/60 bg-surface-raised text-ivory"
                    : "border-bronze bg-surface text-taupe hover:text-ivory"
                )}
              >
                <input
                  type="radio"
                  name={`${id}-role`}
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  className="sr-only"
                />
                {r}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div>
        <label htmlFor={`${id}-email`} className="type-label mb-1.5 block text-taupe">
          Email
        </label>
        <input
          id={`${id}-email`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={status === "loading" || !email.trim()}
        className="btn-primary w-full py-3.5"
      >
        {status === "loading" ? "Sending…" : ctaLabel}
        {status !== "loading" && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </button>

      {status === "error" && (
        <p role="alert" className="text-sm text-error-bright">
          {error}
        </p>
      )}
      {note && <p className="text-xs text-taupe/80">{note}</p>}
    </form>
  );
}
