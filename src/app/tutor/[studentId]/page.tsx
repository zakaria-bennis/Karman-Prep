// ============================================================
// /tutor/[studentId] — Student detail with 4 tabs:
//   Skills Overview · Tutor Controls · Flagged · Quiz History
// ============================================================

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import {
  fetchStudentById,
  fetchNodeStatuses,
} from "@/lib/supabase/queries/tutor";
import {
  fetchAllAttemptsForStudent,
  fetchFlaggedQuestionsForStudent,
  fetchResponsesForAttempt,
} from "@/lib/supabase/queries/quiz";
import { RW_NODES, MATH_NODES, currentAtmosphere, ATMOSPHERE_COLORS } from "@/data/curriculum";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentDetailTabs from "@/components/tutor/StudentDetailTabs";

export const metadata: Metadata = { title: "Student — Tutor Portal" };

interface Params {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function StudentDetailPage({ params, searchParams }: Params) {
  const [{ studentId }, { tab: tabParam }] = await Promise.all([params, searchParams]);

  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const role = await fetchUserRole(userId);
  if (role !== "tutor" && role !== "admin") redirect("/dashboard/student");

  const student = await fetchStudentById(studentId);
  if (!student) notFound();

  const [statuses, attempts, flagged] = await Promise.all([
    fetchNodeStatuses(studentId),
    fetchAllAttemptsForStudent(studentId),
    fetchFlaggedQuestionsForStudent(studentId),
  ]);

  // Preload per-attempt responses (expandable in Quiz History tab) — first 20 only for perf
  const responsesByAttempt: Record<string, Awaited<ReturnType<typeof fetchResponsesForAttempt>>> = {};
  for (const a of attempts.slice(0, 20)) {
    responsesByAttempt[a.id] = await fetchResponsesForAttempt(a.id);
  }

  // Summary stats
  const statusMap = new Map(statuses.map((s) => [s.node_id, s]));
  const readingMastered = RW_NODES.filter((n) => statusMap.get(n.id)?.status === "mastered").length;
  const mathMastered    = MATH_NODES.filter((n) => statusMap.get(n.id)?.status === "mastered").length;
  const tiersDone =
    (RW_NODES.filter((n) => n.tier === 1).every((n) => statusMap.get(n.id)?.status === "mastered") &&
     MATH_NODES.filter((n) => n.tier === 1).every((n) => statusMap.get(n.id)?.status === "mastered") ? 1 : 0) +
    (RW_NODES.filter((n) => n.tier === 2).every((n) => statusMap.get(n.id)?.status === "mastered") &&
     MATH_NODES.filter((n) => n.tier === 2).every((n) => statusMap.get(n.id)?.status === "mastered") ? 1 : 0) +
    (RW_NODES.filter((n) => n.tier === 3).every((n) => statusMap.get(n.id)?.status === "mastered") &&
     MATH_NODES.filter((n) => n.tier === 3).every((n) => statusMap.get(n.id)?.status === "mastered") ? 1 : 0);
  const atmo = currentAtmosphere(tiersDone);
  const atmoColor = ATMOSPHERE_COLORS[atmo].hex;

  const completedAttempts = attempts.filter((a) => a.score !== null);
  const avgScore = completedAttempts.length
    ? Math.round(completedAttempts.reduce((s, a) => s + (a.score ?? 0), 0) / completedAttempts.length)
    : null;
  const lastActive = statuses
    .map((s) => s.updated_at)
    .sort()
    .reverse()[0] ?? null;

  const activeTab = (tabParam ?? "skills") as "skills" | "controls" | "flagged" | "quiz";

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link
          href="/tutor"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All students
        </Link>

        {/* Summary bar */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{student.email}</h1>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ color: atmoColor, background: atmoColor + "20", border: `1px solid ${atmoColor}40` }}
                >
                  {atmo}
                </span>
                {lastActive && (
                  <span className="text-xs text-slate-500">
                    Last active: {new Date(lastActive).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            {avgScore !== null && (
              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase tracking-wide font-bold">Avg quiz score</div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{avgScore}%</div>
              </div>
            )}
          </div>

          {/* Progress bars */}
          <div className="mt-5 grid sm:grid-cols-2 gap-5">
            <ProgressBar label="Reading & Writing" mastered={readingMastered} total={50} color="#FB7185" />
            <ProgressBar label="Math" mastered={mathMastered} total={50} color="#818CF8" />
          </div>
        </div>

        <StudentDetailTabs
          studentId={studentId}
          statuses={statuses}
          attempts={attempts}
          flagged={flagged}
          responsesByAttempt={responsesByAttempt}
          activeTab={activeTab}
        />
      </div>
    </DashboardLayout>
  );
}

function ProgressBar({ label, mastered, total, color }: { label: string; mastered: number; total: number; color: string }) {
  const pct = Math.round((mastered / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-semibold text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-slate-500 tabular-nums">{mastered} / {total} · {pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
