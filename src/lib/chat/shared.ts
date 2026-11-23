// What is the same on the server and in the browser for Chat's extras.
import { z } from "zod";

/** The longest message a student, tutor or parent may send (2026-11-22: there was no limit, and the
 *  database has a 500 MB cap). The box stops typing there; the server refuses anything longer. */
export const MESSAGE_MAX = 2000;

/** Every reaction a message can be given (drawn in src/app/dashboard/student/_portal/ChatEmoji.tsx). */
export const REACTIONS = [
  "up",
  "down",
  "wow",
  "what",
  "ha",
  "check",
  "cross",
  "fire",
  "hundred",
  "eyes",
  "bot",
  "party",
  "star",
  "bulb",
  "rocket",
  "target",
  "brain",
  "sweat",
  "fear",
  "cool",
] as const;

/** A question sent with a message, kept as it looked when it was sent. */
export const sharedQuestionSchema = z.object({
  skill: z.string().min(1).max(120),
  section: z.enum(["Reading and Writing", "Math"]),
  from: z.string().max(120),
  prompt: z.string().min(1).max(4000),
  choices: z.array(z.string().max(600)).max(6),
  flagged: z.boolean(),
});
export type SharedQuestion = z.infer<typeof sharedQuestionSchema>;

/** The question's words, as the check reads them along with the message. */
export const questionText = (q: SharedQuestion): string =>
  ["[A practice question sent with this message]", q.prompt, ...q.choices].join("\n");

/** Where someone is typing: a class's channel, or a private chat with one person. */
export const typingPlace = {
  channel: (channelId: string) => `channel:${channelId}`,
  dm: (otherUuid: string) => `dm:${otherUuid}`,
};
