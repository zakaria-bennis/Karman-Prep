"use client";
import dynamic from "next/dynamic";
import { preloadPlay } from "./play/usePlay";

// Speed (2026-11-23): the tabs a student opens less often load on their own, so the portal's
// first screen does not wait for them; preloadTabs fetches them in the background once it shows.
const tabs = {
  chat: () => import("./Chat"),
  schedule: () => import("./Schedule"),
  mistakes: () => import("./MistakeLog"),
  settings: () => import("./Settings"),
  progress: () => import("./Progress"),
  rewards: () => import("./Rewards"),
};
export const Chat = dynamic(tabs.chat);
export const Schedule = dynamic(tabs.schedule);
export const MistakeLog = dynamic(tabs.mistakes);
export const Settings = dynamic(tabs.settings);
export const Progress = dynamic(tabs.progress);
export const Rewards = dynamic(tabs.rewards);

/** Fetches every tab's code and the quiz player when the browser is next idle. */
export function preloadTabs() {
  const run = () => {
    for (const load of Object.values(tabs)) load().catch(() => {});
    preloadPlay();
  };
  if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 500);
}
