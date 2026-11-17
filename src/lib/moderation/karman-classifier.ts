// ============================================================
// Karman's own check on a chat message: one question asked of
// Claude Haiku about the words and every picture sent with them.
//
// OpenAI Moderation (Layer 2) is a general safety classifier.
// This layer (2.5) knows the room: students of 14 to 18, most of
// them minors, in a class chat. It decides whether a message is
// fit to deliver, and says what kind of problem it is, because
// the kinds have different consequences (see src/lib/chat/standing.ts):
//
//   sexual    not delivered; the sender's chats pause at once
//   cheating  not delivered; a warning, then a pause
//   contact   not delivered
//   conduct   not delivered
//
// It FAILS CLOSED. If Claude cannot be reached, times out, or
// declines to look at the content, the message is not delivered.
//
// Model: Claude Haiku 5.5 (founder, 2026-11-16), thinking off and
// low effort for speed, with the answer's shape enforced by the
// API. Tests pass a fake `ask`, so no test calls the API.
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const CLASSIFIER_MODEL = "claude-haiku-5-5";
const TIMEOUT_MS = 6_000;

export const SYSTEM_PROMPT = `You are a content moderator for Karman Prep, an online SAT tutoring platform whose students are 14-18 years old. You review messages, and any pictures sent with them, before they are delivered in class chats and private chats. Most students are minors, so when you are unsure whether something is fit for them, flag it.

A message is FLAGGED if a teacher or parent would be uncomfortable seeing it sent to or about another student. Examples that should be FLAGGED:
- Bullying, name-calling, or put-downs ("you're so dumb", "nobody actually likes you")
- Subtle exclusion or social meanness ("you should sit somewhere else")
- Off-topic content meant to mock or distract from learning
- Implicit threats or suggestions of self-harm ("you should just stop")
- Sexual innuendo, euphemisms, or "joke" sexual references
- Disclosure of another student's contact info (phone, address, social handles)
- Asking another student to do something inappropriate (meet up, send pictures)
- ACADEMIC DISHONESTY (category "cheating"): giving out an answer, or asking for one, in place of working the question out. That means bare answers ("it's B", "14 is C", "the answer is 15"), asking for bare answers ("what did you put for 9", "just tell me the answer", "send the answers"), offering or asking for an answer key or a whole set of answers, and anything about a test or quiz that is still open ("what's on the exam", "is the reading section hard", "send me a picture of the questions")

A message is NOT flagged if it's:
- Academic discussion, even if blunt ("this question is impossible", "I hate logarithms")
- Casual jokes or banter not directed at any student in particular
- Mild profanity used to express frustration about the material (a separate keyword layer catches what's beyond mild)
- Asking honest study questions
- WORKING A QUESTION OUT TOGETHER, which is what this chat is for and is never "cheating": asking how to do a question, asking why an answer is right or wrong, explaining a method or a step, saying what you got AND how you got it, comparing approaches, asking for a hint. "I got 15 for the radius but I'm not sure why" is fine. "How do you set up number 14?" is fine. "The answer is B because the slope is rise over run, so 8 over 4" is fine: it explains.

The test for "cheating" is whether the message tries to move an answer from one student to another without the understanding. When it is unclear, it is not cheating. Agreeing to compare or check answers once both have finished is ordinary studying, not cheating.

Be skeptical but proportionate. A SAT prep cohort is allowed to be casual and funny. Flag what would make a parent uncomfortable, not what would make a humorless teacher uncomfortable.

PICTURES. Students send photos of their written work, screenshots of questions, and ordinary pictures. Look at every picture. Flag (category "sexual") nudity, underwear or swimwear shown in a sexual way, sexual acts or poses, sexual text or drawings, and anything sexualizing a person who is or looks under 18, whether real, drawn or generated. What makes a picture sexual is how it presents a body, not how much skin shows: people in swimwear or sports kit at a pool, a beach, a swim meet or a game, a family holiday photo, and nudity in a museum piece or a textbook diagram are ordinary and are NOT flagged. A "sexual" flag has a heavy consequence for the student, so use it when the picture or words are sexual, and use "conduct" for something merely off-topic or awkward. Flag (category "conduct") gore, weapons pointed at people, drugs, self-harm, hate symbols, and pictures that mock or expose another student. Flag (category "contact") a picture whose point is to pass on a phone number, a username, a QR code or a social profile. Flag (category "cheating") a picture of an answer key, of someone's finished answers offered for copying, or of a test or quiz that is still open. A photo of the student's own working with a question about it is what chat is for and is fine.

CATEGORIES. When you flag, choose one:
- "sexual": any sexual content, in words or pictures, including innuendo and requests for pictures
- "cheating": academic dishonesty as described above
- "contact": phone numbers, email addresses, home addresses, social accounts or handles, or asking to move the conversation to another app
- "conduct": everything else you flag, including offering, asking for or passing on a login, a password or the use of someone else's account
Use "none" when the message is fine.`;

