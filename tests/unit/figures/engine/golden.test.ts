// ============================================================
// Golden figures (figure engine spec §3 "Testing").
//
// Each tests/fixtures/figures/golden/*.json is a figure.json-shaped file: a
// `figure_spec`, or `answer_choices` with a `choice_figure_spec` each, all
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
import { checkSpec } from "@/lib/figures/engine/checks";
import {
  CHOICE_BOX,
  choiceFrameIssues,
  choiceScenes,
  isFramed,
  sharedFrame,
} from "@/lib/figures/engine/choices";
import { buildScene, defaultBox, type Box } from "@/lib/figures/engine/index";
import type { Scene, SceneIssue } from "@/lib/figures/engine/scene";
import { parseFigureSpec, type FigureSpec } from "@/lib/figures/engine/spec";

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

function parsed(raw: unknown, where: string): FigureSpec {
  const result = parseFigureSpec(raw);
  if (!result.ok) throw new Error(`${where}: ${result.errors.join("; ")}`);
  return result.spec;
}

/** One element per line, so a snapshot diff points at the item that moved. */
const lines = (markup: string) => `${markup.replace(/></g, ">\n<")}\n`;

const svg = (scene: Scene) => renderToStaticMarkup(createElement(FigureView, { scene }));

/** Every check but the comparison with an original's transcription (golden figures have none). */
function issuesOf(spec: FigureSpec, box?: Box): SceneIssue[] {
  return checkSpec(spec, [], box).filter(
    (i) => !(i.code === "missing_label" && i.detail.includes("not in original"))
  );
}

function render(golden: Golden, name: string): { markup: string; issues: SceneIssue[] } {
  if (golden.figure_spec != null) {
    const spec = parsed(golden.figure_spec, name);
    if (spec.type === "table") {
      return {
        markup: renderToStaticMarkup(createElement(TableView, { spec })),
        issues: issuesOf(spec),
      };
    }
    const scene = buildScene(spec, defaultBox(spec));
    return { markup: svg(scene), issues: [...scene.issues, ...issuesOf(spec)] };
  }
  const choices = golden.answer_choices ?? [];
  const specs = choices.map((c) => parsed(c.choice_figure_spec, `${name} ${c.letter}`));
  const scenes = choiceScenes(specs);
  const framed = specs.filter(isFramed);
  const frame = framed.length ? sharedFrame(framed) : null;
  const issues: SceneIssue[] = [...choiceFrameIssues(specs)];
  const parts = scenes.map((scene, i) => {
    if (!scene) throw new Error(`${name} ${choices[i].letter}: no scene`);
    issues.push(...scene.issues);
    const drawn = frame && isFramed(specs[i]) ? { ...specs[i], frame } : specs[i];
    issues.push(...issuesOf(drawn, CHOICE_BOX));
    return `<!-- choice ${choices[i].letter} -->${svg(scene)}`;
  });
  return { markup: parts.join(""), issues };
}

describe("golden figures", () => {
  it("there are about 30, at least 3 of every figure type, and 2 figure-choice sets", () => {
    const types = new Map<string, number>();
    let choiceSets = 0;
    for (const f of files) {
      const golden = JSON.parse(readFileSync(path.join(DIR, f), "utf8")) as Golden;
      if (golden.figure_spec == null) {
        choiceSets++;
        continue;
      }
      const type = (golden.figure_spec as { type: string }).type;
      types.set(type, (types.get(type) ?? 0) + 1);
    }
    expect(files.length).toBeGreaterThanOrEqual(30);
    expect(choiceSets).toBeGreaterThanOrEqual(2);
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
      const specs = [
        golden.figure_spec,
        ...(golden.answer_choices ?? []).map((c) => c.choice_figure_spec),
      ].filter((s): s is FigureSpec => s != null);
      for (const s of specs) {
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
        "function",
        "line",
        "point",
        "polygon",
        "ray",
        "region",
        "segment",
        "series",
        "solid",
        "table",
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

      const ext = golden.figure_spec != null && (golden.figure_spec as FigureSpec).type === "table";
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
