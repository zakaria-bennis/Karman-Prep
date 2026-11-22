// What the accessory drawings share: where things sit on each face, and short ways to draw.
import type { ReactNode } from "react";
import type { FaceKind } from "./characters";

export type Slot = "head" | "eyes" | "neck" | "side";

/** Where things sit on a face: the crown of the head, the eyes (how far apart, how high, how big a
 *  lens they need), the chin, and a spot up by one ear. */
export type Fit = {
  top: number;
  eyeX: number;
  eyeY: number;
  lens: number;
  chin: number;
  side: [number, number];
};
export const FITS: Record<FaceKind, Fit> = {
  fox: { top: -54, eyeX: 15, eyeY: -28, lens: 10.5, chin: 8, side: [31, -50] },
  owl: { top: -58, eyeX: 17, eyeY: -27, lens: 13, chin: 10, side: [34, -50] },
  rabbit: { top: -54, eyeX: 15, eyeY: -28, lens: 10.5, chin: 10, side: [32, -46] },
  deer: { top: -56, eyeX: 16, eyeY: -30, lens: 10.5, chin: 10, side: [30, -50] },
  hedgehog: { top: -58, eyeX: 13, eyeY: -22, lens: 9, chin: 12, side: [32, -48] },
  bear: { top: -54, eyeX: 17, eyeY: -30, lens: 10, chin: 12, side: [36, -44] },
  otter: { top: -48, eyeX: 16, eyeY: -30, lens: 10, chin: 4, side: [36, -42] },
  squirrel: { top: -54, eyeX: 15, eyeY: -32, lens: 10, chin: 6, side: [30, -48] },
  frog: { top: -50, eyeX: 21, eyeY: -46, lens: 12.5, chin: 12, side: [40, -24] },
  lynx: { top: -56, eyeX: 16, eyeY: -30, lens: 10.5, chin: 8, side: [32, -50] },
  koala: { top: -54, eyeX: 16, eyeY: -30, lens: 9.5, chin: 10, side: [30, -52] },
  stag: { top: -58, eyeX: 16, eyeY: -30, lens: 10.5, chin: 12, side: [30, -50] },
  tiger: { top: -56, eyeX: 16, eyeY: -30, lens: 10.5, chin: 10, side: [32, -48] },
  wolf: { top: -54, eyeX: 15, eyeY: -28, lens: 10.5, chin: 10, side: [31, -50] },
  badger: { top: -54, eyeX: 19, eyeY: -28, lens: 10, chin: 12, side: [36, -42] },
  redpanda: { top: -54, eyeX: 16, eyeY: -29, lens: 10.5, chin: 12, side: [34, -46] },
};

/** One thing to wear: its name, where it is worn, and how it is drawn on a face. */
export type Kind = { name: string; slot: Slot; draw: (f: Fit) => ReactNode };

export const INK = "#24180F";
export const CREAM = "#fff8ee";
export const GOLD = "#f6c549";
export const GOLD_D = "#c98a0a";
export const STAR = "M0 -7L1.9 -2.2L7 -2.2L2.9 1L4.4 6L0 3L-4.4 6L-2.9 1L-7 -2.2L-1.900 -2.2Z";
export const HEART =
  "M0 6C-9 -1 -8 -8 -3.500 -8C-1.500 -8 0 -6.500 0 -5C0 -6.500 1.500 -8 3.500 -8C8 -8 9 -1 0 6Z";

type More = Record<string, string | number>;
/** A `key` given with the other attributes is handed to React itself, not spread onto the shape. */
const split = ({ key, ...rest }: More) => ({ key: key as string | number | undefined, rest });

/** A filled shape. */
export const p = (d: string, fill: string, more: More = {}) => {
  const { key, rest } = split(more);
  return <path key={key} d={d} fill={fill} {...rest} />;
};
/** A line. */
export const l = (d: string, stroke: string, width = 2, more: More = {}) => {
  const { key, rest } = split(more);
  return (
    <path
      key={key}
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    />
  );
};
export const c = (cx: number, cy: number, r: number, fill: string, more: More = {}) => {
  const { key, rest } = split(more);
  return <circle key={key} cx={cx} cy={cy} r={r} fill={fill} {...rest} />;
};
export const e = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string,
  more: More = {}
) => {
  const { key, rest } = split(more);
  return <ellipse key={key} cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} {...rest} />;
};
/** Moves a drawing to a point, and can turn or size it. */
export const at = (x: number, y: number, body: ReactNode, more = "") => (
  <g transform={`translate(${x} ${y}) ${more}`}>{body}</g>
);
/** On the crown of the head. */
export const head = (name: string, body: ReactNode): Kind => ({
  name,
  slot: "head",
  draw: (f) => at(0, f.top, body),
});
/** At the chin. */
export const neck = (name: string, body: ReactNode): Kind => ({
  name,
  slot: "neck",
  draw: (f) => at(0, f.chin, body),
});
/** Up by one ear. */
export const side = (name: string, body: ReactNode): Kind => ({
  name,
  slot: "side",
  draw: (f) => at(f.side[0], f.side[1], body),
});
/** Over the eyes: the drawing is made for one eye and set over each, sized to the face's lens, with
 *  a bridge between them if asked. `mirror` flips the second so a slanted shape slants outward. */
export const eyes = (
  name: string,
  lens: ReactNode,
  {
    bridge = INK,
    arms = true,
    mirror = false,
  }: { bridge?: string | null; arms?: boolean; mirror?: boolean } = {}
): Kind => ({
  name,
  slot: "eyes",
  draw: (f) => {
    const s = f.lens / 10;
    return (
      <>
        {bridge &&
          l(
            `M${-f.eyeX + f.lens * 0.9} ${f.eyeY - 1}H${f.eyeX - f.lens * 0.9}${arms ? `M${-f.eyeX - f.lens * 0.95} ${f.eyeY - 2}l-8 -5M${f.eyeX + f.lens * 0.95} ${f.eyeY - 2}l8 -5` : ""}`,
            bridge,
            2.6
          )}
        {at(-f.eyeX, f.eyeY, lens, `scale(${s})`)}
        {at(f.eyeX, f.eyeY, lens, `scale(${mirror ? -s : s} ${s})`)}
      </>
    );
  },
});
