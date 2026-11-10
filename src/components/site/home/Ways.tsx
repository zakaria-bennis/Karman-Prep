// The six ways Karman teaches a skill, each with one small drawing that moves once it is on screen: a level
// filling, a line being written, ten marks appearing, two lights rising, a clock whose hand and ring move as
// one, two faces on a call. Drawn in code, in ink. Words from site-copy.ts (section 6).
import type { ReactNode } from "react";

const ART: ReactNode[] = [
  <>
    {[0, 1, 2, 3].map((k) => (
      <rect
        key={k}
        className="fill"
        style={{ animationDelay: `${k * 0.3}s` }}
        x={6 + k * 10}
        y={26 - k * 5}
        width="7"
        height={10 + k * 5}
        rx="2"
      />
    ))}
  </>,
  <>
    {[0, 1, 2].map((k) => (
      <path
        key={k}
        className="draw"
        pathLength={1}
        style={{ animationDelay: `${k * 0.35}s` }}
        d={`M7 ${15 + k * 9}h${k === 2 ? 20 : 34}`}
      />
    ))}
  </>,
  <>
    {Array.from({ length: 10 }, (_, k) => (
      <circle
        key={k}
        className="fill"
        style={{ animationDelay: `${k * 0.12}s` }}
        cx={8 + (k % 5) * 8}
        cy={k < 5 ? 19 : 29}
        r="2.7"
      />
    ))}
  </>,
  <>
    <path className="thin" d="M5 40l10-8 8 5 10-9 11 11" />
    <circle className="rise" cx="16" cy="18" r="3.6" />
    <circle className="rise" style={{ animationDelay: ".45s" }} cx="32" cy="12" r="3.6" />
  </>,
  <>
    <circle className="thin" cx="24" cy="24" r="15" />
    <circle className="sweep" pathLength={1} cx="24" cy="24" r="15" />
    <path className="hand" d="M24 24V10" />
  </>,
  <>
    <rect className="thin" x="5" y="11" width="17" height="26" rx="5" />
    <rect className="thin" x="26" y="11" width="17" height="26" rx="5" />
    <circle className="dot" cx="13.5" cy="21" r="3.4" />
    <circle className="dot" cx="34.5" cy="21" r="3.4" />
    <path className="talk" d="M30 30h9" />
  </>,
];

export default function Ways({ items }: { items: [string, string][] }) {
  return (
    <ul className="ways">
      {items.map(([name, line], k) => (
        <li className="rv" key={name} style={{ transitionDelay: `${k * 70}ms` }}>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            {ART[k % ART.length]}
          </svg>
          <b>{name}</b>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
