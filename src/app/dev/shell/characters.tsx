// The characters' faces, drawn here in code on the fox's own grid and in the fox's manner: flat
// facets, a lighter left side and a darker right, the same dark eyes with a point of light, a little
// blush. The fox itself is the approved mark (Fox.tsx). The others are first drawings for the founder
// to judge (2026-11-16): the owl, the rabbit, the deer, the bear and the hedgehog. The rest of the 16
// are not drawn yet.
import type { ReactNode } from "react";
import { Fox } from "@/components/portal/Fox";

export type FaceKind = "fox" | "owl" | "rabbit" | "deer" | "bear" | "hedgehog";

const INK = "#24180F";
function Eyes({ x = 15, y = -28, r = 6 }: { x?: number; y?: number; r?: number }) {
  return (
    <>
      <ellipse cx={-x} cy={y} rx={r} ry={r * 1.13} fill={INK} />
      <ellipse cx={x} cy={y} rx={r} ry={r * 1.13} fill={INK} />
      <circle cx={-x + r * 0.4} cy={y - r * 0.47} r={r * 0.38} fill="#fff" />
      <circle cx={x + r * 0.4} cy={y - r * 0.47} r={r * 0.38} fill="#fff" />
    </>
  );
}
const Blush = ({ x = 27, y = -15 }: { x?: number; y?: number }) => (
  <>
    <ellipse cx={-x} cy={y} rx="6" ry="3.400" fill="#F28B7E" opacity="0.5" />
    <ellipse cx={x} cy={y} rx="6" ry="3.400" fill="#F28B7E" opacity="0.5" />
  </>
);
const Smile = ({ y = -6 }: { y?: number }) => (
  <path
    d={`M-4 ${y}Q0 ${y + 3} 4 ${y}`}
    stroke={INK}
    strokeWidth="1.800"
    fill="none"
    strokeLinecap="round"
  />
);

