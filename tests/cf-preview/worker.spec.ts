import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("AR-66 the built Turbopack worker starts on the cf:preview origin and plots y=x^2", async ({
  page,
}) => {
  // Imported dynamically: Playwright compiles a static import of an .mjs file to CommonJS, which
  // Node then rejects in ES module scope ("exports is not defined").
  const { checkBundle } = await import("../../scripts/build/check-calculator-bundle.mjs");
  const { workerUrl } = await import("../../scripts/build/turbopack-output.mjs");
  const report = await checkBundle({
    root: process.cwd(),
    baseline: JSON.parse(readFileSync("docs/calculator-bundle-baseline.json", "utf8")),
  });
  expect(report.problems).toEqual([]);
  expect(report.worker).not.toBeNull();
  await page.goto("/");
  await page.waitForLoadState("load");
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  const result = await page.evaluate(
    (url) =>
      new Promise<{ ready: unknown; kind: string; floats: number }>((resolve, reject) => {
        const worker = new Worker(url, { name: "karman-calculator" });
        const seen: unknown[] = [];
        const timer = setTimeout(() => reject(new Error("no plot")), 15_000);
        worker.onerror = (e) => reject(new Error(e.message));
        worker.onmessage = ({ data }) => {
          seen.push(data);
          if (data.type === "ready") {
            worker.postMessage({
              v: 1,
              type: "state",
              generation: 1,
              rows: [
                {
                  id: "1",
                  type: "expression",
                  latex: "y=x^{2}",
                  columns: null,
                  hidden: false,
                  sliderBounds: null,
                },
              ],
              settings: { angleMode: "radians", complex: false },
              sliders: {},
            });
            worker.postMessage({
              v: 1,
              type: "view",
              generation: 2,
              viewport: { left: -10, right: 10, bottom: -7.5, top: 7.5 },
              size: { width: 800, height: 600 },
              dpr: 1,
            });
          }
          // an earlier plot at the state's generation 1 is ignored
          if (data.type === "plot" && data.generation === 2) {
            clearTimeout(timer);
            worker.terminate();
            resolve({
              ready: seen[0],
              kind: data.geometry.kind,
              floats: data.geometry.polylines.length,
            });
          }
        };
        worker.postMessage({ v: 1, type: "hello", seed: 1 });
      }),
    workerUrl(new URL(page.url()).origin, report.worker!)
  );
  expect(result).toMatchObject({
    ready: { v: 1, type: "ready", worker: "karman-compute" },
    kind: "curve",
  });
  expect(result.floats).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
