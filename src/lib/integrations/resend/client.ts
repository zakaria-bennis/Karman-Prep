// ============================================================
// Shared Resend client + FROM address.
// Both the legacy inline-HTML emails (emails.ts) and the new
// React Email booking templates (booking-emails.ts) import from
// here so we only ever instantiate one Resend client.
// ============================================================

import { Resend } from "resend";

/** Email can be switched off (no RESEND_API_KEY, as in local and test environments). The SDK throws when
 *  it is built without a key, which used to take down every form that merely imports this module (the
 *  2026-11-08 site audit). Without a key, sends and contact adds return an error result and log once per
 *  call instead; every caller already treats an error result as "not sent". */
export const EMAIL_ON = Boolean(process.env.RESEND_API_KEY);

export const resend = new Resend(process.env.RESEND_API_KEY || "re_email_switched_off");
if (!EMAIL_ON) {
  const off = (what: string) => {
    console.warn(`[email] RESEND_API_KEY is not set: ${what} skipped`);
    return { data: null, error: { name: "missing_api_key", message: "Email is switched off" } };
  };
  resend.emails.send = (async () => off("email")) as unknown as typeof resend.emails.send;
  resend.contacts.create = (async () => off("contact")) as unknown as typeof resend.contacts.create;
}
export const FROM = process.env.RESEND_FROM_EMAIL || "hello@karmanprep.com";
