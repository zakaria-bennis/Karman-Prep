// ============================================================
// The studio render style (src/lib/figures/engine/studio, FigureView
// style="studio") over every golden figure:
//   - Bluebook stays byte-identical: building the studio layer never changes
//     the scene, and FigureView without a style, or with style="bluebook" and a
//     studio layer, renders exactly the stored golden snapshot;
//   - studio emits no typed color (hex, rgb(), hsl()), only theme roles;
//   - a bar's front face is Bluebook's bar, to the hundredth of a unit;
//   - every Bluebook label is still drawn, at the same place, with the same text;
//   - a studio table keeps every cell of the Bluebook table.
// ============================================================

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FigureView from "@/components/learn/figures/FigureView";
import TableView from "@/components/learn/figures/TableView";
import { choiceScenes } from "@/lib/figures/engine/choices";
import { buildScene, defaultBox } from "@/lib/figures/engine/index";
import type { Scene } from "@/lib/figures/engine/scene";
import { parseFigureSpec, type FigureSpec } from "@/lib/figures/engine/spec";
import { studioLayer } from "@/lib/figures/engine/studio";

const DIR = path.resolve(__dirname, "../../../fixtures/figures/golden");
const SNAPSHOTS = path.join(DIR, "__snapshots__");

type Golden = {
  figure_spec?: unknown;
  answer_choices?: { letter: string; choice_figure_spec: unknown }[];
};

const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".json") && f !== "originals.json")
  .sort();

function parsed(raw: unknown): FigureSpec {
  const result = parseFigureSpec(raw);
  if (!result.ok) throw new Error(result.errors.join("; "));
  return result.spec;
}

/** Every drawn figure of a golden file: its spec and Bluebook scene (one per choice for a choice set). */
function figures(golden: Golden): { spec: FigureSpec; scene: Scene }[] {
  if (golden.figure_spec != null) {
    const spec = parsed(golden.figure_spec);
    if (spec.type === "table") return [];
    return [{ spec, scene: buildScene(spec, defaultBox(spec)) }];
  }
  const specs = (golden.answer_choices ?? []).map((c) => parsed(c.choice_figure_spec));
  return choiceScenes(specs).map((scene, i) => {
    if (!scene) throw new Error("a choice was not drawn");
    return { spec: specs[i], scene };
  });
}

const svg = (props: Parameters<typeof FigureView>[0]) =>
  renderToStaticMarkup(createElement(FigureView, props));

const lines = (markup: string) => `${markup.replace(/></g, ">\n<")}\n`;

/** [attribute map, inner text] of every element named `tag` in the markup. */
function elements(markup: string, tag: string): { attrs: Record<string, string>; text: string }[] {
  const re = new RegExp(`<${tag}\\b([^>]*)>([^<]*)`, "g");
  return [...markup.matchAll(re)].map((m) => ({
    attrs: Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])),
    text: m[2],
  }));
}

const golden = (file: string) => JSON.parse(readFileSync(path.join(DIR, file), "utf8")) as Golden;

