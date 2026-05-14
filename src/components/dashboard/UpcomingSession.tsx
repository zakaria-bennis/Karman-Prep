"use client";

// ============================================================
// UpcomingSession — student's next scheduled session card.
// Shows date/time/tutor, Join button, Cancel + Reschedule
// actions. Within-24h cancel pops a destructive confirm with
// the credit-forfeit warning copy.
//
// Reschedule mode swaps the card for a BookingWidget in
// reschedule mode; on success or cancel, reverts to the card.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Video, X, RotateCcw } from "lucide-react";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { BookingWidget, type BookingWidgetProps } from "./BookingWidget";

export interface UpcomingSessionBooking {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  zoom_join_url: string | null;
  plan_tier: "group" | "small_group" | "private" | "elite";
  reschedule_count: number;
}

export interface UpcomingSessionProps {
  booking: UpcomingSessionBooking;
  tutorName: string;
  /** Required only if the user can self-reschedule (private/elite).
   *  Group/small_group reschedules go through the admin flow. */
  rescheduleProps?: Pick<BookingWidgetProps, "tutorClerkId" | "eventTypeId" | "timeZone">;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function isWithinWindow(scheduledStart: string): boolean {
  return new Date(scheduledStart).getTime() - Date.now() < TWENTY_FOUR_HOURS_MS;
}

function formatDateRange(startIso: string, endIso: string): { date: string; range: string } {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: tz,
  }).format(start);
  const fmtTime = (d: Date) =>
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz,
    }).format(d);
  const range = `${fmtTime(start)} – ${fmtTime(end)}`;
  return { date, range };
}

function cancelWarning(plan: UpcomingSessionBooking["plan_tier"]): {
  title: string;
  description: string;
  confirmLabel: string;
} {
  if (plan === "private") {
    return {
      title: "Cancelling within 24 hours",
      description:
        "This session was paid for separately. Per our policy, cancelling now means the $135 will not be refunded and the session can't be rebooked.",
      confirmLabel: "Cancel anyway",
    };
  }
  if (plan === "elite") {
    return {
      title: "Cancelling within 24 hours",
      description:
        "This will consume one of your 8 monthly sessions with no replacement. Continue?",
      confirmLabel: "Cancel anyway",
    };
  }
  return {
    title: "Cancel session?",
    description:
      "Your seat will be released. The session itself still happens for everyone else.",
    confirmLabel: "Cancel session",
  };
}

export function UpcomingSession({ booking, tutorName, rescheduleProps }: UpcomingSessionProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [mode, setMode] = useState<"view" | "rescheduling">("view");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const within = isWithinWindow(booking.scheduled_start);
  const { date, range } = formatDateRange(booking.scheduled_start, booking.scheduled_end);
  const canSelfReschedule =
    !!rescheduleProps && booking.reschedule_count < 1 && (booking.plan_tier === "private" || booking.plan_tier === "elite");

  async function onCancel() {
    setError(null);
    const w = within
      ? cancelWarning(booking.plan_tier)
      : {
          title: "Cancel this session?",
          description:
            "You're outside the 24-hour window — cancelling is free and you can rebook later.",
          confirmLabel: "Cancel session",
        };

    const ok = await confirm({
      title: w.title,
      description: w.description,
      confirmLabel: w.confirmLabel,
      danger: within,
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/bookings/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: booking.id }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body?.error ?? `Cancel failed (${res.status})`);
          return;
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message ?? "Network error");
      }
    });
  }

  if (mode === "rescheduling" && rescheduleProps) {
    return (
      <div>
        <BookingWidget
          {...rescheduleProps}
          tutorName={tutorName}
          rescheduleBookingId={booking.id}
          onBooked={() => {
            setMode("view");
            router.refresh();
          }}
        />
        <button
          onClick={() => setMode("view")}
          className="mt-3 text-sm text-slate-400 hover:text-slate-200"
        >
          Cancel reschedule
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-1.5 shrink-0">
          <CalendarClock className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Next session
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white truncate">
            {date}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {range} · with <span className="font-semibold text-slate-800 dark:text-slate-200">{tutorName}</span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {booking.zoom_join_url ? (
          <a
            href={booking.zoom_join_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500 hover:bg-blue-400 text-white font-semibold text-xs"
          >
            <Video className="w-3.5 h-3.5" />
            Join
          </a>
        ) : null}

        {canSelfReschedule ? (
          <button
            disabled={isPending}
            onClick={() => {
              setError(null);
              setMode("rescheduling");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reschedule
          </button>
        ) : null}

        <button
          disabled={isPending}
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rose-300 dark:border-rose-400/30 text-rose-600 dark:text-rose-300 font-semibold text-xs hover:bg-rose-50 dark:hover:bg-rose-400/10 disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
          {within ? "Cancel (24h)" : "Cancel"}
        </button>
      </div>

      {!canSelfReschedule && booking.reschedule_count >= 1 ? (
        <p className="mt-2 text-[11px] text-slate-500">
          Free reschedule already used for this session.
        </p>
      ) : null}

      {error ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}
    </div>
  );
}
