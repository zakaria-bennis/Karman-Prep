/**
 * The automatic figure checks (spec §1 "Automatic checks"), run by
 * `scripts/figures/check-spec.ts`, `k figures submit` and certify. A figure
 * with any issue goes back to its reviewer and never reaches the founder.
 *
 * checkSpec builds the figure the way students see it (buildScene, or
 * layoutTable for a table) and keeps every issue its builder reports
 * (snapping, label placement, clipping to the frame, unsampled functions and
 * regions, regions marked by shading alone).
 * On top of those it checks what no builder can:
 *
 * - labels: every text in the original's transcription is drawn, and every
 *   text drawn (labels, tick numbers, axis names, titles, the note, table
 *   cells) is in the transcription. Texts compare without spacing, with any
 *   minus or dash read as "-". An invented one is a `missing_label` whose
 *   detail says "not in original".
 * - off_line: a point declared `on` a line, circle, arc, polygon or function
 *   lies on it once the figure is snapped (a function through its stored
 *   samples), and an arc's end point lies on its circle. Circles are measured
 *   in world units (the nearest point of the true circle, then in px), so a
 *   circle that draws as an ellipse on an unequal-scale plane still checks.
 * - arrow_rule: rays and lines end in arrowheads; segments never do.
 * - clipped: nothing is drawn past the figure's edge.
 * - label_collision: no two texts overlap.
 */
import { snap } from "./geometry2d";
import { HOUSE } from "./house";
import { buildScene, defaultBox, type Box } from "./index";
import { textBox } from "./labels";
import { DEFAULT_PLANE_FRAME, fmt, planeAxes } from "./plane";
import type { Scene, SceneIssue, SceneItem } from "./scene";
import type { FigureSpec, Part } from "./spec";
import { layoutTable } from "./table";

type Pt = [number, number];
type TextItem = Extract<SceneItem, { t: "text" }>;

/** How far (px) a declared point may sit from its line or curve: the line's own width. */
export const OFF_LINE_PX = HOUSE.line;
/** How far (px) anything may run past the figure's edge before it counts as clipped. */
const EDGE_SLACK = 0.5;
/** Two text boxes overlap when they share more than this (px) both ways. */
const OVERLAP_SLACK = 1;

/**
 * Every issue that keeps `spec` from going to the founder, compared against
 * `transcribedLabels` (every text printed in the original figure, repeats
 * included). [] means the figure passes. `box` is the box it is drawn in
 * (defaultBox, or CHOICE_BOX for an answer choice).
 */
export function checkSpec(
  spec: FigureSpec,
  transcribedLabels: string[],
  box: Box = defaultBox(spec)
): SceneIssue[] {
  const out: SceneIssue[] = [];
  const add = (issue: SceneIssue) => {
    const same = (o: SceneIssue) =>
      o.code === issue.code && o.partId === issue.partId && o.detail === issue.detail;
    if (!out.some(same)) out.push(issue);
  };

  let drawn: Drawn[];
  if (spec.type === "table") {
    drawn = tableTexts(spec, add);
  } else {
    const scene = buildScene(spec, box);
    scene.issues.forEach(add);
    arrowRule(spec, scene).forEach(add);
    offLine(spec, scene, box).forEach(add);
    edges(scene).forEach(add);
    overlaps(scene).forEach(add);
    drawn = scene.items
      .filter((i): i is TextItem => i.t === "text")
      .map((t) => ({ forms: [norm(t.text)], text: t.text, partId: t.partId }));
  }
  labelIssues(spec, drawn, transcribedLabels, out).forEach(add);
  return out;
}

// ---------------------------------------------------------------- labels

/** A text as drawn: the forms it matches (a table cell matches as typed and as shown). */
type Drawn = { forms: string[]; text: string; partId?: string };

/** Texts compare without spacing, with any minus or dash read as "-" (NFKC first). */
const norm = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/[−‐-―]/g, "-")
    .replace(/\s+/g, "");

function tableTexts(spec: FigureSpec, add: (i: SceneIssue) => void): Drawn[] {
  const part = spec.parts.find((p) => p.kind === "table");
  if (!part || part.kind !== "table") {
    add({ code: "clipped", detail: "a table figure needs a table part" });
    return [];
  }
  const model = layoutTable(spec);
  const out: Drawn[] = [];
  const push = (raw: string | undefined, shown: string | undefined = raw) => {
    if (!raw?.trim() && !shown?.trim()) return;
    out.push({
      forms: [norm(raw ?? ""), norm(shown ?? "")],
      text: shown || raw || "",
      partId: part.id,
    });
  };
  push(spec.title);
  for (const g of part.groups ?? []) push(g.label);
  (part.header ?? []).forEach((h, i) => push(h, model.header?.[i]?.text));
  part.rows.forEach((row, r) => row.forEach((c, k) => push(c, model.rows[r][k]?.text)));
  push(part.note);
  return out;
}

