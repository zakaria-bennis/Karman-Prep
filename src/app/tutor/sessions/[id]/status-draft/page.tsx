// ============================================================
// /tutor/sessions/[id]/status-draft
//
// Tutor-facing page to review the GPT-4 draft of a session
// recap, edit it, and (in Phase 5) send it to student + parents.
//
// Auth: tutor role only, scoped to their own bookings (admins
// can view any). Already gated by /tutor/layout.tsx, plus we
// re-check booking ownership server-side here.
// ============================================================

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { safeAuth } from "@/lib/auth/dev-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import StatusDraftClient, { type StatusDraftPageData } from "./StatusDraftClient";
import type { StatusDraft } from "@/lib/integrations/openai/generate-status-draft";

export const metadata: Metadata = { title: "Session recap draft — Karman" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StatusDraftPage({ params }: PageProps) {
  const { id: bookingId } = await params;

  const { userId: clerkId } = await safeAuth();
  if (!clerkId) redirect("/auth/sign-in");

  const role = await fetchUserRole(clerkId);
  if (role !== "tutor" && role !== "admin") {
    redirect("/dashboard/student");
  }

  const supabase = createAdminClient();
  const { data: caller } = await supabase
    .from("users")
    .select("id, role")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!caller) redirect("/auth/sign-in");

  // ── Fetch booking + tutor + student ─────────────────────
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      id, tutor_id, student_id, plan_tier, scheduled_start, duration_minutes,
      transcript, transcript_source, transcript_received_at,
      status_draft, status_draft_created_at, status_draft_edited_at,
      recap_email_sent, recap_sent_at,
      payout_status, payout_amount,
      tutor:users!bookings_tutor_id_fkey (
        id, first_name, last_name, email, email_signature
      ),
      student:users!bookings_student_id_fkey (
        id, first_name, last_name, email
      )
    `
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) notFound();

  // Ownership check — tutor must be the assigned tutor on the booking
  // (admins can view any).
  if (caller.role !== "admin" && booking.tutor_id !== caller.id) {
    redirect("/tutor");
  }

  // Normalize joined-relation shapes (Supabase returns these as
  // either single objects or arrays depending on FK detection).
  const arr = <T,>(v: unknown): T | null =>
    Array.isArray(v) ? ((v[0] as T) ?? null) : ((v as T) ?? null);
  type UserMini = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    email_signature?: string | null;
  };
  const tutor = arr<UserMini>(booking.tutor);
  const student = arr<UserMini>(booking.student);

  // ── Fetch linked parents via parent_student_links ───────
  const { data: parentLinks } = await supabase
    .from("parent_student_links")
    .select(
      "parent:users!parent_student_links_parent_user_id_fkey (id, first_name, last_name, email)"
    )
    .eq("student_user_id", booking.student_id);

  const parents = (parentLinks ?? [])
    .map((row) => arr<UserMini>(row.parent))
    .filter((p): p is UserMini => !!p && !!p.email);

  // ── Inspect status_draft shape ──────────────────────────
  // The DB column is jsonb; could be a real StatusDraft, an
  // { error: '...' } marker from a failed generation, or null.
  let draft: StatusDraft | null = null;
  let draftError: string | null = null;
  if (booking.status_draft && typeof booking.status_draft === "object") {
    const raw = booking.status_draft as Record<string, unknown>;
    if (typeof raw.error === "string") {
      draftError = raw.error;
    } else if (typeof raw.date_and_time_of_session === "string") {
      draft = raw as unknown as StatusDraft;
    }
  }

  const data: StatusDraftPageData = {
    bookingId: booking.id as string,
    callerIsAdmin: caller.role === "admin",
    studentName: displayName(student) || "Student",
    studentEmail: student?.email ?? null,
    parents: parents.map((p) => ({
      id: p.id,
      name: displayName(p) || (p.email ?? "Parent"),
      email: p.email!,
    })),
    cohortName: null, // bookings aren't directly tied to cohorts; skip for v1
    sessionDateIso: booking.scheduled_start as string,
    durationMinutes: (booking.duration_minutes as number | null) ?? 60,
    planTier: booking.plan_tier as string,
    tutorName: displayName(tutor) || "Tutor",
    tutorSignatureOverride: (tutor?.email_signature as string | null) ?? null,
    hasTranscript: !!booking.transcript,
    transcriptSource: (booking.transcript_source as string | null) ?? null,
    draft,
    draftError,
    draftCreatedAt: (booking.status_draft_created_at as string | null) ?? null,
    draftEditedAt: (booking.status_draft_edited_at as string | null) ?? null,
    recapSent: booking.recap_email_sent === true,
    recapSentAt: (booking.recap_sent_at as string | null) ?? null,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-5 py-8">
        <Link
          href="/tutor/schedule"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
        >
          <ChevronLeft className="h-4 w-4" />
          My schedule
        </Link>
        <StatusDraftClient data={data} />
      </div>
    </div>
  );
}

function displayName(u: { first_name: string | null; last_name: string | null } | null): string {
  if (!u) return "";
  return [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
}
