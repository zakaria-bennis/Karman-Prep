// ============================================================
// POST /api/webhooks/fireflies-transcript
//
// Fireflies pings us when a meeting transcript is ready. The
// payload is minimal — just `meetingId`. We:
//   1. Auth via ?token=<FIREFLIES_WEBHOOK_TOKEN> query param.
//   2. Insert the raw payload into webhook_events. The unique
//      partial index on (source, external_event_id) gives us
//      idempotent dedup for free.
//   3. GraphQL-fetch the full transcript from Fireflies.
//   4. Match transcript.meeting_url to a booking by Zoom
//      meeting id. Falls back to time-window match if needed.
//   5. Update the booking with transcript + tutor_hours.
//   6. If the booking is 1:1 (private/elite per Decision #4),
//      kick off OpenAI to generate the status draft and store
//      it on bookings.status_draft. Insert an in-app notification
//      for the tutor.
//   7. Return 200 in every case once the raw payload is stored
//      (otherwise Fireflies retries forever).
//
// Auth model: shared secret in URL. Cheaper than HMAC, fine for
// Fireflies' webhook model. Rotate by changing the env var and
// re-configuring the webhook in Fireflies' dashboard.
// ============================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  fetchFirefliesTranscript,
  renderTranscriptText,
  parseZoomMeetingId,
} from "@/lib/integrations/fireflies/client";
import { generateStatusDraft, type StatusDraft } from "@/lib/integrations/openai/generate-status-draft";

export const runtime = "nodejs";

interface FirefliesWebhookBody {
  // Fireflies uses snake_case in their actual payloads — these are
  // the canonical field names we see in production:
  meeting_id?: string;
  event?: string;
  // Older / alternate shapes some sources send (kept for safety):
  meetingId?: string;
  transcriptId?: string;
  transcript_id?: string;
  eventType?: string;
  id?: string;
  /** Test pings include this and a meeting_id of "test_00000000". */
  timestamp?: number;
}

/** Fireflies uses literal "test_00000000" as the meeting id for
 *  webhook test pings. We log them but skip transcript fetch. */
const FIREFLIES_TEST_MEETING_ID = "test_00000000";

/** Tiers eligible for auto-recap in v1. Per Decision #4 we ship
 *  1:1 only; group classes are deferred until we design a per-
 *  student-vs-shared recap flow for them. */
const ONE_ON_ONE_TIERS = new Set(["private", "elite"]);

