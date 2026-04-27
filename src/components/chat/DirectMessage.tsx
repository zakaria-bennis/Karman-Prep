"use client";

// ============================================================
// DirectMessage — 1-on-1 chat between two cohort-mates.
//
// Mirrors CohortChat's layout (cloud bubbles, glass surface,
// realtime refetch on send) but talks to /api/chat/dm/* instead.
// On mount, calls /api/chat/dm/read so the sidebar's unread
// badge clears immediately for the open thread.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Image as ImageIcon, Send, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface Props {
  /** Other party's Clerk id — passed to /api/chat/dm send + read. */
  withClerkId: string;
  /** Other party's display name (first + last initial). */
  withDisplayName: string;
  /** Other party's real name (first + last). */
  withRealName: string;
  /** The current user's UUID (so the bubble component can decide
   *  self vs other; the DM API doesn't compute is_self for us). */
  selfUuid: string;
  /** Bumped by the parent any time the sidebar threads list refetches —
   *  if a brand-new DM came in for this thread, we re-pull messages. */
  externalRefetchKey?: number;
  /** Called whenever messages change so the parent can refresh
   *  the sidebar (unread counts, ordering). */
  onMessagesChanged?: () => void;
}

interface DmMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  media_urls: string[];
  moderation_status: "pending" | "approved" | "flagged" | "rejected";
  rejection_message: string | null;
  created_at: string;
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

