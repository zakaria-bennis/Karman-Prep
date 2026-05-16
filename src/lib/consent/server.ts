// ============================================================
// Server-side helpers for the session-recording consent banner.
//
// Reads the request country + region from Cloudflare-injected
// headers (CF-IPCountry, CF-Region-Code) — OpenNext on Cloudflare
// Workers forwards them transparently. In local dev or non-Cloud-
// flare environments the headers will be missing; `requiresOptIn-
// Consent` falls back to "true" so we show the banner. That keeps
// the dev surface honest with what real EU/CA users see.
// ============================================================

import { cookies, headers } from "next/headers";
import { requiresOptInConsent, type Region } from "./regions";

/** Cookie name used by the banner. */
export const CONSENT_COOKIE = "strata_replay_consent";

/** Cookie values. */
export type ConsentValue = "yes" | "no";

/** Reads the visitor's geo region from request headers. */
export async function getVisitorRegion(): Promise<Region> {
  const h = await headers();
  const country = h.get("cf-ipcountry") ?? h.get("x-vercel-ip-country") ?? null;
  const region = h.get("cf-region-code") ?? h.get("x-vercel-ip-country-region") ?? null;
  return { country, region };
}

/** Has the visitor already chosen — and what did they choose? */
export async function getConsent(): Promise<ConsentValue | null> {
  const c = await cookies();
  const v = c.get(CONSENT_COOKIE)?.value;
  if (v === "yes" || v === "no") return v;
  return null;
}

/** Three-way state used by the banner component:
 *   - "banner_hidden": not a regulated region; banner never renders.
 *   - "banner_show":   regulated region + no prior choice; banner shows.
 *   - "consent_yes":   user has opted in.
 *   - "consent_no":    user has opted out.
 *
 *  The client uses this to decide whether to render the banner and
 *  whether downstream features (e.g. Sentry replay) may activate. */
export type ConsentState = "banner_hidden" | "banner_show" | "consent_yes" | "consent_no";

export async function resolveConsentState(): Promise<ConsentState> {
  const choice = await getConsent();
  if (choice === "yes") return "consent_yes";
  if (choice === "no") return "consent_no";
  const region = await getVisitorRegion();
  return requiresOptInConsent(region) ? "banner_show" : "banner_hidden";
}
