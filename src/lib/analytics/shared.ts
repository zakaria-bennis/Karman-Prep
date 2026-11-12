// Pure analytics helpers with no dependencies, safe in the browser bundle: limits, path
// clean-up, which surface a page belongs to and which feature it is.

/** Raw events are kept this long, then deleted (src/lib/analytics/server.ts). */
export const ANALYTICS_RETENTION_MONTHS = 13;

/** One POST carries at most this many events and this many bytes. */
export const MAX_BATCH = 25;
export const MAX_BODY_BYTES = 16 * 1024;
/** Per visit (session id), at most this many events a minute reach the database. */
export const SESSION_EVENTS_PER_MINUTE = 120;

const ID_SEGMENT =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|user_[A-Za-z0-9]+|dev_seed_[a-z_]+|\d+|[A-Za-z0-9_-]{20,})$/;

/** The path only: no query or hash, ids replaced by ":id", at most 200 characters. */
export function normalizePath(raw: string): string {
  const path = raw.split(/[?#]/)[0] || "/";
  const parts = path
    .split("/")
    .filter(Boolean)
    .slice(0, 8)
    .map((p) => {
      let seg = p;
      try {
        seg = decodeURIComponent(p);
      } catch {
        // keep as sent
      }
      if (ID_SEGMENT.test(seg) || seg.includes("@")) return ":id";
      return seg.replace(/[^A-Za-z0-9_.:\-[\]]/g, "").slice(0, 40) || ":id";
    });
  return ("/" + parts.join("/")).slice(0, 200);
}

/** Public marketing and sign-in pages are the "site"; everything else is a signed-in portal. */
const SITE_PREFIXES = [
  "/free-practice-test",
  "/private-tutoring",
  "/for-tutors",
  "/program",
  "/schools",
  "/pricing",
  "/guarantee",
  "/faq",
  "/about",
  "/research",
  "/terms",
  "/privacy",
  "/refunds",
  "/cookies",
  "/calculator",
  "/coming-soon",
  "/auth",
];

export function surfaceOf(path: string): "site" | "portal" {
  if (path === "/") return "site";
  return SITE_PREFIXES.some((p) => path === p || path.startsWith(p + "/")) ? "site" : "portal";
}

/** What a page is, in words the founder and tutors use. Longest prefix first. */
const FEATURES: Array<[string, string]> = [
  ["/learn/time-trial", "Time trial"],
  ["/learn/daily-ten", "Daily 10"],
  ["/learn/daily", "Daily games"],
  ["/learn/diagnostic", "Diagnostic"],
  ["/learn/test", "Full-length test"],
  ["/learn/tests", "Full-length test"],
  ["/learn/practice", "Practice"],
  ["/learn/set", "Practice"],
  ["/learn/domain", "Practice"],
  ["/learn/math", "Question bank"],
  ["/learn/reading", "Question bank"],
  ["/learn/history", "History and review"],
  ["/learn/earlier", "History and review"],
  ["/learn", "Question bank"],
  ["/diagnostic", "Diagnostic"],
  ["/dashboard/student/calendar", "Calendar"],
  ["/dashboard/student/chat", "Chat"],
  ["/dashboard/student/settings", "Settings"],
  ["/dashboard/student", "Student home"],
  ["/dashboard/parent", "Parent portal"],
  ["/onboarding", "Onboarding"],
  ["/billing", "Billing"],
  ["/checkout", "Billing"],
  ["/tutor", "Tutor portal"],
  ["/school", "School portal"],
  ["/admin", "Admin"],
  ["/calculator", "Calculator page"],
];

export function featureOf(path: string): string {
  if (surfaceOf(path) === "site" && !path.startsWith("/calculator")) return "Public site";
  const hit = FEATURES.find(([p]) => path === p || path.startsWith(p + "/"));
  return hit?.[1] ?? "Other";
}
