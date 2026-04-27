"use client";

// ============================================================
// ChatShell — orchestrates the student chat surface.
//
// Layout:
//   ┌───────────────────────────────────────────────────────┐
//   │ [Chat] [Q&A]                       [+ New DM ▾]       │
//   ├──────────────┬────────────────────────────────────────┤
//   │ Cohort       │                                        │
//   │ DMs          │  Active conversation                   │
//   │ ◉ Fatima V.  │  · cohort chat                         │
//   │   ●3         │  · Q&A board                           │
//   │ ◉ Maya S.    │  · DM thread                           │
//   │              │                                        │
//   └──────────────┴────────────────────────────────────────┘
//
// State machine — `mode`:
//   { kind: "cohort" }                       — main pane = CohortChat (cohort_chat channel)
//   { kind: "qa" }                           — main pane = CohortChat (qa channel, message_type=qa_question)
//   { kind: "dm", clerkId, displayName, ... } — main pane = DirectMessage
//
// Sidebar:
//   - "Cohort chat" entry at top (always shown if cohort exists)
//   - "Q&A" entry (always shown if qa channel exists)
//   - DM threads sorted by lastMessageAt DESC; entries with
//     unread > 0 show a blue badge with the count
//
// Realtime:
//   - Subscribes to direct_messages INSERT events involving self.
//     On any new row, refetch threads (which re-orders + updates
//     unread counts, pulling the affected thread to the top).
//
// "+ New DM" dropdown:
//   - Shows the cohort roster (excluding self).
//   - Picking a peer creates a virtual DM thread (no DB row yet —
//     the thread is materialized when the first message is sent
//     because the DM API inserts directly).
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MessageSquare, HelpCircle, Hash, UserPlus, Check } from "lucide-react";
import { CohortChat } from "@/components/chat/CohortChat";
import { DirectMessage } from "@/components/chat/DirectMessage";
import { supabase } from "@/lib/supabase/client";

interface CohortChannel {
  id: string;
  display_name: string;
}

interface Peer {
  clerkId: string;
  displayName: string;
  realName: string;
}

interface Thread {
  otherClerkId: string;
  displayName: string;
  realName: string;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  unreadCount: number;
}

type Mode =
  | { kind: "cohort" }
  | { kind: "qa" }
  | { kind: "dm"; clerkId: string; displayName: string; realName: string };

interface Props {
  cohortChannel: CohortChannel | null;
  qaChannel: CohortChannel | null;
  postingAsPreview: string;
  /** Caller's UUID — needed by DirectMessage to compute self/other. */
  selfUuid: string;
}

function relativeTimeShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

