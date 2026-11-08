"use client";

// ============================================================
// The warn dialog and the sender panel for /admin/moderation.
// Warn posts to /api/admin/moderation/warn; the sender panel
// reads /api/admin/moderation/sender/:uuid on open.
// ============================================================

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { QueueItem } from "./page";

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function useEscape(onClose: () => void, disabled = false) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !disabled) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, disabled]);
}

const BACKDROP = {
  position: "fixed",
  inset: 0,
  zIndex: 30,
  display: "flex",
  background: "color-mix(in srgb, var(--sunk) 70%, transparent)",
} as const;

const PANEL = {
  border: "1px solid var(--line)",
  borderRadius: 4,
  background: "var(--card)",
  padding: 20,
  gap: 14,
} as const;

const TITLE = { margin: 0, fontSize: "1.1rem", fontWeight: 600 } as const;

export function WarnModal({
  item,
  onClose,
  onDone,
}: {
  item: QueueItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEscape(onClose, busy);

  async function submit() {
    if (!reason.trim()) {
      setErr("Add a reason so the sender knows what to fix.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/moderation/warn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetUserUuid: item.sender.uuid,
          reason: reason.trim(),
          severity,
          relatedMessageId: item.id,
          relatedMessageKind: item.kind,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `Failed to warn (HTTP ${res.status})`);
      }
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...BACKDROP, alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="warn-title"
        className="wb"
        style={{ ...PANEL, width: "100%", maxWidth: 460 }}
      >
        <h2 id="warn-title" style={TITLE}>
          Warn {item.sender.display_name}
        </h2>
        <label className="wb-field">
          <span>Severity</span>
          <select
            className="wb-select"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as "low" | "medium" | "high")}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="wb-field">
          <span>Reason (the sender sees this)</span>
          <textarea
            ref={inputRef}
            className="wb-textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="What should they change?"
          />
        </label>
        {err ? (
          <p role="alert" className="wb-alert" style={{ margin: 0 }}>
            {err}
          </p>
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="wb-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="wb-btn"
            data-variant="primary"
            onClick={submit}
            disabled={busy || !reason.trim()}
          >
            {busy ? "Sending…" : "Issue warning"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SenderHistory {
  user: { uuid: string; display_name: string; email: string };
  warningCount: number;
  recentFlagged: Array<{
    kind: "chat" | "dm";
    id: string;
    content: string | null;
    moderation_status: string;
    ai_flag_reason: string | null;
    created_at: string;
  }>;
  recentActions: Array<{
    id: string;
    action_type: string;
    reason: string | null;
    severity: string | null;
    created_at: string;
  }>;
}

const ITEM = {
  border: "1px solid var(--line)",
  borderRadius: 4,
  padding: "6px 8px",
  fontSize: "0.85rem",
} as const;

export function SenderDrawer({ item, onClose }: { item: QueueItem; onClose: () => void }) {
  const [history, setHistory] = useState<SenderHistory | null>(null);
  const [err, setErr] = useState("");
  useEscape(onClose);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/moderation/sender/${item.sender.uuid}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as SenderHistory;
      })
      .then((d) => {
        if (!cancelled) setHistory(d);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [item.sender.uuid]);

  return (
    <div style={{ ...BACKDROP, justifyContent: "flex-end" }} onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="sender-title"
        className="wb"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...PANEL,
          height: "100%",
          width: "100%",
          maxWidth: 440,
          overflowY: "auto",
          borderRadius: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="sender-title" style={TITLE}>
              {item.sender.display_name}
            </h2>
            <p className="wb-note" style={{ overflowWrap: "anywhere" }}>
              {item.sender.email}
            </p>
          </div>
          <button type="button" className="wb-btn" onClick={onClose}>
            Close
          </button>
        </div>

        {err ? (
          <p role="alert" className="wb-alert" style={{ margin: 0 }}>
            {err}
          </p>
        ) : null}
        {!history && !err ? <p className="wb-note">Loading…</p> : null}

        {history ? (
          <>
            <Block title={`Warnings (${history.warningCount})`}>
              <p className="wb-note">
                {history.warningCount === 0
                  ? "No earlier warnings."
                  : `${history.warningCount} earlier ${history.warningCount === 1 ? "warning" : "warnings"} on record.`}
              </p>
            </Block>
            <Block title="Recent flagged or rejected messages">
              {history.recentFlagged.length === 0 ? (
                <p className="wb-note">None on record.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
                  {history.recentFlagged.map((m) => (
                    <li key={`${m.kind}:${m.id}`} style={ITEM}>
                      <span className="wb-note" style={{ display: "flex", gap: 8 }}>
                        <span>{m.kind === "chat" ? "Channel" : "Direct message"}</span>
                        <span>{m.moderation_status}</span>
                        <span style={{ marginLeft: "auto" }}>{fmtDate(m.created_at)}</span>
                      </span>
                      <p style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>
                        {m.content || <em style={{ color: "var(--mute)" }}>No text</em>}
                      </p>
                      {m.ai_flag_reason ? (
                        <p style={{ margin: "2px 0 0", color: "var(--late)" }}>
                          {m.ai_flag_reason}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Block>
            <Block title="Recent admin actions">
              {history.recentActions.length === 0 ? (
                <p className="wb-note">None yet.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
                  {history.recentActions.map((a) => (
                    <li key={a.id} style={ITEM}>
                      <span style={{ display: "flex", gap: 8 }}>
                        <b>{a.action_type}</b>
                        {a.severity ? <span className="wb-note">({a.severity})</span> : null}
                        <span className="wb-note" style={{ marginLeft: "auto" }}>
                          {fmtDate(a.created_at)}
                        </span>
                      </span>
                      {a.reason ? (
                        <p className="wb-note" style={{ marginTop: 2 }}>
                          {a.reason}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Block>
          </>
        ) : null}
      </aside>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h3 style={{ margin: "0 0 6px", fontSize: "0.9rem", fontWeight: 600 }}>{title}</h3>
      {children}
    </section>
  );
}
