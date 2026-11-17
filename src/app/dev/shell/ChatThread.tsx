"use client";

// One chat, in the manner of iMessage (founder, 2026-11-16): the student's own messages are blue and
// at the right, everyone else's gray and at the left, with a name over a classmate's in the class
// chat. Pressing a message opens its reactions and Reply. Under the student's last message in a
// private chat it says Delivered, then Read. Whoever is writing shows as three bobbing dots.
// Under the messages is the place to write, with a photo and a question to attach.
import { useEffect, useRef, useState } from "react";
import { Card, QuestionPicker, QuestionView } from "./ChatQuestions";
import {
  PEOPLE,
  REACTIONS,
  chat,
  type Msg,
  type Presence,
  type Reaction,
  type Shared,
  type Thread,
} from "./chatStore";
import styles from "./chat.module.css";
import { timeOfDay } from "./progressStats";
import { tick } from "./sound";

const nameOf = (id: string) => (id === "me" ? "You" : (PEOPLE[id]?.name ?? id));
export const gist = (m: Msg) =>
  m.question ? `Question: ${m.question.skill}` : m.photo ? "Photo" : (m.text ?? "");

export function Face({ who, size = 28 }: { who: string; size?: number }) {
  const p = PEOPLE[who];
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

function Tapback({ how }: { how: Reaction }) {
  if (how === "heart")
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" aria-label="Love">
        <path
          d="M12 20s-7-4.300-7-9.500A4 4 0 0 1 12 8a4 4 0 0 1 7 2.500C19 15.700 12 20 12 20z"
          fill="currentColor"
        />
      </svg>
    );
  if (how === "up")
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" aria-label="Like">
        <path
          d="M7 11v8H4.500v-8zm2 8v-8l3.500-6c1.500 0 2.300 1.200 2 2.600L14 10.500h4.200c1.100 0 1.900 1 1.700 2.100l-1 5c-.2.800-.900 1.400-1.700 1.400z"
          fill="currentColor"
        />
      </svg>
    );
  return <b aria-label={how}>{{ ha: "Ha", wow: "!!", what: "?" }[how]}</b>;
}

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
}: {
  thread: Thread;
  presence: Presence;
  /** The check has paused this student's chats until the tutor has looked. */
  paused: boolean;
}) {
  const afterHours = presence === "after";
  const end = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
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

  const send = (body: { text?: string; photo?: string }) => {
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
          <span className={styles.faces} aria-hidden="true">
            <Face who="priya" size={24} />
            <Face who="leo" size={24} />
            <Face who="tutor" size={24} />
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
              ? "Only your tutor posts here"
              : thread.kind === "class"
                ? "You, your classmates and your tutor"
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
        {thread.msgs.map((m, i) => {
          const before = thread.msgs[i - 1];
          const mine = m.from === "me";
          const person = PEOPLE[m.from];
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
                  {m.text}
                  {tallies.length > 0 && (
                    <span className={styles.tally}>
                      {[...new Set(tallies)].map((how) => (
                        <Tapback key={how} how={how} />
                      ))}
                      {tallies.length > 1 && tallies.length}
                    </span>
                  )}
                </button>
                {picked === m.id && (
                  <div className={styles.picker} role="group" aria-label="React or reply">
                    {REACTIONS.map((how) => (
                      <button
                        key={how}
                        type="button"
                        aria-pressed={m.reactions.me === how}
                        onClick={(e) => {
                          e.stopPropagation();
                          chat.react(thread.id, m.id, how);
                          setPicked(null);
                          tick();
                        }}
                      >
                        <Tapback how={how} />
                      </button>
                    ))}
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
                  {m.why === "contact"
                    ? "Not sent. Contact details and social accounts can't be shared here."
                    : m.why === "answers"
                      ? "Not sent. Chat is for working questions out, not for passing answers."
                      : "Not sent."}
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

      {thread.kind === "news" ? (
        <p className={styles.closed}>Only your tutor can post here.</p>
      ) : paused ? (
        <p className={styles.closed}>Your chats are paused until your tutor has reviewed them.</p>
      ) : (
        <footer>
          {thread.kind === "tutor" && afterHours && (
            <p className={styles.hours}>
              Your tutor is back at 9 AM. Until then the assistant answers, and your tutor follows
              up.
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
                  if (file) send({ photo: URL.createObjectURL(file) });
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
              onChange={(e) => setDraft(e.target.value)}
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
