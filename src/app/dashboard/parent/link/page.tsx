// ============================================================
// /dashboard/parent/link — link a student with the code from their
// "Invite a parent" page. Open from the account menu, and where a
// typed code goes back to when it doesn't work.
// ============================================================

import type { Metadata } from "next";
import { Panel, PortalShell } from "@/components/portal";
import { LinkStudentForm } from "@/components/parent/LinkStudentForm";
import { parentNav } from "@/components/parent/ParentShell";
import { ActionMessage } from "@/components/school/SchoolShell";
import { requireParentContext } from "@/lib/parent/server";
import "@/components/portal-extras/forms.css";

export const metadata: Metadata = { title: "Link a student" };
export const dynamic = "force-dynamic";

export default async function ParentLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requireParentContext();
  const { error } = await searchParams;
  const first = ctx.children[0];

  return (
    <PortalShell
      portal="Parent"
      nav={
        first ? parentNav(first) : [{ href: "/dashboard/parent", label: "Students", icon: "child" }]
      }
      title="Link a student"
      name={ctx.viewer.firstName}
      accountDetail={ctx.viewer.email}
      home="/dashboard/parent"
    >
      <Panel>
        <ActionMessage error={error} />
        <section aria-labelledby="link-main">
          <h2 className="kp-title" id="link-main">
            Type your student&rsquo;s code
          </h2>
          <p className="kp-meta">
            Your student finds it in their account menu, under Invite a parent. Or open the link
            they send you.
          </p>
          <LinkStudentForm />
        </section>
      </Panel>
    </PortalShell>
  );
}
