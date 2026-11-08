"use client";

/*
 * Picks a time from the tutor's booking calendar, to book a new 1:1 or move one.
 * Uses the existing booking flow: /api/availability for open times, then
 * /api/bookings/create or /api/bookings/reschedule. When Cal.com can't be reached, it says so
 * plainly and logs, instead of failing silently.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { changeFailedMessage } from "@/lib/student/calendar";
import styles from "./calendar.module.css";

export interface SlotPickerProps {
  eventTypeId: number;
  tutorClerkId: string;
  tutorName: string;
  /** Set to move this booking instead of booking a new session. */
  bookingId?: string;
  /** Called after a booking or move goes through, with what to tell the student. */
  onDone: (message: string) => void;
}

type Slot = { start: string; end: string };

const UNAVAILABLE =
  "Booking isn’t available right now. Email your tutor to pick a time, and we’ll sort it out.";
const DAYS_SHOWN = 5;

function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";
  } catch {
    return "America/Chicago";
  }
}

export default function SlotPicker({
  eventTypeId,
  tutorClerkId,
  tutorName,
  bookingId,
  onDone,
}: SlotPickerProps) {
  const router = useRouter();
  const [zone] = useState(browserZone);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const now = Date.now();
    const params = new URLSearchParams({
      eventTypeId: String(eventTypeId),
      dateFrom: new Date(now).toISOString(),
      dateTo: new Date(now + 14 * 86_400_000).toISOString(),
      timeZone: zone,
    });
    fetch(`/api/availability?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw Object.assign(new Error("availability"), { status: res.status });
        const body = (await res.json()) as { slots?: Slot[] };
        if (live) setSlots(body.slots ?? []);
      })
      .catch((err: { status?: number }) => {
        console.warn("[student calendar] open times could not load:", err?.status ?? err);
        if (live) setError(UNAVAILABLE);
      });
    return () => {
      live = false;
    };
  }, [eventTypeId, zone]);

  const fmt = useMemo(
    () => ({
      day: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: zone,
      }),
      time: new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: zone,
      }),
    }),
    [zone]
  );

  const days = useMemo(() => {
    const byDay = new Map<string, Slot[]>();
    for (const s of slots ?? []) {
      const key = fmt.day.format(new Date(s.start));
      byDay.set(key, [...(byDay.get(key) ?? []), s]);
    }
    return [...byDay.entries()].slice(0, DAYS_SHOWN);
  }, [slots, fmt]);

  const label = (s: Slot) =>
    `${fmt.day.format(new Date(s.start))}, ${fmt.time.format(new Date(s.start))}`;

  async function submit() {
    if (!picked || busy) return;
    setBusy(true);
    setError(null);
    const moving = !!bookingId;
    try {
      const res = await fetch(moving ? "/api/bookings/reschedule" : "/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          moving
            ? { bookingId, newStart: picked.start }
            : { eventTypeId, tutorClerkId, start: picked.start, timeZone: zone }
        ),
      });
      if (!res.ok) {
        console.warn(`[student calendar] ${moving ? "move" : "booking"} failed:`, res.status);
        setError(
          moving
            ? changeFailedMessage("move", res.status)
            : res.status === 409
              ? "That time was just taken. Pick another."
              : UNAVAILABLE
        );
        return;
      }
      router.refresh();
      onDone(`${moving ? "Moved to" : "Booked for"} ${label(picked)}, with ${tutorName}.`);
    } catch (err) {
      console.warn("[student calendar] booking request failed:", err);
      setError(moving ? changeFailedMessage("move", null) : UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  }

  if (error && !slots) return <p role="alert">{error}</p>;
  if (!slots) return <p role="status">Finding {tutorName}&rsquo;s open times&hellip;</p>;
  if (days.length === 0) {
    return (
      <p role="status">
        {tutorName} has no open times in the next two weeks. Email them to find one.
      </p>
    );
  }

  return (
    <div>
      <p>{bookingId ? "Pick a new time" : `Pick a time with ${tutorName}`}</p>
      <div className={styles.days}>
        {days.map(([day, list]) => (
          <div key={day} role="group" aria-label={day}>
            <p className={styles.dayName}>{day}</p>
            <div className={styles.slots}>
              {list.map((s) => (
                <button
                  key={s.start}
                  type="button"
                  className={styles.slot}
                  aria-pressed={picked?.start === s.start}
                  onClick={() => setPicked(s)}
                >
                  {fmt.time.format(new Date(s.start))}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {picked && (
        <button type="button" className={styles.confirm} disabled={busy} onClick={submit}>
          {busy ? "Saving…" : `${bookingId ? "Move to" : "Book"} ${label(picked)}`}
        </button>
      )}
      {error && (
        <p role="alert" className={styles.message} data-tone="late">
          {error}
        </p>
      )}
    </div>
  );
}
