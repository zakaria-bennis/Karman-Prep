/**
 * Figure answer choices (figure engine spec §2). When a question's choices are
 * graphs, charts or shapes, each choice holds its own FigureSpec, and the four
 * are drawn in one frame (the same ranges and scale) at one size, so a student
 * compares the drawings and never the windows they were drawn in.
 *
 * A choice whose spec is a table is not drawn here: withSpecTables hands it to
 * the table-choice path (a radio beside an HTML table) as choice_table_data.
 */
import type { QuestionTableData } from "@/types/question-table";
import { chartSpecFrame } from "./charts";
import { geometryDetail, solidDetail } from "./describe-detail";
import { specToTableData } from "./from-table-data";
import { buildScene, type Box } from "./index";
import { DEFAULT_PLANE_FRAME } from "./plane";
import type { Scene, SceneIssue } from "./scene";
import { parseFigureSpec, type FigureSpec, type PlaneFrame } from "./spec";

/**
 * The box every figure choice is laid out in. Small on purpose: the house font
 * (15 units) must render at 12px or more, so a choice's figure may shrink to
 * 0.8 of this width and no further. The choice grid (FigureChoices) only puts
 * two choices side by side when each figure gets at least that width.
 */
export const CHOICE_BOX: Box = { width: 240, height: 180 };

/** The frame a plane or chart spec is drawn in, or null for shapes, solids and tables. */
function frameOf(spec: FigureSpec): PlaneFrame | null {
  if (spec.type === "plane") return spec.frame ?? DEFAULT_PLANE_FRAME;
  return chartSpecFrame(spec);
}

/** Plane and chart specs are drawn in a frame; shapes, solids and tables are not. */
export const isFramed = (spec: FigureSpec) =>
  spec.type !== "table" && spec.type !== "geometry2d" && spec.type !== "solid3d";

/**
 * One frame for all the choices: the union of their ranges. Steps, labels and
 * axis titles come from the first choice that sets them; bar categories from the
 * choice with the most. Throws when no spec is a plane or a chart.
 */
export function sharedFrame(specs: FigureSpec[]): PlaneFrame {
  const frames = specs.map(frameOf).filter((f): f is PlaneFrame => f !== null);
  if (frames.length === 0) throw new Error("sharedFrame: no plane or chart among the specs");
  const shared: PlaneFrame = { ...frames[0] };
  for (const key of [
    "step",
    "yStep",
    "labelStep",
    "yLabelStep",
    "xLabel",
    "yLabel",
    "grid",
    "originLabel",
  ] as const) {
    const set = frames.find((f) => f[key] !== undefined);
    if (set) (shared as Record<string, unknown>)[key] = set[key];
  }
  shared.x = [Math.min(...frames.map((f) => f.x[0])), Math.max(...frames.map((f) => f.x[1]))];
  shared.y = [Math.min(...frames.map((f) => f.y[0])), Math.max(...frames.map((f) => f.y[1]))];
  const categories = frames
    .map((f) => f.categories)
    .filter((c): c is string[] => !!c)
    .sort((a, b) => b.length - a.length)[0];
  if (categories) shared.categories = categories;
  return shared;
}

/** The valid drawn (non-table) spec of a stored choice_figure_spec, or null. */
function drawnSpec(input: unknown): FigureSpec | null {
  if (input === null || input === undefined) return null;
  const parsed = parseFigureSpec(input);
  return parsed.ok && parsed.spec.type !== "table" ? parsed.spec : null;
}

const SCALED = new Set(["geometry2d", "solid3d"]);

/** True when the spec stores samples made for its own frame (function and region parts). */
const hasSamples = (spec: FigureSpec) =>
  spec.parts.some((p) => p.kind === "function" || p.kind === "region");

const sameRange = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];

/**
 * Issues that keep a choice set from being drawn: a choice whose function or
 * region samples were made for a frame other than the shared one. Its curves
 * and shading would stop short of the shared window (a region could look
 * bounded when it is not). scripts/figures/check-spec.ts stores every framed
 * choice in the shared frame, sampled there (sampleChoices); a set that was
 * not is refused. Charts and point-and-line planes store nothing frame-bound.
 */
export function choiceFrameIssues(specs: unknown[]): SceneIssue[] {
  const drawn = specs.map(drawnSpec);
  const valid = drawn.filter((s): s is FigureSpec => s !== null);
  if (!valid.some((s) => frameOf(s) !== null)) return [];
  const shared = sharedFrame(valid);
  const issues: SceneIssue[] = [];
  drawn.forEach((spec, i) => {
    const own = spec && frameOf(spec);
    if (!spec || !own || !hasSamples(spec)) return;
    if (sameRange(own.x, shared.x) && sameRange(own.y, shared.y)) return;
    issues.push({
      code: "frame_mismatch",
      detail:
        `choice ${i + 1} was sampled in x [${own.x.join(", ")}], y [${own.y.join(", ")}], ` +
        `not the shared frame x [${shared.x.join(", ")}], y [${shared.y.join(", ")}]; ` +
        "run scripts/figures/check-spec.ts to sample every choice in the shared frame",
    });
  });
  return issues;
}