describe("studio render style", () => {
  for (const file of files) {
    const name = file.replace(/\.json$/, "");
    const g = golden(file);
    const drawn = figures(g);
    if (drawn.length === 0) continue;

    it(`${name}: Bluebook stays byte-identical`, () => {
      const parts = drawn.map(({ spec, scene }, i) => {
        const before = JSON.stringify(scene);
        const studio = studioLayer(spec, scene);
        expect(JSON.stringify(scene), "the studio pass never changes the scene").toBe(before);
        const plain = svg({ scene });
        expect(svg({ scene, style: "bluebook", studio })).toBe(plain);
        return g.answer_choices ? `<!-- choice ${g.answer_choices[i].letter} -->${plain}` : plain;
      });
      const snapshot = readFileSync(path.join(SNAPSHOTS, `${name}.svg`), "utf8");
      expect(lines(parts.join(""))).toBe(snapshot);
    });

    it(`${name}: studio uses theme roles only, keeps every label and bar`, () => {
      for (const { spec, scene } of drawn) {
        const studio = studioLayer(spec, scene);
        const markup = svg({ scene, style: "studio", studio });
        const bluebook = svg({ scene });
        expect(markup).toContain('data-figure-style="studio"');

        // No typed color anywhere: the markup and every color of the layer.
        expect(markup).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
        expect(markup).not.toMatch(/\b(rgba?|hsla?)\(/);
        const colors = JSON.stringify(studio);
        expect(colors).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?)\(/);
        for (const v of colors.matchAll(/var\((--[\w-]+)\)/g)) expect(v[1]).toMatch(/^--figure-/);

        // Every label: same text, same place, same anchor and slant.
        const key = (t: { attrs: Record<string, string>; text: string }) =>
          [t.text, t.attrs.x, t.attrs.y, t.attrs["text-anchor"], t.attrs["font-style"] ?? ""].join(
            "|"
          );
        const labels = elements(bluebook, "text").map(key).sort();
        expect(elements(markup, "text").map(key).sort()).toEqual(labels);

        // Every Bluebook rect (bars, columns, boxes, legend keys) is drawn at the same size and place.
        const rect = (r: { attrs: Record<string, string> }) =>
          ["x", "y", "width", "height", "data-part"].map((k) => r.attrs[k]).join("|");
        expect(elements(markup, "rect").map(rect)).toEqual(elements(bluebook, "rect").map(rect));

        // Every Bluebook path is still drawn, with its dashes and arrowheads.
        const path = (p: { attrs: Record<string, string> }) =>
          ["d", "stroke-dasharray", "marker-start", "marker-end"]
            .map((k) => (p.attrs[k] ?? "").replace(/figure-arrow-[\w-]+/, "arrow"))
            .join("|");
        const drawnPaths = elements(markup, "path")
          .filter((p) => p.attrs["data-studio"] === undefined)
          .map(path);
        for (const p of elements(bluebook, "path").map(path)) expect(drawnPaths).toContain(p);
      }
    });
  }

  it("a bar chart's front faces are exactly Bluebook's bars", () => {
    let bars = 0;
    for (const file of files.filter((f) => /^(bar|histogram)-/.test(f))) {
      for (const { spec, scene } of figures(golden(file))) {
        const series = new Set(spec.parts.filter((p) => p.kind === "series").map((p) => p.id));
        const markup = svg({ scene, style: "studio", studio: studioLayer(spec, scene) });
        const fronts = elements(markup, "rect").filter((r) => series.has(r.attrs["data-part"]));
        const expected = scene.items.filter(
          (it) => it.t === "rect" && it.partId !== undefined && series.has(it.partId)
        );
        expect(fronts).toHaveLength(expected.length);
        fronts.forEach((r, i) => {
          const it = expected[i];
          if (it.t !== "rect") throw new Error("not a bar");
          const round = (n: number) => Math.round(n * 100) / 100;
          expect(Number(r.attrs.height)).toBe(round(it.height));
          expect(Number(r.attrs.y)).toBe(round(it.y));
          expect(Number(r.attrs.y) + Number(r.attrs.height)).toBeCloseTo(it.y + it.height, 1);
          bars++;
        });
      }
    }
    expect(bars).toBeGreaterThan(10);
  });

  it("a studio table keeps every cell, and Bluebook tables are unchanged", () => {
    for (const file of files.filter((f) => f.startsWith("table-"))) {
      const spec = parsed(golden(file).figure_spec);
      const plain = renderToStaticMarkup(createElement(TableView, { spec }));
      const blue = renderToStaticMarkup(createElement(TableView, { spec, style: "bluebook" }));
      const studio = renderToStaticMarkup(createElement(TableView, { spec, style: "studio" }));
      expect(blue).toBe(plain);
      expect(lines(plain)).toBe(
        readFileSync(path.join(SNAPSHOTS, file.replace(/\.json$/, ".html")), "utf8")
      );
      expect(studio).toContain('data-figure-style="studio"');
      expect(studio.replace(' data-figure-style="studio"', "")).toBe(plain);
    }
  });
});
