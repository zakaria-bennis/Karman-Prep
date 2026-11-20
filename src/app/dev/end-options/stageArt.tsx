// The drawings of each stage of the three metamorphoses (Metamorph.tsx), in a 120 by 120 box,
// and the paints they share. Each part that grows is marked for the change to find: data-pop
// (springs up), data-leaf, data-stem, data-petal, data-grow (shoots up), data-drop (falls into
// place), data-wing (unfolds), data-glint; data-still stays as it is.
import type { ReactNode } from "react";
import type { MorphKind } from "./Metamorph";

const LEAF = "#6bb35a";
const STEM = "#4f9a45";
const SOIL = "#8a5a3b";

function Soil() {
  return <path d="M18 101 Q60 84 102 101 Q60 106 18 101Z" fill={SOIL} opacity="0.95" data-still />;
}

function butterfly(level: number, id: string): ReactNode {
  if (level === 0)
    return (
      <>
        <path d="M18 92 C40 70 86 70 104 88 C84 104 40 106 18 92Z" fill={LEAF} data-still />
        <path
          d="M24 92 C50 86 78 86 100 89"
          stroke="#3f7d36"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          data-still
        />
        <g data-pop>
          <ellipse cx="60" cy="62" rx="13" ry="16" fill="#f4ecd6" />
          <path d="M49 64 Q60 69 71 64" stroke="#ddd0ab" strokeWidth="1.5" fill="none" />
          <ellipse cx="55" cy="56" rx="3.5" ry="6" fill="#fff" opacity="0.85" />
        </g>
      </>
    );
  if (level === 1)
    return (
      <>
        <path d="M14 96 C36 76 88 76 108 92 C86 108 36 110 14 96Z" fill={LEAF} data-still />
        {[
          [30, 80, 6.5],
          [40, 76, 7.5],
          [51, 71, 8],
          [62, 71, 8],
          [73, 76, 8],
        ].map(([x, y, r], i) => (
          <g key={i} data-pop>
            <circle cx={x} cy={y} r={r} fill={i % 2 ? "#8fd36b" : "#9fe07a"} />
            <circle cx={x} cy={y - r * 0.45} r={r * 0.28} fill="#ffd166" />
            <ellipse cx={x} cy={y + r + 1} rx="2" ry="1.5" fill="#3a5f2f" />
          </g>
        ))}
        <g data-pop>
          <circle cx="86" cy="72" r="10" fill="#8fd36b" />
          <path
            d="M82 63 Q78 54 74 52 M90 63 Q94 54 98 52"
            stroke="#3a5f2f"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="83" cy="71" r="2.6" fill="#fff" />
          <circle cx="91" cy="71" r="2.6" fill="#fff" />
          <circle cx="83.6" cy="71.5" r="1.4" fill="#1b1b2e" />
          <circle cx="91.6" cy="71.5" r="1.4" fill="#1b1b2e" />
          <path
            d="M84 77 Q87 79.5 90 77"
            stroke="#3a5f2f"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </>
    );
  if (level === 2)
    return (
      <>
        <path d="M24 22 L96 20" stroke="#8a5a3b" strokeWidth="5" strokeLinecap="round" data-still />
        <path d="M60 22 L60 31" stroke="#c9b48a" strokeWidth="1.5" data-still />
        <g data-drop>
          <path
            d="M60 30 C76 34 80 58 72 80 C68 92 62 98 60 104 C58 98 52 92 48 80 C40 58 44 34 60 30Z"
            fill={`url(#${id}-jade)`}
          />
          <path
            d="M47 52 Q60 59 73 52"
            stroke="#ffd166"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          {[50, 56, 64, 70].map((x) => (
            <circle key={x} cx={x} cy={x === 50 || x === 70 ? 49 : 52} r="1.6" fill="#ffd166" />
          ))}
          <path
            d="M53 38 C49 50 50 66 54 80"
            stroke="#fff"
            strokeWidth="2.5"
            opacity="0.45"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </>
    );
  return (
    <>
      <g data-wing="l">
        <path
          d="M58 56 C40 20 8 24 12 48 C14 62 36 66 58 62Z"
          fill={`url(#${id}-wing)`}
          stroke="#ffd166"
          strokeWidth="1.6"
        />
        <path
          d="M58 64 C40 64 22 78 30 92 C38 102 54 88 58 70Z"
          fill={`url(#${id}-wing2)`}
          stroke="#ffd166"
          strokeWidth="1.6"
        />
        <circle cx="24" cy="40" r="3.2" fill="#fff" opacity="0.9" />
        <circle cx="33" cy="33" r="2.2" fill="#fff" opacity="0.85" />
        <circle cx="38" cy="86" r="2.4" fill="#fff" opacity="0.85" />
      </g>
      <g data-wing="r">
        <path
          d="M62 56 C80 20 112 24 108 48 C106 62 84 66 62 62Z"
          fill={`url(#${id}-wing)`}
          stroke="#ffd166"
          strokeWidth="1.6"
        />
        <path
          d="M62 64 C80 64 98 78 90 92 C82 102 66 88 62 70Z"
          fill={`url(#${id}-wing2)`}
          stroke="#ffd166"
          strokeWidth="1.6"
        />
        <circle cx="96" cy="40" r="3.2" fill="#fff" opacity="0.9" />
        <circle cx="87" cy="33" r="2.2" fill="#fff" opacity="0.85" />
        <circle cx="82" cy="86" r="2.4" fill="#fff" opacity="0.85" />
      </g>
      <g data-pop>
        <ellipse cx="60" cy="66" rx="3.6" ry="17" fill="#2e2540" />
        <circle cx="60" cy="47" r="4.5" fill="#2e2540" />
        <path
          d="M58.5 44 Q54 32 49 29 M61.5 44 Q66 32 71 29"
          stroke="#2e2540"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="49" cy="29" r="1.8" fill="#2e2540" />
        <circle cx="71" cy="29" r="1.8" fill="#2e2540" />
      </g>
    </>
  );
}

