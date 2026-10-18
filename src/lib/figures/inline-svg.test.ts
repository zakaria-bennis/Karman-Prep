// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { sanitizeThemedSvg } from "./inline-svg";
const svg = (body: string, attributes = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" ${attributes}>${body}</svg>`;
describe("inert themed exam SVG", () => {
  it("themes reviewed internal paints, preserves data and removes colliding source IDs", () => {
    const source = svg(
      '<rect width="200" height="100" fill="#070605"/><path d="M0 0L200 100" stroke="#f3ecdd"/><text id="label" x="20" y="30" fill="#b8b0a1">28°</text>',
      'data-figure-theme="karman-v1"'
    );
    const result = sanitizeThemedSvg(source, "Triangle <example>")!;
    expect(result).toContain("var(--figure-background, #070605)");
    expect(result).toContain("var(--figure-text, #f3ecdd)");
    expect(result).toContain("var(--figure-axis, #b8b0a1)");
    expect(result).toContain('d="M0 0L200 100"');
    expect(result).toContain("28°");
    expect(result).not.toContain('id="label"');
    expect(result).toContain('aria-label="Triangle &lt;example&gt;"');
  });
  it("does not infer recoloring for unreviewed SVGs", () =>
    expect(sanitizeThemedSvg(svg('<path fill="#070605" d="M0 0L20 10"/>'), "Unreviewed")).toContain(
      'fill="#070605"'
    ));
  it("keeps different reviewed data-series colors distinct", () => {
    const result = sanitizeThemedSvg(
      svg('<rect fill="#777568"/><rect fill="#c7c7c7"/>', 'data-figure-theme="karman-v1"'),
      "Two series"
    );
    expect(result).toContain("--figure-series-1");
    expect(result).toContain("--figure-series-2");
  });
  it.each([
    "<script>alert(1)</script>",
    "<foreignObject><div>HTML</div></foreignObject>",
    '<path onclick="alert(1)"/>',
    '<image href="https://example.com/a.png"/>',
    '<use href="#other"/>',
    '<path fill="url(https://example.com)"/>',
    '<path style="fill:red"/>',
    '<animate attributeName="href"/>',
  ])("rejects active or externally referenced markup %s", (body) =>
    expect(sanitizeThemedSvg(svg(body), "Diagram")).toBeNull()
  );
  it("rejects entities, malformed XML and missing scaling bounds", () => {
    expect(
      sanitizeThemedSvg('<!DOCTYPE svg [<!ENTITY x "hello">]>' + svg("<text>&x;</text>"), "Diagram")
    ).toBeNull();
    expect(sanitizeThemedSvg(svg("<path>"), "Diagram")).toBeNull();
    expect(sanitizeThemedSvg(svg("").replace('viewBox="0 0 200 100"', ""), "Diagram")).toBeNull();
  });
});

it("adapts CF's nested theme tokens while discarding its stylesheet and preserving approved opacity", () => {
  const source = svg(
    '<style>svg { --cf-fallback-grid:#d7be89 } @import url(https://invalid.example);</style><rect fill="var(--karman-figure-background,var(--cf-fallback-background))"/><path d="M0 0L100 100" stroke="var(--karman-figure-grid,var(--cf-fallback-grid))" stroke-opacity="var(--karman-figure-grid-opacity,0.30)"/><path fill="var(--karman-figure-shade,var(--cf-fallback-shade))"/>',
    'data-figure-theme="karman-v1"'
  );
  const result = sanitizeThemedSvg(source, "CF curve")!;
  expect(result).toContain("var(--figure-background, #070605)");
  expect(result).toContain("var(--figure-cf-grid, #d7be89)");
  expect(result).toContain("var(--figure-shade, #222018)");
  expect(result).toContain('stroke-opacity="0.30"');
  expect(result).not.toContain("<style");
  expect(result).not.toContain("@import");
  expect(result).not.toContain("https://invalid.example");
});
