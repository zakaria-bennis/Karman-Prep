/*
 * The student's Settings, opened from the fox's account menu (founder, 2026-11-08: "There are no
 * settings. That needs to be changed."). Plain sections: Test, Sound and motion, Appearance,
 * Account (with Plan and billing), and the tutor code. Each saves on its own, so there is no
 * main button. Students have no notification settings in code yet, so there is no such section.
 */
import type { Metadata } from "next";
import { MoreLink, Panel } from "@/components/portal";
import Appearance from "@/components/portal-extras/Appearance";
import ManageSignIn from "@/components/portal-extras/ManageSignIn";
import StudentPortal from "@/components/student-portal/StudentPortal";
import PlanBilling from "@/components/student-portal/settings/PlanBilling";
import PlanSummary from "@/components/student-portal/settings/PlanSummary";
import SettingsCard from "@/components/student-portal/settings/SettingsCard";
import SoundMotion from "@/components/student-portal/settings/SoundMotion";
import TestForm from "@/components/student-portal/settings/TestForm";
import TutorCode from "@/components/student-portal/settings/TutorCode";
import { shortTest } from "@/components/student-portal/settings/test-dates";
import s from "@/components/student-portal/settings/settings.module.css";
import { loadStudentContext } from "@/lib/student/context";
import { dayKey } from "@/lib/student/streak";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const PREVIEW = "You're previewing this student, so changes are off.";

export default async function StudentSettingsPage() {
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
    <StudentPortal ctx={ctx} title="Settings">
      <Panel
        label="Settings"
        side={
          <>
            <SettingsCard id="account" title="Account">
              <div className={s.fact}>
                <b>Name</b>
                <span>{ctx.firstName ?? "Not set"}</span>
              </div>
              <div className={s.fact}>
                <b>Email</b>
                <span>{ctx.email ?? "Not set"}</span>
              </div>
              <ManageSignIn locked={ctx.isImpersonating} />
            </SettingsCard>
            <SettingsCard id="plan" title="Plan and billing" note={ctx.plan.name}>
              <p className="kp-meta">
                <PlanSummary planId={ctx.plan.id} />
              </p>
              {ctx.isImpersonating ? (
                <p className="kp-meta">Billing opens only in the student&rsquo;s own account.</p>
              ) : hasBilling ? (
                <PlanBilling />
              ) : ctx.plan.id === "free" ? (
                <MoreLink href="/pricing">See the plans</MoreLink>
              ) : (
                <p className="kp-meta">
                  Your school or tutor pays for this plan, so there&rsquo;s no bill to manage here.
                </p>
              )}
            </SettingsCard>
            <TutorCode clerkId={ctx.clerkId} locked={ctx.isImpersonating} />
          </>
        }
      >
        <SettingsCard id="test" title="Test" note={shortTest(ctx.testType, ctx.testDate)}>
          <TestForm
            initialType={ctx.testType}
            initialDate={ctx.testDate}
            satDates={satDates}
            today={today}
            locked={locked}
          />
        </SettingsCard>
        <SettingsCard id="sound" title="Sound and motion">
          <SoundMotion />
        </SettingsCard>
        <SettingsCard id="appearance" title="Appearance">
          <Appearance />
        </SettingsCard>
      </Panel>
    </StudentPortal>
  );
}
