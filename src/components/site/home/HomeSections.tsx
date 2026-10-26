// The home page's own sections (2026-10-26): who teaches and the ways to learn with Karman.
// Every word comes from site-copy.ts (sections 12 and 13).
import { pairs, section } from "@/lib/marketing/site-copy";
import type { IconName } from "../live/icons";
import { Btn, delay, Icon, Seats, TextLink } from "../parts";
import { ROUTES } from "../routes";

const CRED_ICONS: IconName[] = ["phd", "quant", "analyst", "research", "professor", "certified"];

/** The tutors, near the top: the kinds of people who teach, each with one plain line. */
export function Tutors() {
  const f = section(12);
  return (
    <section className="tutors" id="tutors" aria-labelledby="tutors-h">
      <div className="in">
        <div className="h-head">
          {f.eyebrow ? <p className="eyebrow rv">{f.eyebrow}</p> : null}
          <h2 className="rv" id="tutors-h">
            {f.headline}
          </h2>
          {f.text ? (
            <p className="lede rv" style={delay(0.08)}>
              {f.text}
            </p>
          ) : null}
        </div>
        <ul className="creds">
          {pairs(f.credentials).map(([who, line], k) => (
            <li className="rv" style={delay(k * 0.06)} key={who}>
              <Icon name={CRED_ICONS[k] ?? "check"} />
              <b>{who}</b>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The ways to learn: the class, private tutoring and the free test, side by side, with their prices. */
export function Ways() {
  const f = section(13);
  const plans = [
    ["program", ROUTES.program],
    ["private", ROUTES.private],
    ["free", ROUTES.test],
  ] as const;
  return (
    <section className="ways" id="ways" aria-labelledby="ways-h">
      <div className="in">
        <div className="h-head">
          {f.eyebrow ? <p className="eyebrow rv">{f.eyebrow}</p> : null}
          <h2 className="rv" id="ways-h">
            {f.headline}
          </h2>
          {f.text ? (
            <p className="lede rv" style={delay(0.08)}>
              {f.text}
            </p>
          ) : null}
        </div>
        <div className="way-cards">
          {plans.map(([key, href], k) => (
            <article className={`way rv ${key}`} style={delay(k * 0.08)} key={key}>
              <h3>{f[`${key} title`]}</h3>
              <p className="wp">
                <b>{f[`${key} price`]}</b>
                <span>{f[`${key} note`]}</span>
              </p>
              {key === "program" ? <Seats label={f["program seats"]} /> : null}
              <p className="wt">{f[`${key} text`]}</p>
              <TextLink label={f[`${key} link`]} href={href} />
            </article>
          ))}
        </div>
        <div className="rv ways-foot">
          <Btn label={f["pricing link"]} href={ROUTES.pricing} />
        </div>
      </div>
    </section>
  );
}
