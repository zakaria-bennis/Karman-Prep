/*
 * Instant parent alerts (founder, 2026-11-12): homework that just went late, and a session the
 * student just missed. Pure orchestration with the database and email provider passed in as
 * `deps` (./alerts-cron.ts supplies the real ones), so the dry-run default is tested without
 * either.
 *
 * Each run, on the first tick of an hour only, for every parent-student link:
 *   1. the parent's alert choices (both on unless they turned one off in Settings)
 *   2. homework due in the last 3 days and still not done; 1:1s or classes marked missed in the
 *      last 2 days. Older ones never alert, so switching alerts on doesn't flood anyone.
 * Then, ONLY when PARENT_ALERTS is exactly "on": claim the alert's row in parent_alert_log,
 * which refuses a second claim, and send. Otherwise a dry run that logs counts and writes
 * nothing.
 */

export interface AlertLink {
  parentUserId: string;
  parentEmail: string | null;
  parentFirstName: string | null;
  student: { id: string; clerkId: string; firstName: string; name: string };
}

export interface AlertFacts {
  lateHomework: { title: string; dueOn: string }[];
  missedSessions: { id: string; kind: string; startsAt: string }[];
}

export interface Alert {
  key: string;
  kind: "late_homework" | "missed_session";
  subject: string;
  text: string;
}

export interface AlertDeps {
  loadLinks(): Promise<AlertLink[]>;
  loadPrefs(parentUserId: string): Promise<{ lateHomework: boolean; missedSession: boolean }>;
  loadFacts(link: AlertLink, now: Date): Promise<AlertFacts>;
  /** Records the alert; false when that parent, student and alert was already claimed. */
  claim(link: AlertLink, key: string): Promise<boolean>;
  send(link: AlertLink, alert: Alert): Promise<void>;
  markSent(link: AlertLink, key: string, ok: boolean): Promise<void>;
  log(message: string, data: Record<string, unknown>): void;
}

export interface AlertRunResult {
  mode: "send" | "dry-run";
  ran: boolean;
  links: number;
  alerts: number;
  sent: number;
  alreadySent: number;
  failed: number;
}

const DAY_MS = 86_400_000;

export function alertMode(env: Record<string, string | undefined>): "send" | "dry-run" {
  return env.PARENT_ALERTS === "on" ? "send" : "dry-run";
}

/** The alerts one link should get now, newest facts only, as the parent chose. */
export function pickAlerts(
  link: AlertLink,
  facts: AlertFacts,
  prefs: { lateHomework: boolean; missedSession: boolean },
  now: Date
): Alert[] {
  const name = link.student.firstName;
  const today = now.toISOString().slice(0, 10);
  const oldestDue = new Date(now.getTime() - 3 * DAY_MS).toISOString().slice(0, 10);
  const oldestMissed = new Date(now.getTime() - 2 * DAY_MS).toISOString();
  const out: Alert[] = [];
  if (prefs.lateHomework) {
    for (const h of facts.lateHomework) {
      if (h.dueOn >= today || h.dueOn < oldestDue) continue;
      out.push({
        key: `homework:${h.title.slice(0, 200)}:${h.dueOn}`,
        kind: "late_homework",
        subject: `${name}'s homework is late`,
        text: `"${h.title}" was due ${h.dueOn} and isn't done yet.`,
      });
    }
  }
  if (prefs.missedSession) {
    for (const s of facts.missedSessions) {
      if (s.startsAt < oldestMissed || s.startsAt > now.toISOString()) continue;
      out.push({
        key: `session:${s.id}`,
        kind: "missed_session",
        subject: `${name} missed a session`,
        text: `${name} wasn't at the ${s.kind === "1:1" ? "1:1 session" : "class"} on ${s.startsAt.slice(0, 10)}. You can ask for a new time in Messages.`,
      });
    }
  }
  return out;
}

/** True on the first tick of each hour, so the alert run reads the database once an hour. */
export function isAlertTick(now: Date): boolean {
  return now.getUTCMinutes() < 5;
}

export async function runParentAlerts(
  deps: AlertDeps,
  now: Date,
  env: Record<string, string | undefined> = process.env
): Promise<AlertRunResult> {
  const mode = alertMode(env);
  const result: AlertRunResult = {
    mode,
    ran: false,
    links: 0,
    alerts: 0,
    sent: 0,
    alreadySent: 0,
    failed: 0,
  };
  if (!isAlertTick(now)) return result;
  result.ran = true;
  const links = await deps.loadLinks();
  result.links = links.length;
  for (const link of links) {
    if (!link.parentEmail) continue;
    try {
      const [prefs, facts] = await Promise.all([
        deps.loadPrefs(link.parentUserId),
        deps.loadFacts(link, now),
      ]);
      const alerts = pickAlerts(link, facts, prefs, now);
      result.alerts += alerts.length;
      if (mode !== "send") continue;
      for (const alert of alerts) {
        if (!(await deps.claim(link, alert.key))) {
          result.alreadySent += 1;
          continue;
        }
        try {
          await deps.send(link, alert);
          await deps.markSent(link, alert.key, true);
          result.sent += 1;
        } catch (error) {
          result.failed += 1;
          await deps.markSent(link, alert.key, false).catch(() => undefined);
          deps.log("[parent-alerts] send failed", {
            kind: alert.kind,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      result.failed += 1;
      deps.log("[parent-alerts] link failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  deps.log("[parent-alerts] run", { ...result });
  return result;
}
