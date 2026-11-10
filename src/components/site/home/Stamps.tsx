"use client";

// TEMPORARY (2026-11-10): ten designs for the guarantee's stamp, for the founder to pick one, with a small
// panel to switch between them on the real page. All ten are drawn here in code, in ink, and share one
// worn-ink filter. The choice is data-stamp on <html>. When he has picked, the winner's drawing moves into
// Guarantee.tsx and this file goes. The panel is never shown in production; until he picks, production
// shows design 1.
import { useEffect, useState } from "react";

export interface StampWords {
  /** "+200" */
  stamp: string;
  /** "points" */
  unit: string;
  /** "or your money back" */
  ring: string;
  /** "Karman" */
  brand: string;
}

const NAMES = [
  "Ring",
  "Notary",
  "Rubber stamp",
  "Oval",
  "Postmark",
  "Sun",
  "Solid",
  "Ticket",
  "Wax seal",
  "Brush circle",
];

const pt = (r: number, a: number) =>
  `${(100 + r * Math.cos(a)).toFixed(1)} ${(100 + r * Math.sin(a)).toFixed(1)}`;
/** A closed outline round (100, 100) whose radius is r(angle). */
const outline = (steps: number, r: (a: number, i: number) => number) =>
  `M${Array.from({ length: steps }, (_, i) => pt(r((i / steps) * 6.2832, i), (i / steps) * 6.2832)).join(" L")} Z`;
const SCALLOPS = outline(144, (a) => 90 + 4.5 * Math.cos(a * 24));
const BLOB = outline(120, (a) => 87 + 5 * Math.sin(a * 5 + 1) + 3 * Math.sin(a * 9));
const RAYS = Array.from({ length: 36 }, (_, i) => {
  const a = (i / 36) * 6.2832;
  return `M${pt(71, a)} L${pt(i % 2 ? 88 : 95, a)}`;
}).join(" ");
/** One loose turn of a brush that overshoots where it began. */
const BRUSH = `M${Array.from({ length: 70 }, (_, i) => pt(80 + i * 0.2, -2.1 + (i / 69) * 7)).join(" L")}`;
const ring = (r: number) =>
  `M100 100 m-${r} 0 a${r} ${r} 0 1 1 ${r * 2} 0 a${r} ${r} 0 1 1 -${r * 2} 0`;

