// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { installDomStubs } from "../../../components/calculator-v2/__fixtures__/dom-stubs";
import { DEFAULT_SETTINGS } from "../core/api/types";
import { defaultViewport, type PixelSize } from "../plot/viewport";
import { CURVE_VARS, FILL_ALPHA_VARS, ROLE_VARS } from "../theme/roles";
import { SKIN_COLORS } from "../theme/skin-colors.generated";
import { createRecordingContext } from "./__fixtures__/recording-context";
import { pickGrid } from "./grid-plan";
import { GraphRenderer, readRenderTheme } from "./renderer";
import type { RenderFrame, RenderTheme } from "./types";

const p = SKIN_COLORS.ivory.normal;
const THEME: RenderTheme = {
  paper: p.roles.paper,
  text: p.roles.text,
  axis: p.roles.axis,
  gridMajor: p.roles.gridMajor,
  gridMinor: p.roles.gridMinor,
  focusRing: p.roles.focusRing,
  curves: p.curves,
  fillAlpha: p.fillAlpha,
  shadingCap: p.shadingCap,
};
const frame = (size: PixelSize, dpr: number): RenderFrame => ({
  view: { viewport: defaultViewport(size), size, dpr },
  grid: pickGrid(DEFAULT_SETTINGS),
  rows: [],
  theme: THEME,
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("G-5 GraphRenderer stacks four hidden canvases, skips frames it cannot draw and releases them", () => {
  const restore = installDomStubs();
  const container = document.createElement("div");
  document.body.append(container);
  try {
    const renderer = new GraphRenderer(container);
    const canvases = Array.from(container.querySelectorAll("canvas"));
    expect(canvases.map((c) => c.dataset.layer)).toEqual(["shading", "grid", "curves", "points"]);
    for (const canvas of canvases) {
      expect(canvas.getAttribute("aria-hidden")).toBe("true");
      expect(canvas.hasAttribute("tabindex")).toBe(false);
    }

    expect(() => renderer.render(frame({ width: 800, height: 600 }, 2))).not.toThrow();

    const { ctx, calls } = createRecordingContext();
    HTMLCanvasElement.prototype.getContext = (() =>
      ctx) as unknown as HTMLCanvasElement["getContext"];
    renderer.render(frame({ width: 0, height: 600 }, 1));
    expect(calls).toEqual([]);

    renderer.render(frame({ width: 800, height: 600 }, 2));
    expect(canvases.map((c) => [c.width, c.height])).toEqual(canvases.map(() => [1600, 1200]));
    expect(calls.some((c) => c.name === "setTransform" && c.args.join(",") === "2,0,0,2,0,0")).toBe(
      true
    );

    renderer.destroy();
    renderer.destroy();
    for (const canvas of canvases) {
      expect([canvas.width, canvas.height]).toEqual([0, 0]);
      expect(canvas.isConnected).toBe(false);
    }
  } finally {
    container.remove();
    restore();
  }
});

it("G-5 readRenderTheme reads every role from the host's computed custom properties", () => {
  const values: Record<string, string> = {
    [ROLE_VARS.paper]: " #fbf8f1",
    [ROLE_VARS.text]: "#222222",
    [ROLE_VARS.axis]: "#1d1d1f",
    [ROLE_VARS.gridMajor]: "#bdb5a6",
    [ROLE_VARS.gridMinor]: "#d9d3c7",
    [ROLE_VARS.focusRing]: "#0b57d0",
    [CURVE_VARS.c1]: "#1f5fbf",
    [FILL_ALPHA_VARS.c1]: "0.12",
  };
  vi.spyOn(window, "getComputedStyle").mockReturnValue({
    getPropertyValue: (name: string) => values[name] ?? "",
  } as CSSStyleDeclaration);
  const theme = readRenderTheme(document.createElement("div"));
  expect([
    theme.paper,
    theme.text,
    theme.axis,
    theme.gridMajor,
    theme.gridMinor,
    theme.focusRing,
    theme.curves.c1,
    theme.fillAlpha.c1,
  ]).toEqual(["#fbf8f1", "#222222", "#1d1d1f", "#bdb5a6", "#d9d3c7", "#0b57d0", "#1f5fbf", 0.12]);
});
