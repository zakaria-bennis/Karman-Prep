/*
 * The student's account page: what the fox's account menu opens (founder, 2026-11-07).
 * Their test and date, a parent invite, sound and motion, plan and billing, and a tutor's code.
 * Signing out stays in the menu itself. No main button here: each card saves on its own.
 */
import type { Metadata } from "next";
import { MoreLink, Panel } from "@/components/portal";
import StudentPortal from "@/components/student-portal/StudentPortal";
import AccountCard from "@/components/student-portal/account/AccountCard";
import ParentInviteForm from "@/components/student-portal/account/ParentInviteForm";
import PlanBilling from "@/components/student-portal/account/PlanBilling";
import PlanSummary from "@/components/student-portal/account/PlanSummary";
import SoundMotion from "@/components/student-portal/account/SoundMotion";
import TestForm from "@/components/student-portal/account/TestForm";
import TutorCodeForm from "@/components/student-portal/account/TutorCodeForm";
import { shortTest } from "@/components/student-portal/account/test-dates";
import { currentTutor } from "@/components/student-portal/account/tutor-code";
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
  const [{ data: satRows }, { data: me }, tutor] = await Promise.all([
    db
      .from("sat_dates")
      .select("test_date")
      .gte("test_date", today)
      .order("test_date", { ascending: true })
      .limit(12),
    db.from("users").select("parent_email_collected").eq("id", ctx.userId).maybeSingle(),
    currentTutor(ctx.userId),
  ]);
  const satDates = ((satRows ?? []) as { test_date: string }[]).map((r) => r.test_date);
  const parentEmail =
    (me as { parent_email_collected?: string | null } | null)?.parent_email_collected ?? null;
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
            <AccountCard
              id="code"
              title={"Redeem a tutor’s code"}
              note={tutor ? `In ${tutor}’s group` : undefined}
            >
              <TutorCodeForm locked={locked} />
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
          <ParentInviteForm savedEmail={parentEmail} locked={locked} />
        </AccountCard>
        <AccountCard id="sound" title="Sound and motion">
          <SoundMotion />
        </AccountCard>
      </Panel>
    </StudentPortal>
  );
}
