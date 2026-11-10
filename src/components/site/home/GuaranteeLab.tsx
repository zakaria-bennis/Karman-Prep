"use client";

// TEMPORARY (2026-11-10): the guarantee, short and signed "Karman" in a quick hand, for the founder to pick
// a layout and a signature. He wants little information here (the full rules are one link away), a
// signature like a company's own scrawl (no name of a person, no title, no underline, not drawn on), and
// layouts modelled on how other companies show a guarantee. Never shown in production. The choices are
// data-gua (layout) and data-sig (signature) on <html>; 0 is today's flip tiles. Styles are in
// styles/guarantee-lab.css; the trial signature faces come from Google Fonts by a plain link, here only.
// The winner replaces ScoreTiles.tsx, its face is then self-hosted through next/font, and this file goes.
import { useEffect, useState } from "react";
import "@/app/(site)/styles/guarantee-lab.css";

interface Props {
  /** The three outcomes, as [name, line]. */
  outcomes: [string, string][];
  words: Record<"line" | "signed" | "seal" | "sealUnit", string>;
}

const LAYOUTS = [
  ["0", "Today"],
  ["1", "A. Promise"],
  ["2", "B. Seal"],
  ["3", "C. Promise and three lines"],
] as const;
/** [value, label, Google Fonts family or "" for the hand-drawn one] */
const SIGNATURES = [
  ["1", "1", "Mrs Saint Delafield"],
  ["2", "2", "Herr Von Muellerhoff"],
  ["3", "3", "Mr De Haviland"],
  ["4", "4", "WindSong"],
  ["5", "5", "Whisper"],
  ["6", "6", "Qwitcher Grypen"],
  ["8", "8", "Nothing You Could Do"],
  ["9", "9 drawn", ""],
] as const;
const FONT_LINK = `https://fonts.googleapis.com/css2?${SIGNATURES.filter((s) => s[2])
  .map((s) => `family=${s[2].replace(/ /g, "+")}`)
  .join("&")}&display=swap`;

/** "Karman", signed in a hurry. Option 9 is one drawn stroke: a K, then the rest trailing off. */
function Signature({ name }: { name: string }) {
  return (
    <p className="gua-sig" aria-label={name}>
      <span aria-hidden="true">{name}</span>
      <svg viewBox="0 0 330 110" aria-hidden="true">
        <path d="M34 12 C 30 40, 24 70, 16 98" />
        <path d="M82 8 C 60 34, 44 50, 26 60 C 48 56, 64 74, 84 96 C 92 78, 100 62, 112 60 C 124 58, 118 86, 128 84 C 138 82, 140 56, 152 58 C 162 60, 154 84, 164 82 C 174 80, 176 60, 186 62 C 194 64, 190 80, 200 78 C 214 75, 216 64, 228 66 C 252 70, 286 62, 322 48" />
      </svg>
    </p>
  );
}

export default function GuaranteeLab({ outcomes, words }: Props) {
  const [layout, setLayout] = useState("0");
  const [sig, setSig] = useState("1");
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const g = q.get("gua") ?? "0";
    const s = q.get("sig") ?? "1";
    document.documentElement.dataset.gua = g;
    document.documentElement.dataset.sig = s;
    setLayout(g);
    setSig(s);
  }, []);
  const pick = (key: "gua" | "sig", v: string) => {
    const url = new URL(location.href);
    url.searchParams.set(key, v);
    history.replaceState(null, "", url);
    document.documentElement.dataset[key] = v;
    (key === "gua" ? setLayout : setSig)(v);
  };
  const sign = <Signature name={words.signed} />;

  return (
    <>
      <link rel="stylesheet" href={FONT_LINK} />

      {/* A. Promise: the headline, one sentence, the signature */}
      <div className="gua gua-a">
        <p className="gua-line">{words.line}</p>
        {sign}
      </div>

      {/* B. Seal: centred, a round seal with the number, then the same sentence and signature */}
      <div className="gua gua-b">
        <div className="gua-seal" aria-hidden="true">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="92" />
            <circle className="thin" cx="100" cy="100" r="80" />
          </svg>
          <b>{words.seal}</b>
          <span>{words.sealUnit}</span>
        </div>
        <p className="gua-line">{words.line}</p>
        {sign}
      </div>

      {/* C. Promise and three lines: the promise and signature on the left, three quiet lines on the right */}
      <div className="gua gua-c">
        <div className="gua-c-say">
          <p className="gua-line">{words.line}</p>
          {sign}
        </div>
        <ul className="gua-three">
          {outcomes.map(([name, line]) => (
            <li key={name}>
              <b>{name}</b>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <aside className="lab" aria-label="Options to try">
        <b>Guarantee: layout</b>
        <div>
          {LAYOUTS.map(([v, label]) => (
            <button
              key={v}
              type="button"
              data-on={layout === v || undefined}
              onClick={() => pick("gua", v)}
            >
              {label}
            </button>
          ))}
        </div>
        <b>Signature</b>
        <div>
          {SIGNATURES.map(([v, label]) => (
            <button
              key={v}
              type="button"
              data-on={sig === v || undefined}
              onClick={() => pick("sig", v)}
            >
              {label}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
