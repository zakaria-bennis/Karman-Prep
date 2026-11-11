// The seven ways Karman teaches a skill, as seven cartoon cards (founder, 2026-11-11: lively, moving, like
// the perk cards in a game, with Karman's own character). Each card has a small scene, drawn in code in
// ink, in which the same little student acts the method out on a loop: hopping up the levels, writing the
// steps, ticking off ten questions, cheering over a trophy, running against a shrinking clock, sitting a
// test, talking with a tutor. Words from site-copy.ts (section 6), in the same order as the scenes.
// Reduced motion, or the footer's still button, stops every scene (painted.css, .ways).
import type { CSSProperties, ReactNode } from "react";

/** A limb or a prop that turns about a joint: the outer group places the joint, the inner one moves. */
function Joint({
  x,
  y,
  move,
  delay,
  children,
}: {
  x: number;
  y: number;
  move?: string;
  delay?: string;
  children: ReactNode;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={move} style={delay ? { animationDelay: delay } : undefined}>
        {children}
      </g>
    </g>
  );
}

interface KidProps {
  x: number;
  /** Where the feet stand. */
  y?: number;
  size?: number;
  /** Faces left instead of right. */
  flip?: boolean;
  /** How the whole body moves, and when. */
  move?: string;
  delay?: string;
  armL?: string;
  armR?: string;
  legL?: string;
  legR?: string;
  /** Where each hand rests, from its shoulder. */
  handL?: [number, number];
  handR?: [number, number];
  /** Drawn in the right hand. */
  holding?: ReactNode;
  /** Sitting behind something: no legs. */
  seated?: boolean;
}

