"use client";

// TEMPORARY (2026-11-10): three other ways to show the guarantee, none with a slider or big buttons, for the
// founder to pick from. Never shown in production. The choice is data-gua on <html> (0 is today's flip
// tiles); the styles are in styles/guarantee-lab.css. The winner replaces ScoreTiles.tsx; this file goes.
import { useEffect, useState } from "react";
import "@/app/(site)/styles/guarantee-lab.css";
import { nums } from "./Head";
import Seg from "./Seg";

export interface LabBand {
  label: string;
  private: number;
  cohort: number;
}
interface Props {
  bands: LabBand[];
  outcomes: [string, string][];
  words: Record<"private" | "cohort" | "track" | "promise" | "none" | "free" | "signed", string>;
}

const OPTIONS = [
  ["0", "Today"],
  ["1", "A. Find your row"],
  ["2", "B. Pick a range"],
  ["3", "C. Written promise"],
] as const;

function Outcomes({ outcomes }: { outcomes: [string, string][] }) {
  return (
    <ul className="gua-outcomes">
      {outcomes.map(([name, line]) => (
        <li key={name}>
          <b>{name}</b>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

export default function GuaranteeLab({ bands, outcomes, words }: Props) {
  const [picked, setPicked] = useState("0");
  const [track, setTrack] = useState(0);
  const [range, setRange] = useState(0);
  const key = track === 0 ? "private" : "cohort";
  useEffect(() => {
    const v = new URLSearchParams(location.search).get("gua") ?? "0";
    document.documentElement.dataset.gua = v;
    setPicked(v);
  }, []);
  const pick = (v: string) => {
    const url = new URL(location.href);
    url.searchParams.set("gua", v);
    history.replaceState(null, "", url);
    document.documentElement.dataset.gua = v;
    setPicked(v);
  };
  const tracks = (
    <Seg
      labels={[words.private, words.cohort]}
      value={track}
      onChange={setTrack}
      label={words.track}
    />
  );

  return (
    <>
      {/* A. Find your row: the four starting ranges and what each is promised, all in view at once */}
      <div className="gua gua-rows">
        {tracks}
        <ul className="gua-ladder">
          {bands.map((b) => (
            <li key={b.label}>
              <span>{b.label}</span>
              <i aria-hidden="true" />
              <b key={`${key}${b[key]}`}>{nums(`+${b[key]}`)}</b>
            </li>
          ))}
        </ul>
        <p className="gua-none">{words.none}</p>
        <Outcomes outcomes={outcomes} />
        <p className="gua-free">{words.free}</p>
      </div>

      {/* B. Pick a range: two small switches, and one big sentence that answers */}
      <div className="gua gua-pick">
        {tracks}
        <div className="gua-chips" role="radiogroup" aria-label={words.track}>
          {bands.map((b, i) => (
            <button
              key={b.label}
              type="button"
              role="radio"
              aria-checked={i === range}
              data-on={i === range || undefined}
              onClick={() => setRange(i)}
            >
              {b.label}
            </button>
          ))}
        </div>
        <p className="gua-answer" aria-live="polite">
          {words.promise}{" "}
          <span key={`${key}${range}`}>{nums(`+${bands[range][key]} points.`)}</span>
        </p>
        <Outcomes outcomes={outcomes} />
        <p className="gua-free">{words.free}</p>
      </div>

      {/* C. Written promise: the whole guarantee on one sheet of paper, signed */}
      <div className="gua gua-paper">
        {tracks}
        <div className="gua-sheet">
          <p className="gua-sheet-head">{words.promise}</p>
          <ul className="gua-lines">
            {bands.map((b) => (
              <li key={b.label}>
                <span>{b.label}</span>
                <b key={`${key}${b[key]}`}>{nums(`+${b[key]}`)}</b>
              </li>
            ))}
          </ul>
          <Outcomes outcomes={outcomes} />
          <p className="gua-free">{words.free}</p>
          <p className="gua-sign">{words.signed}</p>
        </div>
      </div>

      <aside className="lab" aria-label="Options to try">
        <b>Guarantee section: tap an option to see it on the page</b>
        <div>
          {OPTIONS.map(([v, label]) => (
            <button
              key={v}
              type="button"
              data-on={picked === v || undefined}
              onClick={() => pick(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
