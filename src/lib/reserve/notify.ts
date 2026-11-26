// What a reservation tells people by email: the founder at each step, the family once the seat is
// paid, the parent once the student's account is ready. Plain text, so nothing typed into a form can
// run anywhere. None of these ever throws: a failed email must not fail a reservation. Server only.
import { after } from "next/server";
import { FROM, resend } from "@/lib/integrations/resend/client";
import { GUARANTEE, MARCH_PROGRAM as MP, formatPrice } from "@/lib/marketing/offer";
import { UNDECIDED } from "./programs";
import type { Reservation } from "./service";

export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** Emails go out once the visitor has their answer, so nobody watches a button while mail is sent
 *  (founder, 2026-11-25: paying must not sit on "Paying"). Outside a request (a test, a script) there
 *  is nothing to wait behind, so the work is simply done. */
export function later(work: () => Promise<unknown>): Promise<unknown> | void {
  try {
    after(work);
  } catch {
    return work();
  }
}

/** A plain-text note to the founder. Never throws: a failed email must not fail a reservation. */
export async function tellFounder(subject: string, lines: string[], replyTo?: string) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to || !process.env.RESEND_API_KEY) return;
  try {
    await resend.emails.send({ from: FROM, to, replyTo, subject, text: lines.join("\n") });
  } catch (e) {
    console.error("[reserve] founder email failed", e);
  }
}

/** "A1B2C3D4": the short reference a family can quote. */
export const referenceOf = (id: string) => id.slice(0, 8).toUpperCase();

export const describe = (r: Reservation) => [
  `Reference: ${referenceOf(r.id)}`,
  `Parent: ${r.parent_name ?? "not given yet"}`,
  `Email: ${r.parent_email}`,
  `Phone: ${r.parent_phone ?? "not given"}`,
  `Student: ${r.student_first_name ?? "not given yet"}`,
  `Filled in by: the ${r.filled_by}`,
  `Starting SAT score: ${r.start_score ?? "none yet (needs the placement test)"}`,
  `Cohort: ${r.program_id === UNDECIDED ? "NOT SURE of the SAT date: agree it with them" : (r.program_id ?? "not chosen yet")}`,
  `Paying: ${r.payment_option === "installments" ? "deposit and three payments" : r.payment_option === "full" ? "in full" : "not chosen yet"}`,
];

/** The family's next steps, by email. Plain text, so nothing typed into the form can run anywhere. */
export async function welcomeFamily(r: Reservation) {
  if (!process.env.RESEND_API_KEY) return;
  const link = `${appUrl()}/reserve/welcome?r=${r.claim_token}`;
  const portal = `${appUrl()}/reserve/parent?p=${r.parent_token}`;
  const lines = [
    `${r.student_first_name}'s seat is reserved. Welcome to Karman.`,
    `Your reference is ${referenceOf(r.id)}.`,
    "",
    "Get started, in this order:",
    // a seat the student reserved is already on the student's account; one a parent reserved comes
    // with the student's own link, given at the end of the questions
    r.filled_by === "student"
      ? `1. Answer a few quick questions, then open the portal. The seat is already on the account: ${link}`
      : `1. Answer a few quick questions about ${r.student_first_name}. At the end you get ${r.student_first_name}'s own link to send. ${r.student_first_name} opens it to set up the student account, and it works once, for one account: ${link}`,
    `2. Open your parent portal. It shows attendance, homework, practice test scores and where the guarantee stands: ${portal}`,
    "3. Add a second parent, if you like: forward them the parent portal link above. It opens for two parent accounts, yours and theirs.",
    `4. Before the first class, email ${r.student_first_name}'s official SAT score report (the PDF from the College Board account) to ${GUARANTEE.claimEmail}. No SAT yet? ${r.student_first_name} takes a first full-length test with us instead. Either one sets the starting score for the guarantee.`,
    "",
    r.payment_option === "installments"
      ? `You paid the ${formatPrice(MP.depositAmount)} deposit today. The ${MP.installments.count} payments of ${formatPrice(MP.installments.amount)} follow monthly from the first class.`
      : `You paid ${formatPrice(MP.price)} in full.`,
    "",
    "Reply to this email with any question. A person answers.",
  ];
  try {
    await resend.emails.send({
      from: FROM,
      to: r.parent_email,
      subject: `${r.student_first_name}'s seat at Karman is reserved`,
      text: lines.join("\n"),
    });
  } catch (e) {
    console.error("[reserve] family email failed", e);
  }
}

/** The buyer is told by email that the student's account is ready. Never fails the claim. */
export async function tellParents(r: Reservation) {
  try {
    if (!process.env.RESEND_API_KEY) return;
    await resend.emails.send({
      from: FROM,
      to: r.parent_email,
      subject: `${r.student_first_name}'s account is ready`,
      text: [
        `${r.student_first_name} has set up the student account, and the seat is attached to it.`,
        "",
        `Your parent portal: ${appUrl()}/reserve/parent?p=${r.parent_token}`,
        `It shows ${r.student_first_name}'s attendance, homework, practice test scores and where the guarantee stands.`,
        "To add a second parent, forward them that link. It opens for two parent accounts.",
        "",
        "Reply to this email with any question. A person answers.",
      ].join("\n"),
    });
  } catch (e) {
    console.error("[reserve] telling the parents failed", e);
  }
}
