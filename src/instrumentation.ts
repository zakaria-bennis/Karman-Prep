// ============================================================
// Next.js instrumentation hook.
// Runs once at server startup. Loads the appropriate Sentry
// config based on the runtime (Node vs Edge). Production-only
// (the configs themselves gate on NODE_ENV).
//
// See: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
// ============================================================

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Capture errors from React Server Components (Next.js 15+).
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> }
) {
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, {
    routerKind: "App Router",
    routePath: request.path,
    routeType: "render",
  });
}
