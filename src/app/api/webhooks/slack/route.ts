// ============================================================
// POST /api/webhooks/slack — Slack Events API receiver
//
// Handles two cases:
//   1. URL verification challenge (one-time on subscription save)
//   2. event_callback for subscribed events. We currently log and
//      acknowledge most events without acting on them — the
//      single-bot model means students don't generate Slack-side
//      events directly. Tutors who post in Slack natively are a
//      future-iteration concern (would need retroactive
//      moderation + sync to chat_messages); for now those posts
//      simply don't appear in Karman's UI.
//
// Signature verification per Slack docs:
//   sig = HMAC-SHA256(signing_secret, "v0:" + ts + ":" + raw_body)
//   compare to header `x-slack-signature` (which is `v0=<sig>`).
// Reject if ts is more than 5 minutes off real time (replay
// protection). Constant-time compare.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";

const REPLAY_WINDOW_SECONDS = 5 * 60;

function verifySlackSignature(
  rawBody: string,
  timestamp: string,
  signatureHeader: string,
  secret: string
): boolean {
  // Replay-protection: stale timestamps rejected even if the signature
  // would otherwise match.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const skew = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (skew > REPLAY_WINDOW_SECONDS) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const expected = "v0=" + crypto.createHmac("sha256", secret).update(base).digest("hex");
  if (expected.length !== signatureHeader.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

interface SlackUrlVerification {
  type: "url_verification";
  token: string;
  challenge: string;
}

interface SlackEventCallback {
  type: "event_callback";
  team_id: string;
  api_app_id: string;
  event: {
    type: string;
    [key: string]: unknown;
  };
  event_id: string;
  event_time: number;
}

type SlackInbound = SlackUrlVerification | SlackEventCallback;

export async function POST(req: NextRequest) {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) {
    console.error("[slack-webhook] SLACK_SIGNING_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const raw = await req.text();
  let parsed: SlackInbound;
  try {
    parsed = JSON.parse(raw) as SlackInbound;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 1. URL verification challenge — Slack expects a plaintext
  //    response with the challenge token to confirm the URL.
  //    No signature on this request (Slack hasn't recorded the
  //    secret as ours yet).
  if (parsed.type === "url_verification") {
    return new NextResponse(parsed.challenge, {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  }

  // 2. Real event — verify signature.
  const ts = req.headers.get("x-slack-request-timestamp");
  const sig = req.headers.get("x-slack-signature");
  if (!ts || !sig) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
  }
  if (!verifySlackSignature(raw, ts, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (parsed.type === "event_callback") {
    const evt = parsed.event;
    // Single-bot model: most events don't require action.
    //   message.channels  — tutor posted natively in Slack. Future:
    //                       sync back to chat_messages with retroactive
    //                       moderation. For MVP we ignore.
    //   member_joined_channel / member_left_channel — informational
    //                       only; cohort_members in Supabase is the
    //                       source of truth, not Slack membership.
    console.log(
      `[slack-webhook] event=${evt.type} event_id=${parsed.event_id} (no-op in single-bot MVP)`
    );
  }

  return NextResponse.json({ received: true });
}
