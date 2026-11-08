// ============================================================
// Golden figures (figure engine spec §3 "Testing").
//
// Each tests/fixtures/figures/golden/*.json is a figure.json-shaped file: a
// `figure_spec` (one FigureSpec, or a list for a question with several
// figures), or `answer_choices` with a `choice_figure_spec` each, all
// stored already sampled (sampleSpec). For every one this test:
//   - renders it as students see it (FigureView for drawn figures, the four
//     choices in one shared frame or scale, TableView for tables) to static
//     markup and compares it with the stored snapshot in __snapshots__/;
//   - checks the markup carries no typed color (hex, rgb() or hsl());
//   - checks the engine reports no issue for it (the scene's own issues plus
//     every checkSpec check except the transcription comparison, since a
//     golden figure has no original to compare with).
//
// A missing or changed snapshot fails. To accept new snapshots after looking
// at every changed figure (render them with scripts/figures/render-all.ts):
//   GOLDEN_UPDATE=1 npx vitest run tests/unit/figures/engine/golden.test.ts
// ============================================================

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FigureView from "@/components/learn/figures/FigureView";
import TableView from "@/components/learn/figures/TableView";
import { checkSpecs } from "@/lib/figures/engine/checks";
import {
  CHOICE_BOX,
  choiceFrameIssues,
  choiceScenes,
  isFramed,
  sharedFrame,
} from "@/lib/figures/engine/choices";
import { buildScene, defaultBox, type Box } from "@/lib/figures/engine/index";
import type { Scene, SceneIssue } from "@/lib/figures/engine/scene";
import { parseFigureSpecs, type FigureSpec } from "@/lib/figures/engine/spec";

const DIR = path.resolve(__dirname, "../../../fixtures/figures/golden");
const SNAPSHOTS = path.join(DIR, "__snapshots__");
const UPDATE = process.env.GOLDEN_UPDATE === "1";

type Golden = {
  source: string;
  figure_spec?: unknown;
  answer_choices?: { letter: string; choice_figure_spec: unknown }[];
};

const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

function parsed(raw: unknown, where: string): FigureSpec[] {
  const result = parseFigureSpecs(raw);
  if (!result.ok) throw new Error(`${where}: ${result.errors.join("; ")}`);
  return result.specs;
}

/** Every spec a golden file holds: its figures, or every figure of every choice. */
function specsOf(golden: Golden): FigureSpec[] {
  const raws =
    golden.figure_spec != null
      ? [golden.figure_spec]
      : (golden.answer_choices ?? []).map((c) => c.choice_figure_spec);
  return raws.flatMap((raw) => parsed(raw, golden.source));
}

/** One element per line, so a snapshot diff points at the item that moved. */
const lines = (markup: string) => `${markup.replace(/></g, ">\n<")}\n`;

const svg = (scene: Scene) => renderToStaticMarkup(createElement(FigureView, { scene }));

/** Every check but the comparison with an original's transcription (golden figures have none). */
function issuesOf(specs: FigureSpec[], box?: Box): SceneIssue[] {
  return checkSpecs(specs, [], box).filter(
    (i) => !(i.code === "missing_label" && i.detail.includes("not in original"))
  );
}

function render(golden: Golden, name: string): { markup: string; issues: SceneIssue[] } {
  if (golden.figure_spec != null) {
    const specs = parsed(golden.figure_spec, name);
    const issues = issuesOf(specs);
    const parts = specs.map((spec) => {
      if (spec.type === "table") return renderToStaticMarkup(createElement(TableView, { spec }));
      const scene = buildScene(spec, defaultBox(spec));
      issues.push(...scene.issues);
      return svg(scene);
    });
    const markup =
      parts.length > 1 ? parts.map((m, i) => `<!-- figure ${i + 1} -->${m}`).join("") : parts[0];
    return { markup, issues };
  }
  const choices = golden.answer_choices ?? [];
  const lists = choices.map((c) => parsed(c.choice_figure_spec, `${name} ${c.letter}`));
  const scenes = choiceScenes(choices.map((c) => c.choice_figure_spec));
  const framed = lists.flat().filter(isFramed);
  const frame = framed.length ? sharedFrame(framed) : null;
  const issues: SceneIssue[] = [...choiceFrameIssues(choices.map((c) => c.choice_figure_spec))];
  const parts = scenes.map((figures, i) => {
    if (!figures) throw new Error(`${name} ${choices[i].letter}: no scene`);
    for (const scene of figures) issues.push(...scene.issues);
    const drawn = lists[i].map((s) => (frame && isFramed(s) ? { ...s, frame } : s));
    issues.push(...issuesOf(drawn, CHOICE_BOX));
    return `<!-- choice ${choices[i].letter} -->${figures.map(svg).join("")}`;
  });
  return { markup: parts.join(""), issues };
}

