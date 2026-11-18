// Where "Go to your portal" leads: each kind of account has a portal of its own (founder,
// 2026-11-17). Pure, so it is tested by itself; src/app/portal/route.ts looks the account up.

export const PORTALS = {
  student: "/dashboard/student",
  parent: "/dashboard/parent",
  tutor: "/tutor",
  school: "/school",
} as const;

/** The portal for an account: by its role, and a school's teacher or admin goes to the school's.
 *  Anyone else (a student, a brand-new account, the site's own admin) gets the student portal. */
export function portalFor(account: { role: string | null; schoolMember: boolean }): string {
  if (account.role === "parent") return PORTALS.parent;
  if (account.role === "tutor" || account.role === "affiliate_tutor") return PORTALS.tutor;
  if (account.schoolMember) return PORTALS.school;
  return PORTALS.student;
}

/** A redirect target taken from the address bar is only followed inside this site. */
export function safeNext(next: string | null | undefined, fallback = "/portal"): string {
  if (!next) return fallback;
  try {
    const url = new URL(next, "https://karmanprep.com");
    if (url.origin !== "https://karmanprep.com") return fallback;
    if (url.pathname.startsWith("/auth/")) return fallback;
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}
