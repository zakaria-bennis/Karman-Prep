// ============================================================
// Shared Resend client + FROM address.
// Both the legacy inline-HTML emails (emails.ts) and the new
// React Email booking templates (booking-emails.ts) import from
// here so we only ever instantiate one Resend client.
// ============================================================

import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);
export const FROM = process.env.RESEND_FROM_EMAIL || "hello@strata.com";
