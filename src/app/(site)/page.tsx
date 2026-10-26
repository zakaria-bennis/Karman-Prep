import HomeFilm from "@/components/site/home/HomeFilm";
import Wall from "@/components/site/home/Wall";
import SitePage from "@/components/site/SitePage";
import TenFigure from "@/components/site/TenFigure";
import { SCREENS } from "@/components/site/live/screens";
import { jsonLd, pageMeta } from "@/components/site/meta";
import {
  Action,
  Arrow,
  delay,
  Drawn,
  GuaranteeBlock,
  Kinetic,
  Phone,
} from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { CONTACT } from "@/lib/marketing/offer";
import { siteOrigin } from "@/lib/marketing/public-pages";
import { section } from "@/lib/marketing/site-copy";

export const metadata = pageMeta(
  ROUTES.home,
  "Karman Prep: SAT programs that end on your test date",
  "Live SAT classes in groups of up to six, daily practice, and a one-on-one review after every full-length test, all planned back from your student's SAT date."
);

const ORG = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Karman Prep",
  url: siteOrigin(),
  email: CONTACT.general,
  description: section(1).text,
};

/** The features, most important first; each screen sits at the outer edge of the page. */
const FEATURES = [
  { n: 2, media: "wide", screen: SCREENS.schedule, side: "right" },
  { n: 3, media: "wide", screen: SCREENS.review, side: "left" },
  { n: 4, media: "phone", screen: SCREENS.daily10, side: "right", ten: true },
  { n: 5, media: "phone", screen: SCREENS.parent, side: "left" },
  { n: 6, media: "phone", screen: SCREENS.wordline, side: "right", minor: true },
] as const;

function Feature({ x }: { x: (typeof FEATURES)[number] }) {
  const f = section(x.n);
  return (
    <article
      className={`feat ${x.side}${"minor" in x ? "minor" : ""} m-${x.media}`}
      id={`m-${x.n}`}
    >
      <div className="media rv" aria-hidden="true">
        {x.media === "phone" ? (
          <div className="turn">
            <Phone screen={x.screen()} left={x.side === "left"} />
          </div>
        ) : (
          <Drawn as="figure" className="wide" aria-hidden html={x.screen()} />
        )}
      </div>
      <div className="words rv" style={delay(0.1)}>
        {f.headline ? <h2>{f.headline}</h2> : null}
        {f["feature title"] || f["feature text"] ? (
          <p className="lede">
            {f["feature title"] ? <b>{f["feature title"]}</b> : null} {f["feature text"]}
          </p>
        ) : null}
        {f["card title"] ? (
          <p className="note">
            <b>{f["card title"]}</b>
            {f["card text"]}
          </p>
        ) : null}
        {"ten" in x ? <TenFigure /> : null}
      </div>
    </article>
  );
}

const CAMPUS = ["c8a", "c8b", "c8c"];

export default function HomePage() {
  const hero = section(1);
  const date = section(7);
  const campus = section(9);
  const msgs = section(10);
  const end = section(11);
  return (
    <SitePage kind="home" stage={<HomeFilm />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ORG)} />
      <link
        rel="preload"
        as="image"
        href="/site/film/day.jpg"
        media="(min-width: 761px), (orientation: landscape)"
      />
      <link
        rel="preload"
        as="image"
        href="/site/film/day-p.jpg"
        media="(max-width: 760px) and (orientation: portrait)"
      />
      <section className="window hero" id="m-1">
        <div className="in">
          <h1>
            <Kinetic text={hero.headline} />
          </h1>
          {hero.text ? (
            <p className="lede rv" style={delay(0.45)}>
              {hero.text}
            </p>
          ) : null}
          <div className="rv" style={delay(0.6)}>
            <Action f={hero} href={ROUTES.test} />
          </div>
          {hero.proof ? (
            <p className="proof rv" style={delay(0.75)}>
              {hero.proof}
            </p>
          ) : null}
        </div>
        <span className="cue" aria-hidden="true" />
      </section>

      <section className="panel features" id="features">
        <div className="in">
          {FEATURES.map((x) => (
            <Feature x={x} key={x.n} />
          ))}
        </div>
      </section>

      <section className="window statement" id="m-7">
        <div className="in">
          {date.headline ? <h2 className="rv">{date.headline}</h2> : null}
          {date["card date"] ? (
            <div className="datecard rv" style={delay(0.15)}>
              {date["card intro"] ? <p className="i">{date["card intro"]}</p> : null}
              <p className="d">{date["card date"]}</p>
              {date["card later"] ? <p className="l">{date["card later"]}</p> : null}
              {date["card link"] ? (
                <a className="lk" href="#m-8">
                  {date["card link"]}
                  <Arrow />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel guarantee dark" id="m-8" aria-labelledby="g-h">
        <div className="in">
          <GuaranteeBlock g={section(8)} headId="g-h" />
        </div>
      </section>

      <section
        className="panel campus dark"
        id="m-9"
        aria-labelledby={campus.headline ? "c-h" : undefined}
        aria-hidden={campus.headline ? undefined : true}
      >
        {campus.headline ? (
          <h2 className="rv" id="c-h">
            {campus.headline}
          </h2>
        ) : null}
        <div className="tri">
          {CAMPUS.map((id, k) => (
            <div className="clip rv" style={delay(k * 0.12)} key={id}>
              <video
                muted
                playsInline
                preload="none"
                poster={`/site/film/${id}-r0.jpg`}
                data-src={`/site/film/${id}-r.mp4`}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="panel messages" id="m-10">
        {msgs.headline ? (
          <div className="in">
            <h2 className="rv">{msgs.headline}</h2>
          </div>
        ) : null}
        <Wall />
      </section>

      <section className="window end" id="m-11">
        <div className="in">
          <h2 className="rv">{end.headline}</h2>
          {end.text ? (
            <p className="lede rv" style={delay(0.1)}>
              {end.text}
            </p>
          ) : null}
          {end.objection ? (
            <p className="obj rv" style={delay(0.15)}>
              {end.objection}
            </p>
          ) : null}
          <div className="rv" style={delay(0.2)}>
            <Action f={end} href={ROUTES.test} />
          </div>
        </div>
        {end["line note"] ? (
          <div className="kline rv" style={delay(0.35)}>
            <span className="bar" aria-hidden="true" />
            <p>{end["line note"]}</p>
          </div>
        ) : null}
      </section>
    </SitePage>
  );
}
