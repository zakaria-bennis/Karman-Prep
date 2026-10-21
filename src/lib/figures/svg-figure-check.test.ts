// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { sanitizeThemedSvg } from "./inline-svg";
import { svgFigureProblems } from "./svg-figure-check";

const SERIF = "STIX Two Text, Times New Roman, serif";
const svg = (body: string, root = 'viewBox="0 0 200 120"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" data-figure-theme="karman-v1" ${root}>${body}</svg>`;
const GOOD = svg(
  `<g><rect x="10" y="10" width="80" height="60" fill="none" stroke="#f3ecdd"/>` +
    `<path d="M10 70L90 10" stroke="var(--figure-math, #2fa8ff)" stroke-width="2"/>` +
    `<text x="20" y="100" font-family="${SERIF}" font-size="14" fill="#f3ecdd">x &lt; 3 &#8804; y</text></g>`
);

describe("hand-drawn figure SVG check (importer)", () => {
  it("accepts a themed drawing in the inert subset, which the quiz sanitizer also inlines", () => {
    expect(svgFigureProblems(GOOD)).toEqual([]);
    expect(sanitizeThemedSvg(GOOD, "A made-up figure")).toContain("<rect");
  });

  it.each([
    ["script", svg("<script>alert(1)</script>"), "<script>"],
    ["style", svg("<style>rect{fill:red}</style>"), "<style>"],
    ["foreignObject", svg("<foreignObject><div/></foreignObject>"), "<foreignObject>"],
    ["image", svg('<image href="https://x.test/a.png"/>'), "<image>"],
    ["use", svg('<use href="#a"/>'), "<use>"],
    ["event handler", svg('<rect onload="alert(1)"/>'), "attribute onload"],
    ["external href", svg('<path href="https://x.test" d="M0 0"/>'), "attribute href"],
    ["xlink", svg('<path xlink:href="#a" d="M0 0"/>'), "namespaced attribute"],
    ["url paint", svg('<rect fill="url(#g)"/>'), "URL or markup"],
    ["data URL", svg('<path d="data:x"/>'), "URL or markup"],
    ["encoded javascript", svg('<path d="&#x6a;avascript:x"/>'), "URL or markup"],
    ["named colour", svg('<rect fill="red"/>'), "not a plain colour"],
    ["sans text", svg('<text font-family="Arial">a</text>'), "STIX Two Text"],
    ["no theme", GOOD.replace(' data-figure-theme="karman-v1"', ""), "data-figure-theme"],
    ["no viewBox", svg("<rect/>", ""), "viewBox"],
    ["zero viewBox", svg("<rect/>", 'viewBox="0 0 0 10"'), "viewBox"],
    ["wrong namespace", GOOD.replace("http://www.w3.org/2000/svg", "http://x.test/ns"), "xmlns"],
    ["bare ampersand", svg(`<text font-family="${SERIF}">a & b</text>`), "bare &"],
  ])("refuses %s", (_, source, problem) => {
    expect(svgFigureProblems(source).join(" | ")).toContain(problem);
  });

  it.each([
    ["DOCTYPE", '<!DOCTYPE svg [<!ENTITY x "y">]>' + GOOD],
    ["comment", svg("<!-- hidden --><rect/>")],
    ["CDATA", svg("<text><![CDATA[x]]></text>")],
    ["processing instruction", svg('<?xml-stylesheet href="a.css"?><rect/>')],
    ["unclosed tag", GOOD.replace("</svg>", "")],
    ["mismatched tag", svg("<g><rect></g></rect>")],
    ["two roots", GOOD + GOOD],
    ["text outside the root", GOOD + "trailing"],
    ["non-svg root", '<svgx xmlns="http://www.w3.org/2000/svg"/>'],
    ["not markup", "a triangle"],
    ["not a string", 42],
  ])("refuses %s as a whole", (_, source) => {
    expect(svgFigureProblems(source)).toHaveLength(1);
  });

  it("caps size and element count", () => {
    expect(svgFigureProblems(svg(" ".repeat(400_001)))[0]).toMatch(/over 400,000/);
    expect(svgFigureProblems(svg('<rect x="1"/>'.repeat(8000)))[0]).toMatch(/more than 8000/);
  });
});