/** The texts a spec's author wrote (labels, title, axis names, categories), with where they attach. */
function authorTexts(spec: FigureSpec): { text: string; partId?: string }[] {
  const out: { text: string; partId?: string }[] = spec.labels.map((l) => ({
    text: l.text,
    partId: l.on,
  }));
  if (spec.type === "table") return out; // the table's own texts are all drawn (tableTexts)
  if (spec.title) out.push({ text: spec.title });
  if (spec.frame?.xLabel) out.push({ text: spec.frame.xLabel });
  if (spec.frame?.yLabel) out.push({ text: spec.frame.yLabel });
  for (const c of spec.frame?.categories ?? []) out.push({ text: c });
  return out.filter((t) => norm(t.text) !== "");
}

function labelIssues(
  spec: FigureSpec,
  drawn: Drawn[],
  transcribed: string[],
  builderIssues: SceneIssue[]
): SceneIssue[] {
  const issues: SceneIssue[] = [];
  const used = drawn.map(() => false);
  const original = transcribed.filter((t) => norm(t) !== "");

  for (const text of original) {
    const want = norm(text);
    let hit = drawn.findIndex((d, i) => !used[i] && d.forms.includes(want));
    if (hit >= 0) {
      used[hit] = true;
      continue;
    }
    // A long label wraps onto lines that are drawn one after another (a title, the note).
    hit = wrappedRun(drawn, used, want);
    if (hit >= 0) continue;
    // A label the builder already reported (no place, no free spot) is not reported again.
    if (builderIssues.some((i) => i.detail.includes(`"${text}"`))) continue;
    issues.push({ code: "missing_label", detail: `"${text}" from the original is not drawn` });
  }

  const invented = new Map<string, number>();
  drawn.forEach((d, i) => {
    if (used[i]) return;
    invented.set(d.forms[0], (invented.get(d.forms[0]) ?? 0) + 1);
    issues.push({
      code: "missing_label",
      partId: d.partId,
      detail: `"${d.text}" is not in original`,
    });
  });

  // An author's text that was not drawn (a label on a plane, a title on a shape) is still
  // invented when the original does not print it.
  const inOriginal = new Map<string, number>();
  for (const t of original) inOriginal.set(norm(t), (inOriginal.get(norm(t)) ?? 0) + 1);
  const authored = new Map<string, number>();
  for (const a of authorTexts(spec)) {
    const k = norm(a.text);
    authored.set(k, (authored.get(k) ?? 0) + 1);
    const excess = (authored.get(k) ?? 0) - (inOriginal.get(k) ?? 0);
    if (excess <= 0) continue;
    if ((invented.get(k) ?? 0) >= excess) continue; // already reported where it is drawn
    invented.set(k, (invented.get(k) ?? 0) + 1);
    issues.push({
      code: "missing_label",
      partId: a.partId,
      detail: `"${a.text}" is not in original`,
    });
  }
  return issues;
}

/** Marks and returns the start of a run of unused drawn texts that spell `want`, or -1. */
function wrappedRun(drawn: Drawn[], used: boolean[], want: string): number {
  for (let i = 0; i < drawn.length; i++) {
    let acc = "";
    for (let j = i; j < drawn.length && !used[j]; j++) {
      acc += drawn[j].forms[0];
      if (!want.startsWith(acc)) break;
      if (acc === want && j > i) {
        for (let k = i; k <= j; k++) used[k] = true;
        return i;
      }
    }
  }
  return -1;
}

// ---------------------------------------------------------------- arrows

function arrowRule(spec: FigureSpec, scene: Scene): SceneIssue[] {
  const issues: SceneIssue[] = [];
  for (const part of spec.parts) {
    if (part.kind !== "segment" && part.kind !== "ray" && part.kind !== "line") continue;
    const own = scene.items.filter(
      (i): i is Extract<SceneItem, { t: "path" }> => i.t === "path" && i.partId === part.id
    );
    if (own.length === 0) continue; // not drawn: the builder reported why
    const arrowed = own.some((i) => i.arrows);
    if (part.kind === "segment" && arrowed) {
      issues.push({
        code: "arrow_rule",
        partId: part.id,
        detail: "a segment is drawn with arrowheads",
      });
    } else if (part.kind === "ray" && !own.some((i) => i.arrows === "end" || i.arrows === "both")) {
      issues.push({ code: "arrow_rule", partId: part.id, detail: "a ray needs an arrowhead" });
    } else if (part.kind === "line" && !own.some((i) => i.arrows === "both")) {
      issues.push({
        code: "arrow_rule",
        partId: part.id,
        detail: "a line needs arrowheads at both ends",
      });
    }
  }
  return issues;
}

