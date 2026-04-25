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
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 backdrop-blur-md">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-blue-500/15 border border-blue-400/25 p-2.5">
          <CalendarClock className="w-5 h-5 text-blue-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Next session
          </p>
          <p className="mt-1 text-base font-bold text-slate-100">{date}</p>
          <p className="text-sm text-slate-300">{range}</p>
          <p className="mt-2 text-sm text-slate-400">
            with <span className="text-slate-200 font-semibold">{tutorName}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {booking.zoom_join_url ? (
          <a
            href={booking.zoom_join_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 text-white font-bold text-sm"
          >
            <Video className="w-4 h-4" />
            Join session
          </a>
        ) : null}

        {canSelfReschedule ? (
          <button
            disabled={isPending}
            onClick={() => {
              setError(null);
              setMode("rescheduling");
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 text-slate-200 font-semibold text-sm hover:bg-white/5 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reschedule
          </button>
        ) : null}

        <button
          disabled={isPending}
          onClick={onCancel}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-rose-400/30 text-rose-200 font-semibold text-sm hover:bg-rose-400/10 disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          {within ? "Cancel (within 24h)" : "Cancel"}
        </button>
      </div>

      {!canSelfReschedule && booking.reschedule_count >= 1 ? (
        <p className="mt-3 text-xs text-slate-500">
          You've already used your free reschedule for this session.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
