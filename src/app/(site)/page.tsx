import ClaimPill from "@/components/site/home/ClaimPill";
import Doubts from "@/components/site/home/Doubts";
import Flock from "@/components/site/home/Flock";
import Guarantee from "@/components/site/home/Guarantee";
import { HeadWords, nums } from "@/components/site/home/Head";
import Lanterns from "@/components/site/home/Lanterns";
import Receipts from "@/components/site/home/Receipts";
import Ways from "@/components/site/home/Ways";
import { artWords } from "@/components/site/home/WayArt";
import TutorArc from "@/components/site/home/TutorArc";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import { jsonLd, pageMeta } from "@/components/site/meta";
import { Btn, TextLink } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { CONTACT, GUARANTEE, TRACK_RECORD } from "@/lib/marketing/offer";
import { siteOrigin } from "@/lib/marketing/public-pages";
import { RECEIPTS, RECEIPTS_ARE_SAMPLES } from "@/lib/marketing/receipts";
import { SCHOOLS } from "@/lib/marketing/schools";
import { TUTOR_PHOTOS } from "@/lib/marketing/tutors";
import { pairs, section, SITE } from "@/lib/marketing/site-copy";

export const metadata = pageMeta(
  ROUTES.home,
  "Karman Prep: SAT prep with a score guarantee",
  "SAT prep taught by PhD students, medical students and university professors, with a score guarantee and tutors who see every answer. Start free: the student portal opens the moment you sign up."
);

const ORG = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Karman Prep",
  url: siteOrigin(),
  email: CONTACT.general,
  description: section(1).text,
};

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
  const tutorKinds = pairs(who.credentials);
  const tutorPhotos = TUTOR_PHOTOS.map((t) => ({
    src: t.src,
    kind: Math.max(
      0,
      tutorKinds.findIndex(([name]) => name === t.kind)
    ),
  }));
  const how = section(6);
  const doubts = section(13);
  /* while the rows are samples, the section says so under its heading (receipts.ts) */
  const receipts = section(14);
  return (
    <SitePage kind="home" className={litFonts}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ORG)} />
      {/* a visitor who has already watched the headline arrive this visit sees it at once */}
      <script dangerouslySetInnerHTML={{ __html: CLAIM_BOOT }} />

      {/* 1. The claim */}
      <section className="claim" id="claim">
        <Flock />
        <div className="mist" aria-hidden="true" />
        <div className="say">
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
            <Btn label={claim.button} href={ROUTES.start} />
          </div>
          <p className="fine">{claim["button note"]}</p>
        </div>
      </section>

      {/* 2. The proof */}
      <section className="sect proof" id="proof" aria-labelledby="proof-h">
        <div className="mist" aria-hidden="true" />
        <div className="inner rv">
          <h2 id="proof-h">{nums(proof.headline)}</h2>
          <p className="lede">{proof.text}</p>
        </div>
        <ul className="sr">
          {SCHOOLS.map((x) => (
            <li key={x.name}>{x.name}</li>
          ))}
        </ul>
        <Lanterns schools={SCHOOLS} />
      </section>

      {/* 3. The offer */}
      <section className="sect offer" id="offer" aria-labelledby="offer-h">
        <div className="mist" aria-hidden="true" />
        <div className="inner">
          <div className="rv">
            <h2 id="offer-h">{nums(offer.headline)}</h2>
          </div>
          <Guarantee
            outcomes={pairs(offer.outcomes)}
            words={{
              line: offer.text,
              signed: SITE.logo,
              stamp: `+${GUARANTEE.bands[0].private}`,
              stampUnit: offer["stamp unit"],
              stampRing: offer["stamp ring"],
            }}
          />
          <TextLink label={offer.link} href={ROUTES.guarantee} />
        </div>
      </section>

      {/* 4. Who teaches */}
      <section className="sect who" id="who" aria-labelledby="who-h">
        <div className="mist" aria-hidden="true" />
        <div className="inner">
          <h2 className="rv" id="who-h">
            {who.headline}
          </h2>
          <TutorArc photos={tutorPhotos} kinds={tutorKinds} />
        </div>
      </section>

      {/* 5. How we teach */}
      <section className="sect how" id="how" aria-labelledby="how-h">
        <div className="mist" aria-hidden="true" />
        <div className="inner">
          <h2 className="rv" id="how-h">
            {nums(how.headline)}
          </h2>
          <Ways items={pairs(how.ways)} words={artWords(how["art words"])} />
          <TextLink label={how["research link"]} href={ROUTES.research} />
        </div>
      </section>

      {/* The receipts: what students scored, and the texts behind it */}
      <section className="sect receipts" id="receipts" aria-labelledby="receipts-h">
        <div className="mist" aria-hidden="true" />
        <div className="inner">
          <Receipts
            headline={receipts.headline}
            note={RECEIPTS_ARE_SAMPLES ? receipts["sample note"] : undefined}
            headingId="receipts-h"
            rows={RECEIPTS}
          />
        </div>
      </section>

      {/* 6. Their doubts */}
      <section className="sect ask" id="ask" aria-labelledby="ask-h">
        <div className="mist" aria-hidden="true" />
        <div className="inner">
          <h2 className="rv" id="ask-h">
            {doubts.headline}
          </h2>
          <Doubts
            items={pairs(doubts.asks)}
            words={{
              label: doubts.label,
              box: doubts.box,
              typing: doubts.typing,
              delivered: doubts.delivered,
              read: doubts.read,
            }}
          />
        </div>
      </section>
    </SitePage>
  );
}
