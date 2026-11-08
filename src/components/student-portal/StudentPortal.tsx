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
  account: "/dashboard/student/account",
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
  return nav;
}

/** The account menu (founder, 2026-11-07). "Profile" and "Sign out" are added by the shell. */
export const STUDENT_MENU: AccountMenuItem[] = [
  { label: "Test date", icon: "test", href: `${STUDENT_ROUTES.account}#test` },
  { label: "Invite parent", icon: "invite", href: "/dashboard/student/invite-parent" },
  { label: "Sound", icon: "sound", href: `${STUDENT_ROUTES.account}#sound` },
  { label: "Plan", icon: "money", href: `${STUDENT_ROUTES.account}#plan` },
  { label: "Tutor code", icon: "code", href: "/join" },
  { label: "Messages", icon: "messages", href: "/dashboard/student/chat" },
];

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
      menu={STUDENT_MENU}
      home={STUDENT_HOME}
    >
      {children}
    </PortalShell>
  );
}
