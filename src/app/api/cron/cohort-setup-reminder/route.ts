// ============================================================
// POST /api/cron/cohort-setup-reminder
//
// Daily reminder for cohorts created without Cal/Zoom setup.
//
// Triggers an admin email with the list of group/small_group
// cohorts that:
//   · are not archived
//   · have setup_completed_at = NULL
//
// Auth: Bearer CRON_SECRET (same pattern as the other crons).
// Schedule: 14:00 UTC daily (~9am ET) — set in wrangler.toml.
// Emits one email per run when there's at least one cohort to
// chase. Sends to ADMIN_NOTIFICATION_EMAIL.
//
// Idempotent: re-running on the same day sends a fresh email
// (no per-day dedup). If you want one-and-done semantics, add a
// `last_setup_reminder_at` column on cohorts later.
// ============================================================

import { NextResponse } from "next/server";
import { listCohortsNeedingSetup } from "@/lib/supabase/queries/cohorts";
import { resend, FROM } from "@/lib/integrations/resend/client";
import { withCronInstrumentation } from "@/lib/observability/cron";

export const runtime = "nodejs";

const TIER_LABEL: Record<string, string> = {
  group: "Seminar",
  small_group: "Small Group",
};

function daysSince(iso: string): number {
  const elapsedMs = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(elapsedMs / (24 * 60 * 60 * 1000)));
}

export const POST = withCronInstrumentation("cohort-setup-reminder", async (req: Request) => {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.warn("[cron/cohort-setup-reminder] ADMIN_NOTIFICATION_EMAIL not set — skipping");
    return NextResponse.json({ sent: 0, reason: "no_admin_email" });
  }

  const pending = await listCohortsNeedingSetup();
  if (pending.length === 0) {
    return NextResponse.json({ sent: 0, pending: 0 });
  }

  const rows = pending
    .map((c) => {
      const days = daysSince(c.created_at);
      const tierLabel = TIER_LABEL[c.tier] ?? c.tier;
      return `<tr>
        <td style="padding:6px 8px;">${escapeHtml(c.name)}</td>
        <td style="padding:6px 8px;color:#64748b;">${tierLabel}</td>
        <td style="padding:6px 8px;color:#64748b;">${c.sat_date}</td>
        <td style="padding:6px 8px;color:#64748b;">${escapeHtml(c.tutor_email)}</td>
        <td style="padding:6px 8px;color:${days >= 3 ? "#dc2626" : "#64748b"};font-weight:${
          days >= 3 ? "600" : "400"
        };">${days}d</td>
      </tr>`;
    })
    .join("");

  try {
    await resend.emails.send({
      from: FROM,
      to: adminEmail,
      subject: `[Karman] ${pending.length} cohort${pending.length === 1 ? "" : "s"} still need${
        pending.length === 1 ? "s" : ""
      } Cal/Zoom setup`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 720px; margin: auto; padding: 24px; color:#0f172a;">
          <h2 style="margin:0 0 12px 0;">Cohorts awaiting Cal/Zoom setup</h2>
          <p style="margin:0 0 16px 0; color:#334155;">
            ${pending.length} ${pending.length === 1 ? "cohort is" : "cohorts are"}
            still waiting for you to wire up the Cal event-type + Zoom integration on Cal.com.
            Configure each one, then click <strong>Mark setup complete</strong> on the cohort
            detail page in Karman to dismiss the banner + stop these emails.
          </p>
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
              <tr style="background:#f1f5f9; text-align:left;">
                <th style="padding:6px 8px;">Cohort</th>
                <th style="padding:6px 8px;">Tier</th>
                <th style="padding:6px 8px;">SAT date</th>
                <th style="padding:6px 8px;">Tutor</th>
                <th style="padding:6px 8px;">Age</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin-top:16px; color:#94a3b8; font-size:11px;">
            You can also see this list at /admin/cohorts (look for the &ldquo;Needs setup&rdquo; badge).
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[cron/cohort-setup-reminder] email send failed:", err);
    return NextResponse.json({ sent: 0, error: "email_failed" }, { status: 502 });
  }

  return NextResponse.json({ sent: 1, pending: pending.length });
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
