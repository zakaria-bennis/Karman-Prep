/* The parent's Settings card for the daily email: a time on the half hour, or off, and the time
   zone that time is in (the parent's own, Central until they pick one). */
import { Cta } from "@/components/portal";
import { saveDailyEmailTimeAction } from "@/app/dashboard/parent/actions";
import {
  DAILY_EMAIL_TIMES,
  DAILY_EMAIL_ZONES,
  DEFAULT_DAILY_EMAIL_TIME,
  dailyEmailTimeLabel,
  timeZoneLabel,
  type DailyEmailChoice,
} from "@/lib/parent/daily-email-schedule";

export function DailyEmailSetting({
  choice,
  timeZone,
}: {
  choice: DailyEmailChoice;
  timeZone: string;
}) {
  const listed = (DAILY_EMAIL_ZONES as readonly string[]).includes(timeZone);
  const zones = listed ? DAILY_EMAIL_ZONES : [timeZone, ...DAILY_EMAIL_ZONES];
  return (
    <form action={saveDailyEmailTimeAction} className="kp-form">
      <p className="kp-meta">For the Cohort, Private tutoring and Pro plans.</p>
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
      </label>
      <label className="kp-field">
        <span>Time zone</span>
        <select className="kp-select" name="zone" defaultValue={timeZone}>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {timeZoneLabel(zone)}
            </option>
          ))}
        </select>
      </label>
      <Cta type="submit">Save</Cta>
    </form>
  );
}
