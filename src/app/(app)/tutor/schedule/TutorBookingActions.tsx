"use client";

// ============================================================
// Per-booking action island on /tutor/schedule. Audit #8.
//
// Lets the tutor cancel or reschedule their own private/elite
// sessions without an admin intervening. Both calls hit the
// existing /api/bookings/{cancel,reschedule} routes, which now
// detect tutor-initiated changes and never forfeit the student's
// credit (full refund on tutor cancel; no token consume on
// tutor reschedule, even within 24h).
//
// Group + small_group bookings don't expose these buttons — those
// are admin-pushed across an entire cohort and need to be moved
// by the admin from /admin/sessions, not unilaterally by the tutor.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, X } from "lucide-react";

export type TutorBookingActionTier = "private" | "elite" | "group" | "small_group";

interface Props {
  bookingId: string;
  scheduledStart: string;
  tier: TutorBookingActionTier;
}

export function TutorBookingActions({ bookingId, scheduledStart, tier }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "confirming-cancel" | "rescheduling">("idle");
  const [reason, setReason] = useState("");
  const [newStart, setNewStart] = useState<string>(() => toDatetimeLocal(scheduledStart));

  // Group/small_group sessions are admin-pushed; tutors don't move them
  // unilaterally. Render nothing for those tiers.
  if (tier !== "private" && tier !== "elite") return null;

  async function cancel() {
    setErr(null);
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingId, reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `Failed (HTTP ${res.status})`);
      }
      startTransition(() => router.refresh());
      setMode("idle");
      setReason("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't cancel");
    }
  }

  async function reschedule() {
    setErr(null);
    if (!newStart) {
      setErr("Pick a new start time first.");
      return;
    }
    const iso = new Date(newStart).toISOString();
    try {
      const res = await fetch("/api/bookings/reschedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingId, newStart: iso, reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `Failed (HTTP ${res.status})`);
      }
      startTransition(() => router.refresh());
      setMode("idle");
      setReason("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't reschedule");
    }
  }

  if (mode === "confirming-cancel") {
    return (
      <div className="mt-2 flex flex-col gap-2 rounded-lg border border-error/40 bg-error/10 p-2 text-xs">
        <p className="font-semibold text-error">
          Cancel this session? The student gets a token refund automatically.
        </p>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional reason (shown to the student)"
          className="rounded border border-error/40 bg-surface px-2 py-1 text-error placeholder:text-error"
        />
        <div className="flex items-center gap-1.5">
          <button
            onClick={cancel}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded bg-error px-2 py-1 font-semibold text-ivory hover:bg-error-bright disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Confirm cancel
          </button>
          <button
            onClick={() => {
              setMode("idle");
              setReason("");
              setErr(null);
            }}
            disabled={pending}
            className="rounded border border-error/40 bg-surface px-2 py-1 text-error"
          >
            Back
          </button>
        </div>
        {err ? <span className="text-error">{err}</span> : null}
      </div>
    );
  }

  if (mode === "rescheduling") {
    return (
      <div className="mt-2 flex flex-col gap-2 rounded-lg border border-info/40 bg-info/10 p-2 text-xs">
        <p className="font-semibold text-info">
          Pick a new start time. The student will get an email with the new details.
        </p>
        <input
          type="datetime-local"
          value={newStart}
          onChange={(e) => setNewStart(e.target.value)}
          className="rounded border border-info/40 bg-surface px-2 py-1 text-info"
        />
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional reason (shown to the student)"
          className="rounded border border-info/40 bg-surface px-2 py-1 text-info placeholder:text-info"
        />
        <div className="flex items-center gap-1.5">
          <button
            onClick={reschedule}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded bg-info px-2 py-1 font-semibold text-ivory hover:bg-info-bright disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Confirm reschedule
          </button>
          <button
            onClick={() => {
              setMode("idle");
              setReason("");
              setErr(null);
            }}
            disabled={pending}
            className="rounded border border-info/40 bg-surface px-2 py-1 text-info"
          >
            Back
          </button>
        </div>
        {err ? <span className="text-error">{err}</span> : null}
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-1.5">
      <button
        onClick={() => setMode("rescheduling")}
        className="inline-flex items-center gap-1 rounded border border-bronze bg-surface px-2 py-0.5 text-[11px] font-semibold text-ivory hover:border-info/40 hover:text-info dark:border-bronze dark:bg-surface dark:text-ivory"
      >
        <RotateCcw className="h-3 w-3" />
        Reschedule
      </button>
      <button
        onClick={() => setMode("confirming-cancel")}
        className="inline-flex items-center gap-1 rounded border border-bronze bg-surface px-2 py-0.5 text-[11px] font-semibold text-ivory hover:border-error/40 hover:text-error dark:border-bronze dark:bg-surface dark:text-ivory"
      >
        <X className="h-3 w-3" />
        Cancel
      </button>
    </div>
  );
}

/** Convert ISO timestamp to the value shape <input type="datetime-local">
 *  expects: "YYYY-MM-DDTHH:mm" in the browser's local time zone. */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}
