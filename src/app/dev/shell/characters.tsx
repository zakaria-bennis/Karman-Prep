// The characters' faces, drawn here in code on the fox's own grid and in the fox's manner: flat
// facets, a lighter left side and a darker right, the same dark eyes with a point of light, a little
// blush. The fox itself is the approved mark (Fox.tsx). The other fifteen are first drawings for the
// founder to judge (2026-11-16). The last three (red panda, stag, phoenix) are seen only as black
// shapes until they are unlocked, so their outlines matter most.
import type { ReactNode } from "react";
import { Fox } from "@/components/portal/Fox";

export type FaceKind =
  | "fox"
  | "owl"
  | "rabbit"
  | "deer"
  | "bear"
  | "hedgehog"
  | "otter"
  | "squirrel"
  | "heron"
  | "badger"
  | "lynx"
  | "wolf"
  | "crane"
  | "redpanda"
  | "stag"
  | "phoenix";

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
  // a wide flat head, small ears, long whiskers, and a pebble held at its chin in both paws
  otter: (
    <>
      <circle cx="-36" cy="-38" r="7" fill="#6f4f37" />
      <circle cx="36" cy="-38" r="7" fill="#5c4130" />
      <path d="M-40 -42L0 -52L0 6L-30 2L-46 -18Z" fill="#9a7352" />
      <path d="M40 -42L0 -52L0 6L30 2L46 -18Z" fill="#84603f" />
      <path d="M-30 -16L0 -26L30 -16L24 0L0 6L-24 0Z" fill="#f3e4cb" />
      <path
        d="M-22 -11L-50 -8M-22 -7L-48 3M22 -11L50 -8M22 -7L48 3"
        stroke="#5c4130"
        strokeWidth="1.500"
        strokeLinecap="round"
        fill="none"
      />
      <Eyes x={16} y={-30} r={5.5} />
      <ellipse cx="0" cy="-16" rx="8" ry="5" fill="#2a1c12" />
      <path
        d="M0 -11V-8M-5 -6Q0 -3 5 -6"
        stroke="#2a1c12"
        strokeWidth="1.800"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="0" cy="9" rx="10" ry="6" fill="#a9adb3" />
      <ellipse cx="-2" cy="7.500" rx="5" ry="2.200" fill="#d3d6da" />
      <ellipse cx="-10" cy="8" rx="5.500" ry="4.500" fill="#84603f" />
      <ellipse cx="10" cy="8" rx="5.500" ry="4.500" fill="#6f4f37" />
    </>
  ),
  // a great bushy tail curling up behind, tufted ears, full cheeks, and an acorn at its chin
  squirrel: (
    <>
      <path d="M24 8C58 6 60 -44 42 -64C32 -74 18 -66 24 -54C38 -40 38 -14 18 0Z" fill="#b9722b" />
      <path d="M30 0C50 -6 52 -40 40 -56C44 -38 42 -16 24 -4Z" fill="#e8b06a" />
      <path d="M-28 -44L-34 -80L-12 -56Z" fill="#b9722b" />
      <path d="M-34 -80L-31 -68L-24 -72Z" fill="#7a4416" />
      <path d="M14 -56L22 -80L26 -46Z" fill="#a05f20" />
      <path d="M-34 -48L0 -58L0 6L-22 2L-40 -22Z" fill="#d08a3e" />
      <path d="M30 -46L0 -58L0 6L22 2L36 -22Z" fill="#c07a30" />
      <ellipse cx="-19" cy="-10" rx="14" ry="12" fill="#f8e8cc" />
      <ellipse cx="17" cy="-10" rx="13" ry="12" fill="#efdab6" />
      <path d="M-9 -18L0 -23L9 -18L0 0Z" fill="#f8e8cc" />
      <Eyes x={14} y={-32} />
      <path d="M-4 -17L4 -17L0 -12Z" fill="#5a3414" />
      <path d="M-8 1H8L6 6H-6Z" fill="#7a4416" />
      <path d="M-6 6H6L0 15Z" fill="#d9a25a" />
      <path d="M0 1V-3" stroke="#7a4416" strokeWidth="1.800" strokeLinecap="round" />
    </>
  ),
  // seen from the side: a long neck, a dagger of a bill, and a dark plume trailing from the brow
  heron: (
    <>
      <path
        d="M-22 16C-40 -12 -4 -22 -14 -46"
        stroke="#9fb2c4"
        strokeWidth="15"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M-18 16C-36 -12 0 -22 -10 -46"
        stroke="#f3f5f8"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="-8" cy="-52" rx="17" ry="13" fill="#f3f5f8" />
      <path d="M6 -58L56 -50L6 -52Z" fill="#f2c14e" />
      <path d="M6 -52L56 -50L6 -45Z" fill="#c4860d" />
      <path d="M4 -61C-10 -70 -30 -62 -54 -76L-50 -66C-34 -58 -18 -56 -4 -56Z" fill="#2b3440" />
      <path d="M-24 -58L-56 -60" stroke="#2b3440" strokeWidth="3" strokeLinecap="round" />
      <circle cx="-1" cy="-53" r="4" fill="#f2c14e" />
      <circle cx="-1" cy="-53" r="2" fill={INK} />
    </>
  ),
  // a white face with two dark stripes running down through the eyes
  badger: (
    <>
      <circle cx="-31" cy="-48" r="9.500" fill="#2b2622" />
      <circle cx="-31" cy="-48" r="4.500" fill="#f7f3ea" />
      <circle cx="31" cy="-48" r="9.500" fill="#1f1b18" />
      <circle cx="31" cy="-48" r="4.500" fill="#e9e3d6" />
      <path d="M-38 -46L0 -56L0 12L-18 6L-44 -16Z" fill="#f7f3ea" />
      <path d="M38 -46L0 -56L0 12L18 6L44 -16Z" fill="#e9e3d6" />
      <path d="M-32 -50L-9 -54L-9 -6L-22 2L-40 -18Z" fill="#2b2622" />
      <path d="M32 -50L9 -54L9 -6L22 2L40 -18Z" fill="#1f1b18" />
      <circle cx="-19" cy="-28" r="6.500" fill="#4a423c" />
      <circle cx="19" cy="-28" r="6.500" fill="#3d3631" />
      <Eyes x={19} y={-28} r={5} />
      <path d="M-7 -6L7 -6L0 3Z" fill="#2b2622" />
      <Smile y={5} />
    </>
  ),
  // a wide cat's face: long dark ear tufts, ragged ruffs at the cheeks, stripes on the brow
  lynx: (
    <>
      <path
        d="M-35 -76L-44 -104M35 -76L44 -104"
        stroke="#2b2622"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M-30 -44L-36 -80L-12 -56Z" fill="#b89d77" />
      <path d="M-29 -50L-33 -70L-18 -57Z" fill="#3a2f25" />
      <path d="M30 -44L36 -80L12 -56Z" fill="#a08660" />
      <path d="M29 -50L33 -70L18 -57Z" fill="#2b2622" />
      <path d="M-36 -28L-58 -12L-46 -10L-56 6L-40 2L-34 12L-24 -2Z" fill="#efe3cd" />
      <path d="M36 -28L58 -12L46 -10L56 6L40 2L34 12L24 -2Z" fill="#e0d1b4" />
      <path
        d="M-58 -12L-50 -14L-52 -8ZM-56 6L-48 2L-50 8ZM58 -12L50 -14L52 -8ZM56 6L48 2L50 8Z"
        fill="#3a2f25"
      />
      <path d="M-36 -48L0 -58L0 8L-22 4L-40 -22Z" fill="#cdb48f" />
      <path d="M36 -48L0 -58L0 8L22 4L40 -22Z" fill="#b89d77" />
      <path
        d="M-7 -54L-5 -43M0 -56L0 -44M7 -54L5 -43"
        stroke="#5c4a32"
        strokeWidth="2.600"
        strokeLinecap="round"
      />
      <path d="M-14 -14L0 -21L14 -14L9 2L0 6L-9 2Z" fill="#f6ecd9" />
      <circle cx="-9" cy="-6" r="1.200" fill="#5c4a32" />
      <circle cx="-13" cy="-10" r="1.200" fill="#5c4a32" />
      <circle cx="9" cy="-6" r="1.200" fill="#5c4a32" />
      <circle cx="13" cy="-10" r="1.200" fill="#5c4a32" />
      <Eyes x={16} y={-30} />
      <path d="M-4.500 -15L4.500 -15L0 -9.500Z" fill="#c06a6a" />
      <path
        d="M0 -9.500V-6M-4 -4Q0 -1 4 -4"
        stroke={INK}
        strokeWidth="1.700"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
  // the fox's cousin in gray: taller ears, a longer pale mask
  wolf: (
    <>
      <path d="M-30 -42L-36 -84L-8 -56Z" fill="#8e959c" />
      <path d="M-29 -48L-33 -72L-16 -57Z" fill="#dfe3e6" />
      <path d="M30 -42L36 -84L8 -56Z" fill="#6c737b" />
      <path d="M29 -48L33 -72L16 -57Z" fill="#c9cfd4" />
      <path d="M-40 -32L0 -58L40 -32L0 -26Z" fill="#a9b0b7" />
      <path d="M-40 -32L0 -26L-4 10L-30 0Z" fill="#8e959c" />
      <path d="M40 -32L0 -26L4 10L30 0Z" fill="#737a82" />
      <path d="M-40 -32L-16 -14L0 10L-30 0ZM40 -32L16 -14L0 10L30 0Z" fill="#f3f3f0" />
      <path d="M-16 -14L0 -24L16 -14L0 10Z" fill="#f3f3f0" />
      <Eyes x={15} y={-28} />
      <path d="M-6 -13L6 -13L0 -6Z" fill="#24180F" />
      <Smile y={-2} />
    </>
  ),
  // seen from the side: a white neck with a dark stripe, a red crown and a gray bill
  crane: (
    <>
      <path
        d="M-20 16C-34 -14 -6 -22 -12 -46"
        stroke="#f7f5f0"
        strokeWidth="15"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M-12 16C-26 -12 2 -22 -4 -42"
        stroke="#2b2622"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="-6" cy="-52" rx="16" ry="12.500" fill="#f7f5f0" />
      <path d="M-20 -57C-14 -70 4 -70 9 -58C2 -62 -10 -62 -20 -55Z" fill="#c8553d" />
      <path d="M-1 -49C-8 -46 -12 -42 -10 -36L-2 -42Z" fill="#2b2622" />
      <path d="M8 -57L46 -51L8 -52Z" fill="#aab1b8" />
      <path d="M8 -52L46 -51L8 -46Z" fill="#737a82" />
      <circle cx="0" cy="-54" r="3.600" fill="#c8553d" />
      <circle cx="0" cy="-54" r="1.900" fill={INK} />
    </>
  ),
  // wide pale ears, a rust head, white brows and cheeks, and dark marks under the eyes
  redpanda: (
    <>
      <path d="M-30 -42L-50 -72L-14 -58Z" fill="#fbf3e6" />
      <path d="M-31 -48L-43 -66L-21 -57Z" fill="#b85a22" />
      <path d="M30 -42L50 -72L14 -58Z" fill="#efe4d2" />
      <path d="M31 -48L43 -66L21 -57Z" fill="#9c4a1a" />
      <path d="M-40 -44L0 -56L0 12L-28 6L-46 -18Z" fill="#cf6a2c" />
      <path d="M40 -44L0 -56L0 12L28 6L46 -18Z" fill="#b85a22" />
      <path d="M-46 -18L-22 -16L-10 6L-28 6Z" fill="#fbf3e6" />
      <path d="M46 -18L22 -16L10 6L28 6Z" fill="#efe4d2" />
      <circle cx="-15" cy="-43" r="4.500" fill="#fbf3e6" />
      <circle cx="15" cy="-43" r="4.500" fill="#efe4d2" />
      <path d="M-19 -22L-13 -8L-24 -8Z" fill="#8a3f16" />
      <path d="M19 -22L13 -8L24 -8Z" fill="#7a3612" />
      <ellipse cx="0" cy="-7" rx="13" ry="10.500" fill="#fbf3e6" />
      <Eyes x={16} y={-29} />
      <ellipse cx="0" cy="-12" rx="5.500" ry="3.800" fill="#2a1c12" />
      <Smile y={-5} />
    </>
  ),
  // the deer grown: a full head of antlers
  stag: (
    <>
      <path
        d="M-13 -56L-26 -90L-18 -110M-23 -82L-42 -92M-26 -90L-44 -106M13 -56L26 -90L18 -110M23 -82L42 -92M26 -90L44 -106"
        stroke="#6a4c30"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M-32 -46L-58 -58L-40 -30Z" fill="#8f5f30" />
      <path d="M32 -46L58 -58L40 -30Z" fill="#784e26" />
      <path d="M-30 -52L0 -60L0 12L-16 6L-34 -28Z" fill="#a9743f" />
      <path d="M30 -52L0 -60L0 12L16 6L34 -28Z" fill="#8f5f30" />
      <path d="M-12 -12L0 -18L12 -12L8 6L0 10L-8 6Z" fill="#f6e6cf" />
      <Eyes x={16} y={-30} />
      <path d="M-6 -11L6 -11L0 -4Z" fill="#3a2a1c" />
      <Smile y={0} />
    </>
  ),
  // a bird of fire: a crest of flames, bright cheeks and a golden bill
  phoenix: (
    <>
      <path d="M-14 -50L-26 -94L-2 -66Z" fill="#ee5a24" />
      <path d="M-6 -54L0 -110L10 -64Z" fill="#f2a93b" />
      <path d="M10 -50L28 -92L16 -60Z" fill="#d94a18" />
      <path d="M-34 -26L-52 -12L-30 -6Z" fill="#ee5a24" />
      <path d="M34 -26L52 -12L30 -6Z" fill="#d94a18" />
      <path d="M-30 -48L0 -58L0 4L-16 -2L-34 -26Z" fill="#f08a2c" />
      <path d="M30 -48L0 -58L0 4L16 -2L34 -26Z" fill="#d96a1c" />
      <circle cx="-15" cy="-31" r="10.500" fill="#ffd24a" />
      <circle cx="15" cy="-31" r="10.500" fill="#f6c038" />
      <Eyes x={15} y={-31} r={5} />
      <path d="M-7 -18L0 -18L0 4Z" fill="#ffd24a" />
      <path d="M7 -18L0 -18L0 4Z" fill="#e3a21a" />
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
