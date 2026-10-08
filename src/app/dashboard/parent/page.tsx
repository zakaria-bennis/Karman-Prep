import type { Metadata } from "next";
import { safeAuth } from "@/lib/auth/dev-auth";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { redirect } from "next/navigation";
import ParentWeeklyPortal from "@/components/parent/ParentWeeklyPortal";
import {
  selectLinkedStudent,
  type LinkedParentStudent,
  type WeeklyParentView,
} from "@/lib/parent/weekly-model";
import { listLinkedParentStudents, loadLinkedStudentWeek } from "@/lib/parent/weekly-server";

export const metadata: Metadata = { title: "Parent Portal — Karman" };
export const dynamic = "force-dynamic";

export default async function ParentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(realUserId);

  let students: LinkedParentStudent[] = [];
  let selected: LinkedParentStudent | null = null;
  let summary: WeeklyParentView | null = null;
  let loadError = false;
  try {
    const links = await listLinkedParentStudents(clerkId);
    students = links.students;
    selected = selectLinkedStudent(students, (await searchParams).student);
    summary =
      links.parentId && selected ? await loadLinkedStudentWeek(links.parentId, selected) : null;
  } catch (error) {
    console.error("[parent-weekly] failed to load parent summary", error);
    loadError = true;
  }
  return (
    <ParentWeeklyPortal
      students={students}
      selected={selected}
      summary={summary}
      loadError={loadError}
    />
  );
}
