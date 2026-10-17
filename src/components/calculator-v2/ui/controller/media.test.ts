// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { installDomStubs } from "../../__fixtures__/dom-stubs";
import { fakeMedia } from "./__fixtures__/fake-media";
import { COARSE_POINTER_QUERY, watchMediaQuery, watchPointer } from "./media";

/** The .ts and .tsx files under `dirs`, leaving out test files and every `__fixtures__` path. */
function sourceFiles(dirs: string[]): string[] {
  return dirs
    .flatMap((dir) =>
      readdirSync(dir, { recursive: true, encoding: "utf8" }).map((file) => join(dir, file))
    )
    .filter(
      (file) =>
        /\.tsx?$/.test(file) &&
        !/\.test\.tsx?$/.test(file) &&
        !file.split(sep).includes("__fixtures__")
    );
}

let restore: () => void;
beforeEach(() => {
  restore = installDomStubs();
});
afterEach(() => restore());

it("AR-38 watchMediaQuery follows prefers-reduced-motion live and removes its listener", () => {
  const q = "(prefers-reduced-motion: reduce)";
  const media = fakeMedia({ [q]: true });
  const seen: boolean[] = [];
  const w = watchMediaQuery(media, q, (m) => seen.push(m));
  media.set(q, false);
  w.dispose();
  expect([w.initial, seen, media.listeners()]).toEqual([true, [false], 0]);
});

it("AR-38 no calculator-v2 module imports framer-motion or motion", () => {
  const motion = /from\s+["'](framer-motion|motion)(\/[^"']*)?["']/;
  expect(
    sourceFiles(["src/components/calculator-v2", "src/lib/calculator-v2"]).filter((f) =>
      motion.test(readFileSync(f, "utf8"))
    )
  ).toEqual([]);
});

it("K-2 watchPointer is coarse for (any-pointer: coarse) and after a touch or pen pointerdown", () => {
  const t = document.createElement("div");
  const seen: string[] = [];
  expect(watchPointer(fakeMedia({ [COARSE_POINTER_QUERY]: true }), t, () => {}).initial).toBe(
    "coarse"
  );
  expect(watchPointer(fakeMedia(), t, (p) => seen.push(p)).initial).toBe("fine");
  for (const pointerType of ["mouse", "pen"])
    t.dispatchEvent(Object.assign(new Event("pointerdown"), { pointerType }));
  expect(seen).toEqual(["coarse"]);
});
