import "server-only";
/*
 * The one place the message assistant calls Claude. Server only: the API key never reaches a
 * browser. Tests pass a fake AssistantClient instead, so no test calls the API.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import {
  ASSISTANT_MODEL,
  SYSTEM_PROMPT,
  assistantOutput,
  buildAssistantPrompt,
  type AssistantInput,
  type AssistantOutput,
} from "./model";

export interface AssistantClient {
  /** Reads one conversation. Null when Claude declined or the answer didn't fit the schema. */
  read(input: AssistantInput): Promise<{ output: AssistantOutput; model: string } | null>;
}

let client: Anthropic | null = null;

/** The real client: Claude Opus 5.5 with structured output, falling back on a refusal. */
export function claudeAssistant(): AssistantClient {
  return {
    async read(input) {
      client ??= new Anthropic({ timeout: 90_000, maxRetries: 2 });
      try {
        const response = await client.beta.messages.parse({
          model: ASSISTANT_MODEL,
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "medium", format: betaZodOutputFormat(assistantOutput) },
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildAssistantPrompt(input) }],
        });
        if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
          console.error("[assistant] no answer:", response.stop_reason);
          return null;
        }
        const parsed = assistantOutput.safeParse(response.parsed_output);
        if (!parsed.success) {
          console.error("[assistant] answer didn't fit the schema");
          return null;
        }
        return { output: parsed.data, model: response.model };
      } catch (error) {
        if (error instanceof Anthropic.RateLimitError) console.error("[assistant] rate limited");
        else if (error instanceof Anthropic.AuthenticationError)
          console.error("[assistant] API key refused");
        else if (error instanceof Anthropic.APIError)
          console.error(`[assistant] API error ${error.status}:`, error.message);
        else
          console.error("[assistant] call failed:", error instanceof Error ? error.message : error);
        return null;
      }
    },
  };
}
