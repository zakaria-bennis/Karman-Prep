// The Daily 10 from anywhere in the portal, the way the Library's card plays it: its start page, then
// the questions over the portal (play/PlayLayer.tsx). Progress's "Start the Daily 10" used to leave
// for the old /learn/daily-ten page (found 2026-11-22).
"use client";

import { useRouter } from "next/navigation";
import { isLocked } from "@/lib/portal/locks";
import { DailyStart } from "./DailyStart";
import { usePlay } from "./play/PlayLayer";
import { askUpgrade, type Gate } from "./upgradeStore";

export function useDailyTen(gate: Gate) {
  const router = useRouter();
  const { layer, play } = usePlay(undefined, (finished) => {
    // a finished Daily 10 changes Progress, so its numbers are read again in place
    if (finished) router.refresh();
  });
  const start = () => {
    if (!gate) return;
    if (isLocked("questions", gate.planId, gate.access)) return askUpgrade("questions");
    play({ kind: "daily" }, null, (go) => <DailyStart onStart={() => go()} onGo={go} />);
  };
  return { layer, start };
}
