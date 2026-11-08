// ============================================================
// Student Dashboard Home
// Gives students one place to continue lessons and practice.
// ============================================================

import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { loadCalendar } from "@/components/student-portal/calendar/load";
import { whenText } from "@/lib/student/calendar";
import { loadStudentContext } from "@/lib/student/context";
import { loadStudentHomework } from "@/lib/student/homework";
import { dueText, groupHomework } from "@/lib/student/homework-model";
import StudentDashboardClient from "@/components/dashboard/StudentDashboardClient";
import { fetchLegacyLearningHistory } from "@/lib/supabase/queries/skill-catalog";
import { fetchAllAttemptsForStudent } from "@/lib/supabase/queries/quiz/attempts";
import { buildLearnDashboard } from "@/lib/learn/dashboard";
import { loadOwnCatalogPracticeHistory } from "@/lib/catalog-practice/history-server";

export const metadata: Metadata = { title: "Today" };

export default async function StudentDashboardPage() {
  // No live subscription is the Free plan: the portal opens with honest locks (2026-11-08).
  const ctx = await loadStudentContext();
  const userId = ctx.clerkId;
  const supabase = createAdminClient();
  const sub = ctx.subscription as { status: string; trial_end: string | null } | null;
  // "We're matching you with a tutor" shows while onboarding flagged a placement failure and
  // no cohort or tutor has the student yet (audit #10); it clears itself once they're placed.
  const { data: placement } = await supabase
    .from("users")
    .select("placement_failure_at")
    .eq("id", ctx.userId)
    .maybeSingle();
  const showPlacementBanner =
    !!(placement as { placement_failure_at?: string | null } | null)?.placement_failure_at &&
    !ctx.hasTutor;

  const nowMs = Date.now();
  const [history, attempts, diagnosticResult, skillHistory, homework, calendar] = await Promise.all(
    [
      fetchLegacyLearningHistory(userId),
      fetchAllAttemptsForStudent(userId),
      supabase
        .from("diagnostic_results")
        .select("score_range_low, score_range_high")
        .eq("user_id", ctx.userId)
        .order("taken_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      loadOwnCatalogPracticeHistory(),
      ctx.hasTutor
        ? loadStudentHomework({ userId: ctx.userId, clerkId: ctx.clerkId }, { withResults: false })
        : null,
      ctx.showCalendar ? loadCalendar(ctx, nowMs).catch(() => null) : null,
    ]
  );

  // Today shows the homework that is due soonest and the next two things on the calendar.
  const due = homework
    ? groupHomework(homework.items, nowMs)
        .groups.filter((g) => g.group !== "later")
        .flatMap((g) => g.items)
        .filter((i) => i.state === "open")
        .slice(0, 4)
        .map((i) => {
          const d = dueText(i, nowMs);
          return { key: i.key, title: i.title, href: i.href, due: d.text, late: d.late };
        })
    : null;
  const comingUp = calendar
    ? [
        ...calendar.booked.map((b) => ({
          key: `b:${b.id}`,
          title: b.title,
          sub: b.tutorName ? `With ${b.tutorName}, on Zoom` : "On Zoom",
          start: b.start,
        })),
        ...calendar.events.map((e) => ({
          key: `e:${e.id}`,
          title: e.title,
          sub: e.hostName ? `With ${e.hostName}` : "Live",
          start: e.start,
        })),
      ]
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, 2)
        .map((x) => ({ ...x, when: whenText(x.start, nowMs, calendar.timeZone) }))
    : null;

  return (
    <StudentDashboardClient
      dashboard={buildLearnDashboard(history, attempts, skillHistory)}
      diagnostic={diagnosticResult.data}
      subscription={sub}
      showPlacementBanner={showPlacementBanner}
      ctx={ctx}
      due={due}
      comingUp={comingUp}
    />
  );
}
