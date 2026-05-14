// ============================================================
// POST /api/webhooks/zoom — Zoom webhook handler
//
// Three things this route does:
//   1. Handles the URL validation challenge Zoom fires once
//      when you save a webhook subscription. Without responding
//      correctly, Zoom never activates the subscription.
//   2. Verifies the signature on every other event using
//      ZOOM_WEBHOOK_SECRET.
//   3. Dispatches:
//        meeting.participant_joined → append join to attendance_log
//        meeting.participant_left   → close interval, accumulate
//        meeting.ended              → close open joins, finalize
//                                     each booking to completed/no_show
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import type { ZoomWebhookEnvelope } from "@/lib/integrations/zoom/types";
import {
  finalizeAttendanceForMeeting,
  findBookingForParticipant,
  recordParticipantJoin,
  recordParticipantLeave,
} from "@/lib/supabase/queries/attendance";

export const runtime = "nodejs";

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function verifyZoomSignature(
  rawBody: string,
  timestamp: string,
  signatureHeader: string,
  secret: string
): boolean {
  const message = `v0:${timestamp}:${rawBody}`;
  const expected = "v0=" + crypto.createHmac("sha256", secret).update(message).digest("hex");
  return timingSafeStringEqual(expected, signatureHeader);
}

export async function POST(req: NextRequest) {
  const secret = process.env.ZOOM_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[zoom-webhook] ZOOM_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const raw = await req.text();
  let event: ZoomWebhookEnvelope;
  try {
    event = JSON.parse(raw) as ZoomWebhookEnvelope;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 1. URL validation challenge — answer with HMAC of plainToken.
  if (event.event === "endpoint.url_validation") {
    const plainToken = event.payload?.plainToken;
    if (!plainToken) {
      return NextResponse.json({ error: "Missing plainToken" }, { status: 400 });
    }
    const encryptedToken = crypto.createHmac("sha256", secret).update(plainToken).digest("hex");
    return NextResponse.json({ plainToken, encryptedToken });
  }

  // 2. Signature verification for everything else.
  const ts = req.headers.get("x-zm-request-timestamp");
  const sig = req.headers.get("x-zm-signature");
  if (!ts || !sig) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
  }
  if (!verifyZoomSignature(raw, ts, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 3. Dispatch.
  const obj = event.payload?.object;
  if (!obj) {
    // Some events have no object — ignore.
    return NextResponse.json({ received: true });
  }

  const meetingId = String(obj.id);
  if (!meetingId) {
    return NextResponse.json({ received: true, note: "no meeting id" });
  }

  try {
    switch (event.event) {
      case "meeting.participant_joined": {
        const p = obj.participant;
        if (!p?.join_time) {
          return NextResponse.json({ received: true, note: "no join_time" });
        }
        const match = await findBookingForParticipant(meetingId, p.email);
        if (!match) {
          console.warn(
            `[zoom-webhook] participant_joined: no booking for meeting=${meetingId} email=${p.email}`
          );
          return NextResponse.json({ received: true, note: "no matching booking" });
        }
        await recordParticipantJoin({
          bookingId: match.bookingId,
          studentId: match.studentId,
          zoomMeetingId: meetingId,
          joinTime: p.join_time,
        });
        break;
      }

      case "meeting.participant_left": {
        const p = obj.participant;
        if (!p?.leave_time) {
          return NextResponse.json({ received: true, note: "no leave_time" });
        }
        const match = await findBookingForParticipant(meetingId, p.email);
        if (!match) {
          console.warn(
            `[zoom-webhook] participant_left: no booking for meeting=${meetingId} email=${p.email}`
          );
          return NextResponse.json({ received: true, note: "no matching booking" });
        }
        await recordParticipantLeave({
          bookingId: match.bookingId,
          studentId: match.studentId,
          leaveTime: p.leave_time,
        });
        break;
      }

      case "meeting.ended": {
        // Use the explicit end_time if Zoom sent one, else now.
        const endTime = obj.end_time ?? new Date().toISOString();
        await finalizeAttendanceForMeeting({ zoomMeetingId: meetingId, endTime });
        break;
      }

      default:
        // Unhandled events (meeting.started, etc.) — ack so Zoom
        // doesn't retry. We may add more handlers later.
        console.log(`[zoom-webhook] ignoring event=${event.event}`);
    }
  } catch (err) {
    console.error(`[zoom-webhook] ${event.event} processing error:`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
