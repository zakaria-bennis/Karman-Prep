// ============================================================
// /dashboard/parent — opens the child's week. With one linked
// student it goes straight there; with several it lists them; with
// none it explains the invite (the student sends it).
// ============================================================

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Panel, PortalShell, Row, SectionHeader } from "@/components/portal";
import { CalendarSubscribe } from "@/components/dashboard/CalendarSubscribe";
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
      title={ctx.children.length ? "Your students" : "Almost there"}
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
            </Card>
            {!ctx.isAdmin && (
              <Card>
                <CalendarSubscribe audience="parent" />
              </Card>
            )}
          </>
        ) : (
          <Card>
            <SectionHeader title="No student linked yet" />
            <p className="kp-meta">
              Your student sends you a link from their account menu, under Invite a parent. Open it
              while signed in here and you are linked.
            </p>
          </Card>
        )}
      </Panel>
    </PortalShell>
  );
}
