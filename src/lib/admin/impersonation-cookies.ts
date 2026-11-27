import "server-only";

// The "view as" cookies an admin uses to see the site as another person (read only: every write
// still uses the admin's real account). Shared by the admin console's View as buttons and the
// Page Studio, so both set them the same way. Callers check that the caller really is an admin.
import { cookies } from "next/headers";
import {
  IMPERSONATE_COOKIE,
  IMPERSONATE_USER_COOKIE,
  type AppRole,
} from "@/lib/supabase/queries/admin";

export type ViewAsRole = Exclude<AppRole, "admin">;

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 2, // 2 hours: long enough to review, short enough that you can't forget it
};

/** View the site as `role`, as one account when `userId` (users.id) is given. */
export async function setViewAs(role: ViewAsRole, userId: string | null): Promise<void> {
  const store = await cookies();
  store.set(IMPERSONATE_COOKIE, role, COOKIE_OPTS);
  if (userId) store.set(IMPERSONATE_USER_COOKIE, userId, COOKIE_OPTS);
  else store.delete(IMPERSONATE_USER_COOKIE);
}

/** Back to the admin's own view. */
export async function clearViewAs(): Promise<void> {
  const store = await cookies();
  store.delete(IMPERSONATE_COOKIE);
  store.delete(IMPERSONATE_USER_COOKIE);
}

/** What the admin is viewing as right now (null when their own view). */
export async function readViewAs(): Promise<{ role: string; userId: string | null } | null> {
  const store = await cookies();
  const role = store.get(IMPERSONATE_COOKIE)?.value;
  if (!role) return null;
  return { role, userId: store.get(IMPERSONATE_USER_COOKIE)?.value ?? null };
}
