"use client";

// TEMPORARY, development builds only: four other layouts of the "six ways" section for the founder to
// choose from, each with all six on screen at once and the research up front (styles/ways-lab.css). The
// switch at the bottom left sets data-ways on the section. Once he picks, this file, the stylesheet and
// the layouts he passed over are deleted.
import { useEffect, useState } from "react";

export interface Study {
  name: string;
  found: string;
  karman: string;
  source: string;
}

const LAYOUTS = [
  ["now", "Now"],
  ["1", "1"],
  ["2", "2"],
  ["3", "3"],
  ["4", "4"],
] as const;

/** "Roediger and Karpicke, Psychological Science, 2006" in its three parts. */
const cite = (source: string) => {
  const parts = source.split(", ");
  return { who: parts[0], journal: parts.slice(1, -1).join(", "), year: parts.at(-1) ?? "" };
};

export default function WaysLab({
  studies,
  words,
}: {
  studies: Study[];
  words: { found: string; built: string; study: string };
}) {
  const [at, setAt] = useState("now");

  useEffect(() => {
    const asked = new URLSearchParams(location.search).get("ways");
    const kept = sessionStorage.getItem("karman-ways");
    const first = [asked, kept].find((v) => LAYOUTS.some(([k]) => k === v));
    if (first) setAt(first);
  }, []);

  useEffect(() => {
    document.getElementById("how")?.setAttribute("data-ways", at);
    sessionStorage.setItem("karman-ways", at);
  }, [at]);

  const byYear = [...studies].sort((a, b) =>
    cite(a.source).year.localeCompare(cite(b.source).year)
  );
  return (
    <>
      {/* 1. Split cards: the finding on ink, what Karman built from it on cream */}
      <ul className="wl wl-split" data-v="1">
        {studies.map((s) => {
          const c = cite(s.source);
          return (
            <li key={s.name}>
              <div className="wl-top">
                <p className="wl-src">
                  {c.journal}, {c.year}
                </p>
                <h3>{s.name}</h3>
                <p>{c.who}</p>
              </div>
              <div className="wl-we">
                <b>{words.built}</b>
                <p>{s.karman}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* 2. The ledger: a plain list, like the receipts */}
      <div className="wl wl-ledger" data-v="2">
        <p className="wl-head" aria-hidden="true">
          <span>{words.found}</span>
          <span>{words.study}</span>
          <span>{words.built}</span>
        </p>
        <ol>
          {studies.map((s) => {
            const c = cite(s.source);
            return (
              <li key={s.name}>
                <h3>{s.name}</h3>
                <p className="wl-src">
                  {c.who}
                  <br /> {c.journal}, {c.year}
                </p>
                <p className="wl-we">{s.karman}</p>
              </li>
            );
          })}
        </ol>
      </div>

      {/* 4. By the year: six studies along one line */}
      <ol className="wl wl-years" data-v="4">
        {byYear.map((s) => {
          const c = cite(s.source);
          return (
            <li key={s.name}>
              <p className="wl-year">{c.year}</p>
              <p className="wl-src">{c.who}</p>
              <h3>{s.name}</h3>
              <p className="wl-we">{s.karman}</p>
            </li>
          );
        })}
      </ol>

      <div className="lab-pick" role="group" aria-label="Six ways layout">
        <span>Six ways</span>
        {LAYOUTS.map(([k, label]) => (
          <button key={k} type="button" aria-pressed={at === k} onClick={() => setAt(k)}>
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
