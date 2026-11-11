// The seven pictures for "Seven ways we make a skill stick" (founder, 2026-11-11: detailed objects and
// real moving diagrams, specific to each method, no people, one accent colour each). Drawn in code. Each
// is a 320 by 220 scene; the motion is in painted.css (g1 to g7) and plays while the card is on screen.
// Every label is passed in from site-copy.ts. No numbers are shown except ones that are true for every
// student: three in a row, days 2, 7 and 21, and the pace steps 1.25, 1 and 0.75.
import type { CSSProperties, ReactNode } from "react";

export interface ArtWords {
  today: string;
  day2: string;
  day7: string;
  day21: string;
  row: string;
  right: string;
  wrong: string;
  slip: string;
  pace: string;
  accuracy: string;
  score: string;
  reading: string;
  math: string;
  turn: string;
}

const at = (s: number): CSSProperties => ({ animationDelay: `${s}s` });
const Tick = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <path
    className="g-tick"
    pathLength={1}
    d={`M${x - 5 * s} ${y}l${4 * s} ${4 * s} ${7 * s} ${-8 * s}`}
  />
);

export function wayArt(k: number, w: ArtWords): ReactNode {
  switch (k) {
    /* 1. Skill practice: three right in a row, and the marker climbs a level */
    case 0:
      return (
        <>
          <rect className="g-ink" x="44" y="22" width="7" height="178" rx="3.5" />
          <rect className="g-ink" x="121" y="22" width="7" height="178" rx="3.5" />
          {[0, 1, 2, 3, 4].map((r) => (
            <g key={r}>
              <rect className="g-shade" x="51" y={40 + r * 34} width="70" height="14" rx="7" />
              <rect
                className={r > 1 ? "g-acc" : r === 1 ? "g-acc g1-rung" : "g-none"}
                x="51"
                y={38 + r * 34}
                width="70"
                height="14"
                rx="7"
              />
              <text className="g-num" x="146" y={50 + r * 34}>
                {5 - r}
              </text>
            </g>
          ))}
          <g className="g1-mark">
            <ellipse className="g-drop" cx="86" cy="128" rx="15" ry="4" />
            <circle className="g-acc g-edge" cx="86" cy="112" r="14" />
            <path className="g-shine" d="M77 106a11 11 0 0 1 12-6" />
            <path className="g-cut" d="M80 112l4.5 4.5 8-9" />
          </g>
          <text className="g-label" x="238" y="62">
            {w.row}
          </text>
          {[0, 1, 2].map((i) => (
            <g key={i} className="g1-box" style={at(0.5 + i * 0.6)}>
              <rect className="g-card" x={186 + i * 38} y="76" width="30" height="30" rx="8" />
              <g className="g1-tick" style={at(0.5 + i * 0.6)}>
                <Tick x={200 + i * 38} y={91} />
              </g>
            </g>
          ))}
          <g className="g1-up">
            <path className="g-accline" d="M238 168v-36M224 144l14-14 14 14" />
          </g>
        </>
      );
    /* 2. Written explanations: the wrong choice is struck, the right one lit, the steps written out */
    case 1:
      return (
        <>
          <rect className="g-drop" x="30" y="24" width="266" height="182" rx="14" />
          <rect className="g-card" x="24" y="16" width="266" height="182" rx="14" />
          <rect className="g-shade" x="40" y="32" width="200" height="7" rx="3.5" />
          <rect className="g-shade" x="40" y="45" width="232" height="7" rx="3.5" />
          <rect className="g-shade" x="40" y="58" width="150" height="7" rx="3.5" />
          {["A", "B", "C", "D"].map((c, i) => (
            <g key={c}>
              <rect
                className={i === 2 ? "g-chip g2-right" : "g-chip"}
                x={40 + i * 60}
                y="76"
                width="50"
                height="24"
                rx="12"
              />
              <text
                className={i === 2 ? "g-letter g2-rightletter" : "g-letter"}
                x={65 + i * 60}
                y="93"
              >
                {c}
              </text>
            </g>
          ))}
          <path className="g-line g2-strike" pathLength={1} d="M96 88h58" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <circle
                className="g-acc g2-badge"
                style={at(1.4 + i * 0.9)}
                cx="50"
                cy={124 + i * 24}
                r="9"
              />
              <text className="g-badge g2-badge" style={at(1.4 + i * 0.9)} x="50" y={128 + i * 24}>
                {i + 1}
              </text>
              <path
                className="g-line g2-write"
                pathLength={1}
                style={at(1.5 + i * 0.9)}
                d={`M68 ${124 + i * 24}h${[150, 196, 112][i]}`}
              />
            </g>
          ))}
          <path className="g-accline g2-note" pathLength={1} d="M276 114v58" />
        </>
      );
    /* 3. The Daily 10: today's ten, and a missed question coming back on days 2, 7 and 21 */
    case 2:
      return (
        <>
          {Array.from({ length: 10 }, (_, i) => (
            <g key={i}>
              <rect className="g-card" x={36 + i * 25.4} y="26" width="19" height="24" rx="5" />
              <rect
                className="g-acc g3-ten"
                style={at(i * 0.16)}
                x={36 + i * 25.4}
                y="26"
                width="19"
                height="24"
                rx="5"
              />
            </g>
          ))}
          <path className="g-line" d="M34 150h256" />
          {[
            [50, w.today],
            [110, w.day2],
            [186, w.day7],
            [274, w.day21],
          ].map(([x, label], i) => (
            <g key={label}>
              <path className="g-thin" d={`M${x} 143v14`} />
              <circle className="g-card" cx={x} cy="150" r="9" />
              <circle
                className="g-acc g3-stop"
                style={at([0.2, 1.96, 3.3, 4.6][i])}
                cx={x}
                cy="150"
                r="9"
              />
              <text className="g-label" x={x} y="182">
                {label}
              </text>
            </g>
          ))}
          <path
            className="g-dash"
            d="M50 132Q80 86 110 132M110 132Q148 78 186 132M186 132Q230 70 274 132"
          />
          <g className="g3-token">
            <rect className="g-drop" x="-11" y="-36" width="26" height="32" rx="6" />
            <rect className="g-card" x="-14" y="-40" width="26" height="32" rx="6" />
            <rect className="g-shade" x="-9" y="-34" width="16" height="4" rx="2" />
            <rect className="g-shade" x="-9" y="-27" width="11" height="4" rx="2" />
            <circle className="g-acc" cx="5" cy="-15" r="5" />
          </g>
        </>
      );
    /* 4. The Challenge: the same two questions for everyone, and how everyone did */
    case 3:
      return (
        <>
          <g className="g4-cup">
            <ellipse className="g-drop" cx="82" cy="196" rx="38" ry="5" />
            <path className="g-thin" d="M52 62h-14a16 16 0 0 0 16 26M112 62h14a16 16 0 0 1-16 26" />
            <path className="g-acc g-edge" d="M50 44h64v38a32 32 0 0 1-64 0z" />
            <path className="g-shadeacc" d="M96 44h18v38a32 32 0 0 1-22 30c8-8 4-40 4-68z" />
            <path className="g-shine" d="M60 54v26a22 22 0 0 0 6 14" />
            <path
              className="g-cut"
              d="M82 60l4 9 10 1-7.5 7 2.2 10-8.7-5-8.7 5 2.2-10-7.5-7 10-1z"
            />
            <rect className="g-ink" x="76" y="114" width="12" height="30" />
            <path className="g-ink" d="M58 144h48l6 16H52z" />
            <rect className="g-ink" x="44" y="160" width="76" height="22" rx="5" />
            <rect className="g-shine2" x="52" y="166" width="60" height="4" rx="2" />
          </g>
          <path
            className="g-acc g4-spark"
            d="M132 30l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.500z"
          />
          <path
            className="g-acc g4-spark"
            style={at(0.8)}
            d="M34 34l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.800z"
          />
          <rect className="g-card" x="164" y="26" width="134" height="170" rx="12" />
          <text className="g-small" x="176" y="50">
            {w.right}
          </text>
          <rect className="g-shade" x="176" y="58" width="110" height="12" rx="6" />
          <rect className="g-acc g4-bar" x="176" y="58" width="110" height="12" rx="6" />
          <text className="g-small" x="176" y="98">
            {w.wrong}
          </text>
          <rect className="g-shade" x="176" y="106" width="110" height="12" rx="6" />
          <rect className="g-inkbar g4-bar2" x="176" y="106" width="110" height="12" rx="6" />
          <text className="g-small" x="176" y="146">
            {w.slip}
          </text>
          {["A", "B", "C", "D"].map((c, i) => (
            <g key={c}>
              <rect
                className={i === 1 ? "g-chip g4-slip" : "g-chip"}
                x={176 + i * 28}
                y="156"
                width="24"
                height="24"
                rx="8"
              />
              <text className="g-letter" x={188 + i * 28} y="173">
                {c}
              </text>
            </g>
          ))}
        </>
      );
    /* 5. Time trials: the same section on a clock that gives less time each round, accuracy held */
    case 4:
      return (
        <>
          <ellipse className="g-drop" cx="100" cy="200" rx="52" ry="6" />
          <rect className="g-ink" x="92" y="20" width="16" height="18" rx="4" />
          <rect className="g-ink" x="84" y="14" width="32" height="10" rx="5" />
          <rect
            className="g-ink"
            x="150"
            y="52"
            width="14"
            height="20"
            rx="4"
            transform="rotate(42 157 62)"
          />
          <circle className="g-ink" cx="100" cy="116" r="76" />
          <circle className="g-card" cx="100" cy="116" r="65" />
          <path className="g-shadearc" d="M100 51a65 65 0 0 1 0 130a80 80 0 0 0 0-130z" />
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              className={i % 3 === 0 ? "g-line" : "g-thin"}
              d="M100 58v8"
              transform={`rotate(${i * 30} 100 116)`}
            />
          ))}
          <circle className="g-arc g5-arc" pathLength={1} cx="100" cy="116" r="44" />
          <g transform="translate(100 116)">
            <g className="g5-hand">
              <path className="g-line" d="M0 8v-48" />
            </g>
          </g>
          <circle className="g-acc g-edge" cx="100" cy="116" r="6" />
          <rect className="g-card" x="198" y="40" width="100" height="74" rx="12" />
          <text className="g-small" x="248" y="60" textAnchor="middle">
            {w.pace}
          </text>
          <text className="g-big g5-n1" x="248" y="98">
            1.25×
          </text>
          <text className="g-big g5-n2" x="248" y="98">
            1×
          </text>
          <text className="g-big g5-n3" x="248" y="98">
            0.75×
          </text>
          <text className="g-small" x="198" y="146">
            {w.accuracy}
          </text>
          <rect className="g-shade" x="198" y="154" width="100" height="14" rx="7" />
          <rect className="g-acc g5-acc" x="198" y="154" width="86" height="14" rx="7" />
        </>
      );
    /* 6. Full-length practice tests: the booklet, and the score report it turns into */
    case 5:
      return (
        <>
          <rect className="g-drop" x="34" y="34" width="118" height="168" rx="8" />
          <rect className="g-card" x="38" y="30" width="118" height="164" rx="8" />
          <rect className="g-card" x="32" y="24" width="118" height="164" rx="8" />
          <rect className="g-card" x="26" y="18" width="118" height="164" rx="8" />
          <rect className="g-ink" x="26" y="18" width="12" height="164" rx="6" />
          <rect className="g-shade" x="50" y="34" width="78" height="8" rx="4" />
          <rect className="g-shade" x="50" y="48" width="52" height="8" rx="4" />
          {Array.from({ length: 20 }, (_, i) => (
            <circle
              key={i}
              className={[1, 6, 8, 15, 17].includes(i) ? "g-acc g6-bubble" : "g-ringthin"}
              style={at([1, 6, 8, 15, 17].indexOf(i) * 0.4)}
              cx={58 + (i % 4) * 22}
              cy={78 + Math.floor(i / 4) * 21}
              r="6.5"
            />
          ))}
          <path className="g-accline g6-go" d="M160 110h18M170 100l10 10-10 10" />
          <rect className="g-drop" x="196" y="30" width="106" height="170" rx="12" />
          <rect className="g-card" x="192" y="24" width="106" height="170" rx="12" />
          <circle className="g-ringsoft" cx="245" cy="74" r="30" />
          <circle className="g-arc g6-ring" pathLength={1} cx="245" cy="74" r="30" />
          <text className="g-small" x="245" y="78" textAnchor="middle">
            {w.score}
          </text>
          <text className="g-tiny" x="204" y="128">
            {w.reading}
          </text>
          <rect className="g-shade" x="204" y="134" width="82" height="10" rx="5" />
          <rect className="g-acc g6-bar" x="204" y="134" width="82" height="10" rx="5" />
          <text className="g-tiny" x="204" y="166">
            {w.math}
          </text>
          <rect className="g-shade" x="204" y="172" width="82" height="10" rx="5" />
          <rect
            className="g-acc g6-bar"
            style={at(0.5)}
            x="204"
            y="172"
            width="82"
            height="10"
            rx="5"
          />
        </>
      );
    /* 7. Live teaching: six seats, one board, and the turn passing from seat to seat */
    default:
      return (
        <>
          <rect className="g-drop" x="24" y="24" width="282" height="182" rx="14" />
          <rect className="g-card" x="18" y="16" width="282" height="182" rx="14" />
          <path className="g-inktop" d="M18 30a14 14 0 0 1 14-14h254a14 14 0 0 1 14 14v10H18z" />
          <circle className="g-dot" cx="34" cy="28" r="3.5" />
          <circle className="g-dot" cx="46" cy="28" r="3.5" />
          <circle className="g-dot" cx="58" cy="28" r="3.5" />
          <rect className="g-board" x="30" y="52" width="150" height="134" rx="8" />
          <path
            className="g-accline g7-write"
            pathLength={1}
            d="M46 78h46M100 70l12 16M112 70l-12 16M122 78h14M146 72q10 0 10 8t-10 8"
          />
          <path
            className="g-line g7-write"
            pathLength={1}
            style={at(1.2)}
            d="M46 112h70M46 132h96"
          />
          <path
            className="g-accline g7-write"
            pathLength={1}
            style={at(2.4)}
            d="M46 160h34M92 152l8 14 20-24"
          />
          {Array.from({ length: 6 }, (_, i) => (
            <g key={i}>
              <rect
                className="g-seat"
                x={192 + (i % 2) * 50}
                y={52 + Math.floor(i / 2) * 46}
                width="44"
                height="40"
                rx="8"
              />
              <circle
                className="g-seatdot"
                cx={214 + (i % 2) * 50}
                cy={72 + Math.floor(i / 2) * 46}
                r="9"
              />
            </g>
          ))}
          <rect className="g-turn g7-turn" x="192" y="52" width="44" height="40" rx="8" />
          <text className="g-small g7-label" x="242" y="194" textAnchor="middle">
            {w.turn}
          </text>
        </>
      );
  }
}
