// Karman, drawn for the stage of a skill (TailsStage.tsx): sitting up with his tails behind him, or
// curled up asleep before the skill is started. All in the approved mark's manner (Fox.tsx): flat
// facets, the left lighter and the right darker, a pale stroke along the light edge, the same ink.
// The drawing's box is 280 wide, the middle at 0; up is minus.
import { HEAD } from "@/components/portal/Fox";
import { FOXFIRE, GOLD, WARM } from "./stageFx";
import t from "./tailsStage.module.css";

export const BOX: [number, number, number, number] = [-140, -150, 280, 280];
/** Where the tails grow from, behind the sitting body. */
export const ROOT = { x: 0, y: 46 };
/** Where he sits and where he lies, for growing and squashing from the ground. */
export const GROUND = 74;
/** Each level's tails, by index: the angle (degrees, clockwise from straight up) and the length.
 *  Asleep, his one tail is drawn wrapped round him (Curled), so the sitting fox has none. */
export const LAYOUT: { a: number; s: number }[][] = [
  [],
  [
    { a: -36, s: 1 },
    { a: 36, s: 1 },
  ],
  [
    { a: -62, s: 0.94 },
    { a: 62, s: 0.94 },
    { a: -22, s: 1.04 },
    { a: 22, s: 1.04 },
  ],
  [
    { a: -84, s: 0.84 },
    { a: 84, s: 0.84 },
    { a: -42, s: 0.98 },
    { a: 42, s: 0.98 },
    { a: -63, s: 0.91 },
    { a: 63, s: 0.91 },
    { a: -21, s: 1.04 },
    { a: 21, s: 1.04 },
    { a: 0, s: 1.08 },
  ],
];
/** The middle tails are drawn first, so the outer ones lie over them. */
export const ORDER = [8, 6, 7, 2, 3, 4, 5, 0, 1];
/** Each level's light at the tips, and the tips' own color. */
export const TIP = [WARM, [1, 0.8, 0.48], FOXFIRE, GOLD];
export const TIP_FILL = ["#FFF8EE", "#FFF8EE", "#DCEBFF", "#FFE7A0"];
/** Where a tail's tip glows, along it. */
export const TIP_AT = 122;

export type TailState = { a: number; s: number; o: number };

export function tailTransform(s: TailState, sway = 0) {
  return `translate(${ROOT.x} ${ROOT.y}) rotate(${s.a + sway}) scale(${s.s})`;
}

/** Where a tail's tip glow is, in the drawing. */
export function tipOf(s: { a: number; s: number }, sway = 0) {
  const r = ((s.a + sway) * Math.PI) / 180;
  return { x: ROOT.x + Math.sin(r) * TIP_AT * s.s, y: ROOT.y - Math.cos(r) * TIP_AT * s.s };
}

/** One tail, pointing straight up from its root at 0, 0: long and bushy, fullest past the middle,
 *  with a broad white tip. */
export function Tail({ fill }: { fill: string }) {
  return (
    <>
      <path d="M-9 0 L-36 -44 L-38 -96 L-20 -130 L0 -152 L0 0Z" fill="#E89A2C" />
      <path d="M-36 -44 L-38 -96 L-14 -70Z" fill="#F6B652" />
      <path d="M-9 0 L-36 -44 L-14 -36Z" fill="#F6B652" opacity="0.6" />
      <path d="M9 0 L36 -44 L38 -96 L20 -130 L0 -152 L0 0Z" fill="#CC8020" />
      <path d="M36 -44 L38 -96 L14 -70Z" fill="#B87018" opacity="0.7" />
      <path d="M0 -20 L14 -36 L0 -60Z" fill="#B87018" opacity="0.35" />
      <path d="M-38 -96 L-20 -130 L0 -152 L20 -130 L38 -96 L0 -86Z" fill={fill} data-tip />
      <path d="M0 -152 L20 -130 L38 -96 L0 -86Z" fill="#000" opacity="0.08" />
      <path
        d="M-9 0 L-36 -44 L-38 -96 L-20 -130 L0 -152"
        stroke="#fff"
        strokeWidth="1"
        opacity="0.28"
        fill="none"
      />
    </>
  );
}

