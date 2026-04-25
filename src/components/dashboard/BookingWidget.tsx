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
    <div className="rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-4">
      <header className="flex items-baseline justify-between mb-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {props.rescheduleBookingId ? "Reschedule with" : "Book with"}
          </p>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">
            {props.tutorName}
          </h3>
        </div>
        {!props.rescheduleBookingId && typeof props.tokensAvailable === "number" ? (
          <span className="text-xs text-slate-500 shrink-0 ml-3 inline-flex items-baseline gap-1">
            <span className="text-base font-extrabold text-slate-900 dark:text-white leading-none">
              {props.tokensAvailable}
            </span>
            <span>token{props.tokensAvailable === 1 ? "" : "s"}</span>
          </span>
        ) : null}
      </header>

      {load.kind === "loading" ? (
        <div className="flex items-center gap-2 text-slate-500 text-xs py-6 justify-center">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading available times…
        </div>
      ) : load.kind === "error" ? (
        <p className="text-xs text-rose-600 dark:text-rose-400 py-6 text-center">{load.message}</p>
      ) : orderedDays.length === 0 ? (
        <div className="flex flex-col items-center text-slate-500 py-6">
          <Calendar className="w-5 h-5 mb-1.5 opacity-60" />
          <p className="text-xs">No openings in the next two weeks.</p>
        </div>
      ) : submit.kind === "success" ? (
        <div className="flex flex-col items-center py-5 text-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-2" />
          <p className="text-sm text-slate-900 dark:text-white font-semibold mb-0.5">
            {props.rescheduleBookingId ? "Session rescheduled" : "Session booked"}
          </p>
          <p className="text-xs text-slate-500 mb-3">Calendar invite is on its way.</p>
          {submit.joinUrl ? (
            <a
              href={submit.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3.5 py-1.5 rounded-md bg-blue-500 hover:bg-blue-400 text-white font-semibold text-xs"
            >
              Open Zoom link
            </a>
          ) : null}
        </div>
      ) : (
        <>
          <div className="space-y-4 max-h-80 overflow-y-auto pr-0.5">
            {orderedDays.map((dk) => {
              const slots = slotsByDay.get(dk) ?? [];
              const sample = new Date(slots[0]!.start);
              return (
                <div key={dk}>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    {formatDay(sample, tz)}
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                    {slots.map((slot) => {
                      const active = selected?.start === slot.start;
                      return (
                        <button
                          key={slot.start}
                          onClick={() => setSelected(slot)}
                          className={[
                            "px-2 py-1.5 rounded-md text-xs font-medium border transition-colors",
                            active
                              ? "bg-blue-500 text-white border-blue-500"
                              : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400",
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
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                <span className="text-slate-500">Selected:</span>{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatDay(new Date(selected.start), tz)}, {formatTime(new Date(selected.start), tz)}
                </span>
              </p>
              {submit.kind === "error" ? (
                <p className="text-xs text-rose-600 dark:text-rose-400 mb-2">{submit.message}</p>
              ) : null}
              <div className="flex gap-2">
                <button
                  disabled={submit.kind === "submitting"}
                  onClick={onConfirm}
                  className="flex-1 px-3 py-1.5 rounded-md bg-blue-500 hover:bg-blue-400 text-white font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
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
