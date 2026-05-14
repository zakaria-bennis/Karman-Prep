// ============================================================
// /dashboard/parent — parent's landing page.
// Shows each student linked to this parent with a short status
// card. Full per-student detail comes in a later session.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Users as UsersIcon } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Parent Portal — Karman" };
export const dynamic = "force-dynamic";

interface LinkedStudent {
  id: string;
  first_name: string | null;
  last_name:  string | null;
  email:      string;
  avatar_url: string | null;
  sat_test_date: string | null;
}

async function fetchLinkedStudents(parentClerkId: string): Promise<LinkedStudent[]> {
  const supabase = createAdminClient();
  const { data: parent } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", parentClerkId)
    .maybeSingle();
  if (!parent) return [];

  const { data, error } = await supabase
    .from("parent_student_links")
    .select(`
      student:users!parent_student_links_student_user_id_fkey
        (id, first_name, last_name, email, avatar_url, sat_test_date)
    `)
    .eq("parent_user_id", parent.id);
  if (error) throw error;

  type Row = { student: LinkedStudent | LinkedStudent[] | null };
  return ((data ?? []) as Row[])
    .flatMap((r) => {
      const s = Array.isArray(r.student) ? r.student[0] : r.student;
      return s ? [s] : [];
    });
}

export default async function ParentDashboardPage() {
  const { userId } = await auth();
  if (!userId) return null; // layout already redirects

  const students = await fetchLinkedStudents(userId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-5 py-10">
        <header className="mb-8">
          <p className="text-xs font-bold tracking-widest text-blue-400 uppercase mb-1">Parent Portal</p>
          <h1 className="text-2xl font-extrabold text-white">Your students</h1>
          <p className="text-sm text-slate-400 mt-1">
            You can see progress for the student(s) linked to your account.
            {" "}If someone is missing, ask a Karman admin to add the link.
          </p>
        </header>

        {students.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 px-8 py-12 text-center">
            <UsersIcon className="w-8 h-8 mx-auto text-slate-600 mb-3" />
            <h2 className="text-base font-semibold text-white">No students linked yet</h2>
            <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
              A Karman admin will link your account to your student(s) shortly.
              Check back soon, or reach out to support if it&apos;s been more than a day.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {students.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/dashboard/parent/${s.id}`}
                  className="block rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:bg-slate-900/70 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={`${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.email} avatarUrl={s.avatar_url} />
                    <div className="flex-1">
                      <div className="text-white font-semibold">
                        {[s.first_name, s.last_name].filter(Boolean).join(" ") || s.email}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {s.sat_test_date ? `Target SAT · ${formatDate(s.sat_test_date)}` : "Target SAT date not set"}
                      </div>
                    </div>
                    <span className="text-slate-600 text-sm">View →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 text-xs text-slate-600 max-w-md">
          Per-student detail view (progress, cohort, recent activity) is coming shortly.
          This landing page is the access point — your linked students will appear above.
        </p>
      </div>
    </div>
  );
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={avatarUrl} alt={name} className="w-10 h-10 rounded-full object-cover border border-slate-700" />;
  }
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-sm font-bold flex items-center justify-center"
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
