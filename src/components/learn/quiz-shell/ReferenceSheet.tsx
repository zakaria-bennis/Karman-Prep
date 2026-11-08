"use client";
// The SAT math reference facts, written and drawn by Karman (spec: Reference).
import type { ReactNode } from "react";
import MathText from "../MathText";
import styles from "./reference.module.css";

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinejoin: "round" as const,
};
const L = { fontSize: 11, fill: "currentColor", fontStyle: "italic" as const };

const FIGURES: { name: string; formula: string; svg: ReactNode }[] = [
  {
    name: "Circle",
    formula: "$A = \\pi r^2$, $C = 2\\pi r$",
    svg: (
      <>
        <circle cx="50" cy="40" r="28" {...S} />
        <path d="M50 40h28" {...S} />
        <text x="62" y="36" {...L}>
          r
        </text>
      </>
    ),
  },
  {
    name: "Rectangle",
    formula: "$A = \\ell w$",
    svg: (
      <>
        <rect x="18" y="20" width="64" height="40" {...S} />
        <text x="46" y="74" {...L}>
          ℓ
        </text>
        <text x="86" y="44" {...L}>
          w
        </text>
      </>
    ),
  },
  {
    name: "Triangle",
    formula: "$A = \\frac{1}{2} b h$",
    svg: (
      <>
        <path d="M14 64 L86 64 L58 14 Z" {...S} />
        <path d="M58 14 V64" {...S} strokeDasharray="3 3" />
        <text x="46" y="76" {...L}>
          b
        </text>
        <text x="61" y="44" {...L}>
          h
        </text>
      </>
    ),
  },
  {
    name: "Right triangle",
    formula: "$c^2 = a^2 + b^2$",
    svg: (
      <>
        <path d="M18 64 L82 64 L82 18 Z" {...S} />
        <path d="M74 64 V56 H82" {...S} />
        <text x="44" y="38" {...L}>
          c
        </text>
        <text x="86" y="44" {...L}>
          a
        </text>
        <text x="48" y="76" {...L}>
          b
        </text>
      </>
    ),
  },
  {
    name: "Special right triangles",
    formula: "$x,\\ x\\sqrt{3},\\ 2x$ and $s,\\ s,\\ s\\sqrt{2}$",
    svg: (
      <>
        <path d="M8 64 L48 64 L48 22 Z" {...S} />
        <text x="12" y="60" {...L} fontSize="9">
          30°
        </text>
        <text x="38" y="32" {...L} fontSize="9">
          60°
        </text>
        <path d="M56 64 L94 64 L94 26 Z" {...S} />
        <text x="62" y="60" {...L} fontSize="9">
          45°
        </text>
      </>
    ),
  },
  {
    name: "Rectangular solid",
    formula: "$V = \\ell w h$",
    svg: (
      <>
        <path d="M16 30 H66 V66 H16 Z M16 30 L32 16 H82 L66 30 M82 16 V52 L66 66" {...S} />
        <text x="38" y="76" {...L}>
          ℓ
        </text>
        <text x="76" y="64" {...L}>
          w
        </text>
        <text x="6" y="50" {...L}>
          h
        </text>
      </>
    ),
  },
  {
    name: "Cylinder",
    formula: "$V = \\pi r^2 h$",
    svg: (
      <>
        <ellipse cx="50" cy="18" rx="26" ry="8" {...S} />
        <path d="M24 18 V62 M76 18 V62" {...S} />
        <path d="M24 62 A26 8 0 0 0 76 62" {...S} />
        <text x="80" y="44" {...L}>
          h
        </text>
        <path d="M50 18 H76" {...S} />
        <text x="58" y="14" {...L}>
          r
        </text>
      </>
    ),
  },
  {
    name: "Sphere",
    formula: "$V = \\frac{4}{3}\\pi r^3$",
    svg: (
      <>
        <circle cx="50" cy="40" r="28" {...S} />
        <ellipse cx="50" cy="40" rx="28" ry="8" {...S} strokeDasharray="3 3" />
        <path d="M50 40 H78" {...S} />
        <text x="62" y="36" {...L}>
          r
        </text>
      </>
    ),
  },
  {
    name: "Cone",
    formula: "$V = \\frac{1}{3}\\pi r^2 h$",
    svg: (
      <>
        <path d="M50 10 L24 62 M50 10 L76 62" {...S} />
        <ellipse cx="50" cy="62" rx="26" ry="7" {...S} />
        <path d="M50 10 V62" {...S} strokeDasharray="3 3" />
        <text x="53" y="42" {...L}>
          h
        </text>
      </>
    ),
  },
  {
    name: "Pyramid",
    formula: "$V = \\frac{1}{3} \\ell w h$",
    svg: (
      <>
        <path d="M50 10 L20 60 L66 66 L84 50 Z M50 10 L66 66" {...S} />
        <path d="M50 10 V58" {...S} strokeDasharray="3 3" />
        <text x="53" y="40" {...L}>
          h
        </text>
      </>
    ),
  },
];

const FACTS = [
  "The number of degrees of arc in a circle is $360$.",
  "The number of radians of arc in a circle is $2\\pi$.",
  "The sum of the measures in degrees of the angles of a triangle is $180$.",
];

export function ReferenceSheet() {
  return (
    <div className={styles.sheet}>
      <ul className={styles.grid}>
        {FIGURES.map((f) => (
          <li key={f.name} className={styles.card}>
            <svg viewBox="0 0 100 80" className={styles.figure} role="img" aria-label={f.name}>
              {f.svg}
            </svg>
            <span className={styles.name}>{f.name}</span>
            <MathText text={f.formula} />
          </li>
        ))}
      </ul>
      {FACTS.map((fact) => (
        <p key={fact} className={styles.fact}>
          <MathText text={fact} />
        </p>
      ))}
    </div>
  );
}
