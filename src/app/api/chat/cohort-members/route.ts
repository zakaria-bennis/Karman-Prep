// ============================================================
// GET /api/chat/cohort-members
//
// Returns the active student roster of the caller's primary
// cohort, EXCLUDING the caller themselves. Powers the "+ New
// DM" picker dropdown in the chat shell — DMs are restricted
// to cohort-mates by spec.
//
// If the caller belongs to multiple cohorts, the most recently
// joined active cohort wins (matches the chat page's lookup
// rule).
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserUuidByClerkId } from "@/lib/supabase/queries/bookings";

interface PeerEntry {
  /** Clerk id — matches what the DM send route expects as recipientId. */
  clerkId: string;
  /** First-name + last-initial display preview. */
  displayName: string;
  /** Real name (first + last) — caller is a peer, so visible. */
  realName: string;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerUuid = await getUserUuidByClerkId(userId);
  if (!callerUuid) return NextResponse.json({ error: "User profile not found" }, { status: 404 });

  const supa = createAdminClient();

  // Caller's most recent active cohort.
  const { data: membership } = await supa
    .from("cohort_members")
    .select("cohort_id")
    .eq("user_id", callerUuid)
    .is("left_at", null)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.cohort_id) {
    return NextResponse.json({ peers: [] satisfies PeerEntry[] });
  }

  const { data: rows, error } = await supa
    .from("cohort_members")
    .select("user_id, users!inner(id, clerk_id, first_name, last_name, email, role)")
    .eq("cohort_id", membership.cohort_id)
    .is("left_at", null);

  if (error) {
    console.error("[api/chat/cohort-members] roster query failed:", error);
    return NextResponse.json({ error: "Roster lookup failed" }, { status: 500 });
  }

  type UserRow = {
    id: string;
    clerk_id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string;
    role: string;
  };
  type Row = { user_id: string; users: UserRow | UserRow[] | null };

  const peers: PeerEntry[] = ((rows as unknown as Row[] | null) ?? [])
    .map((r) => (Array.isArray(r.users) ? (r.users[0] ?? null) : r.users))
    .filter((u): u is UserRow => !!u && u.id !== callerUuid && u.role === "student" && !!u.clerk_id)
    .map((u) => {
      const first = (u.first_name ?? "").trim() || u.email.split("@")[0];
      const last = (u.last_name ?? "").trim();
      const lastInitial = last ? `${last[0].toUpperCase()}.` : "";
      const realFull = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email;
      return {
        clerkId: u.clerk_id!,
        displayName: lastInitial ? `${first} ${lastInitial}` : first,
        realName: realFull,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return NextResponse.json({ peers });
}
