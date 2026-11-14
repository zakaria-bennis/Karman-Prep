// The guarantee page (founder, 2026-11-13: clear, short and calm; nothing on it that is not the guarantee).
// 1: the promise, under a seal. 2: the points we guarantee by starting score, beside what comes back if we
// miss. 3: what each side does, and how a parent watches the guarantee in the open. 4: how to claim, in three
// steps. Words: site-copy.ts sections 51 to 53, 55 and 56, and section 8 for the two lists the home page also shows. Numbers: offer.ts. Styles: guarantee.css.
import { Arrow, Btn } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { Tick } from "@/components/site/company/parts";
import { GUARANTEE as G, guaranteeBandLabel } from "@/lib/marketing/offer";
import { list, pairs, section } from "@/lib/marketing/site-copy";

/** One line of the points table: the starting scores, then what each plan guarantees. */
export function pointRows(): [string, string, string][] {
  return G.bands.map((b, i) => [guaranteeBandLabel(i), `+${b.cohort}`, `+${b.private}`]);
}

/** The seal over the headline: a shield whose tick draws itself. */
function Seal({ label }: { label: string }) {
  return (
    <p className="gq-seal">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path className="shield" d="M32 6l20 7v15c0 14-8.500 23-20 29-11.500-6-20-15-20-29V13z" />
        <path className="tick" pathLength={1} d="M22 32.500l7.500 7.500L43 25" />
      </svg>
      {label}
    </p>
  );
}

export default function GuaranteeSections() {
  const open = section(51);
  const points = section(52);
  const miss = section(53);
  const seen = section(55);
  const claim = section(56);
  const home = section(8);
  const cols = list(points.columns);
  const [[highLabel, highText]] = pairs(points.high);
  return (
    <>
      <section className="pg-hero gq" id="top">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in gq-open">
          <Seal label={open.seal} />
          <h1>{open.headline}</h1>
          <p className="lede">{open.text}</p>
          <div className="pg-close">
            <div className="go-row">
              <Btn label={open.button} href={ROUTES.pricing} />
              <a className="more" href="#points">
                {open.link}
                <Arrow />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="sect pg-sect gq" id="points" aria-labelledby="points-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in co-in gq-two rv">
          <div className="gq-card">
            <h2 id="points-h">{points.headline}</h2>
            <table className="gq-table">
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th scope="col" key={c}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pointRows().map(([label, cohort, priv]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td className="num">{cohort}</td>
                    <td className="num">{priv}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">{highLabel}</th>
                  <td colSpan={2}>{highText}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="gq-card">
            <h2>{miss.headline}</h2>
            <p className="gq-sub">{miss.text}</p>
            <dl className="gq-back">
              {pairs(miss.rows).map(([when, what]) => (
                <div key={when}>
                  <dt>{when}</dt>
                  <dd>{what}</dd>
                </div>
              ))}
            </dl>
            <p className="gq-note">{miss.note}</p>
          </div>
        </div>
      </section>

      <section className="sect pg-sect gq" id="sides" aria-labelledby="sides-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in co-in gq-stack rv">
          <h2 id="sides-h">{seen.sides}</h2>
          <div className="gq-card gq-sides">
            {(
              [
                [home["we do title"], home["we do"]],
                [home["you do title"], home["you do"]],
              ] as const
            ).map(([title, items]) => (
              <div key={title}>
                <h3>{title}</h3>
                <ul>
                  {list(items).map((x) => (
                    <li key={x}>
                      <Tick />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="gq-seen">
            <h3>{seen.headline}</h3>
            <p className="gq-sub">{seen.text}</p>
            <dl>
              {pairs(seen.points).map(([name, line]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{line}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="sect pg-sect gq" id="claim" aria-labelledby="claim-h">
        <div className="mist" aria-hidden="true" />
        <div className="pg-in co-in gq-stack rv">
          <h2 id="claim-h">{claim.headline}</h2>
          <ol className="gq-steps">
            {pairs(claim.steps).map(([when, what], i) => (
              <li className="gq-card" key={when}>
                <b className="num">{i + 1}</b>
                <h3>{when}</h3>
                <p>{what}</p>
              </li>
            ))}
          </ol>
          <p className="gq-note">{claim.note}</p>
          <details className="gq-card gq-proof">
            <summary>{claim.proof}</summary>
            <ol>
              {G.proof.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          </details>
          <Btn label={open.button} href={ROUTES.pricing} />
        </div>
      </section>
    </>
  );
}
