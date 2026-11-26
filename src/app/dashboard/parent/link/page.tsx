// ============================================================
// /dashboard/parent/link — link a student with the code from their
// invite (their Settings shows it under "Invite a parent", and it is
// in the invite email). Open from the account menu, and where a
// typed code goes back to when it doesn't work.
// ============================================================

import type { Metadata } from "next";
import { Panel, PortalShell } from "@/components/portal";
import { LinkStudentForm } from "@/components/parent/LinkStudentForm";
import { PARENT_SETTINGS, parentNav } from "@/components/parent/ParentShell";
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
      settingsHref={PARENT_SETTINGS}
    >
      <Panel>
        <ActionMessage error={error} />
        <section aria-labelledby="link-main">
          <h2 className="kp-title" id="link-main">
            Student code
          </h2>
          <p className="kp-meta">
            The code is in your student&rsquo;s invite email. They send it from their Settings,
            under Invite a parent.
          </p>
          <LinkStudentForm />
        </section>
      </Panel>
    </PortalShell>
  );
}
