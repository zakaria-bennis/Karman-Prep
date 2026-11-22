"use client";

// Account: the student's own things. On a phone it is the last picture of the bar's second set (the
// profile picture; founder, 2026-11-18: no More page, the bar itself turns like a carousel, see
// moreBar.ts); on a desktop the profile at the foot of the rail opens the small AccountMenu.
//   The Account page itself is Settings (Settings.tsx).
//   AccountMenu  the small menu the profile opens on a desktop (founder, 2026-11-15: Settings
//                lives here, not in the rail).
import { AnimatePresence, motion } from "framer-motion";
import { PLANS, type Plan } from "./plans";
import { Sticker, type StickerName } from "./stickers";
import { useSignOut } from "./useSignOut";
import shell from "./shell.module.css";

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
  const { signOut, leaving } = useSignOut();
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
          <button
            type="button"
            role="menuitem"
            className={shell.row}
            disabled={leaving}
            onClick={() => (onClose(), signOut())}
          >
            {leaving ? "Signing out" : "Sign out"}
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
