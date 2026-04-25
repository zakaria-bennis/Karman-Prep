// ============================================================
// Slack adapter barrel — `import { ... } from "@/lib/slack"`
// ============================================================

export {
  createCohortChannel,
  postMessage,
  deleteMessage,
  pinMessage,
  unpinMessage,
  archiveChannel,
} from "./adapter";

export {
  type CreateChannelInput,
  type CreateChannelResult,
  type PostMessageInput,
  type PostMessageResult,
  type SlackChannelType,
  SlackAdapterError,
} from "./types";
