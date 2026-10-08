"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCw } from "lucide-react";
import type { StudyAction } from "@/lib/learn/dashboard";
import {
  buildCalendarWeek,
  resolveCalendarTimeZone,
  type CalendarItem,
  type StudentCalendarData,
} from "@/lib/learn/week-calendar";

interface Props {
  data: StudentCalendarData;
  asOf: string;
  preferredTimeZone: string | null;
  next: StudyAction | null;
}

function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00.000Z`);
}

function dayLabel(key: string, weekday: "short" | "long") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday,
    month: "short",
    day: "numeric",
  }).format(dateFromKey(key));
}

function hourLabel(instant: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(instant));
}

function AgendaItem({ item, timeZone }: { item: CalendarItem; timeZone: string }) {
  const time = item.at
    ? item.source === "session"
      ? `${hourLabel(item.at, timeZone)}${item.endAt ? ` – ${hourLabel(item.endAt, timeZone)}` : ""}`
      : `Due ${hourLabel(item.at, timeZone)}`
    : "No due date";
  return (
    <li className="grid gap-2 border-b border-bronze py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
      <p className="text-xs font-semibold leading-relaxed text-gold">{time}</p>
      <div className="min-w-0">
        <p className="text-xs text-taupe">{item.sourceLabel}</p>
        <h4 className="mt-1 text-sm font-semibold leading-snug text-ivory">{item.title}</h4>
        {item.description && (
          <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-taupe">
            {item.description}
          </p>
        )}
        {item.href && (
          <Link
            href={item.href}
            className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-gold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            {item.source === "session" ? "Manage next session" : "Open assigned practice"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </li>
  );
}

export default function StudentWeekCalendar({ data, asOf, preferredTimeZone, next }: Props) {
  const router = useRouter();
  const [timeZone, setTimeZone] = useState(() => resolveCalendarTimeZone(preferredTimeZone));
  useEffect(() => {
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimeZone(resolveCalendarTimeZone(preferredTimeZone, device));
  }, [preferredTimeZone]);
  const week = buildCalendarWeek(data, asOf, timeZone);
  const today = week.days[0];
  const later = week.days.slice(1);
  const laterCount = later.reduce((sum, day) => sum + day.items.length, 0);
  const incompleteView = week.unavailableSources.length > 0;
  const usingDeviceTimeZone =
    timeZone !== "UTC" &&
    (!preferredTimeZone || resolveCalendarTimeZone(preferredTimeZone) !== preferredTimeZone);

  return (
    <section aria-labelledby="study-week-heading" className="mt-10 border-t border-bronze pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Your calendar
          </p>
          <h2
            id="study-week-heading"
            className="mt-2 font-plex-serif text-2xl text-ivory sm:text-3xl"
          >
            Today and the next six days
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-taupe">
            Booked sessions and work posted by your educator. You can choose practice any time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-bronze px-3 py-2 text-xs font-semibold text-ivory hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" /> Refresh week
        </button>
      </div>
      <p className="mt-4 text-xs text-taupe">
        Times shown in {timeZone}
        {usingDeviceTimeZone ? " (your device)" : ""}. This view does not show whether posted work
        is finished.
      </p>
      {incompleteView && (
        <p
          role="status"
          className="mt-4 border-l-4 border-warning bg-warning/10 px-4 py-3 text-sm text-ivory"
        >
          {week.unavailableSources.join(", ")} could not load. The visible week may be incomplete;
          refresh to try again.
        </p>
      )}

      <ol aria-label="Next seven days" className="mt-6 grid grid-cols-7 border-y border-bronze">
        {week.days.map((day, index) => (
          <li
            key={day.key}
            className={`min-w-0 border-r border-bronze px-1 py-3 text-center last:border-r-0 sm:py-4 ${index === 0 ? "bg-surface" : ""}`}
            aria-label={`${dayLabel(day.key, "long")}: ${day.items.length} dated ${day.items.length === 1 ? "item" : "items"}`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-taupe">
              {new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" }).format(
                dateFromKey(day.key)
              )}
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-ivory">
              {Number(day.key.slice(-2))}
            </p>
            <span
              aria-hidden="true"
              className={`mx-auto mt-2 block h-1.5 w-1.5 rounded-full ${day.items.length ? "bg-gold" : "bg-bronze/50"}`}
            />
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
        <section aria-labelledby="today-heading">
          <h3 id="today-heading" className="font-plex-serif text-xl text-ivory">
            Today{" "}
            <span className="ml-2 text-sm font-normal text-taupe">
              {dayLabel(today.key, "long")}
            </span>
          </h3>
          {today.items.length ? (
            <ol className="mt-3 border-t border-bronze">
              {today.items.map((item) => (
                <AgendaItem key={item.id} item={item} timeZone={timeZone} />
              ))}
            </ol>
          ) : (
            <p className="mt-4 border-t border-bronze pt-4 text-sm text-taupe">
              {incompleteView
                ? "Nothing scheduled or due today is available to show."
                : "Nothing scheduled or due today."}
            </p>
          )}
          <div className="mt-6 border-l-4 border-gold bg-surface px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">
              Practice any time
            </p>
            <h4 className="mt-2 font-plex-serif text-xl text-ivory">
              {next?.title ?? "Choose a subject to begin"}
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-taupe">
              {next?.detail ?? "Choose a subject and start practicing when you are ready."}
            </p>
            <Link
              href={next?.href ?? "/learn"}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-night hover:bg-gold-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
            >
              {next?.label ?? "Explore practice"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section aria-labelledby="later-heading">
          <h3 id="later-heading" className="font-plex-serif text-xl text-ivory">
            Coming up
          </h3>
          {laterCount ? (
            <div className="mt-3 border-t border-bronze">
              {later
                .filter((day) => day.items.length > 0)
                .map((day) => (
                  <div key={day.key} className="border-b border-bronze py-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gold">
                      {dayLabel(day.key, "long")}
                    </h4>
                    <ol>
                      {day.items.map((item) => (
                        <AgendaItem key={item.id} item={item} timeZone={timeZone} />
                      ))}
                    </ol>
                  </div>
                ))}
            </div>
          ) : (
            <p className="mt-4 border-t border-bronze pt-4 text-sm text-taupe">
              {incompleteView
                ? "Nothing else scheduled or due is available to show."
                : "Nothing else scheduled or due in the next six days."}
            </p>
          )}
          {week.undated.length > 0 && (
            <div className="mt-7">
              <h4 className="text-sm font-semibold text-ivory">Work without a due date</h4>
              <ol className="mt-2 border-t border-bronze">
                {week.undated.map((item) => (
                  <AgendaItem key={item.id} item={item} timeZone={timeZone} />
                ))}
              </ol>
            </div>
          )}
          {week.earlierDue.length > 0 && (
            <div className="mt-7">
              <h4 className="text-sm font-semibold text-ivory">Past due dates</h4>
              <p className="mt-1 text-xs text-taupe">
                This page does not show whether this work was finished.
              </p>
              <ol className="mt-2 border-t border-bronze">
                {week.earlierDue.map((item) => (
                  <AgendaItem key={item.id} item={item} timeZone={timeZone} />
                ))}
              </ol>
            </div>
          )}
        </section>
      </div>
      <section
        aria-labelledby="session-homework-heading"
        className="mt-12 border-t border-bronze pt-8"
      >
        <h3 id="session-homework-heading" className="font-plex-serif text-xl text-ivory">
          Homework for booked sessions
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-taupe">
          When your educator assigns homework for a booked session, its due time and your saved
          attempts will appear here. Practice posted separately stays in the calendar above.
        </p>
      </section>
    </section>
  );
}
