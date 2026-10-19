import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";
import { expect, it } from "vitest";
import {
  EAGER_ROUTES,
  checkBundle,
  formatBaseline,
  type BundleBaseline,
} from "../../../scripts/build/check-calculator-v2-bundle.mjs";
import {
  TURBOPACK_FORMAT_NEXT,
  assertPinnedNext,
  eagerFiles,
  parseAsyncChunkGroups,
  parseWorkerCall,
  workerUrl,
} from "../../../scripts/build/turbopack-output.mjs";

const read = (name: string) =>
  readFileSync(`scripts/build/__fixtures__/turbopack-16.3.8/${name}`, "utf8");
const expected = JSON.parse(read("expected.json"));

it("AR-66 the output format is pinned to Next 16.3.8 and another version fails loudly", () => {
  expect(TURBOPACK_FORMAT_NEXT).toBe("16.3.8");
  expect(JSON.parse(readFileSync("node_modules/next/package.json", "utf8")).version).toBe("16.3.8");
  expect(() => assertPinnedNext("16.3.8")).not.toThrow();
  expect(() => assertPinnedNext("16.4.0")).toThrow(
    "Turbopack output format is pinned to Next 16.3.8; installed 16.4.0: re-capture scripts/build/__fixtures__/turbopack-16.4.0/ and update turbopack-output.mjs"
  );
});

it("AR-32 parseAsyncChunkGroups returns the recorded chunk list of the quiz-host import", () => {
  expect(parseAsyncChunkGroups(read("async-import.txt"))).toEqual(expected.asyncChunkGroups);
  expect(parseAsyncChunkGroups("console.log(1)")).toEqual([]);
});

it("AR-66 parseWorkerCall returns the recorded bootstrap and chunks", () => {
  expect(parseWorkerCall(read("worker-call.txt"))).toEqual(expected.workerCall);
  expect(expected.workerCall.bootstrap).toMatch(/^static\/chunks\/turbopack-worker-[\w-]+\.js$/);
  expect(parseWorkerCall("new Worker(url)")).toBeNull();
});

it("AR-66 workerUrl appends the chunk list after #params= as the runtime helper encodes it", () => {
  expect(workerUrl("http://localhost:8787", expected.workerCall)).toBe(expected.workerUrl);
  expect(expected.workerUrl).toMatch(
    /^http:\/\/localhost:8787\/_next\/static\/chunks\/turbopack-worker-.+#params=/
  );
});

it("AR-32 eagerFiles lists the route's entry JS and CSS and none of the lazy group", () => {
  const eager = eagerFiles(read("page_client-reference-manifest.js"), "/turbopack-probe/page");
  expect(eager).toEqual(expected.eagerFiles);
  expect(eager).toContain(expected.probeChunk);
  for (const file of expected.asyncChunkGroups.flat()) expect(eager).not.toContain(file);
});

const routes = (n: number) => Object.fromEntries(EAGER_ROUTES.map((r) => [r, n]));
const noise = (bytes: number) => randomBytes(bytes).toString("base64");
const asset = (file: string) => `.open-next/assets/_next/${file}`;
const gz = (root: string, file: string) =>
  gzipSync(readFileSync(join(root, asset(file))), { level: 9 }).length;
const manifestOf = (root: string, route: string) =>
  readFileSync(
    join(
      root,
      `.open-next/server-functions/default/.next/server/app${route}_client-reference-manifest.js`
    ),
    "utf8"
  );

