/*
 * The daily parent email run, for the every-2-minutes cron. Pure orchestration: the database and
 * the email provider come in as `deps` (./daily-email-cron.ts supplies the real ones), so the
 * dry-run default is tested without either.
 *
 * Each run, on the first tick of a half hour only:
 *   1. every parent-student link whose parent's chosen local time falls in this half hour
 *   2. whose student's plan includes the daily report (Cohort, Private, Pro)
 *   3. gets its email built from the same report the portal shows.
 * Then, ONLY when DAILY_PARENT_EMAIL is exactly "on": claim the (parent, student, day) row in the
 * send log, which refuses a second claim the same day, and send. Otherwise it is a dry run that
 * logs counts and writes nothing.
 */
import {
  dailyEmailMode,
  effectiveDailyEmailTime,
  isDailyEmailTick,
  isDueNow,
} from "./daily-email-schedule";

export interface DailyEmailLink {
  parentUserId: string;
  parentEmail: string | null;
  parentFirstName: string | null;
  parentTimeZone: string | null;
  student: { id: string; clerkId: string; firstName: string; name: string };
}

export interface BuiltDailyEmail {
  to: string;
  subject: string;
  html: string;
  /** YYYY-MM-DD in the parent's zone: the day the email is about. */
  day: string;
}

export interface DailyEmailDeps {
  loadLinks(): Promise<DailyEmailLink[]>;
  /** Saved times by parent users.id: a time, or null for off. Missing means the default. */
  loadTimes(parentUserIds: string[]): Promise<Map<string, string | null>>;
  hasDailyReport(link: DailyEmailLink): Promise<boolean>;
  build(link: DailyEmailLink, now: Date): Promise<BuiltDailyEmail>;
  /** Records the send for the day; false when that parent, student and day is already taken. */
  claim(link: DailyEmailLink, day: string): Promise<boolean>;
  send(email: BuiltDailyEmail): Promise<void>;
  markSent(link: DailyEmailLink, day: string, ok: boolean): Promise<void>;
  log(message: string, data: Record<string, unknown>): void;
}

export interface DailyEmailRunResult {
  mode: "send" | "dry-run";
  /** False when this cron tick is not the first of a half hour, so nothing was read. */
  ran: boolean;
  due: number;
  eligible: number;
  built: number;
  sent: number;
  alreadySent: number;
  failed: number;
}

/** The links whose parent's chosen time falls in the half hour that starts at `now`. */
export function dueLinks(
  links: readonly DailyEmailLink[],
  times: ReadonlyMap<string, string | null>,
  now: Date
): DailyEmailLink[] {
  return links.filter((l) => {
    if (!l.parentEmail) return false;
    const saved = times.has(l.parentUserId) ? times.get(l.parentUserId) : undefined;
    return isDueNow(effectiveDailyEmailTime(saved), now, l.parentTimeZone ?? "");
  });
}

export async function runDailyParentEmails(
  deps: DailyEmailDeps,
  now: Date = new Date(),
  env: Record<string, string | undefined> = process.env
): Promise<DailyEmailRunResult> {
  const mode = dailyEmailMode(env);
  const result: DailyEmailRunResult = {
    mode,
    ran: false,
    due: 0,
    eligible: 0,
    built: 0,
    sent: 0,
    alreadySent: 0,
    failed: 0,
  };
  if (!isDailyEmailTick(now)) return result;
  result.ran = true;
  const links = await deps.loadLinks();
  const times = await deps.loadTimes([...new Set(links.map((l) => l.parentUserId))]);
  const due = dueLinks(links, times, now);
  result.due = due.length;
  for (const link of due) {
    try {
      if (!(await deps.hasDailyReport(link))) continue;
      result.eligible += 1;
      const email = await deps.build(link, now);
      result.built += 1;
      if (mode !== "send") continue;
      if (!(await deps.claim(link, email.day))) {
        result.alreadySent += 1;
        continue;
      }
      try {
        await deps.send(email);
        await deps.markSent(link, email.day, true);
        result.sent += 1;
      } catch (error) {
        result.failed += 1;
        await deps.markSent(link, email.day, false);
        deps.log("[parent-daily-email] send failed", { error: String(error) });
      }
    } catch (error) {
      result.failed += 1;
      deps.log("[parent-daily-email] could not build", { error: String(error) });
    }
  }
  // Counts only: no addresses, names or report contents in the log.
  deps.log(`[parent-daily-email] ${mode}`, { ...result });
  return result;
}
