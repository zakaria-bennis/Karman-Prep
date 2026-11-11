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

/** One small moving picture per outcome, each acting out its own line: a dart thrown into the bullseye; a
    banknote torn in two, half sliding home and half landing in the tutors' bowl; one hand passing a whole
    stack of cash to another. Ink, with green for the money and red for the bullseye. */
const PICS: ReactNode[] = [
  <>
    <g className="p-board">
      <circle className="p-paper" cx="28" cy="30" r="21" />
      <circle className="p-ring" cx="28" cy="30" r="21" />
      <circle className="p-ring" cx="28" cy="30" r="13" />
      <circle className="p-red" cx="28" cy="30" r="6" />
    </g>
    <g transform="translate(28 30)">
      <g className="p-dart">
        <path className="p-line" d="M0 0L24 -19" />
        <path className="p-red p-edge" d="M24 -19l9-2-3-7z" />
        <path className="p-ink" d="M24 -19l2 9 6-5z" />
      </g>
    </g>
  </>,
  <>
    <path className="p-ink" d="M40 44h28a14 14 0 0 1-28 0z" />
    <g className="p-keep">
      <path className="p-green p-edge" d="M8 12h22v24H8a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3z" />
      <path className="p-cut" d="M30 18a6 6 0 0 0 0 12" />
    </g>
    <g className="p-eat">
      <path className="p-green p-edge" d="M30 12h22a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H30z" />
      <path className="p-cut" d="M30 18a6 6 0 0 1 0 12" />
    </g>
    <path className="p-ink" d="M38 44h32v4H38z" />
  </>,
  <>
    <g className="p-give">
      <rect className="p-ink" x="0" y="30" width="9" height="16" rx="2" />
      <path className="p-paper p-edge" d="M9 33h15a5 5 0 0 1 5 5v1a5 5 0 0 1-5 5H9z" />
      <path className="p-paper p-edge" d="M13 33v-3a3.5 3.5 0 0 1 7 0v3" />
      <path className="p-line" d="M24 38.5h5" />
    </g>
    <g className="p-take">
      <rect className="p-ink" x="63" y="30" width="9" height="16" rx="2" />
      <path className="p-paper p-edge" d="M63 33H48a5 5 0 0 0-5 5v1a5 5 0 0 0 5 5h15z" />
      <path className="p-paper p-edge" d="M59 33v-3a3.5 3.5 0 0 0-7 0v3" />
      <path className="p-line" d="M48 38.5h-5" />
    </g>
    <g className="p-stack">
      <rect className="p-green p-edge" x="10" y="24" width="22" height="7" rx="2" />
      <rect className="p-green p-edge" x="10" y="18" width="22" height="7" rx="2" />
      <rect className="p-green p-edge" x="10" y="12" width="22" height="7" rx="2" />
      <rect className="p-paper" x="18" y="12" width="6" height="19" />
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
