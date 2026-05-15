// ============================================================
// patch-cf-worker — runs after `opennextjs-cloudflare build` to
// inject a `scheduled` handler into .open-next/worker.js so
// Cloudflare Worker cron triggers reach our /api routes.
//
// Why a patch and not a wrapper file:
//   The OpenNext-generated worker.js contains relative imports
//   (./server-functions/default/handler.mjs etc.) that wrangler
//   resolves at deploy time. A wrapper file at the repo root
//   that imports worker.js makes esbuild re-resolve those
//   relative paths against the wrapper's location, which breaks
//   the build with "Could not resolve …/server-functions/…".
//   Patching worker.js in-place avoids that resolver shift.
//
// What it adds: a scheduled() handler on the default export.
// The handler dispatches by event.cron (the schedule string from
// wrangler.toml [triggers].crons) to a route + method + Bearer
// CRON_SECRET, invoking the existing fetch handler in-process.
//
// Idempotent — if the patch is already applied, it's a no-op.
// ============================================================

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/build/ → repo root is two parents up.
const WORKER_PATH = path.resolve(__dirname, "..", "..", ".open-next", "worker.js");

const PATCH_MARKER = "// __KARMANPREP_CRON_PATCH__";

const SCHEDULED_HANDLER = `
${PATCH_MARKER}
// Cron dispatch — added by scripts/patch-cf-worker.mjs.
// Maps wrangler.toml [triggers].crons schedule strings to routes
// and invokes the fetch handler above in-process (no network hop).
const __KARMAN_CRON_ROUTES = {
    "*/5 * * * *":  { path: "/api/cron/ingest-csv-inbox",      method: "POST" },
    "0 6 * * *":    { path: "/api/cron/sync-sat-dates",        method: "GET"  },
    "*/2 * * * *":  { path: "/api/cron/retry-failed-emails",   method: "POST" },
};

const __karmanScheduledHandler = async (event, env, ctx) => {
    const route = __KARMAN_CRON_ROUTES[event.cron];
    if (!route) {
        console.warn("[cron] no handler registered for schedule \\"" + event.cron + "\\"");
        return;
    }
    if (!env.CRON_SECRET) {
        console.error("[cron " + event.cron + "] CRON_SECRET not set; skipping " + route.path);
        return;
    }
    const host = (env.NEXT_PUBLIC_APP_URL || "https://karmanprep.com").replace(/\\/$/, "");
    const req = new Request(host + route.path, {
        method: route.method,
        headers: { Authorization: "Bearer " + env.CRON_SECRET },
    });
    ctx.waitUntil(
        Promise.resolve(__karmanDefaultExport.fetch(req, env, ctx))
            .then(async (res) => {
                const body = await res.text().catch(() => "");
                if (!res.ok) {
                    console.error("[cron " + event.cron + "] " + route.path + " -> " + res.status + ": " + body.slice(0, 500));
                } else {
                    console.log("[cron " + event.cron + "] " + route.path + " -> " + res.status);
                }
            })
            .catch((err) => {
                console.error("[cron " + event.cron + "] " + route.path + " threw: " + (err && err.message ? err.message : err));
            })
    );
};
`;

async function main() {
    let src;
    try {
        src = await readFile(WORKER_PATH, "utf-8");
    } catch (err) {
        console.error("[patch-cf-worker] cannot read " + WORKER_PATH + ": " + err.message);
        console.error("[patch-cf-worker] run `opennextjs-cloudflare build` first.");
        process.exit(1);
    }

    if (src.includes(PATCH_MARKER)) {
        console.log("[patch-cf-worker] already patched — no-op.");
        return;
    }

    // The file ends with:
    //     export default {
    //         async fetch(request, env, ctx) { ... },
    //     };
    //
    // We need to:
    //   1. Capture the default-export object so we can reference it
    //      from the scheduled handler (so `this` style isn't required).
    //   2. Re-export it WITH a scheduled handler attached.
    //
    // Strategy: replace `export default {` with `const __karmanDefaultExport = {`
    // and append a new `export default { ...__karmanDefaultExport, scheduled }`.
    const exportPattern = /export default \{/;
    if (!exportPattern.test(src)) {
        console.error("[patch-cf-worker] unexpected worker.js shape — no `export default {` found.");
        process.exit(1);
    }

    let patched = src.replace(exportPattern, "const __karmanDefaultExport = {");

    // Append: scheduled handler + final default export.
    patched += SCHEDULED_HANDLER;
    patched += "\nexport default { fetch: __karmanDefaultExport.fetch, scheduled: __karmanScheduledHandler };\n";

    await writeFile(WORKER_PATH, patched, "utf-8");
    console.log("[patch-cf-worker] injected scheduled handler into " + WORKER_PATH);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
