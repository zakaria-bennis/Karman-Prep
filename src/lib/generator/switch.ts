/*
 * The sitewide admin switch that hides every generated question (founder, 2026-11-22 round 2). While
 * it is on, the shared catalog read (fetchCatalogQuestionPool) leaves generated rows out of every
 * student pool and the serve-time path (serve.ts) makes none. Stored in admin_switches (migration
 * 20261122060000). Read at most every 30 seconds per server; until the table exists it reads as off.
 * Server only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

const KEY = "hide_generated";
const FRESH_MS = 30_000;
let cached: { on: boolean; at: number } | null = null;

const db = () => createAdminClient() as unknown as SupabaseClient;

/** True while an admin has hidden every generated question. Off when it cannot be read. */
export async function generatedHidden(): Promise<boolean> {
  if (cached && Date.now() - cached.at < FRESH_MS) return cached.on;
  let on = false;
  try {
    const { data, error } = await db()
      .from("admin_switches")
      .select("on_value")
      .eq("key", KEY)
      .maybeSingle();
    on = !error && (data as { on_value?: boolean } | null)?.on_value === true;
  } catch {
    on = false;
  }
  cached = { on, at: Date.now() };
  return on;
}

/** Flips the switch. The caller has already checked that the viewer is an admin. */
export async function setGeneratedHidden(on: boolean, by: string): Promise<void> {
  const { error } = await db()
    .from("admin_switches")
    .upsert({ key: KEY, on_value: on, updated_by: by, updated_at: new Date().toISOString() });
  if (error) throw new Error("The switch could not be saved");
  cached = { on, at: Date.now() };
}
