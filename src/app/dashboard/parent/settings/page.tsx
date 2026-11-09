/*
 * The parent's Settings, opened from the fox's account menu. It matches the student's: Sound and
 * motion, Appearance, Account, and billing for each linked student. The weekly email has its own
 * page (in the menu); there are no other notification settings in code, so there is no such
 * section.
 */
import type { Metadata } from "next";
import { Panel, PortalShell, Row } from "@/components/portal";
import { PARENT_SETTINGS, parentNav } from "@/components/parent/ParentShell";
import Appearance from "@/components/portal-extras/Appearance";
import ManageSignIn from "@/components/portal-extras/ManageSignIn";
import SettingsCard from "@/components/student-portal/settings/SettingsCard";
import SoundMotion from "@/components/student-portal/settings/SoundMotion";
import s from "@/components/student-portal/settings/settings.module.css";
import { requireParentContext } from "@/lib/parent/server";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function ParentSettingsPage() {
  const ctx = await requireParentContext();
  const first = ctx.children[0];

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
