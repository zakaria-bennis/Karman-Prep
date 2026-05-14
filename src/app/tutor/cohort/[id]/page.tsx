// ============================================================
// /tutor/cohort/[id] — tutor's working view of a single cohort.
// Ownership enforced via fetchTutorCohortDetail (returns null
// if the caller is not the cohort's tutor and not an admin).
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ChevronLeft } from "lucide-react";
import { fetchTutorCohortDetail } from "@/lib/supabase/queries/tutor";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import TutorCohortClient from "./TutorCohortClient";

export const metadata: Metadata = { title: "Cohort — Tutor Portal | Karman" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TutorCohortPage({ params }: PageProps) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  // Primary path: tutor accessing their own cohort.
  let detail = await fetchTutorCohortDetail(id, userId);

  // Admin fallback: admins aren't tied to a cohort as tutor, so
  // fetchTutorCohortDetail returns null for them. Check role and,
  // if admin, re-query using the cohort's actual tutor clerk_id.
  if (!detail) {
    const role = await fetchUserRole(userId);
    if (role === "admin") {
      const supabase = createAdminClient();
      const { data: cohort } = await supabase
        .from("cohorts")
        .select("tutor:users!cohorts_tutor_user_id_fkey (clerk_id)")
        .eq("id", id)
        .maybeSingle();
      type TutorRef = { clerk_id: string } | { clerk_id: string }[] | null;
      const tutorRef = cohort ? ((cohort as { tutor: TutorRef }).tutor) : null;
      const tutorClerkId = Array.isArray(tutorRef) ? tutorRef[0]?.clerk_id : tutorRef?.clerk_id;
      if (tutorClerkId) detail = await fetchTutorCohortDetail(id, tutorClerkId);
    }
  }

  if (!detail) notFound();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-5 py-8">
        <Link
          href="/tutor"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          My cohorts
        </Link>
        <TutorCohortClient detail={detail} />
      </div>
    </div>
  );
}
