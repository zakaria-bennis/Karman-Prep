"use client";

// TEMPORARY (2026-11-10): three short, signed versions of the guarantee for the founder to pick from. He
// asked for less information here (the full rules are one link away) and liked the promise being signed.
// Never shown in production. The choice is data-gua on <html> (0 is today's flip tiles); the styles are in
// styles/guarantee-lab.css. The winner replaces ScoreTiles.tsx; this file goes.
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
  /** The two outcomes where money comes back, as [name, line]. */
  back: [string, string][];
  words: Record<"private" | "cohort" | "track" | "promise" | "signed" | "role", string>;
}

const OPTIONS = [
  ["0", "Today"],
  ["1", "A. Signed line"],
  ["2", "B. Signed note"],
  ["3", "C. Signed, your number"],
] as const;

/** The founder's name, written out when it scrolls into view, with a stroke under it. */
function Signature({ name, role }: { name: string; role: string }) {
  return (
    <p className="gua-sig rv">
      <span className="gua-sig-name">
        {name}
        <svg viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true">
          <path d="M4 14 C 60 4, 120 22, 180 10 S 270 6, 296 12" pathLength="1" />
        </svg>
      </span>
      <span className="gua-sig-role">{role}</span>
    </p>
  );
}

function Back({ back }: { back: [string, string][] }) {
  return (
    <ul className="gua-back">
      {back.map(([name, line]) => (
        <li key={name}>
          <b>{name}</b> {line}
        </li>
      ))}
    </ul>
  );
}

export default function GuaranteeLab({ bands, back, words }: Props) {
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
  const sign = <Signature name={words.signed} role={words.role} />;

  return (
    <>
      {/* A. Signed line: the headline is the promise; two short lines and a signature under it */}
      <div className="gua gua-line">
        <Back back={back} />
        {sign}
      </div>

      {/* B. Signed note: the same few words on a small sheet of paper, tilted, signed */}
      <div className="gua gua-note">
        <div className="gua-sheet">
          <Back back={back} />
          {sign}
        </div>
      </div>

      {/* C. Signed, your number: pick a starting range, read one sentence, signed */}
      <div className="gua gua-pick">
        <Seg
          labels={[words.private, words.cohort]}
          value={track}
          onChange={setTrack}
          label={words.track}
          small
        />
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
        {sign}
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
