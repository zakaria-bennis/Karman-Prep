#!/usr/bin/env tsx
/**
 * The figure checks for one figure.json, as `k figures submit` runs them.
 *
 *   npx tsx scripts/figures/check-spec.ts path/to/figure.json [labels.json]
 *
 * figure.json is either a bare FigureSpec, or a figure-lane figure.json whose
 * `figure_spec` (and any answer choice's `choice_figure_spec`) is a FigureSpec.
 * The transcription of the original (every text printed in its figure) is
 * `transcribed_labels` beside each spec, or labels.json (a JSON array of
 * strings) for the bare spec or the question's figure_spec.
 *
 * Each spec's function parts are sampled first (sampleSpec, the calculator's
 * plotting math), then validated and checked (checkSpec). Prints one JSON line:
 *
 *   {ok, issues[], svg, spec, choices: [{letter, ok, issues[], svg, spec}]}
 *
 * `spec` is the sampled spec to store, `svg` its render (FigureView, with the
 * default theme's colors inlined so the file shows on its own; null for a
 * table, which is HTML). Exit 0 when every spec passes, 1 when any has issues,
 * 2 when the input cannot be checked ({ok: false, errors[]}).
 */
import { readFileSync } from "node:fs";
import Module from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { checkSpec } from "@/lib/figures/engine/checks";
import { CHOICE_BOX, choiceScenes, sharedFrame } from "@/lib/figures/engine/choices";
import { buildScene, defaultBox } from "@/lib/figures/engine/index";
import type { Scene, SceneIssue } from "@/lib/figures/engine/scene";
import { parseFigureSpec, type FigureSpec } from "@/lib/figures/engine/spec";
import { sampleSpec } from "./sample-functions";

/**
 * The default theme's figure roles (figure-roles.css over the :root tokens in
 * src/app/globals.css: ivory ink on the night canvas), for a standalone file.
 * The app never reads these; it paints with the theme's own variables.
 */
const STANDALONE_STYLE =
  "<style>svg{background:rgb(7 6 5);--figure-ink:rgb(243 236 221);--figure-ink-muted:rgb(184 176 161);" +
  "--figure-grid:rgb(243 236 221 / 0.16);--figure-fill-faint:rgb(243 236 221 / 0.06);" +
  "--figure-fill-shade:rgb(243 236 221 / 0.14);--figure-highlight:rgb(116 192 243)}</style>";

type Checked = { ok: boolean; issues: SceneIssue[]; svg: string | null; spec: FigureSpec };

class InputError extends Error {}

function fail(errors: string[]): never {
  process.stdout.write(`${JSON.stringify({ ok: false, errors })}\n`);
  process.exit(2);
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new InputError(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function labelsOf(value: unknown, where: string): string[] {
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
    throw new InputError(
      `${where}: transcribed_labels (every text printed in the original figure, [] for none) must be a list of strings`
    );
  }
  return value;
}

/** Valid, sampled and valid again (sampling must not break a spec). */
function sampled(raw: unknown, where: string): FigureSpec {
  const input = parseFigureSpec(raw);
  if (!input.ok) throw new InputError(input.errors.map((e) => `${where}: ${e}`).join("\n"));
  const filled = parseFigureSpec(sampleSpec(input.spec));
  if (!filled.ok) {
    throw new InputError(filled.errors.map((e) => `${where} after sampling: ${e}`).join("\n"));
  }
  return filled.spec;
}

async function svgOf(scene: Scene | null): Promise<string | null> {
  if (!scene) return null;
  // FigureView imports its role stylesheet for the app's bundler; Node needs it ignored.
  (Module as unknown as { _extensions: Record<string, () => void> })._extensions[".css"] = () => {};
  const { default: FigureView } = await import("@/components/learn/figures/FigureView");
  const markup = renderToStaticMarkup(createElement(FigureView, { scene }));
  return markup.replace(/^<svg([^>]*)>/, (open) => open + STANDALONE_STYLE);
}

const isFramed = (s: FigureSpec) =>
  s.type !== "table" && s.type !== "geometry2d" && s.type !== "solid3d";

async function main() {
  const [file, labelsFile] = process.argv.slice(2);
  if (!file) fail(["usage: npx tsx scripts/figures/check-spec.ts <figure.json> [labels.json]"]);
  const doc = readJson(file) as Record<string, unknown> | null;
  if (!doc || typeof doc !== "object") throw new InputError(`${file}: not a JSON object`);
  const extra = labelsFile ? labelsOf(readJson(labelsFile), labelsFile) : null;

  // A bare spec, or the figure lane's figure.json carrying specs.
  const bare = "version" in doc;
  const figureRaw = bare ? doc : doc.figure_spec;
  const choiceDocs = bare
    ? []
    : (Array.isArray(doc.answer_choices) ? doc.answer_choices : []).filter(
        (c): c is Record<string, unknown> =>
          !!c && typeof c === "object" && (c as Record<string, unknown>).choice_figure_spec != null
      );
  if (figureRaw == null && choiceDocs.length === 0) {
    throw new InputError(`${file}: no FigureSpec (figure_spec or a choice_figure_spec) to check`);
  }

  let figure: Checked | null = null;
  if (figureRaw != null) {
    const spec = sampled(figureRaw, bare ? file : `${file} figure_spec`);
    const labels = extra ?? labelsOf(doc.transcribed_labels, `${file}`);
    const issues = checkSpec(spec, labels);
    const svg = spec.type === "table" ? null : await svgOf(buildScene(spec, defaultBox(spec)));
    figure = { ok: issues.length === 0, issues, svg, spec };
  }

  const specs = choiceDocs.map((c) => sampled(c.choice_figure_spec, `${file} choice ${c.letter}`));
  // Choices are drawn in one frame, so each is checked in it (choices.ts).
  const framed = specs.filter(isFramed);
  const frame = framed.length ? sharedFrame(framed) : null;
  const scenes = choiceScenes(specs);
  const choices = await Promise.all(
    choiceDocs.map(async (c, i) => {
      const spec = specs[i];
      const labels = labelsOf(c.transcribed_labels, `${file} choice ${c.letter}`);
      const drawn = frame && isFramed(spec) ? { ...spec, frame } : spec;
      const issues = checkSpec(drawn, labels, CHOICE_BOX);
      return {
        letter: c.letter,
        ok: issues.length === 0,
        issues,
        svg: await svgOf(scenes[i]),
        spec,
      };
    })
  );

  const ok = (figure?.ok ?? true) && choices.every((c) => c.ok);
  const out = {
    ok,
    issues: figure?.issues ?? [],
    svg: figure?.svg ?? null,
    spec: figure?.spec ?? null,
    choices,
  };
  process.stdout.write(`${JSON.stringify(out)}\n`);
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  if (error instanceof InputError) fail(error.message.split("\n"));
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`
  );
  process.exit(3);
});
