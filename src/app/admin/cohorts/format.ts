// Small display helpers shared by the /admin/cohorts list and its dialog.

import type { CohortStatus } from "@/lib/supabase/queries/cohorts";
import type { Tone } from "@/components/admin/workbench";

/** A date-only ISO string ("2026-03-14") as "Mar 14, 2026", read in UTC. */
export function formatSatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function tutorDisplay(t: {
  first_name: string | null;
  last_name: string | null;
  email: string;
}) {
  const full = [t.first_name, t.last_name].filter(Boolean).join(" ");
  return full || t.email;
}

export const STATUS_LABEL: Record<CohortStatus, string> = {
  forming: "Forming",
  active: "Active",
  completed: "Completed",
};

export const STATUS_TONE: Record<CohortStatus, Tone> = {
  forming: "info",
  active: "ok",
  completed: "neutral",
};
