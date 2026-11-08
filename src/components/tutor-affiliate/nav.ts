import type { PortalNavItem } from "@/components/portal";

/** Tabs for an affiliate tutor. Staff tutor pages are not shown to them. */
export const AFFILIATE_TUTOR_NAV: PortalNavItem[] = [
  { href: "/tutor", label: "Students", icon: "students" },
  { href: "/tutor/billing", label: "Billing", icon: "money" },
];

export function joinLink(code: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://karmanprep.com";
  return `${base.replace(/\/$/, "")}/join/${encodeURIComponent(code)}`;
}

export function shortDate(iso: string | null): string {
  if (!iso) return "";
  const date = iso.length === 10 ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function studentName(s: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  const name = [s.firstName, s.lastName].filter(Boolean).join(" ").trim();
  return name || s.email.split("@")[0];
}

/**
 * The tutor plan's price as shown in the portal. The pricing work moves every
 * price into src/lib/marketing/offer.ts (TUTOR_AFFILIATE_PLAN); read it from
 * there once that is on this branch.
 */
export const TUTOR_PLAN_PRICE = "$199 a month";

export function billingLine(
  subscription: { status: string; currentPeriodEnd: string | null } | null,
  active: boolean
): string {
  if (!subscription) return "No tutor plan yet.";
  const until = subscription.currentPeriodEnd ? shortDate(subscription.currentPeriodEnd) : null;
  if (subscription.status === "trialing")
    return until ? `Free trial until ${until}.` : "Free trial.";
  if (subscription.status === "past_due") {
    return active && until
      ? `Your last payment failed. Update your card by ${until} to keep your students on Practice.`
      : "Your last payment failed, so your plan has ended.";
  }
  if (active) return until ? `Active. Renews ${until}.` : "Active.";
  return "Your tutor plan has ended.";
}
