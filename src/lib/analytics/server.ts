// ============================================================
// Server only. Server side of the analytics: writing rows, the funnel steps only the server sees
// (onboarding done, test started, checkout started, paid), and the 13-month clean-up.
// Every call here is best effort: a failed analytics write never breaks the page or payment
// that caused it, so errors are logged and swallowed.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import type { AnalyticsRow } from "./ingest";
import type { ServerEventName } from "./events";
import { ANALYTICS_RETENTION_MONTHS } from "./shared";

export const ANALYTICS_TABLE = "analytics_events";

/** The service-role client without generated types (the table is newer than src/types). Server only. */
function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

export async function insertRows(rows: AnalyticsRow[]): Promise<boolean> {
  if (!rows.length) return true;
  try {
    const { error } = await db().from(ANALYTICS_TABLE).insert(rows);
    if (error) {
      console.warn("[analytics] insert failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[analytics] insert threw:", err instanceof Error ? err.message : err);
    return false;
  }
}

/** Short, non-personal facts about a server event (plan id, test kind). */
type ServerProps = Record<string, string | number | boolean | null | undefined>;

/**
 * Records a funnel step the server saw happen for a signed-in user (Clerk id). Signed-in
 * product use is recorded for every account; see src/lib/analytics/consent.ts.
 */
export async function trackServer(
  name: ServerEventName,
  userId: string | null | undefined,
  props: ServerProps = {}
): Promise<void> {
  if (!userId) return;
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && !/^[\w.:-]{1,40}$/.test(v)) continue;
    clean[k] = v;
  }
  await insertRows([
    {
      occurred_at: new Date().toISOString(),
      user_id: userId,
      anonymous_id: null,
      session_id: null,
      surface: "server",
      path: null,
      name,
      props: clean,
    },
  ]);
}

/** The oldest moment a raw event may be from. */
export function retentionCutoff(now = new Date()): Date {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - ANALYTICS_RETENTION_MONTHS);
  return d;
}

let lastPrune = 0;

/** Deletes events older than the retention window, at most once an hour per server instance. */
export async function pruneOldEvents(now = Date.now()): Promise<void> {
  if (now - lastPrune < 3_600_000) return;
  lastPrune = now;
  try {
    const { error } = await db()
      .from(ANALYTICS_TABLE)
      .delete()
      .lt("occurred_at", retentionCutoff(new Date(now)).toISOString());
    if (error) console.warn("[analytics] prune failed:", error.message);
  } catch (err) {
    console.warn("[analytics] prune threw:", err instanceof Error ? err.message : err);
  }
}