export function DirectMessage({
  withClerkId,
  withDisplayName,
  withRealName,
  selfUuid,
  externalRefetchKey,
  onMessagesChanged,
}: Props) {
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [draft, setDraft] = useState("");
  const [pendingImages, setPendingImages] = useState<{ url: string; preview: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(async (): Promise<DmMessage[]> => {
    const params = new URLSearchParams({ withUserId: withClerkId, limit: String(PAGE_SIZE) });
    const res = await fetch(`/api/chat/dm?${params.toString()}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? `Load failed (${res.status})`);
    }
    const json = (await res.json()) as { messages: DmMessage[] };
    return [...json.messages].reverse();
  }, [withClerkId]);

  // Mark thread read whenever it's opened (or the active partner changes).
  const markRead = useCallback(async () => {
    try {
      await fetch("/api/chat/dm/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withClerkId }),
      });
      onMessagesChanged?.();
    } catch (err) {
      console.error("[DirectMessage] mark-read failed:", err);
    }
  }, [withClerkId, onMessagesChanged]);

  useEffect(() => {
    let cancelled = false;
    setLoadingInitial(true);
    loadMessages()
      .then((rows) => {
        if (cancelled) return;
        setMessages(rows);
        markRead();
      })
      .catch((err) => console.error("[DirectMessage] initial load failed:", err))
      .finally(() => {
        if (!cancelled) setLoadingInitial(false);
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
        });
      });
    return () => {
      cancelled = true;
    };
  }, [loadMessages, markRead]);

  // Realtime: any new direct_messages row involving this pair → refetch.
  useEffect(() => {
    const channel = supabase
      .channel(`dm-${selfUuid}-${withClerkId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        async (payload) => {
          const r = payload.new as DmMessage;
          const involvesPair =
            (r.sender_id === selfUuid) || (r.recipient_id === selfUuid);
          if (!involvesPair) return;
          try {
            const rows = await loadMessages();
            setMessages(rows);
            markRead();
            requestAnimationFrame(() => {
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
            });
          } catch (err) {
            console.error("[DirectMessage] realtime refetch failed:", err);
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selfUuid, withClerkId, loadMessages, markRead]);

  // External nudge from the sidebar — refetch when threads list updates.
  useEffect(() => {
    if (externalRefetchKey === undefined) return;
    loadMessages()
      .then((rows) => setMessages(rows))
      .catch(() => {});
  }, [externalRefetchKey, loadMessages]);

  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed && pendingImages.length === 0) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/chat/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: withClerkId,
          content: trimmed,
          mediaUrls: pendingImages.map((p) => p.url),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: DmMessage | string;
        error?: string;
        rejected?: boolean;
      };
      if (!res.ok) {
        const rejectionCopy =
          body.rejected && typeof body.message === "string" ? body.message : null;
        setSendError(
          rejectionCopy ??
            body.error ??
            "This message breaches Karman Prep's terms of use and was not sent."
        );
        return;
      }
      setDraft("");
      setPendingImages([]);
      try {
        const rows = await loadMessages();
        setMessages(rows);
        onMessagesChanged?.();
      } catch (err) {
        console.error("[DirectMessage] post-send refetch failed:", err);
      }
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    } catch (err) {
      setSendError((err as Error).message ?? "Network error");
    } finally {
      setSending(false);
    }
  }

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

  return (
    <div className="relative flex flex-col h-full max-h-[calc(100vh-9rem)] rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 30%, rgba(59,130,246,0.10) 0%, rgba(99,102,241,0.05) 35%, transparent 70%)",
        }}
      />

      <header className="relative px-5 py-3 border-b border-white/10">
        <h3 className="text-sm font-bold text-white">{withDisplayName}</h3>
        <p className="text-[11px] text-slate-400">Direct message · {withRealName}</p>
      </header>

      <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {loadingInitial ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">
            No messages yet. Say hi to {withDisplayName}.
          </p>
        ) : (
          messages.map((m) => (
            <DmBubble key={m.id} message={m} self={m.sender_id === selfUuid} />
          ))
        )}
      </div>

      <div className="relative border-t border-white/10 px-4 py-3 space-y-2 bg-white/[0.02]">
        {pendingImages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pendingImages.map((img, idx) => (
              <div key={idx} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt="" className="w-16 h-16 object-cover rounded-md border border-white/15" />
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
        {sendError && <p className="text-xs text-rose-300">{sendError}</p>}
        {imageError && <p className="text-xs text-rose-300">{imageError}</p>}
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
            placeholder={`Message ${withDisplayName}…`}
            rows={1}
            disabled={sending}
            className="flex-1 resize-none bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400/60 focus:bg-white/[0.08] disabled:opacity-50"
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
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] disabled:opacity-50"
          >
            <ImageIcon className="w-4.5 h-4.5" />
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || (!draft.trim() && pendingImages.length === 0)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-[0_4px_14px_rgba(59,130,246,0.35)] disabled:opacity-50 disabled:shadow-none"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function DmBubble({ message, self }: { message: DmMessage; self: boolean }) {
  const rejected = message.moderation_status === "rejected";

  const bubbleColor = rejected
    ? "bg-amber-400/15 text-amber-100 border border-amber-400/30"
    : self
      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
      : "bg-white/[0.06] text-slate-100 border border-white/10 backdrop-blur-sm";

  const bubbleShape = self ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md";
  const bubbleShadow = !rejected && self
    ? "shadow-[0_6px_20px_-6px_rgba(59,130,246,0.45)]"
    : "shadow-sm";

  return (
    <div className={["flex w-full", self ? "justify-end" : "justify-start"].join(" ")}>
      <div className={["flex flex-col max-w-[78%]", self ? "items-end" : "items-start"].join(" ")}>
        <div
          className={["relative px-3.5 py-2", bubbleColor, bubbleShape, bubbleShadow].join(" ")}
        >
          {!rejected && self && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl rounded-br-md opacity-40"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 35%)",
              }}
            />
          )}
          {rejected ? (
            <p className="relative text-xs italic">
              {message.rejection_message ?? "Message removed."}
            </p>
          ) : (
            <div className="relative">
              {message.content && (
                <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              )}
              {message.media_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {message.media_urls.map((url, i) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img key={i} src={url} alt="" className="max-w-xs max-h-64 rounded-lg" />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className={["flex items-center gap-1 mt-0.5 px-2 text-[10px] text-slate-500", self ? "flex-row-reverse" : ""].join(" ")}>
          <span>{formatTime(message.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
