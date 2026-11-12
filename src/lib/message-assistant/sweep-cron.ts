import "server-only";
/*
 * The cron's catch-up for the message assistant: any family whose newest message hasn't been
 * read yet gets read and a draft. Off unless MESSAGE_ASSISTANT=on with an Anthropic key. It only
 * writes triage rows and drafts; nothing goes to a family. Never throws.
 */
import { claudeAssistant } from "./claude";
import { isAssistantOn, sweepFamilies } from "./server";

export async function runAssistantSweepNow(): Promise<{ read: number; skipped: number } | null> {
  if (!isAssistantOn()) return null;
  try {
    return await sweepFamilies(claudeAssistant());
  } catch (error) {
    console.error(
      "[message-assistant] sweep failed",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}
