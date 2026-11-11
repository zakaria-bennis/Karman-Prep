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

/** An open hand seen from above, reaching to the right: a cuff, a palm and four fingers. Its thumb is drawn
    separately (Thumb) so it can close over whatever the hand is holding. */
function Hand() {
  return (
    <>
      <rect className="p-ink" x="0" y="4" width="6" height="16" rx="1.5" />
      <rect className="p-skin" x="14" y="5" width="15" height="3.6" rx="1.8" />
      <rect className="p-skin" x="14" y="8.6" width="17.5" height="3.6" rx="1.8" />
      <rect className="p-skin" x="14" y="12.2" width="16.5" height="3.6" rx="1.8" />
      <rect className="p-skin" x="14" y="15.8" width="13" height="3.6" rx="1.8" />
      <path
        className="p-skin"
        d="M5 6.500a2 2 0 0 1 2-2h8a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a2 2 0 0 1-2-2z"
      />
    </>
  );
}
function Thumb({ move }: { move: string }) {
  return (
    <g transform="translate(9 5)">
      <g className={move}>
        <rect
          className="p-skin"
          x="0"
          y="-2"
          width="12.5"
          height="4"
          rx="2"
          transform="rotate(-24)"
        />
      </g>
    </g>
  );
}

/** One small moving picture per outcome, each acting out its own line: a dart thrown into the bullseye;
    scissors snipping a banknote in two and a hand taking one half; one hand passing a whole stack of cash
    to another. Ink, with green for the money and red for the bullseye. */
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
    <g transform="translate(74 27) scale(-1 1)">
      <g className="p-grab">
        <Hand />
      </g>
    </g>
    <g className="p-keep">
      <path className="p-green p-edge" d="M9 24h22v18H9a2 2 0 0 1-2-2V26a2 2 0 0 1 2-2z" />
      <path className="p-cut" d="M31 28.500a4.5 4.5 0 0 0 0 9" />
    </g>
    <g className="p-taken">
      <path className="p-green p-edge" d="M31 24h22a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H31z" />
      <path className="p-cut" d="M31 28.500a4.5 4.5 0 0 1 0 9" />
    </g>
    <g transform="translate(74 27) scale(-1 1)">
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
    <g transform="translate(72 26) scale(-1 1)">
      <g className="p-take">
        <Hand />
      </g>
    </g>
    <g className="p-give" transform="translate(0 26)">
      <Hand />
    </g>
    <g className="p-stack">
      <rect className="p-green p-edge" x="16" y="33" width="20" height="11" rx="1.8" />
      <rect className="p-green p-edge" x="14.5" y="30.5" width="20" height="11" rx="1.8" />
      <rect className="p-green p-edge" x="13" y="28" width="20" height="11" rx="1.8" />
      <circle className="p-cutfill" cx="23" cy="33.5" r="2.6" />
    </g>
    <g className="p-give" transform="translate(0 26)">
      <Thumb move="p-let" />
    </g>
    <g transform="translate(72 26) scale(-1 1)">
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
