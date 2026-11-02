// The tutors' six illustrations (2026-10-26), drawn in code as line art so each one says what it is at a
// glance: a mortarboard, a statistician's bell curve, a trading screen, an open journal under a magnifier, a
// professor at a chalkboard, a certificate with its seal. Each draws itself in when its row arrives, keeps one
// small motion going (the tassel swings, a point runs the curve, the last price pulses, the magnifier reads,
// the chalk writes, the seal turns), and answers the pointer on its row (home.css, "the tutors"). Reduced
// motion shows the finished drawing, still.
import type { CSSProperties, ReactNode } from "react";

export type CredKind = "phd" | "quant" | "analyst" | "research" | "professor" | "certified";

const n = (k: number) => ({ "--n": k }) as CSSProperties;
/** A stroke that draws itself in, k-th in its drawing. */
const D = ({
  d,
  k,
  c = "",
  ...rest
}: {
  d: string;
  k: number;
  c?: string;
  [a: string]: unknown;
}) => <path d={d} pathLength={1} className={`d ${c}`} style={n(k)} {...rest} />;

const ART: Record<CredKind, ReactNode> = {
  phd: (
    <>
      <g className="ca-lift">
        <D d="M38 46v13c0 7 44 7 44 0V46" k={0} c="fill" />
        <D d="M60 22 104 37 60 52 16 37Z" k={1} c="fill" />
        <D d="M60 37 92 41" k={2} c="mg" />
        <g className="ca-swing">
          <D d="M92 41V60" k={3} c="mg" />
          <D d="M88.5 60h7l-1.2 10h-4.6Z" k={4} c="mg fillm" />
        </g>
        <circle cx="60" cy="37" r="2.2" className="dot" />
      </g>
    </>
  ),
  quant: (
    <>
      <D d="M14 78H108M14 78V12" k={0} />
      {[24, 36, 48, 60, 72, 84, 96].map((x, i) => {
        const h = [6, 16, 34, 46, 32, 15, 6][i];
        return (
          <D key={x} d={`M${x - 4} 78V${78 - h}H${x + 4}V78`} k={1 + i * 0.15} c="lo ca-bar" />
        );
      })}
      <D d="M16 76C40 76 44 20 61 20S82 76 106 76" k={2.4} c="mg" />
      <path className="d lo dash" d="M61 20V78" pathLength={1} style={n(3)} />
      <circle r="3.2" className="dot ca-run">
        <animateMotion
          dur="5s"
          repeatCount="indefinite"
          path="M16 76C40 76 44 20 61 20S82 76 106 76"
        />
      </circle>
    </>
  ),
  analyst: (
    <>
      <D
        d="M12 12h96a4 4 0 0 1 4 4v52a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4Z"
        k={0}
        c="fill"
      />
      <D d="M60 72v8M46 80h28" k={0.5} />
      {[
        [22, 54, 62, 48, 66],
        [36, 48, 56, 44, 60],
        [50, 50, 58, 42, 62],
        [64, 40, 50, 36, 54],
        [78, 34, 44, 30, 48],
        [92, 24, 36, 20, 40],
      ].map(([x, top, bot, hi, lo], i) => (
        <g key={x} className="ca-candle" style={n(i)}>
          <D d={`M${x} ${hi}V${lo}`} k={1 + i * 0.2} c={i === 2 ? "" : "mg"} />
          <D
            d={`M${x - 3.5} ${top}h7v${bot - top}h-7Z`}
            k={1.1 + i * 0.2}
            c={i === 2 ? "fill" : "mg fillm"}
          />
        </g>
      ))}
      <circle cx="92" cy="24" r="3" className="dot ca-pulse" />
    </>
  ),
  research: (
    <>
      <D d="M60 28C48 21 30 21 16 26v44c14-5 32-5 44 2Z" k={0} c="fill" />
      <D d="M60 28c12-7 30-7 44-2v44c-14-5-32-5-44 2Z" k={0.3} c="fill" />
      {[36, 44, 52, 60].map((y, i) => (
        <D key={y} d={`M24 ${y - 2}c10-3 20-3 30 0`} k={1 + i * 0.15} c="lo" />
      ))}
      {[36, 44, 52, 60].map((y, i) => (
        <D key={y} d={`M66 ${y - 2}c10-3 20-3 30 0`} k={1.3 + i * 0.15} c="lo" />
      ))}
      <g className="ca-glass">
        <circle cx="80" cy="44" r="10" className="d mg fillg" pathLength={1} style={n(2)} />
        <D d="M87.5 51.5l10 10" k={2.3} c="mg thick" />
      </g>
    </>
  ),
  professor: (
    <>
      <D d="M34 12h76v46H34Z" k={0} c="fill" />
      <D d="M30 62h84" k={0.4} />
      <D d="M42 44c5-24 12-24 17 0" k={1.2} c="mg ca-chalk" />
      <D d="M66 32h12M72 26v12" k={1.5} c="mg ca-chalk" />
      <D d="M86 26l10 12M96 26 86 38" k={1.8} c="mg ca-chalk" />
      <circle cx="18" cy="40" r="7" className="fill d" pathLength={1} style={n(0.2)} />
      <D d="M18 48c-9 2-12 12-12 30h24c0-14-3-26-12-30Z" k={0.5} c="fill" />
      <g className="ca-point">
        <D d="M23 54l14-6" k={0.9} />
        <D d="M37 48l11-5" k={1} c="mg" />
      </g>
    </>
  ),
  certified: (
    <>
      <D d="M12 12h78v58H12Z" k={0} c="fill" />
      <D d="M17 17h68v48H17Z" k={0.3} c="lo" />
      <D d="M28 28h46" k={0.8} c="thick" />
      <D d="M26 38h50M26 45h42" k={1} c="lo" />
      <D d="M26 58c4-7 8 5 12-2s6 6 10 0" k={1.3} />
      <g className="ca-seal">
        <D d="M86 74l-5 14 6-3 4 5 2-13M98 74l5 14-6-3-4 5-2-13" k={1.6} c="mg" />
        <circle
          cx="92"
          cy="64"
          r="12"
          className="d mg fillm ca-scallop"
          pathLength={1}
          style={n(1.8)}
        />
        <circle cx="92" cy="64" r="7" className="d mg" pathLength={1} style={n(2)} />
      </g>
    </>
  ),
};

export default function CredArt({ kind }: { kind: CredKind }) {
  return (
    <svg className={`ca ca-${kind}`} viewBox="0 0 120 92" aria-hidden="true">
      {ART[kind]}
    </svg>
  );
}
