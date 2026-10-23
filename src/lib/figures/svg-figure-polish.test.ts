// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { sanitizeThemedSvg } from "./inline-svg";
import { LABEL_SCALE, fitViewBoxToContent, isDotPlotSvg } from "./svg-figure-polish";

const FONT = 'font-family="STIX Two Text, Times New Roman, serif"';
const reviewed = (body: string, box = "0 0 200 100") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" data-figure-theme="karman-v1">${body}</svg>`;
const parse = (svg: string | null) =>
  new DOMParser().parseFromString(svg!, "image/svg+xml").documentElement;

describe("polishFigureSvg — bars and gridlines", () => {
  it("backs a see-through bar so gridlines never show through it", () => {
    const root = parse(
      sanitizeThemedSvg(
        reviewed(
          '<line x1="0" y1="50" x2="200" y2="50" stroke="#3b3426"/>' +
            '<rect x="20" y="20" width="40" height="80" fill="#2fa8ff" fill-opacity="0.32" stroke="#2fa8ff"/>'
        ),
        "bars"
      )
    );
    const rects = [...root.querySelectorAll("rect")];
    expect(rects).toHaveLength(2);
    expect(rects[0].hasAttribute("data-figure-backing")).toBe(true);
    expect(rects[0].getAttribute("fill")).toContain("--figure-background");
    expect(rects[0].hasAttribute("fill-opacity")).toBe(false);
    expect(rects[1].getAttribute("fill-opacity")).toBe("0.32");
    // Gridline, then backing, then the bar.
    expect([...root.children].map((c) => c.localName)).toEqual(["line", "rect", "rect"]);
  });
  it("moves gridlines drawn after the bars to the back", () => {
    const root = parse(
      sanitizeThemedSvg(
        reviewed(
          '<rect x="20" y="20" width="40" height="80" fill="#2fa8ff"/>' +
            '<line x1="0" y1="50" x2="200" y2="50" stroke="#3b3426"/>' +
            '<line x1="0" y1="99" x2="200" y2="99" stroke="#b8b0a1"/>'
        ),
        "bars"
      )
    );
    const kinds = [...root.children].map((c) => `${c.localName}:${c.getAttribute("stroke") ?? ""}`);
    expect(kinds[0]).toContain("line:var(--figure-grid");
    expect(kinds[1]).toContain("rect");
    expect(kinds[2]).toContain("line:var(--figure-axis");
  });
});

describe("polishFigureSvg — geometry labels", () => {
  const svg = reviewed(
    `<text x="100" y="50" ${FONT} font-style="italic" font-size="30" text-anchor="middle">v</text>` +
      `<text x="115" y="40" ${FONT} font-size="20" text-anchor="middle">°</text>` +
      `<text x="20" y="90" ${FONT} font-size="17" text-anchor="middle">720</text>`
  );
  it("joins a lone degree sign onto its label so it cannot sit on a line", () => {
    const root = parse(sanitizeThemedSvg(svg, "angles"));
    const texts = [...root.querySelectorAll("text")];
    expect(texts.map((t) => t.textContent)).toEqual(["v°", "720"]);
    // The letter keeps its place: the centred label shifts by half the sign's width.
    expect(Number(texts[0].getAttribute("x"))).toBeCloseTo(106);
  });
  it("prints single-letter labels slightly smaller and leaves numbers alone", () => {
    const root = parse(sanitizeThemedSvg(svg, "angles"));
    const [label, tick] = [...root.querySelectorAll("text")];
    expect(Number(label.getAttribute("font-size"))).toBeCloseTo(30 * LABEL_SCALE);
    expect(tick.getAttribute("font-size")).toBe("17");
  });
  it("always keeps the drawing's proportions", () => {
    const root = parse(sanitizeThemedSvg(svg, "angles"));
    expect(root.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
  });
  it("leaves unreviewed SVGs exactly as drawn", () => {
    const raw = svg.replace(' data-figure-theme="karman-v1"', "");
    const root = parse(sanitizeThemedSvg(raw, "angles"));
    expect([...root.querySelectorAll("text")].map((t) => t.textContent)).toEqual(["v", "°", "720"]);
  });
});

describe("fitViewBoxToContent", () => {
  const svgWith = (bbox: { x: number; y: number; width: number; height: number }) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 640 150");
    (svg as unknown as { getBBox: () => typeof bbox }).getBBox = () => bbox;
    return svg;
  };
  it("grows the box to take in a label drawn past its bottom edge", () => {
    const svg = svgWith({ x: 30, y: 40, width: 600, height: 116 });
    fitViewBoxToContent(svg);
    expect(svg.getAttribute("viewBox")).toBe("0 0 640 160");
    fitViewBoxToContent(svg); // idempotent
    expect(svg.getAttribute("viewBox")).toBe("0 0 640 160");
  });
  it("never shrinks a box whose drawing fits", () => {
    const svg = svgWith({ x: 30, y: 40, width: 500, height: 80 });
    fitViewBoxToContent(svg);
    expect(svg.getAttribute("viewBox")).toBe("0 0 640 150");
  });
});

describe("dot plots sit on the bottom of their box", () => {
  const dot = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="5.5" fill="#f3ecdd"/>`;
  const tick = (x: number) => `<line x1="${x}" y1="91" x2="${x}" y2="101" stroke="#b8b0a1"/>`;
  const dotPlot =
    '<line x1="40" y1="96" x2="620" y2="96" stroke="#b8b0a1"/>' +
    [70, 205, 250].map(tick).join("") +
    [dot(70, 82), dot(70, 66), dot(205, 82), dot(205, 66), dot(205, 50), dot(250, 82)].join("") +
    `<text x="320" y="146" ${FONT} font-size="18">Orbital period (days)</text>`;

  it("recognises a dot plot, but not a scatterplot with a vertical axis", () => {
    expect(isDotPlotSvg(parse(reviewed(dotPlot, "0 0 640 150")))).toBe(true);
    const scatter = dotPlot + '<line x1="40" y1="0" x2="40" y2="96" stroke="#b8b0a1"/>';
    expect(isDotPlotSvg(parse(reviewed(scatter, "0 0 640 150")))).toBe(false);
    const loose = [dot(70, 82), dot(205, 66), dot(250, 50)].join("");
    expect(isDotPlotSvg(parse(reviewed(loose + '<line x1="40" y1="96" x2="620" y2="96"/>')))).toBe(
      false
    );
  });

  it("anchors a dot plot to the bottom of the frame and keeps other figures centred", () => {
    const plot = parse(sanitizeThemedSvg(reviewed(dotPlot, "0 0 640 150"), "dot plot"));
    expect(plot.getAttribute("preserveAspectRatio")).toBe("xMidYMax meet");
    const bars = parse(
      sanitizeThemedSvg(
        reviewed('<rect x="20" y="20" width="40" height="80" fill="#2fa8ff"/>'),
        "b"
      )
    );
    expect(bars.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
  });

  it("fits a dot plot's box tightly to what is drawn, with no empty band", () => {
    const svg = parse(reviewed(dotPlot, "0 0 640 150")) as unknown as SVGSVGElement;
    (svg as unknown as { getBBox: () => object }).getBBox = () => ({
      x: 40,
      y: 44.5,
      width: 582,
      height: 110,
    });
    fitViewBoxToContent(svg);
    expect(svg.getAttribute("viewBox")).toBe("36 40.5 590 118");
    fitViewBoxToContent(svg); // idempotent
    expect(svg.getAttribute("viewBox")).toBe("36 40.5 590 118");
  });
});