// ---------------------------------------------------------------- points on lines and curves

/**
 * The figure's points in world units and in px, as the builder places them
 * (snapped, scaled), and the world-to-px map.
 */
type Placed = {
  world: Map<string, Pt>;
  points: Map<string, Pt>;
  px: (p: Pt) => Pt;
  parts: Part[];
};

function placed(spec: FigureSpec, scene: Scene, box: Box): Placed | null {
  if (spec.type === "geometry2d") {
    const snapped = snap(spec);
    const s = scene.scale ?? 1;
    const px = ([x, y]: Pt): Pt => [x * s, y * s];
    return {
      world: pointsOf(snapped, (p) => p),
      points: pointsOf(snapped, px),
      px,
      parts: snapped.parts,
    };
  }
  if (spec.type === "plane") {
    const { map } = planeAxes(spec.frame ?? DEFAULT_PLANE_FRAME, box);
    const px = ([x, y]: Pt): Pt => [map.px(x), map.py(y)];
    return { world: pointsOf(spec, (p) => p), points: pointsOf(spec, px), px, parts: spec.parts };
  }
  return null;
}

function pointsOf(spec: FigureSpec, px: (p: Pt) => Pt): Map<string, Pt> {
  const m = new Map<string, Pt>();
  for (const p of spec.parts) if (p.kind === "point") m.set(p.id, px([p.x, p.y]));
  return m;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Distance from p to a–b, with the line's parameter kept to [lo, hi]. */
function toLine(p: Pt, a: Pt, b: Pt, lo: number, hi: number): number {
  const d: Pt = [b[0] - a[0], b[1] - a[1]];
  const dd = d[0] * d[0] + d[1] * d[1];
  if (dd === 0) return dist(p, a);
  const t = Math.max(lo, Math.min(hi, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / dd));
  return dist(p, [a[0] + t * d[0], a[1] + t * d[1]]);
}

/**
 * Distance (px) from world point `pw` to the drawn part, or
 * null when the part draws nothing to compare with.
 */
function distanceTo(pw: Pt, part: Part, at: Placed): number | null {
  const p = at.px(pw);
  const P = (id: string) => at.points.get(id);
  switch (part.kind) {
    case "segment":
    case "ray":
    case "line": {
      const a = P(part.from);
      const b = P(part.to);
      if (!a || !b) return null;
      const lo = part.kind === "line" ? -Infinity : 0;
      return toLine(p, a, b, lo, part.kind === "segment" ? 1 : Infinity);
    }
    case "polygon": {
      const pts = part.points.map(P);
      if (pts.some((q) => !q)) return null;
      return Math.min(...pts.map((a, i) => toLine(p, a!, pts[(i + 1) % pts.length]!, 0, 1)));
    }
    case "circle":
    case "arc": {
      // The nearest point of the true circle, found in world units, then measured in px.
      const c = at.world.get(part.center);
      const through = part.kind === "arc" ? part.from : part.through;
      const t = through ? at.world.get(through) : undefined;
      const r = t && c ? dist(t, c) : part.kind === "circle" && part.radius ? part.radius : null;
      if (!c || r === null) return null;
      const away = dist(pw, c);
      const u: Pt = away > 0 ? [(pw[0] - c[0]) / away, (pw[1] - c[1]) / away] : [1, 0];
      return dist(p, at.px([c[0] + r * u[0], c[1] + r * u[1]]));
    }
    case "function": {
      if (!part.samples?.length) return null; // unsampled_function or clipped says why
      let best = Infinity;
      for (const run of part.samples) {
        const pts = run.map(at.px);
        if (pts.length === 1) best = Math.min(best, dist(p, pts[0]));
        for (let i = 0; i + 1 < pts.length; i++)
          best = Math.min(best, toLine(p, pts[i], pts[i + 1], 0, 1));
      }
      return Number.isFinite(best) ? best : null;
    }
    default:
      return null;
  }
}

function offLine(spec: FigureSpec, scene: Scene, box: Box): SceneIssue[] {
  const at = placed(spec, scene, box);
  if (!at) return [];
  const byId = new Map(at.parts.map((p) => [p.id, p]));
  const issues: SceneIssue[] = [];
  for (const part of at.parts) {
    if (part.kind === "point") {
      const p = at.world.get(part.id)!;
      for (const ref of part.on ?? []) {
        const target = byId.get(ref);
        const d = target ? distanceTo(p, target, at) : null;
        if (d !== null && d > OFF_LINE_PX) {
          issues.push({
            code: "off_line",
            partId: part.id,
            detail: `declared on "${ref}" but drawn ${fmt(d)}px off it`,
          });
        }
      }
    } else if (part.kind === "arc") {
      // The arc is drawn at its start point's radius, so its end point must be on that circle.
      const end = at.world.get(part.to);
      const d = end ? distanceTo(end, part, at) : null;
      if (d !== null && d > OFF_LINE_PX) {
        issues.push({
          code: "off_line",
          partId: part.id,
          detail: `its end point "${part.to}" is ${fmt(d)}px off its circle`,
        });
      }
    }
  }
  return issues;
}

// ---------------------------------------------------------------- edges and overlaps

/** Points along an SVG path: its M/L vertices and samples along every circular A arc. */
export function pathPoints(d: string): Pt[] {
  const out: Pt[] = [];
  let cur: Pt = [0, 0];
  let start: Pt = [0, 0];
  for (const m of d.matchAll(/([MLAZmlaz])([^MLAZmlaz]*)/g)) {
    const cmd = m[1].toUpperCase();
    const n = (m[2].match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    if (cmd === "Z") cur = start;
    else if (cmd === "M" || cmd === "L") {
      for (let i = 0; i + 1 < n.length; i += 2) {
        cur = [n[i], n[i + 1]];
        if (cmd === "M" && i === 0) start = cur;
        out.push(cur);
      }
    } else {
      for (let i = 0; i + 6 < n.length; i += 7) {
        const end: Pt = [n[i + 5], n[i + 6]];
        out.push(...arcPoints(cur, end, n[i], n[i + 3] === 1, n[i + 4] === 1));
        cur = end;
      }
    }
  }
  return out;
}

/** Samples along a circular SVG arc (SVG's endpoint-to-center conversion, no rotation). */
function arcPoints(a: Pt, b: Pt, radius: number, large: boolean, sweep: boolean, steps = 16): Pt[] {
  const hx = (a[0] - b[0]) / 2;
  const hy = (a[1] - b[1]) / 2;
  const h2 = hx * hx + hy * hy;
  if (h2 === 0 || radius <= 0) return [b];
  const r = Math.max(radius, Math.sqrt(h2));
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, (r * r - h2) / h2));
  const c: Pt = [k * hy + (a[0] + b[0]) / 2, -k * hx + (a[1] + b[1]) / 2];
  const t0 = Math.atan2(a[1] - c[1], a[0] - c[0]);
  let span = Math.atan2(b[1] - c[1], b[0] - c[0]) - t0;
  if (sweep && span < 0) span += 2 * Math.PI;
  if (!sweep && span > 0) span -= 2 * Math.PI;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = t0 + (span * i) / steps;
    return [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)] as Pt;
  });
}

