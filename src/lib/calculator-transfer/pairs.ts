// Coordinate pairs and function coordinates (c-transfer TR-15 to TR-17, TR-29, TR-30, TR-61,
// TR-62): their coordinates as TR-7 "coordinate" LaTeX (mixed numbers become improper fractions,
// TR-28), the TR-16 interval context, and the Point, Table row and Evaluate options a chooser
// offers. Lazy with the classifier (D4) and framework-free; no v2 imports (AR-3, TR-74).

import type { MathSegment } from "../../components/learn/math-segments";
import type { TransferChooser, TransferItem } from "./classify";
import { describeMath, plainMath } from "./describe";
import { lexQuestionMath, type QToken } from "./lex";
import { normalizeQuestionMath } from "./normalize";
import { isNumericConstantLatex } from "./segment";

const is = (t: QToken | undefined, kind: QToken["kind"], text?: string) =>
  t !== undefined && t.kind === kind && (text === undefined || t.text === text);

/** The text between two tokens of `latex`, trimmed. */
const between = (latex: string, from: QToken, to: QToken) => latex.slice(from.end, to.start).trim();

/** One numeric coordinate, or null (TR-15: pairs holding a name get no control). */
const coordinate = (text: string) => (isNumericConstantLatex(text) ? text : null);

/**
 * TR-15, TR-28: the coordinates of `raw` (one segment's source LaTeX) read as a list of pairs,
 * point labels dropped, each normalised in the "coordinate" context; null unless every
 * coordinate is a numeric constant.
 */
export function pairCoordinates(raw: string): [string, string][] | null {
  const latex = normalizeQuestionMath(raw, "coordinate");
  const lexed = lexQuestionMath(latex);
  if (!lexed.ok) return null;
  const t = lexed.tokens;
  const pairs: [string, string][] = [];
  let k = 0;
  while (k < t.length) {
    if (pairs.length > 0) {
      if (!is(t[k], "comma") && !is(t[k], "semi")) return null;
      k++;
    }
    if (is(t[k], "name") && /^[A-Z]$/.test(t[k].text)) k++; // a point label
    const open = t[k];
    if (!is(open, "open", "(")) return null;
    let depth = 0;
    let comma: QToken | null = null;
    let close: QToken | null = null;
    for (k++; k < t.length && close === null; k++) {
      const token = t[k];
      if (token.kind === "open" || token.kind === "absOpen") depth++;
      else if (token.kind === "absClose") depth--;
      else if (token.kind === "close") {
        if (depth === 0) close = token;
        else depth--;
      } else if (depth === 0 && token.kind === "comma") {
        if (comma !== null) return null;
        comma = token;
      }
    }
    if (comma === null || close === null) return null;
    const x = coordinate(between(latex, open, comma));
    const y = coordinate(between(latex, comma, close));
    if (x === null || y === null) return null;
    pairs.push([x, y]);
  }
  return pairs.length > 0 ? pairs : null;
}

/** TR-17: `name(a)=b` read as its name and "coordinate" LaTeX a and b, or null. */
export function functionCoordinateParts(
  raw: string
): { name: string; a: string; b: string } | null {
  const latex = normalizeQuestionMath(raw, "coordinate");
  const lexed = lexQuestionMath(latex);
  if (!lexed.ok) return null;
  const t = lexed.tokens;
  const equals = t.findIndex((token) => is(token, "rel", "="));
  const close = t[equals - 1];
  if (!is(t[0], "name") || !is(t[1], "open", "(") || !is(close, "close", ")")) return null;
  const a = coordinate(between(latex, t[1], close));
  const b = coordinate(latex.slice(t[equals].end).trim());
  return a === null || b === null ? null : { name: t[0].text, a, b };
}

/** TR-16: the prose before segment `index` in its sentence names an interval, domain or range. */
export function inIntervalContext(segments: readonly MathSegment[], index: number): boolean {
  let prose = "";
  for (let k = index - 1; k >= 0; k--) {
    const s = segments[k];
    if (s.kind !== "text") continue;
    const end = Math.max(
      s.value.lastIndexOf(". "),
      s.value.lastIndexOf("? "),
      s.value.lastIndexOf("! ")
    );
    prose = (end >= 0 ? s.value.slice(end + 2) : s.value) + prose;
    if (end >= 0) break;
  }
  return /\b(?:interval|domain|range)\b/i.test(prose);
}

export const pointRow = ([x, y]: readonly [string, string]) => `(${x},${y})`;

type ItemPayload = TransferItem["payload"];

function chooserItem(
  sourceId: string,
  kind: "pair" | "functionCoordinate",
  description: string,
  pairs: readonly [string, string][],
  pointTableKey: string,
  evaluate: TransferChooser["evaluate"]
): TransferItem {
  const common = { version: 1, sourceId, description } as const;
  const point: ItemPayload = {
    ...common,
    format: "point",
    dependencies: [],
    rows: pairs.map(pointRow),
  };
  const tableRow: ItemPayload = {
    ...common,
    format: "tableRow",
    dependencies: [],
    pairs: pairs.map(([x, y]): [string, string] => [x, y]),
    pointTableKey,
  };
  return {
    sourceId,
    kind,
    ruleId: kind === "pair" ? "TR-15" : "TR-17",
    description,
    payload: point,
    chooser: { point: { ...point }, tableRow, evaluate },
  };
}

/** TR-15, TR-29: a coordinate-pair item ("point (a, b)" or "n points", table 8.1). */
export function pairItem(
  sourceId: string,
  pairs: readonly [string, string][],
  description?: string
): TransferItem {
  const [first] = pairs;
  const text =
    description ??
    (pairs.length === 1
      ? `point (${plainMath(first[0])}, ${plainMath(first[1])})`
      : `${pairs.length} points`);
  return chooserItem(sourceId, "pair", text, pairs, "points", null);
}

/** TR-17, TR-30, TR-61, TR-62: a function-coordinate item; Evaluate shows disabled with `reason`
 * until TR-31 ships. */
export function functionCoordinateItem(
  sourceId: string,
  parts: { name: string; a: string; b: string },
  reason: string,
  description?: string
): TransferItem {
  const { name, a, b } = parts;
  const label = `Evaluate ${plainMath(`${name}(${a})`)}`;
  const text = description ?? describeMath(`${name}(${a})=${b}`);
  return chooserItem(sourceId, "functionCoordinate", text, [[a, b]], name, { label, reason });
}

/** TR-62's reasons, with the item's real names. */
export const EVALUATE_REASONS = {
  undefined: (f: string) => `${plainMath(f)} isn't defined in the calculator or this question`,
  usesName: (f: string, name: string) =>
    `${plainMath(f)} uses ${plainMath(name)}, which has no value`,
  ambiguous: (f: string) => `${plainMath(f)} has more than one definition in this question`,
  noValue: (f: string, a: string) => `${plainMath(`${f}(${a})`)} has no value in the calculator`,
} as const;
