// ============================================================
// Cohort Slack-channel provisioning.
//
// Idempotent: ensureCohortChannels(cohortId) creates the two
// Slack channels (chat + qa) for a cohort and writes them to
// chat_channels. No-op if channels already exist for that cohort.
//
// Called from:
//   1. /api/stripe/webhook — after restoreLastCohort assigns a
//      student to a cohort, ensure its channels exist so the
//      student lands in chat-ready state.
//   2. /api/cohorts/provision — admin-triggered manual trigger
//      for cohorts that exist but lack channels (e.g. created
//      before this feature shipped).
//
// Single-bot model: students never get added to channels
// individually — the bot is the only Slack-side member, and
// access is gated by Karman's RLS via cohort_members.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import {
  createCohortChannel,
  SlackAdapterError,
  type CreateChannelResult,
} from "@/lib/slack";
import {
  findChannelsByCohort,
  insertChatChannel,
} from "@/lib/supabase/queries/chat";

export interface EnsureChannelsResult {
  cohortChatChannelId: string;
  qaChannelId: string;
  /** Which channels were freshly created in this call (0, 1, or 2). */
  createdNow: number;
}

/** Create the two Slack channels for a cohort if they don't exist
 *  yet. Returns both channel ids regardless of whether they were
 *  created now or already existed. */
export async function ensureCohortChannels(cohortId: string): Promise<EnsureChannelsResult | null> {
  const supabase = createAdminClient();

  const { data: cohort, error: cErr } = await supabase
    .from("cohorts")
    .select("id, name, tier")
    .eq("id", cohortId)
    .maybeSingle();
  if (cErr) {
    console.error("[chat-provisioning] cohort lookup failed:", cErr);
    return null;
  }
  if (!cohort) {
    console.warn(`[chat-provisioning] cohort ${cohortId} not found`);
    return null;
  }

  // Slack channel SLUG basis = sanitized cohort name. We sanitize
  // again inside the adapter, so any weirdness in the cohort name
  // is normalized at insert time.
  const cohortSlug = (cohort.name as string).replace(/\s+/g, "-").toLowerCase();
  const cohortDisplay = cohort.name as string;

  const existing = await findChannelsByCohort(cohortId);
  const existingByType = new Map(existing.map((c) => [c.channel_type, c]));

  let chatChannel = existingByType.get("cohort_chat") ?? null;
  let qaChannel = existingByType.get("qa") ?? null;
  let createdNow = 0;

  // Create chat channel if missing
  if (!chatChannel) {
    let slackResp: CreateChannelResult | null = null;
    try {
      slackResp = await createCohortChannel({ cohortSlug, type: "cohort_chat" });
    } catch (err) {
      const isAdapter = err instanceof SlackAdapterError;
      console.error(
        `[chat-provisioning] cohort_chat slack create failed (cohort=${cohortId}):`,
        isAdapter ? err.toString() : err
      );
    }
    if (slackResp) {
      try {
        chatChannel = await insertChatChannel({
          slack_channel_id: slackResp.channelId,
          cohort_id: cohortId,
          channel_type: "cohort_chat",
          display_name: cohortDisplay,
        });
        createdNow += 1;
      } catch (err) {
        console.error(
          `[chat-provisioning] cohort_chat row insert failed (cohort=${cohortId}):`,
          err
        );
      }
    }
  }

  // Create Q&A channel if missing
  if (!qaChannel) {
    let slackResp: CreateChannelResult | null = null;
    try {
      slackResp = await createCohortChannel({ cohortSlug, type: "qa" });
    } catch (err) {
      const isAdapter = err instanceof SlackAdapterError;
      console.error(
        `[chat-provisioning] qa slack create failed (cohort=${cohortId}):`,
        isAdapter ? err.toString() : err
      );
    }
    if (slackResp) {
      try {
        qaChannel = await insertChatChannel({
          slack_channel_id: slackResp.channelId,
          cohort_id: cohortId,
          channel_type: "qa",
          display_name: `${cohortDisplay} — Q&A`,
        });
        createdNow += 1;
      } catch (err) {
        console.error(
          `[chat-provisioning] qa row insert failed (cohort=${cohortId}):`,
          err
        );
      }
    }
  }

  if (!chatChannel || !qaChannel) {
    console.warn(
      `[chat-provisioning] partial provisioning for cohort ${cohortId} (chat=${!!chatChannel} qa=${!!qaChannel})`
    );
    return null;
  }

  return {
    cohortChatChannelId: chatChannel.id,
    qaChannelId: qaChannel.id,
    createdNow,
  };
}
