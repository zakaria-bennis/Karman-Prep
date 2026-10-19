// @vitest-environment jsdom
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import {
  assertShadowSafeCss,
  generateCalculatorStyles,
  styleSources,
} from "../../../../../scripts/build/calculator.mjs";
import { CALCULATOR_BUILD, CALCULATOR_CSS } from "../../styles/generated";
import { installStyles } from "./stylesheet";

const S = "src/components/calculator/styles";

/** The `font-family` values of the comment-free rules whose selector list holds `sel` or a descendant of it. */
function family(sel: string): string[] {
  const css = CALCULATOR_CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: string[] = [];
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const listed = selectors
      .split(",")
      .map((s) => s.trim().replace(/\s+/g, " "))
      .some((s) => s === sel || s.startsWith(`${sel} `));
    if (!listed) continue;
    for (const [, value] of body.matchAll(/(?:^|;)\s*font-family\s*:\s*([^;]+)/g))
      out.push(value.trim());
  }
  return out;
}

function shadows(n: number): ShadowRoot[] {
  return Array.from({ length: n }, () =>
    document.body.appendChild(document.createElement("div")).attachShadow({ mode: "open" })
  );
}

class FakeSheet {
  text = "";
  replaceSync(t: string) {
    this.text = t;
  }
}

let restoreAdopted: (() => void) | null = null;
function stubAdoptedStyleSheets() {
  const store = new WeakMap<ShadowRoot, unknown[]>();
  const proto = ShadowRoot.prototype as unknown as Record<string, unknown>;
  const had = Object.getOwnPropertyDescriptor(proto, "adoptedStyleSheets");
  Object.defineProperty(proto, "adoptedStyleSheets", {
    configurable: true,
    get(this: ShadowRoot) {
      return store.get(this) ?? [];
    },
    set(this: ShadowRoot, sheets: unknown[]) {
      store.set(this, [...sheets]);
    },
  });
  restoreAdopted = () => {
    if (had) Object.defineProperty(proto, "adoptedStyleSheets", had);
    else delete proto.adoptedStyleSheets;
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  restoreAdopted?.();
  restoreAdopted = null;
  document.body.innerHTML = "";
});

it("AR-36 generated.ts matches a fresh generation and is on the GENERATED list", async () => {
  expect((await generateCalculatorStyles({ write: false })).changed).toBe(false);
  expect(readFileSync("scripts/check-file-sizes.mjs", "utf8")).toContain(`"${S}/generated.ts"`);
});

it("AR-36 sources are MathQuill CSS, tokens, base, then the other styles/*.css sorted", async () => {
  const s = await styleSources(process.cwd());
  expect(s.slice(0, 3)).toEqual([
    "vendor/mathquill/mathquill.css",
    `${S}/tokens.css`,
    `${S}/base.css`,
  ]);
  expect(s.slice(3)).toEqual([...s.slice(3)].sort());
  expect(s).toContain(`${S}/graph.css`);
});

it("AR-36 shadow CSS rejects @font-face, url(), Tailwind and CSS-module syntax", () => {
  for (const css of [
    "@font-face{}",
    "a{b:url(x)}",
    "@tailwind a;",
    "a{@apply p}",
    ":global(a){}",
    "a{composes:b}",
  ])
    expect(() => assertShadowSafeCss("x.css", css)).toThrow(/^x\.css: .*\(AR-36\)$/);
  expect(CALCULATOR_CSS).not.toMatch(/@font-face|url\(|@tailwind|@apply|:global|composes:/i);
});

it("AR-36 CALCULATOR_BUILD is the first 16 hex of sha256(CSS + mathquill.js)", () => {
  const mq = readFileSync("vendor/mathquill/mathquill.js", "utf8");
  expect(CALCULATOR_BUILD).toBe(
    createHash("sha256")
      .update(CALCULATOR_CSS + mq)
      .digest("hex")
      .slice(0, 16)
  );
});

it("AR-36 one constructed sheet is shared across shadow roots; <style> is the fallback", () => {
  const [a] = shadows(1);
  installStyles(a, "p{}").setSkinCss(":host{}");
  expect([
    a.querySelector("style[data-kc-base]")!.textContent,
    a.querySelector("style[data-kc-skin]")!.textContent,
  ]).toEqual(["p{}", ":host{}"]);
  vi.stubGlobal("CSSStyleSheet", FakeSheet);
  stubAdoptedStyleSheets();
  const [c, d] = shadows(2);
  const styles = installStyles(c, "p{}");
  installStyles(d, "p{}");
  expect(c.adoptedStyleSheets[0]).toBe(d.adoptedStyleSheets[0]);
  expect(c.adoptedStyleSheets[1]).not.toBe(d.adoptedStyleSheets[1]);
  styles.dispose();
  expect(c.adoptedStyleSheets).toHaveLength(0);
});

it("AR-39 shadow CSS sets .mq-math-mode and its var in the --kc-font-math Times stack last, with no Symbola", () => {
  expect(family(".mq-math-mode").at(-1)).toBe("var(--kc-font-math)");
  expect(family(".mq-math-mode var").at(-1)).toBe("var(--kc-font-math)");
  expect(CALCULATOR_CSS).toMatch(
    /--kc-font-math: "Times New Roman", Tinos, "Liberation Serif", serif;/
  );
  // The vendored selector `.mq-nonSymbola` is a class name, not a font; no font value names Symbola.
  expect(CALCULATOR_CSS).not.toMatch(/font(?:-family)?\s*:[^;}]*Symbola/i);
});

it("AN-14 every CSS duration comes from --kc-duration-* and no cubic-bezier overshoots", () => {
  const decls = CALCULATOR_CSS.match(/(?:transition|animation)(?:-duration)?\s*:[^;}]+/g) ?? [];
  expect(
    decls
      .flatMap((d) => d.match(/(?<![\w.-])\d*\.?\d+m?s\b/g) ?? [])
      .filter((t) => t !== "0ms" && t !== "0s")
  ).toEqual([]);
  for (const [, args] of CALCULATOR_CSS.matchAll(/cubic-bezier\(([^)]*)\)/g)) {
    const [, y1, , y2] = args.split(",").map(Number);
    expect([y1, y2].every((y) => y >= 0 && y <= 1)).toBe(true);
  }
});

it("TH-14 base.css gives :focus-visible a 2px solid focus-ring outline at a 2px offset", () => {
  expect(CALCULATOR_CSS).toMatch(
    /^:focus-visible \{\s*outline: 2px solid var\(--kc-focus-ring\);\s*outline-offset: 2px;\s*\}/m
  ); // a top-level rule, not a graph or list rule
});
