/*
 * The student's account page: what the fox's account menu opens (founder, 2026-11-07).
 * Their test and date, sound and motion, plan and billing, and the ways to invite a parent and
 * add a tutor's code (those two have their own pages: /dashboard/student/invite-parent, /join).
 * Signing out stays in the menu itself. No main button here: each card saves on its own.
 */
import type { Metadata } from "next";
import { MoreLink, Panel } from "@/components/portal";
import StudentPortal from "@/components/student-portal/StudentPortal";
import AccountCard from "@/components/student-portal/account/AccountCard";
import PlanBilling from "@/components/student-portal/account/PlanBilling";
import PlanSummary from "@/components/student-portal/account/PlanSummary";
import SoundMotion from "@/components/student-portal/account/SoundMotion";
import TestForm from "@/components/student-portal/account/TestForm";
import { shortTest } from "@/components/student-portal/account/test-dates";
import { loadStudentContext } from "@/lib/student/context";
import { dayKey } from "@/lib/student/streak";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

const PREVIEW = "You're previewing this student, so changes are off.";

export default async function StudentAccountPage() {
  const ctx = await loadStudentContext();
  const db = createAdminClient();
  const today = dayKey(Date.now());
  const { data: satRows } = await db
    .from("sat_dates")
    .select("test_date")
    .gte("test_date", today)
    .order("test_date", { ascending: true })
    .limit(12);
  const satDates = ((satRows ?? []) as { test_date: string }[]).map((r) => r.test_date);
  const locked = ctx.isImpersonating ? PREVIEW : null;
  const customer = ctx.subscription?.stripe_customer_id;
  const hasBilling = typeof customer === "string" && customer.length > 0;

  return (
    <StudentPortal ctx={ctx} title="Account">
      <Panel
        label="Account"
        side={
          <>
            <AccountCard id="plan" title="Plan and billing" note={ctx.plan.name}>
              <p className="kp-meta">
                <PlanSummary planId={ctx.plan.id} />
              </p>
              {ctx.isImpersonating ? (
                <p className="kp-meta">Billing opens only in the student&rsquo;s own account.</p>
              ) : hasBilling ? (
                <PlanBilling />
              ) : ctx.plan.id === "free" ? (
                <>
                  <p className="kp-meta">You&rsquo;re on the Free plan.</p>
                  <MoreLink href="/pricing">See the plans</MoreLink>
                </>
              ) : (
                <p className="kp-meta">
                  Your school or tutor pays for this plan, so there&rsquo;s no bill to manage here.
                </p>
              )}
            </AccountCard>
            <AccountCard id="code" title={"A tutor’s code"}>
              <p className="kp-meta">
                Joining a tutor&rsquo;s group gives you the Practice plan while their plan is on.
              </p>
              <MoreLink href="/join">Add your tutor&rsquo;s code</MoreLink>
            </AccountCard>
          </>
        }
      >
        <AccountCard id="test" title="Your test" note={shortTest(ctx.testType, ctx.testDate)}>
          <TestForm
            initialType={ctx.testType}
            initialDate={ctx.testDate}
            satDates={satDates}
            today={today}
            locked={locked}
          />
        </AccountCard>
        <AccountCard id="parent" title="Invite a parent">
          <p className="kp-meta">Make a link or a short code, and send it to your parent.</p>
          <MoreLink href="/dashboard/student/invite-parent">Invite a parent</MoreLink>
        </AccountCard>
        <AccountCard id="sound" title="Sound and motion">
          <SoundMotion />
        </AccountCard>
      </Panel>
    </StudentPortal>
  );
}
