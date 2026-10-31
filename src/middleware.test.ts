import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { KARMAN_AUTH_ROUTES } from "@/lib/auth/routes";
import { SITE_PAGES } from "@/components/site/routes";

const captured = vi.hoisted(() => ({
  middlewareOptions: undefined as unknown,
  auth: undefined as unknown,
  clerkRuns: 0,
}));

// Keep Clerk's actual route matcher; replace only its external session wrapper: the handler runs with the
// test's `auth`, and every request that enters Clerk is counted.
vi.mock("@clerk/nextjs/server", async (original) => {
  const actual = await original<typeof import("@clerk/nextjs/server")>();
  return {
    ...actual,
    clerkMiddleware: (
      handler: (auth: unknown, request: NextRequest, event?: unknown) => unknown,
      options: unknown
    ) => {
      captured.middlewareOptions = options;
      return (request: NextRequest, event?: unknown) => {
        captured.clerkRuns += 1;
        return handler(captured.auth, request, event);
      };
    },
  };
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  captured.clerkRuns = 0;
});

async function load(auth: unknown) {
  captured.auth = auth;
  const { default: middleware } = await import("./middleware");
  const run = middleware as unknown as (request: NextRequest) => Promise<Response> | Response;
  return (path: string) => run(new NextRequest("https://karmanprep.com" + path));
}

it("opens marketing pages while protecting parent, tutor, admin and student routes", async () => {
  vi.stubEnv("NEXT_PUBLIC_KARMAN_LAUNCHED", "true");
  vi.stubEnv("NODE_ENV", "production");
  // An accidentally configured development bypass must not remove protection.
  vi.stubEnv("DEV_IMPERSONATE_CLERK_ID", "dev_seed_admin");
  const protect = vi.fn().mockResolvedValue(undefined);
  const auth = Object.assign(vi.fn().mockResolvedValue({ userId: null }), { protect });
  const run = await load(auth);
  expect(captured.middlewareOptions).toEqual(KARMAN_AUTH_ROUTES);
  // the marketing pages never enter Clerk once the site is launched: no handshake, no session check
  for (const path of SITE_PAGES) {
    const result = await run(path);
    expect(result.headers.get("x-middleware-rewrite")).toBeNull();
  }
  expect(captured.clerkRuns).toBe(0);
  // old marketing addresses and the sign-in pages go through Clerk and stay open
  for (const path of [
    "/free-diagnostic",
    "/plans",
    "/questions",
    "/blog",
    "/auth/sign-in",
    "/auth/sign-up",
  ]) {
    const result = await run(path);
    expect(result.headers.get("x-middleware-rewrite")).toBeNull();
    expect(protect).not.toHaveBeenCalled();
  }
  expect(captured.clerkRuns).toBe(6);
  for (const path of [
    "/dashboard/parent",
    "/dashboard/parent/student-id",
    "/tutor",
    "/tutor/student-id",
    "/tutor/payouts",
    "/admin/users",
    "/learn/math",
    "/diagnostic",
    "/learn/daily",
    "/learn/practice/rw-skill-inferences",
    "/questions/private",
  ]) {
    await run(path);
  }
  expect(protect).toHaveBeenCalledTimes(11);
  expect(protect.mock.calls.every((args) => args.length === 0)).toBe(true);
});
it("retains an explicit maintenance rollback without hiding the sign-in flow", async () => {
  vi.stubEnv("NEXT_PUBLIC_KARMAN_LAUNCHED", "false");
  vi.stubEnv("NODE_ENV", "production");
  const protect = vi.fn();
  const auth = Object.assign(vi.fn().mockResolvedValue({ userId: null }), { protect });
  const run = await load(auth);
  // before launch the marketing pages still go through the gate, so a signed-out visitor sees coming-soon
  const root = await run("/");
  expect(root.headers.get("x-middleware-rewrite")).toBe("https://karmanprep.com/coming-soon");
  const pricing = await run("/pricing");
  expect(pricing.headers.get("x-middleware-rewrite")).toBe("https://karmanprep.com/coming-soon");
  const signIn = await run("/auth/sign-in");
  expect(signIn.headers.get("x-middleware-rewrite")).toBeNull();
  expect(captured.clerkRuns).toBe(3);
});
