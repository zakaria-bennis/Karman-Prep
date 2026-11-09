"use server";

// Calendar feed link for the signed-in student or parent. Always acts on
// the caller's own account: never accepts a user id, and never follows an
// admin's impersonation lens (that is for reading, not for links).

import { headers } from "next/headers";
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getOrCreateFeedToken, resetFeedToken } from "@/lib/calendar-feed/server";
import { calendarFeedLinks, type CalendarFeedLinks } from "@/lib/calendar-feed/links";

const resetSchema = z.object({ confirm: z.literal(true) }).strict();

async function callerUserId(): Promise<string> {
  const { userId: clerkId } = await safeAuth();
  if (!clerkId) throw new Error("Unauthorized");
  const { data, error } = await createAdminClient()
    .from("users")
    .select("id, role")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (error) throw error;
  if (!data || (data.role !== "student" && data.role !== "parent")) throw new Error("Forbidden");
  return data.id;
}

async function siteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && /^https?:\/\//.test(configured)) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) throw new Error("Unknown host");
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function getCalendarFeedLinks(): Promise<CalendarFeedLinks> {
  const userId = await callerUserId();
  return calendarFeedLinks(await siteUrl(), await getOrCreateFeedToken(userId));
}

export async function resetCalendarFeedLink(input: unknown): Promise<CalendarFeedLinks> {
  resetSchema.parse(input);
  const userId = await callerUserId();
  return calendarFeedLinks(await siteUrl(), await resetFeedToken(userId));
}
