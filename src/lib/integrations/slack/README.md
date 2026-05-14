# Slack adapter — setup

This module owns every direct call to the Slack Web API. Anything that needs to talk to Slack imports from `@/lib/slack` — never from `@slack/web-api` directly.

## Architecture: single-bot

Karman uses a **single Slack bot identity** to post every chat message on a student's behalf. Students never log in to Slack and never get Slack identities. Tutors and admins can optionally be added to the workspace as paid members so they can read channels natively; if not, they read everything through Karman's UI.

The bot prefixes each message with the student's display name (`*FirstName L.:* content...`) so attribution is preserved when read in Slack. DMs are stored entirely in Supabase since students have no Slack identity to DM each other with.

This design means our Slack workspace cost is **flat** (one bot, one workspace) regardless of how many students sign up.

## One-time Slack app setup

1. Create a workspace at https://slack.com if you don't have one. The workspace owner manages billing.
2. Go to https://api.slack.com/apps → **Create New App** → **From Scratch**.
   - App name: `Karman`
   - Workspace: pick yours
3. **OAuth & Permissions** tab → **Scopes** → **Bot Token Scopes** → add:
   - `channels:manage` — create + archive PUBLIC channels
   - `channels:read` — list public channels
   - `groups:write` — **REQUIRED** to create + archive private channels (cohort channels are private)
   - `groups:read` — list private channels (for the lookup-existing flow)
   - `groups:history` — read message history from private channels (only matters if you wire up the message.channels webhook later)
   - `chat:write` — post + delete messages
   - `pins:write` — pin tutor-highlighted Q&A answers
   - `reactions:write` — future
   - `users:read` — resolve tutor identities in the workspace
   - `users:read.email` — map a tutor's Slack id to their Karman email

   After adding new scopes, Slack will banner-prompt you to **Reinstall to Workspace** at the top of OAuth & Permissions. Reinstall — your bot token value stays the same, the scope set just widens.
4. **Install to Workspace** at the top of the OAuth page. Authorize.
5. **Bot User OAuth Token** appears (starts with `xoxb-`) → paste into `.env.local`:
   ```
   SLACK_BOT_TOKEN=xoxb-...
   ```
6. **Basic Information** tab → **App Credentials** → **Signing Secret** → paste into `.env.local`:
   ```
   SLACK_SIGNING_SECRET=...
   ```
7. **Event Subscriptions** tab → toggle **Enable Events** ON.
   - **Request URL**: `https://<your-domain>/api/webhooks/slack` (route shipped in P5).
     For local dev use ngrok or skip until deploy.
   - **Subscribe to bot events**: `message.channels`, `member_joined_channel`, `member_left_channel`.
8. Reinstall the app if Slack prompts after scope changes.

## Adapter functions (single-bot model)

| Function                            | When it's called                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| `createCohortChannel(input)`        | Cohort provisioning route, after Stripe payment clears for a seminar/small-group student. Creates a private channel named `strata-<slug>-{chat\|qa}`. |
| `postMessage(input)`                | Every successful message send (cohort chat, Q&A question, Q&A answer). The body is `*<displayName>:* <content>` plus image URLs on new lines. |
| `deleteMessage(channelId, ts)`      | Moderation pipeline when a human reviewer removes a flagged message. Followed by an in-channel "removed for guidelines violation" notice. |
| `pinMessage(channelId, ts)`         | Tutor pins an answer — surfaces to top of Karman Q&A board AND of the Slack channel.   |
| `unpinMessage(channelId, ts)`       | Tutor unpins.                                                                          |
| `archiveChannel(channelId)`         | Cohort marked completed — channel becomes read-only and stops counting against Slack's channel quota. |

## What's intentionally absent

- `provisionSlackUser` / `openDmChannel` — students don't have Slack identities, so there's no Slack-side DM channel to open. DMs live in `direct_messages` Supabase-only.
- `inviteUserToChannel` / `removeUserFromChannel` — same reason. Only the bot is in cohort channels by default; tutors get added manually via the Slack UI if they want native access.
- `muteUser` — mutes are enforced by the chat send route checking `channel_mutes` before posting. No Slack-side equivalent is needed since muted students never reach the Slack call.

If you find yourself needing to add Slack-API-shaped functions for these cases, first re-check whether you've drifted from the single-bot model — that's a meaningful product change.
