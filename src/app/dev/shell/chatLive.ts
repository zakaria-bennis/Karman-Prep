// Chat with real messages (founder, 2026-11-16: "connect the new chat page to the live chat").
// When a student is signed in and their class has a chat, the page's store is filled from the live
// chat's own routes, and what is sent goes through them, so the real checks run on every message
// and picture. Signed out, or with no class chat, the page keeps its stand-ins.
//   What is live: the class chat, private chats with classmates, photos, unread counts, Delivered
//   and Read, and the check's own words when a message is stopped (with the warning and the pause).
//   What the live chat cannot keep yet, and so is not offered here: reactions, replies, the
//   Announcements chat, attached questions, typing dots, and the after-hours assistant.
// New messages are fetched every few seconds while the page is open.
import { preparePhoto } from "@/lib/chat/photo";
import { meet, newId, store, type Msg, type Remote, type Thread } from "./chatStore";

type ClassMessage = {
  id: string;
  display_name: string;
  content: string | null;
  media_urls: string[];
  is_self: boolean;
  moderation_status: "pending" | "approved" | "flagged" | "rejected";
  rejection_message: string | null;
  created_at: string;
};
type DirectMessage = {
  id: string;
  sender_id: string;
  content: string | null;
  media_urls: string[];
  moderation_status: "pending" | "approved" | "flagged" | "rejected";
  rejection_message: string | null;
  created_at: string;
  read_at?: string | null;
};
type ThreadEntry = {
  otherClerkId: string;
  displayName: string;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  unreadCount: number;
};
type Peer = { clerkId: string; displayName: string };
type SendAnswer = {
  rejected?: boolean;
  message?: unknown;
  warning?: string;
  paused?: boolean;
  error?: string;
};

const POLL_MS = 5000;
const json = async <T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; body: T }> => {
  const res = await fetch(url, init);
  return { ok: res.ok, status: res.status, body: (await res.json().catch(() => ({}))) as T };
};
/** What was typed here and the server does not hold (still going, or stopped) stays on the page. */
const withLocal = (fresh: Msg[], old: Msg[] | undefined): Msg[] => [
  ...fresh,
  ...(old ?? []).filter(
    (m) => (m.state === "sending" || m.state === "blocked") && !fresh.some((x) => x.id === m.id)
  ),
];
const oldestFirst = <T extends { created_at: string }>(rows: T[]) =>
  [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));

/** A message from the live chat, as the page shows one. */
const shown = (
  m: {
    id: string;
    content: string | null;
    media_urls: string[];
    created_at: string;
    moderation_status: string;
    rejection_message: string | null;
  },
  from: string,
  read = false
): Msg => ({
  id: m.id,
  from,
  at: new Date(m.created_at).getTime(),
  // held for review: the others see a placeholder until a person has looked
  text: m.content ?? (m.moderation_status === "flagged" ? "Waiting for review" : ""),
  photo: m.media_urls[0],
  reactions: {},
  ...(from === "me"
    ? m.moderation_status === "rejected"
      ? { state: "blocked" as const, note: m.rejection_message ?? undefined }
      : { state: read ? ("read" as const) : ("sent" as const) }
    : {}),
});

/** Classmates by the name the class chat shows, so a person is the same face in every chat. */
const byName = new Map<string, string>();

async function classMessages(channelId: string): Promise<Msg[]> {
  const { ok, body } = await json<{ messages?: ClassMessage[] }>(
    `/api/chat/messages?channelId=${encodeURIComponent(channelId)}&limit=40`
  );
  if (!ok) return [];
  return (
    oldestFirst(body.messages ?? [])
      // someone else's stopped message is not shown at all
      .filter((m) => m.is_self || m.moderation_status !== "rejected")
      .map((m) => {
        const from = m.is_self ? "me" : (byName.get(m.display_name) ?? `name:${m.display_name}`);
        if (!m.is_self) meet(from, m.display_name);
        return shown(m, from);
      })
  );
}

async function directMessages(peerId: string, selfUuid: string): Promise<Msg[]> {
  const { ok, body } = await json<{ messages?: DirectMessage[] }>(
    `/api/chat/dm?withUserId=${encodeURIComponent(peerId)}&limit=40`
  );
  if (!ok) return [];
  return oldestFirst(body.messages ?? [])
    .filter((m) => m.sender_id === selfUuid || m.moderation_status !== "rejected")
    .map((m) => shown(m, m.sender_id === selfUuid ? "me" : peerId, !!m.read_at));
}

/** Fills the store from the live chat and keeps it fresh. Returns how to stop, or null when there is
 *  no live chat to show (signed out, or no class chat), in which case nothing is touched. */
