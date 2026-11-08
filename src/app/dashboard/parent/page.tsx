// ============================================================
// /dashboard/parent — opens the child's week. With one linked
// student it goes straight there; with several it lists them; with
// none it asks for the code from the student's invite page.
// ============================================================

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, MoreLink, Panel, PortalShell, Row, SectionHeader } from "@/components/portal";
import { CalendarSubscribe } from "@/components/dashboard/CalendarSubscribe";
import { LinkStudentForm } from "@/components/parent/LinkStudentForm";
import { requireParentContext } from "@/lib/parent/server";

export const metadata: Metadata = { title: "Parent portal" };
export const dynamic = "force-dynamic";

export default async function ParentHomePage() {
  const ctx = await requireParentContext();
  if (ctx.children.length === 1) redirect(`/dashboard/parent/${ctx.children[0].id}`);

  return (
    <PortalShell
      portal="Parent"
      nav={[{ href: "/dashboard/parent", label: "Students", icon: "child" }]}
      title={ctx.children.length ? "Your students" : "Welcome"}
      name={ctx.viewer.firstName}
      accountDetail={ctx.viewer.email}
      home="/dashboard/parent"
    >
      <Panel>
        {ctx.children.length ? (
          <>
            <Card>
              <SectionHeader title="Choose a student" />
              {ctx.children.map((c) => (
                <Row key={c.id} title={c.name} href={`/dashboard/parent/${c.id}`} right="Open" />
              ))}
              <MoreLink href="/dashboard/parent/link">Link another student</MoreLink>
            </Card>
            {!ctx.isAdmin && (
              <Card>
                <CalendarSubscribe audience="parent" />
              </Card>
            )}
          </>
        ) : (
          <section aria-labelledby="link-main">
            <h2 className="kp-title" id="link-main">
              Link your student
            </h2>
            <p className="kp-meta">
              Type the code from your student&rsquo;s account menu, under Invite a parent. Or open
              the link they send you.
            </p>
            <LinkStudentForm />
          </section>
        )}
      </Panel>
    </PortalShell>
  );
}
