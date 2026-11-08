"use client";

// ============================================================
// Client island for /tutor/settings/booking. Renders the three
// connection states + the "pick event-type" dropdown + the
// disconnect action.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, CheckCircle2, Link2, Unlink } from "lucide-react";
import type { CalConnectionStatus } from "@/lib/supabase/queries/cal-oauth";
import type { CalEventType } from "@/lib/integrations/cal/oauth";
import { pickCalEventTypeAction } from "./actions";

interface Props {
  status: CalConnectionStatus;
  eventTypes: CalEventType[];
  eventTypesError: string | null;
}

export function CalConnectionClient({ status, eventTypes, eventTypesError }: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [err, setErr] = useState("");
  const [selectedId, setSelectedId] = useState<number | "">(
    status.eventTypeId ?? eventTypes[0]?.id ?? ""
  );

  if (!status.connected) {
    return (
      <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--card)] px-6 py-8 text-center dark:border-[color:var(--line)] dark:bg-[color-mix(in_srgb,var(--card)_40%,transparent)]">
        <Link2 className="mx-auto mb-3 h-6 w-6 text-[color:var(--info)]" />
        <h2 className="text-lg font-semibold text-[color:var(--ink)] dark:text-[color:var(--ink)]">
          Connect your Cal.com account
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-[color:var(--mute)] dark:text-[color:var(--mute)]">
          We&rsquo;ll read your event-types and point your Karman students at the right one. You can
          disconnect anytime.
        </p>
        <a
          href="/api/cal/oauth/start"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[color:var(--info)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)] hover:bg-[color:var(--info)]"
        >
          <CalendarPlus className="h-4 w-4" /> Connect Cal.com
        </a>
      </div>
    );
  }

  async function onPick() {
    if (typeof selectedId !== "number") {
      setErr("Please pick an event-type.");
      return;
    }
    setErr("");
    try {
      await pickCalEventTypeAction({ eventTypeId: selectedId });
      startTransition(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save your pick.");
    }
  }

  async function onDisconnect() {
    setErr("");
    try {
      const res = await fetch("/api/cal/oauth/disconnect", { method: "POST" });
      if (!res.ok) throw new Error(`Disconnect failed (HTTP ${res.status})`);
      startTransition(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't disconnect.");
    }
  }

  return (
    <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--card)] px-6 py-6">
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-[color:var(--good)]" />
        <span className="font-semibold text-[color:var(--ink)]">Cal.com connected</span>
        {status.connectedAt ? (
          <span className="text-xs text-[color:var(--mute)]">
            since {new Date(status.connectedAt).toLocaleDateString()}
          </span>
        ) : null}
      </div>

      {status.eventTypeTitle ? (
        <p className="mt-2 text-sm text-[color:var(--mute)]">
          Karman students book against{" "}
          <span className="font-semibold text-[color:var(--ink)]">{status.eventTypeTitle}</span>.
        </p>
      ) : (
        <p className="mt-2 text-sm text-[color:var(--warn)]">
          Almost done — pick which of your event-types is the Karman session below.
        </p>
      )}

      {eventTypesError ? (
        <p className="mt-3 text-sm text-[color:var(--late)]">{eventTypesError}</p>
      ) : eventTypes.length === 0 ? (
        <p className="mt-3 text-sm text-[color:var(--mute)]">
          You don&rsquo;t have any event-types in your Cal account yet. Create one (60 min works
          well) on cal.com and refresh this page.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          <label className="block text-xs font-semibold text-[color:var(--mute)]">
            {status.eventTypeId
              ? "Change which event-type is the Karman session"
              : "Pick the Karman session event-type"}
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={busy}
            className="w-full rounded-md border border-[color:var(--line)] bg-[color:var(--card)] px-2 py-1.5 text-sm text-[color:var(--ink)]"
          >
            {eventTypes.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} · {ev.lengthInMinutes} min
              </option>
            ))}
          </select>
          <button
            onClick={onPick}
            disabled={busy || typeof selectedId !== "number"}
            className="rounded-md bg-[color:var(--info)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink)] hover:bg-[color:var(--info)] disabled:opacity-50"
          >
            {busy ? "Saving…" : status.eventTypeId ? "Save change" : "Save event-type"}
          </button>
        </div>
      )}

      <div className="mt-6 border-t border-[color:var(--line)] pt-4">
        <button
          onClick={onDisconnect}
          disabled={busy}
          className="inline-flex items-center gap-1 text-xs text-[color:var(--late)] hover:underline disabled:opacity-50"
        >
          <Unlink className="h-3 w-3" /> Disconnect Cal account
        </button>
      </div>

      {err ? <p className="mt-3 text-sm text-[color:var(--late)]">{err}</p> : null}
    </div>
  );
}
