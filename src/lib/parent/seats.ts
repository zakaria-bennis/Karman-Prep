import "server-only";
/*
 * Paid Cohort seats a parent holds whose student has no account yet (src/lib/reserve writes the
 * table; this only reads it). The parent bought the seat and opened their own portal link, so
 * their Clerk id is on the reservation, but nothing links them to a student until the student
 * opens the claim link. The empty parent portal says so and offers that link to send.
 */
import { untypedAdmin, type UntypedAdmin } from "@/lib/school/db";

export interface WaitingSeat {
  studentFirstName: string | null;
  /** The student's own link, the one the reservation's landing page offers. */
  claimPath: string;
}

export function claimPath(claimToken: string): string {
  return `/reserve/claim?r=${encodeURIComponent(claimToken)}`;
}

/** Soonest paid first. An unreadable table reads as no seats, so the portal still opens. */
export async function waitingSeats(
  parentClerkId: string,
  supabase: UntypedAdmin = untypedAdmin()
): Promise<WaitingSeat[]> {
  const { data, error } = await supabase
    .from("seat_reservations")
    .select("student_first_name, claim_token")
    .in("status", ["paid", "placed"])
    .contains("parent_clerk_ids", [parentClerkId])
    .is("clerk_user_id", null)
    .order("paid_at", { ascending: true });
  if (error) {
    console.error("[parent] waiting seats could not be read", error.message);
    return [];
  }
  return ((data ?? []) as { student_first_name: string | null; claim_token: string }[]).map(
    (row) => ({
      studentFirstName: row.student_first_name?.trim() || null,
      claimPath: claimPath(row.claim_token),
    })
  );
}
