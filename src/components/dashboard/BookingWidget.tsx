"use client";

// ============================================================
// BookingWidget — slot picker + booking submission for self-
// bookable plans (Private + Elite).
//
// Pre-conditions enforced in the wrapping server component:
//   · User is signed in
//   · User's plan tier is private or elite
//   · The tutorClerkId / eventTypeId props are resolved server-side
//
// For group / small_group, this component is not rendered at all
// (the wrapping page returns null) — bookings come from the
// admin push flow in P8.
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { Calendar, Loader2, CheckCircle2 } from "lucide-react";

interface AvailableSlot {
  start: string;
  end: string;
}

export interface BookingWidgetProps {
  tutorName: string;
  tutorClerkId: string;
  eventTypeId: number | string;
  /** IANA TZ used for both display and POST. Defaults to browser TZ. */
  timeZone?: string;
  /** Live token balance. Shown in the header. Reschedule mode hides it. */
  tokensAvailable?: number;
  /** When set, the widget submits a reschedule of this booking
   *  instead of a fresh create. Calls /api/bookings/reschedule. */
  rescheduleBookingId?: string;
  /** Optional callback after a successful create/reschedule. */
  onBooked?: (booking: { id: string; zoom_join_url: string | null }) => void;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "loaded"; slots: AvailableSlot[] }
  | { kind: "error"; message: string };

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; joinUrl: string | null }
  | { kind: "error"; message: string };

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  } catch {
    return "America/New_York";
  }
}

function formatDay(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: tz,
  }).format(d);
}

function formatTime(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  }).format(d);
}

function dayKey(d: Date, tz: string): string {
  // YYYY-MM-DD in the user's TZ — used to bucket slots into per-day groups.
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  }).format(d);
}

