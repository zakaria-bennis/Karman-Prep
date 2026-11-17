"use client";

// Chat (founder, 2026-11-16; his answers are in the project's notes; the messages are kept in
// chatStore.ts). A Cohort student has Announcements, the class chat, their tutor, and any classmate
// they write to. A Private student has their tutor only, so there is no list.
// With room, the chats are listed at the left and the open one is at the right. On a phone the list
// has the page, and a chat opened from it takes the page, with the way back in the title row.
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import ChatThread, { Face, Here, gist } from "./ChatThread";
import { CLASSMATES, PEOPLE, chat, useChat, type Presence, type Thread } from "./chatStore";
import styles from "./chat.module.css";
import { Scold } from "./ChatScold";
import { calm } from "./homeworkMotion";
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

/** The class chat's three faces fan out from one pile when Chat is opened. */
const fan = (el: HTMLElement | null) => {
  if (!el || calm() || el.dataset.fanned) return;
  el.dataset.fanned = "";
  gsap.fromTo(
    el.children,
    { x: (i) => -i * 12, rotate: (i) => -24 + i * 10, scale: 0.6 },
    {
      x: 0,
      rotate: 0,
      scale: 1,
      duration: 0.7,
      stagger: 0.09,
      delay: 0.15,
      ease: "back.out(2.2)",
      clearProps: "transform",
    }
  );
};

function Row({
  thread,
  open,
  presence,
  onOpen,
}: {
  thread: Thread;
  open: boolean;
  presence: Presence;
  onOpen: () => void;
}) {
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
          <span
            className={styles.faces}
            data-talking={thread.typing ? "" : undefined}
            ref={fan}
            aria-hidden="true"
          >
            <Face who="priya" size={28} />
            <Face who="leo" size={28} />
            <Face who="tutor" size={28} />
          </span>
        ) : (
          <Face who={thread.with ?? "tutor"} size={40} />
        )}
        <span className={styles.words}>
          <b>
            {thread.name}
            {thread.kind === "tutor" && <Here presence={presence} dot />}
          </b>
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
          {thread.unread > 0 && <i aria-label={`${thread.unread} unread`}>{thread.unread}</i>}
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
  const { threads, presence, paused, warning, inQuiz } = useChat();
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

  // "New chat" is left by pressing anywhere outside it, or Escape: there is no button to close it
  const fresh = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!starting) return;
    const away = (e: PointerEvent) =>
      !fresh.current?.contains(e.target as Node) && setStarting(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setStarting(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key);
    };
  }, [starting]);

  const strangers = CLASSMATES.filter((id) => !threads.some((t) => t.with === id));

  // in a skill set, a quiz or an exam there is no chat, and nothing of it to see
  if (inQuiz)
    return (
      <div className={`${lib.library} ${styles.chat}`}>
        <p className={`${lib.glass} ${styles.shut}`}>Chat is closed while you are in a quiz.</p>
      </div>
    );
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
                presence={presence}
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
            <div ref={fresh} className={styles.fresh}>
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
      {/* the check has caught answer-sharing once: the student is told, plainly, one time */}
      {warning && (
        <div className={styles.warn} role="alertdialog" aria-modal="true" aria-label="A warning">
          <div>
            <Scold />
            <h2>That was flagged</h2>
            <p>
              It looked like passing answers, not working the question out. Your tutor has been
              told. If it happens again, your chats pause until your tutor has reviewed them.
            </p>
            <button type="button" autoFocus onClick={() => chat.heard()}>
              I understand
            </button>
          </div>
        </div>
      )}
      {shown && (
        <div className={`${lib.glass} ${styles.pane}`}>
          <ChatThread key={shown.id} thread={shown} presence={presence} paused={paused} />
        </div>
      )}
    </div>
  );
}
