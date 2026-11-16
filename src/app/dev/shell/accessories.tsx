// The things a character can wear: 200 of them (founder, 2026-11-16), drawn here in code. They are
// twenty kinds, each in ten colors, and every one is drawn against a few points measured on each
// face (the crown of the head, the eyes, the chin, a spot by the ear), so it sits properly on all
// sixteen characters. A character wears one thing in each place: head, eyes, neck, side.
// Every kind on every face can be seen on one sheet at /dev/shell/sheet.
import type { ReactNode } from "react";
import { Face, type FaceKind } from "./characters";

export type Slot = "head" | "eyes" | "neck" | "side";
export const SLOTS: Record<Slot, string> = {
  head: "Head",
  eyes: "Eyes",
  neck: "Neck",
  side: "Side",
};

/** Ten colors: a lit side and a shaded side of each. */
export const COLORWAYS = [
  ["Ruby", "#e0564a", "#b03a30"],
  ["Coral", "#f08a6a", "#cf6a4c"],
  ["Amber", "#f2a93b", "#c9861c"],
  ["Gold", "#f6c549", "#c98a0a"],
  ["Lime", "#9bcf5a", "#6fa53a"],
  ["Forest", "#38a47b", "#0a5a43"],
  ["Teal", "#3fb7b3", "#1f8a88"],
  ["Sky", "#6aa9e8", "#3f7fc4"],
  ["Violet", "#9a7fe0", "#6f55b8"],
  ["Slate", "#8a94a1", "#535c68"],
] as const;

/** Where things sit on a face: the crown of the head, the eyes (how far apart, how high, how big a
 *  lens they need), the chin, and a spot up by one ear. */
type Fit = {
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
  squirrel: { top: -54, eyeX: 14, eyeY: -32, lens: 10, chin: 6, side: [30, -48] },
  frog: { top: -50, eyeX: 21, eyeY: -46, lens: 12.5, chin: 12, side: [40, -24] },
  lynx: { top: -56, eyeX: 16, eyeY: -30, lens: 10.5, chin: 8, side: [32, -50] },
  koala: { top: -54, eyeX: 16, eyeY: -30, lens: 9.5, chin: 10, side: [30, -52] },
  stag: { top: -58, eyeX: 16, eyeY: -30, lens: 10.5, chin: 12, side: [30, -50] },
  tiger: { top: -56, eyeX: 16, eyeY: -30, lens: 10.5, chin: 10, side: [32, -48] },
  wolf: { top: -54, eyeX: 15, eyeY: -28, lens: 10.5, chin: 10, side: [31, -50] },
  badger: { top: -54, eyeX: 19, eyeY: -28, lens: 10, chin: 12, side: [36, -42] },
  redpanda: { top: -54, eyeX: 16, eyeY: -29, lens: 10.5, chin: 12, side: [34, -46] },
};

const INK = "#24180F";
const CREAM = "#fff8ee";
const STAR = "M0 -7L1.9 -2.2L7 -2.2L2.9 1L4.4 6L0 3L-4.4 6L-2.9 1L-7 -2.2L-1.900 -2.2Z";

/** A kind of thing: its name, where it is worn, and how it is drawn in a color on a face. */
type Kind = { name: string; slot: Slot; draw: (lit: string, dark: string, fit: Fit) => ReactNode };
const at = (x: number, y: number, body: ReactNode) => (
  <g transform={`translate(${x} ${y})`}>{body}</g>
);