/** Karman's student: a round head, a small tunic, four lines for limbs. The feet stand on (x, y). */
function Kid({
  x,
  y = 98,
  size = 1,
  flip,
  move,
  delay,
  armL,
  armR,
  legL,
  legR,
  handL = [-6, 13],
  handR = [6, 13],
  holding,
  seated,
}: KidProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -size : size} ${size})`}>
      <g className={move} style={delay ? { animationDelay: delay } : undefined}>
        {seated ? null : (
          <>
            <Joint x={-4} y={-15} move={legL}>
              <path className="w-line" d="M0 0l-2 15" />
            </Joint>
            <Joint x={4} y={-15} move={legR}>
              <path className="w-line" d="M0 0l2 15" />
            </Joint>
          </>
        )}
        <Joint x={-6} y={-30} move={armL}>
          <path className="w-line" d={`M0 0l${handL[0]} ${handL[1]}`} />
        </Joint>
        <path className="w-torso" d="M-6 -32h12l2.5 17h-17z" />
        <Joint x={6} y={-30} move={armR}>
          <path className="w-line" d={`M0 0l${handR[0]} ${handR[1]}`} />
          {holding}
        </Joint>
        <circle className="w-skin" cx="0" cy="-43" r="9.5" />
        <circle className="w-ink" cx="0.5" cy="-44" r="1.4" />
        <circle className="w-ink" cx="5.5" cy="-44" r="1.4" />
        <path className="w-thin" d="M0.5 -40q2.6 2.6 5.2 0" />
      </g>
    </g>
  );
}

const at = (delay: number): CSSProperties => ({ animationDelay: `${delay}s` });
const GROUND = <path className="w-thin" d="M8 98h144" />;

const SCENES: ReactNode[] = [
  /* 1. Skill practice: up the levels, three at a time, to a star */
  <>
    {GROUND}
    {[0, 1, 2].map((k) => (
      <rect
        key={k}
        className="w-block s1-step"
        style={at(k + 1)}
        x={54 + k * 30}
        y={84 - k * 12}
        width="26"
        height={14 + k * 12}
        rx="3"
      />
    ))}
    <g className="s1-hop">
      <Kid x={0} y={0} size={0.8} armL="wave" armR="wave" handL={[-8, -10]} handR={[8, -10]} />
    </g>
    <path
      className="w-ink s1-star"
      d="M147 20l3 6.6 7.2.8-5.4 4.8 1.6 7-6.4-3.7-6.4 3.7 1.6-7-5.4-4.8 7.2-.8z"
    />
  </>,
  /* 2. Written explanations: the steps write themselves out, and the light comes on */
  <>
    {GROUND}
    <rect className="w-sheet" x="80" y="20" width="64" height="70" rx="6" />
    {[0, 1, 2, 3].map((k) => (
      <path
        key={k}
        className="w-line s2-write"
        pathLength={1}
        style={at(k * 0.7)}
        d={`M90 ${36 + k * 13}h${k === 3 ? 24 : 44}`}
      />
    ))}
    <Kid
      x={46}
      armR="scribble"
      handR={[15, 2]}
      handL={[-5, 13]}
      move="nod"
      holding={<path className="w-thin" d="M15 2l7 -6" />}
    />
    <g className="s2-bulb">
      <circle className="w-skin" cx="46" cy="27" r="6.5" />
      <path className="w-thin" d="M46 14v-5M35 18l-4-3M57 18l4-3M43.5 34h5" />
    </g>
  </>,
  /* 3. The Daily 10: ten questions, ticked off one by one, every day */
  <>
    {GROUND}
    {Array.from({ length: 10 }, (_, k) => (
      <g key={k} transform={`translate(${78 + (k % 5) * 16} ${k < 5 ? 38 : 58})`}>
        <circle className="w-ring" r="5.6" />
        <circle className="w-ink s3-dot" style={at(k * 0.3)} r="5.6" />
      </g>
    ))}
    <path className="w-line s3-tick" pathLength={1} d="M96 82l9 9 20-20" />
    <Kid x={42} armR="point" handR={[14, -8]} move="nod" />
  </>,
  /* 4. The Challenge: the same two questions for everyone, and somebody wins */
  <>
    {GROUND}
    <Kid x={36} size={0.9} move="jump" armL="wave" armR="wave" handL={[-8, -10]} handR={[8, -10]} />
    <Kid
      x={124}
      size={0.9}
      flip
      move="jump"
      delay="-.45s"
      armL="wave"
      armR="wave"
      handL={[-8, -10]}
      handR={[8, -10]}
    />
    <g className="s4-cup">
      <path className="w-ink" d="M68 46h24v10a12 12 0 0 1-24 0z" />
      <path className="w-thin" d="M68 49h-6a7 7 0 0 0 7 9M92 49h6a7 7 0 0 1-7 9" />
      <path className="w-ink" d="M77 67h6v9h8v6H69v-6h8z" />
    </g>
    <path
      className="w-ink s4-spark"
      d="M80 22l2.4 6.6 6.6 2.4-6.6 2.4-2.4 6.6-2.4-6.6-6.6-2.4 6.6-2.400z"
    />
    <path
      className="w-ink s4-spark"
      style={at(0.7)}
      d="M104 34l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.500z"
    />
    <path
      className="w-ink s4-spark"
      style={at(1.3)}
      d="M56 30l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.500z"
    />
  </>,
  /* 5. Time trials: running against a clock that gives less time each round */
  <>
    {GROUND}
    {[0, 1, 2].map((k) => (
      <path key={k} className="w-thin s5-wind" style={at(k * 0.22)} d={`M10 ${62 + k * 13}h22`} />
    ))}
    <Kid
      x={62}
      move="run"
      legL="stride"
      legR="stride-back"
      armL="stride-back"
      armR="stride"
      handL={[-9, 9]}
      handR={[9, 9]}
    />
    <path className="w-line" d="M118 14h12M124 14v6" />
    <circle className="w-sheet" cx="124" cy="42" r="21" />
    <circle className="w-line s5-ring" pathLength={1} cx="124" cy="42" r="14" />
    <Joint x={124} y={42} move="s5-hand">
      <path className="w-thin" d="M0 0v-11" />
    </Joint>
    <text className="w-word s5-n1" x="124" y="84">
      1.25×
    </text>
    <text className="w-word s5-n2" x="124" y="84">
      1×
    </text>
    <text className="w-word s5-n3" x="124" y="84">
      0.75×
    </text>
  </>,
  /* 6. Full-length practice tests: the whole test, on the clock, at a desk */
  <>
    {GROUND}
    <Kid x={58} y={90} seated armR="scribble" handR={[13, 10]} handL={[-9, 11]} move="nod" />
    <path
      className="w-ink s6-drop"
      d="M74 38c2.6 3.6 3.8 5.6 3.8 7.200a3.8 3.8 0 0 1-7.6 0c0-1.6 1.2-3.6 3.8-7.200z"
    />
    <rect className="w-sheet" x="28" y="72" width="76" height="26" rx="4" />
    <rect
      className="w-ring"
      x="62"
      y="64"
      width="22"
      height="9"
      rx="1.5"
      transform="rotate(-8 73 68)"
    />
    <circle className="w-sheet" cx="128" cy="38" r="21" />
    <path className="w-thin" d="M128 21v4M128 51v4M111 38h4M141 38h4" />
    <Joint x={128} y={38} move="s6-hand">
      <path className="w-line" d="M0 0v-13" />
    </Joint>
    <Joint x={128} y={38} move="s6-hour">
      <path className="w-line" d="M0 0h8" />
    </Joint>
  </>,
  /* 7. Live teaching: a tutor and a student, talking it through */
  <>
    {GROUND}
    <Kid x={38} armR="wave" handR={[12, -6]} move="nod" />
    <Kid x={120} size={0.84} flip move="nod" delay="-.6s" />
    <g className="s7-say">
      <rect className="w-sheet" x="50" y="14" width="42" height="24" rx="10" />
      <path className="w-ink" d="M56 36l-4 9 11-8z" />
      <circle className="w-ink" cx="62" cy="26" r="2.4" />
      <circle className="w-ink" cx="71" cy="26" r="2.4" />
      <circle className="w-ink" cx="80" cy="26" r="2.4" />
    </g>
    <g className="s7-say" style={at(1.6)}>
      <rect className="w-torso" x="84" y="30" width="32" height="20" rx="9" />
      <path className="w-ink" d="M110 48l5 8-11-7z" />
      <path className="w-cut" d="M93 40l5 5 9-10" />
    </g>
  </>,
];

export default function Ways({ items }: { items: [string, string][] }) {
  return (
    <ul className="ways">
      {items.map(([name, line], k) => (
        <li
          className="rv"
          key={name}
          style={{ "--k": k, transitionDelay: `${k * 80}ms` } as CSSProperties}
        >
          <div className="way-art" aria-hidden="true">
            <svg viewBox="0 0 160 110">{SCENES[k % SCENES.length]}</svg>
            <i>{k + 1}</i>
          </div>
          <b>{name}</b>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