const FACES: Record<Exclude<FaceKind, "fox">, ReactNode> = {
  // ear tufts set wide apart, two great pale discs round the eyes, and a small beak
  owl: (
    <>
      <path d="M-36 -48L-44 -78L-14 -58Z" fill="#6f5238" />
      <path d="M36 -48L44 -78L14 -58Z" fill="#5c4330" />
      <path d="M-38 -52L0 -62L0 10L-28 3L-42 -24Z" fill="#a8845e" />
      <path d="M38 -52L0 -62L0 10L28 3L42 -24Z" fill="#8a6a4a" />
      <circle cx="-17" cy="-27" r="18" fill="#f6ead6" />
      <circle cx="17" cy="-27" r="18" fill="#ecdcc2" />
      <path d="M-8 -52L0 -40L8 -52L0 -58Z" fill="#6f5238" />
      <Eyes x={17} y={-27} r={8} />
      <path d="M-6 -15L6 -15L0 -3Z" fill="#e3a21a" />
      <path d="M0 -15L6 -15L0 -3Z" fill="#c4860d" />
      <path d="M-12 2L-6 6L0 2L6 6L12 2" stroke="#6f5238" strokeWidth="1.800" fill="none" />
    </>
  ),
  // two tall ears, a pale muzzle and two front teeth
  rabbit: (
    <>
      <path d="M-26 -48L-32 -108L-12 -102L-8 -54Z" fill="#ece5da" />
      <path d="M-23 -56L-27 -98L-16 -95L-13 -58Z" fill="#f2b9b1" />
      <path d="M26 -48L32 -108L12 -102L8 -54Z" fill="#d5cbbc" />
      <path d="M23 -56L27 -98L16 -95L13 -58Z" fill="#e3a59d" />
      <path d="M-34 -48L0 -58L0 10L-24 4L-38 -22Z" fill="#ece5da" />
      <path d="M34 -48L0 -58L0 10L24 4L38 -22Z" fill="#d5cbbc" />
      <path d="M-14 -14L0 -20L14 -14L10 3L0 7L-10 3Z" fill="#fffaf2" />
      <Eyes />
      <Blush />
      <path d="M-4 -14L4 -14L0 -9Z" fill="#d98a8a" />
      <path d="M0 -9V-5" stroke={INK} strokeWidth="1.600" strokeLinecap="round" />
      <path d="M-3.500 -5H3.500V1H-3.500Z" fill="#fff" stroke="#cfc5b6" strokeWidth="0.800" />
      <path d="M0 -5V1" stroke="#cfc5b6" strokeWidth="0.800" />
    </>
  ),
  // small antlers, ears out to the sides, pale spots on the brow and a dark nose
  deer: (
    <>
      <path
        d="M-15 -56L-21 -86L-15 -98M-20 -76L-32 -86M15 -56L21 -86L15 -98M20 -76L32 -86"
        stroke="#7a5a3a"
        strokeWidth="4.500"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M-32 -46L-58 -60L-40 -30Z" fill="#b07840" />
      <path d="M-37 -44L-52 -53L-42 -36Z" fill="#f3c9a8" />
      <path d="M32 -46L58 -60L40 -30Z" fill="#96622f" />
      <path d="M37 -44L52 -53L42 -36Z" fill="#e0b08a" />
      <path d="M-30 -52L0 -60L0 10L-16 4L-34 -28Z" fill="#c98f5a" />
      <path d="M30 -52L0 -60L0 10L16 4L34 -28Z" fill="#b07840" />
      <path d="M-12 -12L0 -18L12 -12L8 4L0 8L-8 4Z" fill="#fff3e0" />
      <circle cx="-9" cy="-46" r="2.200" fill="#fff3e0" />
      <circle cx="0" cy="-50" r="2.200" fill="#fff3e0" />
      <circle cx="9" cy="-46" r="2.200" fill="#fff3e0" />
      <Eyes x={16} y={-30} />
      <Blush x={25} y={-17} />
      <path d="M-6 -11L6 -11L0 -4Z" fill="#3a2a1c" />
      <Smile y={-1} />
    </>
  ),
  // round ears, a wide head and a pale muzzle
  bear: (
    <>
      <circle cx="-30" cy="-52" r="14" fill="#a37347" />
      <circle cx="-30" cy="-52" r="7" fill="#5c3a22" />
      <circle cx="30" cy="-52" r="14" fill="#8b5e3c" />
      <circle cx="30" cy="-52" r="7" fill="#4c2f1b" />
      <path d="M-38 -46L0 -58L0 12L-30 6L-44 -20Z" fill="#a37347" />
      <path d="M38 -46L0 -58L0 12L30 6L44 -20Z" fill="#8b5e3c" />
      <ellipse cx="0" cy="-7" rx="17" ry="13" fill="#ecd5b0" />
      <Eyes x={17} y={-30} r={5.2} />
      <Blush x={30} y={-16} />
      <ellipse cx="0" cy="-13" rx="6.500" ry="4.500" fill="#2a1c12" />
      <path
        d="M0 -8.500V-4M-5 -2Q0 2 5 -2"
        stroke="#2a1c12"
        strokeWidth="1.800"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
  // a crown of spines round a small pale face with a pointed nose
  hedgehog: (
    <>
      <path
        d="M-44 -4L-52 -24L-40 -30L-50 -50L-34 -48L-38 -68L-20 -58L-16 -78L0 -62L16 -78L20 -58L38 -68L34 -48L50 -50L40 -30L52 -24L44 -4Z"
        fill="#6f5238"
      />
      <path
        d="M-34 -8L-40 -26L-30 -30L-36 -46L-22 -42L-24 -58L-10 -48L0 -60L10 -48L24 -58L22 -42L36 -46L30 -30L40 -26L34 -8Z"
        fill="#96724f"
      />
      <circle cx="-25" cy="-36" r="6.500" fill="#d9b48c" />
      <circle cx="25" cy="-36" r="6.500" fill="#c9a37a" />
      <path d="M-28 -34L0 -44L0 12L-14 8L-30 -10Z" fill="#f4e1c6" />
      <path d="M28 -34L0 -44L0 12L14 8L30 -10Z" fill="#e6cdac" />
      <Eyes x={13} y={-22} r={5} />
      <Blush x={21} y={-11} />
      <path d="M-7 -8L7 -8L0 4Z" fill="#dcc09a" />
      <circle cx="0" cy="-1" r="4.200" fill="#2a1c12" />
    </>
  ),
};

export function Face({ kind, size }: { kind: FaceKind; size: number }) {
  if (kind === "fox") return <Fox size={size} />;
  return (
    <svg
      viewBox="-60 -112 120 128"
      width={size}
      height={(size * 128) / 120}
      aria-hidden="true"
      focusable="false"
    >
      {FACES[kind]}
    </svg>
  );
}
