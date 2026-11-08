"use client";

// ============================================================
// /admin/moderation client island: the queue table, Approve,
// Reject and Warn sender, a content search box, and the sender
// panel (warnings, recent flagged messages, recent admin actions).
// The warn dialog and sender panel live in ./ModerationDialogs.
// ============================================================

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WbPill, WbTable, type WbColumn } from "@/components/admin/workbench";
import { SenderDrawer, WarnModal, fmtDate } from "./ModerationDialogs";
import type { QueueItem } from "./page";

interface Props {
  initialItems: QueueItem[];
  tab: "pending" | "history";
  initialQuery: string;
}

const CELL = { minWidth: 0, overflowWrap: "anywhere", textAlign: "left" } as const;

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

  function clearSearch() {
    setQuery("");
    submitQuery("");
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

  const empty = initialQuery ? (
    <>
      <b>{tab === "pending" ? "No matches for that search." : "No matches in the history."}</b>
      <button type="button" className="wb-btn" onClick={clearSearch} style={{ marginTop: 8 }}>
        Clear the search
      </button>
    </>
  ) : tab === "pending" ? (
    <b>Nothing is waiting for review.</b>
  ) : (
    <b>No rejected messages yet.</b>
  );

  const actionColumn: WbColumn<QueueItem> = {
    key: "actions",
    label: "",
    cell: (it) => (
      <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button
            type="button"
            className="wb-btn"
            onClick={() => act(it, "approve")}
            disabled={pending}
          >
            Approve and deliver
          </button>
          <button
            type="button"
            className="wb-btn"
            data-variant="danger"
            onClick={() => act(it, "reject")}
            disabled={pending}
          >
            Reject
          </button>
          <button
            type="button"
            className="wb-btn"
            onClick={() => setWarnFor(it)}
            disabled={pending}
          >
            Warn sender
          </button>
        </span>
        {errorById[it.id] ? (
          <small role="alert" style={{ color: "var(--late)" }}>
            {errorById[it.id]}
          </small>
        ) : null}
      </span>
    ),
  };

  return (
    <>
      <form
        role="search"
        className="wb-search"
        onSubmit={(e) => {
          e.preventDefault();
          submitQuery(query);
        }}
      >
        <input
          className="wb-input"
          type="search"
          placeholder="Message text"
          aria-label="Search message text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="wb-btn">
          Search
        </button>
        {query || initialQuery ? (
          <button type="button" className="wb-btn" onClick={clearSearch}>
            Clear
          </button>
        ) : null}
      </form>

      <WbTable<QueueItem>
        caption={tab === "pending" ? "Messages waiting for review" : "Rejected messages"}
        rows={items}
        rowKey={(it) => `${it.kind}:${it.id}`}
        empty={empty}
        columns={[
          {
            key: "message",
            label: "Message",
            cell: (it) => (
              <span style={{ ...CELL, flex: "1 1 auto" }}>
                <span style={{ whiteSpace: "pre-wrap" }}>
                  {it.content || <em style={{ color: "var(--mute)" }}>No text</em>}
                </span>
                {it.media_urls.length > 0 && (
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                    {it.media_urls.map((u) => (
                      <a key={u} href={u} target="_blank" rel="noreferrer">
                        {u.split("/").pop() ?? "attachment"}
                      </a>
                    ))}
                  </span>
                )}
                {(it.keyword_flagged || it.ai_flagged) && (
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    {it.keyword_flagged && <WbPill tone="warn">Keyword</WbPill>}
                    {it.ai_flagged && (
                      <WbPill tone="fail">
                        AI{it.ai_flag_reason ? `: ${it.ai_flag_reason}` : ""}
                      </WbPill>
                    )}
                  </span>
                )}
                {tab === "history" && it.rejection_message && (
                  <small>Rejected: &ldquo;{it.rejection_message}&rdquo;</small>
                )}
              </span>
            ),
          },
          {
            key: "from",
            label: "From",
            cell: (it) => (
              <span style={CELL}>
                <button
                  type="button"
                  onClick={() => setSenderFor(it)}
                  title="Open sender history"
                  style={{
                    padding: 0,
                    border: 0,
                    background: "none",
                    color: "inherit",
                    font: "inherit",
                    fontWeight: 600,
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  {it.sender.display_name}
                </button>
                <small>{it.sender.email}</small>
                {it.sender.warning_count > 0 && (
                  <span style={{ display: "block", marginTop: 4 }}>
                    <WbPill tone="warn">
                      {it.sender.warning_count} earlier{" "}
                      {it.sender.warning_count === 1 ? "warning" : "warnings"}
                    </WbPill>
                  </span>
                )}
              </span>
            ),
          },
          {
            key: "where",
            label: "Where",
            cell: (it) => (
              <span style={CELL}>
                {it.kind === "chat" ? "Channel" : "Direct message"}
                {it.channel && <small>#{it.channel.name ?? "channel"}</small>}
                {it.recipient && <small>to {it.recipient.display_name}</small>}
              </span>
            ),
          },
          {
            key: "when",
            label: "Sent",
            cell: (it) => (
              <time dateTime={it.created_at} style={{ whiteSpace: "nowrap" }}>
                {fmtDate(it.created_at)}
              </time>
            ),
          },
          ...(tab === "pending" ? [actionColumn] : []),
        ]}
      />

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
