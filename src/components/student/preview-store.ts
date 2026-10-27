"use client";
import { useCallback, useSyncExternalStore } from "react";
import type { StudentHomeInput, StudentResponse } from "@/lib/student/home-model";
import type { PointAward } from "@/lib/student/skill-points";
import type { TrialRun } from "@/lib/student/time-trial";

/** What the founder does in the preview, kept in this browser only. Never sent anywhere. */
export type PreviewHistory = {
  responses: StudentResponse[];
  awards: PointAward[];
  trialRuns: TrialRun[];
  dailyDoneOn: string | null;
};

const KEY = "karman-preview:v1";
const EMPTY: PreviewHistory = { responses: [], awards: [], trialRuns: [], dailyDoneOn: null };
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
  };
}

export function useNow(): number {
  const get = useCallback(() => Math.floor(Date.now() / 60_000) * 60_000, []);
  return useSyncExternalStore(noop, get, get);
}
const noop = () => () => undefined;
