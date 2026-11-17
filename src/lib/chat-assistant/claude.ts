import "server-only";
/*
 * The one place the after-hours assistant calls Claude. Server only: the API key never reaches a
 * browser. Tests pass a fake `ask`, so no test calls the API.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { karmanFacts } from "./facts";
import {
  CHAT_ASSISTANT_MODEL,
  FALLBACK_REPLY,
  buildSystemPrompt,
  buildUserPrompt,
  chatAssistantOutput,
  type ChatAssistantInput,
  type ChatAssistantOutput,
} from "./model";

export type AskAssistant = (system: string, user: string) => Promise<ChatAssistantOutput | null>;

let client: Anthropic | null = null;

const askClaude: AskAssistant = async (system, user) => {
  client ??= new Anthropic({ timeout: 30_000, maxRetries: 1 });
  const response = await client.messages.parse({
    model: CHAT_ASSISTANT_MODEL,
    max_tokens: 4000,
    // it thinks before answering (a worked solution has to be right); medium is this model's default
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: zodOutputFormat(chatAssistantOutput) },
    // the instructions and facts are the same for every student, so they are cached
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
    console.error("[chat-assistant] no answer:", response.stop_reason);
    return null;
  }
  const parsed = chatAssistantOutput.safeParse(response.parsed_output);
  return parsed.success ? parsed.data : null;
};

/** Answers one student message. It never throws: when no answer can be had, the student is told
 *  the tutor will answer, and the tutor is asked to. */
export async function answerAfterHours(
  input: ChatAssistantInput,
  ask: AskAssistant = askClaude
): Promise<ChatAssistantOutput> {
  try {
    const answer = await ask(buildSystemPrompt(karmanFacts()), buildUserPrompt(input));
    if (answer) return answer;
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) console.error("[chat-assistant] rate limited");
    else if (error instanceof Anthropic.AuthenticationError)
      console.error("[chat-assistant] API key refused");
    else if (error instanceof Anthropic.APIError)
      console.error(`[chat-assistant] API error ${error.status}:`, error.message);
    else
      console.error(
        "[chat-assistant] call failed:",
        error instanceof Error ? error.message : error
      );
  }
  return { reply: FALLBACK_REPLY, needs_tutor: true, urgent: false };
}
