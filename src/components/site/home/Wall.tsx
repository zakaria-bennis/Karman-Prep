// The wall of student phones on the home page (ported from the mock's film.js): six columns of fifteen
// phones (three columns on a phone), each column repeated once for a seamless drift. The message screens are
// placeholders with no words until the founder's real iMessage screens replace them.
import type { CSSProperties } from "react";
import { Phone } from "../parts";

const COLS = 6,
  PER = 15;
const OFFSETS = [0, -38, -12, -52, -24, -44]; // percent of a phone's height: the stagger

function chats(): string[] {
  // a fixed seed, so the server and every visit draw the same wall
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: COLS * PER }, () => {
    const bubbles: string[] = [];
    const n = 6 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const out = rnd() > 0.45;
      const lines = 1 + Math.floor(rnd() * 3);
      const ws = Array.from(
        { length: lines },
        (_, j) => `<i style="width:${j === lines - 1 ? (40 + rnd() * 50).toFixed(1) : 100}%"></i>`
      ).join("");
      bubbles.push(
        `<span class="b ${out ? "out" : "in"}${out && rnd() > 0.82 ? " k" : ""}" style="width:${(46 + rnd() * 28).toFixed(1)}%">${ws}</span>`
      );
    }
    const t = (16 + rnd() * 14).toFixed(1),
      dl = (-rnd() * 30).toFixed(1);
    return `<div class="screen chat"><div class="top"><span class="av"></span><span class="nm"></span></div><div class="feed"><div class="thread" style="--t:${t}s;--dl:${dl}s">${bubbles.join("")}${bubbles.join("")}</div></div></div>`;
  });
}

const SCREENS = chats();

export default function Wall() {
  return (
    <div className="wall" aria-hidden="true">
      <div className="tilt">
        {Array.from({ length: COLS }, (_, c) => {
          const phones = SCREENS.slice(c * PER, (c + 1) * PER);
          const style = {
            "--t": `${110 + c * 9}s`,
            "--tn": `${(70 + c * 9) * 1.5}s`, // fifteen phones where the mock drew ten on phones
            "--off": `${(OFFSETS[c] * 2.095).toFixed(1)}%`,
          } as CSSProperties;
          return (
            <div className="col" style={style} key={c}>
              {[...phones, ...phones].map((s, i) => (
                <Phone screen={s} key={i} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
