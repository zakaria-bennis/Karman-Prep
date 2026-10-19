// tokens.test.ts
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css = readFileSync("src/components/calculator/styles/tokens.css", "utf8");
const declarations = (block: string) =>
  Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
  );
const ZERO = {
  "--kc-duration-instant": "0ms",
  "--kc-duration-fast": "0ms",
  "--kc-duration-normal": "0ms",
};

it("tokens.css declares the 01 section 9 motion, font and size tokens on :host", () => {
  expect(declarations(/^:host \{([^}]*)\}/m.exec(css)![1])).toEqual({
    "--kc-duration-instant": "100ms",
    "--kc-duration-fast": "200ms",
    "--kc-duration-normal": "400ms",
    "--kc-ease-standard": "cubic-bezier(0.22, 1, 0.36, 1)",
    "--kc-font-ui": "Arial, sans-serif",
    "--kc-font-math": 'KaTeX_Main, "Times New Roman", serif',
    "--kc-size-ui": "14px",
    "--kc-size-math": "18px",
    "--kc-size-axis": "13px",
  });
  expect(css).not.toMatch(/@font-face|url\(/);
});
it("tokens.css sets every duration to 0ms under prefers-reduced-motion and data-reduced-motion", () => {
  const media = /@media \(prefers-reduced-motion: reduce\) \{\s*:host \{([^}]*)\}/.exec(css)![1];
  const attribute = /:host\(\[data-reduced-motion="true"\]\) \{([^}]*)\}/.exec(css)![1];
  expect(declarations(media)).toEqual(ZERO);
  expect(declarations(attribute)).toEqual(ZERO);
});
