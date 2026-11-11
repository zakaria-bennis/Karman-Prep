"use client";

// The guarantee, kept short (founder, 2026-11-10): one sentence, a
// +200 stamp that is brought down hard at the top right, level with the headline, and the three outcomes on cards that slide in
// from the side. Everything else about the guarantee is one link away. The arrival plays when the section
// scrolls into view (the site's "rv" then "on" classes, painted.css). When the stamp lands, the headline gives
// a short jolt.
import type { CSSProperties, ReactNode } from "react";
import { arman, SIG } from "./signature";

/** How long after the stamp starts to fall it hits the page: 52% of .gua-stamp's .75s (painted.css). */
const IMPACT_MS = 390;

export interface GuaranteeWords {
  /** The one sentence. */
  line: string;
  /** What the signature says, for screen readers. */
  signed: string;
  /** The stamp: its number, the word under it, and the words round its edge. */
  stamp: string;
  stampUnit: string;
  stampRing: string;
}

/** "Karman" as the founder signs it, traced by hand from the picture he sent, then set lower and wider at
    his request so it takes little height: a K whose leg sweeps away under the whole word, and the rest as
    the letters he picked out of twelve versions (signature.ts). It is drawn as the section arrives. */
function Signature({ name }: { name: string }) {
  return (
    <p className="gua-sig" role="img" aria-label={name}>
      <svg viewBox="130 118 850 196" aria-hidden="true">
        <path className="pen" pathLength={1} d="M176 128 C 179 170, 178 232, 162 300" />
        <path
          className="pen"
          pathLength={1}
          d="M312 150 C 314 132, 298 126, 284 140 C 256 172, 214 222, 166 266 C 190 240, 232 212, 268 212 C 304 213, 322 250, 360 274 C 400 298, 470 306, 590 302 C 720 298, 850 290, 958 278"
        />
        <path className="brush" pathLength={1} style={{ strokeWidth: SIG.pen }} d={arman(SIG)} />
        <path
          className="tail"
          pathLength={1}
          d="M786 212 C 806 220, 826 221, 860 216 C 900 212, 930 222, 950 230"
        />
      </svg>
    </p>
  );
}

/** An open hand seen from above, reaching to the right, drawn as one shape: the wrist runs into the palm
    and the palm into four fingers of different lengths, with only fine lines between them. Its thumb is
    drawn separately (Thumb) so it can close over whatever the hand holds; the thumb's base has no outline,
    so it grows out of the palm without a seam. */
function Hand() {
  return (
    <>
      <path
        className="p-ink"
        d="M-5 5.500h6a1.5 1.5 0 0 1 1.5 1.500v11.500a1.5 1.5 0 0 1-1.5 1.500h-6z"
      />
      <path
        className="p-skin"
        d="M1 7.200C6 6.2 11 5.3 16.5 5.500L32.5 6.200Q36 6.3 36 8.200Q36 10 33.8 10.100L36.2 10.200Q38.6 10.4 38.6 12Q38.6 13.7 36.2 13.700L34.8 13.800Q37 14 37 15.600Q37 17.2 34.6 17.200L31 17.300Q33 17.5 33 19Q33 20.5 30.6 20.500L17 20.700C11 20.9 6 20 1 18.800Z"
      />
      <path
        className="p-crease"
        d="M33.8 10.100C29 10 24 10.2 20.5 10.600M36.2 13.700C31 13.6 25 13.7 21 14M34.6 17.200C30 17.1 25.5 17.1 22 17.3"
      />
    </>
  );
}
function Thumb({ move }: { move: string }) {
  return (
    <g transform="translate(11 7)">
      <g className={move}>
        <path
          className="p-skinfill"
          d="M-2 0.500C-1 -4.5 3 -7.5 9.5 -9.500Q12.5 -10.3 13.3 -8.300Q14 -6.3 11 -5.200C8 -4.2 6.5 -2 6.2 1.500Z"
        />
        <path
          className="p-crease p-outline"
          d="M-2 -0.300C-1 -4.5 3 -7.5 9.5 -9.500Q12.5 -10.3 13.3 -8.300Q14 -6.3 11 -5.200C8 -4.2 6.7 -2.5 6.3 -0.3"
        />
      </g>
    </g>
  );
}

/** A banknote that is not a stiff card: its long edges bow a little, it has an inner frame and a "$" in
    a ring. `d` is its outline; `cx` is where the ring sits. */
function Note({ d, cx, cy = 33 }: { d: string; cx: number; cy?: number }) {
  return (
    <>
      <path className="p-green p-edge" d={d} />
      <circle className="p-cutfill" cx={cx} cy={cy} r="5.2" />
      <text className="p-dollar" x={cx} y={cy + 3.3}>
        $
      </text>
    </>
  );
}

/** One small moving picture per outcome, each acting out its own line: an arrow shot into the bullseye;
    scissors snipping a banknote in two and a hand taking one half; one hand passing a whole stack of cash
    to another. Ink, with green for the money and red for the bullseye. */
