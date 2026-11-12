import "server-only";
/*
 * The real pieces for the parent alert run (./alerts-run.ts), called from the cron in
 * src/app/api/cron/retry-failed-emails. Sending is OFF unless PARENT_ALERTS=on; in a dry run
 * nothing here writes to the database or loads the email client. Never throws.
 */
import { appUrl } from "@/lib/billing-portal/stripe";
import { untypedAdmin } from "@/lib/school/db";
import { loadLinks } from "./daily-email-cron";
import { readAlertPrefs } from "./messages";
import { esc } from "./recap";
import { runParentAlerts, type AlertDeps, type AlertRunResult } from "./alerts-run";
import { loadChildWeek } from "./server";

const deps: AlertDeps = {
  loadLinks,
  loadPrefs: (id) => readAlertPrefs(id),
  async loadFacts(link, now) {
    const week = await loadChildWeek(link.student, now);
    return {
      lateHomework: week.homework.open.filter((h) => h.late),
      missedSessions: week.past
        .filter((s) => s.status === "no_show")
        .map((s) => ({ id: s.id, kind: s.kind, startsAt: s.startsAt })),
    };
  },
  async claim(link, key) {
    const { error } = await untypedAdmin().from("parent_alert_log").insert({
      parent_user_id: link.parentUserId,
      student_user_id: link.student.id,
      alert_key: key,
    });
    if (!error) return true;
    if (error.code === "23505") return false;
    throw error;
  },
  async send(link, alert) {
    const { FROM, resend } = await import("@/lib/integrations/resend/client");
    const url = `${appUrl()}/dashboard/parent/${link.student.id}`;
    const hi = link.parentFirstName ? `Hi ${esc(link.parentFirstName)},` : "Hi,";
    const { error } = await resend.emails.send({
      from: FROM,
      to: link.parentEmail ?? "",
      subject: alert.subject,
      html: `<p>${hi}</p><p>${esc(alert.text)}</p><p><a href="${esc(url)}">Open ${esc(link.student.firstName)}'s week</a></p><p style="color:#78716c;font-size:12px">You can turn these alerts off in Settings.</p>`,
    });
    if (error) throw new Error(error.message);
  },
  async markSent(link, key, ok) {
    await untypedAdmin()
      .from("parent_alert_log")
      .update({ status: ok ? "sent" : "failed" })
      .eq("parent_user_id", link.parentUserId)
      .eq("student_user_id", link.student.id)
      .eq("alert_key", key);
  },
  log: (message, data) => console.info(message, data),
};

/** One run of the parent alerts, now. Never throws. */
export async function runParentAlertsNow(now: Date = new Date()): Promise<AlertRunResult | null> {
  try {
    return await runParentAlerts(deps, now);
  } catch (error) {
    console.error("[parent-alerts] run failed", error);
    return null;
  }
}
