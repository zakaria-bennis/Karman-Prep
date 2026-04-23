// ============================================================
// /tutor — Student list dashboard (utilitarian)
// ============================================================

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { fetchStudentDashboardRows } from "@/lib/supabase/queries/tutor";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentTable from "@/components/tutor/StudentTable";

export const metadata: Metadata = { title: "Tutor Portal — Strata" };

export default async function TutorPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const role = await fetchUserRole(userId);
  if (role !== "tutor" && role !== "admin") redirect("/dashboard/student");

  const rows = await fetchStudentDashboardRows();

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-1">Tutor Portal</p>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Students</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {rows.length} student{rows.length !== 1 ? "s" : ""} · click a row to open detail view
          </p>
        </div>
        <StudentTable rows={rows} />
      </div>
    </DashboardLayout>
  );
}