export function ChatShell({ cohortChannel, qaChannel, postingAsPreview, selfUuid }: Props) {
  const initialMode: Mode = cohortChannel
    ? { kind: "cohort" }
    : qaChannel
      ? { kind: "qa" }
      : { kind: "cohort" };
  const [mode, setMode] = useState<Mode>(initialMode);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [refetchTick, setRefetchTick] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  // ─── Load + refresh DM threads ─────────────────────────────
  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/dm/threads");
      if (!res.ok) return;
      const json = (await res.json()) as { threads: Thread[] };
      setThreads(json.threads);
    } catch (err) {
      console.error("[ChatShell] thread load failed:", err);
    }
  }, []);

  const loadPeers = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/cohort-members");
      if (!res.ok) return;
      const json = (await res.json()) as { peers: Peer[] };
      setPeers(json.peers);
    } catch (err) {
      console.error("[ChatShell] peers load failed:", err);
    }
  }, []);

  useEffect(() => {
    loadThreads();
    loadPeers();
  }, [loadThreads, loadPeers]);

  // ─── Realtime: any DM involving us → refresh threads ──────
  useEffect(() => {
    const channel = supabase
      .channel(`chat-shell-dm-${selfUuid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const r = payload.new as { sender_id: string; recipient_id: string };
          if (r.sender_id !== selfUuid && r.recipient_id !== selfUuid) return;
          loadThreads();
          setRefetchTick((t) => t + 1);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "direct_messages" },
        (payload) => {
          const r = payload.new as { sender_id: string; recipient_id: string };
          if (r.sender_id !== selfUuid && r.recipient_id !== selfUuid) return;
          loadThreads();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selfUuid, loadThreads]);

  // ─── Click-outside to close DM picker ──────────────────────
  useEffect(() => {
    if (!pickerOpen) return;
    function onDocClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [pickerOpen]);

  // ─── Total unread across all DMs (for the Chat tab badge) ─
  const totalUnread = useMemo(
    () => threads.reduce((sum, t) => sum + t.unreadCount, 0),
    [threads]
  );

  // ─── Select a peer to DM (from picker or sidebar) ─────────
  function openDm(peer: { clerkId: string; displayName: string; realName: string }) {
    // If this peer already has a thread row, reuse those names.
    const existing = threads.find((t) => t.otherClerkId === peer.clerkId);
    setMode({
      kind: "dm",
      clerkId: peer.clerkId,
      displayName: existing?.displayName ?? peer.displayName,
      realName: existing?.realName ?? peer.realName,
    });
    setPickerOpen(false);
  }

  // Peers not yet in any thread — surface them at the top of the
  // picker so it feels like "start a new conversation."
  const peersWithThread = useMemo(() => new Set(threads.map((t) => t.otherClerkId)), [threads]);
  const newPeers = peers.filter((p) => !peersWithThread.has(p.clerkId));
  const existingPeers = peers.filter((p) => peersWithThread.has(p.clerkId));

  return (
    <div className="flex flex-col h-full gap-3">
      {/* ─── Top bar: tabs + DM picker ─────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10">
          <TabButton
            active={mode.kind === "cohort"}
            onClick={() => setMode({ kind: "cohort" })}
            disabled={!cohortChannel}
            icon={<MessageSquare className="w-3.5 h-3.5" />}
            label="Chat"
            badge={totalUnread > 0 && mode.kind !== "dm" ? totalUnread : undefined}
          />
          <TabButton
            active={mode.kind === "qa"}
            onClick={() => setMode({ kind: "qa" })}
            disabled={!qaChannel}
            icon={<HelpCircle className="w-3.5 h-3.5" />}
            label="Q&A"
          />
        </div>

        {/* DM picker */}
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-[0_4px_14px_rgba(59,130,246,0.35)]"
          >
            <UserPlus className="w-4 h-4" />
            New DM
            <ChevronDown className={["w-3.5 h-3.5 transition-transform", pickerOpen ? "rotate-180" : ""].join(" ")} />
          </button>

          {pickerOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 max-h-96 overflow-y-auto rounded-2xl border border-white/10 bg-[#0B1026]/95 backdrop-blur-xl shadow-2xl z-30">
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400">Cohort-mates</p>
                <p className="text-[11px] text-slate-500 mt-0.5">DMs are limited to your cohort.</p>
              </div>

              {peers.length === 0 ? (
                <p className="px-4 py-6 text-xs text-slate-400 text-center">
                  No cohort-mates available to DM yet.
                </p>
              ) : (
                <div className="py-1">
                  {newPeers.length > 0 && (
                    <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Start new
                    </div>
                  )}
                  {newPeers.map((p) => (
                    <PeerRow key={p.clerkId} peer={p} onPick={openDm} />
                  ))}
                  {existingPeers.length > 0 && (
                    <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Already chatting
                    </div>
                  )}
                  {existingPeers.map((p) => (
                    <PeerRow key={p.clerkId} peer={p} onPick={openDm} hasThread />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Body: sidebar + main pane ─────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-3">
        <aside className="w-64 shrink-0 hidden md:flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md overflow-hidden">
          <div className="px-3 py-3 border-b border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Channels</p>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {cohortChannel && (
              <SidebarItem
                active={mode.kind === "cohort"}
                onClick={() => setMode({ kind: "cohort" })}
                icon={<Hash className="w-3.5 h-3.5" />}
                label={cohortChannel.display_name}
                hint="Cohort chat"
              />
            )}
            {qaChannel && (
              <SidebarItem
                active={mode.kind === "qa"}
                onClick={() => setMode({ kind: "qa" })}
                icon={<HelpCircle className="w-3.5 h-3.5" />}
                label="Q&A"
                hint={qaChannel.display_name}
              />
            )}

            <div className="pt-3 pb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-blue-400">
              Direct messages
            </div>

            {threads.length === 0 ? (
              <p className="px-3 py-4 text-[11px] text-slate-500">
                No DMs yet. Start one with the “New DM” button.
              </p>
            ) : (
              threads.map((t) => (
                <SidebarThread
                  key={t.otherClerkId}
                  thread={t}
                  active={mode.kind === "dm" && mode.clerkId === t.otherClerkId}
                  onClick={() =>
                    setMode({ kind: "dm", clerkId: t.otherClerkId, displayName: t.displayName, realName: t.realName })
                  }
                />
              ))
            )}
          </div>
        </aside>

        {/* Main pane */}
        <div className="flex-1 min-w-0">
          {mode.kind === "cohort" && cohortChannel && (
            <CohortChat
              channelId={cohortChannel.id}
              channelDisplayName={cohortChannel.display_name}
              postingAsPreview={postingAsPreview}
            />
          )}
          {mode.kind === "qa" && qaChannel && (
            <CohortChat
              channelId={qaChannel.id}
              channelDisplayName={qaChannel.display_name}
              postingAsPreview={postingAsPreview}
              messageType="qa_question"
              subtitle="Q&A board"
              inputPlaceholder="Ask a question…"
            />
          )}
          {mode.kind === "dm" && (
            <DirectMessage
              withClerkId={mode.clerkId}
              withDisplayName={mode.displayName}
              withRealName={mode.realName}
              selfUuid={selfUuid}
              externalRefetchKey={refetchTick}
              onMessagesChanged={loadThreads}
            />
          )}
          {mode.kind === "cohort" && !cohortChannel && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
              <p className="text-sm text-amber-200">
                Your cohort chat hasn't been provisioned yet.
              </p>
            </div>
          )}
          {mode.kind === "qa" && !qaChannel && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
              <p className="text-sm text-amber-200">
                Q&A hasn't been provisioned for this cohort yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  disabled,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
        active
          ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_3px_10px_rgba(59,130,246,0.3)]"
          : "text-slate-300 hover:text-white hover:bg-white/[0.06]",
        disabled ? "opacity-40 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-blue-400 text-[10px] font-bold text-[#0B1026]">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

function SidebarItem({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors",
        active ? "bg-blue-500/15 text-white" : "text-slate-300 hover:bg-white/[0.05] hover:text-white",
      ].join(" ")}
    >
      <span className={active ? "text-blue-300" : "text-slate-500"}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-semibold truncate">{label}</span>
        {hint && <span className="block text-[10px] text-slate-500 truncate">{hint}</span>}
      </span>
    </button>
  );
}

function SidebarThread({
  thread,
  active,
  onClick,
}: {
  thread: Thread;
  active: boolean;
  onClick: () => void;
}) {
  const hasUnread = thread.unreadCount > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left px-3 py-2 rounded-lg flex items-start gap-2 transition-colors",
        active
          ? "bg-blue-500/15 text-white"
          : hasUnread
            ? "bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
            : "text-slate-300 hover:bg-white/[0.05] hover:text-white",
      ].join(" ")}
    >
      {/* Avatar circle with first initial */}
      <div
        className={[
          "shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border",
          active
            ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-400/40"
            : "bg-white/[0.06] text-slate-300 border-white/10",
        ].join(" ")}
      >
        {(thread.displayName[0] ?? "?").toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={["text-xs truncate", hasUnread ? "font-bold" : "font-semibold"].join(" ")}>
            {thread.displayName}
          </span>
          <span className="shrink-0 text-[10px] text-slate-500">{relativeTimeShort(thread.lastMessageAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className={["text-[11px] truncate", hasUnread ? "text-slate-200" : "text-slate-500"].join(" ")}>
            {thread.lastMessagePreview ?? "—"}
          </span>
          {hasUnread && (
            <span className="shrink-0 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-blue-400 text-[10px] font-bold text-[#0B1026]">
              {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function PeerRow({ peer, onPick, hasThread }: { peer: Peer; onPick: (p: Peer) => void; hasThread?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onPick(peer)}
      className="w-full text-left px-3 py-2 hover:bg-white/[0.05] flex items-center gap-2.5 group"
    >
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold bg-white/[0.06] text-slate-300 border border-white/10 group-hover:border-blue-400/40 group-hover:text-white">
        {(peer.displayName[0] ?? "?").toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-100 truncate">{peer.displayName}</p>
        <p className="text-[10px] text-slate-500 truncate">{peer.realName}</p>
      </div>
      {hasThread && <Check className="shrink-0 w-3.5 h-3.5 text-emerald-400/70" aria-label="Already chatting" />}
    </button>
  );
}
