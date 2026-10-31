// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import FigureView from "@/components/learn/figures/FigureView";
import { HOUSE } from "@/lib/figures/engine/house";
import type { Scene } from "@/lib/figures/engine/scene";

function scene(overrides: Partial<Scene> = {}): Scene {
  return {
    width: 200,
    height: 100,
    description: "A line segment from left to right.",
    issues: [],
    items: [{ t: "path", d: "M10 50 L190 50", role: "ink", weight: "line" }],
    ...overrides,
  };
}

describe("FigureView", () => {
  it("renders paths with stroke var(--figure-ink)", () => {
    const { container } = render(<FigureView scene={scene()} />);
    const path = container.querySelector("svg > path");
    expect(path).not.toBeNull();
    expect(path?.getAttribute("stroke")).toBe("var(--figure-ink)");
    expect(path?.getAttribute("stroke-width")).toBe(String(HOUSE.line));
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 200 100");
  });

  it("arrows end adds a marker-end", () => {
    const { container } = render(
      <FigureView
        scene={scene({
          items: [{ t: "path", d: "M10 50 L190 50", role: "ink", weight: "line", arrows: "end" }],
        })}
      />
    );
    const path = container.querySelector("svg > path");
    expect(path?.getAttribute("marker-end")).toMatch(/^url\(#.+\)$/);
    expect(path?.getAttribute("marker-start")).toBeNull();
    const marker = container.querySelector("marker");
    expect(marker).not.toBeNull();
    expect(marker?.querySelector("path")?.getAttribute("fill")).toBe("context-stroke");
  });

  it("aria-label equals scene.description", () => {
    const { container } = render(<FigureView scene={scene()} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("A line segment from left to right.");
  });

  it("no hex color appears in the rendered markup", () => {
    const { container } = render(
      <FigureView
        scene={scene({
          items: [
            { t: "path", d: "M0 0 L10 10", role: "ink-muted", weight: "grid" },
            {
              t: "path",
              d: "M0 0 L10 0 L10 10 Z",
              role: "ink",
              weight: "dashed",
              fill: "fill-faint",
            },
            { t: "rect", x: 1, y: 2, width: 3, height: 4, role: "highlight", fill: "fill-shade" },
            { t: "text", x: 5, y: 5, text: "A", role: "ink", anchor: "middle" },
          ],
        })}
        title="Figure"
      />
    );
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).toContain("var(--figure-fill-shade)");
  });
});
