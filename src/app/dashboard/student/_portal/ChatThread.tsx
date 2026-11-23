"use client";

// One chat, in the manner of iMessage (founder, 2026-11-16): the student's own messages are blue and
// at the right, everyone else's gray and at the left, with a name over a classmate's in the class
// chat. Pressing a message opens its reactions and Reply. Under the student's last message in a
// private chat it says Delivered, then Read. Whoever is writing shows as three bobbing dots.
// Under the messages is the place to write, with a photo and a question to attach.
import { useEffect, useRef, useState } from "react";
import { EMOJI, EmojiArt, FIRST, said, stirEmoji } from "./ChatEmoji";
import { Card, QuestionPicker, QuestionView } from "./ChatQuestions";
import {
  classFaces,
  personOf,
  chat,
  type Msg,
  type Presence,
  type Shared,
  type Thread,
} from "./chatStore";
import styles from "./chat.module.css";
import { timeOfDay } from "./progressStats";
import { tick } from "./sound";

const nameOf = (id: string) => (id === "me" ? "You" : (personOf(id)?.name ?? id));
export const gist = (m: Msg) =>
  m.question ? `Question: ${m.question.skill}` : m.photo ? "Photo" : (m.text ?? "");

export function Face({ who, size = 28 }: { who: string; size?: number }) {
  const p = personOf(who);
  return (
    <span
      className={styles.face}
      style={{ width: size, height: size, background: p?.tint ?? "#8e8e93", fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {p?.role === "assistant" ? "K" : (p?.name[0] ?? "?")}
    </span>
  );
}

const stamp = (at: number) => {
  const d = new Date(at);
  const days = Math.floor(
    (new Date().setHours(0, 0, 0, 0) - new Date(at).setHours(0, 0, 0, 0)) / 86_400_000
  );
  const day =
    days === 0
      ? "Today"
      : days === 1
        ? "Yesterday"
        : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return `${day} ${timeOfDay(d.getHours() * 60 + d.getMinutes())}`;
};

/** The tutor's presence, as a word on a colored pill: green Online, red Offline, and yellow After
 *  hours (9 PM to 9 AM Central), when the assistant answers. */
const HERE: Record<Presence, string> = {
  online: "Online",
  offline: "Offline",
  after: "After hours",
};
export function Here({ presence, dot = false }: { presence: Presence; dot?: boolean }) {
  return dot ? (
    <i className={styles.dot} data-here={presence} aria-label={HERE[presence]} />
  ) : (
    <span className={styles.here} data-here={presence}>
      <i />
      {HERE[presence]}
    </span>
  );
}

export default function ChatThread({
  thread,
  presence,
  paused,
  live,
}: {
  thread: Thread;
  /** Real messages: a private chat says so while its messages are being fetched. */
  live: boolean;
  presence: Presence;
  /** The check has paused this student's chats until the tutor has looked. */
  paused: boolean;
}) {
  const afterHours = presence === "after";
  const end = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [more, setMore] = useState(false);
  const [bringing, setBringing] = useState(false);
  /** A question chosen to send, waiting for a few words to go with it. */
  const [held, setHeld] = useState<Shared | null>(null);
  const [viewing, setViewing] = useState<Shared | null>(null);
  const group = thread.kind === "class" || thread.kind === "news";
  const lastMine = [...thread.msgs].reverse().find((m) => m.from === "me");
  const quoted = thread.msgs.find((m) => m.id === replyTo);

  // the newest message is kept in view
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [thread.id, thread.msgs.length, thread.typing, lastMine?.state]);
  // what was unread is read once the chat is open
  useEffect(() => {
    if (thread.unread) chat.read(thread.id);
  }, [thread.id, thread.unread]);
  useEffect(() => chat.opened(thread.id), [thread.id]);

  const send = (body: { text?: string }) => {
    chat.send(thread.id, { ...body, question: held ?? undefined, replyTo: replyTo ?? undefined });
    setDraft("");
    setReplyTo(null);
    setHeld(null);
    tick();
  };

  return (
    <section className={styles.thread} aria-label={thread.name}>
      <header>
        {thread.kind === "news" ? (
          <span className={styles.horn} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M4 10v4h3l7 4V6l-7 4zM17 9.500a3.500 3.500 0 0 1 0 5" />
            </svg>
          </span>
        ) : thread.kind === "class" ? (
          <span
            className={styles.faces}
            data-talking={thread.typing ? "" : undefined}
            aria-hidden="true"
          >
            {classFaces().map((who) => (
              <Face key={who} who={who} size={28} />
            ))}
          </span>
        ) : (
          <Face who={thread.with ?? "tutor"} size={36} />
        )}
        <p>
          <b>
            {thread.name}
            {thread.kind === "tutor" && <Here presence={presence} dot />}
          </b>
          <span>
            {thread.kind === "news"
              ? thread.canPost
                ? "You post, your class reads"
                : "Only your tutor posts"
              : thread.kind === "class"
                ? "Class and tutor"
                : thread.kind === "tutor"
                  ? "Your tutor"
                  : "Classmate"}
          </span>
        </p>
        {thread.kind === "tutor" && <Here presence={presence} />}
      </header>

      <div className={styles.flow} onClick={() => setPicked(null)}>
        {/* a parent can read this one chat, and the student is told so */}
        {thread.kind === "tutor" && <p className={styles.note}>Your parent can read this chat.</p>}
        {live && !thread.loaded && <p className={styles.note}>Loading</p>}
        {thread.msgs.map((m, i) => {
          const before = thread.msgs[i - 1];
          const mine = m.from === "me";
          const person = personOf(m.from);
          const first = !before || before.from !== m.from || m.at - before.at > 45 * 60_000;
          const reply = m.replyTo && thread.msgs.find((x) => x.id === m.replyTo);
          const tallies = Object.values(m.reactions);
          return (
            <div key={m.id} className={styles.line} data-mine={mine || undefined}>
              {(!before || m.at - before.at > 45 * 60_000) && (
                <p className={styles.stamp}>{stamp(m.at)}</p>
              )}
              {first && !mine && (group || person?.role === "assistant") && (
                <p className={styles.who}>
                  {person?.name}
                  {person?.role === "tutor" && <em>Tutor</em>}
                  {person?.role === "assistant" && <em>Automated, not a person</em>}
                </p>
              )}
              {reply && (
                <p className={styles.quote}>
                  {nameOf(reply.from)}: {gist(reply)}
                </p>
              )}
              <div className={styles.row}>
                {!mine &&
                  group &&
                  (first ? <Face who={m.from} /> : <span className={styles.gap} />)}
                <button
                  type="button"
                  className={styles.bubble}
                  data-state={m.state}
                  aria-label={`${nameOf(m.from)}: ${gist(m)}`}
                  aria-expanded={picked === m.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMore(false);
                    setPicked(picked === m.id ? null : m.id);
                  }}
                >
                  {m.question && (
                    <span
                      className={styles.opens}
                      role="button"
                      tabIndex={0}
                      aria-label={`Open the question: ${m.question.skill}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewing(m.question ?? null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && setViewing(m.question ?? null)}
                    >
                      <Card q={m.question} />
                    </span>
                  )}
                  {/* a photo the student chose from their own device, shown as it is */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.photo && <img src={m.photo} alt="" />}
                  {m.text && <span className={styles.words}>{m.text}</span>}
                  {tallies.length > 0 && (
                    <span className={styles.tally} ref={stirEmoji}>
                      {[...new Set(tallies)].map((how) => (
                        <EmojiArt key={how} kind={how} size={16} />
                      ))}
                      {tallies.length > 1 && tallies.length}
                    </span>
                  )}
                </button>
                {picked === m.id && (
                  <div
                    className={styles.picker}
                    data-all={more || undefined}
                    role="group"
                    aria-label="React or reply"
                    ref={stirEmoji}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {(more ? EMOJI : FIRST).map((how) => (
                      <button
                        key={how}
                        type="button"
                        aria-label={said(how)}
                        aria-pressed={m.reactions.me === how}
                        onPointerEnter={(e) => stirEmoji(e.currentTarget)}
                        onClick={() => {
                          chat.react(thread.id, m.id, how);
                          setPicked(null);
                          setMore(false);
                          tick();
                        }}
                      >
                        <EmojiArt kind={how} />
                      </button>
                    ))}
                    {/* the rest of the twenty */}
                    {!more && (
                      <button
                        type="button"
                        aria-label="More reactions"
                        onClick={() => setMore(true)}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <path d="M12 6v12M6 12h12" />
                        </svg>
                      </button>
                    )}
                    {thread.kind !== "news" && (
                      <button
                        type="button"
                        className={styles.replyTo}
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyTo(m.id);
                          setPicked(null);
                        }}
                      >
                        Reply
                      </button>
                    )}
                  </div>
                )}
              </div>
              {/* why it was not sent. Vulgar or sexual words get no explanation at all. */}
              {mine && m.state === "blocked" && (
                <p className={styles.stopped}>
                  {m.note ??
                    (m.why === "contact"
                      ? "Not sent. Contact details and social accounts can't be shared here."
                      : m.why === "answers"
                        ? "Not sent. Chat is for working questions out, not for passing answers."
                        : "Not sent.")}
                </p>
              )}
              {mine && m === lastMine && m.state !== "blocked" && (
                <p className={styles.receipt}>
                  {m.state === "sending"
                    ? "Sending"
                    : m.state === "read" && !group
                      ? "Read"
                      : "Delivered"}
                </p>
              )}
            </div>
          );
        })}
        {thread.typing && (
          <div className={styles.line}>
            {group && <p className={styles.who}>{nameOf(thread.typing)}</p>}
            <div className={styles.row}>
              {group && <Face who={thread.typing} />}
              <span
                className={styles.bubble}
                data-typing
                aria-label={`${nameOf(thread.typing)} is writing`}
              >
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>
        )}
        <div ref={end} />
      </div>

      {thread.kind === "news" && !thread.canPost ? (
        <p className={styles.closed}>Only your tutor can post here</p>
      ) : paused ? (
        <p className={styles.closed}>Paused until your tutor reviews your chats</p>
      ) : (
        <footer>
          {thread.kind === "tutor" && afterHours && (
            <p className={styles.hours}>
              Your tutor is back at 9 AM. The assistant answers until then.
            </p>
          )}
          {quoted && (
            <p className={styles.replying}>
              <span>
                Replying to {nameOf(quoted.from)}: {gist(quoted)}
              </span>
              <button type="button" aria-label="Stop replying" onClick={() => setReplyTo(null)}>
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M7 7l10 10M17 7L7 17" />
                </svg>
              </button>
            </p>
          )}
          {/* a question chosen to send: it waits here while the student writes a few words to go
              with it, and can be taken off again */}
          {held && (
            <p className={styles.holding}>
              <Card q={held} />
              <button
                type="button"
                aria-label="Take the question off"
                onClick={() => setHeld(null)}
              >
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M7 7l10 10M17 7L7 17" />
                </svg>
              </button>
            </p>
          )}
          <form
            className={styles.write}
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim() || held) send({ text: draft.trim() || undefined });
            }}
          >
            <label className={styles.tool} aria-label="Send a photo">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <rect x="3.500" y="6" width="17" height="13" rx="3" />
                <circle cx="12" cy="12.500" r="3.200" />
                <path d="M8.500 6l1.200-2h4.600l1.200 2" />
              </svg>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    chat.sendPhoto(thread.id, file);
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              className={styles.tool}
              aria-label="Bring a question"
              aria-expanded={bringing}
              onClick={() => setBringing(!bringing)}
            >
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M7 4h10v16l-5-3.500L7 20z" />
              </svg>
            </button>
            <input
              className={styles.field}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                chat.typing(thread.id);
              }}
              // Enter sends: words, or a question on its own
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                e.preventDefault();
                if (draft.trim() || held) send({ text: draft.trim() || undefined });
              }}
              placeholder={held ? "Say what you need help with" : "Message"}
              aria-label="Message"
              enterKeyHint="send"
            />
            <button
              type="submit"
              className={styles.send}
              aria-label="Send"
              disabled={!draft.trim()}
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M12 19V5.500M6 11l6-6 6 6" />
              </svg>
            </button>
          </form>
        </footer>
      )}
      {bringing && (
        <QuestionPicker
          onPick={(q) => {
            setHeld(q);
            setBringing(false);
            tick();
          }}
          onLeave={() => setBringing(false)}
        />
      )}
      {viewing && <QuestionView q={viewing} onLeave={() => setViewing(null)} />}
    </section>
  );
}
