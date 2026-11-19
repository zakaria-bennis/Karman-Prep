"use client";

// Settings, inside the Account page (founder, 2026-11-18). Organized for a phone first: the student,
// then nine folders, each a row that says what it is set to; a folder opens as a page of its own
// (the title names it and the back pill leaves it). With room (the desktop rail) the folders stay at
// the left and the open one is beside them. What is inside each folder is in SettingsPanes.tsx.
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { stillChosen } from "@/lib/painting/motion";
import lib from "./library.module.css";
import type { Trail } from "./MistakeLog";
import { PLANS } from "./plans";
import { PANES, type FolderKey, type PaneProps } from "./SettingsPanes";
import { Icon } from "./settingsControls";
import { useSettings } from "./settingsStore";
import { Me } from "./shellBits";
import { tick } from "./sound";
import styles from "./settings.module.css";

const NAMES: Record<FolderKey, string> = {
  profile: "Profile",
  people: "Parent and tutor",
  sat: "My SAT",
  sound: "Sounds and music",
  look: "Display",
  quiz: "Quizzes and calculator",
  notify: "Notifications",
  plan: "Plan and billing",
  calendars: "Calendar sync",
  help: "Help and support",
};
/* The folders in three sets, so a student looks in the right place first: who they are, how the
   portal looks and sounds, and the account itself. */
const SETS: { name: string; keys: FolderKey[] }[] = [
  { name: "You", keys: ["profile", "people", "sat"] },
  { name: "Preferences", keys: ["look", "sound", "quiz", "notify"] },
  { name: "Account", keys: ["plan", "calendars", "help"] },
];

const IN = { type: "spring", stiffness: 460, damping: 36, mass: 1 } as const;

export default function Settings({
  rail,
  onTrail,
  ...props
}: PaneProps & { rail: boolean; onTrail: (trail: Trail | null) => void }) {
  const s = useSettings();
  const still = (useReducedMotion() ?? false) || stillChosen();
  const [open, setOpen] = useState<FolderKey | null>(null);
  /* with room, a folder is always open beside the list */
  const shown = rail ? (open ?? "profile") : open;

  // on a phone an open folder is a page of its own: the title names it, the back pill leaves it
  useEffect(() => {
    onTrail(open && !rail ? { name: NAMES[open], back: "Account", go: () => setOpen(null) } : null);
    return () => onTrail(null);
  }, [open, rail, onTrail]);
  useEffect(() => {
    if (!open || rail) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, rail]);

  const Pane = shown ? PANES[shown] : null;
  const list = (
    <div className={styles.side}>
      <section className={`${lib.glass} ${styles.me}`} aria-label="You">
        <span aria-hidden="true">
          <Me />
        </span>
        <b>{s.name || "Your name"}</b>
        <small>{PLANS[props.plan].name}</small>
      </section>
      <nav className={styles.sets} aria-label="Settings">
        {SETS.map((set) => (
          <div key={set.name} className={`${lib.glass} ${styles.folders}`}>
            <h3>{set.name}</h3>
            {set.keys.map((key) => (
              <button
                key={key}
                type="button"
                aria-current={rail && shown === key ? "true" : undefined}
                onClick={() => {
                  tick();
                  setOpen(key);
                  if (!rail) window.scrollTo({ top: 0 });
                }}
              >
                <Icon name={key} />
                <b>{NAMES[key]}</b>
              </button>
            ))}
          </div>
        ))}
      </nav>
      <button type="button" className={`${lib.glass} ${styles.out}`} onClick={() => tick()}>
        Sign out
      </button>
    </div>
  );

  return (
    <div className={`${lib.library} ${styles.settings}`} data-rail={rail || undefined}>
      {(rail || !open) && list}
      {Pane && shown && (
        <motion.div
          key={shown}
          className={styles.pane}
          initial={still ? false : { x: rail ? 0 : 36, y: rail ? 8 : 0, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={still ? { duration: 0 } : IN}
        >
          {rail && <h2 className={styles.paneName}>{NAMES[shown]}</h2>}
          <Pane {...props} />
        </motion.div>
      )}
    </div>
  );
}
