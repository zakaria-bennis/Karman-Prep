// The seven pictures for "Seven ways we make a skill stick" (founder, 2026-11-11: detailed objects and
// real moving diagrams, specific to each method, no people, one accent colour each). Drawn in code. Each
// is a 320 by 220 scene; the motion is in painted.css (g1 to g7) and plays while the card is on screen.
// Every label is passed in from site-copy.ts. No numbers are shown except ones that are true for every
// student: three in a row, days 2, 7 and 21, and the pace steps 1.25, 1 and 0.75.
import type { CSSProperties, ReactNode } from "react";
import { list } from "@/lib/marketing/site-copy";

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

/** The pictures' labels, from the "art words" line of site-copy section 6, in their order there. */
export function artWords(line: string | undefined): ArtWords {
  const [
    today,
    day2,
    day7,
    day21,
    row,
    right,
    wrong,
    slip,
    pace,
    accuracy,
    score,
    reading,
    math,
    turn,
  ] = list(line);
  return {
    today,
    day2,
    day7,
    day21,
    row,
    right,
    wrong,
    slip,
    pace,
    accuracy,
    score,
    reading,
    math,
    turn,
  };
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
    /* 5. Time trials: the watch races to the right. Each round gives less time, so the hand comes round
       sooner, the watch leans further into it, and the flames streaming off its back grow. */
    case 4:
      return (
        <>
          {[0, 1, 2, 3].map((n) => (
            <path
              key={n}
              className="g-thin g5-streak"
              style={at(n * 0.13)}
              d={`M${150 + n * 34} ${36 + n * 44}h30`}
            />
          ))}
          <g className="g5-race">
            <g className="g5-fire">
              <path
                className="g-flame"
                d="M70 62C46 54 30 64 4 58c14 10 24 12 30 22-12-2-22 2-32 10 16 0 26 6 34 16-12 0-22 6-30 16 14-2 26 2 34 10-10 4-18 12-22 22 14-8 28-8 40-2 8 6 16 8 22 6z"
              />
              <path
                className="g-flame g-flame2"
                d="M72 78C54 72 40 78 20 76c10 6 18 10 22 18-10 0-18 4-24 10 12 0 22 4 28 12-8 2-16 8-20 16 12-4 24-4 34 2 6 4 12 4 16 2z"
              />
              <path
                className="g-flame g-flame3"
                d="M74 94c-12-4-22 0-34 0 8 4 12 8 14 14-6 0-12 4-16 8 10 0 18 2 24 8 6 2 10 2 14 0z"
              />
              <circle className="g-flame g5-ember" cx="18" cy="48" r="3" />
              <circle
                className="g-flame g-flame2 g5-ember"
                style={at(0.25)}
                cx="10"
                cy="150"
                r="2.5"
              />
              <circle
                className="g-flame g-flame3 g5-ember"
                style={at(0.4)}
                cx="26"
                cy="172"
                r="2"
              />
            </g>
            <ellipse className="g-drop" cx="118" cy="200" rx="50" ry="6" />
            <rect className="g-ink" x="110" y="20" width="16" height="18" rx="4" />
            <rect className="g-ink" x="102" y="14" width="32" height="10" rx="5" />
            <rect
              className="g-ink"
              x="166"
              y="52"
              width="14"
              height="20"
              rx="4"
              transform="rotate(42 173 62)"
            />
            <circle className="g-ink" cx="118" cy="116" r="76" />
            <circle className="g-card" cx="118" cy="116" r="65" />
            <path className="g-shadearc" d="M118 51a65 65 0 0 1 0 130a80 80 0 0 0 0-130z" />
            {Array.from({ length: 12 }, (_, i) => (
              <path
                key={i}
                className={i % 3 === 0 ? "g-line" : "g-thin"}
                d="M118 58v8"
                transform={`rotate(${i * 30} 118 116)`}
              />
            ))}
            <circle className="g-arc g5-arc" pathLength={1} cx="118" cy="116" r="44" />
            <g transform="translate(118 116)">
              <g className="g5-hand">
                <path className="g-line" d="M0 8v-48" />
              </g>
            </g>
            <circle className="g-acc g-edge" cx="118" cy="116" r="6" />
          </g>
          <rect className="g-card" x="212" y="40" width="94" height="74" rx="12" />
          <text className="g-small" x="259" y="60" textAnchor="middle">
            {w.pace}
          </text>
          {Array.from({ length: 11 }, (_, n) => (
            <text key={n} className={`g-big g5-pace g5-p${n}`} x="259" y="98">
              {(1.25 - n * 0.05).toFixed(2)}×
            </text>
          ))}
          <text className="g-small" x="212" y="146">
            {w.accuracy}
          </text>
          <rect className="g-shade" x="212" y="154" width="94" height="14" rx="7" />
          <rect className="g-acc g5-acc" x="212" y="154" width="80" height="14" rx="7" />
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
          {/* the shared board: one equation, solved a line at a time */}
          <rect className="g-board" x="28" y="26" width="164" height="134" rx="8" />
          <text className="g-math g7-step" x="110" y="58">
            x² + 5x + 6 = 0
          </text>
          <text className="g-math g7-step" style={at(1.3)} x="110" y="94">
            (x + 2)(x + 3) = 0
          </text>
          <text className="g-math g-mathacc g7-step" style={at(2.6)} x="110" y="132">
            x = −2 or −3
          </text>
          <path className="g-accline g7-under" pathLength={1} style={at(3.5)} d="M52 142h116" />
          {/* the six seats down the side; the ring is whose turn it is */}
          {Array.from({ length: 6 }, (_, i) => (
            <g key={i}>
              <rect
                className="g-seat"
                x={200 + (i % 2) * 48}
                y={26 + Math.floor(i / 2) * 46}
                width="42"
                height="40"
                rx="8"
              />
              <circle
                className="g-seatdot"
                cx={221 + (i % 2) * 48}
                cy={46 + Math.floor(i / 2) * 46}
                r="9"
              />
            </g>
          ))}
          <rect className="g-turn g7-turn" x="200" y="26" width="42" height="40" rx="8" />
          {/* the call's bar: microphone, camera, share, and the way out */}
          <rect className="g-ink" x="28" y="168" width="264" height="22" rx="11" />
          <rect className="g-dot" x="46" y="173" width="6" height="9" rx="3" />
          <path className="g-barline" d="M43 179a6 6 0 0 0 12 0M49 185v2" />
          <rect className="g-dot" x="72" y="174" width="12" height="10" rx="2.5" />
          <path className="g-dot" d="M85 178l6-3v8l-6-3z" />
          <rect className="g-barbox" x="108" y="173" width="14" height="11" rx="2" />
          <path className="g-barline" d="M115 181v-5M112.5 178l2.5-2.5 2.5 2.5" />
          <text className="g-bartext" x="160" y="183">
            {w.turn}
          </text>
          <rect className="g-leave" x="252" y="172" width="30" height="14" rx="7" />
        </>
      );
  }
}
