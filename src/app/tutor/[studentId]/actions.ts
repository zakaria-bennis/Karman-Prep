"use server";

// ============================================================
// A note for the family (founder, 2026-11-12): after a session the
// tutor writes a few lines that the parent sees in Messages, next
// to that week's practice. Tutors and admins only; impersonation is
// read-only. No email or text goes out.
// ============================================================

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { canTutorAccessStudent } from "@/lib/auth/tutor-access";
import { postParentNote } from "@/lib/parent/messages";
import { fetchUserRole, resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { untypedAdmin } from "@/lib/school/db";

const noteInput = z.object({
  studentClerkId: z.string().min(1).max(200),
  body: z
    .string()
    .transform((s) => s.replace(/\r\n/g, "\n").trim())
    .pipe(z.string().min(1, "Write the note first.").max(4000, "Keep it under 4,000 characters.")),
});

function back(studentClerkId: string, key: "done" | "error", message: string): never {
  redirect(
    `/tutor/${encodeURIComponent(studentClerkId)}?${key}=${encodeURIComponent(message)}#family-note`
  );
}

export async function postFamilyNoteAction(formData: FormData) {
  const raw = {
    studentClerkId: String(formData.get("studentClerkId") ?? ""),
    body: String(formData.get("body") ?? ""),
  };
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId, isImpersonating } = await resolveEffectiveClerkId(realUserId);
  if (isImpersonating) back(raw.studentClerkId, "error", "You're viewing as someone else.");
  const role = await fetchUserRole(clerkId);
  if (role !== "tutor" && role !== "admin") back(raw.studentClerkId, "error", "Tutors only.");
  const parsed = noteInput.safeParse(raw);
  if (!parsed.success)
    back(raw.studentClerkId, "error", parsed.error.issues[0]?.message ?? "Check the note.");
  const { studentClerkId, body } = parsed.data;
  if (!(await canTutorAccessStudent(clerkId, studentClerkId)))
    back(studentClerkId, "error", "Not your student.");
  const db = untypedAdmin();
  const { data } = await db
    .from("users")
    .select("id, clerk_id")
    .in("clerk_id", [clerkId, studentClerkId]);
  const rows = (data ?? []) as { id: string; clerk_id: string }[];
  const tutor = rows.find((r) => r.clerk_id === clerkId);
  const student = rows.find((r) => r.clerk_id === studentClerkId);
  if (!tutor || !student) back(studentClerkId, "error", "That student wasn't found.");
  try {
    await postParentNote({ studentUserId: student.id, tutorUserId: tutor.id, body }, db);
  } catch (error) {
    console.error("[tutor] family note failed", error instanceof Error ? error.message : error);
    back(studentClerkId, "error", "That didn't save. Try again in a minute.");
  }
  back(studentClerkId, "done", "Note shared. The family sees it in Messages.");
}