describe("golden figures", () => {
  it("there are about 30, at least 3 of every figure type, 2 figure-choice sets and a list", () => {
    const types = new Map<string, number>();
    let choiceSets = 0;
    let lists = 0;
    for (const f of files) {
      const golden = JSON.parse(readFileSync(path.join(DIR, f), "utf8")) as Golden;
      if (golden.figure_spec == null) {
        choiceSets++;
        continue;
      }
      if (Array.isArray(golden.figure_spec)) lists++;
      for (const { type } of specsOf(golden)) types.set(type, (types.get(type) ?? 0) + 1);
    }
    expect(files.length).toBeGreaterThanOrEqual(30);
    expect(choiceSets).toBeGreaterThanOrEqual(2);
    // A question that prints more than one figure (two separate tables).
    expect(lists).toBeGreaterThanOrEqual(1);
    for (const type of [
      "plane",
      "geometry2d",
      "bar",
      "line",
      "scatter",
      "dot_plot",
      "histogram",
      "box_plot",
      "table",
      "solid3d",
    ]) {
      expect(types.get(type) ?? 0, type).toBeGreaterThanOrEqual(3);
    }
  });

  it("together they use every part kind and every mark", () => {
    const parts = new Set<string>();
    const marks = new Set<string>();
    let note = false;
    for (const f of files) {
      const golden = JSON.parse(readFileSync(path.join(DIR, f), "utf8")) as Golden;
      for (const s of specsOf(golden)) {
        s.parts.forEach((p) => parts.add(p.kind));
        s.marks.forEach((m) => marks.add(m.kind));
        note ||= s.notToScale === true;
      }
    }
    expect([...parts].sort()).toEqual(
      [
        "angle",
        "arc",
        "circle",
        "dimension",
        "function",
        "line",
        "point",
        "polygon",
        "ray",
        "region",
        "sector",
        "segment",
        "series",
        "solid",
        "table",
        "text",
      ].sort()
    );
    expect([...marks].sort()).toEqual(
      ["equal_arcs", "equal_ticks", "hidden_dashed", "parallel", "right_angle"].sort()
    );
    expect(note).toBe(true);
  });

  for (const file of files) {
    const name = file.replace(/\.json$/, "");
    it(name, () => {
      const golden = JSON.parse(readFileSync(path.join(DIR, file), "utf8")) as Golden;
      const { markup, issues } = render(golden, name);

      expect(issues, "engine issues").toEqual([]);
      expect(markup).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(markup).not.toMatch(/\b(rgba?|hsla?)\(/);

      const ext =
        golden.figure_spec != null && specsOf(golden).some((spec) => spec.type === "table");
      const snapshot = path.join(SNAPSHOTS, `${name}.${ext ? "html" : "svg"}`);
      const text = lines(markup);
      if (UPDATE) {
        mkdirSync(SNAPSHOTS, { recursive: true });
        writeFileSync(snapshot, text);
        return;
      }
      if (!existsSync(snapshot)) {
        throw new Error(
          `no snapshot for ${name}: look at the figure, then accept it with GOLDEN_UPDATE=1`
        );
      }
      expect(text).toBe(readFileSync(snapshot, "utf8"));
    });
  }
});
