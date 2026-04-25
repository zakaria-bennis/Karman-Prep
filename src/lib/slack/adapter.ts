// ============================================================
// Slack adapter — THE ONLY FILE in the codebase allowed to call
// the Slack Web API directly. Add new functions here rather than
// importing @slack/web-api anywhere else.
//
// Architecture: single-bot model (see project_slack_chat.md).
// One Slack bot identity authenticated by SLACK_BOT_TOKEN posts
// every Strata student message. Display names are prefixed in
// the message body so attribution is preserved when tutors or
// admins read a channel natively in Slack.
//
// What's NOT here (intentionally):
//   · provisionSlackUser / openDmChannel — students never get
//     Slack identities; DMs live entirely in Supabase.
//   · inviteUserToChannel / removeUserFromChannel — same reason.
//   · muteUser — mutes are enforced by the API route checking
//     the channel_mutes table; no Slack-side equivalent needed.
//
// Required SLACK_BOT_TOKEN scopes:
//   · channels:manage   (create/archive private channels)
//   · channels:read
//   · chat:write        (post + delete messages)
//   · pins:write        (pin/unpin tutor-highlighted answers)
//   · reactions:write   (future: tutor reactions)
//   · users:read        (resolve workspace tutor identities)
//   · users:read.email  (map a tutor's Slack id to their email)
// ============================================================

import { WebClient } from "@slack/web-api";
import {
  type CreateChannelInput,
  type CreateChannelResult,
  type PostMessageInput,
  type PostMessageResult,
  SlackAdapterError,
} from "./types";

let cachedClient: WebClient | null = null;

function getClient(): WebClient {
  if (cachedClient) return cachedClient;
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new SlackAdapterError("init", "SLACK_BOT_TOKEN_NOT_SET");
  }
  cachedClient = new WebClient(token);
  return cachedClient;
}

function logCall(operation: string, args: Record<string, string | number | undefined>): number {
  const ts = new Date().toISOString();
  const argStr = Object.entries(args)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  console.log(`[slack-adapter] ${ts} ${operation} ${argStr}`);
  return Date.now();
}

function logDone(operation: string, startedAt: number, extra?: string): void {
  console.log(
    `[slack-adapter] ${operation} done in ${Date.now() - startedAt}ms${extra ? ` ${extra}` : ""}`
  );
}

/** Sanitize a free-form cohort slug into Slack's channel-name rules:
 *  lowercase, only [a-z0-9-_], no leading/trailing dashes, max 80. */
function sanitizeChannelName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Compose the actual Slack channel name from a cohort slug + type.
 *  Pattern:  strata-<slug>-{chat|qa}. Strata UI displays the cohort's
 *  human-friendly name (chat_channels.display_name) — never this slug. */
function composeChannelName(input: CreateChannelInput): string {
  const slug = sanitizeChannelName(input.cohortSlug);
  const suffix = input.type === "qa" ? "qa" : "chat";
  return sanitizeChannelName(`strata-${slug}-${suffix}`);
}

// ─────────────────────────────────────────────────────────────
// Public surface
// ─────────────────────────────────────────────────────────────

/** Create a private Slack channel for a cohort's chat or Q&A.
 *  The bot is the only initial member. Tutors are added later
 *  manually if they want native Slack access. */
export async function createCohortChannel(
  input: CreateChannelInput
): Promise<CreateChannelResult> {
  const name = composeChannelName(input);
  const startedAt = logCall("createCohortChannel", { name });
  try {
    const res = await getClient().conversations.create({
      name,
      is_private: true,
    });
    if (!res.ok || !res.channel?.id || !res.channel.name) {
      throw new SlackAdapterError("createCohortChannel", res.error, res);
    }
    logDone("createCohortChannel", startedAt, `id=${res.channel.id}`);
    return { channelId: res.channel.id, channelName: res.channel.name };
  } catch (err) {
    if (err instanceof SlackAdapterError) throw err;
    throw new SlackAdapterError("createCohortChannel", (err as Error).message, err);
  }
}

/** Post a message to a channel as the bot, prefixing with the
 *  sender's display name so attribution shows up natively in Slack.
 *  Image URLs are appended as links — Slack auto-unfurls supported
 *  image MIME types inline. */
export async function postMessage(
  input: PostMessageInput
): Promise<PostMessageResult> {
  const startedAt = logCall("postMessage", { channel: input.channelId });
  const lines: string[] = [`*${input.displayName}:* ${input.content}`];
  for (const url of input.imageUrls ?? []) {
    lines.push(url);
  }
  try {
    const res = await getClient().chat.postMessage({
      channel: input.channelId,
      text: lines.join("\n"),
      unfurl_links: false,
      unfurl_media: true, // images render inline
    });
    if (!res.ok || !res.ts || !res.channel) {
      throw new SlackAdapterError("postMessage", res.error, res);
    }
    logDone("postMessage", startedAt, `ts=${res.ts}`);
    return { ts: res.ts, channelId: res.channel };
  } catch (err) {
    if (err instanceof SlackAdapterError) throw err;
    throw new SlackAdapterError("postMessage", (err as Error).message, err);
  }
}

/** Delete a previously-posted message. Used by the moderation
 *  pipeline when a human reviewer removes a flagged message
 *  (we then post the standard removal notice in its place). */
export async function deleteMessage(channelId: string, ts: string): Promise<void> {
  const startedAt = logCall("deleteMessage", { channel: channelId, ts });
  try {
    const res = await getClient().chat.delete({ channel: channelId, ts });
    if (!res.ok) throw new SlackAdapterError("deleteMessage", res.error, res);
    logDone("deleteMessage", startedAt);
  } catch (err) {
    if (err instanceof SlackAdapterError) throw err;
    throw new SlackAdapterError("deleteMessage", (err as Error).message, err);
  }
}

/** Pin a message in a channel — used for tutor-highlighted Q&A
 *  answers so they surface to the top in Strata's UI and in Slack. */
export async function pinMessage(channelId: string, ts: string): Promise<void> {
  const startedAt = logCall("pinMessage", { channel: channelId, ts });
  try {
    const res = await getClient().pins.add({ channel: channelId, timestamp: ts });
    if (!res.ok) throw new SlackAdapterError("pinMessage", res.error, res);
    logDone("pinMessage", startedAt);
  } catch (err) {
    if (err instanceof SlackAdapterError) throw err;
    throw new SlackAdapterError("pinMessage", (err as Error).message, err);
  }
}

export async function unpinMessage(channelId: string, ts: string): Promise<void> {
  const startedAt = logCall("unpinMessage", { channel: channelId, ts });
  try {
    const res = await getClient().pins.remove({ channel: channelId, timestamp: ts });
    if (!res.ok) throw new SlackAdapterError("unpinMessage", res.error, res);
    logDone("unpinMessage", startedAt);
  } catch (err) {
    if (err instanceof SlackAdapterError) throw err;
    throw new SlackAdapterError("unpinMessage", (err as Error).message, err);
  }
}

/** Archive a channel — used when a cohort is marked completed.
 *  Archived channels are read-only and don't count against Slack's
 *  channel quota. */
export async function archiveChannel(channelId: string): Promise<void> {
  const startedAt = logCall("archiveChannel", { channel: channelId });
  try {
    const res = await getClient().conversations.archive({ channel: channelId });
    if (!res.ok) throw new SlackAdapterError("archiveChannel", res.error, res);
    logDone("archiveChannel", startedAt);
  } catch (err) {
    if (err instanceof SlackAdapterError) throw err;
    throw new SlackAdapterError("archiveChannel", (err as Error).message, err);
  }
}