const KINDS: Kind[] = [
  {
    name: "party hat",
    slot: "head",
    draw: (l, d, f) =>
      at(
        0,
        f.top,
        <>
          <path d="M-16 2L0 -44L0 2Z" fill={l} />
          <path d="M16 2L0 -44L0 2Z" fill={d} />
          <path d="M-12 -10L0 -14L12 -10L14 -3L0 -7L-14 -3Z" fill={CREAM} fillOpacity="0.9" />
          <circle cx="0" cy="-45" r="5" fill={CREAM} />
        </>
      ),
  },
  {
    name: "crown",
    slot: "head",
    draw: (l, d, f) =>
      at(
        0,
        f.top,
        <>
          <path d="M-22 4L-22 -20L-11 -8L0 -26L0 4Z" fill={l} />
          <path d="M22 4L22 -20L11 -8L0 -26L0 4Z" fill={d} />
          <path d="M-22 4H22V-1H-22Z" fill={INK} fillOpacity="0.22" />
          <path d="M-3 -6L0 -11L3 -6L0 -1Z" fill={CREAM} />
        </>
      ),
  },
  {
    name: "beanie",
    slot: "head",
    draw: (l, d, f) =>
      at(
        0,
        f.top,
        <>
          <path d="M-24 4C-24 -30 24 -30 24 4Z" fill={l} />
          <path d="M0 -21.500C16 -21.500 24 -12 24 4H0Z" fill={d} />
          <path d="M-26 -2H26V7H-26Z" fill={d} />
          <path d="M-18 -2V7M-9 -2V7M0 -2V7M9 -2V7M18 -2V7" stroke={l} strokeWidth="2" />
          <circle cx="0" cy="-25" r="6.500" fill={CREAM} />
        </>
      ),
  },
  {
    name: "top hat",
    slot: "head",
    draw: (l, d, f) =>
      at(
        0,
        f.top,
        <>
          <path d="M-16 0V-36H16V0Z" fill={l} />
          <path d="M0 0V-36H16V0Z" fill={d} />
          <path d="M-16 -12H16V-5H-16Z" fill={CREAM} fillOpacity="0.9" />
          <ellipse cx="0" cy="1" rx="27" ry="5" fill={d} />
          <ellipse cx="-6" cy="0" rx="18" ry="2.600" fill={l} />
        </>
      ),
  },
  {
    name: "cap",
    slot: "head",
    draw: (l, d, f) =>
      at(
        0,
        f.top,
        <>
          <path d="M-22 4C-22 -24 22 -24 22 4Z" fill={l} />
          <path d="M0 -17C14 -17 22 -8 22 4H0Z" fill={d} />
          <path d="M2 2C20 0 40 4 46 11L2 9Z" fill={d} />
          <circle cx="0" cy="-17.500" r="2.600" fill={CREAM} />
        </>
      ),
  },
  {
    name: "wizard hat",
    slot: "head",
    draw: (l, d, f) =>
      at(
        0,
        f.top,
        <>
          <path d="M-20 2L6 -46L0 2Z" fill={l} />
          <path d="M20 2L6 -46L0 2Z" fill={d} />
          <ellipse cx="0" cy="2" rx="29" ry="6" fill={d} />
          <ellipse cx="-6" cy="1" rx="19" ry="3" fill={l} />
          <path d={STAR} transform="translate(2 -17) scale(0.8)" fill="#ffe28a" />
        </>
      ),
  },
  {
    name: "graduation cap",
    slot: "head",
    draw: (l, d, f) =>
      at(
        0,
        f.top,
        <>
          <path d="M-16 -8V4H16V-8L0 -2Z" fill={d} />
          <path d="M-32 -12L0 -24L32 -12L0 0Z" fill={l} />
          <path d="M0 -24L32 -12L0 0Z" fill={d} fillOpacity="0.55" />
          <path d="M0 -12L24 -9V4" fill="none" stroke="#ffe28a" strokeWidth="1.800" />
          <path d="M21 4H27V11H21Z" fill="#f6c549" />
        </>
      ),
  },
  {
    name: "head bow",
    slot: "head",
    draw: (l, d, f) =>
      at(
        0,
        f.top,
        <>
          <path d="M0 -6C-10 -22 -26 -20 -24 -6C-26 8 -10 6 0 -2Z" fill={l} />
          <path d="M0 -6C10 -22 26 -20 24 -6C26 8 10 6 0 -2Z" fill={d} />
          <rect x="-5" y="-11" width="10" height="12" rx="4" fill={l} />
        </>
      ),
  },
  {
    name: "star band",
    slot: "head",
    draw: (l, d, f) =>
      at(
        0,
        f.top,
        <>
          <path
            d="M-27 8C-20 -8 20 -8 27 8"
            fill="none"
            stroke={d}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d={STAR}
            transform="translate(0 -6) scale(1.5)"
            fill={l}
            stroke={d}
            strokeWidth="0.800"
          />
        </>
      ),
  },
  {
    name: "cowboy hat",
    slot: "head",
    draw: (l, d, f) =>
      at(
        0,
        f.top,
        <>
          <path d="M-40 0C-30 12 30 12 40 0C30 -4 -30 -4 -40 0Z" fill={d} />
          <path d="M-18 2C-21 -24 -7 -30 0 -22C7 -30 21 -24 18 2Z" fill={l} />
          <path d="M0 -22C7 -30 21 -24 18 2H0Z" fill={d} fillOpacity="0.6" />
          <path d="M-18 -4H18V2H-18Z" fill={INK} fillOpacity="0.3" />
        </>
      ),
  },
  {
    name: "round glasses",
    slot: "eyes",
    draw: (l, d, f) => (
      <g fill="#ffffff" fillOpacity="0.22" stroke={d} strokeWidth="2.800" strokeLinecap="round">
        <circle cx={-f.eyeX} cy={f.eyeY} r={f.lens} />
        <circle cx={f.eyeX} cy={f.eyeY} r={f.lens} />
        <path
          d={`M${-f.eyeX + f.lens} ${f.eyeY}H${f.eyeX - f.lens}M${-f.eyeX - f.lens} ${f.eyeY - 2}l-9 -5M${f.eyeX + f.lens} ${f.eyeY - 2}l9 -5`}
          fill="none"
        />
      </g>
    ),
  },
  {
    name: "square glasses",
    slot: "eyes",
    draw: (l, d, f) => (
      <g
        fill="#ffffff"
        fillOpacity="0.22"
        stroke={d}
        strokeWidth="2.800"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect
          x={-f.eyeX - f.lens}
          y={f.eyeY - f.lens * 0.82}
          width={f.lens * 2}
          height={f.lens * 1.64}
          rx="3.500"
        />
        <rect
          x={f.eyeX - f.lens}
          y={f.eyeY - f.lens * 0.82}
          width={f.lens * 2}
          height={f.lens * 1.64}
          rx="3.500"
        />
        <path
          d={`M${-f.eyeX + f.lens} ${f.eyeY}H${f.eyeX - f.lens}M${-f.eyeX - f.lens} ${f.eyeY - 2}l-9 -5M${f.eyeX + f.lens} ${f.eyeY - 2}l9 -5`}
          fill="none"
        />
      </g>
    ),
  },
  {
    name: "sunglasses",
    slot: "eyes",
    draw: (l, d, f) => (
      <>
        <path
          d={`M${-f.eyeX - f.lens} ${f.eyeY - 6}H${-f.eyeX + f.lens}L${-f.eyeX + f.lens - 2} ${f.eyeY + f.lens * 0.8}H${-f.eyeX - f.lens + 3}ZM${f.eyeX - f.lens} ${f.eyeY - 6}H${f.eyeX + f.lens}L${f.eyeX + f.lens - 3} ${f.eyeY + f.lens * 0.8}H${f.eyeX - f.lens + 2}Z`}
          fill={d}
          stroke={INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d={`M${-f.eyeX + f.lens} ${f.eyeY - 5}H${f.eyeX - f.lens}M${-f.eyeX - f.lens} ${f.eyeY - 5}l-9 -4M${f.eyeX + f.lens} ${f.eyeY - 5}l9 -4`}
          stroke={INK}
          strokeWidth="2.600"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={`M${-f.eyeX - f.lens + 4} ${f.eyeY - 2}l5 -2M${f.eyeX - f.lens + 4} ${f.eyeY - 2}l5 -2`}
          stroke={l}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    name: "star glasses",
    slot: "eyes",
    draw: (l, d, f) => (
      <g stroke={d} strokeWidth="1.600" strokeLinejoin="round">
        <path
          d={STAR}
          transform={`translate(${-f.eyeX} ${f.eyeY}) scale(${f.lens / 5.4})`}
          fill={l}
          fillOpacity="0.5"
        />
        <path
          d={STAR}
          transform={`translate(${f.eyeX} ${f.eyeY}) scale(${f.lens / 5.4})`}
          fill={l}
          fillOpacity="0.5"
        />
        <path
          d={`M${-f.eyeX + f.lens * 0.7} ${f.eyeY}H${f.eyeX - f.lens * 0.7}`}
          strokeWidth="2.600"
        />
      </g>
    ),
  },
  {
    name: "bow tie",
    slot: "neck",
    draw: (l, d, f) =>
      at(
        0,
        f.chin + 2,
        <>
          <path d="M0 1L-17 -8V10Z" fill={l} />
          <path d="M0 1L17 -8V10Z" fill={d} />
          <rect x="-4" y="-4" width="8" height="10" rx="3" fill={d} />
        </>
      ),
  },
  {
    name: "scarf",
    slot: "neck",
    draw: (l, d, f) =>
      at(
        0,
        f.chin,
        <>
          <path d="M-27 -6C-12 4 12 4 27 -6L25 5C12 13 -12 13 -25 5Z" fill={l} />
          <path d="M6 6L10 20L22 17L18 4Z" fill={d} />
          <path d="M11 20V16M15 19V15M19 18V14" stroke={l} strokeWidth="1.600" />
        </>
      ),
  },
  {
    name: "bandana",
    slot: "neck",
    draw: (l, d, f) =>
      at(
        0,
        f.chin,
        <>
          <path d="M-24 -5L24 -5L0 17Z" fill={l} />
          <path d="M0 -5L24 -5L0 17Z" fill={d} />
          <circle cx="-9" cy="0" r="1.500" fill={CREAM} />
          <circle cx="0" cy="6" r="1.500" fill={CREAM} />
          <circle cx="9" cy="0" r="1.500" fill={CREAM} />
        </>
      ),
  },
  {
    name: "medal",
    slot: "neck",
    draw: (l, d, f) =>
      at(
        0,
        f.chin,
        <>
          <path d="M-11 -8L0 7" stroke={l} strokeWidth="5.500" />
          <path d="M11 -8L0 7" stroke={d} strokeWidth="5.500" />
          <circle cx="0" cy="11" r="7" fill="#f6c549" stroke="#a66f00" strokeWidth="1.200" />
          <path d={STAR} transform="translate(0 11.300) scale(0.55)" fill="#a66f00" />
        </>
      ),
  },
  {
    name: "flower",
    slot: "side",
    draw: (l, d, f) =>
      at(
        f.side[0],
        f.side[1],
        <>
          {[0, 72, 144, 216, 288].map((turn) => (
            <circle
              key={turn}
              cx="0"
              cy="-6.500"
              r="5.200"
              fill={turn % 144 ? l : d}
              transform={`rotate(${turn})`}
            />
          ))}
          <circle cx="0" cy="0" r="4" fill="#ffe28a" />
        </>
      ),
  },
  {
    name: "feather",
    slot: "side",
    draw: (l, d, f) =>
      at(
        f.side[0],
        f.side[1],
        <g transform="rotate(24)">
          <path d="M0 8C-10 -4 -8 -22 0 -32C8 -22 10 -4 0 8Z" fill={l} />
          <path d="M0 8C10 -4 8 -22 0 -32Z" fill={d} />
          <path d="M0 12V-30" stroke={CREAM} strokeWidth="1.300" />
        </g>
      ),
  },
];

export type Accessory = { id: string; name: string; slot: Slot; kind: number; color: number };
/** All 200: every kind in every color. */
export const ACCESSORIES: Accessory[] = KINDS.flatMap((kind, k) =>
  COLORWAYS.map(([color], c) => ({
    id: `${k}-${c}`,
    name: `${color} ${kind.name}`,
    slot: kind.slot,
    kind: k,
    color: c,
  }))
);
export const KIND_COUNT = KINDS.length;
const byId = new Map(ACCESSORIES.map((a) => [a.id, a]));
export const accessory = (id: string) => byId.get(id);

/** What is worn: one thing, or none, in each place. */
export type Outfit = Partial<Record<Slot, string>>;
/** Drawn back to front: a scarf under a hat's brim, glasses over everything. */
const ORDER: Slot[] = ["neck", "side", "head", "eyes"];

/** A character with what it is wearing. */
export function Dressed({ face, outfit, size }: { face: FaceKind; outfit: Outfit; size: number }) {
  const worn = ORDER.map((slot) => outfit[slot])
    .map((id) => (id ? byId.get(id) : undefined))
    .filter((a): a is Accessory => a !== undefined);
  return (
    <span
      style={{
        position: "relative",
        display: "block",
        flex: "none",
        width: size,
        height: (size * 128) / 120,
      }}
    >
      <Face kind={face} size={size} />
      {worn.length > 0 && (
        <svg
          viewBox="-60 -112 120 128"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
        >
          {worn.map((a) => (
            <g key={a.id}>
              {KINDS[a.kind].draw(COLORWAYS[a.color][1], COLORWAYS[a.color][2], FITS[face])}
            </g>
          ))}
        </svg>
      )}
    </span>
  );
}
