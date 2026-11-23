"use client";

// Settings, inside the Account page (founder, 2026-11-18). Organized for a phone first: the student,
// then the folders in three sets; a folder opens as a page of its own (the title names it and the
// back pill leaves it). With room (the desktop rail) the folders stay at the left and the open one
// is beside them. What is inside each folder: SettingsPanes.tsx and the files it lists. Scholarship
// shows for Cohort students only; Calendar sync for the taught plans, whose sessions the feed carries.
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import lib from "./library.module.css";
import type { Trail } from "./MistakeLog";
import { PLAN_NAMES } from "@/lib/student/plan-gate";
import { PLANS, type Plan } from "./plans";
import { usePortalData } from "./portalData";
import { PANES, type FolderKey, type PaneProps } from "./SettingsPanes";
import { Icon } from "./settingsControls";
import { useSettings } from "./settingsStore";
import { Me } from "./shellBits";
import { tick } from "./sound";
import { useSignOut } from "./useSignOut";
import styles from "./settings.module.css";
import { useStill } from "@/lib/painting/useStill";

const NAMES: Record<FolderKey, string> = {
  profile: "Profile",
  people: "Parent, tutor and class",
  sat: "My SAT",
  scholarship: "Scholarship",
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
function setsFor(plan: Plan, cohort: boolean): { name: string; keys: FolderKey[] }[] {
  return [
    {
      name: "You",
      keys: ["profile", "people", "sat", ...(cohort ? ["scholarship" as const] : [])],
    },
    { name: "Preferences", keys: ["look", "sound", "quiz", "notify"] },
    {
      name: "Account",
      keys: ["plan", ...(plan === "practice" ? [] : ["calendars" as const]), "help"],
    },
  ];
}

const IN = { type: "spring", stiffness: 460, damping: 36, mass: 1 } as const;

export default function Settings({
  rail,
  folder,
  onTrail,
  ...props
}: PaneProps & {
  rail: boolean;
  /** A folder to open first (?folder= on the page: the billing, tutor code and class links). */
  folder?: string | null;
  onTrail: (trail: Trail | null) => void;
}) {
  const s = useSettings();
  const real = usePortalData();
  const { signOut, leaving } = useSignOut();
  const still = useStill();
  const sets = setsFor(props.plan, real ? real.planId === "cohort" : props.plan === "cohort");
  const shownKeys: string[] = sets.flatMap((set) => set.keys);
  const [open, setOpen] = useState<FolderKey | null>(() =>
    folder && shownKeys.includes(folder) ? (folder as FolderKey) : null
  );
  /* with room, a folder is always open beside the list */
  const shown = rail ? (open ?? "profile") : open;

  // on a phone an open folder is a page of its own: the title names it, the back pill leaves it
  useEffect(() => {
    onTrail(shown ? { name: NAMES[shown], back: "Account", go: () => setOpen(null) } : null);
    return () => onTrail(null);
  }, [shown, onTrail]);
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
        <small>{real ? PLAN_NAMES[real.planId] : PLANS[props.plan].name}</small>
      </section>
      <nav className={styles.sets} aria-label="Settings">
        {sets.map((set) => (
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
      <button
        type="button"
        className={`${lib.glass} ${styles.out}`}
        disabled={leaving}
        onClick={() => (tick(), signOut())}
      >
        {leaving ? "Signing out" : "Sign out"}
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
          <Pane {...props} />
        </motion.div>
      )}
    </div>
  );
}
