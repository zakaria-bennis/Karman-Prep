// ============================================================
// Deterministic client_msg_id for chat sends.
//
// Audit issue #5: if Slack received the message but our response
// timed out, the user clicks Send again and we double-post. We
// solve this by giving every logical send the SAME client_msg_id,
// so:
//   · Slack dedupes natively via chat.postMessage's client_msg_id
//     parameter (no duplicate message in Slack).
//   · Our DB rejects the second insert via the partial unique index
//     on (channel_id, client_msg_id) / (sender, recipient, client_msg_id),
//     so the chat-send route detects the duplicate and returns the
//     existing row instead of re-running the pipeline.
//
// The id is deterministic: same content + sender + channel within
// a 60-second window produces the same UUID. After the window the
// user can legitimately resend identical content (e.g. emphasis or
// asking a stuck tutor again) and we don't block it.
// ============================================================

import { createHash } from "node:crypto";

const WINDOW_MS = 60_000;

export interface DedupeContext {
  senderUuid: string;
  /** chat_channels.id for channel sends, or null for DMs (use recipientUuid). */
  channelId: string | null;
  /** users.id of the recipient for DMs, or null for channel sends. */
  recipientUuid?: string | null;
  content: string;
  /** Image URLs in the order they were attached — order matters
   *  because a different order is a different message in practice. */
  mediaUrls: string[];
  /** Reference clock for testing. Defaults to Date.now(). */
  now?: () => number;
}

/** SHA-1 hash of the dedupe inputs, formatted as a UUID-shaped string
 *  so it slots cleanly into a Postgres UUID column. The 60-second
 *  bucket means rapid double-clicks share a key; a legitimate resend
 *  more than a minute later gets a fresh one. */
export function deriveClientMsgId(ctx: DedupeContext): string {
  const now = ctx.now ? ctx.now() : Date.now();
  const minuteBucket = Math.floor(now / WINDOW_MS);
  const parts = [
    ctx.senderUuid,
    ctx.channelId ?? "",
    ctx.recipientUuid ?? "",
    ctx.content,
    ctx.mediaUrls.join("|"),
    String(minuteBucket),
  ].join("\x1F"); // unit separator; never appears in any field
  const hex = createHash("sha1").update(parts).digest("hex");
  // Format the first 32 hex chars as a v4-ish UUID. Not a true v4
  // (no random bits), but the layout is what Postgres + Slack accept.
  return (
    hex.slice(0, 8) +
    "-" +
    hex.slice(8, 12) +
    "-" +
    hex.slice(12, 16) +
    "-" +
    hex.slice(16, 20) +
    "-" +
    hex.slice(20, 32)
  );
}