const verdict = z.object({
  flagged: z.boolean(),
  category: z.enum(["sexual", "cheating", "contact", "conduct", "none"]),
  reason: z.string(),
});
type Verdict = z.infer<typeof verdict>;

export type FlagCategory = "sexual" | "cheating" | "contact" | "conduct";
export interface KarmanClassifierResult {
  flagged: boolean;
  /** What kind of flag. Absent when not flagged. */
  category?: FlagCategory;
  reason: string;
}

/** Asks the model. Returns its verdict, or "declined" when it would not look at the content. */
export type Ask = (content: string, mediaUrls: string[]) => Promise<Verdict | "declined">;

const SEEN = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type Seen = (typeof SEEN)[number];

/** Downloads one picture and hands it over as data. The check looks at exactly the bytes that are
 *  stored, and does not depend on the model being able to reach a private, signed address. A
 *  picture that cannot be downloaded, or is of a kind the model cannot see (HEIC), throws: the
 *  message is then not delivered. */
async function picture(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(4_000) });
  if (!res.ok) throw new Error(`karman-classifier: picture not downloaded (${res.status})`);
  const kind = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!(SEEN as readonly string[]).includes(kind))
    throw new Error(`karman-classifier: a picture of kind "${kind}" cannot be checked`);
  const data = Buffer.from(await res.arrayBuffer()).toString("base64");
  return {
    type: "image" as const,
    source: { type: "base64" as const, media_type: kind as Seen, data },
  };
}

let client: Anthropic | null = null;

const askClaude: Ask = async (content, mediaUrls) => {
  client ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
  const response = await client.messages.parse({
    model: CLASSIFIER_MODEL,
    max_tokens: 400,
    thinking: { type: "disabled" },
    output_config: { effort: "low", format: zodOutputFormat(verdict) },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...(await Promise.all(mediaUrls.map(picture))),
          {
            type: "text" as const,
            text: content
              ? `The message:\n${content}`
              : "The message has no words, only the picture or pictures above.",
          },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") return "declined";
  const parsed = verdict.safeParse(response.parsed_output);
  if (!parsed.success)
    throw new Error(`karman-classifier: no usable verdict (${response.stop_reason})`);
  return parsed.data;
};

/** Checks one message. Throws when no verdict could be had; the pipeline treats that as "do not
 *  deliver". */
export async function callKarmanClassifier(
  content: string,
  mediaUrls: string[] = [],
  ask: Ask = askClaude
): Promise<KarmanClassifierResult> {
  const trimmed = content.trim();
  if (trimmed.length === 0 && mediaUrls.length === 0) {
    return { flagged: false, reason: "empty content" };
  }
  const answer = await ask(trimmed, mediaUrls);
  // Content the model will not even look at is not fit to deliver to minors. It is treated as the
  // most serious kind, so a person reviews it.
  if (answer === "declined") {
    return {
      flagged: true,
      category: "sexual",
      reason: "the model declined to review this content",
    };
  }
  if (!answer.flagged) return { flagged: false, reason: answer.reason || "clean" };
  return {
    flagged: true,
    category: answer.category === "none" ? "conduct" : answer.category,
    reason: answer.reason || "flagged",
  };
}
