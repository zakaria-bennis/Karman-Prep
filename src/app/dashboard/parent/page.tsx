// ============================================================
// /dashboard/parent — parent's landing page.
// Shows each student linked to this parent with a short status
// card. Full per-student detail comes in a later session.
// ============================================================

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { safeAuth } from "@/lib/auth/dev-auth";
import { Users as UsersIcon } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Parent Portal — Karman" };
export const dynamic = "force-dynamic";

interface LinkedStudent {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
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
    .select(
      `
      student:users!parent_student_links_student_user_id_fkey
        (id, first_name, last_name, email, avatar_url, sat_test_date)
    `
    )
    .eq("parent_user_id", parent.id);
  if (error) throw error;

  type Row = { student: LinkedStudent | LinkedStudent[] | null };
  return ((data ?? []) as Row[]).flatMap((r) => {
    const s = Array.isArray(r.student) ? r.student[0] : r.student;
    return s ? [s] : [];
  });
}

export default async function ParentDashboardPage() {
  const { userId } = await safeAuth();
  if (!userId) return null; // layout already redirects

  const students = await fetchLinkedStudents(userId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-5 py-10">
        <header className="mb-8">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-400">
            Parent Portal
          </p>
          <h1 className="text-2xl font-extrabold text-white">Your students</h1>
          <p className="mt-1 text-sm text-slate-400">
            You can see progress for the student(s) linked to your account. If someone is missing,
            ask a Karman admin to add the link.
          </p>
        </header>

        {students.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 px-8 py-12 text-center">
            <UsersIcon className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <h2 className="text-base font-semibold text-white">No students linked yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              A Karman admin will link your account to your student(s) shortly. Check back soon, or
              reach out to support if it&apos;s been more than a day.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {students.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/dashboard/parent/${s.id}`}
                  className="block rounded-xl border border-slate-800 bg-slate-900/40 p-5 transition-colors hover:bg-slate-900/70"
                >
                  <div className="flex items-center gap-4">
                    <Avatar
                      name={`${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.email}
                      avatarUrl={s.avatar_url}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-white">
                        {[s.first_name, s.last_name].filter(Boolean).join(" ") || s.email}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {s.sat_test_date
                          ? `Target SAT · ${formatDate(s.sat_test_date)}`
                          : "Target SAT date not set"}
                      </div>
                    </div>
                    <span className="text-sm text-slate-400">View →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 max-w-md text-xs text-slate-400">
          Per-student detail view (progress, cohort, recent activity) is coming shortly. This
          landing page is the access point — your linked students will appear above.
        </p>
      </div>
    </div>
  );
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={40}
        height={40}
        className="h-10 w-10 rounded-full border border-slate-700 object-cover"
        unoptimized
      />
    );
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
      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-sm font-bold text-slate-300"
    >
      {initials || "?"}
    </div>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
