// The portal's menus: what each item is called, and which items each plan has on the phone's bar and
// on the desktop rail.
import type { StickerName } from "./stickers";

export const LABEL: Record<StickerName, string> = {
  homework: "Homework",
  library: "Library",
  schedule: "Schedule",
  progress: "Progress",
  mistakes: "Mistake Log",
  rewards: "Rewards",
  chat: "Chat",
  settings: "Settings",
  more: "More",
};

/** On the phone's bar every name has a fifth of the width, so the one long name is said shorter
 *  there. The page and the desktop menu say it in full. */
export const ON_BAR: Partial<Record<StickerName, string>> = { mistakes: "Mistakes" };

/** The founder's menus. `bar` is the phone's five; `rail` is the desktop's, which has room for what the
 *  phone keeps under More. `home` is where that student lands. The Mistake Log sits right
 *  under Progress (founder, 2026-11-16); where a phone's five are already taken, it opens from a button
 *  beside Progress's name instead. */
export const PLANS = {
  practice: {
    label: "Free, Practice, Pro",
    name: "Practice",
    // on a phone the Library is the middle of the five, with Progress and the Mistake Log at its left
    // and Rewards and More at its right (founder, 2026-11-16)
    bar: ["progress", "mistakes", "library", "rewards", "more"],
    rail: ["library", "progress", "mistakes", "rewards"],
    home: "library",
  },
  cohort: {
    label: "Cohort",
    name: "Cohort",
    // Chat is the middle of the five (founder, 2026-11-16: the Class tab is gone; its class button
    // is on Homework and its workshops are in the Library)
    bar: ["homework", "library", "chat", "progress", "more"],
    home: "homework",
    rail: ["homework", "library", "chat", "progress", "mistakes", "rewards"],
  },
  private: {
    label: "Private",
    name: "Private",
    bar: ["homework", "library", "schedule", "progress", "more"],
    home: "homework",
    rail: ["homework", "library", "schedule", "chat", "progress", "mistakes", "rewards"],
  },
} as const satisfies Record<
  string,
  {
    label: string;
    name: string;
    bar: readonly StickerName[];
    rail: readonly StickerName[];
    home: StickerName;
  }
>;
export type Plan = keyof typeof PLANS;
