// The pictures in a lesson, drawn in code (SVG with GSAP; never an image file). A lesson names one kind
// and its numbers; the portal's lesson figures (src/app/dashboard/student/_portal/lesson/) draw it, and
// it draws itself in step by step (still for reduced motion). Text in a figure is plain, or Rich where
// it says so. Every number is a real value: the figure is drawn to scale from it.
import type { Rich } from "./types";

/** A color role. warm = amber, gold, blue, green (right), red (wrong or trap), ink (the text color). */
export type Tone = "warm" | "gold" | "blue" | "green" | "red" | "ink";

// ---------------------------------------------------------------- Math

/** Things drawn on a coordinate plane, in order. */
export type PlaneItem =
  /** y = m x + b */
  | { line: [m: number, b: number]; label?: string; tone?: Tone; dashed?: boolean }
  /** x = c */
  | { vertical: number; label?: string; tone?: Tone; dashed?: boolean }
  /** y = a (x - h)^2 + k */
  | { parabola: [a: number, h: number, k: number]; label?: string; tone?: Tone }
  /** y = a * b^x */
  | { exp: [a: number, b: number]; label?: string; tone?: Tone }
  /** y = a (x - z1)(x - z2)... from its zeros */
  | { poly: number[]; a?: number; label?: string; tone?: Tone }
  /** (x - h)^2 + (y - k)^2 = r^2 */
  | { circle: [h: number, k: number, r: number]; label?: string; tone?: Tone }
  | { point: [x: number, y: number]; label?: string; tone?: Tone }
  /** A straight piece, such as the rise and run of a slope. */
  | { segment: [x1: number, y1: number, x2: number, y2: number]; label?: string; tone?: Tone }
  /** The region above or below y = m x + b; strict draws the line dashed. */
  | { shade: [m: number, b: number]; side: "above" | "below"; strict?: boolean; tone?: Tone };

export interface PlaneFigure {
  kind: "plane";
  /** The window: x from x[0] to x[1], y from y[0] to y[1]. Both default to -10 to 10. */
  x?: [number, number];
  y?: [number, number];
  /** Axis names, when they mean something ("hours", "cost"). */
  xLabel?: string;
  yLabel?: string;
  draw: PlaneItem[];
}

/** A circle with a central angle: sector, arc, or the unit circle. */
export interface CircleFigure {
  kind: "circle";
  /** The central angle in degrees (even when the lesson speaks in radians). */
  angle: number;
  /** What to light up: the slice (sector), its curved edge (arc), an inscribed angle that opens on
   *  the same arc, or the unit circle with the point at the angle. */
  show: "sector" | "arc" | "inscribed" | "unit";
  /** Label the angle in radians (as a multiple of pi) instead of degrees. */
  radians?: boolean;
  /** The radius's label ("r", "6"). */
  r?: string;
}

/** A triangle drawn from its three angles. */
export interface TriangleFigure {
  kind: "triangle";
  /** Angles at corners A, B, C in degrees; they must sum to 180. A 90 gets the square mark. */
  angles: [number, number, number];
  /** Labels on the sides opposite A, B and C ("5", "x", ""). */
  sides?: [string, string, string];
  /** Corner names (default A, B, C). */
  corners?: [string, string, string];
  /** Angle labels at A, B, C ("30°", "x", ""). */
  angleLabels?: [string, string, string];
  /** Trig view from this corner: tags the opposite and adjacent legs and the hypotenuse. */
  from?: 0 | 1 | 2;
  /** Draws a second, similar triangle beside the first, scaled by this factor. */
  similar?: number;
  /** Sides to light up, by the corner they face. */
  highlight?: (0 | 1 | 2)[];
}

/** Two parallel lines cut by a transversal. Angles are numbered 1 to 8: 1 to 4 at the top crossing,
 *  5 to 8 at the bottom, each going top-left, top-right, bottom-right, bottom-left. */
export interface AnglesFigure {
  kind: "angles";
  /** The sharp angle the transversal makes with the parallel lines, in degrees (20 to 89). */
  tilt: number;
  /** Labels for numbered angles ({ 1: "x", 6: "70°" }). */
  labels?: Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, string>>;
  /** Angles to light up; equal ones share a tone. */
  highlight?: (1 | 2 | 3 | 4 | 5 | 6 | 7 | 8)[];
}

/** A solid, labeled. */
export interface SolidFigure {
  kind: "solid";
  shape: "cylinder" | "cone" | "sphere" | "prism" | "pyramid" | "cube";
  /** Labels for radius, height, length, width or side, as needed ("5", "r", "h"). */
  labels?: { r?: string; h?: string; l?: string; w?: string; s?: string };
}

/** A flat shape, labeled; composite shapes are built from simple ones. */
export interface ShapeFigure {
  kind: "shape";
  shape:
    | "rectangle"
    | "square"
    | "triangle"
    | "parallelogram"
    | "trapezoid"
    | "l-shape"
    | "rect-with-semicircle"
    | "rect-minus-circle";
  /** Side labels in order around the shape from the bottom edge, and an optional height ("h"). */
  labels?: string[];
  height?: string;
  /** Shades the area (true) or traces the perimeter (false, the default shades). */
  perimeter?: boolean;
}

/** An equation as a balance: the same move on both sides keeps it level. */
export interface BalanceFigure {
  kind: "balance";
  left: Rich;
  right: Rich;
  /** The moves, in order: what was done, and what each side became. */
  steps?: { move: Rich; left: Rich; right: Rich }[];
}

