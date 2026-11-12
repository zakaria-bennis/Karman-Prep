/* The parent portal in the painted shell. Tabs follow the child being viewed. */
import type { ReactNode } from "react";
import { PortalShell, type PortalNavItem } from "@/components/portal";
import type { Child, ParentContext } from "@/lib/parent/server";
import "@/components/portal-extras/forms.css";

export function parentNav(child: Child): PortalNavItem[] {
  const base = `/dashboard/parent/${child.id}`;
  return [
    { href: base, label: "Week", icon: "today" },
    { href: `${base}/messages`, label: "Messages", icon: "messages" },
    { href: `${base}/report`, label: "Report", icon: "review" },
    { href: `${base}/progress`, label: "Progress", icon: "progress" },
    { href: `${base}/sessions`, label: "Sessions", icon: "calendar" },
    { href: `${base}/billing`, label: "Billing", icon: "money" },
  ];
}

export const PARENT_SETTINGS = "/dashboard/parent/settings";

export function ParentShell({
  ctx,
  child,
  title,
  children,
}: {
  ctx: ParentContext;
  child: Child;
  title?: string;
  children: ReactNode;
}) {
  const others = ctx.children.filter((c) => c.id !== child.id);
  return (
    <PortalShell
      portal="Parent"
      nav={parentNav(child)}
      title={title}
      name={ctx.viewer.firstName}
      accountDetail={ctx.viewer.email}
      home={`/dashboard/parent/${child.id}`}
      settingsHref={PARENT_SETTINGS}
      menu={[
        ...others.map((c) => ({
          label: `Switch to ${c.firstName}`,
          icon: "child" as const,
          href: `/dashboard/parent/${c.id}`,
        })),
        { label: "Link another student", icon: "link", href: "/dashboard/parent/link" },
      ]}
    >
      {children}
    </PortalShell>
  );
}
