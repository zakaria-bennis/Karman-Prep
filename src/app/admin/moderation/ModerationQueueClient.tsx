"use client";

// ============================================================
// /admin/moderation client island.
//
// Hosts the list of queue items and the approve / reject action
// buttons. Optimistically removes a row from the visible list
// when an action succeeds; a server refresh reconciles state.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageSquare, ShieldX, User2 } from "lucide-react";
import type { QueueItem } from "./page";

interface Props {
  initialItems: QueueItem[];
  tab: "pending" | "history";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ModerationQueueClient({ initialItems, tab }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [pending, startTransition] = useTransition();
  const [errorById, setErrorById] = useState<Record<string, string>>({});

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
      // Optimistically drop from visible list; server refresh to reconcile counts.
      setItems((prev) => prev.filter((r) => r.id !== item.id));
      startTransition(() => router.refresh());
    } catch (err) {
      setErrorById((m) => ({
        ...m,
        [item.id]: err instanceof Error ? err.message : "Unexpected error",
      }));
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-6 py-16 text-center text-sm text-slate-400">
        {tab === "pending" ? (
          <>
            <ShieldX className="mx-auto mb-3 h-6 w-6 text-emerald-400/80" />
            No messages awaiting review. The pipeline is keeping up.
          </>
        ) : (
          "No rejected messages on record yet."
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li
          key={`${it.kind}:${it.id}`}
          className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
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
            <span className="text-slate-200">{it.sender.display_name}</span>
            <span className="text-xs text-slate-500">{it.sender.email}</span>
            {it.channel ? (
              <span className="text-xs text-slate-500">
                in <span className="text-slate-300">#{it.channel.name ?? "channel"}</span>
              </span>
            ) : null}
            {it.recipient ? (
              <span className="text-xs text-slate-500">
                to <span className="text-slate-300">{it.recipient.display_name}</span>
              </span>
            ) : null}
            <span className="ml-auto text-xs text-slate-500">{fmtDate(it.created_at)}</span>
          </div>

          <div className="mb-3 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-200">
            {it.content || <span className="italic text-slate-500">(no text content)</span>}
            {it.media_urls.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {it.media_urls.map((u) => (
                  <a
                    key={u}
                    href={u}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-sky-300 underline-offset-2 hover:underline"
                  >
                    {u.split("/").pop() ?? "attachment"}
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            {it.keyword_flagged ? (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-300">Keyword</span>
            ) : null}
            {it.ai_flagged ? (
              <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-rose-300">
                AI {it.ai_flag_reason ? `· ${it.ai_flag_reason}` : ""}
              </span>
            ) : null}
            {tab === "history" && it.rejection_message ? (
              <span className="italic text-slate-500">&ldquo;{it.rejection_message}&rdquo;</span>
            ) : null}
          </div>

          {tab === "pending" ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => act(it, "approve")}
                disabled={pending}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" /> Approve & deliver
              </button>
              <button
                onClick={() => act(it, "reject")}
                disabled={pending}
                className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
              >
                <ShieldX className="h-3.5 w-3.5" /> Reject
              </button>
              {errorById[it.id] ? (
                <span className="text-xs text-rose-400">{errorById[it.id]}</span>
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