/** The body Karman sits on, under the approved head. */
export function Body() {
  return (
    <>
      <path d="M-26 -2 L0 -2 L0 72 L-38 72 L-46 50Z" fill="#E89A2C" />
      <path d="M26 -2 L0 -2 L0 72 L38 72 L46 50Z" fill="#CC8020" />
      <path d="M-46 50 L-30 28 L-26 72 L-38 72Z" fill="#F6B652" />
      <path d="M-18 0 L18 0 L10 40 L0 52 L-10 40Z" fill="#FFF8EE" />
      <path d="M0 0 L18 0 L10 40 L0 52Z" fill="#000" opacity="0.05" />
      <path d="M-17 30 L-6 30 L-6 72 L-17 72Z" fill="#E89A2C" />
      <path d="M6 30 L17 30 L17 72 L6 72Z" fill="#CC8020" />
      <path d="M-18 61 L-5 61 L-5 73 L-18 73Z M5 61 L18 61 L18 73 L5 73Z" fill="#2A2A2A" />
      <path d="M-46 50 L-26 -2" stroke="#fff" strokeWidth="1" opacity="0.28" />
    </>
  );
}

/** The approved head, with closed eyes for sleep and closed smiling eyes for joy, both hidden
 *  until the fox's state shows them (tailsStage.module.css). */
export function Head() {
  return (
    <>
      <g dangerouslySetInnerHTML={{ __html: HEAD }} />
      <path
        className={t.shut}
        d="M-21 -29 Q-15 -23 -9 -29 M9 -29 Q15 -23 21 -29"
        stroke="#24180F"
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        className={t.happy}
        d="M-21 -27 Q-15 -35 -9 -27 M9 -27 Q15 -35 21 -27"
        stroke="#24180F"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </>
  );
}

/** Where his head rests while he sleeps, and how it lifts as he wakes (0 asleep, 1 awake). */
export const curledHead = (wake: number) =>
  `translate(${52 - wake * 4} ${20 - wake * 16}) rotate(${12 - wake * 16}) scale(0.8)`;

/** Asleep (founder, 2026-11-20, from his picture of a sleeping fox): curled into a round ball, his
 *  back a soft mound, his thick tail wrapped right round the front of him with its white tip swept
 *  up under his chin, his head resting on it at the right, eyes shut, and his dark paws tucked in by
 *  his nose. */
export function Curled({ head = curledHead(0) }: { head?: string }) {
  return (
    <>
      {/* his back, a round faceted mound */}
      <path d="M-100 56 L-96 20 L-70 -4 L-30 -16 L6 -16 L6 50 L-70 54Z" fill="#E89A2C" />
      <path d="M-96 20 L-70 -4 L-30 -16 L-52 12Z" fill="#F6B652" />
      <path d="M6 -16 L36 -10 L58 6 L50 46 L6 50Z" fill="#CC8020" />
      {/* his haunch, folded under */}
      <path d="M-74 26 L-44 6 L-22 22 L-34 46 L-66 46Z" fill="#DD8F24" />
      <path
        d="M-74 26 L-44 6 L-22 22"
        stroke="#B87018"
        strokeWidth="1.6"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M-100 56 L-96 20 L-70 -4 L-30 -16 L6 -16 L36 -10"
        stroke="#fff"
        strokeWidth="1"
        opacity="0.28"
        fill="none"
      />
      {/* his tail, thick, wrapped round the front from behind on the left */}
      <path
        d="M-100 56 L-104 30 L-86 40 L-64 52 L-24 58 L16 58 L50 50 L84 44 L94 64 L72 86 L30 98 L-20 98 L-62 88 L-90 74Z"
        fill="#E89A2C"
      />
      <path d="M-104 30 L-86 40 L-64 52 L-90 74 L-100 56Z" fill="#F6B652" />
      <path d="M-90 74 L-62 88 L-20 98 L30 98 L20 84 L-30 84 L-66 74Z" fill="#CC8020" />
      <path d="M-64 52 L-24 58 L-36 70Z" fill="#F6B652" opacity="0.7" />
      {/* its white tip, swept up under his chin */}
      <path
        d="M16 58 L50 50 L84 44 L100 28 L106 48 L94 64 L72 86 L30 98 L20 84 L28 70Z"
        fill="#FFF8EE"
      />
      <path d="M94 64 L72 86 L30 98 L20 84 L60 76Z" fill="#000" opacity="0.06" />
      <path
        d="M-104 30 L-86 40 L-64 52 L-24 58 L16 58 L50 50 L84 44 L100 28"
        stroke="#fff"
        strokeWidth="1"
        opacity="0.35"
        fill="none"
      />
      {/* his head, resting on it */}
      <g data-curled-head transform={head}>
        <Head />
      </g>
      {/* his paws, tucked in by his nose */}
      <g data-paws>
        <path d="M44 34 L58 30 L64 40 L50 46Z" fill="#2A2A2A" />
        <path d="M60 36 L74 32 L80 42 L66 47Z" fill="#33302E" />
      </g>
    </>
  );
}