function bloom(level: number): ReactNode {
  const leaves = (y: number, s: number) => (
    <>
      <path
        d={`M60 ${y} C${60 - 10 * s} ${y - 10 * s} ${60 - 24 * s} ${y - 8 * s} ${60 - 26 * s} ${y - 2 * s} C${60 - 16 * s} ${y + 6 * s} ${60 - 6 * s} ${y + 6 * s} 60 ${y}Z`}
        fill={LEAF}
        data-leaf
      />
      <path
        d={`M60 ${y - 2} C${60 + 10 * s} ${y - 14 * s} ${60 + 24 * s} ${y - 12 * s} ${60 + 26 * s} ${y - 6 * s} C${60 + 18 * s} ${y + 4 * s} ${60 + 6 * s} ${y + 4 * s} 60 ${y - 2}Z`}
        fill="#7cc66a"
        data-leaf
      />
    </>
  );
  const stem = (top: number) => (
    <path
      d={`M60 94 C60 ${top + 30} 62 ${top + 12} 60 ${top}`}
      stroke={STEM}
      strokeWidth="4"
      fill="none"
      strokeLinecap="round"
      data-stem
    />
  );
  if (level === 0)
    return (
      <>
        <g data-pop>
          <path d="M60 76 C67 79 69 88 60 93 C51 88 53 79 60 76Z" fill="#c08a4f" />
          <path d="M60 79 C62 83 62 87 60 90" stroke="#e8c08c" strokeWidth="1.4" fill="none" />
        </g>
        <Soil />
      </>
    );
  if (level === 1)
    return (
      <>
        {stem(60)}
        <g data-grow>{leaves(64, 1)}</g>
        <Soil />
      </>
    );
  if (level === 2)
    return (
      <>
        {stem(42)}
        <g data-grow>{leaves(74, 1.15)}</g>
        <g data-pop>
          <path d="M60 18 C72 26 72 40 60 46 C48 40 48 26 60 18Z" fill="#ff7a9a" />
          <path d="M60 22 C64 28 64 38 60 44" stroke="#ffb3c4" strokeWidth="2" fill="none" />
          <path d="M60 46 L50 38 L56 47Z M60 46 L70 38 L64 47Z" fill={STEM} />
        </g>
        <Soil />
      </>
    );
  return (
    <>
      {stem(40)}
      <g data-grow>{leaves(76, 1.2)}</g>
      {Array.from({ length: 8 }, (_, k) => (
        <g key={k} data-petal>
          <ellipse
            cx="60"
            cy="18"
            rx="7.5"
            ry="14"
            fill={k % 2 ? "#ff9db5" : "#ff7a9a"}
            transform={`rotate(${k * 45} 60 32)`}
          />
        </g>
      ))}
      <g data-pop>
        <circle cx="60" cy="32" r="8.5" fill="#ffcf4a" />
        {[0, 1, 2, 3, 4].map((k) => (
          <circle
            key={k}
            cx={60 + Math.cos(k * 1.26) * 4}
            cy={32 + Math.sin(k * 1.26) * 4}
            r="1.2"
            fill="#d9921c"
          />
        ))}
      </g>
    </>
  );
}

