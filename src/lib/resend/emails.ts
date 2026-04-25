// ============================================================
// Resend email helpers
// All transactional email sending goes through this file.
// ============================================================

import { resend, FROM } from "./client";

/** Sends a welcome email to a newly signed-up user */
export async function sendWelcomeEmail({
  to,
  firstName,
  role,
}: {
  to: string;
  firstName: string;
  role: string;
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to Strata — let's boost that score 🚀",
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: auto; padding: 32px;">
        <h1 style="color: #2563EB;">Welcome to Strata, ${firstName}!</h1>
        <p>You're now registered as a <strong>${role}</strong>.</p>
        <p>Here's what to do next:</p>
        <ol>
          <li>Take your <a href="${process.env.NEXT_PUBLIC_APP_URL}/diagnostic">free 20-question diagnostic</a></li>
          <li>Review your personalized learning path</li>
          <li>Start your first lesson</li>
        </ol>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/student"
           style="background:#2563EB;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">
          Go to Dashboard
        </a>
        <p style="color:#6B7280;font-size:14px;margin-top:32px;">
          The Strata Team · <a href="${process.env.NEXT_PUBLIC_APP_URL}">strata.com</a>
        </p>
      </div>
    `,
  });
}

/** Sends a trial-ending reminder (fires 2 days before trial end) */
export async function sendTrialEndingEmail({
  to,
  firstName,
  trialEndDate,
}: {
  to: string;
  firstName: string;
  trialEndDate: string;
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "Your Strata trial ends in 2 days",
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: auto; padding: 32px;">
        <h2 style="color: #D97706;">Your free trial ends on ${trialEndDate}</h2>
        <p>Hi ${firstName}, your 7-day free trial of Strata ends soon.</p>
        <p>To keep your progress and continue your personalized SAT prep, your subscription will auto-activate on ${trialEndDate}.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing"
           style="background:#2563EB;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;">
          Manage Subscription
        </a>
      </div>
    `,
  });
}

/** Adds a visitor email to the Resend audience for nurture emails */
export async function addToWaitlist(email: string) {
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) return;

  return resend.contacts.create({
    audienceId,
    email,
    unsubscribed: false,
  });
}
