// ============================================================
// A student's standing in chat (founder, 2026-11-16).
//
// The moderation pipeline says when a message is academic
// dishonesty (layer "integrity") or sexual content. This file
// turns those into consequences:
//
//   · answer-sharing, first time   → a warning; the tutor is told
//   · answer-sharing, again        → chats paused until a tutor
//                                    or admin has reviewed
//   · sexual content               → paused at once, no warning
//
// A paused student cannot send in any chat. Tutors and admins
// are never paused. The rules are pure functions here so they
// can be tested without a database; the reads and writes are at
// the foot of the file.
// ============================================================

import type { ModerationOutcome } from "@/lib/moderation/types";
import { createAdminClient } from "@/lib/supabase/server";

/** Answer-sharing flags before a pause. The first is a warning. */
export const STRIKES_TO_PAUSE = 2;

export type PauseReason = "integrity" | "content";
export interface Standing {
  strikes: number;
  paused: boolean;
}
export const GOOD_STANDING: Standing = { strikes: 0, paused: false };

export const PAUSED_MESSAGE = "Your chats are paused until your tutor has reviewed them.";
export const WARNING_MESSAGE =
  "That looked like passing answers, not working the question out. Your tutor has been told. If it happens again, your chats pause until your tutor has reviewed them.";

/** What a rejected message costs the sender, if anything. */
export type Consequence =
  | { kind: "none" }
  | { kind: "strike" }
  | { kind: "pause"; reason: PauseReason };

/** Which rejections count against a student. Sexual content is recognised from the check's own
 *  category name, which the pipeline writes at the head of its reason ("OpenAI: sexual/minors (0.97)"). */
export function consequenceOf(outcome: ModerationOutcome): Consequence {
  if (outcome.decision !== "rejected") return { kind: "none" };
  if (outcome.layer === "integrity") return { kind: "strike" };
  if (outcome.layer === "ai" && /^OpenAI: sexual/.test(outcome.reason))
    return { kind: "pause", reason: "content" };
  return { kind: "none" };
}

/** A student's standing after one more answer-sharing flag. */
export function afterStrike(before: Standing): Standing & { warned: boolean } {
  const strikes = before.strikes + 1;
  const paused = before.paused || strikes >= STRIKES_TO_PAUSE;
  return { strikes, paused, warned: !paused };
}

// ─── reads and writes ─────────────────────────────────────────

/** True when the table is not there yet: the code is running before its migration has been
 *  applied. Then nobody has a standing to read, and sending must go on as before. Any other
 *  error is thrown. */
const noTableYet = (error: { code?: string } | null): boolean =>
  error?.code === "42P01" || error?.code === "PGRST205";

export async function getStanding(userUuid: string): Promise<Standing> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_standing")
    .select("integrity_strikes, paused_at")
    .eq("user_id", userUuid)
    .maybeSingle();
  if (noTableYet(error)) return GOOD_STANDING;
  if (error) throw error;
  return data
    ? { strikes: data.integrity_strikes, paused: data.paused_at !== null }
    : GOOD_STANDING;
}

/** Applies a consequence and says what the sender should be told. Returns null when nothing counts. */
export async function applyConsequence(
  userUuid: string,
  consequence: Consequence
): Promise<{ warned: boolean; paused: boolean } | null> {
  if (consequence.kind === "none") return null;
  const supabase = createAdminClient();
  const before = await getStanding(userUuid);
  const now = new Date().toISOString();
  const next =
    consequence.kind === "strike"
      ? afterStrike(before)
      : { strikes: before.strikes, paused: true, warned: false };
  const { error } = await supabase.from("chat_standing").upsert({
    user_id: userUuid,
    integrity_strikes: next.strikes,
    // a pause already in force keeps its own time and reason
    ...(next.paused && !before.paused
      ? {
          paused_at: now,
          paused_reason: consequence.kind === "pause" ? consequence.reason : "integrity",
        }
      : {}),
    updated_at: now,
  });
  // with no table the message is still rejected; it just cannot be counted yet
  if (noTableYet(error)) return null;
  if (error) throw error;
  return { warned: next.warned, paused: next.paused };
}

/** A tutor or admin has looked: the pause is lifted and the count starts again. */
export async function liftPause(userUuid: string, reviewerUuid: string): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("chat_standing")
    .update({
      integrity_strikes: 0,
      paused_at: null,
      paused_reason: null,
      reviewed_by: reviewerUuid,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("user_id", userUuid);
  if (error) throw error;
}

export interface PausedStudent {
  userUuid: string;
  name: string;
  email: string;
  pausedAt: string;
  reason: PauseReason;
  strikes: number;
}

/** Everyone whose chats are paused, the longest wait first. */
export async function listPaused(): Promise<PausedStudent[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_standing")
    .select("user_id, integrity_strikes, paused_at, paused_reason")
    .not("paused_at", "is", null)
    .order("paused_at", { ascending: true });
  if (noTableYet(error)) return [];
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .in(
      "id",
      rows.map((r) => r.user_id)
    );
  if (usersError) throw usersError;
  const byId = new Map((users ?? []).map((u) => [u.id, u]));
  return rows.map((r) => {
    const u = byId.get(r.user_id);
    const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim();
    return {
      userUuid: r.user_id,
      name: name || u?.email || "Unknown student",
      email: u?.email ?? "",
      pausedAt: r.paused_at ?? "",
      reason: r.paused_reason === "content" ? "content" : "integrity",
      strikes: r.integrity_strikes,
    };
  });
}