function crystal(level: number, id: string): ReactNode {
  const rock = (
    <path
      d="M28 98 C24 86 40 76 58 76 C78 74 96 84 94 94 C92 102 34 104 28 98Z"
      fill="#9aa3ad"
      data-still
    />
  );
  const prism = (h: number, fill: string, key?: string | number) => (
    <g key={key}>
      <path d={`M53 84 L53 ${84 - h} L60 ${74 - h} L67 ${84 - h} L67 84Z`} fill={fill} />
      <path d={`M60 ${74 - h} L67 ${84 - h} L67 84 L60 84Z`} fill="#000" opacity="0.18" />
      <path
        d={`M56 ${82 - h} L56 80`}
        stroke="#fff"
        strokeWidth="1.6"
        opacity="0.6"
        strokeLinecap="round"
      />
    </g>
  );
  if (level === 0)
    return (
      <g data-pop>
        {rock}
        <path
          d="M40 84 C50 78 62 78 70 80"
          stroke="#c4cbd2"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    );
  if (level === 1)
    return (
      <>
        <g data-grow>{prism(30, "#5fd6c8")}</g>
        {rock}
      </>
    );
  if (level === 2)
    return (
      <>
        <g data-grow>
          <g transform="rotate(-24 60 86)">{prism(22, "#59c3ff")}</g>
        </g>
        <g data-grow>
          <g transform="rotate(22 60 86)">{prism(26, "#7b9bff")}</g>
        </g>
        <g data-grow>{prism(44, "#5fd6c8")}</g>
        {rock}
      </>
    );
  return (
    <g data-pop>
      <path d="M34 44 L47 28 L73 28 L86 44 L60 92Z" fill={`url(#${id}-gold)`} />
      <path d="M47 28 L73 28 L67 44 L53 44Z" fill="#fff4c4" />
      <path d="M34 44 L47 28 L53 44Z" fill="#ffd86b" />
      <path d="M86 44 L73 28 L67 44Z" fill="#eeac34" />
      <path d="M34 44 L53 44 L60 92Z" fill="#f6b93c" />
      <path d="M53 44 L67 44 L60 92Z" fill="#ffd25a" />
      <path d="M67 44 L86 44 L60 92Z" fill="#d6951f" />
      <path d="M78 22 L80 29 L87 31 L80 33 L78 40 L76 33 L69 31 L76 29Z" fill="#fff" data-glint />
    </g>
  );
}

export function art(kind: MorphKind, level: number, id: string) {
  if (kind === "bloom") return bloom(level);
  if (kind === "crystal") return crystal(level, id);
  return butterfly(level, id);
}

export function Paints({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-wing`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8a7dff" />
        <stop offset="1" stopColor="#59c3ff" />
      </linearGradient>
      <linearGradient id={`${id}-wing2`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#59c3ff" />
        <stop offset="1" stopColor="#5fd6c8" />
      </linearGradient>
      <linearGradient id={`${id}-jade`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#7fdcb6" />
        <stop offset="1" stopColor="#3fa984" />
      </linearGradient>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffe08a" />
        <stop offset="1" stopColor="#e09a1c" />
      </linearGradient>
      <radialGradient id={`${id}-glow`}>
        <stop offset="0" stopColor="#fff" stopOpacity="1" />
        <stop offset="0.4" stopColor="#fff6d8" stopOpacity="0.7" />
        <stop offset="1" stopColor="#ffe6a0" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}
