import ArtDrawing from "@/components/site/ArtDrawing";
import LeadFormCard from "@/components/site/LeadFormCard";
import Photo from "@/components/site/Photo";
import SitePage from "@/components/site/SitePage";
import { InnerHero, Rows } from "@/components/site/inner";
import { pageMeta } from "@/components/site/meta";
import { Action, delay } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { FREE_PRACTICE_TEST as FT } from "@/lib/marketing/offer";
import { section } from "@/lib/marketing/site-copy";

export const metadata = pageMeta(
  ROUTES.test,
  "Karman Prep: Free practice test",
  `A free, full-length SAT practice test on Karman, any time: ${FT.questionCount} Karman questions, a score report, a domain breakdown and an optional ${FT.callMinutes}-minute results call.`
);

export default function FreeTestPage() {
  const form = section(42);
  const note = section(45);
  return (
    <SitePage kind="inner">
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
