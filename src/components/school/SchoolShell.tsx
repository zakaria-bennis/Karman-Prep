/* The school portal in the painted shell: two tabs, Classes and Billing. */
import type { ReactNode } from "react";
import { PortalShell, type PortalNavItem } from "@/components/portal";
import type { SchoolContext } from "@/lib/school/access";
import "@/components/portal-extras/forms.css";

export const SCHOOL_NAV: PortalNavItem[] = [
  { href: "/school", label: "Classes", icon: "students" },
  { href: "/school/billing", label: "Billing", icon: "money" },
];

export function SchoolShell({
  ctx,
  title,
  children,
}: {
  ctx: SchoolContext;
  title?: string;
  children: ReactNode;
}) {
  return (
    <PortalShell
      portal="School"
      nav={SCHOOL_NAV}
      title={title}
      name={ctx.viewer.firstName}
      accountDetail={ctx.viewer.email ?? ctx.school.name}
      home="/school"
    >
      {children}
    </PortalShell>
  );
}

/** The result line from an action (?done= or ?error=), read out when it appears. */
export function ActionMessage({ done, error }: { done?: string; error?: string }) {
  if (error)
    return (
      <p className="kp-msg" data-tone="error" role="alert">
        {error}
      </p>
    );
  if (done)
    return (
      <p className="kp-msg" role="status">
        {done}
      </p>
    );
  return null;
}
