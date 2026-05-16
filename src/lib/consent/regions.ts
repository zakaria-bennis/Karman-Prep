// ============================================================
// Geographic regions that require explicit opt-in consent before
// we may enable session-recording (Sentry Replay) under their
// privacy laws.
//
// EU (GDPR) — EEA + UK list. ISO 3166-1 alpha-2 codes.
// US-CA   — California (CCPA / CPRA). We treat the whole state as
//           regulated even though CPRA applies only to certain
//           thresholds — easier than tracking residency precisely.
//
// Anyone OUTSIDE this list lands on the page with no banner and
// replay decisions are governed by the global replay-sample-rate
// in sentry.client.config.ts. Currently that's 0 anyway, but the
// plumbing is here so we can flip it on without re-doing the
// consent layer.
// ============================================================

// EU / EEA + UK. Source: gov.uk + europa.eu published lists.
// Kept inline (no fetch) — country codes don't churn often and
// runtime fetches on every page load are a non-starter.
const EU_EEA_COUNTRIES: ReadonlySet<string> = new Set([
  // EU 27
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  // EEA additions
  "IS",
  "LI",
  "NO",
  // UK (post-Brexit, UK GDPR still applies)
  "GB",
]);

export interface Region {
  /** ISO 3166-1 alpha-2 country code (uppercase) */
  country: string | null;
  /** First-level subdivision (e.g. ISO 3166-2 "US-CA" → "CA").
   *  Null when the platform doesn't provide it (e.g. some VPN egress). */
  region: string | null;
}

/** True if the visitor sits in a jurisdiction that demands opt-in
 *  consent for behavioral session capture. */
export function requiresOptInConsent({ country, region }: Region): boolean {
  if (!country) {
    // No geo data available → assume the strictest posture. Safer
    // to show the banner than to silently capture.
    return true;
  }
  const c = country.toUpperCase();
  if (EU_EEA_COUNTRIES.has(c)) return true;
  if (c === "US" && region?.toUpperCase() === "CA") return true;
  return false;
}
