import "server-only";
/*
 * The real pieces for the daily parent email run (./daily-email-run.ts), called from the
 * every-2-minutes cron (src/app/api/cron/retry-failed-emails). Sending is OFF unless
 * DAILY_PARENT_EMAIL=on; in a dry run nothing here writes to the database or loads the email
 * client. Never throws: a failure is logged and the cron carries on.
 */
import { appUrl } from "@/lib/billing-portal/stripe";
import { untypedAdmin } from "@/lib/school/db";
import { dailyHtml, dailySubject } from "./daily-email";
import { readDailyEmailTimes } from "./daily-email-settings";
import {
  runDailyParentEmails,
  type DailyEmailDeps,
  type DailyEmailLink,
  type DailyEmailRunResult,
} from "./daily-email-run";
import { childHasDailyReport, loadDailyReport } from "./daily-report";

type User = {
  id: string;
  clerk_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  time_zone: string | null;
};
type One<T> = T | T[] | null;
const pick = <T>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
const USER_COLUMNS = "id, clerk_id, email, first_name, last_name, time_zone";

export async function loadLinks(): Promise<DailyEmailLink[]> {
  const { data, error } = await untypedAdmin()
    .from("parent_student_links")
    .select(
      `parent:users!parent_student_links_parent_user_id_fkey (${USER_COLUMNS}), student:users!parent_student_links_student_user_id_fkey (${USER_COLUMNS})`
    )
    .limit(5000);
  if (error) throw error;
  return ((data ?? []) as { parent: One<User>; student: One<User> }[]).flatMap((row) => {
    const parent = pick(row.parent);
    const student = pick(row.student);
    if (!parent || !student) return [];
    const name =
      [student.first_name, student.last_name].filter(Boolean).join(" ") || "Your student";
    return [
      {
        parentUserId: parent.id,
        parentEmail: parent.email,
        parentFirstName: parent.first_name,
        parentTimeZone: parent.time_zone,
        student: {
          id: student.id,
          clerkId: student.clerk_id,
          firstName: student.first_name || name.split(" ")[0],
          name,
        },
      },
    ];
  });
}

const deps: DailyEmailDeps = {
  loadLinks,
  loadTimes: (ids) => readDailyEmailTimes(ids),
  hasDailyReport: (link) => childHasDailyReport(link.student),
  async build(link, now) {
    const { report } = await loadDailyReport(link.parentUserId, link.student, undefined, now);
    const input = {
      childFirstName: link.student.firstName,
      parentFirstName: link.parentFirstName,
      report,
      portalUrl: `${appUrl()}/dashboard/parent/${link.student.id}/report`,
    };
    return {
      to: link.parentEmail ?? "",
      subject: dailySubject(input),
      html: dailyHtml(input),
      day: report.day,
    };
  },
  async claim(link, day) {
    const { error } = await untypedAdmin().from("parent_daily_email_log").insert({
      parent_user_id: link.parentUserId,
      student_user_id: link.student.id,
      report_day: day,
    });
    if (!error) return true;
    if (error.code === "23505") return false;
    throw error;
  },
  async send(email) {
    // Loaded only on a real send: the client refuses to start without a key.
    const { FROM, resend } = await import("@/lib/integrations/resend/client");
    const { error } = await resend.emails.send({
      from: FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
    });
    if (error) throw new Error(error.message);
  },
  async markSent(link, day, ok) {
    await untypedAdmin()
      .from("parent_daily_email_log")
      .update({ status: ok ? "sent" : "failed" })
      .eq("parent_user_id", link.parentUserId)
      .eq("student_user_id", link.student.id)
      .eq("report_day", day);
  },
  log: (message, data) => console.info(message, data),
};

/** One run of the daily parent email, now. Never throws. */
export async function runDailyParentEmailsNow(
  now: Date = new Date()
): Promise<DailyEmailRunResult | null> {
  try {
    return await runDailyParentEmails(deps, now);
  } catch (error) {
    console.error("[parent-daily-email] run failed", error);
    return null;
  }
}
