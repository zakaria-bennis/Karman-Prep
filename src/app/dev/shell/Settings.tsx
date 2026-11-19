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
import { TRACK_NAMES } from "./music";
import { PLANS } from "./plans";
import { PANES, type FolderKey, type PaneProps } from "./SettingsPanes";
import { Chevron, Icon } from "./settingsControls";
import { TEXT_NAMES, dayName, useSettings, type Settings as Kept } from "./settingsStore";
import { Me } from "./shellBits";
import { tick } from "./sound";
import styles from "./settings.module.css";

const NAMES: Record<FolderKey, string> = {
  profile: "Profile",
  sat: "Your SAT",
  sound: "Sound",
  look: "Appearance",
  quiz: "Quiz",
  notify: "Notifications",
  plan: "Plan",
  calendars: "Calendars",
  help: "Help",
};
const ORDER: FolderKey[] = [
  "profile",
  "sat",
  "sound",
  "look",
  "quiz",
  "notify",
  "plan",
  "calendars",
  "help",
];

/** What a folder is set to, said in a word or two beside its name. */
function summary(key: FolderKey, s: Kept, props: PaneProps): string {
  switch (key) {
    case "sat":
      return s.testDate ? dayName(s.testDate).replace(/, \d+$/, "") : "No date yet";
    case "sound":
      return s.music ? TRACK_NAMES[s.track] : s.sounds ? "On" : "Off";
    case "look":
      return `${props.dark ? "Dark" : "Light"}, ${TEXT_NAMES[s.textStep].toLowerCase()}`;
    case "quiz":
      return s.angle === "rad" ? "Radians" : "Degrees";
    case "plan":
      return PLANS[props.plan].name;
    case "calendars":
      return s.apple || s.google ? "Connected" : "";
    default:
      return "";
  }
}

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
      <nav className={`${lib.glass} ${styles.folders}`} aria-label="Settings">
        {ORDER.map((key) => {
          const says = summary(key, s, props);
          return (
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
              {says && <small>{says}</small>}
              <Chevron />
            </button>
          );
        })}
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
