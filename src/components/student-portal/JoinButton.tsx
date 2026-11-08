/*
 * "Join" for a live class, 1:1 or workshop (founder, 2026-11-08): students join Zoom from their
 * Karman account, not from an emailed link. It shows from shortly before the session until it
 * ends (`joinOpen` in src/lib/student/calendar.ts) and opens the meeting in a new tab.
 */
import styles from "./join.module.css";

export default function JoinButton({ href, what }: { href: string; what: string }) {
  return (
    <a className={styles.join} href={href} target="_blank" rel="noopener noreferrer">
      Join<span className="kp-sr"> {what} on Zoom (opens in a new tab)</span>
    </a>
  );
}
