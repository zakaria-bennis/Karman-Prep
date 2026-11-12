/*
 * The student portal's frame: the painted shell with the student's tabs, streak and account
 * menu. Every student page renders inside it. Tabs show only when the plan uses them
 * (founder, 2026-11-07): Homework when a tutor or cohort can assign work, Calendar when the
 * student can book or join something.
 */
import type { ReactNode } from "react";
import { PortalShell, type AccountMenuItem, type PortalNavItem } from "@/components/portal";
import type { StudentContext } from "@/lib/student/context";

export const STUDENT_HOME = "/dashboard/student";
export const STUDENT_ROUTES = {
  today: "/dashboard/student",
  homework: "/dashboard/student/homework",
  library: "/dashboard/student/library",
  calendar: "/dashboard/student/schedule",
  progress: "/dashboard/student/progress",
  rewards: "/dashboard/student/rewards",
  settings: "/dashboard/student/settings",
} as const;

export function studentNav(
  ctx: Pick<StudentContext, "hasTutor" | "homeworkOpen" | "showCalendar">
): PortalNavItem[] {
  const nav: PortalNavItem[] = [{ href: STUDENT_ROUTES.today, label: "Today", icon: "today" }];
  if (ctx.hasTutor) {
    nav.push({
      href: STUDENT_ROUTES.homework,
      label: "Homework",
      icon: "homework",
      badge: ctx.homeworkOpen || undefined,
    });
  }
  nav.push({ href: STUDENT_ROUTES.library, label: "Library", icon: "library" });
  if (ctx.showCalendar) {
    nav.push({ href: STUDENT_ROUTES.calendar, label: "Calendar", icon: "calendar" });
  }
  nav.push({ href: STUDENT_ROUTES.progress, label: "Progress", icon: "progress" });
  if (nav.length < 5) nav.push({ href: STUDENT_ROUTES.rewards, label: "Rewards", icon: "rewards" });
  return nav;
}

/**
 * The account menu under the fox (founder, 2026-11-08: fewer items, each with an obvious point).
 * The shell puts Settings first and Sign out last. Messages shows only when there is a group
 * chat to open.
 */
export function studentMenu(ctx: Pick<StudentContext, "hasChat">): AccountMenuItem[] {
  const menu: AccountMenuItem[] = [
    { label: "Plan and billing", icon: "money", href: `${STUDENT_ROUTES.settings}#plan` },
    { label: "Invite a parent", icon: "invite", href: "/dashboard/student/invite-parent" },
  ];
  if (ctx.hasChat)
    menu.push({ label: "Messages", icon: "messages", href: "/dashboard/student/chat" });
  return menu;
}

export default function StudentPortal({
  ctx,
  title,
  children,
}: {
  ctx: StudentContext;
  /** The page heading. Leave it out on Today for the rotating greeting. */
  title?: string;
  children: ReactNode;
}) {
  return (
    <PortalShell
      portal="Student"
      nav={studentNav(ctx)}
      title={title}
      name={ctx.firstName}
      accountDetail={ctx.email}
      satDate={ctx.testDate}
      streak={{ days: ctx.streak.current, href: `${STUDENT_ROUTES.progress}#streak` }}
      menu={studentMenu(ctx)}
      settingsHref={STUDENT_ROUTES.settings}
      home={STUDENT_HOME}
    >
      {children}
    </PortalShell>
  );
}
