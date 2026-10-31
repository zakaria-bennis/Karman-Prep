import HomeFilm from "@/components/site/home/HomeFilm";
import { Tutors } from "@/components/site/home/HomeSections";
import Feature from "@/components/site/Feature";
import GuaranteeDeal from "@/components/site/GuaranteeDeal";
import ToolsCarousel from "@/components/site/home/ToolsCarousel";
import SitePage from "@/components/site/SitePage";
import WeekCalendar from "@/components/site/WeekCalendar";
import { jsonLd, pageMeta } from "@/components/site/meta";
import { Arrow, Btn, delay, Kinetic } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { CONTACT } from "@/lib/marketing/offer";
import { siteOrigin } from "@/lib/marketing/public-pages";
import { section } from "@/lib/marketing/site-copy";

export const metadata = pageMeta(
  ROUTES.home,
  "Karman Prep: SAT tutors who see every answer",
  "Live SAT classes of six and private tutoring, taught by PhD students, quants and university professors, with research-backed daily practice and live progress for parents."
);

const ORG = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Karman Prep",
  url: siteOrigin(),
  email: CONTACT.general,
  description: section(1).text,
};

const CAMPUS = ["c8a", "c8b", "c8c"];

export default function HomePage() {
  const hero = section(1);
  const campus = section(9);
  const cal = section(14);
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
          <div className="act two rv" style={delay(0.6)}>
            <Btn label={hero.button} href={ROUTES.test} />
            <a className="btn2" href={ROUTES.pricing}>
              {hero["second button"]}
              <Arrow />
            </a>
            {hero["button note"] ? <small>{hero["button note"]}</small> : null}
          </div>
          {hero.proof ? (
            <p className="proof rv" style={delay(0.75)}>
              {hero.proof}
            </p>
          ) : null}
        </div>
        <span className="cue" aria-hidden="true" />
      </section>

      <div className="panel duo">
        <Tutors />
        <section className="guarantee" id="m-8" aria-labelledby="g-h">
          <div className="in">
            <GuaranteeDeal g={section(8)} headId="g-h" />
          </div>
        </section>
      </div>

      <section className="panel features" id="features">
        <div className="in">
          <Feature n={4} />
          <Feature n={5} />
          <article className="feat cal" id="m-14">
            <div className="words rv">
              <h2>{cal.headline}</h2>
              {cal.text ? <p className="lede">{cal.text}</p> : null}
            </div>
            <div className="cal-fig rv">
              <WeekCalendar />
            </div>
          </article>
          <ToolsCarousel />
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
          <div className="act rv" style={delay(0.2)}>
            <Btn label={end.button} href={ROUTES.test} />
            {end["button note"] ? <small>{end["button note"]}</small> : null}
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
