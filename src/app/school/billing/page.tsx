/*
 * School billing: "Free until <date>, then $8 per student a year". The admin sets up the
 * renewal in Stripe (test mode tonight); nothing is charged before the free year ends.
 */
import type { Metadata } from "next";
import { Card, Cta, Num, Panel, Row, SectionHeader } from "@/components/portal";
import { FreeYearRow } from "@/components/school/FreeYear";
import { ActionMessage, SchoolShell } from "@/components/school/SchoolShell";
import { requireSchoolContext } from "@/lib/school/access";
import { schoolStudentCount } from "@/lib/school/roster";
import { formatLongDate, SCHOOL_TERMS, yearlyCost } from "@/lib/school/terms";
import { confirmRenewal, openSchoolBillingAction, startRenewalAction } from "../actions";

export const metadata: Metadata = { title: "School billing" };
export const dynamic = "force-dynamic";

export default async function SchoolBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string; renewal?: string }>;
}) {
  let ctx = await requireSchoolContext();
  const { done, error, renewal } = await searchParams;
  let renewalMessage: string | undefined;
  if (renewal && ctx.school.billingStatus === "free_year") {
    const recorded = await confirmRenewal(renewal).catch((e: unknown) => {
      console.error("[school] renewal confirm failed", e);
      return false;
    });
    if (recorded) {
      renewalMessage = "Renewal is set. Nothing is charged until your free year ends.";
      ctx = await requireSchoolContext();
    }
  }
  const students = await schoolStudentCount(ctx.school.id);
  const freeUntil = formatLongDate(ctx.school.freeUntil);
  const renewalSet = ctx.school.billingStatus !== "free_year";
  const isAdmin = ctx.role === "admin";

  return (
    <SchoolShell ctx={ctx} title="Billing">
      <Panel>
        <ActionMessage done={renewalMessage ?? done} error={error} />
        <section aria-labelledby="plan-status">
          <h2 className="kp-title" id="plan-status">
            Free until {freeUntil}
          </h2>
          <p className="kp-meta">
            Then ${SCHOOL_TERMS.pricePerStudentPerYear} per student a year. Every student gets a
            Practice plan of their own.
          </p>
          <FreeYearRow freeUntil={ctx.school.freeUntil} sub={null} />
          {isAdmin ? (
            <form action={renewalSet ? openSchoolBillingAction : startRenewalAction}>
              <Cta type="submit">{renewalSet ? "Manage billing in Stripe" : "Set up renewal"}</Cta>
            </form>
          ) : (
            <p className="kp-meta">Your school admin manages billing.</p>
          )}
        </section>
        <Card>
          <SectionHeader title="Your first paid year" />
          <Row title="Students with a seat today" right={<Num>{students}</Num>} />
          <Row
            title="Price per student"
            right={<Num>${SCHOOL_TERMS.pricePerStudentPerYear} a year</Num>}
          />
          <Row title="At today's size" right={<Num>${yearlyCost(students)} a year</Num>} />
          <p className="kp-meta">
            {renewalSet
              ? `Renewal is set up. The first charge is on ${freeUntil}.`
              : `Nothing is charged before ${freeUntil}.`}
          </p>
        </Card>
      </Panel>
    </SchoolShell>
  );
}
