"use client";

// ============================================================
// The admin portal in the painted shell. Six tabs keep the phone
// tab bar readable; every other admin tool is linked from the
// admin home (/admin). The page heading comes from the URL.
// ============================================================

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Panel, PortalShell } from "@/components/portal";
import { ADMIN_NAV, adminTitle } from "./admin-nav";
import "@/components/admin/workbench/tokens.css";
import "./admin-shell.css";

export default function AdminShell({
  name,
  email,
  children,
}: {
  name: string | null;
  email: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/admin";
  return (
    <PortalShell
      portal="Admin"
      nav={ADMIN_NAV}
      title={adminTitle(pathname)}
      name={name}
      accountDetail={email}
      home="/admin"
      menu={[
        { label: "Student view", icon: "child", href: "/dashboard/student" },
        { label: "Public site", icon: "site", href: "/" },
      ]}
    >
      <Panel label="Admin">
        <div className="kp-admin">{children}</div>
      </Panel>
    </PortalShell>
  );
}
