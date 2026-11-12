/*
 * The parent's Settings, opened from the fox's account menu. It matches the student's: Sound and
 * motion, Appearance, Account, and billing for each linked student, plus when the daily email
 * arrives and which instant alerts to get (founder, 2026-11-12).
 */
import type { Metadata } from "next";
import { Panel, PortalShell, Row } from "@/components/portal";
import { DailyEmailSetting } from "@/components/parent/DailyEmailSetting";
import { PARENT_SETTINGS, parentNav } from "@/components/parent/ParentShell";
import { ActionMessage } from "@/components/school/SchoolShell";
import Appearance from "@/components/portal-extras/Appearance";
import ManageSignIn from "@/components/portal-extras/ManageSignIn";
import SettingsCard from "@/components/student-portal/settings/SettingsCard";
import SoundMotion from "@/components/student-portal/settings/SoundMotion";
import s from "@/components/student-portal/settings/settings.module.css";
import "@/components/portal-extras/forms.css";
import { safeTimeZone } from "@/lib/daily-ten/day";
import { parentTimeZone } from "@/lib/parent/daily-report";
import { readDailyEmailChoice } from "@/lib/parent/daily-email-settings";
import { readAlertPrefs } from "@/lib/parent/messages";
import { requireParentContext } from "@/lib/parent/server";
import { untypedAdmin } from "@/lib/school/db";
import { saveAlertsAction } from "../actions";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function ParentSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const ctx = await requireParentContext();
  const first = ctx.children[0];
  const [{ done, error }, choice, zone, alerts] = await Promise.all([
    searchParams,
    readDailyEmailChoice(ctx.viewer.userId),
    parentTimeZone(untypedAdmin(), ctx.viewer.userId),
    readAlertPrefs(ctx.viewer.userId),
  ]);
  const alertsLive = process.env.PARENT_ALERTS === "on";

  return (
    <PortalShell
      portal="Parent"
      nav={
        first ? parentNav(first) : [{ href: "/dashboard/parent", label: "Students", icon: "child" }]
      }
      title="Settings"
      name={ctx.viewer.firstName}
      accountDetail={ctx.viewer.email}
      home={first ? `/dashboard/parent/${first.id}` : "/dashboard/parent"}
      settingsHref={PARENT_SETTINGS}
    >
      <Panel
        label="Settings"
        side={
          <>
            <SettingsCard id="account" title="Account">
              <div className={s.fact}>
                <b>Name</b>
                <span>{ctx.viewer.firstName ?? "Not set"}</span>
              </div>
              <div className={s.fact}>
                <b>Email</b>
                <span>{ctx.viewer.email ?? "Not set"}</span>
              </div>
              <ManageSignIn />
            </SettingsCard>
            <SettingsCard id="billing" title="Plan and billing">
              {ctx.children.length ? (
                ctx.children.map((c) => (
                  <Row
                    key={c.id}
                    title={c.name}
                    href={`/dashboard/parent/${c.id}/billing`}
                    right="Billing"
                  />
                ))
              ) : (
                <p className="kp-meta">Link your student first. Their plan shows here.</p>
              )}
            </SettingsCard>
          </>
        }
      >
        <ActionMessage done={done} error={error} />
        <SettingsCard id="daily-email" title="Daily email">
          <DailyEmailSetting choice={choice} timeZone={safeTimeZone(zone)} />
        </SettingsCard>
        <SettingsCard id="alerts" title="Instant alerts">
          <form action={saveAlertsAction} className="kp-form">
            <label className="kp-check">
              <input type="checkbox" name="lateHomework" defaultChecked={alerts.lateHomework} />
              <span>Homework is late</span>
            </label>
            <label className="kp-check">
              <input type="checkbox" name="missedSession" defaultChecked={alerts.missedSession} />
              <span>A session was missed</span>
            </label>
            <button className="kp-textbtn" type="submit">
              Save alerts
            </button>
            <p className="kp-meta">
              {alertsLive
                ? "Alerts arrive by email as soon as it happens, once each."
                : "Alerts aren't switched on yet. Your choices are saved for when they are."}
            </p>
          </form>
        </SettingsCard>
        <SettingsCard id="sound" title="Sound and motion">
          <SoundMotion quizSounds={false} />
        </SettingsCard>
        <SettingsCard id="appearance" title="Appearance">
          <Appearance />
        </SettingsCard>
      </Panel>
    </PortalShell>
  );
}
