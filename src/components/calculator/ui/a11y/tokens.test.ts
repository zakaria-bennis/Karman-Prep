// tokens.test.ts
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css = readFileSync("src/components/calculator/styles/tokens.css", "utf8");
const declarations = (block: string) =>
  Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
  );
const host = declarations(/^:host \{([^}]*)\}/m.exec(css)![1]);
const ZERO = {
  "--kc-dur-200": "0ms",
  "--kc-dur-250": "0ms",
  "--kc-dur-300": "0ms",
  "--kc-dur-400": "0ms",
  "--kc-dur-800": "0ms",
};

it("tokens.css declares the reference calculator's type, motion and geometry tokens on :host", () => {
  expect(host).toMatchObject({
    "--kc-font-ui": 'Arial, Arimo, "Liberation Sans", sans-serif',
    "--kc-font-math": '"Times New Roman", Tinos, "Liberation Serif", serif',
    "--kc-size-ui": "16px",
    "--kc-size-list": "17.6px",
    "--kc-size-math": "20.24px",
    "--kc-size-row-index": "10.4px",
    "--kc-list-width": "clamp(320px, calc(160px + 20%), 500px)",
    "--kc-toolbar-h": "48px",
    "--kc-gutter": "38px",
    "--kc-dur-hover": "0ms",
    "--kc-dur-200": "200ms",
    "--kc-dur-250": "250ms",
    "--kc-dur-300": "300ms",
    "--kc-ease": "ease",
    "--kc-ease-out": "ease-out",
  });
  expect(css).not.toMatch(/@font-face|url\(|cubic-bezier/);
});

it("tokens.css mixes every tone from a role, never a raw colour", () => {
  const tones = Object.entries(host).filter(([, v]) => /color-mix|var\(--kc-/.test(v));
  expect(tones.length).toBeGreaterThan(10);
  for (const [, value] of tones) expect(value).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
});

it("tokens.css sets every timed duration to 0ms under prefers-reduced-motion and data-reduced-motion", () => {
  const media = /@media \(prefers-reduced-motion: reduce\) \{\s*:host \{([^}]*)\}/.exec(css)![1];
  const attribute = /:host\(\[data-reduced-motion="true"\]\) \{([^}]*)\}/.exec(css)![1];
  expect(declarations(media)).toEqual(ZERO);
  expect(declarations(attribute)).toEqual(ZERO);
});
