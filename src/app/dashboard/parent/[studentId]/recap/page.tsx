// ============================================================
// /dashboard/parent/[studentId]/recap — a preview of this week's
// recap email, exactly as it would be sent. Sending is switched
// off on local builds; the send is logged instead.
// ============================================================

import type { Metadata } from "next";
import { Card, Cta, Panel, SectionHeader } from "@/components/portal";
import { ParentShell } from "@/components/parent/ParentShell";
import { ActionMessage } from "@/components/school/SchoolShell";
import { appUrl } from "@/lib/billing-portal/stripe";
import { recapHtml, recapSubject } from "@/lib/parent/recap";
import { loadChildWeek, requireChild, requireParentContext } from "@/lib/parent/server";
import { sendRecapAction } from "../../actions";

export const metadata: Metadata = { title: "Weekly email" };
export const dynamic = "force-dynamic";

export default async function ParentRecapPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const ctx = await requireParentContext();
  const child = await requireChild(ctx, (await params).studentId);
  const [{ done, error }, week] = await Promise.all([searchParams, loadChildWeek(child)]);
  const input = {
    childFirstName: child.firstName,
    parentFirstName: ctx.viewer.firstName,
    week,
    portalUrl: `${appUrl()}/dashboard/parent/${child.id}`,
    weekOf: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/Chicago" }),
  };

  return (
    <ParentShell ctx={ctx} child={child} title="Weekly email">
      <Panel>
        <ActionMessage done={done} error={error} />
        <section aria-labelledby="recap-main">
          <h2 className="kp-title" id="recap-main">
            {recapSubject(input)}
          </h2>
          <p className="kp-meta">
            The weekly email shows the big picture, never single questions. Send it to{" "}
            {ctx.viewer.email ?? "yourself"} to see it in your inbox.
          </p>
          <form action={sendRecapAction}>
            <input type="hidden" name="studentId" value={child.id} />
            <Cta type="submit">Send it to me now</Cta>
          </form>
        </section>
        <Card>
          <SectionHeader title="Preview" />
          <iframe
            title={`Preview of ${recapSubject(input)}`}
            className="kp-email"
            srcDoc={recapHtml(input)}
            sandbox=""
            style={{ width: "100%", height: 560, display: "block" }}
          />
        </Card>
      </Panel>
    </ParentShell>
  );
}
