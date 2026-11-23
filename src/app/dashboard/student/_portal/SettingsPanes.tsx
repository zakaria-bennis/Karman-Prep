"use client";

// What is inside each folder of Settings (Settings.tsx lists the folders). His list of 2026-11-18.
// A signed-in student's folders read and save their own account; the design page (no student) shows
// stand-ins and keeps choices in this browser. The folders are in four files by set:
//   SettingsYou.tsx          Profile, My SAT
//   SettingsPeople.tsx       Parent, tutor and class
//   SettingsScholarship.tsx  Scholarship (Cohort only)
//   SettingsPrefs.tsx        Display, Sounds and music, Quizzes and calculator, Notifications
//   SettingsPlan.tsx         Plan and billing
//   SettingsAccount.tsx      Calendar sync, Help and support
import type { ReactNode } from "react";
import type { Page, Plan } from "./plans";
import { Calendars, Help } from "./SettingsAccount";
import { People } from "./SettingsPeople";
import { PlanPane } from "./SettingsPlan";
import { Look, Notify, Quiz, Sound } from "./SettingsPrefs";
import { Scholarship } from "./SettingsScholarship";
import { Profile, Sat } from "./SettingsYou";

export type FolderKey =
  | "profile"
  | "people"
  | "sat"
  | "scholarship"
  | "sound"
  | "look"
  | "quiz"
  | "notify"
  | "plan"
  | "calendars"
  | "help";

export type PaneProps = {
  plan: Plan;
  dark: boolean;
  onDark: (dark: boolean) => void;
  onGo: (page: Page) => void;
};

export const PANES: Record<FolderKey, (props: PaneProps) => ReactNode> = {
  profile: Profile,
  people: People,
  sat: Sat,
  scholarship: Scholarship,
  sound: Sound,
  look: Look,
  quiz: Quiz,
  notify: Notify,
  plan: PlanPane,
  calendars: Calendars,
  help: Help,
};
