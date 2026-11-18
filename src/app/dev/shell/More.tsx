"use client";

// More: the last of the five on a phone and a tablet, and the profile's menu on a desktop.
//   More         holds what the plan's menu has that the five have no room for (founder: Chat, the
//                Mistake Log and Rewards on the taught plans), each a press away, and the
//                student's own things, which a desktop keeps in the profile's menu: light or dark,
//                and signing out. Settings will get a row here when its page exists.
//   AccountMenu  the small menu the profile opens on a desktop (founder, 2026-11-15: Settings
//                lives here, not in the rail).
// Signing out does nothing yet: the dev page has no session.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import lib from "./library.module.css";
import { LABEL, PLANS, type Plan } from "./plans";
import { press, wave } from "./scheduleMotion";
import { Me, Unread } from "./shellBits";
import { tick } from "./sound";
import { Sticker, type StickerName } from "./stickers";
import shell from "./shell.module.css";
import styles from "./more.module.css";

const OPEN = { type: "spring", stiffness: 380, damping: 36, mass: 1 } as const;

/** Light or dark, as two halves of one switch. */
function Look({ dark, onDark }: { dark: boolean; onDark: (dark: boolean) => void }) {
  return (
    <div className={shell.look} role="group" aria-label="Appearance">
      <button type="button" aria-pressed={!dark} onClick={() => onDark(false)}>
        Light
      </button>
      <button type="button" aria-pressed={dark} onClick={() => onDark(true)}>
        Dark
      </button>
    </div>
  );
}

export function AccountMenu({
  open,
  still,
  dark,
  onDark,
  onSettings,
  onClose,
}: {
  open: boolean;
  still: boolean;
  dark: boolean;
  onDark: (dark: boolean) => void;
  onSettings: () => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={shell.account}
          role="menu"
          data-account
          initial={still ? false : { opacity: 0, scale: 0.9, y: 12, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={still ? undefined : { opacity: 0, scale: 0.9, y: 12, filter: "blur(8px)" }}
          transition={still ? { duration: 0 } : OPEN}
        >
          <button type="button" role="menuitem" className={shell.row} onClick={onSettings}>
            <Sticker name="settings" size={24} />
            Settings
          </button>
          <Look dark={dark} onDark={onDark} />
          <button type="button" role="menuitem" className={shell.row} onClick={onClose}>
            Sign out
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** What the plan's menu has that its five have no room for. */
export const tuckedIn = (plan: Plan): StickerName[] => {
  const bar: readonly StickerName[] = PLANS[plan].bar;
  return PLANS[plan].rail.filter((item) => !bar.includes(item));
};

export default function More({
  plan,
  dark,
  onDark,
  onGo,
}: {
  plan: Plan;
  dark: boolean;
  onDark: (dark: boolean) => void;
  onGo: (page: StickerName) => void;
}) {
  const pages = tuckedIn(plan);
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => wave(list.current), []);
  return (
    <div className={`${lib.library} ${styles.more}`}>
      {pages.length > 0 && (
        <section className={`${lib.glass} ${styles.pages}`} aria-label="Pages">
          <ul ref={list}>
            {pages.map((page) => (
              <li key={page}>
                <button
                  type="button"
                  onClick={(e) => {
                    tick();
                    press(e.currentTarget);
                    onGo(page);
                  }}
                >
                  <span className={styles.art}>
                    <Sticker name={page} size={34} />
                    {page === "chat" && <Unread />}
                  </span>
                  <b>{LABEL[page]}</b>
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path d="M9.500 6.500L15 12l-5.500 5.500" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className={`${lib.glass} ${styles.me}`} aria-label="Account">
        <p className={styles.who}>
          <span aria-hidden="true">
            <Me />
          </span>
          <b>Maya Okafor</b>
          <small>{PLANS[plan].name}</small>
        </p>
        <Look dark={dark} onDark={onDark} />
        <button type="button" className={styles.out} onClick={() => tick()}>
          Sign out
        </button>
      </section>
    </div>
  );
}
