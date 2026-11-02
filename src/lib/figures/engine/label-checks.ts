/**
 * The checks on where labels end up (checks.ts runs them on every drawn figure):
 *
 * - label_drift: an angle's label sits inside its angle, between the two rays,
 *   as Bluebook prints it; one pushed out to another side reads as naming
 *   the wrong angle.
 * - label_collision: no part label sits on a line or curve, measured against
 *   the drawn curve (arcs sampled along their length), not its chord.
 * - missing_label: every label the spec gives is drawn somewhere. A label a
 *   builder already reported (no free spot) is not reported twice.
 *
 * And the hints that make a missing tick number's message say why: tick labels
 * thinned to fewer than the spec's steps, or thousands not grouped.
 */
import { pathSegments, segHitsRect, textBox } from "./labels";
import { fmt } from "./plane-axes";
import type { Scene, SceneIssue, SceneItem, ThinnedTicks } from "./scene";
import type { FigureSpec } from "./spec";
import { CHART_TYPES } from "./spec-types";

type Pt = [number, number];
type TextItem = Extract<SceneItem, { t: "text" }>;

/** Degrees an angle label's center may sit outside its angle (its box may straddle a ray's end). */
const DRIFT_SLACK_DEG = 4;
/** A label box is shrunk by this (px) before it is tested against lines: touching is not sitting on. */
const ON_LINE_SLACK = 1;

const texts = (scene: Scene) => scene.items.filter((i): i is TextItem => i.t === "text");

/** The drawn text of a spec label: same text, same part. */
function drawnLabel(scene: Scene, text: string, on: string): TextItem | undefined {
  return texts(scene).find((t) => t.partId === on && t.text === text);
}

/**
 * Angle labels outside their angle. `points` are the figure's points in px as
 * drawn (geometry2d after snapping and scaling).
 */
export function labelDrift(spec: FigureSpec, scene: Scene, points: Map<string, Pt>): SceneIssue[] {
  const issues: SceneIssue[] = [];
  const parts = new Map(spec.parts.map((p) => [p.id, p]));
  for (const label of spec.labels) {
    const part = parts.get(label.on);
    if (part?.kind !== "angle") continue;
    const t = drawnLabel(scene, label.text, label.on);
    const v = points.get(part.vertex);
    const a = points.get(part.from);
    const b = points.get(part.to);
    if (!t || !v || !a || !b) continue;
    const [l, r, top, bottom] = textBox(t);
    const c: Pt = [(l + r) / 2, (top + bottom) / 2];
    const dir = (p: Pt) => Math.atan2(p[1] - v[1], p[0] - v[0]);
    const spread = (x: number, y: number) => {
      const d = Math.abs(x - y) % (2 * Math.PI);
      return d > Math.PI ? 2 * Math.PI - d : d;
    };
    const ta = dir(a);
    const tb = dir(b);
    const opening = spread(ta, tb);
    const tc = dir(c);
    // How far the center's direction lies past the nearer ray, in degrees.
    const past = ((spread(ta, tc) + spread(tc, tb) - opening) * 90) / Math.PI;
    if (past > DRIFT_SLACK_DEG) {
      issues.push({
        code: "label_drift",
        partId: label.on,
        detail: `label "${label.text}" is drawn outside its angle ${part.from}${part.vertex}${part.to} (${fmt(past)}° past a ray); make room inside the angle or move the crowding label`,
      });
    }
  }
  return issues;
}

/** Part labels drawn across a line or curve. */
export function labelsOnLines(spec: FigureSpec, scene: Scene): SceneIssue[] {
  const issues: SceneIssue[] = [];
  const lines = scene.items.flatMap((i) =>
    i.t === "path" && i.weight !== "grid" && i.stroke !== false
      ? pathSegments(i.d).map((s) => ({ s, partId: i.partId }))
      : []
  );
  for (const label of spec.labels) {
    const t = drawnLabel(scene, label.text, label.on);
    if (!t || t.rotate) continue;
    const [l, r, top, bottom] = textBox(t);
    const inner: [number, number, number, number] = [
      l + ON_LINE_SLACK,
      r - ON_LINE_SLACK,
      top + ON_LINE_SLACK,
      bottom - ON_LINE_SLACK,
    ];
    const hit = lines.find((x) => segHitsRect(x.s, inner));
    if (hit) {
      const what = hit.partId && hit.partId !== label.on ? ` of "${hit.partId}"` : "";
      issues.push({
        code: "label_collision",
        partId: label.on,
        detail: `label "${label.text}" sits on a line or curve${what}`,
      });
    }
  }
  return issues;
}

/**
 * Spec labels drawn nowhere. A chart names its series in the legend (or beside a
 * box plot), so there any text that matches counts; elsewhere the label must be
 * drawn on its own part. `reported` are the issues already raised for the figure.
 */
export function droppedLabels(
  spec: FigureSpec,
  scene: Scene,
  reported: SceneIssue[]
): SceneIssue[] {
  const chart = (CHART_TYPES as readonly string[]).includes(spec.type);
  const drawn = texts(scene);
  const issues: SceneIssue[] = [];
  for (const label of spec.labels) {
    const text = label.text.trim();
    if (!text) continue;
    // A legend name may wrap onto lines drawn one after another.
    const flat = (x: string) => x.replace(/\s+/g, "");
    const found = chart
      ? drawn.some((t) => t.text.trim() === text) ||
        flat(drawn.map((t) => t.text).join("")).includes(flat(text))
      : drawn.some((t) => t.partId === label.on && t.text.trim() === text);
    if (found) continue;
    if (reported.some((i) => i.detail.includes(`"${label.text}"`))) continue;
    issues.push({
      code: "missing_label",
      partId: label.on,
      detail: chart
        ? `label "${label.text}" is not drawn: a series is named only in a legend, which a chart draws for two or more series`
        : `label "${label.text}" is not drawn`,
    });
  }
  return issues;
}

/** Digits of a tick number as printed ("1,200" and "1200" both give 1200), or null. */
const numberOf = (s: string) => {
  const t = s.replace(/[−‐-―]/g, "-").replace(/\s+/g, "");
  if (!/^-?\d{1,3}(,\d{3})*(\.\d+)?$|^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t.replace(/,/g, ""));
};

/**
 * Why a number the original prints may be missing: the tick labels were thinned
 * (`thinned`), it prints with grouped thousands the frame does not ask for
 * (`drawnTexts` holds it ungrouped), or it is a second 0 where the axes meet. ""
 * when none of these.
 */
export function tickHint(text: string, thinned: ThinnedTicks[], drawnTexts: string[]): string {
  const v = numberOf(text);
  if (v === null) return "";
  if (text.includes(",") && drawnTexts.some((d) => numberOf(d) === v && !d.includes(","))) {
    return "; set frame.thousands to print tick numbers with commas";
  }
  // A second 0 where the axes meet: the origin is labelled once unless asked for each axis.
  if (v === 0 && drawnTexts.some((d) => numberOf(d) === 0)) {
    return '; where the axes meet the 0 is printed once, so set frame.originLabel to "both" if the original prints 0 on each axis';
  }
  for (const t of thinned) {
    const onAsked = Math.abs(v / t.asked - Math.round(v / t.asked)) < 1e-9;
    if (!onAsked) continue;
    const key = t.axis === "x" ? "labelStep" : "yLabelStep";
    return `; the ${t.axis} tick labels were thinned to every ${fmt(t.drawn)} (every ${fmt(t.asked)} sits closer than 28px), so set frame.${key} to ${fmt(t.asked)} to label every tick where they fit`;
  }
  return "";
}
