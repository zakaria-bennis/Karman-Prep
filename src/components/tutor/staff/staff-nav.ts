// The staff tutor's tabs and page headings (pure, so it can be unit-tested).
// Affiliate tutors (the $199 plan) have their own tabs in components/tutor-affiliate.
import type { PortalNavItem } from "@/components/portal/PortalShell";

export const STAFF_TUTOR_NAV: PortalNavItem[] = [
  { href: "/tutor", label: "Students", icon: "students" },
  { href: "/tutor/briefing", label: "Briefing", icon: "today" },
  { href: "/tutor/schedule", label: "Schedule", icon: "calendar" },
  { href: "/tutor/earnings", label: "Earnings", icon: "progress" },
  { href: "/tutor/payouts", label: "Payouts", icon: "money" },
  { href: "/tutor/settings", label: "Settings", icon: "settings" },
];

/** Longest matching prefix wins. Student pages set no title here: they show the name. */
const TITLES: Array<[string, string]> = [
  ["/tutor/briefing", "Daily briefing"],
  ["/tutor/schedule", "Schedule"],
  ["/tutor/earnings/data", "Earnings data"],
  ["/tutor/earnings", "Earnings"],
  ["/tutor/payouts", "Payouts"],
  ["/tutor/settings/payment", "Payment settings"],
  ["/tutor/settings/booking", "Booking settings"],
  ["/tutor/settings", "Settings"],
  ["/tutor/cohort", "Cohort"],
  ["/tutor/sessions", "Session status"],
  ["/tutor", "Your students"],
];

export function staffTutorTitle(pathname: string): string {
  const hit = TITLES.filter(([p]) => pathname === p || pathname.startsWith(p + "/")).sort(
    (a, b) => b[0].length - a[0].length
  )[0];
  if (hit && hit[0] !== "/tutor") return hit[1];
  return pathname === "/tutor" ? "Your students" : "Student";
}
