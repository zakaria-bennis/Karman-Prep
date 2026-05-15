// ============================================================
// /dashboard/student/chat — student chat surface.
//
// Server component: resolves the student's cohort + provisioned
// chat channels (cohort_chat + qa) and the student's own UUID,
// then hands everything to <ChatShell> which owns the layout
// (tabs, sidebar, DM picker, conversation routing).
//
// Self-bookable students without a cohort fall through to a
// friendly empty state and skip the shell entirely.
// ============================================================

import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ChatShell } from "@/components/chat/ChatShell";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";

export const metadata: Metadata = { title: "Chat" };
export const dynamic = "force-dynamic";

export default async function StudentChatPage() {
  const { userId: realUserId } = await auth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId } = await resolveEffectiveClerkId(realUserId);

  const studentUuid = await getUserUuidByClerkId(userId);
  if (!studentUuid) redirect("/onboarding");

  const supa = createAdminClient();

  const { data: membership } = await supa
    .from("cohort_members")
    .select("cohort_id")
    .eq("user_id", studentUuid)
    .is("left_at", null)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let cohortChannel: { id: string; display_name: string } | null = null;
  let qaChannel: { id: string; display_name: string } | null = null;

  if (membership?.cohort_id) {
    const { data: rows } = await supa
      .from("chat_channels")
      .select("id, display_name, channel_type")
      .eq("cohort_id", membership.cohort_id);
    for (const r of (rows as Array<{
      id: string;
      display_name: string;
      channel_type: string;
    }> | null) ?? []) {
      if (r.channel_type === "cohort_chat")
        cohortChannel = { id: r.id, display_name: r.display_name };
      if (r.channel_type === "qa") qaChannel = { id: r.id, display_name: r.display_name };
    }
  }

  const clerkUser = await currentUser();
  const first = clerkUser?.firstName ?? "Karman";
  const lastInitial = clerkUser?.lastName ? clerkUser.lastName[0].toUpperCase() + "." : "";
  const postingAs = lastInitial ? `${first} ${lastInitial}` : first;

  return (
    <DashboardLayout>
      <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-6xl flex-col px-4 py-6 sm:px-6">
        <header className="mb-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-500">Chat</p>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            <MessageSquare className="h-6 w-6 text-slate-400" />
            Conversations
          </h1>
        </header>

        {!membership?.cohort_id ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You&apos;re not in a cohort yet. Cohort chat unlocks once you&apos;re placed (admin
              assigns you after signup).
            </p>
          </div>
        ) : !cohortChannel && !qaChannel ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-400/20 dark:bg-amber-400/5">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Your cohort chat hasn&apos;t been set up yet. Ask your tutor or admin to provision it
              from the cohort detail page.
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            <ChatShell
              cohortChannel={cohortChannel}
              qaChannel={qaChannel}
              postingAsPreview={postingAs}
              selfUuid={studentUuid}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
