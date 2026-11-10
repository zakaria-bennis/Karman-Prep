// Where Karman's students go: each university's own logo, in its own colours, drifting in two rows that run
// opposite ways on one soft cream band. No names, no tiles. Each row is written twice so it loops without a
// seam; the second copy is hidden from screen readers, and the page lists the names once for them.
// Pointing at the band holds it; pointing at a logo lifts it (painted.css, .logos).
import type { CSSProperties } from "react";
import type { School } from "@/lib/marketing/schools";

function Row({ schools, reverse }: { schools: School[]; reverse?: boolean }) {
  return (
    <div
      className={`lg-row ${reverse ? "rev" : ""}`}
      style={{ "--n": schools.length } as CSSProperties}
    >
      {[0, 1].map((copy) => (
        <ul key={copy} aria-hidden={copy ? true : undefined}>
          {schools.map((s, i) => (
            <li key={s.name} style={{ "--k": i } as CSSProperties}>
              {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG logos */}
              <img
                src={`/site/schools/${s.logo}.svg`}
                alt={copy ? "" : s.name}
                loading="lazy"
                decoding="async"
              />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

export default function Logos({ schools }: { schools: School[] }) {
  const half = Math.ceil(schools.length / 2);
  return (
    <div className="logos rv">
      <Row schools={schools.slice(0, half)} />
      <Row schools={schools.slice(half)} reverse />
    </div>
  );
}
