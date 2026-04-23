// ============================================================
// POST /api/auth/sync-user
// Syncs a Clerk user to the Supabase `users` table on sign-up.
// Called from the onboarding page after first sign-in.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { role } = await req.json();
    const email = clerkUser.emailAddresses[0]?.emailAddress || "";

    const supabase = createAdminClient();

    // Upsert so re-calling this is idempotent
    const { error } = await supabase.from("users").upsert({
      clerk_id: userId,
      email,
      role: role || "student",
    });

    if (error) {
      console.error("[sync-user] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[sync-user] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
