// What a visitor has already told us, kept in their browser so no later form asks it again (founder,
// 2026-11-25: "they're not filling out the same thing twice"). The sign-up questions write it; the cohort
// reservation and the registration after it read it and leave out the steps it answers.
export type KnownRole = "student" | "parent";
export interface Known {
  role?: KnownRole;
  /** The SAT they are taking, YYYY-MM-DD, or "" when they said they are not sure. */
  satDate?: string;
  /** Their latest score, as typed ("1180"). */
  score?: string;
  /** They have not taken an SAT yet. */
  noScore?: boolean;
  goal?: string;
}

const KEY = "karman:known";

export function readKnown(): Known {
  try {
    const kept = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Known;
    return kept && typeof kept === "object" ? kept : {};
  } catch {
    // a private window may refuse storage: nothing is known, so every question is asked
    return {};
  }
}

/** Adds to what is known. An empty answer never wipes a real one. */
export function keepKnown(patch: Known): void {
  try {
    const next: Known = { ...readKnown() };
    for (const [key, value] of Object.entries(patch) as [keyof Known, never][])
      if (value !== undefined && value !== "" && value !== null) next[key] = value;
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // see above
  }
}

/** "2027-03-06" as "March": the month a cohort is named by. */
export function monthName(day: string): string {
  const [y, m] = day.split("-").map(Number);
  return y && m ? new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long" }) : "";
}
