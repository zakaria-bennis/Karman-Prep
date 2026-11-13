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
//   - A small card in the bottom corner (founder, 2026-11-12: short, friendly, one big
//     "Allow all", with "Essentials only" beside it as the real way to decline).
//   - Choice persists "forever" (cookie max-age 100y) — see
//     /api/consent/route.ts.
//
// Hidden on portal and quiz screens (see APP_PREFIXES).
//
// Visibility is driven by a server-resolved `ConsentState` passed
// in as a prop: only renders when state === "banner_show". Once
// the user picks, we POST /api/consent (which sets the cookie)
// and slide the banner out optimistically — the next navigation
// reads the cookie and skips the banner entirely.
// ============================================================

import { Fox } from "@/components/portal/Fox";
import { useState } from "react";
import { usePathname } from "next/navigation";
import "./consent.css";

/** Portal and quiz screens have a fixed Submit bar or phone tab bar at the bottom. The banner
 *  never covers them (design rule 34), so it shows on the public site only. Without an answer
 *  nothing is recorded: replay is opt-in. */
const APP_PREFIXES = [
  "/dashboard",
  "/learn",
  "/diagnostic",
  "/tutor",
  "/admin",
  "/school",
  "/onboarding",
  "/calculator",
  "/billing",
  "/checkout",
];

function isAppScreen(pathname: string | null): boolean {
  if (!pathname) return false;
  return APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

interface Props {
  /** Whether the banner should render. Server-rendered to avoid
   *  a flash of the banner for visitors who don't need it. */
  show: boolean;
  /** Where users can read the full policy. */
  privacyHref?: string;
}

export default function ReplayConsentBanner({ show, privacyHref = "/cookies" }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pathname = usePathname();

  if (!show || dismissed || isAppScreen(pathname)) return null;

  async function submit(choice: "yes" | "no") {
    setSubmitting(true);
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
      });
      // An answer that isn't OK means the choice wasn't saved (the 2026-11-08 audit found
      // signed-out visitors were refused): keep the banner up so they can try again.
      if (!res.ok) throw new Error(`consent not saved (${res.status})`);
    } catch {
      // Network failure or refusal — keep banner up so they can retry. Don't
      // silently capture; that's the whole point.
      setSubmitting(false);
      return;
    }
    // Our own visit counter (src/components/analytics) starts now if they allowed it.
    window.dispatchEvent(new Event("karman:consent"));
    // The cookie takes its bite and the card drops away; reduced motion skips straight to gone.
    setLeaving(true);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => setDismissed(true), still ? 0 : 380);
  }

  return (
    <div
      role="dialog"
      aria-labelledby="replay-consent-title"
      aria-describedby="replay-consent-body"
      className="kc"
      data-leaving={leaving ? "" : undefined}
    >
      <div className="kc-top">
        {/* the fox works through a plate of cookies, one bite after another */}
        <span className="kc-eat" aria-hidden="true">
          <Fox size={46} />
          {[0, 1, 2].map((i) => (
            <i key={i} style={{ "--n": i } as React.CSSProperties} />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <b key={i} style={{ "--n": i } as React.CSSProperties} />
          ))}
        </span>
        <div>
          <h2 id="replay-consent-title">Cookie Monster would be so disappointed.</h2>
          <p id="replay-consent-body">
            Ours have zero chocolate chips. They just help us make Karman Prep better for every
            student. We never share, lend or sell your data. No matter what.{" "}
            <a href={privacyHref}>Details</a>
          </p>
        </div>
      </div>
      <div className="kc-acts">
        <button type="button" className="kc-go" onClick={() => submit("yes")} disabled={submitting}>
          Allow all
        </button>
        <button
          type="button"
          className="kc-less"
          onClick={() => submit("no")}
          disabled={submitting}
        >
          Essentials only
        </button>
      </div>
    </div>
  );
}
