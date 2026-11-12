// ============================================================
// When may a usage event be recorded? Pure, so it is unit-tested (consent.test.ts).
//
// Public site (marketing pages, sign-in, the calculator page):
//   * Do Not Track or Global Privacy Control on      -> never.
//   * Cookie banner answered "Essentials only" (no)  -> never.
//   * Cookie banner answered "Allow all" (yes)       -> yes.
//   * No answer yet, in a place where the banner asks first (EU/EEA/UK, California, or no
//     location known)                                -> no, until they allow.
//   * No answer, somewhere the banner is not shown   -> yes (first-party only, no ads, no
//     cross-site ids), the same posture src/lib/consent takes for those places.
//
// Signed-in portals: product use (pages opened, time on a tool, questions seen) is part of
// the service a student or family signed up for and is what tutors read, so it is recorded
// for a signed-in user whatever the site cookie says. A signed-out request for a portal page
// records nothing.
// ============================================================

import { requiresOptInConsent, type Region } from "@/lib/consent/regions";

export interface SiteConsentInput {
  /** Value of the banner cookie: "yes", "no" or missing. */
  cookie: string | null | undefined;
  region: Region;
  /** The DNT request header ("1" means do not track). */
  dnt: string | null | undefined;
  /** The Sec-GPC request header ("1" means opt out). */
  gpc: string | null | undefined;
}

export function privacySignalOn(dnt: string | null | undefined, gpc: string | null | undefined) {
  return dnt?.trim() === "1" || gpc?.trim() === "1";
}

export function siteEventsAllowed({ cookie, region, dnt, gpc }: SiteConsentInput): boolean {
  if (privacySignalOn(dnt, gpc)) return false;
  if (cookie === "no") return false;
  if (cookie === "yes") return true;
  return !requiresOptInConsent(region);
}

export type Surface = "site" | "portal";

/** The one gate the track route uses. */
export function mayRecord(
  surface: Surface,
  input: SiteConsentInput & { signedIn: boolean }
): boolean {
  if (surface === "portal") return input.signedIn;
  return siteEventsAllowed(input);
}