export function Stamps({ words }: { words: StampWords }) {
  const around = `${words.ring} · ${words.ring} · `;
  const branded = `${words.brand} · ${words.ring} · `;
  const mid = (size: number, y = 112) => (
    <text className="big" x="100" y={y} textAnchor="middle" style={{ fontSize: size }}>
      {words.stamp}
    </text>
  );
  const unit = (y = 136, size = 15) => (
    <text className="unit" x="100" y={y} textAnchor="middle" style={{ fontSize: size }}>
      {words.unit}
    </text>
  );
  return (
    <>
      {/* ink that did not take everywhere: a rough edge and a few bare patches */}
      <svg className="gua-defs" aria-hidden="true">
        <defs>
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
          <path id="gua-r74" d={ring(74)} />
          <path id="gua-r68" d={ring(68)} />
        </defs>
      </svg>

      {/* 1. Ring */}
      <svg data-d="1" viewBox="0 0 200 200">
        <g filter="url(#gua-worn)">
          <circle cx="100" cy="100" r="94" />
          <circle className="thin" cx="100" cy="100" r="60" />
          <text className="ring">
            <textPath href="#gua-r74">{around}</textPath>
          </text>
          {mid(50)}
          {unit()}
        </g>
      </svg>

      {/* 2. Notary: a scalloped edge */}
      <svg data-d="2" viewBox="0 0 200 200">
        <g filter="url(#gua-worn)">
          <path className="line" d={SCALLOPS} />
          <circle className="thin" cx="100" cy="100" r="80" />
          <circle className="thin" cx="100" cy="100" r="54" />
          <text className="small ring">
            <textPath href="#gua-r68">{branded}</textPath>
          </text>
          {mid(42, 110)}
          {unit(130, 13)}
        </g>
      </svg>

      {/* 3. Rubber stamp: a rectangle, like APPROVED */}
      <svg data-d="3" data-wide viewBox="0 0 300 170">
        <g filter="url(#gua-worn)">
          <rect className="line" x="6" y="6" width="288" height="158" rx="14" />
          <rect className="thin" x="17" y="17" width="266" height="136" rx="7" />
          <text className="big caps" x="150" y="92" textAnchor="middle" style={{ fontSize: 40 }}>
            {words.stamp} {words.unit}
          </text>
          <text className="unit" x="150" y="130" textAnchor="middle" style={{ fontSize: 17 }}>
            {words.ring}
          </text>
        </g>
      </svg>

      {/* 4. Oval */}
      <svg data-d="4" data-wide viewBox="0 0 300 190">
        <g filter="url(#gua-worn)">
          <ellipse className="line" cx="150" cy="95" rx="144" ry="89" />
          <ellipse className="thin" cx="150" cy="95" rx="130" ry="75" />
          <text className="unit" x="150" y="54" textAnchor="middle" style={{ fontSize: 15 }}>
            {words.brand}
          </text>
          <text className="big" x="150" y="116" textAnchor="middle" style={{ fontSize: 64 }}>
            {words.stamp}
          </text>
          <text className="unit" x="150" y="144" textAnchor="middle" style={{ fontSize: 12.5 }}>
            {words.ring}
          </text>
        </g>
      </svg>

      {/* 5. Postmark: a ring and the wavy lines that cancel a stamp */}
      <svg data-d="5" data-wide viewBox="0 0 320 200">
        <g filter="url(#gua-worn)">
          <circle cx="100" cy="100" r="92" />
          <text className="small ring">
            <textPath href="#gua-r68">{branded}</textPath>
          </text>
          {mid(44, 110)}
          {unit(130, 13)}
          {[56, 78, 100, 122, 144].map((y) => (
            <path key={y} className="line" d={`M200 ${y} q 15 -12 30 0 t 30 0 t 30 0 t 26 0`} />
          ))}
        </g>
      </svg>

      {/* 6. Sun: rays round a ring */}
      <svg data-d="6" viewBox="0 0 200 200">
        <g filter="url(#gua-worn)">
          <path className="line" d={RAYS} />
          <circle cx="100" cy="100" r="62" />
          {mid(44, 110)}
          {unit(130, 13)}
        </g>
      </svg>

      {/* 7. Solid: a disc of ink with the words left bare */}
      <svg data-d="7" viewBox="0 0 200 200">
        <g filter="url(#gua-worn)">
          <circle className="full" cx="100" cy="100" r="95" />
          <circle className="thin bare" cx="100" cy="100" r="58" />
          <text className="bare ring">
            <textPath href="#gua-r74">{around}</textPath>
          </text>
          <g className="bare">
            {mid(48)}
            {unit()}
          </g>
        </g>
      </svg>

      {/* 8. Ticket: notched at both ends, with a stub */}
      <svg data-d="8" data-wide viewBox="0 0 300 160">
        <g filter="url(#gua-worn)">
          <path
            className="line"
            d="M20 6 H280 a14 14 0 0 1 14 14 V62 a18 18 0 0 0 0 36 V140 a14 14 0 0 1 -14 14 H20 a14 14 0 0 1 -14 -14 V98 a18 18 0 0 0 0 -36 V20 a14 14 0 0 1 14 -14 Z"
          />
          <path className="thin dash" d="M200 16 V144" />
          <text className="big" x="112" y="96" textAnchor="middle" style={{ fontSize: 62 }}>
            {words.stamp}
          </text>
          <text className="unit" x="112" y="124" textAnchor="middle" style={{ fontSize: 15 }}>
            {words.unit}
          </text>
          {words.ring
            .split(" ")
            .reduce<string[]>((rows, w, i) => {
              if (i % 2) rows[rows.length - 1] += ` ${w}`;
              else rows.push(w);
              return rows;
            }, [])
            .map((row, i) => (
              <text
                key={row}
                className="unit"
                x="248"
                y={72 + i * 22}
                textAnchor="middle"
                style={{ fontSize: 9 }}
              >
                {row}
              </text>
            ))}
        </g>
      </svg>

      {/* 9. Wax seal: an uneven pressed shape, filled */}
      <svg data-d="9" viewBox="0 0 200 200">
        <g filter="url(#gua-worn)">
          <path className="full" d={BLOB} />
          <circle className="thin bare" cx="100" cy="100" r="66" />
          <g className="bare">
            {mid(46, 110)}
            {unit(132, 14)}
          </g>
        </g>
      </svg>

      {/* 10. Brush circle: one loose turn of a brush round the number */}
      <svg data-d="10" viewBox="0 0 200 200">
        <g filter="url(#gua-worn)">
          <path className="line brush" d={BRUSH} />
          {mid(52, 110)}
          {unit(134, 15)}
        </g>
      </svg>
    </>
  );
}

/** The panel that switches the design. Development only. */
export function StampLab() {
  const [picked, setPicked] = useState("1");
  useEffect(() => {
    const v = new URLSearchParams(location.search).get("stamp") ?? "1";
    document.documentElement.dataset.stamp = v;
    setPicked(v);
  }, []);
  const replay = () => {
    const el = document.querySelector(".gua");
    el?.classList.remove("on");
    document.querySelector(".offer")?.classList.remove("hit");
    setTimeout(() => el?.classList.add("on"), 150);
  };
  const pick = (v: string) => {
    const url = new URL(location.href);
    url.searchParams.set("stamp", v);
    history.replaceState(null, "", url);
    document.documentElement.dataset.stamp = v;
    setPicked(v);
    replay();
  };
  return (
    <aside className="lab" aria-label="Options to try">
      <b>Stamp design: tap one to see it land on the page</b>
      <div>
        {NAMES.map((name, i) => (
          <button
            key={name}
            type="button"
            data-on={picked === String(i + 1) || undefined}
            onClick={() => pick(String(i + 1))}
          >
            {i + 1}. {name}
          </button>
        ))}
      </div>
      <button type="button" onClick={replay}>
        Play the stamp again
      </button>
    </aside>
  );
}
