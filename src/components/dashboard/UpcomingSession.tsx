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
    description: "Your seat will be released. The session itself still happens for everyone else.",
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
    !!rescheduleProps &&
    booking.reschedule_count < 1 &&
    (booking.plan_tier === "private" || booking.plan_tier === "elite");

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
          className="mt-3 text-sm text-taupe hover:text-ivory"
        >
          Cancel reschedule
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-bronze bg-surface p-4 dark:border-bronze dark:bg-surface/40">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg border border-info/20 bg-info/10 p-1.5">
          <CalendarClock className="h-4 w-4 text-info" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-taupe">
            Next session
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-ivory dark:text-ivory">{date}</p>
          <p className="text-xs text-taupe dark:text-taupe">
            {range} · with{" "}
            <span className="font-semibold text-ivory dark:text-ivory">{tutorName}</span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {booking.zoom_join_url ? (
          <a
            href={booking.zoom_join_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-info px-3 py-1.5 text-xs font-semibold text-ivory hover:bg-info-bright"
          >
            <Video className="h-3.5 w-3.5" />
            Join
          </a>
        ) : null}
        {booking.zoom_join_url ? (
          <span className="basis-full text-[11px] text-taupe dark:text-taupe">
            You can join from this link directly &mdash; the same details also arrive by email.
          </span>
        ) : null}

        {canSelfReschedule ? (
          <button
            disabled={isPending}
            onClick={() => {
              setError(null);
              setMode("rescheduling");
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-bronze px-3 py-1.5 text-xs font-semibold text-ivory hover:bg-surface disabled:opacity-50 dark:border-bronze dark:text-ivory dark:hover:bg-surface-raised"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reschedule
          </button>
        ) : null}

        <button
          disabled={isPending}
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-md border border-error/40 px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/10 disabled:opacity-50 dark:border-error/30 dark:text-error-bright dark:hover:bg-error/10"
        >
          <X className="h-3.5 w-3.5" />
          {within ? "Cancel (24h)" : "Cancel"}
        </button>
      </div>

      {!canSelfReschedule && booking.reschedule_count >= 1 ? (
        <p className="mt-2 text-[11px] text-taupe">
          Free reschedule already used for this session.
        </p>
      ) : null}

      {error ? <p className="mt-2 text-xs text-error dark:text-error">{error}</p> : null}
    </div>
  );
}
