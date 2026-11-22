/*
 * The old pages that now live in Settings send their visitors there: /join and /join/[code] (a
 * tutor's code), /join/class (a school class code), /dashboard/student/scholarship and, for a
 * student, /billing. A visitor who is not signed in signs up (or in) and comes back to the same
 * link, as before. Server only.
 */
import "server-only";
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { settingsHref, type LinkedFolder } from "./settings-rules";

/** Sends the visitor to the Settings folder, or to sign up (sign in, for a `member` link) first. */
export async function toSettings(
  folder: LinkedFolder,
  extra: Record<string, string | null | undefined>,
  back: string,
  member = false
): Promise<never> {
  const { userId } = await safeAuth();
  const page = member ? "/auth/sign-in" : "/auth/sign-up";
  if (!userId) redirect(page + "?redirect_url=" + encodeURIComponent(back));
  redirect(settingsHref(folder, extra));
}
