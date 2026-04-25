"use client";

// ============================================================
// CohortChat — student cohort-channel chat experience.
//
// Loaded by /dashboard/student/chat page after the page
// resolves the student's active cohort_chat channel id and
// passes it in as a prop. Only rendered for self-bookable
// students who actually have a cohort (private/elite tutors
// can be added later if they're in cohorts too).
//
// Features:
//   · Paginated message list (30 per page, infinite-scroll up)
//   · Send text + optional image attachments
//   · Anonymous-toggle (Posting as ... preview)
//   · Live updates via Supabase Realtime on chat_messages
//   · Rejected messages render rejection_message in muted italic
//   · Pinned messages float to the top of the list
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Image as ImageIcon, Send, Pin, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface Props {
  /** chat_channels.id — UUID, NOT the Slack channel id. */
  channelId: string;
  /** Friendly name shown at the top of the panel. */
  channelDisplayName: string;
  /** Current user's first name + last initial preview, server-rendered. */
  postingAsPreview: string;
}

interface Message {
  id: string;
  channel_id: string;
  message_type: "cohort_message" | "qa_question" | "qa_answer";
  parent_message_id: string | null;
  display_name: string;
  real_name?: string;
  content: string | null;
  media_urls: string[];
  is_anonymous: boolean;
  is_pinned: boolean;
  is_highlighted: boolean;
  moderation_status: "pending" | "approved" | "flagged" | "rejected";
  rejection_message: string | null;
  created_at: string;
  ai_flagged: boolean;
}

const PAGE_SIZE = 30;

function formatTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d)
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
}

