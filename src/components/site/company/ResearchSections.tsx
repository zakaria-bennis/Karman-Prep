// The Research page, in the home page's world. The home page's "Seven ways we make a skill stick" links here,
// so the page is organised by those seven ways (founder, 2026-11-11: each method cited "if parents want to see
// it"). 1: the heading, beside the reading list as a shelf of six books, each a link to its study. 2: the seven
// ways, each with the home page's own moving picture (WayArt.tsx), why we do it, and the studies behind it.
// 3: the close. Words: site-copy.ts, sections 81 to 83, and section 6 for the ways themselves. Styles:
// company.css, with the pictures' own styles from painted.css (.ways).
import type { CSSProperties } from "react";
import { Arrow, Btn } from "@/components/site/parts";
import { artWords, wayArt } from "@/components/site/home/WayArt";
import { ROUTES } from "@/components/site/routes";
import { list, pairs, section } from "@/lib/marketing/site-copy";
import { Close } from "./parts";

/** Each study's copy key in section 82, and where to read it (its DOI, checked 2026-10-26). */
export const STUDIES = [
  ["retrieval", "https://doi.org/10.1111/j.1467-9280.2006.01693.x"],
  ["spacing", "https://doi.org/10.1111/j.1467-9280.2008.02209.x"],
  ["review", "https://doi.org/10.1177/1529100612453266"],
  ["mixed", "https://doi.org/10.1007/s11251-007-9015-8"],
  ["feedback", "https://doi.org/10.3102/003465430298487"],
  ["tutoring", "https://doi.org/10.3102/0013189X013006004"],
] as const;

type StudyKey = (typeof STUDIES)[number][0];

/** The studies behind each of the seven ways, in the order of section 6's "ways" line. A study can back more
 *  than one way. */
export const BACKED_BY: StudyKey[][] = [
  ["retrieval"], // skill practice: answering, not rereading
  ["feedback"], // written explanations: what went wrong and what to do next
  ["spacing", "mixed"], // the Daily 10: misses come back later, mixed with other skills
  ["spacing"], // the Challenge: a little every day, not crammed
  ["review"], // time trials: practice testing
  ["review", "retrieval"], // full-length practice tests
  ["tutoring", "feedback"], // live teaching
];

const href = (key: StudyKey) => STUDIES.find(([k]) => k === key)![1];

function ReadLink({ label, source, to }: { label: string; source: string; to: string }) {
  return (
    <a href={to} target="_blank" rel="noopener noreferrer" aria-label={`${label}: ${source}`}>
      {label}
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M5 11 11 5M6 5h5v5" />
      </svg>
    </a>
  );
}

export default function ResearchSections() {
  const open = section(81);
  const f = section(82);
  const close = section(83);
  const how = section(6);
  const ways = pairs(how.ways);
  const why = list(f.why);
  const words = artWords(how["art words"]);
  return (
    <>
      {/* 1. The claim, beside the reading list */}
      <section className="pg-hero" id="top">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in pg-two co-in">
          <div className="pg-say">
            <h1>{open.headline}</h1>
            <p className="lede">{open.text}</p>
            <div className="pg-close">
              <div className="go-row">
                <Btn label={open.button} href={ROUTES.start} />
                <a className="more" href="#ways">
                  {open["second button"]}
                  <Arrow />
                </a>
              </div>
            </div>
          </div>
          <div className="co-card rs-shelf">
            <h2 className="pg-h3">{open.shelf}</h2>
            <ul className="rs-books">
              {STUDIES.map(([key, to], k) => {
                const source = f[`${key} source`];
                const parts = source.split(", ");
                return (
                  <li key={key} style={{ "--k": k } as CSSProperties}>
                    <a
                      href={to}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${f["read link"]}: ${source}`}
                      title={source}
                    >
                      <em>{parts[0].split(" ")[0]}</em>
                      <small>{parts.at(-1)}</small>
                    </a>
                  </li>
                );
              })}
            </ul>
            <div className="rs-plank" aria-hidden="true" />
            <p className="pg-small">{open["shelf note"]}</p>
          </div>
        </div>
      </section>

      {/* 2. The seven ways, each with its picture, its reason and its studies */}
      <section className="sect pg-sect co-tall" id="ways" aria-labelledby="ways-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in co-in co-stack">
          <div className="pg-say rv">
            <h2 id="ways-h">{f.headline}</h2>
            <p className="lede">{f.text}</p>
          </div>
          <ul className="ways rs-ways">
            {ways.map(([name, line], k) => (
              <li className="rv" key={name} style={{ "--k": k } as CSSProperties}>
                <div className="way-art" aria-hidden="true">
                  <svg viewBox="0 0 320 220">{wayArt(k, words)}</svg>
                </div>
                <div className="rs-say">
                  <h3>{name}</h3>
                  <p className="rs-line">{line}</p>
                  <p className="rs-why">{why[k]}</p>
                </div>
                <div className="rs-studies">
                  <p className="rs-label">{f["studies label"]}</p>
                  {BACKED_BY[k].map((key) => (
                    <article className="rs-study" key={key}>
                      <h4>{f[`${key} name`]}</h4>
                      <p>{f[`${key} found`]}</p>
                      <p className="rs-src">
                        <cite>{f[`${key} source`]}</cite>
                        <ReadLink
                          label={f["read link"]}
                          source={f[`${key} source`]}
                          to={href(key)}
                        />
                      </p>
                    </article>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Close
        id="start"
        headline={close.headline}
        text={close.text}
        button={close.button}
        second={{ label: close["second button"], href: ROUTES.test }}
      />
    </>
  );
}
