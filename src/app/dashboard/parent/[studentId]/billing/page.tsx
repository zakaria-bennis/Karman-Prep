// ============================================================
// /dashboard/parent/[studentId]/billing — the family's plan and
// Stripe's customer portal (test mode tonight) for card, invoices
// and cancelling.
// ============================================================

import type { Metadata } from "next";
import { Card, Cta, MoreLink, Panel, Row, SectionHeader } from "@/components/portal";
import { ParentShell } from "@/components/parent/ParentShell";
import { ActionMessage } from "@/components/school/SchoolShell";
import { loadChildWeek, requireChild, requireParentContext } from "@/lib/parent/server";
import { openFamilyBillingAction } from "../../actions";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

const PLAN_NAMES: Record<string, string> = {
  practice: "Practice",
  pro: "Pro",
  group: "9-week Cohort",
  small_group: "9-week Cohort",
  cohort: "9-week Cohort",
  private: "Private tutoring",
  "private-10": "Private 10",
  "private-20": "Private 20",
};

const STATUS: Record<string, string> = {
  active: "Active",
  trialing: "Active",
  past_due: "Payment due",
  canceled: "Cancelled",
  incomplete: "Waiting for payment",
};

export default async function ParentBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const ctx = await requireParentContext();
  const child = await requireChild(ctx, (await params).studentId);
  const [{ done, error }, week] = await Promise.all([searchParams, loadChildWeek(child)]);
  const plan = week.plan;
  const planName = plan.tier ? (PLAN_NAMES[plan.tier] ?? "Karman plan") : null;

  return (
    <ParentShell ctx={ctx} child={child} title="Billing">
      <Panel>
        <ActionMessage done={done} error={error} />
        <section aria-labelledby="billing-main">
          <h2 className="kp-title" id="billing-main">
            {planName
              ? `${child.firstName}'s plan: ${planName}`
              : `${child.firstName} is on the free plan`}
          </h2>
          {planName ? (
            <>
              <p className="kp-meta">
                Change the card, see invoices or cancel in Stripe&rsquo;s secure billing page.
              </p>
              <form action={openFamilyBillingAction}>
                <input type="hidden" name="studentId" value={child.id} />
                <Cta type="submit">Manage billing in Stripe</Cta>
              </form>
            </>
          ) : (
            <>
              <p className="kp-meta">
                Practice, Pro, the Cohort and private tutoring are on the pricing page.
              </p>
              <Cta href="/pricing">See plans</Cta>
            </>
          )}
        </section>
        {planName && (
          <Card>
            <SectionHeader title="Plan" />
            <Row
              title={planName}
              right={plan.status ? (STATUS[plan.status] ?? plan.status) : "Active"}
            />
            {week.guarantee && <Row title="Score guarantee" right="Included" />}
            <MoreLink href="/refunds">Refunds and the guarantee</MoreLink>
          </Card>
        )}
      </Panel>
    </ParentShell>
  );
}
