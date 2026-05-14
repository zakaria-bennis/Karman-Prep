// ============================================================
// sendRecapEmail — wraps SessionRecap React Email template +
// Resend send call. Returns the Resend message id (or throws).
//
// Single email with multiple recipients (To: list). The parents
// + student all get the same body — the email IS the recap.
// ============================================================

import { render } from "@react-email/components";
import { resend, FROM } from "./client";
import { SessionRecap, type SessionRecapProps } from "@/emails/SessionRecap";

export interface SendRecapInput {
  to: string[];
  /** Bookings's tutor — used for ReplyTo so parent replies hit the tutor. */
  tutorEmail: string | null;
  subject: string;
  props: SessionRecapProps;
}

export interface SendRecapResult {
  /** Resend message id (one per send call, even with multiple To addresses). */
  messageId: string;
}

export async function sendRecapEmail(input: SendRecapInput): Promise<SendRecapResult> {
  if (input.to.length === 0) throw new Error("no_recipients");

  const html = await render(SessionRecap(input.props));

  const result = await resend.emails.send({
    from: FROM,
    to: input.to,
    subject: input.subject,
    html,
    ...(input.tutorEmail ? { replyTo: input.tutorEmail } : {}),
  });

  if (result.error) {
    throw new Error(`resend_failed: ${result.error.message}`);
  }
  if (!result.data?.id) throw new Error("resend_no_id");
  return { messageId: result.data.id };
}
