// The admin portal's tabs and page headings (pure, so it can be unit-tested).
import type { PortalNavItem } from "@/components/portal/PortalShell";

export const ADMIN_NAV: PortalNavItem[] = [
  { href: "/admin", label: "Home", icon: "home" },
  { href: "/admin/users", label: "People", icon: "students" },
  { href: "/admin/plans", label: "Plans", icon: "money" },
  { href: "/admin/scholarship", label: "Scholarship", icon: "review" },
  { href: "/admin/bank", label: "Questions", icon: "questions" },
  { href: "/admin/cohorts", label: "Cohorts", icon: "calendar" },
];

/** Longest matching prefix wins. */
const TITLES: Array<[string, string]> = [
  ["/admin/scholarship", "Scholarship"],
  ["/admin/plans", "Plans and subscriptions"],
  ["/admin/affiliates", "Affiliate tutors"],
  ["/admin/schools", "Schools"],
  ["/admin/bank", "Question bank"],
  ["/admin/users", "People"],
  ["/admin/students", "Students"],
  ["/admin/tutors", "Tutors"],
  ["/admin/cohorts", "Cohorts"],
  ["/admin/revenue", "Revenue"],
  ["/admin/moderation", "Moderation"],
  ["/admin/jobs", "Background jobs"],
  ["/admin/pdf-pipeline", "Import jobs"],
  ["/admin/curriculum", "Curriculum"],
  ["/admin/questions/dashboard", "Question overview"],
  ["/admin/questions/inspect", "Question inspector"],
  ["/admin/questions/rejected", "Rejected questions"],
  ["/admin/questions/chart-review", "Chart review"],
  ["/admin/questions/geometry-review", "Geometry review"],
  ["/admin/questions/review", "Review questions"],
  ["/admin/questions/preview", "Question preview"],
  ["/admin/questions/import", "Import questions"],
  ["/admin/questions", "Questions"],
  ["/admin", "Admin"],
];

export function adminTitle(pathname: string): string {
  const hit = TITLES.filter(([p]) => pathname === p || pathname.startsWith(p + "/")).sort(
    (a, b) => b[0].length - a[0].length
  )[0];
  return hit?.[1] ?? "Admin";
}
