/* The parent's Settings card for the daily email: a local time on the half hour, or off. */
import { Cta } from "@/components/portal";
import { saveDailyEmailTimeAction } from "@/app/dashboard/parent/actions";
import {
  DAILY_EMAIL_TIMES,
  DEFAULT_DAILY_EMAIL_TIME,
  dailyEmailTimeLabel,
  type DailyEmailChoice,
} from "@/lib/parent/daily-email-schedule";

function zoneName(zone: string): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "long" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? zone;
}

export function DailyEmailSetting({
  choice,
  timeZone,
}: {
  choice: DailyEmailChoice;
  timeZone: string;
}) {
  return (
    <form action={saveDailyEmailTimeAction} className="kp-form">
      <p className="kp-meta">
        A short brief on your student&rsquo;s day: the work done, the predicted score and the
        tutor&rsquo;s note. For the Cohort, Private tutoring and Pro plans.
      </p>
      <label className="kp-field">
        <span>Send it at</span>
        <select className="kp-select" name="time" defaultValue={choice ?? "off"}>
          {DAILY_EMAIL_TIMES.map((t) => (
            <option key={t} value={t}>
              {dailyEmailTimeLabel(t)}
              {t === DEFAULT_DAILY_EMAIL_TIME ? " (default)" : ""}
            </option>
          ))}
          <option value="off">Off</option>
        </select>
        Times are in {zoneName(timeZone)}.
      </label>
      <Cta type="submit">Save</Cta>
    </form>
  );
}