export async function connectLive(): Promise<(() => void) | null> {
  const me = await json<{
    selfUuid?: string;
    classChannel?: { id: string; name: string } | null;
    paused?: boolean;
  }>("/api/chat/me").catch(() => null);
  if (!me?.ok || !me.body.selfUuid || !me.body.classChannel) return null;
  const selfUuid = me.body.selfUuid;
  const channel = me.body.classChannel;

  const load = async () => {
    const peers = await json<{ peers?: Peer[] }>("/api/chat/cohort-members");
    for (const p of peers.body.peers ?? []) {
      meet(p.clerkId, p.displayName);
      byName.set(p.displayName, p.clerkId);
    }
    const [classMsgs, threads] = await Promise.all([
      classMessages(channel.id),
      json<{ threads?: ThreadEntry[] }>("/api/chat/dm/threads"),
    ]);
    const before = store.get().threads;
    const kept = (id: string) => before.find((t) => t.id === id);
    const classThread: Thread = {
      id: "class",
      kind: "class",
      name: channel.name || "Class chat",
      channelId: channel.id,
      loaded: true,
      msgs: withLocal(classMsgs, kept("class")?.msgs),
      // the live chat keeps no unread count for the class chat: what arrived since the last look
      unread: Math.max(
        0,
        (kept("class")?.unread ?? 0) +
          (kept("class")?.loaded
            ? classMsgs.filter(
                (m) => m.from !== "me" && !kept("class")?.msgs.some((x) => x.id === m.id)
              ).length
            : 0)
      ),
    };
    const direct: Thread[] = (threads.body.threads ?? []).map((t) => {
      meet(t.otherClerkId, t.displayName);
      const id = `dm-${t.otherClerkId}`;
      const old = kept(id);
      return {
        id,
        kind: "dm" as const,
        name: t.displayName,
        with: t.otherClerkId,
        peerId: t.otherClerkId,
        loaded: old?.loaded ?? false,
        unread: t.unreadCount,
        // until it is opened, its last message stands for it in the list
        msgs: old?.loaded
          ? old.msgs
          : t.lastMessagePreview
            ? [
                {
                  id: `last-${id}`,
                  from: t.otherClerkId,
                  at: new Date(t.lastMessageAt).getTime(),
                  text: t.lastMessagePreview,
                  reactions: {},
                },
              ]
            : [],
      };
    });
    // a chat begun here and not yet written in is kept
    const fresh = before.filter(
      (t) =>
        t.kind === "dm" && !direct.some((d) => d.id === t.id) && t.msgs.length === 0 && t.peerId
    );
    store.set({
      live: true,
      threads: [classThread, ...direct, ...fresh],
      peers: (peers.body.peers ?? []).map((p) => p.clerkId),
    });
    // chats already open are brought up to date too
    await Promise.all(
      store
        .get()
        .threads.filter((t) => t.kind === "dm" && t.loaded && t.peerId && t.msgs.length > 0)
        .map(async (t) => {
          const msgs = await directMessages(t.peerId!, selfUuid);
          store.change(t.id, (x) => ({ ...x, msgs: withLocal(msgs, x.msgs) }));
        })
    );
  };

  const remote: Remote = {
    open: (thread) => {
      if (thread.kind !== "dm" || thread.loaded || !thread.peerId) return;
      void directMessages(thread.peerId, selfUuid).then((msgs) =>
        store.change(thread.id, (t) => ({ ...t, msgs, loaded: true }))
      );
    },
    read: (thread) => {
      if (thread.kind === "dm" && thread.peerId && thread.unread > 0)
        void fetch("/api/chat/dm/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ withClerkId: thread.peerId }),
        });
    },
    send: (thread, body) => {
      const id = newId();
      const mine: Msg = {
        id,
        from: "me",
        at: Date.now(),
        text: body.text ?? "",
        photo: body.photo ? URL.createObjectURL(body.photo) : undefined,
        reactions: {},
        state: "sending",
      };
      store.change(thread.id, (t) => ({ ...t, msgs: [...t.msgs, mine] }));
      const mark = (patch: Partial<Msg>) =>
        store.change(thread.id, (t) => ({
          ...t,
          msgs: t.msgs.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }));
      void (async () => {
        try {
          let mediaUrls: string[] = [];
          if (body.photo) {
            const form = new FormData();
            form.append("file", await preparePhoto(body.photo));
            const up = await json<{ url?: string; error?: string }>("/api/chat/upload", {
              method: "POST",
              body: form,
            });
            if (!up.ok || !up.body.url)
              return mark({
                state: "blocked",
                note: up.body.error ?? "The photo could not be uploaded.",
              });
            mediaUrls = [up.body.url];
          }
          const sent = await json<SendAnswer>(
            thread.kind === "class" ? "/api/chat/send" : "/api/chat/dm",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                thread.kind === "class"
                  ? {
                      channelId: thread.channelId,
                      content: body.text ?? "",
                      mediaUrls,
                      messageType: "cohort_message",
                    }
                  : { recipientId: thread.peerId, content: body.text ?? "", mediaUrls }
              ),
            }
          );
          if (sent.ok && !sent.body.rejected) {
            mark({ state: "sent" });
            return void load();
          }
          const said =
            typeof sent.body.message === "string"
              ? sent.body.message
              : (sent.body.error ?? "Not sent.");
          mark({ state: "blocked", note: said });
          if (sent.body.warning || sent.body.paused)
            store.set({
              warning: !!sent.body.warning,
              paused: !!sent.body.paused || store.get().paused,
            });
        } catch (error) {
          mark({ state: "blocked", note: error instanceof Error ? error.message : "Not sent." });
        }
      })();
    },
  };

  store.set({ paused: !!me.body.paused });
  store.remote(remote);
  await load();
  const timer = window.setInterval(() => {
    if (!document.hidden) void load();
  }, POLL_MS);
  return () => {
    window.clearInterval(timer);
    store.release(remote);
  };
}
