// ============================================================
// Student Dashboard Home
// Gives students one place to continue lessons and practice.
// ============================================================

import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { loadCalendar } from "@/components/student-portal/calendar/load";
import { joinOpen, whenText } from "@/lib/student/calendar";
import { loadStudentContext } from "@/lib/student/context";
import { dailyTenDays, doneToday } from "@/lib/student/daily-ten";
import { loadStudentHomework } from "@/lib/student/homework";
import { dueText, groupHomework, mostUrgent, sizeText } from "@/lib/student/homework-model";
import { DAILY_10 } from "@/lib/student/quiz-routes";
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
  const [history, attempts, diagnosticResult, skillHistory, homework, calendar, dailyDays] =
    await Promise.all([
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
      dailyTenDays(ctx.clerkId),
    ]);
  const dashboard = buildLearnDashboard(history, attempts, skillHistory);

  // The main button (founder, 2026-11-08): the Daily 10 until it's done for the day, then the
  // next assignment. With neither, pick up where the student left off, or the Library.
  const urgent = homework ? mostUrgent(homework.items, nowMs) : null;
  const main = !doneToday(dailyDays, nowMs)
    ? {
        title: "Your Daily 10",
        meta: "Ten questions picked for you today",
        label: "Start Your Daily 10",
        href: DAILY_10.path,
      }
    : urgent?.href
      ? {
          title: urgent.title,
          meta: [sizeText(urgent.size, homework?.paceSeconds ?? 75), dueText(urgent, nowMs).text]
            .filter(Boolean)
            .join(" · "),
          label: "Start this homework",
          href: urgent.href,
        }
      : dashboard.next
        ? {
            title: dashboard.next.title,
            meta: dashboard.next.detail,
            label: dashboard.next.label,
            href: dashboard.next.href,
          }
        : {
            title: "Daily 10 done",
            meta: "Nice. Pick a skill in the Library if you want more.",
            label: "Open the Library",
            href: "/dashboard/student/library",
          };

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
          join: joinOpen(b.start, b.end, nowMs) ? b.joinUrl : null,
        })),
        ...calendar.events.map((e) => ({
          key: `e:${e.id}`,
          title: e.title,
          sub: e.hostName ? `With ${e.hostName}` : "Live",
          start: e.start,
          join:
            joinOpen(e.start, e.end, nowMs) && (e.saved || e.kind === "office_hours")
              ? e.joinUrl
              : null,
        })),
      ]
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, 2)
        .map((x) => ({ ...x, when: whenText(x.start, nowMs, calendar.timeZone) }))
    : null;

  return (
    <StudentDashboardClient
      dashboard={dashboard}
      main={main}
      diagnostic={diagnosticResult.data}
      showPlacementBanner={showPlacementBanner}
      ctx={ctx}
      due={due}
      comingUp={comingUp}
    />
  );
}
