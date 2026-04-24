// ============================================================
// /dashboard/parent/[studentId] — parent's read-only view of a
// linked student: profile, cohort, diagnostic, upcoming homework.
//
// Security: the parent must have a row in parent_student_links
// for this student. Admins bypass this check (so they can debug
// every parent's view).
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ChevronLeft, Calendar, Users as UsersIcon, BookOpen } from "lucide-react";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Student — Parent Portal | Strata" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ studentId: string }>;
}

interface StudentRow {
  id: string;
  first_name: string | null;
  last_name:  string | null;
  email:      string;
  avatar_url: string | null;
  sat_test_date: string | null;
  clerk_id: string;
}

interface CohortInfo {
  id: string;
  name: string;
  tier: "group" | "small_group";
  sat_date: string;
  current_topic: string | null;
  status: "forming" | "active" | "completed";
}

interface HomeworkItem {
  id: string;
  title: string;
  body: string | null;
  assigned_at: string;
  due_at: string | null;
}

interface DiagnosticRow {
  taken_at: string;
  score_range_low:  number;
  score_range_high: number;
  domain_scores: Record<string, number> | null;
}

async function loadStudentData(studentUuid: string) {
  const supabase = createAdminClient();

  const [student, memberRows, diagRows] = await Promise.all([
    supabase
      .from("users")
      .select("id, first_name, last_name, email, avatar_url, sat_test_date, clerk_id")
      .eq("id", studentUuid)
      .maybeSingle(),
    supabase
      .from("cohort_members")
      .select(`
        cohort_id,
        cohort:cohorts!cohort_members_cohort_id_fkey (id, name, tier, sat_date, current_topic, status)
      `)
      .eq("user_id", studentUuid)
      .is("left_at", null)
      .limit(1),
    supabase
      .from("diagnostic_results")
      .select("taken_at, score_range_low, score_range_high, domain_scores")
      .eq("user_id", studentUuid)
      .order("taken_at", { ascending: false })
      .limit(1),
  ]);

  const studentRow = (student.data as StudentRow | null) ?? null;
  if (!studentRow) return { student: null, cohort: null, diagnostic: null, homework: [] as HomeworkItem[] };

  type MemberRow = {
    cohort_id: string;
    cohort: CohortInfo | CohortInfo[] | null;
  };
  const mRow = ((memberRows.data ?? []) as MemberRow[])[0] ?? null;
  const cohortJoined = mRow ? (Array.isArray(mRow.cohort) ? mRow.cohort[0] : mRow.cohort) : null;

  // Upcoming + recent homework (if they're in a cohort)
  let homework: HomeworkItem[] = [];
  if (cohortJoined) {
    const { data: hw } = await supabase
      .from("cohort_homework")
      .select("id, title, body, assigned_at, due_at")
      .eq("cohort_id", cohortJoined.id)
      .order("assigned_at", { ascending: false })
      .limit(5);
    homework = (hw ?? []) as HomeworkItem[];
  }

  const diag = ((diagRows.data ?? []) as DiagnosticRow[])[0] ?? null;

  return { student: studentRow, cohort: cohortJoined, diagnostic: diag, homework };
}

async function assertParentCanSeeStudent(parentClerkId: string, studentUuid: string): Promise<boolean> {
  const role = await fetchUserRole(parentClerkId);
  if (role === "admin") return true;   // admins can open anyone's view

  const supabase = createAdminClient();
  const { data: parent } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", parentClerkId)
    .maybeSingle();
  if (!parent) return false;

  const { data: link } = await supabase
    .from("parent_student_links")
    .select("student_user_id")
    .eq("parent_user_id",  (parent as { id: string }).id)
    .eq("student_user_id", studentUuid)
    .maybeSingle();

  return Boolean(link);
}

