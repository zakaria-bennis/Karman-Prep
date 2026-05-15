// ============================================================
// Per-tutor Cal.com OAuth state. Reads + mutations against the
// cal_oauth_* / cal_event_type_* / cal_connected_at columns on
// the `users` table (added in 20260515021748_users_cal_oauth.sql).
//
// All functions take the tutor's app-side UUID (users.id), not
// Clerk id. Caller is responsible for resolving that.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import {
  refreshAccessToken,
  type CalOAuthTokens,
  type CalEventType,
} from "@/lib/integrations/cal/oauth";

export interface CalConnectionStatus {
  connected: boolean;
  /** True when the tutor has authorized Cal but hasn't picked / matched
   *  an event-type yet. /tutor/settings/booking shows the dropdown. */
  needsEventTypePick: boolean;
  eventTypeId: number | null;
  eventTypeTitle: string | null;
  connectedAt: string | null;
}

export async function getCalConnectionStatus(tutorUserId: string): Promise<CalConnectionStatus> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("cal_connected_at, cal_event_type_id, cal_event_type_title")
    .eq("id", tutorUserId)
    .maybeSingle();
  if (error) throw error;
  const connected = !!data?.cal_connected_at;
  const eventTypeId = data?.cal_event_type_id ?? null;
  return {
    connected,
    needsEventTypePick: connected && eventTypeId === null,
    eventTypeId: eventTypeId === null ? null : Number(eventTypeId),
    eventTypeTitle: data?.cal_event_type_title ?? null,
    connectedAt: data?.cal_connected_at ?? null,
  };
}

/** Persist a fresh OAuth token pair (and an optional auto-matched
 *  event-type) on the tutor. Called from the OAuth callback. */
export async function storeCalConnection(args: {
  tutorUserId: string;
  tokens: CalOAuthTokens;
  pickedEventType: CalEventType | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({
      cal_oauth_access_token: args.tokens.accessToken,
      cal_oauth_refresh_token: args.tokens.refreshToken,
      cal_oauth_expires_at: args.tokens.expiresAt.toISOString(),
      cal_connected_at: new Date().toISOString(),
      cal_event_type_id: args.pickedEventType?.id ?? null,
      cal_event_type_title: args.pickedEventType?.title ?? null,
      // Clear any stale "we emailed admin about this tutor" flag — now
      // that they're (re)connected, the next setup gap should re-alert.
      cal_setup_alerted_at: null,
    })
    .eq("id", args.tutorUserId);
  if (error) throw error;
}

/** Tutor picked / changed which of their event-types is the Karman one
 *  from the dropdown on /tutor/settings/booking. */
export async function setCalEventType(args: {
  tutorUserId: string;
  eventTypeId: number;
  eventTypeTitle: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({
      cal_event_type_id: args.eventTypeId,
      cal_event_type_title: args.eventTypeTitle,
      cal_setup_alerted_at: null,
    })
    .eq("id", args.tutorUserId);
  if (error) throw error;
}

/** Tutor disconnected — wipe everything Cal-related. */
export async function clearCalConnection(tutorUserId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({
      cal_oauth_access_token: null,
      cal_oauth_refresh_token: null,
      cal_oauth_expires_at: null,
      cal_connected_at: null,
      cal_event_type_id: null,
      cal_event_type_title: null,
      cal_setup_alerted_at: null,
    })
    .eq("id", tutorUserId);
  if (error) throw error;
}

/** Returns a valid (unexpired) access token for the tutor, refreshing
 *  lazily if it's within 60 seconds of expiry. Returns null if the
 *  tutor has never connected or the refresh fails (caller treats null
 *  as "tutor needs to reconnect"). */
export async function getValidCalAccessToken(tutorUserId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("cal_oauth_access_token, cal_oauth_refresh_token, cal_oauth_expires_at")
    .eq("id", tutorUserId)
    .maybeSingle();
  if (error || !data) return null;
  if (!data.cal_oauth_access_token || !data.cal_oauth_refresh_token) return null;

  const expiresAt = data.cal_oauth_expires_at ? new Date(data.cal_oauth_expires_at) : null;
  const stillValid = expiresAt !== null && expiresAt.getTime() - Date.now() > 60_000;
  if (stillValid) return data.cal_oauth_access_token;

  // Refresh lazily.
  try {
    const fresh = await refreshAccessToken(data.cal_oauth_refresh_token);
    const { error: updErr } = await supabase
      .from("users")
      .update({
        cal_oauth_access_token: fresh.accessToken,
        cal_oauth_refresh_token: fresh.refreshToken,
        cal_oauth_expires_at: fresh.expiresAt.toISOString(),
      })
      .eq("id", tutorUserId);
    if (updErr) {
      console.error("[cal-oauth] failed to persist refreshed token:", updErr);
    }
    return fresh.accessToken;
  } catch (err) {
    console.error("[cal-oauth] refresh failed for tutor", tutorUserId, err);
    return null;
  }
}

/** True if we've emailed the admin about this tutor's incomplete
 *  setup in the last 24h. Driver of dedup on /dashboard/student/schedule
 *  so we don't fire the alert on every student page load. */
export async function shouldAlertAdminAboutMissingSetup(tutorUserId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("cal_setup_alerted_at")
    .eq("id", tutorUserId)
    .maybeSingle();
  const lastAlert = data?.cal_setup_alerted_at ? new Date(data.cal_setup_alerted_at) : null;
  if (!lastAlert) return true;
  const HOURS_24 = 24 * 60 * 60 * 1000;
  return Date.now() - lastAlert.getTime() > HOURS_24;
}

export async function markAdminAlerted(tutorUserId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("users")
    .update({ cal_setup_alerted_at: new Date().toISOString() })
    .eq("id", tutorUserId);
}
