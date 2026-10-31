// The guarantee, drawn (2026-10-26). One hairline score line runs from the starting score through the weeks of
// work to SAT day, then splits into the three endings, each with what the family gets. It draws itself when it
// comes on screen, a dot walks it, and light pulses down all three endings together. Pointing at an ending (or
// tapping it) lights that one, sends the dot down it and reads it out (live/guarantee.ts); every ending is
// always written on the page, so nothing depends on the pointer. Under it, the two sides of the deal, ticked
// in turn. Every word comes from site-copy.ts (section 8; pricing passes its own headline and text).
import type { CSSProperties } from "react";
import { MARCH_PROGRAM as MP } from "@/lib/marketing/offer";
import { list, pairs, type CopySection } from "@/lib/marketing/site-copy";
import "@/app/(site)/styles/guarantee.css";
import Photo from "./Photo";
import { Kinetic, TextLink } from "./parts";
import { ROUTES } from "./routes";

const MAIN = "M40 330 C120 332 150 300 220 298 S320 252 380 262 S480 214 540 218 S620 204 650 200";
// the three endings, top to bottom: the promise kept, half back, everything back
const ENDS = [
  "M650 200 C760 200 800 74 960 70",
  "M650 200 C760 200 820 200 960 200",
  "M650 200 C760 200 820 326 960 330",
];
const END_Y = [70, 200, 330];
const WEEKS = MP.weeks;

export default function GuaranteeDeal({ g, headId }: { g: CopySection; headId: string }) {
  const outcomes = pairs(g.outcomes);
  const weDo = list(g["we do"]);
  const youDo = list(g["you do"]);
  const covers = list(g.covers);

  return (
    <div className="gx" data-pick="-1">
      <div className="gx-head">
        {g.eyebrow ? <p className="eyebrow rv">{g.eyebrow}</p> : null}
        {g.headline ? (
          <h2 className="rv kin" id={headId}>
            <Kinetic text={g.headline} />
          </h2>
        ) : null}
        {g.text ? <p className="lede rv">{g.text}</p> : null}
      </div>

      <div className="gx-board">
        <Photo name="start" className="gx-ph start" />
        <div className="gx-stage">
          <svg viewBox="0 0 1000 400" aria-hidden="true" className="gx-svg">
            {Array.from({ length: WEEKS + 1 }, (_, k) => {
              const x = 40 + (k * 610) / WEEKS;
              return (
                <line
                  key={k}
                  className="gx-wk"
                  x1={x}
                  x2={x}
                  y1={376}
                  y2={k === 0 || k === WEEKS ? 360 : 368}
                  style={{ "--k": k } as CSSProperties}
                />
              );
            })}
            <line className="gx-axis" x1="40" x2="960" y1="376" y2="376" />
            <line className="gx-target" x1="470" x2="960" y1="132" y2="132" />
            <path d={MAIN} pathLength={1} className="gx-main" />
            {ENDS.map((d, k) => (
              <g key={k} className={`gx-end e${k}`}>
                <path
                  d={d}
                  pathLength={1}
                  className="gx-branch"
                  style={{ "--k": k } as CSSProperties}
                />
                <path d={d} pathLength={1} className="gx-pulse" />
                <circle cx="960" cy={END_Y[k]} r="7" className="gx-node" />
              </g>
            ))}
            <circle cx="40" cy="330" r="7" className="gx-node start" />
            <circle cx="650" cy="200" r="5" className="gx-node split" />
            <circle cx="40" cy="330" r="9" className="gx-dot" />
          </svg>
          <p className="gx-lab s">{g["line start"]}</p>
          <p className="gx-lab w">{g["line weeks"]}</p>
          <p className="gx-lab d">{g["line end"]}</p>
          <p className="gx-lab t">{g.promise}</p>
        </div>
        <ol className="gx-ends">
          {outcomes.map(([r, w], k) => (
            <li
              key={r}
              className={`e${k}`}
              style={{ "--y": `${(END_Y[k] / 400) * 100}%` } as CSSProperties}
            >
              <button type="button" aria-pressed={false}>
                <b>{r}</b>
                <span>{w}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="gx-promise rv">
        <p className="big">{g.promise}</p>
        {g["promise note"] ? <p className="note">{g["promise note"]}</p> : null}
      </div>

      <div className="gx-deal">
        <Side title={g["we do title"]} items={weDo} cls="we" />
        <Side title={g["you do title"]} items={youDo} cls="you" />
      </div>

      <div className="gx-foot rv">
        <div>
          {covers.length ? (
            <ul className="gx-covers">
              {covers.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          ) : null}
          {g.claim ? <p className="claim">{g.claim}</p> : null}
          {g.link ? <TextLink label={g.link} href={ROUTES.guarantee} /> : null}
        </div>
      </div>
    </div>
  );
}

/** One side of the deal: a title and its lines, each with a tick that draws in its turn. The two sides take
 *  turns (ours, theirs, ours...), like an exchange. */
function Side({ title, items, cls }: { title?: string; items: string[]; cls: string }) {
  if (!items.length) return null;
  return (
    <div className={`gx-side ${cls} rv`}>
      <h3>{title}</h3>
      <ul>
        {items.map((x, k) => (
          <li key={x} style={{ "--k": k * 2 + (cls === "you" ? 1 : 0) } as CSSProperties}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 10.5 8.2 14.5 16 5.5" pathLength={1} />
            </svg>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
