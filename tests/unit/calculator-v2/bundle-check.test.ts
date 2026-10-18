import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
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
