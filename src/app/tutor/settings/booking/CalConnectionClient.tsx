"use client";

// ============================================================
// Client island for /tutor/settings/booking. Renders the three
// connection states + the "pick event-type" dropdown + the
// disconnect action. Rendered inside the page's `.wb` box.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Chevron, SectionHeader } from "@/components/portal";
import { WbPill } from "@/components/admin/workbench";
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
      <Card>
        <SectionHeader title="Connect your Cal.com account" />
        <p className="kp-meta">
          We&rsquo;ll read your event types and point your Karman students at the right one. You can
          disconnect at any time.
        </p>
        {/* A plain link, not next/link: this starts the Cal OAuth flow and must not be prefetched. */}
        <a className="kp-cta" href="/api/cal/oauth/start">
          <span>Connect Cal.com</span>
          <Chevron />
        </a>
      </Card>
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
    <Card>
      <SectionHeader title="Cal.com" note={<WbPill tone="ok">Connected</WbPill>} />
      {status.connectedAt ? (
        <p className="kp-meta">
          Connected since{" "}
          <span className="kp-num">{new Date(status.connectedAt).toLocaleDateString()}</span>.
        </p>
      ) : null}

      {status.eventTypeTitle ? (
        <p className="kp-meta">
          Karman students book <b style={{ color: "var(--ink)" }}>{status.eventTypeTitle}</b>.
        </p>
      ) : (
        <p className="kp-meta" style={{ color: "var(--warn)" }}>
          Almost done. Pick which of your event types is the Karman session.
        </p>
      )}

      {eventTypesError ? (
        <p className="wb-alert" role="alert" style={{ marginTop: 12 }}>
          {eventTypesError}
        </p>
      ) : eventTypes.length === 0 ? (
        <p className="kp-meta">
          Your Cal account has no event types yet. Make one on cal.com (60 minutes works well), then
          refresh this page.
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: 8,
            marginTop: 12,
          }}
        >
          <label className="wb-field" style={{ flex: "1 1 240px", minWidth: 0 }}>
            <span>
              {status.eventTypeId
                ? "Change which event type is the Karman session"
                : "Pick the Karman session event type"}
            </span>
            <select
              className="wb-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value === "" ? "" : Number(e.target.value))}
              disabled={busy}
            >
              {eventTypes.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} · {ev.lengthInMinutes} min
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="wb-btn"
            data-variant={status.eventTypeId ? undefined : "primary"}
            onClick={onPick}
            disabled={busy || typeof selectedId !== "number"}
          >
            {busy ? "Saving…" : status.eventTypeId ? "Save change" : "Save event type"}
          </button>
        </div>
      )}

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
        <button
          type="button"
          className="wb-btn"
          data-variant="danger"
          onClick={onDisconnect}
          disabled={busy}
        >
          Disconnect Cal account
        </button>
      </div>

      {err ? (
        <p className="wb-alert" role="alert" style={{ marginTop: 12 }}>
          {err}
        </p>
      ) : null}
    </Card>
  );
}