/** One scene per choice, or null; a builder throw draws nothing (the text shows instead). */
function tryBuild(spec: FigureSpec | null, scale?: number): Scene | null {
  if (!spec) return null;
  try {
    return buildScene(spec, CHOICE_BOX, scale === undefined ? {} : { scale });
  } catch {
    return null;
  }
}

/** A scene padded to `width` × `height`, its drawing centered in the larger box. */
export function padScene(scene: Scene, width: number, height: number): Scene {
  if (scene.width === width && scene.height === height) return scene;
  const [ox, oy] = scene.offset ?? [0, 0];
  return {
    ...scene,
    width,
    height,
    offset: [ox + (width - scene.width) / 2, oy + (height - scene.height) / 2],
  };
}

/** Descriptions that tell the choices apart: shapes and solids add vertices or dims on a tie. */
function distinguish(scenes: (Scene | null)[], specs: (FigureSpec | null)[]): (Scene | null)[] {
  const texts = scenes.filter((s): s is Scene => s !== null).map((s) => s.description);
  if (new Set(texts).size === texts.length) return scenes;
  return scenes.map((scene, i) => {
    const spec = specs[i];
    if (!scene || !spec) return scene;
    const detail =
      spec.type === "geometry2d"
        ? geometryDetail(spec)
        : spec.type === "solid3d"
          ? solidDetail(spec)
          : "";
    if (!detail) return scene;
    return { ...scene, description: `${scene.description.replace(/\.$/, "")}, with ${detail}.` };
  });
}

/**
 * The Scene of each choice, in order, all in CHOICE_BOX at one size:
 * - planes and charts in one shared frame (sharedFrame);
 * - shapes and solids at one scale, the largest at which every one fits the box
 *   (each centered), so a figure twice as large in the spec is twice as large on screen;
 * - each padded to the largest scene (a chart's legend or title makes it taller), centered.
 * Null for a choice with no spec, an invalid spec, or a table spec. Every
 * choice is null (each shows its text) when the set has a choiceFrameIssues issue.
 */
export function choiceScenes(specs: unknown[]): (Scene | null)[] {
  if (choiceFrameIssues(specs).length) return specs.map(() => null);
  const drawn = specs.map(drawnSpec);
  const valid = drawn.filter((s): s is FigureSpec => s !== null);
  const framed = valid.some((s) => frameOf(s) !== null);
  const frame = framed ? sharedFrame(valid) : null;
  const own = drawn.map((spec) => (spec && frame && frameOf(spec) ? { ...spec, frame } : spec));
  let scenes = own.map((spec) => tryBuild(spec));
  // Each shape's own fit scale is the most it can take; the smallest of those fits them all.
  const fits = scenes.flatMap((scene, i) =>
    scene?.scale !== undefined && SCALED.has(own[i]!.type) ? [scene.scale] : []
  );
  if (fits.length > 1) {
    const scale = Math.min(...fits);
    scenes = scenes.map((scene, i) =>
      scene && SCALED.has(own[i]!.type) ? tryBuild(own[i], scale) : scene
    );
  }
  const height = Math.max(0, ...scenes.map((s) => s?.height ?? 0));
  const width = Math.max(0, ...scenes.map((s) => s?.width ?? 0));
  return distinguish(
    scenes.map((s) => (s ? padScene(s, width, height) : s)),
    own
  );
}

type ChoiceFigureFields = {
  choice_figure_spec?: unknown;
  choice_table_data?: QuestionTableData | null;
};

/** True when any choice has a valid drawn spec: the question's choices are figures. */
export function hasFigureChoices(choices: readonly ChoiceFigureFields[]): boolean {
  return choices.some((c) => drawnSpec(c.choice_figure_spec) !== null);
}

/**
 * The choices with every table choice_figure_spec turned into the choice_table_data
 * it draws (an existing choice_table_data is kept), so table choices keep one path.
 */
export function withSpecTables<T extends ChoiceFigureFields>(choices: readonly T[]): T[] {
  return choices.map((c) => {
    if (c.choice_table_data || c.choice_figure_spec == null) return c;
    const parsed = parseFigureSpec(c.choice_figure_spec);
    const table = parsed.ok ? specToTableData(parsed.spec) : null;
    return table ? { ...c, choice_table_data: table } : c;
  });
}
