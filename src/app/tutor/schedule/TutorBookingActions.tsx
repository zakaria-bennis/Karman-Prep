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
      <div className="mt-2 flex flex-col gap-2 rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs">
        <p className="font-semibold text-rose-800">
          Cancel this session? The student gets a token refund automatically.
        </p>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional reason (shown to the student)"
          className="rounded border border-rose-200 bg-white px-2 py-1 text-rose-900 placeholder:text-rose-400"
        />
        <div className="flex items-center gap-1.5">
          <button
            onClick={cancel}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded bg-rose-600 px-2 py-1 font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
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
            className="rounded border border-rose-300 bg-white px-2 py-1 text-rose-700"
          >
            Back
          </button>
        </div>
        {err ? <span className="text-rose-600">{err}</span> : null}
      </div>
    );
  }

  if (mode === "rescheduling") {
    return (
      <div className="mt-2 flex flex-col gap-2 rounded-lg border border-blue-300 bg-blue-50 p-2 text-xs">
        <p className="font-semibold text-blue-900">
          Pick a new start time. The student will get an email with the new details.
        </p>
        <input
          type="datetime-local"
          value={newStart}
          onChange={(e) => setNewStart(e.target.value)}
          className="rounded border border-blue-200 bg-white px-2 py-1 text-blue-900"
        />
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional reason (shown to the student)"
          className="rounded border border-blue-200 bg-white px-2 py-1 text-blue-900 placeholder:text-blue-400"
        />
        <div className="flex items-center gap-1.5">
          <button
            onClick={reschedule}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
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
            className="rounded border border-blue-300 bg-white px-2 py-1 text-blue-700"
          >
            Back
          </button>
        </div>
        {err ? <span className="text-rose-600">{err}</span> : null}
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-1.5">
      <button
        onClick={() => setMode("rescheduling")}
        className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        <RotateCcw className="h-3 w-3" />
        Reschedule
      </button>
      <button
        onClick={() => setMode("confirming-cancel")}
        className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:border-rose-400 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
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
