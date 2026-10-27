// The home page's own section (2026-10-26): who teaches.
// Every word comes from site-copy.ts (section 12).
import { pairs, section } from "@/lib/marketing/site-copy";
import { delay, Kinetic } from "../parts";
import Photo from "../Photo";
import CredArt, { type CredKind } from "./CredArt";

const CREDS: CredKind[] = ["phd", "quant", "analyst", "research", "professor", "certified"];

/** The tutors, near the top: the kinds of people who teach, each with one plain line. */
export function Tutors() {
  const f = section(12);
  return (
    <section className="tutors" id="tutors" aria-labelledby="tutors-h">
      <div className="in">
        <div className="t-top">
          <div className="h-head">
            {f.eyebrow ? <p className="eyebrow rv">{f.eyebrow}</p> : null}
            <h2 className="rv kin" id="tutors-h">
              <Kinetic text={f.headline} />
            </h2>
            {f.text ? (
              <p className="lede rv" style={delay(0.08)}>
                {f.text}
              </p>
            ) : null}
          </div>
          <Photo name="lin" className="t-ph rv" />
        </div>
        <ul className="creds">
          {pairs(f.credentials).map(([who, line], k) => (
            <li className="rv" style={delay(k * 0.06)} key={who}>
              <CredArt kind={CREDS[k] ?? "research"} />
              <b>{who}</b>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
