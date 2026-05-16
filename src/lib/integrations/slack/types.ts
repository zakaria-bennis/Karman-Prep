// ============================================================
// Slack adapter — TypeScript types.
// Only models the inputs/outputs Karman consumes. Slack returns
// much more on every call; we type what we use.
// ============================================================

export type SlackChannelType = "cohort_chat" | "qa";

export interface CreateChannelInput {
  /** Raw cohort slug to use as channel name basis. Will be sanitized
   *  to Slack's lowercase/hyphen/no-spaces rules and prefixed with
   *  `karman-`. */
  cohortSlug: string;
  /** Which kind of channel to create — drives the suffix. */
  type: SlackChannelType;
}

export interface CreateChannelResult {
  /** Slack's channel id (starts with C — store as
   *  chat_channels.slack_channel_id). */
  channelId: string;
  /** The actual channel name Slack assigned. May differ from input
   *  if the requested name was taken. */
  channelName: string;
}

export interface PostMessageInput {
  /** Slack channel id (the C... id, not the display name). */
  channelId: string;
  /** What appears as the sender prefix in Slack — "FirstName L." for
   *  attributed posts, "Anonymous" when the student opted in. */
  displayName: string;
  /** Plain-text message body. Slack auto-unfurls image URLs when
   *  unfurl_media is enabled, so attached images can be appended as
   *  links and they render inline. */
  content: string;
  /** Optional signed Supabase Storage URLs for image attachments. */
  imageUrls?: string[];
  /** Idempotency key — Slack dedupes by this value so calling the
   *  same chat.postMessage twice for the same logical send (e.g. a
   *  user clicking Send twice after our response timed out) doesn't
   *  produce two Slack messages. We derive it deterministically
   *  from (sender, content, channel, minute-bucket) in the caller. */
  clientMsgId?: string;
}

export interface PostMessageResult {
  /** Slack's per-message timestamp. Use as chat_messages.slack_message_ts. */
  ts: string;
  /** Echo of the channel id we posted to. */
  channelId: string;
}

export class SlackAdapterError extends Error {
  constructor(
    public readonly operation: string,
    public readonly slackError?: string,
    public readonly context?: unknown,
    message?: string
  ) {
    super(message ?? `slack-adapter:${operation} failed${slackError ? ` (${slackError})` : ""}`);
    this.name = "SlackAdapterError";
  }
}