/** A temp dir holding the recorded Turbopack 16.3.8 output shapes as an OpenNext build. */
function syntheticBuild(edit?: (files: Map<string, string>) => void): string {
  const files = new Map<string, string>();
  const manifest = read("page_client-reference-manifest.js");
  for (const route of EAGER_ROUTES) {
    files.set(
      `.open-next/server-functions/default/.next/server/app${route}_client-reference-manifest.js`,
      manifest.replaceAll("/turbopack-probe/page", route)
    );
  }
  for (const file of expected.eagerFiles as string[]) {
    files.set(asset(file), file === expected.probeChunk ? read("async-import.txt") : "/* eager */");
  }
  const group: string[] = expected.asyncChunkGroups[0];
  for (const file of group) files.set(asset(file), "/* lazy */");
  files.set(
    asset(group[0]),
    `${files.get(asset(group[0]))}${read("worker-call.txt")}karman-calculator-v2:lazy-chunk`
  );
  files.set(asset(group.at(-1)!), `${files.get(asset(group.at(-1)!))}mq-root-block`);
  files.set(asset(expected.workerCall.bootstrap), "/* bootstrap */");
  const chunks: string[] = expected.workerCall.chunks;
  for (const file of chunks) files.set(asset(file), files.get(asset(file)) ?? "/* chunk */");
  files.set(asset(chunks.at(-1)!), `${files.get(asset(chunks.at(-1)!))}karman-compute-v1`);
  files.set(asset("static/media/compute.worker.0.ts"), "karman-compute-v1");
  edit?.(files);
  const root = mkdtempSync(join(tmpdir(), "calculator-v2-bundle-"));
  for (const [path, text] of files) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const lax = (root: string): BundleBaseline => ({
  next: "16.3.8",
  base: {
    commit: "08c8c76",
    eagerGzipBytes: Object.fromEntries(
      EAGER_ROUTES.map((r) => [
        r,
        eagerFiles(manifestOf(root, r), r).reduce((n, f) => n + gz(root, f), 0),
      ])
    ),
  },
  eagerAddedGzipBytes: routes(1e9),
  lazyGzipBytes: 1e9,
  workerGzipBytes: 1e9,
  standaloneGzipBytes: null,
  perf: null,
});
const problems = async (root: string, baseline = lax(root)) =>
  (await checkBundle({ root, baseline })).problems;
const eagerJs = () => expected.eagerFiles.find((f: string) => f.endsWith(".js"));

it("AR-32 a clean build passes, adds nothing eagerly and the lazy group is found by its sentinel", async () => {
  const root = syntheticBuild();
  const report = await checkBundle({ root, baseline: lax(root) });
  expect(report.problems).toEqual([]);
  expect(report.worker).toEqual(expected.workerCall);
  expect(report.measured.eagerAddedGzipBytes).toEqual(routes(0));
});

it("AR-32 the positive control fails when no lazy group holds the sentinel and mq-root-block", async () => {
  const root = syntheticBuild((f) => {
    for (const [k, v] of f) f.set(k, v.replaceAll("karman-calculator-v2:lazy-chunk", ""));
  });
  expect(await problems(root)).toContain(
    "AR-32 positive control: no lazy chunk group contains karman-calculator-v2:lazy-chunk and mq-root-block"
  );
});

it("AR-32 the sentinel or mq-root-block in the server handler or an eager file fails", async () => {
  const root = syntheticBuild((f) => {
    f.set(".open-next/server-functions/default/handler.mjs", "karman-calculator-v2:lazy-chunk");
    f.set(asset(eagerJs()), `${f.get(asset(eagerJs()))}mq-root-block`);
  });
  const found = await problems(root);
  expect(found).toContain(
    "AR-32 karman-calculator-v2:lazy-chunk found in .open-next/server-functions/default/handler.mjs"
  );
  expect(found).toContain(
    `AR-32 mq-root-block found in eager file ${eagerJs()} of /diagnostic/page`
  );
});

it("AR-33 each gzip budget fails above its limit", async () => {
  const [lazy, chunk] = [expected.asyncChunkGroups[0][0], expected.workerCall.chunks[0]];
  const root = syntheticBuild((f) => {
    f.set(asset(eagerJs()), f.get(asset(eagerJs())) + noise(12_000));
    f.set(asset(lazy), f.get(asset(lazy)) + noise(420_000));
    f.set(asset(chunk), noise(270_000));
  });
  const text = (await problems(root, lax(syntheticBuild()))).join("\n");
  expect(text).toMatch(/^AR-33 \/diagnostic\/page: \d+ gzip bytes added eagerly, budget 10240$/m);
  expect(text).toMatch(/^AR-33 lazy chunk group: \d+ gzip bytes, budget 409600$/m);
  expect(text).toMatch(/^AR-33 worker: \d+ gzip bytes, budget 256000$/m);
});

it("AR-33 growth over 10% fails until the baseline is updated, from a committed 0 and from a negative eager delta too", async () => {
  const lazy = expected.asyncChunkGroups[0][0];
  const root = syntheticBuild((f) => f.set(asset(lazy), f.get(asset(lazy)) + noise(4_000)));
  const measured = (await checkBundle({ root, baseline: lax(root) })).measured;
  const text = async (patch: Partial<BundleBaseline>) =>
    (await problems(root, { ...lax(root), ...measured, ...patch })).join("\n");
  expect(await text({ lazyGzipBytes: Math.floor(measured.lazyGzipBytes / 1.2) })).toMatch(
    /^AR-33 lazyGzipBytes grew to \d+ from \d+ \(over 10%\); update docs\/calculator-v2-bundle-baseline\.json in this PR with --update-baseline$/m
  );
  expect(await text({})).toBe("");
  expect(await text({ workerGzipBytes: 0 })).toMatch(
    /^AR-33 workerGzipBytes grew to \d+ from 0 \(over 10%\)/m
  );
  expect(
    await text({
      eagerAddedGzipBytes: { ...measured.eagerAddedGzipBytes, "/diagnostic/page": -100 },
    })
  ).toContain("AR-33 eagerAddedGzipBytes[/diagnostic/page] grew to 0 from -100 (over 10%)");
});

it("AR-66 a missing bootstrap or a missing worker marker fails and static/media .ts copies are ignored", async () => {
  expect(
    await problems(syntheticBuild((f) => f.delete(asset(expected.workerCall.bootstrap))))
  ).toContain(`AR-66 worker file ${expected.workerCall.bootstrap} missing`);
  expect(
    await problems(
      syntheticBuild((f) => f.set(asset(expected.workerCall.chunks.at(-1)), "/* chunk */"))
    )
  ).toContain("AR-66 no worker chunk contains karman-compute-v1");
});

it("AR-33 the committed baseline is script-formatted, pinned to Next 16.3.8 and covers every eager route", async () => {
  const text = readFileSync("docs/calculator-v2-bundle-baseline.json", "utf8");
  const baseline = JSON.parse(text);
  const sorted = [...EAGER_ROUTES].sort();
  expect([baseline.next, baseline.base.commit]).toEqual(["16.3.8", "08c8c76"]);
  expect(Object.keys(baseline.base.eagerGzipBytes).sort()).toEqual(sorted);
  expect(Object.keys(baseline.eagerAddedGzipBytes).sort()).toEqual(sorted);
  expect(await formatBaseline(baseline)).toBe(text);
});

it("AR-66 release.sh is the only deploy path, runs the checks between cf:build:release and cf:deploy and reads the secret list without a pipe", () => {
  const script = readFileSync("scripts/calculator-v2/release.sh", "utf8");
  const at = [
    "set -euo pipefail",
    "npm run cf:build:release",
    "node scripts/build/check-calculator-v2-bundle.mjs",
    "npx playwright test --config=playwright.cf-preview.config.ts",
    "npm run cf:deploy",
    "npx wrangler secret list",
  ].map((s) => script.indexOf(s));
  expect(at.every((p, i) => p >= 0 && (i === 0 || p > at[i - 1]))).toBe(true);
  expect(statSync("scripts/calculator-v2/release.sh").mode & 0o111).not.toBe(0);
  expect(script).toContain(`grep -q '"CALCULATOR_V2_ROLLOUT"' <<<"$secrets"`);
  expect(script).not.toMatch(/secret list\s*\|/);
  expect(
    execSync("git grep -l -e cf:deploy -- scripts .github", { encoding: "utf8" }).trim().split("\n")
  ).toEqual(["scripts/calculator-v2/release.sh"]);
});

it("AR-66 CI runs for pull requests to the release branch and checks the bundle after cf:build", () => {
  const ci = readFileSync(".github/workflows/ci.yml", "utf8");
  expect(ci).toContain("branches: [main, zakaria/calculator-regression-release]");
  expect(ci.indexOf("node scripts/build/check-calculator-v2-bundle.mjs")).toBeGreaterThan(
    ci.indexOf("npm run cf:build")
  );
});