export default async function ParentStudentDetailPage({ params }: PageProps) {
  const { studentId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const allowed = await assertParentCanSeeStudent(userId, studentId);
  if (!allowed) notFound();

  const { student, cohort, diagnostic, homework } = await loadStudentData(studentId);
  if (!student) notFound();

  const fullName = [student.first_name, student.last_name].filter(Boolean).join(" ") || student.email;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-5 py-10">
        <Link
          href="/dashboard/parent"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          All students
        </Link>

        {/* Student header */}
        <header className="mb-8 flex items-center gap-4">
          <Avatar name={fullName} avatarUrl={student.avatar_url} size="lg" />
          <div>
            <h1 className="text-2xl font-extrabold text-white">{fullName}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {student.sat_test_date
                ? <>Target SAT — {formatDate(student.sat_test_date)}</>
                : "Target SAT date not set"}
            </p>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Cohort */}
          <Card icon={UsersIcon} title="Cohort">
            {cohort ? (
              <div className="space-y-2">
                <div className="text-white font-semibold">{cohort.name}</div>
                <div className="text-xs text-slate-400">
                  {cohort.tier === "small_group" ? "Small Group" : "Seminar"} · {cohort.status}
                </div>
                {cohort.current_topic && (
                  <div className="text-sm text-slate-300 pt-2 border-t border-slate-800">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Current topic</span>
                    {cohort.current_topic}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">Not in a cohort (private 1:1 tier).</p>
            )}
          </Card>

          {/* Diagnostic */}
          <Card icon={Calendar} title="Most recent diagnostic">
            {diagnostic ? (
              <div className="space-y-2">
                <div className="text-2xl font-extrabold text-white font-mono">
                  {diagnostic.score_range_low}–{diagnostic.score_range_high}
                </div>
                <div className="text-xs text-slate-500">
                  Taken {formatDate(diagnostic.taken_at.slice(0, 10))}
                </div>
                {diagnostic.domain_scores && (
                  <div className="pt-3 border-t border-slate-800 space-y-1.5">
                    {Object.entries(diagnostic.domain_scores).map(([domain, pct]) => (
                      <DomainBar key={domain} domain={domain} percentage={pct} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No diagnostic taken yet.</p>
            )}
          </Card>
        </div>

        {/* Homework */}
        {cohort && (
          <section className="mt-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-slate-400" />
              Recent assignments
            </h2>
            {homework.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-800 px-6 py-8 text-sm text-slate-500 text-center">
                No assignments posted yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {homework.map((h) => (
                  <li key={h.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3 className="text-white font-semibold">{h.title}</h3>
                      {h.due_at && (
                        <span className="text-xs text-slate-400 shrink-0">
                          Due {formatDate(h.due_at.slice(0, 10))}
                        </span>
                      )}
                    </div>
                    {h.body && (
                      <p className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed">
                        {h.body}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <p className="mt-10 text-xs text-slate-600 max-w-md">
          You&apos;re viewing a read-only summary. Detailed progress (per-concept mastery,
          chat transcripts) is deliberately not shared — your student can still have a
          private workspace.
        </p>
      </div>
    </div>
  );
}

// ─── Presentation helpers ─────────────────────────────────

function Card({
  icon: Icon, title, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      {children}
    </div>
  );
}

function DomainBar({ domain, percentage }: { domain: string; percentage: number }) {
  const label = domain.replace(/_/g, " ");
  const pct = Math.max(0, Math.min(100, percentage));
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-0.5">
        <span className="capitalize">{label}</span>
        <span className="font-mono text-slate-500">{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Avatar({
  name, avatarUrl, size = "md",
}: {
  name: string;
  avatarUrl: string | null;
  size?: "md" | "lg";
}) {
  const cls = size === "lg" ? "w-14 h-14 text-base" : "w-10 h-10 text-sm";
  if (avatarUrl) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={avatarUrl} alt={name} className={`${cls} rounded-full object-cover border border-slate-700`} />;
  }
  const initials = name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <div
      aria-hidden="true"
      className={`${cls} rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-bold flex items-center justify-center`}
    >
      {initials || "?"}
    </div>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
