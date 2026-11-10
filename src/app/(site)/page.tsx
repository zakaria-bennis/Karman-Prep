import ClaimPill from "@/components/site/home/ClaimPill";
import Doubts from "@/components/site/home/Doubts";
import Fireflies from "@/components/site/home/Fireflies";
import Flock from "@/components/site/home/Flock";
import { homeFonts } from "@/components/site/home/fonts";
import { HeadWords, nums } from "@/components/site/home/Head";
import HomeLab, { LAB_BOOT } from "@/components/site/home/HomeLab";
import HomeJourney from "@/components/site/home/HomeJourney";
import HomeTouches from "@/components/site/home/HomeTouches";
import Logos from "@/components/site/home/Logos";
import ScoreTiles from "@/components/site/home/ScoreTiles";
import Ways from "@/components/site/home/Ways";
import SitePage from "@/components/site/SitePage";
import { jsonLd, pageMeta } from "@/components/site/meta";
import { Arrow, Btn, TextLink } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { CONTACT, GUARANTEE, TRACK_RECORD } from "@/lib/marketing/offer";
import { siteOrigin } from "@/lib/marketing/public-pages";
import { SCHOOLS } from "@/lib/marketing/schools";
import { pairs, section } from "@/lib/marketing/site-copy";

export const metadata = pageMeta(
  ROUTES.home,
  "Karman Prep: SAT tutors who see every answer",
  "SAT prep taught by PhD students, quants and university professors, with a score guarantee and tutors who see every answer. Start free: the student portal opens the moment you sign up."
);

const ORG = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Karman Prep",
  url: siteOrigin(),
  email: CONTACT.general,
  description: section(1).text,
};

/** The drawing for each kind of tutor, in the order the copy lists them (public/site/tutors/). */
const TUTOR_ART = ["phd", "quant", "medic", "writer", "researcher", "professor"];

/* The opening plays once per visit: hide the words before they are drawn, then let them arrive when the
   typefaces are in (painted.css, claim-wait and claim-go). Three seconds is the longest it will wait. */
const CLAIM_BOOT = `try{var d=document.documentElement,k="karman:claim-seen";if(sessionStorage.getItem(k)!=="1"&&!matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("claim-wait");var go=function(){if(d.classList.contains("claim-wait")){d.classList.replace("claim-wait","claim-go");try{sessionStorage.setItem(k,"1")}catch(e){}}};document.fonts.ready.then(function(){setTimeout(go,150)});setTimeout(go,3000)}}catch(e){}`;

/** The headline in three pieces: the words before the number, the number's phrase, the words after. */
function splitClaim(headline: string): [string, string, string] {
  const m = headline.match(/^(.*?)(\d[\d,]*\s+points)(.*)$/);
  return m ? [m[1].trim(), m[2], m[3].trim()] : [headline, "", ""];
}

