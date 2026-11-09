// One "how it works" row: a product screen (a laptop-wide screen or the phone) beside its words. The home page
// shows the shared product through real portal captures (PortalShot): the student's Today with the Daily 10,
// and Progress, which parents see too. The program page shows the live class and the private page the
// one-on-one review. Words from site-copy.ts.
import { section } from "@/lib/marketing/site-copy";
import { SCREENS } from "./live/screens";
import { delay, Drawn, Kinetic, Phone, TextLink } from "./parts";
import { ROUTES } from "./routes";
import Photo from "./Photo";
import PortalShot from "./PortalShot";

const SHOTS = {
  2: { media: "wide", screen: SCREENS.zoom, side: "right" },
  3: { media: "wide", screen: SCREENS.review, side: "left" },
  4: { media: "phone", screen: null, side: "right" },
  5: { media: "phone", screen: null, side: "left" },
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
      <div className="media rv" aria-hidden={children || x.media === "phone" ? undefined : true}>
        {children ??
          (n === 4 ? (
            <>
              <Photo name="daily" className="f-ph" clip />
              <div className="turn">
                <Phone>
                  <PortalShot
                    screen="today"
                    device="phone"
                    alt="The student's Today screen in the Karman app: Your Daily 10, with a Start Your Daily 10 button, and the homework due tonight"
                  />
                </Phone>
              </div>
            </>
          ) : n === 5 ? (
            <div className="turn">
              <Phone>
                <PortalShot
                  screen="progress"
                  device="phone"
                  alt="Progress in the Karman app: one predicted score, 1320, up 100 since October 4, and a ring of 39 skills by level"
                />
              </Phone>
            </div>
          ) : x.screen ? (
            <Drawn as="figure" className="wide" aria-hidden html={x.screen()} />
          ) : null)}
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
        {f["research link"] ? <TextLink label={f["research link"]} href={ROUTES.research} /> : null}
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
