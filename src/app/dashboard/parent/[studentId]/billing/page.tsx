// ============================================================
// /dashboard/parent/[studentId]/billing — the family's plan and
// Stripe's customer portal (test mode tonight) for card, invoices
// and cancelling. The portal opens only where there is a Stripe
// customer on a renewing plan; a Cohort seat or a granted plan
// has none, so it gets the billing address instead.
// ============================================================

import type { Metadata } from "next";
import { Card, Cta, MoreLink, Panel, Row, SectionHeader } from "@/components/portal";
import { ParentShell } from "@/components/parent/ParentShell";
import { ActionMessage } from "@/components/school/SchoolShell";
import { isPlaceholderCustomer, mayCreateTestCustomer } from "@/lib/billing-portal/stripe";
import { CONTACT } from "@/lib/marketing/offer";
import { loadChildWeek, requireChild, requireParentContext } from "@/lib/parent/server";
import { PLAN_NAMES } from "@/lib/student/plan-gate";
import { openFamilyBillingAction } from "../../actions";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  active: "Active",
  trialing: "Active",
  past_due: "Payment due",
  canceled: "Canceled",
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
  const planName = plan.id && plan.id !== "free" ? PLAN_NAMES[plan.id] : null;
  const canManage =
    !!plan.customerId && (!isPlaceholderCustomer(plan.customerId) || mayCreateTestCustomer());

  return (
    <ParentShell ctx={ctx} child={child} title="Billing">
      <Panel>
        <ActionMessage done={done} error={error} />
        <section aria-labelledby="billing-main">
          <h2 className="kp-title" id="billing-main">
            {planName
              ? `${child.firstName}'s plan: ${planName}`
              : plan.id
                ? `${child.firstName} is on the free plan`
                : `${child.firstName}'s plan didn't load`}
          </h2>
          {planName && canManage ? (
            <>
              <p className="kp-meta">Change the card, see invoices or cancel.</p>
              <form action={openFamilyBillingAction}>
                <input type="hidden" name="studentId" value={child.id} />
                <Cta type="submit">Manage billing in Stripe</Cta>
              </form>
            </>
          ) : planName ? (
            <p className="kp-meta">
              For a receipt or a billing question, email{" "}
              <a className="kp-link" href={`mailto:${CONTACT.billing}`}>
                {CONTACT.billing}
              </a>
              .
            </p>
          ) : plan.id ? (
            <Cta href="/pricing">See plans</Cta>
          ) : (
            <p className="kp-meta">Refresh the page to try again.</p>
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