export function BookingWidget(props: BookingWidgetProps) {
  const tz = props.timeZone ?? browserTimeZone();

  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [selected, setSelected] = useState<AvailableSlot | null>(null);
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const now = new Date();
        const end = new Date(now.getTime() + FOURTEEN_DAYS_MS);
        const params = new URLSearchParams({
          eventTypeId: String(props.eventTypeId),
          dateFrom: now.toISOString(),
          dateTo: end.toISOString(),
          timeZone: tz,
        });
        const res = await fetch(`/api/availability?${params.toString()}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (!cancelled)
            setLoad({
              kind: "error",
              message: body?.error ?? `Availability fetch failed (${res.status})`,
            });
          return;
        }
        const data = (await res.json()) as { slots: AvailableSlot[] };
        if (!cancelled) setLoad({ kind: "loaded", slots: data.slots ?? [] });
      } catch (err) {
        if (!cancelled)
          setLoad({
            kind: "error",
            message: (err as Error).message ?? "Network error",
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.eventTypeId, tz]);

  const slotsByDay = useMemo(() => {
    if (load.kind !== "loaded") return new Map<string, AvailableSlot[]>();
    const map = new Map<string, AvailableSlot[]>();
    for (const slot of load.slots) {
      const d = new Date(slot.start);
      const key = dayKey(d, tz);
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return map;
  }, [load, tz]);

  const orderedDays = useMemo(() => Array.from(slotsByDay.keys()).sort(), [slotsByDay]);

  async function onConfirm() {
    if (!selected) return;
    setSubmit({ kind: "submitting" });
    try {
      const endpoint = props.rescheduleBookingId
        ? "/api/bookings/reschedule"
        : "/api/bookings/create";
      const body = props.rescheduleBookingId
        ? { bookingId: props.rescheduleBookingId, newStart: selected.start }
        : {
            eventTypeId: props.eventTypeId,
            tutorClerkId: props.tutorClerkId,
            start: selected.start,
            timeZone: tz,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        booking?: { id: string; zoom_join_url: string | null };
        error?: string;
      };
      if (!res.ok || !data.booking) {
        setSubmit({ kind: "error", message: data?.error ?? `Request failed (${res.status})` });
        return;
      }
      setSubmit({ kind: "success", joinUrl: data.booking.zoom_join_url });
      props.onBooked?.(data.booking);
    } catch (err) {
      setSubmit({ kind: "error", message: (err as Error).message ?? "Network error" });
    }
  }

  // ─────────── Render ───────────
  return (
    <div className="rounded-xl border border-bronze bg-surface p-4 dark:border-bronze dark:bg-surface/40">
      <header className="mb-4 flex items-baseline justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-taupe">
            {props.rescheduleBookingId ? "Reschedule with" : "Book with"}
          </p>
          <h3 className="mt-0.5 truncate text-sm font-bold text-ivory dark:text-ivory">
            {props.tutorName}
          </h3>
        </div>
        {!props.rescheduleBookingId && typeof props.tokensAvailable === "number" ? (
          <span className="ml-3 inline-flex shrink-0 items-baseline gap-1 text-xs text-taupe">
            <span className="text-base font-extrabold leading-none text-ivory dark:text-ivory">
              {props.tokensAvailable}
            </span>
            <span>token{props.tokensAvailable === 1 ? "" : "s"}</span>
          </span>
        ) : null}
      </header>

      {load.kind === "loading" ? (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-taupe">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading available times…
        </div>
      ) : load.kind === "error" ? (
        <p className="py-6 text-center text-xs text-error dark:text-error">{load.message}</p>
      ) : orderedDays.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-taupe">
          <Calendar className="mb-1.5 h-5 w-5 opacity-60" />
          <p className="text-xs">No openings in the next two weeks.</p>
        </div>
      ) : submit.kind === "success" ? (
        <div className="flex flex-col items-center py-5 text-center">
          <CheckCircle2 className="mb-2 h-6 w-6 text-success" />
          <p className="mb-0.5 text-sm font-semibold text-ivory dark:text-ivory">
            {props.rescheduleBookingId ? "Session rescheduled" : "Session booked"}
          </p>
          <p className="mb-3 text-xs text-taupe">Calendar invite is on its way.</p>
          {submit.joinUrl ? (
            <a
              href={submit.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md bg-info px-3.5 py-1.5 text-xs font-semibold text-ivory hover:bg-info-bright"
            >
              Open Zoom link
            </a>
          ) : null}
        </div>
      ) : (
        <>
          <div className="max-h-80 space-y-4 overflow-y-auto pr-0.5">
            {orderedDays.map((dk) => {
              const slots = slotsByDay.get(dk) ?? [];
              const sample = new Date(slots[0]!.start);
              return (
                <div key={dk}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-taupe">
                    {formatDay(sample, tz)}
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                    {slots.map((slot) => {
                      const active = selected?.start === slot.start;
                      return (
                        <button
                          key={slot.start}
                          onClick={() => setSelected(slot)}
                          className={[
                            "rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                            active
                              ? "border-info/40 bg-info text-ivory"
                              : "border-bronze bg-surface text-ivory hover:border-info/40 dark:border-bronze dark:bg-surface-raised/60 dark:text-ivory",
                          ].join(" ")}
                        >
                          {formatTime(new Date(slot.start), tz)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {selected ? (
            <div className="mt-4 border-t border-bronze pt-4 dark:border-bronze">
              <p className="mb-2 text-xs text-taupe dark:text-ivory">
                <span className="text-taupe">Selected:</span>{" "}
                <span className="font-semibold text-ivory dark:text-ivory">
                  {formatDay(new Date(selected.start), tz)},{" "}
                  {formatTime(new Date(selected.start), tz)}
                </span>
              </p>
              {submit.kind === "error" ? (
                <p className="mb-2 text-xs text-error dark:text-error">{submit.message}</p>
              ) : null}
              <div className="flex gap-2">
                <button
                  disabled={submit.kind === "submitting"}
                  onClick={onConfirm}
                  className="flex-1 rounded-md bg-info px-3 py-1.5 text-xs font-semibold text-ivory hover:bg-info-bright disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submit.kind === "submitting"
                    ? "Submitting…"
                    : props.rescheduleBookingId
                      ? "Confirm reschedule"
                      : "Confirm booking"}
                </button>
                <button
                  disabled={submit.kind === "submitting"}
                  onClick={() => {
                    setSelected(null);
                    setSubmit({ kind: "idle" });
                  }}
                  className="rounded-md border border-bronze px-3 py-1.5 text-xs font-semibold text-taupe hover:bg-surface dark:border-bronze dark:text-ivory dark:hover:bg-surface-raised"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
