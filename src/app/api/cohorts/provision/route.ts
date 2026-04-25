// ============================================================
// POST /api/cohorts/provision   — { cohortId }
//
// Admin-only manual trigger to ensure a cohort has its two Slack
// channels (chat + qa) created and recorded in chat_channels.
// Idempotent — safe to re-run for cohorts that already have
// channels, no-op if both are present.
//
// Normally cohort provisioning happens automatically from the
// Stripe webhook when a student joins. This route exists for:
//   · Backfilling cohorts that pre-date the chat system.
//   · Manual recovery if Slack/DB drifted.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { ensureCohortChannels } from "@/lib/chat/provisioning";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await fetchUserRole(userId);
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { cohortId?: string };
  try {
    body = (await req.json()) as { cohortId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.cohortId) {
    return NextResponse.json({ error: "Missing cohortId" }, { status: 400 });
  }

  const result = await ensureCohortChannels(body.cohortId);
  if (!result) {
    return NextResponse.json(
      { error: "Provisioning failed — check server logs for the underlying Slack/DB error" },
      { status: 500 }
    );
  }
  return NextResponse.json(result);
}
