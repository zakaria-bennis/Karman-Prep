"use client";
import { useSyncExternalStore } from "react";
import type { StudentHomeInput, StudentResponse } from "@/lib/student/home-model";
import type { PointAward } from "@/lib/student/skill-points";
import type { TrialRun } from "@/lib/student/time-trial";
import { withOverrides } from "@/lib/student/unlocks";

/** What the founder does in the preview, kept in this browser only. Never sent anywhere. */
export type PreviewHistory = {
  responses: StudentResponse[];
  awards: PointAward[];
  trialRuns: TrialRun[];
  dailyDoneOn: string | null;
  /** Tutor unlocks and student completions made in this browser, by assignment id. */
  unlocks: Record<string, string>;
  completions: Record<string, string>;
};

const KEY = "karman-preview:v1";
const EMPTY: PreviewHistory = {
  responses: [],
  awards: [],
  trialRuns: [],
  dailyDoneOn: null,
  unlocks: {},
  completions: {},
};
let cache: { raw: string | null; value: PreviewHistory } = { raw: null, value: EMPTY };
const listeners = new Set<() => void>();

function read(): PreviewHistory {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.value;
  let value = EMPTY;
  try {
    value = raw ? { ...EMPTY, ...(JSON.parse(raw) as PreviewHistory) } : EMPTY;
  } catch {
    value = EMPTY;
  }
  cache = { raw, value };
  return value;
}

export function addToHistory(add: Partial<PreviewHistory>) {
  const now = read();
  const next: PreviewHistory = {
    responses: [...now.responses, ...(add.responses ?? [])],
    awards: [...now.awards, ...(add.awards ?? [])],
    trialRuns: [...now.trialRuns, ...(add.trialRuns ?? [])],
    dailyDoneOn: add.dailyDoneOn ?? now.dailyDoneOn,
    unlocks: { ...now.unlocks, ...add.unlocks },
    completions: { ...now.completions, ...add.completions },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private windows can refuse storage; the preview still runs, it just forgets.
  }
  listeners.forEach((l) => l());
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing stored
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", l);
  };
}

export function usePreviewHistory(): PreviewHistory {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** The demo student's seeded history plus whatever was done in this browser. */
export function useMergedInput(base: StudentHomeInput): StudentHomeInput {
  const h = usePreviewHistory();
  return {
    ...base,
    responses: [...base.responses, ...h.responses],
    awards: [...base.awards, ...h.awards],
    trialRuns: [...base.trialRuns, ...h.trialRuns],
    dailyDoneOn: h.dailyDoneOn ?? base.dailyDoneOn,
    assignments: withOverrides(base.assignments, h.unlocks, h.completions),
  };
}

/** Tutor preview: take an unlock back (only one made in this browser). */
export function removeUnlock(id: string) {
  const now = read();
  const { [id]: _gone, ...unlocks } = now.unlocks;
  void _gone;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...now, unlocks }));
  } catch {
    // storage refused
  }
  listeners.forEach((l) => l());
}

const tick = (l: () => void) => {
  const t = setInterval(l, 1000);
  return () => clearInterval(t);
};
const second = () => Math.floor(Date.now() / 1000) * 1000;

/** The server's time during hydration, then the live clock (so an unlock shows at once). */
export function useLiveNow(serverNowMs: number): number {
  return useSyncExternalStore(tick, second, () => serverNowMs);
}
