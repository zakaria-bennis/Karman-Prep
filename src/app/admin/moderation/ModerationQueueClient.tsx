"use client";

// ============================================================
// /admin/moderation client island.
//
// Renders the queue list, the approve/reject/warn action buttons,
// a content search box, and a sender drill-in drawer that pulls
// warning count + recent-flagged history + recent admin actions
// for any sender on demand.
// ============================================================

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Check, MessageSquare, Search, ShieldX, User2, X } from "lucide-react";
import type { QueueItem } from "./page";

interface Props {
  initialItems: QueueItem[];
  tab: "pending" | "history";
  initialQuery: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ModerationQueueClient({ initialItems, tab, initialQuery }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState(initialItems);
  const [pending, startTransition] = useTransition();
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [warnFor, setWarnFor] = useState<QueueItem | null>(null);
  const [senderFor, setSenderFor] = useState<QueueItem | null>(null);
  const [query, setQuery] = useState(initialQuery);

  // Keep visible items synced when the server returns a different page
  // (e.g. after a tab change or search submit).
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  function submitQuery(next: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next.trim()) params.set("q", next.trim());
    else params.delete("q");
    params.set("tab", tab);
    startTransition(() => router.push(`?${params.toString()}`));
  }

  async function act(item: QueueItem, action: "approve" | "reject") {
    setErrorById((m) => ({ ...m, [item.id]: "" }));
    try {
      const res = await fetch(`/api/admin/moderation/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: item.kind, messageId: item.id }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `Failed to ${action} (HTTP ${res.status})`);
      }
      setItems((prev) => prev.filter((r) => r.id !== item.id));
      startTransition(() => router.refresh());
    } catch (err) {
      setErrorById((m) => ({
        ...m,
        [item.id]: err instanceof Error ? err.message : "Unexpected error",
      }));
    }
  }

  return (
    <>
      <div className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-taupe" />
          <input
            type="search"
            placeholder="Search content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitQuery(query);
            }}
            className="w-full max-w-md rounded-lg border border-bronze bg-night/60 py-2 pl-9 pr-9 text-sm text-ivory placeholder:text-taupe focus:border-bronze focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery("");
                submitQuery("");
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-taupe hover:text-ivory"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-bronze bg-surface/40 px-6 py-16 text-center text-sm text-taupe">
          {tab === "pending" ? (
            <>
              <ShieldX className="mx-auto mb-3 h-6 w-6 text-success/80" />
              {initialQuery ? "No matches for that search." : "No messages awaiting review."}
            </>
          ) : initialQuery ? (
            "No matches in the rejected history."
          ) : (
            "No rejected messages on record yet."
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li
              key={`${it.kind}:${it.id}`}
              className="rounded-xl border border-bronze bg-surface/40 p-4 text-sm"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-surface-raised/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ivory">
                  {it.kind === "chat" ? (
                    <>
                      <MessageSquare className="h-3 w-3" /> Channel
                    </>
                  ) : (
                    <>
                      <User2 className="h-3 w-3" /> DM
                    </>
                  )}
                </span>
                <button
                  onClick={() => setSenderFor(it)}
                  className="text-ivory hover:underline"
                  title="Open sender history"
                >
                  {it.sender.display_name}
                </button>
                <span className="text-xs text-taupe">{it.sender.email}</span>
                {it.sender.warning_count > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[11px] font-semibold text-warning-bright">
                    <AlertTriangle className="h-3 w-3" />
                    {it.sender.warning_count} prior{" "}
                    {it.sender.warning_count === 1 ? "warning" : "warnings"}
                  </span>
                ) : null}
                {it.channel ? (
                  <span className="text-xs text-taupe">
                    in <span className="text-ivory">#{it.channel.name ?? "channel"}</span>
                  </span>
                ) : null}
                {it.recipient ? (
                  <span className="text-xs text-taupe">
                    to <span className="text-ivory">{it.recipient.display_name}</span>
                  </span>
                ) : null}
                <span className="ml-auto text-xs text-taupe">{fmtDate(it.created_at)}</span>
              </div>

              <div className="mb-3 whitespace-pre-wrap rounded-lg border border-bronze bg-night/60 px-3 py-2 text-ivory">
                {it.content || <span className="italic text-taupe">(no text content)</span>}
                {it.media_urls.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {it.media_urls.map((u) => (
                      <a
                        key={u}
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-info-bright underline-offset-2 hover:underline"
                      >
                        {u.split("/").pop() ?? "attachment"}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                {it.keyword_flagged ? (
                  <span className="rounded-md bg-warning/10 px-2 py-0.5 text-warning-bright">
                    Keyword
                  </span>
                ) : null}
                {it.ai_flagged ? (
                  <span className="rounded-md bg-error/10 px-2 py-0.5 text-error-bright">
                    AI {it.ai_flag_reason ? `· ${it.ai_flag_reason}` : ""}
                  </span>
                ) : null}
                {tab === "history" && it.rejection_message ? (
                  <span className="italic text-taupe">&ldquo;{it.rejection_message}&rdquo;</span>
                ) : null}
              </div>

              {tab === "pending" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => act(it, "approve")}
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success-bright transition-colors hover:bg-success/20 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve &amp; deliver
                  </button>
                  <button
                    onClick={() => act(it, "reject")}
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded-md border border-error/30 bg-error/10 px-3 py-1.5 text-xs font-semibold text-error-bright transition-colors hover:bg-error/20 disabled:opacity-50"
                  >
                    <ShieldX className="h-3.5 w-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => setWarnFor(it)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning-bright transition-colors hover:bg-warning/20 disabled:opacity-50"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" /> Warn sender
                  </button>
                  {errorById[it.id] ? (
                    <span className="text-xs text-error">{errorById[it.id]}</span>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {warnFor ? (
        <WarnModal
          item={warnFor}
          onClose={() => setWarnFor(null)}
          onDone={() => {
            setWarnFor(null);
            startTransition(() => router.refresh());
          }}
        />
      ) : null}

      {senderFor ? <SenderDrawer item={senderFor} onClose={() => setSenderFor(null)} /> : null}
    </>
  );
}

function WarnModal({
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

  async function submit() {
    if (!reason.trim()) {
      setErr("Reason is required so we can show the sender what to fix.");
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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-night/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-bronze bg-surface p-5 shadow-2xl">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h2 className="text-base font-semibold text-ivory">Warn {item.sender.display_name}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded p-1 text-taupe hover:text-ivory"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="mb-3 block text-xs text-taupe">
          Severity
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as "low" | "medium" | "high")}
            className="mt-1 w-full rounded-md border border-bronze bg-night px-2 py-1.5 text-sm text-ivory"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="mb-3 block text-xs text-taupe">
          Reason
          <textarea
            ref={inputRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Why is this user being warned? Sender will see this..."
            className="mt-1 w-full rounded-md border border-bronze bg-night px-2 py-1.5 text-sm text-ivory placeholder:text-taupe"
          />
        </label>
        {err ? <p className="mb-3 text-xs text-error">{err}</p> : null}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-bronze bg-surface-raised/60 px-3 py-1.5 text-xs text-ivory hover:bg-surface-raised disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !reason.trim()}
            className="rounded-md border border-warning/40 bg-warning/15 px-3 py-1.5 text-xs font-semibold text-warning-bright hover:bg-warning/25 disabled:opacity-50"
          >
            {busy ? "Issuing..." : "Issue warning"}
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

function SenderDrawer({ item, onClose }: { item: QueueItem; onClose: () => void }) {
  const [history, setHistory] = useState<SenderHistory | null>(null);
  const [err, setErr] = useState("");
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
    <div className="fixed inset-0 z-30 flex justify-end bg-night/60">
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-bronze bg-surface p-5">
        <div className="mb-4 flex items-center gap-2">
          <User2 className="h-4 w-4 text-taupe" />
          <h2 className="text-base font-semibold text-ivory">{item.sender.display_name}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded p-1 text-taupe hover:text-ivory"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-taupe">{item.sender.email}</p>

        {err ? <p className="text-xs text-error">{err}</p> : null}
        {!history && !err ? <p className="text-xs text-taupe">Loading...</p> : null}

        {history ? (
          <>
            <Section title={`Warnings (${history.warningCount})`}>
              {history.warningCount === 0 ? (
                <p className="text-xs text-taupe">No prior warnings.</p>
              ) : (
                <p className="text-xs text-warning-bright/80">
                  {history.warningCount} prior {history.warningCount === 1 ? "warning" : "warnings"}{" "}
                  on record.
                </p>
              )}
            </Section>
            <Section title="Recent flagged / rejected messages">
              {history.recentFlagged.length === 0 ? (
                <p className="text-xs text-taupe">No flagged or rejected messages on record.</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {history.recentFlagged.map((m) => (
                    <li key={`${m.kind}:${m.id}`} className="rounded-md bg-night/60 p-2">
                      <div className="mb-0.5 flex items-center gap-2 text-[11px] text-taupe">
                        <span className="uppercase">{m.kind}</span>
                        <span>{m.moderation_status}</span>
                        <span className="ml-auto">{fmtDate(m.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-ivory">
                        {m.content || <em className="text-taupe">(no text content)</em>}
                      </p>
                      {m.ai_flag_reason ? (
                        <p className="mt-1 text-[11px] text-error-bright/80">{m.ai_flag_reason}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Recent admin actions">
              {history.recentActions.length === 0 ? (
                <p className="text-xs text-taupe">No prior admin actions.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {history.recentActions.map((a) => (
                    <li key={a.id} className="rounded-md bg-night/60 px-2 py-1.5">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-semibold text-ivory">{a.action_type}</span>
                        {a.severity ? <span className="text-taupe">({a.severity})</span> : null}
                        <span className="ml-auto text-taupe">{fmtDate(a.created_at)}</span>
                      </div>
                      {a.reason ? <p className="mt-0.5 text-taupe">{a.reason}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-taupe">
        {title}
      </h3>
      {children}
    </div>
  );
}
