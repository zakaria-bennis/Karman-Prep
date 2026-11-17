"use client";

// Chat (founder, 2026-11-16; his answers are in the project's notes; the messages are kept in
// chatStore.ts). A Cohort student has Announcements, the class chat, their tutor, and any classmate
// they write to. A Private student has their tutor only, so there is no list.
// With room, the chats are listed at the left and the open one is at the right. On a phone the list
// has the page, and a chat opened from it takes the page, with the way back in the title row.
import { useEffect, useState } from "react";
import ChatThread, { Face, gist } from "./ChatThread";
import { CLASSMATES, PEOPLE, chat, useChat, type Thread } from "./chatStore";
import styles from "./chat.module.css";
import lib from "./library.module.css";
import type { Trail } from "./MistakeLog";
import { timeOfDay } from "./progressStats";
import { tick } from "./sound";

const when = (at: number) => {
  const d = new Date(at);
  const days = Math.floor(
    (new Date().setHours(0, 0, 0, 0) - new Date(at).setHours(0, 0, 0, 0)) / 86_400_000
  );
  return days === 0
    ? timeOfDay(d.getHours() * 60 + d.getMinutes())
    : days === 1
      ? "Yesterday"
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

function Row({ thread, open, onOpen }: { thread: Thread; open: boolean; onOpen: () => void }) {
  const last = thread.msgs[thread.msgs.length - 1];
  return (
    <li>
      <button
        type="button"
        className={styles.item}
        aria-current={open || undefined}
        onClick={onOpen}
      >
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
          <Face who={thread.with ?? "tutor"} size={40} />
        )}
        <span className={styles.words}>
          <b>{thread.name}</b>
          <span>
            {thread.typing
              ? "Writing"
              : last
                ? `${last.from === "me" ? "You: " : ""}${gist(last)}`
                : "Say hello"}
          </span>
        </span>
        <span className={styles.end}>
          {last && <small>{when(last.at)}</small>}
          {thread.unread > 0 && (
            <i
              data-kind={thread.kind === "news" ? "gold" : "red"}
              aria-label={`${thread.unread} unread`}
            >
              {thread.unread}
            </i>
          )}
        </span>
      </button>
    </li>
  );
}

export default function Chat({
  rail,
  alone,
  onTrail,
}: {
  rail: boolean;
  /** A Private student: one chat, with their tutor. */
  alone: boolean;
  onTrail: (trail: Trail | null) => void;
}) {
  const { threads, afterHours } = useChat();
  const [openId, setOpenId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  // with room a chat is always open: the one chosen, or the class chat to begin with
  const shown = alone
    ? threads[0]
    : threads.find((t) => t.id === (openId ?? (rail ? "class" : "")));
  const onPhone = !rail && !alone && shown;

  useEffect(() => {
    onTrail(onPhone ? { name: shown.name, back: "Chat", go: () => setOpenId(null) } : null);
    return () => onTrail(null);
  }, [onPhone, shown?.name, onTrail]);

  const strangers = CLASSMATES.filter((id) => !threads.some((t) => t.with === id));

  return (
    <div
      className={`${lib.library} ${styles.chat}`}
      data-alone={alone || undefined}
      data-open={onPhone ? "" : undefined}
    >
      {!alone && !onPhone && (
        <section className={`${lib.glass} ${styles.list}`} aria-label="Chats">
          <ul>
            {threads.map((t) => (
              <Row
                key={t.id}
                thread={t}
                open={rail && shown?.id === t.id}
                onOpen={() => {
                  setOpenId(t.id);
                  setStarting(false);
                  tick();
                }}
              />
            ))}
          </ul>
          {/* a classmate not yet written to */}
          {strangers.length > 0 && (
            <div className={styles.fresh}>
              <button
                type="button"
                className={styles.start}
                aria-expanded={starting}
                onClick={() => {
                  setStarting(!starting);
                  tick();
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M12 5.500v13M5.500 12h13" />
                </svg>
                New chat
              </button>
              {starting && (
                <ul>
                  {strangers.map((id) => (
                    <li key={id}>
                      <button
                        type="button"
                        className={styles.item}
                        onClick={() => {
                          setOpenId(chat.open(id));
                          setStarting(false);
                          tick();
                        }}
                      >
                        <Face who={id} size={32} />
                        <span className={styles.words}>
                          <b>{PEOPLE[id].name}</b>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
      {shown && (
        <div className={`${lib.glass} ${styles.pane}`}>
          <ChatThread key={shown.id} thread={shown} afterHours={afterHours} />
        </div>
      )}
    </div>
  );
}
