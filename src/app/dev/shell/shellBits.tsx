// Small pieces of the portal's frame, kept out of page.tsx.
import { useEffect } from "react";
import { chat, closedNow, useChat, waiting } from "./chatStore";
import type { Plan } from "./plans";
import styles from "./shell.module.css";

/** The profile picture until a student sets one of their own: Karman's plain one, a soft violet sky
 *  and a figure, its head at the circle's middle. */
export function Me() {
  return (
    <svg viewBox="0 0 34 34" width="34" height="34">
      <defs>
        <linearGradient id="kp-me-sky" x1="0.2" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#9a86ea" />
          <stop offset="0.6" stopColor="#8a8fe6" />
          <stop offset="1" stopColor="#62c4e8" />
        </linearGradient>
      </defs>
      <rect width="34" height="34" fill="url(#kp-me-sky)" />
      <circle cx="17" cy="15.500" r="5.600" fill="#3b3a6e" fillOpacity="0.88" />
      <path
        d="M5 35c0-7.200 5.200-10.600 12-10.600S29 27.800 29 35Z"
        fill="#3b4f78"
        fillOpacity="0.85"
      />
    </svg>
  );
}

/** What is waiting in Chat, on its icon: a small red mark with how many messages there are, gold
 *  while an announcement is among them, and nothing at all when everything has been read (founder,
 *  2026-11-16). It sits on the corner of the blue bubble, inside the icon's own box, so it does not
 *  move when the menu opens. */
export function Unread() {
  const { count, news } = waiting(useChat());
  if (count === 0) return null;
  return (
    <i
      className={styles.badge}
      data-kind={news ? "gold" : "red"}
      aria-label={`${count} unread${news ? ", with an announcement" : ""}`}
    >
      {count > 9 ? "9+" : count}
    </i>
  );
}

/** Chat begins as the plan has it (a Cohort student has every kind of chat, a Private student their
 *  tutor only), and knows whether the tutor's hours are over. */
export function useChatPlan(plan: Plan) {
  useEffect(() => {
    if (plan !== "practice") chat.start(plan);
    chat.afterHours(closedNow());
  }, [plan]);
}

/** Demo switches for Chat: someone writes, the tutor announces, or it is after the tutor's hours. */
export function ChatDemo({ plan }: { plan: Plan }) {
  const late = useChat().afterHours;
  return (
    <>
      {plan === "cohort" && (
        <>
          <button
            type="button"
            onClick={() => chat.arrive("class", "sam", "anyone free to study at 5?")}
          >
            New message
          </button>
          <button
            type="button"
            onClick={() => chat.arrive("news", "tutor", "Class moves to 7:30 PM this Thursday.")}
          >
            Announcement
          </button>
        </>
      )}
      <button type="button" aria-pressed={late} onClick={() => chat.afterHours(!late)}>
        After hours
      </button>
    </>
  );
}
