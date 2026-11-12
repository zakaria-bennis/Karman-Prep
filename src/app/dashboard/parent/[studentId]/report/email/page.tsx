// ============================================================
// /dashboard/parent/[studentId]/report/email — a preview of the
// daily report email, exactly as it would be sent. Nothing sends
// it yet: there is no send button and no scheduled job.
// ============================================================

import type { Metadata } from "next";
import { Card, MoreLink, Panel, SectionHeader } from "@/components/portal";
import { ParentShell } from "@/components/parent/ParentShell";
import { NoDailyReport } from "@/components/parent/daily-parts";
import { appUrl } from "@/lib/billing-portal/stripe";
import { dailyHtml, dailySubject } from "@/lib/parent/daily-email";
import { childHasDailyReport, loadDailyReport } from "@/lib/parent/daily-report";
import { requireChild, requireParentContext } from "@/lib/parent/server";

export const metadata: Metadata = { title: "Daily email" };
export const dynamic = "force-dynamic";

export default async function ParentDailyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const ctx = await requireParentContext();
  const child = await requireChild(ctx, (await params).studentId);
  const base = `/dashboard/parent/${child.id}`;

  if (!(await childHasDailyReport(child))) {
    return (
      <ParentShell ctx={ctx} child={child} title="Daily email">
        <Panel>
          <NoDailyReport childName={child.firstName} base={base} />
        </Panel>
      </ParentShell>
    );
  }

  const { day } = await searchParams;
  const { report } = await loadDailyReport(ctx, child, day);
  const reportHref = `${base}/report${report.isToday ? "" : `?day=${report.day}`}`;
  const input = {
    childFirstName: child.firstName,
    parentFirstName: ctx.viewer.firstName,
    report,
    portalUrl: `${appUrl()}${reportHref}`,
  };

  return (
    <ParentShell ctx={ctx} child={child} title="Daily email">
      <Panel>
        <section aria-labelledby="daily-email-main">
          <h2 className="kp-title" id="daily-email-main">
            {dailySubject(input)}
          </h2>
          <p className="kp-meta">
            The daily email shows the day&rsquo;s work, the predicted score and the tutor&rsquo;s
            note, never single questions.
          </p>
          <MoreLink href={reportHref}>Back to the report</MoreLink>
        </section>
        <Card>
          <SectionHeader title="Preview" />
          <iframe
            title={`Preview of ${dailySubject(input)}`}
            className="kp-email"
            srcDoc={dailyHtml(input)}
            sandbox=""
            style={{ width: "100%", height: 560, display: "block" }}
          />
        </Card>
      </Panel>
    </ParentShell>
  );
}