export function CohortChat({ channelId, channelDisplayName, postingAsPreview }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [oldestLoaded, setOldestLoaded] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [draft, setDraft] = useState("");
  const [pendingImages, setPendingImages] = useState<{ url: string; preview: string }[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Initial fetch ─────────────────────────────────────────
  const loadPage = useCallback(
    async (before?: string) => {
      const params = new URLSearchParams({ channelId, limit: String(PAGE_SIZE) });
      if (before) params.set("before", before);
      const res = await fetch(`/api/chat/messages?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Load failed (${res.status})`);
      }
      const json = (await res.json()) as { messages: Message[]; nextBefore: string | null };
      return json;
    },
    [channelId]
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingInitial(true);
    loadPage()
      .then((page) => {
        if (cancelled) return;
        // Server returns DESC; reverse to render oldest-first.
        const ordered = [...page.messages].reverse();
        setMessages(ordered);
        setOldestLoaded(page.nextBefore);
        setHasMore(page.nextBefore != null);
      })
      .catch((err) => console.error("[CohortChat] load failed:", err))
      .finally(() => {
        if (!cancelled) setLoadingInitial(false);
        // Scroll to bottom on first load
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
        });
      });
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  // ─── Load more on scroll up ─────────────────────────────────
  async function loadOlder() {
    if (!oldestLoaded || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await loadPage(oldestLoaded);
      const ordered = [...page.messages].reverse();
      setMessages((prev) => [...ordered, ...prev]);
      setOldestLoaded(page.nextBefore);
      setHasMore(page.nextBefore != null);
    } catch (err) {
      console.error("[CohortChat] load older failed:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  // ─── Realtime subscription ─────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`chat-messages-${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${channelId}` },
        async () => {
          // Refetch the most recent page on any insert. Cheap; chat
          // channels are low-throughput. Avoids race between the API
          // route and the realtime event delivering before the row commits.
          try {
            const page = await loadPage();
            const ordered = [...page.messages].reverse();
            setMessages(ordered);
            requestAnimationFrame(() => {
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
            });
          } catch (err) {
            console.error("[CohortChat] realtime refetch failed:", err);
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelId, loadPage]);

  // ─── Send ──────────────────────────────────────────────────
  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed && pendingImages.length === 0) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          content: trimmed,
          mediaUrls: pendingImages.map((p) => p.url),
          isAnonymous,
          messageType: "cohort_message",
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: Message;
        error?: string;
        rejected?: boolean;
      };
      if (!res.ok) {
        setSendError(body.error ?? `Send failed (${res.status})`);
        return;
      }
      setDraft("");
      setPendingImages([]);
      // Realtime subscription will refetch — but optimistically scroll.
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    } catch (err) {
      setSendError((err as Error).message ?? "Network error");
    } finally {
      setSending(false);
    }
  }

  // ─── Upload ────────────────────────────────────────────────
  async function handleFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImageError(null);
    const file = files[0];
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/chat/upload", { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setImageError(body.error ?? `Upload failed (${res.status})`);
        return;
      }
      setPendingImages((prev) => [...prev, { url: body.url!, preview: URL.createObjectURL(file) }]);
    } catch (err) {
      setImageError((err as Error).message ?? "Upload network error");
    }
  }

  function removePendingImage(idx: number) {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  }

  // ─── Render ─────────────────────────────────────────────────
  // Pinned messages first, then chronological.
  const orderedMessages = useMemo(() => {
    const pinned = messages.filter((m) => m.is_pinned);
    const rest = messages.filter((m) => !m.is_pinned);
    return [...pinned, ...rest];
  }, [messages]);

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-9rem)] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden">
      {/* Header */}
      <header className="px-5 py-3 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{channelDisplayName}</h3>
        <p className="text-[11px] text-slate-500">Cohort chat</p>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
        onScroll={(e) => {
          if ((e.currentTarget.scrollTop < 50) && hasMore && !loadingMore) {
            loadOlder();
          }
        }}
      >
        {loadingInitial ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : orderedMessages.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-8">
            No messages yet. Start the conversation.
          </p>
        ) : (
          <>
            {hasMore && !loadingMore && (
              <button
                onClick={loadOlder}
                className="block mx-auto text-xs text-blue-500 hover:text-blue-400 mb-2"
              >
                Load older
              </button>
            )}
            {loadingMore && (
              <div className="flex justify-center text-xs text-slate-500 py-2">
                <Loader2 className="w-3 h-3 animate-spin" />
              </div>
            )}
            {orderedMessages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 space-y-2">
        {pendingImages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pendingImages.map((img, idx) => (
              <div key={idx} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt="" className="w-16 h-16 object-cover rounded-md border border-slate-300 dark:border-slate-700" />
                <button
                  onClick={() => removePendingImage(idx)}
                  className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5"
                  aria-label="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {sendError && <p className="text-xs text-rose-500">{sendError}</p>}
        {imageError && <p className="text-xs text-rose-500">{imageError}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isAnonymous ? "Post anonymously…" : `Posting as ${postingAsPreview}…`}
            rows={1}
            disabled={sending}
            className="flex-1 resize-none bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 disabled:opacity-50"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif"
            className="hidden"
            onChange={(e) => handleFile(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            aria-label="Attach image"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <ImageIcon className="w-4.5 h-4.5" />
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || (!draft.trim() && pendingImages.length === 0)}
            className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="rounded border-slate-300"
          />
          Post anonymously {isAnonymous ? "(shown as Anonymous)" : `(shown as ${postingAsPreview})`}
        </label>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const rejected = message.moderation_status === "rejected";
  return (
    <div
      className={[
        "flex flex-col gap-1 rounded-xl px-3 py-2 border",
        rejected
          ? "border-amber-200 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/5"
          : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40",
        message.is_pinned ? "ring-1 ring-blue-300/30" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 text-[11px]">
        <span className="font-semibold text-slate-700 dark:text-slate-200">{message.display_name}</span>
        {message.real_name && message.real_name !== message.display_name && (
          <span className="text-slate-400">({message.real_name})</span>
        )}
        <span className="text-slate-400">{formatTime(message.created_at)}</span>
        {message.is_pinned && <Pin className="w-3 h-3 text-blue-400" aria-label="Pinned" />}
      </div>
      {rejected ? (
        <p className="text-xs italic text-amber-700 dark:text-amber-300">
          {message.rejection_message ?? "Message removed."}
        </p>
      ) : (
        <>
          {message.content && (
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
          {message.media_urls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {message.media_urls.map((url, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="max-w-xs max-h-64 rounded-md border border-slate-200 dark:border-slate-700"
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