export default function HomePage() {
  const claim = section(1);
  const [before, number, after] = splitClaim(claim.headline);
  /* the full stop after the number stays with the pill, so it can never start a line */
  const mark = /^[.,!?]/.test(after) ? after[0] : "";
  const rest = after.slice(mark.length).trim();
  const gain = String(TRACK_RECORD.averageGain);
  const proof = section(9);
  const offer = section(10);
  const who = section(12);
  const how = section(6);
  const doubts = section(13);
  const price = section(7);
  const close = section(11);
  return (
    <SitePage kind="home" className={homeFonts} stage={<HomeJourney />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ORG)} />
      <HomeTouches />
      {/* a visitor who has already watched the headline arrive this visit sees it at once */}
      {process.env.NODE_ENV !== "production" ? (
        <>
          <script dangerouslySetInnerHTML={{ __html: LAB_BOOT }} />
          <HomeLab />
        </>
      ) : null}
      <script dangerouslySetInnerHTML={{ __html: CLAIM_BOOT }} />

      {/* 1. The claim */}
      <section className="claim" id="claim">
        <Flock />
        <div className="mist" aria-hidden="true" />
        <div className="say" data-paint-keepout>
          <h1>
            <HeadWords text={before} />{" "}
            {number ? (
              <span className="keep">
                <ClaimPill>
                  <span className="num">{gain}</span> points
                </ClaimPill>
                {mark}
              </span>
            ) : null}{" "}
            <HeadWords text={rest} from={before.split(" ").length + 3} />
          </h1>
          <p className="lede">{claim.text}</p>
          <div className="go-row">
            <Btn label={claim.button} href={ROUTES.signUp} />
            <a className="more" href={ROUTES.pricing}>
              {claim["second button"]}
              <Arrow />
            </a>
          </div>
          <p className="fine">
            {claim["button note"]} <span>{claim.proof}</span>
          </p>
        </div>
      </section>

      {/* 2. The proof */}
      <section className="sect proof" id="proof" aria-labelledby="proof-h">
        <div className="mist" aria-hidden="true" />
        <div className="inner rv" data-paint-keepout>
          <h2 id="proof-h">{nums(proof.headline)}</h2>
          <p className="lede">{proof.text}</p>
        </div>
        <ul className="sr">
          {SCHOOLS.map((x) => (
            <li key={x.name}>{x.name}</li>
          ))}
        </ul>
        <Logos schools={SCHOOLS} />
      </section>

      {/* 3. The offer */}
      <section className="sect offer" id="offer" aria-labelledby="offer-h">
        <div className="mist" aria-hidden="true" />
        <div className="inner" data-paint-keepout>
          <div className="rv">
            <h2 id="offer-h">{nums(offer.headline)}</h2>
            <p className="lede">{offer.text}</p>
          </div>
          <div className="offer-cols">
            <div className="rv">
              <ScoreTiles
                bands={GUARANTEE.bands.map((b) => ({ ...b }))}
                noGuaranteeFrom={GUARANTEE.noGuaranteeFrom}
                words={{
                  private: offer.private,
                  cohort: offer.cohort,
                  track: offer.track,
                  now: offer.now,
                  lower: offer.lower,
                  higher: offer.higher,
                  promise: offer.promise,
                  none: offer.none,
                }}
              />
            </div>
            <ul className="outcomes">
              {pairs(offer.outcomes).map(([name, line], k) => (
                <li className="rv" key={name} style={{ transitionDelay: `${k * 110}ms` }}>
                  <b>{name}</b>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="fine rv">{offer.free}</p>
          <TextLink label={offer.link} href={ROUTES.guarantee} />
        </div>
      </section>

      {/* 4. Who teaches */}
      <section className="sect who" id="who" aria-labelledby="who-h">
        <div className="mist" aria-hidden="true" />
        <div className="inner" data-paint-keepout>
          <h2 className="rv" id="who-h">
            {who.headline}
          </h2>
          <ul className="tutors">
            {pairs(who.credentials).map(([name, line], k) => (
              <li className="rv" key={name} style={{ transitionDelay: `${k * 90}ms` }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG drawings */}
                <img
                  src={`/site/tutors/${TUTOR_ART[k % TUTOR_ART.length]}.svg`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <b>{name}</b>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. How we teach */}
      <section className="sect how" id="how" aria-labelledby="how-h">
        <div className="mist" aria-hidden="true" />
        <div className="inner" data-paint-keepout>
          <h2 className="rv" id="how-h">
            {nums(how.headline)}
          </h2>
          <Ways items={pairs(how.ways)} />
          <TextLink label={how["research link"]} href={ROUTES.research} />
        </div>
      </section>

      {/* 6. Their doubts */}
      <section className="sect ask" id="ask" aria-labelledby="ask-h">
        <div className="mist" aria-hidden="true" />
        <div className="inner" data-paint-keepout>
          <h2 className="rv" id="ask-h">
            {doubts.headline}
          </h2>
          <Doubts items={pairs(doubts.asks)} label={doubts.label} />
        </div>
      </section>

      {/* 7. The price and the close, at night */}
      <section className="sect price night" id="price" aria-labelledby="price-h">
        <Fireflies />
        <div className="mist" aria-hidden="true" />
        <div className="inner" data-paint-keepout>
          <h2 className="rv" id="price-h">
            {nums(price.headline)}
          </h2>
          <ul className="plans">
            {pairs(price.ways).map(([name, line], k) => {
              const cut = line.indexOf(". ");
              return (
                <li className="rv" key={name} style={{ transitionDelay: `${k * 90}ms` }}>
                  <b>{name}</b>
                  <i>{cut > 0 ? line.slice(0, cut) : line}</i>
                  <span>{cut > 0 ? line.slice(cut + 2) : ""}</span>
                </li>
              );
            })}
          </ul>
          <div className="go-row rv">
            <Btn label={close.button} href={ROUTES.signUp} />
            <a className="more" href={ROUTES.pricing}>
              {price.link}
              <Arrow />
            </a>
          </div>
          <p className="lede rv">{close.headline}</p>
        </div>
      </section>
    </SitePage>
  );
}
