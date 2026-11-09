// The study tools: a 2 x 2 grid of cards, one column on phones (home.css), so nothing scrolls sideways
// (design rule 28). Each card shows the tool working, drawn in code (live/screens.ts, TOOLS).
// Words from site-copy.ts (6).
import { pairs, section } from "@/lib/marketing/site-copy";
import { TOOLS } from "../live/screens";
import { Drawn, Kinetic } from "../parts";

const UI = [TOOLS.wordline, TOOLS.flashcards, TOOLS.wordlab, TOOLS.challenge];

export default function StudyTools() {
  const f = section(6);
  return (
    <div className="tools-wrap">
      <div className="tools-head">
        <h2 className="rv kin">
          <Kinetic text={f.headline} />
        </h2>
        {f.text ? <p className="lede rv">{f.text}</p> : null}
      </div>
      <ul className="tools-track media rv" aria-label={f.headline}>
        {pairs(f.tools).map(([name, line], k) => (
          <li className="tool" key={name}>
            <Drawn html={UI[k]?.() ?? ""} className="tool-art" aria-hidden />
            <b>{name}</b>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
