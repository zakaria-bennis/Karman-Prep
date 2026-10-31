import ArtDrawing from "@/components/site/ArtDrawing";
import LeadFormCard from "@/components/site/LeadFormCard";
import Photo from "@/components/site/Photo";
import SitePage from "@/components/site/SitePage";
import { InnerHero, Rows } from "@/components/site/inner";
import { jsonLd, pageMeta } from "@/components/site/meta";
import { Action, delay } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { siteOrigin } from "@/lib/marketing/public-pages";
import { FREE_PRACTICE_TEST as FT } from "@/lib/marketing/offer";
import { section } from "@/lib/marketing/site-copy";

export const metadata = pageMeta(
  ROUTES.test,
  "Karman Prep: Free practice test",
  `A free, live-proctored SAT practice test on Zoom, ${FT.dateLabel.replace(/, \d{4}$/, "")}: ${FT.questionCount} Karman questions, an estimated score range, a domain breakdown and a ${FT.callMinutes}-minute results call.`
);

/** "10:00 a.m. ET" on the test day, as an ISO time in New York's offset that day (EST in December). */
function startIso() {
  const m = FT.timeLabel.match(/^(\d{1,2}):(\d{2}) ([ap])\.m\./);
  const date = FT.id.replace(/^practice-test-/, "");
  if (!m) return date;
  const h = (Number(m[1]) % 12) + (m[3] === "p" ? 12 : 0);
  return `${date}T${String(h).padStart(2, "0")}:${m[2]}:00-05:00`;
}

const EVENT = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: `Karman Prep ${FT.name.toLowerCase()}`,
  description: section(41).text,
  startDate: startIso(),
  eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  location: { "@type": "VirtualLocation", url: `${siteOrigin()}${ROUTES.test}` },
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: 0,
    priceCurrency: "USD",
    url: `${siteOrigin()}${ROUTES.test}`,
  },
  organizer: { "@type": "Organization", name: "Karman Prep", url: siteOrigin() },
};

export default function FreeTestPage() {
  const form = section(42);
  const note = section(45);
  return (
    <SitePage kind="inner" dock={[form["form button"], "#seat"]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(EVENT)} />
      <InnerHero
        n={41}
        href="#seat"
        side={
          <LeadFormCard
            n={42}
            form="seat"
            anchor="seat"
            heading={form.headline}
            style={delay(0.15)}
          />
        }
      />
      <Rows n={43} />
      <Rows n={44} style="time" />
      <section className="i-sec" data-light id="s-45">
        <div className="in i-split">
          <div className="i-head">
            <h2 className="rv">{note.headline}</h2>
            <p className="lede rv" style={delay(0.08)}>
              {note.text}
            </p>
            <Action f={note} href="#seat" className="act rv" style={delay(0.16)} />
          </div>
          <ArtDrawing name="sitting" className="i-art small rv" />
          <Photo name="test" className="ph-side" />
        </div>
      </section>
    </SitePage>
  );
}