/** A number line with points, a ray or a stretch. */
export interface NumberLineFigure {
  kind: "numberLine";
  from: number;
  to: number;
  /** Points: open (hollow) or closed (filled). */
  points?: { at: number; open?: boolean; label?: string; tone?: Tone }[];
  /** A ray from a point to the left or right. */
  ray?: { from: number; dir: "left" | "right"; open?: boolean; tone?: Tone };
  /** A stretch between two points, each end open or closed. */
  span?: { from: number; to: number; openFrom?: boolean; openTo?: boolean; tone?: Tone };
}

/** Bars cut into parts: ratios, parts of a whole, percents. */
export interface TapeFigure {
  kind: "tape";
  bars: { label: string; parts: { n: number; label?: string; tone?: Tone }[] }[];
  /** A note under the bars ("1 part = 12"). */
  note?: string;
}

/** A data display. */
export type DataFigure =
  | {
      kind: "data";
      chart: "bar";
      labels: string[];
      /** One series, or several (one array per series, the same length as labels). */
      values: number[] | number[][];
      legend?: string[];
      yLabel?: string;
      highlight?: number[];
    }
  | {
      kind: "data";
      chart: "line";
      labels: string[];
      series: { name: string; values: number[] }[];
      yLabel?: string;
    }
  | { kind: "data"; chart: "dot"; values: number[]; showMean?: boolean; showMedian?: boolean }
  | {
      kind: "data";
      chart: "box";
      /** min, first quartile, median, third quartile, max; a second box below it to compare. */
      five: [number, number, number, number, number];
      second?: [number, number, number, number, number];
      names?: [string, string];
    }
  | { kind: "data"; chart: "histogram"; bins: [from: number, to: number, count: number][] }
  | {
      kind: "data";
      chart: "scatter";
      points: [x: number, y: number][];
      /** A line of best fit, y = m x + b. */
      fit?: [m: number, b: number];
      xLabel?: string;
      yLabel?: string;
    }
  | {
      kind: "data";
      chart: "table";
      head: string[];
      rows: string[][];
      /** Cells to light up, [row, column] counting from 0 (not the head). */
      highlight?: [number, number][];
    };

/** An area model: rows times columns, each cell their product. For expanding and factoring. */
export interface GridFigure {
  kind: "grid";
  rows: Rich[];
  cols: Rich[];
  cells: Rich[][];
}

/** A function as a machine: in goes x, out comes f(x). A second machine shows composition. */
export interface MachineFigure {
  kind: "machine";
  rule: Rich;
  pairs: [input: string, output: string][];
  then?: { rule: Rich; pairs: [input: string, output: string][] };
}

/** A population and a sample drawn from it. */
export interface SampleFigure {
  kind: "sample";
  /** Random sample (spread over the whole population) or not (bunched in one corner). */
  random: boolean;
  /** The estimate and its margin ("62%", "±3%"), shown as a range. */
  estimate?: string;
  margin?: string;
  label?: string;
}

// ---------------------------------------------------------------- Reading and Writing

/** A short passage with marked spans. Each mark finds its exact text in the passage. */
export interface PassageFigure {
  kind: "passage";
  text: Rich;
  marks: { find: string; tone: Tone; note?: string }[];
}

/** Two short texts side by side, and how they relate. */
export interface TwoTextsFigure {
  kind: "twoTexts";
  a: { title: string; claim: Rich };
  b: { title: string; claim: Rich };
  relation: "agree" | "disagree" | "qualify" | "answer";
  note?: string;
}

/** A student's notes and a writing goal; the notes that serve the goal light up. */
export interface NotesFigure {
  kind: "notes";
  goal: Rich;
  notes: Rich[];
  /** Indexes of the notes the right answer uses. */
  pick: number[];
}

/** A transition as a road: the idea goes on, turns, causes, or steps forward. */
export interface RoadFigure {
  kind: "road";
  turn: "add" | "contrast" | "cause" | "sequence" | "example";
  before: Rich;
  after: Rich;
  word: string;
}

/** A sentence in blocks: its parts, the marks that join them, and an optional link between two parts
 *  (subject to verb, pronoun to noun, modifier to what it describes). */
export interface SentenceFigure {
  kind: "sentence";
  parts: {
    text: Rich;
    role?:
      | "main"
      | "dependent"
      | "extra"
      | "item"
      | "subject"
      | "verb"
      | "modifier"
      | "noun"
      | "other";
  }[];
  /** Marks after a part: the punctuation and whether it is right there. */
  joints?: { after: number; mark: string; ok: boolean }[];
  link?: { from: number; to: number; ok: boolean; label?: string };
}

/** Events on a timeline, for verb tense. */
export interface TimelineFigure {
  kind: "timeline";
  events: { label: Rich; at: "earlier past" | "past" | "now" | "future"; verb?: Rich }[];
}

/** A sentence with a blank, and words that might fill it; the one that fits drops in. */
export interface WordsFigure {
  kind: "words";
  sentence: Rich;
  words: { word: string; fit: boolean; note?: string }[];
}

export type Figure =
  | PlaneFigure
  | CircleFigure
  | TriangleFigure
  | AnglesFigure
  | SolidFigure
  | ShapeFigure
  | BalanceFigure
  | NumberLineFigure
  | TapeFigure
  | DataFigure
  | GridFigure
  | MachineFigure
  | SampleFigure
  | PassageFigure
  | TwoTextsFigure
  | NotesFigure
  | RoadFigure
  | SentenceFigure
  | TimelineFigure
  | WordsFigure;

export type FigureKind = Figure["kind"];
