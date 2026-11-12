import "server-only";
/*
 * The parent's daily email time, in public.parent_email_settings (migration
 * 20261112200000_parent_daily_email.sql). No row means the default (7:30 PM); a NULL time means off.
 * Callers pass the signed-in parent's own users.id.
 */
import { untypedAdmin, type UntypedAdmin } from "@/lib/school/db";
import { effectiveDailyEmailTime, type DailyEmailChoice } from "./daily-email-schedule";

/** The saved time: a string, null for off, undefined when nothing is saved (or unreadable). */
export async function readDailyEmailTimes(
  parentUserIds: readonly string[],
  supabase: UntypedAdmin = untypedAdmin()
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (!parentUserIds.length) return out;
  const { data, error } = await supabase
    .from("parent_email_settings")
    .select("parent_user_id, daily_email_time")
    .in("parent_user_id", [...parentUserIds]);
  if (error) {
    console.error("[parent] daily email settings could not be read", error.message);
    return out;
  }
  for (const row of (data ?? []) as { parent_user_id: string; daily_email_time: string | null }[])
    out.set(row.parent_user_id, row.daily_email_time);
  return out;
}

export async function readDailyEmailChoice(parentUserId: string): Promise<DailyEmailChoice> {
  const saved = await readDailyEmailTimes([parentUserId]);
  return effectiveDailyEmailTime(saved.has(parentUserId) ? saved.get(parentUserId) : undefined);
}

export async function saveDailyEmailChoice(
  parentUserId: string,
  choice: DailyEmailChoice
): Promise<void> {
  const { error } = await untypedAdmin().from("parent_email_settings").upsert(
    {
      parent_user_id: parentUserId,
      daily_email_time: choice,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "parent_user_id" }
  );
  if (error) throw error;
}