const PICS: ReactNode[] = [
  <>
    <g className="p-board">
      <circle className="p-paper" cx="26" cy="32" r="20" />
      <circle className="p-ring" cx="26" cy="32" r="20" />
      <circle className="p-ring" cx="26" cy="32" r="12.5" />
      <circle className="p-red" cx="26" cy="32" r="5.5" />
    </g>
    {/* the arrow lies along its own line: head at the centre, shaft, three feathers and a nock */}
    <g transform="translate(26 32) rotate(-38)">
      <g className="p-arrow">
        <path className="p-shaft" d="M3 0h36" />
        <path className="p-ink" d="M-1 0l8.5-3.6-1.8 3.6 1.8 3.600z" />
        <path className="p-red p-edge" d="M28 -1l4.5-5h7.500l-4.5 5z" />
        <path className="p-red p-edge" d="M28 1l4.5 5h7.500l-4.5-5z" />
        <path className="p-ink" d="M39 -1.300h3v2.600h-3z" />
      </g>
    </g>
  </>,
  <>
    <g transform="translate(76 22) scale(-1 1)">
      <g className="p-grab">
        <Hand />
      </g>
    </g>
    <g className="p-keep">
      <Note d="M7 25.500Q19 22.5 31 24L31 42Q19 40.5 7 43.500Z" cx={19} />
    </g>
    <g className="p-taken">
      <Note d="M31 24Q43 25.5 55 22.500L55 40.500Q43 43.5 31 42Z" cx={43} />
    </g>
    <g transform="translate(76 22) scale(-1 1)">
      <g className="p-grab">
        <Thumb move="p-pinch" />
      </g>
    </g>
    <g transform="translate(31 12)">
      <g className="p-snip">
        <g className="p-blade-a">
          <path className="p-ink" d="M-1.2 0L-2.4 24 1 24z" />
          <circle className="p-ring" cx="5" cy="-7" r="4" />
          <path className="p-line" d="M0 0l3-4" />
        </g>
        <g className="p-blade-b">
          <path className="p-ink" d="M1.2 0L2.4 24 -1 24z" />
          <circle className="p-ring" cx="-5" cy="-7" r="4" />
          <path className="p-line" d="M0 0l-3-4" />
        </g>
        <circle className="p-paper p-edge" r="1.8" />
      </g>
    </g>
  </>,
  <>
    <g transform="translate(74 24) scale(-1 1)">
      <g className="p-take">
        <Hand />
      </g>
    </g>
    <g className="p-give" transform="translate(-2 24)">
      <Hand />
    </g>
    <g className="p-stack">
      <path
        className="p-green p-edge"
        d="M15 33.500Q25 31.5 37 33.500L36.5 45Q25 43.5 15.5 45.500Z"
      />
      <path className="p-green p-edge" d="M13.5 31Q24 28.5 35.5 30.500L35 42Q24 40.5 14 42.500Z" />
      <Note d="M12 28.500Q23 25.5 34 27.500L33.5 39Q23 37.5 12.5 40Z" cx={23} cy={33.5} />
    </g>
    <g className="p-give" transform="translate(-2 24)">
      <Thumb move="p-let" />
    </g>
    <g transform="translate(74 24) scale(-1 1)">
      <g className="p-take">
        <Thumb move="p-hold" />
      </g>
    </g>
  </>,
];

export default function Guarantee({
  outcomes,
  words,
}: {
  /** The three outcomes, as [name, line]. */
  outcomes: [string, string][];
  words: GuaranteeWords;
}) {
  /* the stamp's fall has begun: at the moment it lands, jolt the words */
  const landed = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.animationName !== "gua-stamp") return;
    const stamp = e.currentTarget;
    setTimeout(() => stamp.closest(".offer")?.classList.add("hit"), IMPACT_MS);
  };

  return (
    <div className="gua rv">
      <div className="gua-say">
        <p className="gua-line">{words.line}</p>
      </div>
      {/* the stamp sits at the top right of the section, level with its headline (painted.css) */}
      <div className="gua-stamp" aria-hidden="true" onAnimationStart={landed}>
        <svg viewBox="0 0 200 200">
          <defs>
            {/* ink that did not take everywhere: a rough edge and a few bare patches */}
            <filter id="gua-worn" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency=".8"
                numOctaves="2"
                seed="7"
                result="n"
              />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" result="d" />
              <feColorMatrix
                in="n"
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.2 2.5"
                result="holes"
              />
              <feComposite in="d" in2="holes" operator="in" />
            </filter>
            <path id="gua-ring" d="M100 100 m-74 0 a74 74 0 1 1 148 0 a74 74 0 1 1 -148 0" />
          </defs>
          <g filter="url(#gua-worn)">
            <circle cx="100" cy="100" r="94" />
            <circle className="thin" cx="100" cy="100" r="60" />
            <text className="ring">
              <textPath href="#gua-ring">{`${words.stampRing} · ${words.stampRing} · `}</textPath>
            </text>
            <text className="big" x="100" y="112" textAnchor="middle">
              {words.stamp}
            </text>
            <text className="unit" x="100" y="136" textAnchor="middle">
              {words.stampUnit}
            </text>
          </g>
        </svg>
      </div>
      <ul className="gua-cards">
        {outcomes.map(([name, line], i) => (
          <li key={name} style={{ "--k": i } as CSSProperties}>
            <svg className="gua-pic" viewBox="0 0 72 56" aria-hidden="true">
              {PICS[i % PICS.length]}
            </svg>
            <b>{name}</b>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {/* the signature closes the section, right above the link to the full guarantee */}
      <Signature name={words.signed} />
    </div>
  );
}
