// One "how it works" row: a laptop-wide product screen beside its words. The program page shows the live
// class and the private page the one-on-one review. Words from site-copy.ts (sections 2 and 3).
import { section } from "@/lib/marketing/site-copy";
import { SCREENS } from "./live/screens";
import { delay, Drawn, Kinetic } from "./parts";

const SHOTS = {
  2: { media: "wide", screen: SCREENS.zoom, side: "right" },
  3: { media: "wide", screen: SCREENS.review, side: "left" },
} as const;

export default function Feature({
  n,
  children,
}: {
  n: keyof typeof SHOTS;
  children?: React.ReactNode;
}) {
  const x = SHOTS[n];
  const f = section(n);
  return (
    <article className={`feat ${x.side} m-${x.media}`} id={`m-${n}`}>
      <div className="media rv" aria-hidden={children ? undefined : true}>
        {children ?? <Drawn as="figure" className="wide" aria-hidden html={x.screen()} />}
      </div>
      <div className="words rv" style={delay(0.1)}>
        {f.headline ? (
          <h2 className="kin rv">
            <Kinetic text={f.headline} />
          </h2>
        ) : null}
        {f["feature title"] || f["feature text"] ? (
          <p className="lede">
            {f["feature title"] ? <b>{f["feature title"]}</b> : null} {f["feature text"]}
          </p>
        ) : null}
        {f["card title"] ? (
          <p className="note">
            <b>{f["card title"]}</b> {f["card text"]}
          </p>
        ) : null}
      </div>
    </article>
  );
}

/** A single feature row as its own section on an inner page. */
export function FeatureSection({ n }: { n: keyof typeof SHOTS }) {
  return (
    <section className="i-sec features" data-light>
      <div className="in">
        <Feature n={n} />
      </div>
    </section>
  );
}