function edges(scene: Scene): SceneIssue[] {
  const [ox, oy] = scene.offset ?? [0, 0];
  const l = -ox - EDGE_SLACK;
  const r = scene.width - ox + EDGE_SLACK;
  const t = -oy - EDGE_SLACK;
  const b = scene.height - oy + EDGE_SLACK;
  const out = (x: number, y: number) => x < l || x > r || y < t || y > b;
  const issues: SceneIssue[] = [];
  for (const item of scene.items) {
    let past = false;
    if (item.t === "text") {
      const [x0, x1, y0, y1] = textBox(item);
      past = out(x0, y0) || out(x1, y1);
    } else if (item.t === "rect") {
      past = out(item.x, item.y) || out(item.x + item.width, item.y + item.height);
    } else {
      past = pathPoints(item.d).some(([x, y]) => out(x, y));
    }
    if (past) {
      const what = item.t === "text" ? `the text "${item.text}"` : "a line";
      issues.push({
        code: "clipped",
        partId: item.partId,
        detail: `${what} runs past the figure's edge`,
      });
    }
  }
  return issues;
}

function overlaps(scene: Scene): SceneIssue[] {
  const texts = scene.items.filter((i): i is TextItem => i.t === "text" && i.text.trim() !== "");
  const boxes = texts.map(textBox);
  const issues: SceneIssue[] = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const [a, b] = [boxes[i], boxes[j]];
      const w = Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
      const h = Math.min(a[3], b[3]) - Math.max(a[2], b[2]);
      if (w > OVERLAP_SLACK && h > OVERLAP_SLACK) {
        issues.push({
          code: "label_collision",
          partId: texts[j].partId ?? texts[i].partId,
          detail: `"${texts[i].text}" and "${texts[j].text}" overlap`,
        });
      }
    }
  }
  return issues;
}
