"use client";

// ============================================================
// ReplayConsentBanner — bottom slide-up banner shown to visitors
// in regulated jurisdictions (EU/EEA/UK + US-CA) on their first
// visit. Asks for explicit opt-in to session-recording (Sentry
// Replay) before any replay sampling can fire.
//
// Posture decisions (locked):
//   - Opt-in by default in EU/EEA/UK + US-CA only.
//   - Binary consent (no granular categories).
//   - Bottom slide-up (non-blocking, dismissable via Accept/Decline).
//   - Choice persists "forever" (cookie max-age 100y) — see
//     /api/consent/route.ts.
//
// Visibility is driven by a server-resolved `ConsentState` passed
// in as a prop: only renders when state === "banner_show". Once
// the user picks, we POST /api/consent (which sets the cookie)
// and slide the banner out optimistically — the next navigation
// reads the cookie and skips the banner entirely.
// ============================================================

import { useState } from "react";
import { Shield, X } from "lucide-react";

interface Props {
  /** Whether the banner should render. Server-rendered to avoid
   *  a flash of the banner for visitors who don't need it. */
  show: boolean;
  /** Where users can read the full policy. */
  privacyHref?: string;
}

export default function ReplayConsentBanner({ show, privacyHref = "/privacy" }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!show || dismissed) return null;

  async function submit(choice: "yes" | "no") {
    setSubmitting(true);
    try {
      await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
      });
    } catch {
      // Network failure — keep banner up so they can retry. Don't
      // silently capture; that's the whole point.
      setSubmitting(false);
      return;
    }
    setDismissed(true);
  }

  return (
    <div
      role="dialog"
      aria-labelledby="replay-consent-title"
      aria-describedby="replay-consent-body"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/10 bg-slate-950/95 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
        <Shield className="h-5 w-5 shrink-0 text-blue-300" aria-hidden="true" />
        <div className="flex-1">
          <p id="replay-consent-title" className="text-sm font-bold text-white">
            Help us debug your experience?
          </p>
          <p id="replay-consent-body" className="mt-0.5 text-xs text-slate-400">
            With your permission, Karman records anonymized session activity (clicks, navigation,
            page text) so we can reproduce bugs. Sensitive fields are masked and never sent. You can
            change this anytime from{" "}
            <a href={privacyHref} className="underline hover:text-blue-300">
              Privacy
            </a>
            .
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => submit("no")}
            disabled={submitting}
            className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.08] disabled:opacity-50"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => submit("yes")}
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            Allow
          </button>
          <button
            type="button"
            aria-label="Dismiss without choosing"
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
