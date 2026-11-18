import "server-only";
// The after-hours assistant's place in a student's chat with their tutor (founder, 2026-11-16).
// From 9 PM to 9 AM Central, a student's message to their tutor is answered at once by the
// assistant. The answer is kept in the same chat, marked as written by the assistant and never as
// the tutor, and the tutor reads everything in the morning. When the student may be in danger, the
// team is emailed at once.
import { resend, FROM } from "@/lib/integrations/resend/client";
import { sendCheckedEmail } from "@/lib/integrations/resend/send-checked-email";
import { createAdminClient } from "@/lib/supabase/server";
import { insertDirectMessage, listDirectMessages } from "@/lib/supabase/queries/chat";
import { questionOf } from "@/lib/chat/extras";
import type { SharedQuestion } from "@/lib/chat/shared";
import { answerAfterHours, type AskAssistant } from "./claude";
import { chatAssistantEnabled, isAfterHours, type ChatAssistantInput } from "./model";

/** True when a student's message to their tutor should be answered by the assistant now. */
export const assistantAnswersNow = (now: Date = new Date()): boolean =>
  chatAssistantEnabled(process.env) && isAfterHours(now);

/** The chat so far, as the assistant reads it: the newest dozen messages, oldest first. */
export function threadFor(
  rows: {
    sender_id: string;
    content: string | null;
    from_assistant?: boolean;
    moderation_status: string;
  }[],
  studentUuid: string
): ChatAssistantInput["thread"] {
  return rows
    .filter((row) => row.moderation_status === "approved" && row.content)
    .slice(0, 12)
    .reverse()
    .map((row) => ({
      from: row.sender_id === studentUuid ? "student" : row.from_assistant ? "assistant" : "tutor",
      text: row.content ?? "",
    }));
}

export async function answerInTutorChat(args: {
  studentUuid: string;
  tutorUuid: string;
  cohortId: string | null;
  /** The message just sent; it is left out of the chat so far. */
  messageId: string;
  message: string;
  question?: SharedQuestion | null;
  ask?: AskAssistant;
}): Promise<void> {
  const supa = createAdminClient();
  const [{ data: people }, rows] = await Promise.all([
    supa.from("users").select("id, first_name").in("id", [args.studentUuid, args.tutorUuid]),
    listDirectMessages({ userUuidA: args.studentUuid, userUuidB: args.tutorUuid, limit: 14 }),
  ]);
  const first = (uuid: string) => (people ?? []).find((p) => p.id === uuid)?.first_name ?? null;
  const earlier = rows.filter((row) => row.id !== args.messageId);
  // a question sent a moment ago with no words of its own is the one being asked about
  const question = args.question ?? questionOf(rows.find((row) => row.question)?.question) ?? null;

  const answer = await answerAfterHours(
    {
      studentFirstName: first(args.studentUuid),
      tutorFirstName: first(args.tutorUuid),
      thread: threadFor(earlier, args.studentUuid),
      message: args.message || "(The student sent a question with no message.)",
      question: question
        ? {
            skill: question.skill,
            section: question.section,
            prompt: question.prompt,
            choices: question.choices,
          }
        : null,
    },
    args.ask
  );

  await insertDirectMessage({
    sender_id: args.tutorUuid,
    recipient_id: args.studentUuid,
    cohort_id: args.cohortId,
    content: answer.reply,
    media_urls: [],
    moderation_status: "approved",
    keyword_flagged: false,
    ai_flagged: false,
    ai_flag_reason: null,
    rejection_message: null,
    from_assistant: true,
  });

  if (answer.urgent) {
    const to = process.env.MODERATION_ALERT_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL;
    if (!to) {
      console.error("[chat-assistant] urgent message, and no alert address is set");
      return;
    }
    await sendCheckedEmail(resend, {
      from: FROM,
      to,
      subject: "Urgent: a student may need help now",
      text: [
        `${first(args.studentUuid) ?? "A student"} wrote to their tutor after hours, and the assistant judged that a person should be told at once.`,
        "",
        "Open the student's chat with their tutor to read it. The message is not copied here.",
      ].join("\n"),
    }).catch((error: unknown) =>
      console.error("[chat-assistant] urgent alert was not sent:", error)
    );
  }
}
