/* The parent portal in the painted shell. Tabs follow the child being viewed. */
import type { ReactNode } from "react";
import { PortalShell, type PortalNavItem } from "@/components/portal";
import type { Child, ParentContext } from "@/lib/parent/server";
import "@/components/portal-extras/forms.css";

export function parentNav(child: Child): PortalNavItem[] {
  const base = `/dashboard/parent/${child.id}`;
  return [
    { href: base, label: "Week", icon: "today" },
    { href: `${base}/progress`, label: "Progress", icon: "progress" },
    { href: `${base}/sessions`, label: "Sessions", icon: "calendar" },
    { href: `${base}/billing`, label: "Billing", icon: "money" },
  ];
}

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
      menu={[
        { label: "Weekly email", icon: "mail", href: `/dashboard/parent/${child.id}/recap` },
        ...others.map((c) => ({
          label: c.firstName,
          icon: "child" as const,
          href: `/dashboard/parent/${c.id}`,
        })),
        { label: "Link student", icon: "link", href: "/dashboard/parent/link" },
      ]}
    >
      {children}
    </PortalShell>
  );
}
