// ============================================================
// /dashboard/student/chat — student's cohort chat surface.
//
// Resolves the student's active cohort_chat channel server-side
// (cohort membership → chat_channels lookup) and passes the
// channel id + display name + posting-as preview to the client
// component. Self-bookable tiers without a cohort fall through
// to a friendly empty state.
// ============================================================

import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { CohortChat } from "@/components/chat/CohortChat";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";

export const metadata: Metadata = { title: "Chat" };
export const dynamic = "force-dynamic";

export default async function StudentChatPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const studentUuid = await getUserUuidByClerkId(userId);
  if (!studentUuid) redirect("/onboarding");

  const supa = createAdminClient();

  // Find the student's active cohort.
  const { data: membership } = await supa
    .from("cohort_members")
    .select("cohort_id")
    .eq("user_id", studentUuid)
    .is("left_at", null)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Resolve cohort_chat channel for that cohort.
  let channel: { id: string; display_name: string } | null = null;
  if (membership?.cohort_id) {
    const { data: chRow } = await supa
      .from("chat_channels")
      .select("id, display_name")
      .eq("cohort_id", membership.cohort_id)
      .eq("channel_type", "cohort_chat")
      .maybeSingle();
    if (chRow) channel = chRow as { id: string; display_name: string };
  }

  const clerkUser = await currentUser();
  const first = clerkUser?.firstName ?? "Strata";
  const lastInitial = clerkUser?.lastName ? clerkUser.lastName[0].toUpperCase() + "." : "";
  const postingAs = lastInitial ? `${first} ${lastInitial}` : first;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 h-full">
        <header className="mb-4">
          <p className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-1">Chat</p>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-slate-400" />
            Cohort chat
          </h1>
        </header>

        {channel ? (
          <CohortChat
            channelId={channel.id}
            channelDisplayName={channel.display_name}
            postingAsPreview={postingAs}
          />
        ) : membership?.cohort_id ? (
          <div className="rounded-xl border border-amber-200 dark:border-amber-400/20 bg-amber-50 dark:bg-amber-400/5 px-4 py-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Your cohort chat hasn't been set up yet. Ask your tutor or admin to provision it from the cohort detail page.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 px-6 py-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You're not in a cohort yet. Cohort chat unlocks once you're placed (admin assigns you after signup).
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
