// ============================================================
// Made-up events for the "Sample data" view of /admin/analytics, so the charts can be judged
// before real traffic exists. Deterministic (seeded), never written to the database, and the
// page labels every number from here as sample. Student names are plainly fake.
// ============================================================

import type { AnalyticsEvent } from "./funnel";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const hex = (r: () => number, n: number) =>
  Array.from({ length: n }, () => Math.floor(r() * 16).toString(16)).join("");
const uuid = (r: () => number) =>
  `${hex(r, 8)}-${hex(r, 4)}-4${hex(r, 3)}-a${hex(r, 3)}-${hex(r, 12)}`;

const SITE = ["/", "/pricing", "/free-practice-test", "/program", "/faq", "/private-tutoring"];
const PORTAL: Array<[string, number]> = [
  ["/dashboard/student", 3],
  ["/learn/practice/:id", 5],
  ["/learn/daily", 2],
  ["/learn/diagnostic", 2],
  ["/learn/time-trial", 1],
  ["/dashboard/student/progress", 1],
  ["/learn/math", 2],
];

export const SAMPLE_STUDENTS: Array<{ id: string; name: string }> = [
  "Sample Student A",
  "Sample Student B",
  "Sample Student C",
  "Sample Student D",
  "Sample Student E",
  "Sample Student F",
  "Sample Student G",
  "Sample Student H",
].map((name, i) => ({ id: `sample_student_${i + 1}`, name }));

function pickWeighted(r: () => number, items: Array<[string, number]>): string {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [v, w] of items) if ((x -= w) <= 0) return v;
  return items[0][0];
}

export function sampleEvents(days: number, now = new Date()): AnalyticsEvent[] {
  const r = rng(20261112);
  const out: AnalyticsEvent[] = [];
  const at = (dayAgo: number, minute: number) =>
    new Date(now.getTime() - dayAgo * 86_400_000 + minute * 60_000 - 12 * 3_600_000).toISOString();
  const push = (e: Omit<AnalyticsEvent, "props"> & { props?: Record<string, unknown> }) =>
    out.push({ props: {}, ...e });

  for (let d = days - 1; d >= 0; d--) {
    // Public-site visitors: a funnel that thins step by step.
    const visitors = 25 + Math.floor(r() * 30) + Math.floor((days - d) / 3);
    for (let v = 0; v < visitors; v++) {
      const anonId = uuid(r);
      const sessionId = uuid(r);
      let m = Math.floor(r() * 600);
      const pages = 1 + Math.floor(r() * 3);
      for (let p = 0; p < pages; p++) {
        const path = p === 0 ? SITE[Math.floor(r() * 2)] : SITE[Math.floor(r() * SITE.length)];
        const base = { userId: null, anonId, sessionId, surface: "site" as const, path };
        push({ ...base, at: at(d, m), name: "page_view" });
        push({
          ...base,
          at: at(d, m + 1),
          name: "page_time",
          props: { seconds: 15 + Math.floor(r() * 120) },
        });
        m += 2;
      }
      if (r() > 0.3) continue;
      push({
        userId: null,
        anonId,
        sessionId,
        surface: "site",
        path: "/free-practice-test",
        at: at(d, m),
        name: "cta_click",
        props: { to: "sign_up" },
      });
      if (r() > 0.6) continue;
      const userId = `sample_signup_${d}_${v}`;
      push({
        userId,
        anonId,
        sessionId,
        surface: "portal",
        path: "/onboarding",
        at: at(d, m + 2),
        name: "signup",
      });
      if (r() > 0.75) continue;
      push({
        userId,
        anonId: null,
        sessionId: null,
        surface: "server",
        path: null,
        at: at(d, m + 6),
        name: "onboarding_done",
      });
      if (r() > 0.6) continue;
      push({
        userId,
        anonId: null,
        sessionId: null,
        surface: "server",
        path: null,
        at: at(d, m + 9),
        name: "test_started",
        props: { kind: "diagnostic" },
      });
      if (r() > 0.35) continue;
      push({
        userId,
        anonId: null,
        sessionId: null,
        surface: "server",
        path: null,
        at: at(d, m + 40),
        name: "checkout_started",
        props: { plan: "pro" },
      });
      if (r() > 0.55) continue;
      push({
        userId,
        anonId: null,
        sessionId: null,
        surface: "server",
        path: null,
        at: at(d, m + 44),
        name: "paid",
        props: { plan: "pro" },
      });
    }

    // Students in the portal.
    SAMPLE_STUDENTS.forEach((s, i) => {
      if (r() < 0.25 + i * 0.07) return; // later letters study less often
      const sessionId = uuid(r);
      const anonId = uuid(r);
      let m = 900 + Math.floor(r() * 240);
      const pages = 2 + Math.floor(r() * 5);
      let last: AnalyticsEvent | null = null;
      for (let p = 0; p < pages; p++) {
        const path = pickWeighted(r, PORTAL);
        const base = { userId: s.id, anonId, sessionId, surface: "portal" as const, path };
        push({ ...base, at: at(d, m), name: "page_view" });
        if (path.startsWith("/learn/practice") || path.startsWith("/learn/diagnostic")) {
          const q = 3 + Math.floor(r() * 8);
          for (let k = 0; k < q; k++) {
            push({
              ...base,
              at: at(d, m + k),
              name: "question_viewed",
              props: { questionId: uuid(r), mode: "instant" },
            });
            if (r() < 0.15) push({ ...base, at: at(d, m + k), name: "calculator_opened" });
          }
        }
        push({
          ...base,
          at: at(d, m + 4),
          name: "page_time",
          props: { seconds: 60 + Math.floor(r() * 600) },
        });
        last = out[out.length - 1];
        m += 12;
      }
      // Some visits end on a question with no answer: a stall worth a tutor's look.
      if (last && r() < 0.2 + i * 0.04)
        push({
          ...last,
          at: at(d, m + 1),
          name: "question_viewed",
          props: { questionId: uuid(r), mode: "instant" },
        });
    });
  }
  return out;
}

/** Questions answered per sample student (in real mode this comes from the answer tables). */
export function sampleAnswered(events: AnalyticsEvent[]): Map<string, number> {
  const seen = new Map<string, number>();
  for (const e of events)
    if (e.name === "question_viewed" && e.userId) seen.set(e.userId, (seen.get(e.userId) ?? 0) + 1);
  for (const [k, v] of seen) seen.set(k, Math.round(v * 0.86));
  return seen;
}
