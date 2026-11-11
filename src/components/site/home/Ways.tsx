// The seven ways Karman teaches a skill. Each has one detailed picture that moves (WayArt.tsx): an object
// and a real diagram for that method, in ink and cream with one accent colour of its own. Words from
// site-copy.ts (section 6), in the same order as the pictures. The layout is in painted.css (.ways); under
// reduced motion, or the footer's still button, every picture rests finished.
import type { CSSProperties } from "react";
import { wayArt, type ArtWords } from "./WayArt";

export default function Ways({ items, words }: { items: [string, string][]; words: ArtWords }) {
  return (
    <ul className="ways">
      {items.map(([name, line], k) => (
        <li
          className="rv"
          key={name}
          style={{ "--k": k, transitionDelay: `${k * 80}ms` } as CSSProperties}
        >
          <div className="way-art" aria-hidden="true">
            <svg viewBox="0 0 320 220">{wayArt(k, words)}</svg>
          </div>
          <i aria-hidden="true">{k + 1}</i>
          <b>{name}</b>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
