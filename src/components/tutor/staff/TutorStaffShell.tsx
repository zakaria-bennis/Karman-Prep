"use client";

// ============================================================
// The staff tutor portal (David's screens) in the painted shell,
// matching the affiliate tutor portal. The box is wider than the
// student's, like the admin's, because these are work screens
// with tables. The page heading comes from the URL.
// ============================================================

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Panel, PortalShell } from "@/components/portal";
import { STAFF_TUTOR_NAV, staffTutorTitle } from "./staff-nav";
import "@/components/admin/workbench/tokens.css";
import "./staff.css";

export default function TutorStaffShell({
  name,
  email,
  isAdmin,
  children,
}: {
  name: string | null;
  email: string | null;
  isAdmin: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/tutor";
  return (
    <PortalShell
      portal="Tutor"
      nav={STAFF_TUTOR_NAV}
      title={staffTutorTitle(pathname)}
      name={name}
      accountDetail={email}
      home="/tutor"
      menu={isAdmin ? [{ label: "Admin", href: "/admin" }] : []}
    >
      <Panel label="Tutor">
        <div className="kp-staff">{children}</div>
      </Panel>
    </PortalShell>
  );
}
