// ============================================================
// The sign-up funnel, step by step. Pure (funnel.test.ts).
//
// A "person" is the signed-in account when we know it, otherwise the device's random id; a
// device id seen once with an account is that account everywhere in the window.
//
// For each step: how many people reached it; of those who reached the step before, how many
// went on (and how many stopped there); and how many arrived without the step before (for
// example a visitor who declined analytics on the public site, or someone who bought without
// taking the free test). The steps follow the real flow: the free test sits inside the
// portal, after sign-up.
// ============================================================

export interface AnalyticsEvent {
  at: string;
  userId: string | null;
  anonId: string | null;
  sessionId: string | null;
  surface: "site" | "portal" | "server";
  path: string | null;
  name: string;
  props: Record<string, unknown>;
}

export interface FunnelStep {
  key: string;
  label: string;
  match: (e: AnalyticsEvent) => boolean;
}

export const FUNNEL_STEPS: FunnelStep[] = [
  {
    key: "site_visit",
    label: "Visited the site",
    match: (e) => e.name === "page_view" && e.surface === "site",
  },
  {
    key: "start_click",
    label: "Clicked Start free",
    match: (e) => e.name === "cta_click" && e.props.to === "sign_up",
  },
  { key: "signup", label: "Signed up", match: (e) => e.name === "signup" },
  {
    key: "onboarding_done",
    label: "Finished the intake",
    match: (e) => e.name === "onboarding_done",
  },
  { key: "test_started", label: "Started a free test", match: (e) => e.name === "test_started" },
  {
    key: "checkout_started",
    label: "Opened checkout",
    match: (e) => e.name === "checkout_started",
  },
  { key: "paid", label: "Paid", match: (e) => e.name === "paid" },
];

export interface FunnelRow {
  key: string;
  label: string;
  reached: number;
  /** Reached the step before and this one. Null on the first step. */
  continued: number | null;
  /** Reached the step before but not this one. */
  dropped: number | null;
  /** continued / reached at the step before, 0..1. Null on the first step or with nobody before. */
  rate: number | null;
  /** Reached this step without the step before. */
  joined: number;
}

/** Device id -> account, from any event that carries both. */
export function identityMap(events: AnalyticsEvent[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of events)
    if (e.anonId && e.userId && !map.has(e.anonId)) map.set(e.anonId, e.userId);
  return map;
}

export function personOf(e: AnalyticsEvent, ids: Map<string, string>): string | null {
  if (e.userId) return `u:${e.userId}`;
  if (e.anonId) {
    const user = ids.get(e.anonId);
    return user ? `u:${user}` : `a:${e.anonId}`;
  }
  return null;
}

export function computeFunnel(
  events: AnalyticsEvent[],
  steps: FunnelStep[] = FUNNEL_STEPS
): FunnelRow[] {
  const ids = identityMap(events);
  const reached = steps.map(() => new Set<string>());
  for (const e of events) {
    const person = personOf(e, ids);
    if (!person) continue;
    steps.forEach((step, i) => {
      if (step.match(e)) reached[i].add(person);
    });
  }
  return steps.map((step, i) => {
    const here = reached[i];
    if (i === 0) {
      return {
        key: step.key,
        label: step.label,
        reached: here.size,
        continued: null,
        dropped: null,
        rate: null,
        joined: here.size,
      };
    }
    const before = reached[i - 1];
    let continued = 0;
    for (const p of here) if (before.has(p)) continued++;
    return {
      key: step.key,
      label: step.label,
      reached: here.size,
      continued,
      dropped: before.size - continued,
      rate: before.size ? continued / before.size : null,
      joined: here.size - continued,
    };
  });
}