export async function POST(request: Request) {
  // ── Auth ────────────────────────────────────────────────
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const expected = process.env.FIREFLIES_WEBHOOK_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ── Parse payload ───────────────────────────────────────
  // Read body as text first so we can log it even if JSON parsing
  // fails. Fireflies test pings have shipped with various shapes
  // over the years; this lets us see exactly what they sent.
  const rawText = await request.text();
  let body: FirefliesWebhookBody;
  let parseError: string | null = null;
  try {
    body = JSON.parse(rawText || "{}") as FirefliesWebhookBody;
  } catch (err) {
    body = {};
    parseError = err instanceof Error ? err.message : "json_parse_failed";
  }

  // Defensively dig for the meeting id — Fireflies uses snake_case
  // (meeting_id) but accept camelCase variants too.
  const externalId =
    body.meeting_id ||
    body.transcript_id ||
    body.meetingId ||
    body.transcriptId ||
    body.id ||
    null;
  const eventName = body.event || body.eventType || null;

  const supabase = createAdminClient();

  // ── 1. Persist raw payload (dedup on conflict) ─────────
  // Log EVERY incoming request — even ones without a meeting id
  // and even ones with malformed JSON. The webhook_events table
  // is our source of truth for "did Fireflies actually call us?".
  const { data: webhookRow, error: insErr } = await supabase
    .from("webhook_events")
    .insert({
      source: "fireflies",
      external_event_id: externalId,
      event_type: eventName,
      raw_payload: parseError
        ? { _parse_error: parseError, _raw: rawText.slice(0, 2000) }
        : (body as unknown as Record<string, unknown>),
    })
    .select("id")
    .single();

  if (insErr) {
    // Unique constraint hit → duplicate webhook delivery. Idempotent: 200.
    if (insErr.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }
    console.error("[fireflies-webhook] insert failed:", insErr.message);
    return NextResponse.json({ error: "log_failed" }, { status: 500 });
  }

  const webhookEventId = webhookRow.id as string;

  // If the payload didn't include a meeting id, we've still
  // logged the request — but we can't process further. Mark it
  // as processed-with-error and return 200 so Fireflies stops
  // retrying.
  if (!externalId) {
    await supabase
      .from("webhook_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: parseError
          ? `payload not JSON: ${parseError}`
          : "payload missing meeting_id/transcript_id/id",
      })
      .eq("id", webhookEventId);
    return NextResponse.json({ received: true, note: "no_meeting_id" }, { status: 200 });
  }

  // Fireflies sends a synthetic test ping with this fixed id when
  // the user clicks "Test Webhook". Don't try to GraphQL-fetch
  // a transcript that doesn't exist — log success and return.
  if (externalId === FIREFLIES_TEST_MEETING_ID) {
    await supabase
      .from("webhook_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: "fireflies test ping (synthetic) — logged, no transcript fetch attempted",
      })
      .eq("id", webhookEventId);
    return NextResponse.json({ received: true, note: "test_ping" }, { status: 200 });
  }

  // ── 2-7 wrapped: any failure here records error_message
  //    on the webhook_events row but always returns 200. ───
  try {
    await processWebhook(webhookEventId, externalId, supabase);
    await supabase
      .from("webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("id", webhookEventId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[fireflies-webhook] processing failed (${externalId}):`, message);
    await supabase
      .from("webhook_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: message,
      })
      .eq("id", webhookEventId);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

type Supabase = ReturnType<typeof createAdminClient>;

async function processWebhook(
  webhookEventId: string,
  externalId: string,
  supabase: Supabase
) {
  // ── Fetch transcript from Fireflies ──────────────────────
  const transcript = await fetchFirefliesTranscript(externalId);
  const transcriptText = renderTranscriptText(transcript.sentences);
  const durationMinutes = Math.round(transcript.duration ?? 0);
  const tutorHours = Number(((transcript.duration ?? 0) / 1).toFixed(2)); // duration already in minutes? double-check Fireflies docs
  // Fireflies returns duration in minutes — tutor_hours = minutes / 60
  const hours = Number(((transcript.duration ?? 0) / 60).toFixed(2));

  // ── Match transcript to a booking ───────────────────────
  const zoomId = parseZoomMeetingId(transcript.meeting_link);
  const booking = await findMatchingBooking(supabase, {
    zoomMeetingId: zoomId,
    transcriptDateMs: transcript.date,
    durationMinutes,
  });

  if (!booking) {
    throw new Error(
      `no_booking_match (zoom_id=${zoomId ?? "n/a"}, transcript_date=${transcript.date})`
    );
  }

  // Link the webhook event back to the booking for audit trail.
  await supabase
    .from("webhook_events")
    .update({ booking_id: booking.id })
    .eq("id", webhookEventId);

  // ── Save transcript on the booking ──────────────────────
  const baseUpdate = {
    transcript: transcriptText,
    transcript_source: "fireflies" as const,
    transcript_received_at: new Date().toISOString(),
    tutor_hours: hours,
    // Defensive: only set duration if it was missing on the booking.
    // Most bookings already have it from Stripe-auto-places.
    ...(booking.duration_minutes ? {} : { duration_minutes: durationMinutes }),
  };

  // ── Decision #4: 1:1 (private/elite) only in v1 ─────────
  const isOneOnOne = ONE_ON_ONE_TIERS.has(booking.plan_tier);
  // (We now support group sessions too — recap content excludes
  //  student names per product spec. The 1:1 gate is removed.)
  void isOneOnOne; void tutorHours;

  // ── Generate status draft via OpenAI ────────────────────
  // For group sessions: GPT writes a class-level recap (no names).
  // For 1:1: personalized to the one student.
  let draft: StatusDraft | null = null;
  let draftError: string | null = null;
  try {
    const isGroup = booking.plan_tier === "small_group" || booking.plan_tier === "group";
    draft = await generateStatusDraft(transcriptText, {
      sessionType: isGroup ? "group" : "individual",
      studentName: isGroup ? undefined : studentDisplayName(booking),
      tutorName:   tutorDisplayName(booking),
      sessionDate: formatSessionDate(booking.scheduled_start),
      sessionDurationMinutes: durationMinutes,
    });
  } catch (err) {
    draftError = err instanceof Error ? err.message : String(err);
    console.error("[fireflies-webhook] OpenAI draft failed:", draftError);
  }

  await supabase
    .from("bookings")
    .update({
      ...baseUpdate,
      status_draft: draft ?? { error: draftError },
      status_draft_created_at: new Date().toISOString(),
    })
    .eq("id", booking.id);

  // ── Notify the tutor ────────────────────────────────────
  await supabase.from("notifications").insert({
    user_id: booking.tutor_id,
    type: "recap_draft_ready",
    title: draft
      ? `Session recap draft ready for ${studentDisplayName(booking)}`
      : `Transcript saved — write recap manually for ${studentDisplayName(booking)}`,
    body: draft
      ? "GPT-4 drafted a recap email. Open the session to review and send."
      : `OpenAI couldn't generate the draft (${draftError?.slice(0, 100) ?? "unknown error"}). The transcript is saved — write the recap manually.`,
    link: `/tutor/sessions/${booking.id}/status-draft`,
  });

  console.log(`[fireflies-webhook] processed booking ${booking.id} — draft ${draft ? "OK" : "FAILED"}`);
}

// ──────────────────────────────────────────────────────────
// Booking-matching logic
// ──────────────────────────────────────────────────────────

interface BookingMatch {
  id: string;
  tutor_id: string;
  student_id: string;
  plan_tier: string;
  scheduled_start: string;
  duration_minutes: number | null;
  zoom_meeting_id: string | null;
  zoom_join_url: string | null;
  tutor: { first_name: string | null; last_name: string | null; email: string | null } | null;
  student: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

const BOOKING_SELECT = `
  id, tutor_id, student_id, plan_tier, scheduled_start, duration_minutes,
  zoom_meeting_id, zoom_join_url,
  tutor:users!bookings_tutor_id_fkey(first_name, last_name, email),
  student:users!bookings_student_id_fkey(first_name, last_name, email)
`;

/** Match strategy:
 *   1. By zoom_meeting_id direct equality (most reliable).
 *   2. By zoom_join_url containing the same Zoom meeting id
 *      (some bookings may not have zoom_meeting_id populated).
 *   3. By time window: bookings.scheduled_start within ±60 min
 *      of transcript.date AND status='scheduled'.
 *   Returns the first match, or null. */
async function findMatchingBooking(
  supabase: Supabase,
  args: {
    zoomMeetingId: string | null;
    transcriptDateMs: number | null;
    durationMinutes: number;
  }
): Promise<BookingMatch | null> {
  const { zoomMeetingId, transcriptDateMs } = args;

  // Strategy 1: direct zoom_meeting_id match
  if (zoomMeetingId) {
    const { data } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("zoom_meeting_id", zoomMeetingId)
      .order("scheduled_start", { ascending: false })
      .limit(1);
    if (data?.[0]) return normalize(data[0]);
  }

  // Strategy 2: zoom_join_url contains the meeting id
  if (zoomMeetingId) {
    const { data } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .ilike("zoom_join_url", `%/${zoomMeetingId}%`)
      .order("scheduled_start", { ascending: false })
      .limit(1);
    if (data?.[0]) return normalize(data[0]);
  }

  // Strategy 3: time window fallback
  if (transcriptDateMs) {
    const start = new Date(transcriptDateMs - 60 * 60_000).toISOString();
    const end   = new Date(transcriptDateMs + 60 * 60_000).toISOString();
    const { data } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .gte("scheduled_start", start)
      .lte("scheduled_start", end)
      .neq("status", "cancelled")
      .order("scheduled_start", { ascending: true })
      .limit(1);
    if (data?.[0]) return normalize(data[0]);
  }

  return null;
}

// Supabase joined relations come back as arrays sometimes; normalize.
function normalize(row: unknown): BookingMatch {
  const r = row as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? v[0] ?? null : v);
  return {
    id:                r.id as string,
    tutor_id:          r.tutor_id as string,
    student_id:        r.student_id as string,
    plan_tier:         r.plan_tier as string,
    scheduled_start:   r.scheduled_start as string,
    duration_minutes:  (r.duration_minutes as number | null) ?? null,
    zoom_meeting_id:   (r.zoom_meeting_id as string | null) ?? null,
    zoom_join_url:     (r.zoom_join_url as string | null) ?? null,
    tutor:             arr(r.tutor)   as BookingMatch["tutor"],
    student:           arr(r.student) as BookingMatch["student"],
  };
}

function studentDisplayName(b: BookingMatch): string {
  const s = b.student;
  if (!s) return "Student";
  return [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email || "Student";
}

function tutorDisplayName(b: BookingMatch): string {
  const t = b.tutor;
  if (!t) return "Tutor";
  return [t.first_name, t.last_name].filter(Boolean).join(" ") || t.email || "Tutor";
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
