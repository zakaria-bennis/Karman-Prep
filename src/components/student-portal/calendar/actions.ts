"use server";

/*
 * Saving or giving up a spot in a workshop or office hours (student Calendar).
 * The plan is checked on the server; admins previewing a student can't save spots for them.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { loadStudentContext } from "@/lib/student/context";
import { canUse } from "@/lib/student/plan-gate";
import { createAdminClient } from "@/lib/supabase/server";

const spotInput = z.object({ eventId: z.string().uuid(), save: z.boolean() }).strict();

export type SpotResult = { ok: true; saved: boolean } | { ok: false; message: string };

export async function actionSetEventSpot(raw: unknown): Promise<SpotResult> {
  const parsed = spotInput.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "That event couldn’t be found." };
  const { eventId, save } = parsed.data;

  const ctx = await loadStudentContext();
  if (ctx.isImpersonating) {
    return { ok: false, message: "You’re previewing this student, so spots can’t be saved." };
  }
  if (!canUse(ctx.plan, "live:workshops")) {
    return { ok: false, message: "Workshops and office hours come with every paid plan." };
  }

  // live_events is newer than the generated database types, so this client is untyped.
  const db = createAdminClient() as unknown as SupabaseClient;
  const { data: event, error } = await db
    .from("live_events")
    .select("id, ends_at, cancelled_at, capacity")
    .eq("id", eventId)
    .maybeSingle();
  const row = event as {
    id: string;
    ends_at: string;
    cancelled_at: string | null;
    capacity: number | null;
  } | null;
  if (error || !row) return { ok: false, message: "That event couldn’t be found." };
  if (row.cancelled_at || Date.parse(row.ends_at) < Date.now()) {
    return { ok: false, message: "This one has ended or was called off." };
  }

  if (!save) {
    const { error: delError } = await db
      .from("live_event_rsvps")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", ctx.userId);
    if (delError) return { ok: false, message: "That didn’t save. Try again." };
    revalidatePath("/dashboard/student/schedule");
    return { ok: true, saved: false };
  }

  if (row.capacity !== null) {
    const { count } = await db
      .from("live_event_rsvps")
      .select("user_id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .neq("user_id", ctx.userId);
    if ((count ?? 0) >= row.capacity) return { ok: false, message: "This one is full." };
  }

  const { error: saveError } = await db
    .from("live_event_rsvps")
    .upsert({ event_id: eventId, user_id: ctx.userId }, { onConflict: "event_id,user_id" });
  if (saveError) return { ok: false, message: "That didn’t save. Try again." };
  revalidatePath("/dashboard/student/schedule");
  return { ok: true, saved: true };
}
