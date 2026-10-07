// ============================================================
// POST /api/auth/sync-user
// Syncs a Clerk user to the Supabase `users` table on sign-up.
// Called from the onboarding page after first sign-in.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";
import { syncUserBodySchema } from "../schemas";

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

    const parsed = syncUserBodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { role } = parsed.data;
    const email = clerkUser.emailAddresses[0]?.emailAddress || "";

    // Mirror Clerk profile fields into Supabase so cohort lists can show
    // first names without a round-trip to Clerk. imageUrl is Clerk's hosted
    // avatar — students can later override it by uploading their own.
    const firstName = clerkUser.firstName || null;
    const lastName = clerkUser.lastName || null;
    const avatarUrl = clerkUser.imageUrl || null;

    const supabase = createAdminClient();

    // Capture signup IP on first sync only — never overwrite. Best-effort
    // signal for the admin moderation tab to spot multi-account trial
    // abuse (one person registering N Clerk identities to farm Elite
    // trial tokens). This is informational; the real abuse fix is
    // payment-method fingerprinting at the Stripe layer.
    const fwd = req.headers.get("x-forwarded-for") || "";
    const signupIp = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || null;

    const { data: existing, error: lookupError } = await supabase
      .from("users")
      .select("signup_ip, role")
      .eq("clerk_id", userId)
      .maybeSingle();
    if (lookupError) throw lookupError;

    // Signup cannot approve staff. Only an already-approved tutor can
    // repeat the tutor onboarding sync; no supplied role is written.
    if (role === "tutor" && existing?.role !== "tutor") {
      return NextResponse.json({ error: "Tutor access requires approval" }, { status: 403 });
    }

    // Ignore an existing Clerk identity atomically, including concurrent
    // syncs or staff approval. Never demote or overwrite an existing role.
    const { error } = await supabase.from("users").upsert(
      {
        clerk_id: userId,
        email,
        role: "student",
        first_name: firstName,
        last_name: lastName,
        avatar_url: avatarUrl,
        ...(existing?.signup_ip ? {} : { signup_ip: signupIp }),
      },
      { onConflict: "clerk_id", ignoreDuplicates: true }
    );

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
