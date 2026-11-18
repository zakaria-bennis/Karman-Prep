// Chat with real messages (founder, 2026-11-16: "connect the new chat page to the live chat").
// When a student is signed in and has a class chat or a tutor, the page's store is filled from the
// live chat's own routes, and what is sent goes through them, so the real checks run on every
// message, picture and question. Signed out, the page keeps its stand-ins.
//   Live: Announcements, the class chat, the chat with the tutor (answered by the assistant after
//   hours), private chats with classmates, photos, questions, reactions, replies, typing dots,
//   unread marks, Delivered and Read, and the check's own words when a message is stopped (with the
//   warning and the pause).
// The page asks for news every few seconds while it is open and in view.
import { preparePhoto } from "@/lib/chat/photo";
import type { SharedQuestion } from "@/lib/chat/shared";
import { meet, newId, store, type Msg, type Reaction, type Remote, type Thread } from "./chatStore";

type Reactions = { mine: string | null; counts: Record<string, number> };
type Status = "pending" | "approved" | "flagged" | "rejected";
type Common = {
  id: string;
  content: string | null;
  media_urls: string[];
  moderation_status: Status;
  rejection_message: string | null;
  created_at: string;
  parent_message_id: string | null;
  reactions?: Reactions;
  question?: SharedQuestion | null;
};
type ClassMessage = Common & { display_name: string; is_self: boolean; message_type: string };
type DirectMessage = Common & {
  sender_id: string;
  read_at?: string | null;
  from_assistant?: boolean;
};
type ThreadEntry = {
  otherClerkId: string;
  displayName: string;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  unreadCount: number;
};
type Peer = { clerkId: string; displayName: string };
type Me = {
  selfUuid?: string;
  classes?: { id: string; name: string }[];
  staff?: boolean;
  tutor?: { clerkId: string; name: string; here: boolean } | null;
  unread?: { chat: number; announcements: number };
  afterHours?: boolean;
  paused?: boolean;
};
type SendAnswer = {
  rejected?: boolean;
  message?: unknown;
  warning?: string;
  paused?: boolean;
  error?: string;
};

const POLL_MS = 5000;
const PRESENCE_MS = 3000;
const ME_MS = 60_000;
const PEERS_MS = 300_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = async <T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; body: T }> => {
  const res = await fetch(url, init);
  return { ok: res.ok, status: res.status, body: (await res.json().catch(() => ({}))) as T };
};
const post = <T>(url: string, body: unknown) =>
  json<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const oldestFirst = <T extends { created_at: string }>(rows: T[]) =>
  [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));

/** What was typed here and the server does not hold (still going, or stopped) stays on the page. */
const withLocal = (fresh: Msg[], old: Msg[] | undefined): Msg[] => [
  ...fresh,
  ...(old ?? []).filter(
    (m) => (m.state === "sending" || m.state === "blocked") && !fresh.some((x) => x.id === m.id)
  ),
];

/** Reactions as the page keeps them: the student's own under "me", one entry for each other. */
const reacted = (r?: Reactions): Record<string, Reaction> => {
  const out: Record<string, Reaction> = {};
  if (!r) return out;
  if (r.mine) out.me = r.mine as Reaction;
  let n = 0;
  for (const [how, count] of Object.entries(r.counts))
    for (let i = 0; i < count; i++) out[`other${n++}`] = how as Reaction;
  return out;
};

/** A message from the live chat, as the page shows one. */
const shown = (m: Common, from: string, read = false): Msg => ({
  id: m.id,
  from,
  at: new Date(m.created_at).getTime(),
  // held for review: the others see a placeholder until a person has looked
  text: m.content ?? (m.moderation_status === "flagged" ? "Waiting for review" : ""),
  photo: m.media_urls[0],
  question: m.question ?? undefined,
  replyTo: m.parent_message_id ?? undefined,
  reactions: reacted(m.reactions),
  ...(from === "me"
    ? m.moderation_status === "rejected"
      ? { state: "blocked" as const, note: m.rejection_message ?? undefined }
      : { state: read ? ("read" as const) : ("sent" as const) }
    : {}),
});

