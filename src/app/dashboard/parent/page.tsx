// ============================================================
// /dashboard/parent — opens the child's week. With one linked
// student it goes straight there; with several it lists them; with
// none it asks for the code from the student's invite. A parent who
// paid for a Cohort seat (/reserve) lands here before the student
// has an account: the page says the seat is paid and offers the
// student's own link to send.
// ============================================================

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, MoreLink, Panel, PortalShell, Row } from "@/components/portal";
import { CalendarSubscribe } from "@/components/dashboard/CalendarSubscribe";
import { LinkStudentForm } from "@/components/parent/LinkStudentForm";
import { PARENT_SETTINGS } from "@/components/parent/ParentShell";
import { SendStudentLink } from "@/components/parent/SendStudentLink";
import { RESERVE } from "@/lib/marketing/reserve-copy";
import { waitingSeats } from "@/lib/parent/seats";
import { requireParentContext } from "@/lib/parent/server";
import "@/components/portal-extras/forms.css";

export const metadata: Metadata = { title: "Parent portal" };
export const dynamic = "force-dynamic";

export default async function ParentHomePage() {
  const ctx = await requireParentContext();
  // a paid seat whose student has no account yet is shown here, even beside a student already linked
  const seats = await waitingSeats(ctx.viewer.clerkId);
  if (ctx.children.length === 1 && !seats.length)
    redirect(`/dashboard/parent/${ctx.children[0].id}`);
  const land = RESERVE.start.land;
  const paidSeats = seats.map((seat) => {
    const name = seat.studentFirstName ?? "your student";
    return (
      <section key={seat.claimPath} aria-label={`${name}: seat paid`}>
        <h2 className="kp-title">
          {seat.studentFirstName ? `${name}'s seat is paid` : "The seat is paid"}
        </h2>
        <p className="kp-meta">
          This page fills in when {name} opens their link and makes an account.
        </p>
        <SendStudentLink
          path={seat.claimPath}
          label={land.share.replace("{name}", name)}
          copiedLabel={land.copied}
          shareText={land.shareText}
        />
      </section>
    );
  });

  return (
    <PortalShell
      portal="Parent"
      nav={[{ href: "/dashboard/parent", label: "Students", icon: "child" }]}
      title={ctx.children.length ? "Your students" : "Welcome"}
      name={ctx.viewer.firstName}
      accountDetail={ctx.viewer.email}
      home="/dashboard/parent"
      settingsHref={PARENT_SETTINGS}
    >
      <Panel>
        {ctx.children.length ? (
          <>
            {paidSeats}
            <Card>
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
        ) : seats.length ? (
          <>
            {paidSeats}
            <Card>
              <MoreLink href="/dashboard/parent/link">Link a student with a code</MoreLink>
            </Card>
          </>
        ) : (
          <section aria-labelledby="link-main">
            <h2 className="kp-title" id="link-main">
              Link your student
            </h2>
            <p className="kp-meta">
              Ask your student to send you an invite from their Settings, under Invite a parent.
              Open the link in that email, or type its code here.
            </p>
            <LinkStudentForm />
          </section>
        )}
      </Panel>
    </PortalShell>
  );
}
