import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Keep Clerk's actual route matcher; replace only its external session wrapper.
vi.mock("@clerk/nextjs/server", async (original) => {
  const actual = await original<typeof import("@clerk/nextjs/server")>();
  return { ...actual, clerkMiddleware: (handler: unknown) => handler };
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("opens marketing pages while protecting parent, tutor, admin and student routes", async () => {
  vi.stubEnv("NEXT_PUBLIC_KARMAN_LAUNCHED", "true");
  vi.stubEnv("NODE_ENV", "production");
  // An accidentally configured development bypass must not remove protection.
  vi.stubEnv("DEV_IMPERSONATE_CLERK_ID", "dev_seed_admin");
  const { default: middleware } = await import("./middleware");
  const protect = vi.fn().mockResolvedValue(undefined);
  const auth = Object.assign(vi.fn().mockResolvedValue({ userId: null }), { protect });
  const run = middleware as unknown as (a: typeof auth, request: NextRequest) => Promise<Response>;
  for (const path of [
    "/",
    "/about",
    "/faq",
    "/blog",
    "/privacy",
    "/terms",
    "/refunds",
    "/auth/sign-in",
    "/auth/sign-up",
  ]) {
    const result = await run(auth, new NextRequest("https://karmanprep.com" + path));
    expect(result.headers.get("x-middleware-rewrite")).toBeNull();
    expect(protect).not.toHaveBeenCalled();
  }
  for (const path of [
    "/dashboard/parent",
    "/dashboard/parent/student-id",
    "/tutor",
    "/tutor/student-id",
    "/tutor/payouts",
    "/admin/users",
    "/learn/math",
  ]) {
    await run(auth, new NextRequest("https://karmanprep.com" + path));
  }
  expect(protect).toHaveBeenCalledTimes(7);
});
it("retains an explicit maintenance rollback without hiding the sign-in flow", async () => {
  vi.stubEnv("NEXT_PUBLIC_KARMAN_LAUNCHED", "false");
  vi.stubEnv("NODE_ENV", "production");
  const { default: middleware } = await import("./middleware");
  const protect = vi.fn();
  const auth = Object.assign(vi.fn().mockResolvedValue({ userId: null }), { protect });
  const run = middleware as unknown as (a: typeof auth, request: NextRequest) => Promise<Response>;
  const root = await run(auth, new NextRequest("https://karmanprep.com/"));
  expect(root.headers.get("x-middleware-rewrite")).toBe("https://karmanprep.com/coming-soon");
  const signIn = await run(auth, new NextRequest("https://karmanprep.com/auth/sign-in"));
  expect(signIn.headers.get("x-middleware-rewrite")).toBeNull();
});