/** Fills the store from the live chat and keeps it fresh. Returns how to stop, or null when there is
 *  no live chat to show (signed out, or neither a class chat nor a tutor), in which case nothing is
 *  touched. */
export async function connectLive(): Promise<(() => void) | null> {
  const first = await json<Me>("/api/chat/me").catch(() => null);
  if (!first?.ok || !first.body.selfUuid) return null;
  let me = first.body;
  if (!me.classes?.length && !me.tutor) return null;
  const selfUuid = first.body.selfUuid;
  const classes = me.classes ?? [];
  const staff = !!me.staff;
  /** One class (a student) keeps the plain names; a tutor's several classes are told apart. */
  const idOf = (kind: "news" | "class", channelId: string) =>
    classes.length > 1 ? `${kind}-${channelId}` : kind;

  /** Classmates by the name the class chat shows, so a person is the same face in every chat. */
  const byName = new Map<string, string>();
  let peers: Peer[] = [];
  let peersAt = 0;
  let meAt = Date.now();
  let begun = false;
  let openId: string | null = null;
  let typedAt = 0;
  /** When the student last wrote to the tutor after hours: the assistant is writing back. */
  let assistantSince = 0;
  /** The newest message of each private chat when it was last fetched. */
  const stamps = new Map<string, string>();
  /** Class messages already counted, so a new one from someone else adds to the unread mark. */
  const seen = new Set<string>();
  const unread: Record<string, number> = {};
  if (classes[0]) {
    unread[idOf("class", classes[0].id)] = me.unread?.chat ?? 0;
    unread[idOf("news", classes[0].id)] = me.unread?.announcements ?? 0;
  }

  const tutorId = () => me.tutor?.clerkId ?? null;
  const presence = () => (me.afterHours ? "after" : me.tutor?.here ? "online" : "offline");

  const directMessages = async (peerId: string): Promise<Msg[] | null> => {
    const { ok, body } = await json<{ messages?: DirectMessage[] }>(
      `/api/chat/dm?withUserId=${encodeURIComponent(peerId)}&limit=60`
    );
    if (!ok) return null;
    return oldestFirst(body.messages ?? [])
      .filter((m) => m.sender_id === selfUuid || m.moderation_status !== "rejected")
      .map((m) =>
        shown(
          m,
          m.from_assistant ? "assistant" : m.sender_id === selfUuid ? "me" : peerId,
          !!m.read_at
        )
      );
  };

  const refresh = async (thread: Thread) => {
    if (!thread.peerId) return;
    const msgs = await directMessages(thread.peerId);
    if (!msgs) return;
    if (msgs.some((m) => m.from === "assistant" && m.at >= assistantSince)) assistantSince = 0;
    store.change(thread.id, (t) => ({ ...t, msgs: withLocal(msgs, t.msgs), loaded: true }));
  };

  const load = async () => {
    const now = Date.now();
    if (now - meAt > ME_MS) {
      const again = await json<Me>("/api/chat/me").catch(() => null);
      if (again?.ok && again.body.selfUuid) me = again.body;
      meAt = now;
    }
    if (me.tutor) meet(me.tutor.clerkId, me.tutor.name, "tutor");
    if (classes.length > 0 && now - peersAt > PEERS_MS) {
      const res = await json<{ peers?: Peer[] }>("/api/chat/cohort-members");
      if (res.ok) {
        peers = res.body.peers ?? [];
        peersAt = now;
        for (const p of peers) {
          meet(p.clerkId, p.displayName);
          byName.set(p.displayName, p.clerkId);
        }
      }
    }
    const [classResults, threadsRes] = await Promise.all([
      Promise.all(
        classes.map((c) =>
          json<{ messages?: ClassMessage[] }>(
            `/api/chat/messages?channelId=${encodeURIComponent(c.id)}&limit=80`
          )
        )
      ),
      json<{ threads?: ThreadEntry[] }>("/api/chat/dm/threads"),
    ]);

    const before = begun ? store.get().threads : [];
    const kept = (id: string) => before.find((t) => t.id === id);
    const threads: Thread[] = [];

    classes.forEach((channel, at) => {
      const classRes = classResults[at];
      const newsId = idOf("news", channel.id);
      const classId = idOf("class", channel.id);
      const rows = oldestFirst(classRes?.ok ? (classRes.body.messages ?? []) : []).filter(
        // someone else's stopped message is not shown at all
        (m) => m.is_self || m.moderation_status !== "rejected"
      );
      const who = (m: ClassMessage) => {
        if (m.is_self) return "me";
        if (m.message_type === "announcement" && tutorId()) return tutorId()!;
        const known = byName.get(m.display_name);
        if (known) return known;
        meet(`name:${m.display_name}`, m.display_name);
        return `name:${m.display_name}`;
      };
      for (const m of rows) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        if (begun && !m.is_self && m.moderation_status === "approved") {
          const key = m.message_type === "announcement" ? newsId : classId;
          unread[key] = (unread[key] ?? 0) + 1;
        }
      }
      const news = rows
        .filter((m) => m.message_type === "announcement")
        .map((m) => shown(m, who(m)));
      const talk = rows
        .filter((m) => m.message_type !== "announcement")
        .map((m) => shown(m, who(m)));
      if (openId === newsId) unread[newsId] = 0;
      if (openId === classId) unread[classId] = 0;
      threads.push(
        {
          id: newsId,
          kind: "news",
          name: classes.length > 1 ? `Announcements, ${channel.name}` : "Announcements",
          canPost: staff,
          channelId: channel.id,
          loaded: true,
          msgs: withLocal(news, kept(newsId)?.msgs),
          unread: unread[newsId] ?? 0,
        },
        {
          id: classId,
          kind: "class",
          name: channel.name || "Class chat",
          channelId: channel.id,
          loaded: true,
          msgs: withLocal(talk, kept(classId)?.msgs),
          unread: unread[classId] ?? 0,
          typing: kept(classId)?.typing,
        }
      );
    });

    const entries = threadsRes.ok ? (threadsRes.body.threads ?? []) : [];
    const fromEntry = (id: string, kind: Thread["kind"], name: string, peerId: string): Thread => {
      const entry = entries.find((t) => t.otherClerkId === peerId);
      const old = kept(id);
      return {
        id,
        kind,
        name,
        with: peerId,
        peerId,
        loaded: old?.loaded ?? !entry,
        unread: openId === id ? 0 : (entry?.unreadCount ?? 0),
        typing: old?.typing,
        // until it is opened, its last message stands for it in the list
        msgs: old?.loaded
          ? old.msgs
          : entry?.lastMessagePreview
            ? [
                {
                  id: `last-${id}`,
                  from: peerId,
                  at: new Date(entry.lastMessageAt).getTime(),
                  text: entry.lastMessagePreview,
                  reactions: {},
                },
              ]
            : [],
      };
    };
    if (me.tutor) threads.push(fromEntry("tutor", "tutor", me.tutor.name, me.tutor.clerkId));
    for (const entry of entries) {
      if (entry.otherClerkId === tutorId()) continue;
      meet(entry.otherClerkId, entry.displayName);
      threads.push(
        fromEntry(`dm-${entry.otherClerkId}`, "dm", entry.displayName, entry.otherClerkId)
      );
    }
    // a chat begun here and not yet written in is kept
    for (const t of before)
      if (t.kind === "dm" && t.peerId && !threads.some((x) => x.id === t.id)) threads.push(t);

    store.set({
      live: true,
      threads,
      peers: peers.map((p) => p.clerkId),
      presence: presence(),
      paused: !!me.paused || store.get().paused,
    });
    begun = true;

    // private chats that are open, or have something new, are brought up to date
    await Promise.all(
      threads
        .filter((t) => t.peerId && t.loaded)
        .filter((t) => {
          const stamp = entries.find((e) => e.otherClerkId === t.peerId)?.lastMessageAt ?? "";
          const changed = stamps.get(t.id) !== stamp;
          stamps.set(t.id, stamp);
          return changed || t.id === openId;
        })
        .map(refresh)
    );
  };

  /** Where a chat is, as the presence route names it. */
  const placeOf = (thread: Thread | undefined) =>
    !thread || thread.kind === "news"
      ? null
      : thread.channelId
        ? { channelId: thread.channelId }
        : thread.peerId
          ? { withClerkId: thread.peerId }
          : null;

  const beat = async () => {
    const thread = store.get().threads.find((t) => t.id === openId);
    const place = placeOf(thread);
    if (!thread || !place) {
      // a tutor with the page open counts as here, whichever chat they are looking at
      if (staff) void post("/api/chat/presence", {});
      return;
    }
    const res = await post<{ typing?: { clerkId: string; name: string }[] }>("/api/chat/presence", {
      typing: Date.now() - typedAt < PRESENCE_MS + 1000 ? place : null,
      watch: place,
    }).catch(() => null);
    const other = res?.ok ? res.body.typing?.[0] : undefined;
    if (other) meet(other.clerkId, other.name);
    const waiting =
      thread.kind === "tutor" && assistantSince > 0 && Date.now() - assistantSince < 45_000;
    const typing = other
      ? (byName.get(other.name) ?? other.clerkId)
      : waiting
        ? "assistant"
        : undefined;
    store.change(thread.id, (t) => (t.typing === typing ? t : { ...t, typing }));
  };

  const remote: Remote = {
    open: (thread) => {
      openId = thread.id;
      if (thread.peerId && !thread.loaded) void refresh(thread);
    },
    read: (thread) => {
      if (thread.kind === "news" || thread.kind === "class") {
        unread[thread.id] = 0;
        if (thread.channelId)
          void post("/api/chat/read", {
            channelId: thread.channelId,
            scope: thread.kind === "news" ? "announcements" : "chat",
          });
      } else if (thread.peerId) {
        void post("/api/chat/dm/read", { withClerkId: thread.peerId });
      }
    },
    typing: () => {
      typedAt = Date.now();
    },
    react: (thread, msgId, how) => {
      if (!UUID.test(msgId)) return;
      void post("/api/chat/react", {
        kind: thread.channelId ? "channel" : "dm",
        messageId: msgId,
        reaction: how,
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
        question: body.question,
        replyTo: body.replyTo,
        reactions: {},
        state: "sending",
      };
      typedAt = 0;
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
          const extras = {
            content: body.text ?? "",
            mediaUrls,
            ...(body.question ? { question: body.question } : {}),
            ...(body.replyTo && UUID.test(body.replyTo) ? { parentMessageId: body.replyTo } : {}),
          };
          const sent = await post<SendAnswer>(
            thread.channelId ? "/api/chat/send" : "/api/chat/dm",
            thread.channelId
              ? {
                  channelId: thread.channelId,
                  messageType: thread.kind === "news" ? "announcement" : "cohort_message",
                  ...extras,
                }
              : { recipientId: thread.peerId, ...extras }
          );
          if (sent.ok && !sent.body.rejected) {
            mark({ state: "sent" });
            if (thread.kind === "tutor" && me.afterHours) assistantSince = Date.now();
            stamps.delete(thread.id);
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

  store.remote(remote);
  await load();
  const poll = window.setInterval(() => {
    if (!document.hidden) void load();
  }, POLL_MS);
  const pulse = window.setInterval(() => {
    if (!document.hidden) void beat();
  }, PRESENCE_MS);
  return () => {
    window.clearInterval(poll);
    window.clearInterval(pulse);
    store.release(remote);
  };
}
