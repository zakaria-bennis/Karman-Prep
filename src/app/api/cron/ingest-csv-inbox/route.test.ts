import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("@/lib/observability/cron", () => ({
  withCronInstrumentation: (_name: string, handler: (request: Request) => Promise<Response>) =>
    handler,
}));

import { POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const request = (authorization?: string) =>
  new Request("https://example.test/api/cron/ingest-csv-inbox", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });

describe("retired legacy CSV question ingestion", () => {
  it("keeps the cron authentication boundary", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await POST(request())).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "local-secret");
    expect((await POST(request("Bearer wrong"))).status).toBe(401);
  });

  it("returns 410 without reading jobs, importing rows, or calling a provider", async () => {
    vi.stubEnv("CRON_SECRET", "local-secret");
    const fetch = vi.spyOn(globalThis, "fetch");
    const response = await POST(request("Bearer local-secret"));
    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("retired") });
    expect(fetch).not.toHaveBeenCalled();

    const route = readFileSync(resolve("src/app/api/cron/ingest-csv-inbox/route.ts"), "utf8");
    expect(route).not.toMatch(/bulkImportRows|createAdminClient|GetObjectCommand/);
    expect(route).not.toContain('.from("pdf_processing_jobs")');
  });

  it("removes only the obsolete scheduled job", () => {
    const worker = readFileSync(resolve("scripts/build/patch-cf-worker.mjs"), "utf8");
    const wrangler = readFileSync(resolve("wrangler.toml"), "utf8");
    expect(worker).not.toContain('"*/5 * * * *"');
    expect(wrangler).not.toContain('"*/5 * * * *"');
    for (const active of ["0 6 * * *", "*/2 * * * *", "0 14 * * *"]) {
      expect(worker).toContain(active);
      expect(wrangler).toContain(active);
    }
  });
});
