"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { SITE_THEMES } from "@/lib/themes/palettes";
const themeSchema = z
  .string()
  .refine((id) => SITE_THEMES.some((theme) => theme.id === id), "Unknown theme");

/** Persist only the caller's cosmetic choice. Never accept a target account or role. */
export async function saveThemePreference(input: string): Promise<void> {
  const id = themeSchema.parse(input);
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const role = await fetchUserRole(userId);
  if (role !== "student" && role !== "parent") throw new Error("Forbidden");
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, { unsafeMetadata: { karmanTheme: id } });
}
