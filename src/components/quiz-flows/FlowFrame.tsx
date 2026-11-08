"use client";
// The painted portal shell around every quiz-flow screen that is not the question screen itself.
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, Cta, Panel, PortalShell } from "@/components/portal";
import { STUDENT_MENU, STUDENT_NAV } from "@/components/dashboard/StudentDashboardClient";
import type { ShellUser } from "./types";
import s from "./flows.module.css";

export function FlowFrame({
  user,
  title,
  children,
  side,
}: {
  user: ShellUser;
  title?: string;
  children: ReactNode;
  side?: ReactNode;
}) {
  return (
    <PortalShell
      portal="Student"
      nav={STUDENT_NAV}
      name={user.name}
      accountDetail={user.email}
      menu={STUDENT_MENU}
      home="/dashboard/student"
      title={title ?? " "}
      streak={user.streak ? { days: user.streak, href: "/learn/daily-ten" } : undefined}
    >
      <Panel side={side}>{children}</Panel>
    </PortalShell>
  );
}

type Action = { href: string; label: string } | { onClick: () => void; label: string };

/** A short state screen: loading, an error, a break between sections, a plan limit. */
export function Message({
  title,
  text,
  action,
  back,
  busy = false,
}: {
  title: string;
  text: string;
  action?: Action;
  back?: { href: string; label: string };
  busy?: boolean;
}) {
  return (
    <Card>
      <section className={s.message} aria-busy={busy} aria-live="polite">
        <h2 className="kp-title">{title}</h2>
        <p className="kp-meta">{text}</p>
        {(action || back) && (
          <div className={s.actions}>
            {action &&
              ("href" in action ? (
                <Cta href={action.href}>{action.label}</Cta>
              ) : (
                <Cta onClick={action.onClick}>{action.label}</Cta>
              ))}
            {back && (
              <Link className="kp-link" href={back.href}>
                {back.label}
              </Link>
            )}
          </div>
        )}
      </section>
    </Card>
  );
}
