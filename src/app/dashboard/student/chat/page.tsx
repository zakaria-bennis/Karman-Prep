// ============================================================
// /dashboard/student/chat — Messages, inside the student portal.
//
// Server component: resolves the student's cohort + provisioned
// chat channels (cohort_chat + qa) and the student's own UUID,
// then hands everything to <ChatShell> which owns the layout
// (tabs, sidebar, DM picker, conversation routing).
//
// Students without a cohort go back to Today.
// ============================================================

import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Panel } from "@/components/portal";
import { ChatShell } from "@/components/chat/ChatShell";
import StudentPortal, { STUDENT_HOME } from "@/components/student-portal/StudentPortal";
import { loadStudentContext } from "@/lib/student/context";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function StudentChatPage() {
  const ctx = await loadStudentContext();
  // Messages is for cohort students only; the account menu shows it only to them.
  if (!ctx.hasChat) redirect(STUDENT_HOME);
  const studentUuid = ctx.userId;

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

  // currentUser() reads Clerk's auth context; under DEV_IMPERSONATE_
  // CLERK_ID the middleware is skipped (see src/lib/auth/dev-auth.ts)
  // so the helper throws "Clerk can't detect usage of clerkMiddleware".
  // Treat that as "no Clerk user info available" and fall back to the
  // generic posting-as label — the page still renders for visual /
  // a11y tests under the dev bypass.
  let first = "Karman";
  let lastInitial = "";
  try {
    const clerkUser = await currentUser();
    first = clerkUser?.firstName ?? "Karman";
    lastInitial = clerkUser?.lastName ? clerkUser.lastName[0].toUpperCase() + "." : "";
  } catch {
    /* dev-bypass / unauthenticated — keep defaults */
  }
  const postingAs = lastInitial ? `${first} ${lastInitial}` : first;

  return (
    <StudentPortal ctx={ctx} title="Messages">
      <Panel label="Messages">
        {!membership?.cohort_id || (!cohortChannel && !qaChannel) ? (
          <p className="kp-meta">
            Your cohort chat isn&apos;t set up yet. Ask your tutor to open it.
          </p>
        ) : (
          <ChatShell
            cohortChannel={cohortChannel}
            qaChannel={qaChannel}
            postingAsPreview={postingAs}
            selfUuid={studentUuid}
          />
        )}
      </Panel>
    </StudentPortal>
  );
}
