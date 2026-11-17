// Small pieces of the portal's frame, kept out of page.tsx.
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

/** What is waiting in Chat, on its icon, until Chat is opened: a red mark with how many messages
 *  were missed, or a gold one when an announcement was (founder, 2026-11-16). The numbers are
 *  stand-ins. */
export function Unread({ what }: { what: "none" | "some" | "news" }) {
  if (what === "none") return null;
  return (
    <i
      className={styles.badge}
      data-kind={what === "news" ? "gold" : "red"}
      aria-label={what === "news" ? "A new announcement" : "3 unread messages"}
    >
      {what === "news" ? "!" : 3}
    </i>
  );
}
