import ArtDrawing from "@/components/site/ArtDrawing";
import Photo from "@/components/site/Photo";
import SitePage from "@/components/site/SitePage";
import { Close, GuaranteeSection, InnerHero, Rows, Statements } from "@/components/site/inner";
import { pageMeta } from "@/components/site/meta";
import { delay, Icon } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { GUARANTEE as G } from "@/lib/marketing/offer";
import { pairs, section } from "@/lib/marketing/site-copy";

export const metadata = pageMeta(
  ROUTES.guarantee,
  "Karman Prep: The guarantee",
  `The Karman guarantee in full: +${G.points} points or a ${G.orScore}, or half or all of your money back, or the next cohort free. Every rule is on the page.`
);

export default function GuaranteePage() {
  const ex = section(52);
  return (
    <SitePage kind="inner">
      <InnerHero n={51} href={ROUTES.test} side={<ArtDrawing name="report" style={delay(0.2)} />} />
      <GuaranteeSection />
      <section className="i-sec" data-light id="s-52">
        <div className="in">
          <div className="i-split i-withphoto">
            <div className="i-head">
              <h2 className="rv">{ex.headline}</h2>
            </div>
            <Photo name="guarantee" className="ph-side" />
          </div>
          <div className="i-ex">
            {pairs(ex.rows).map(([a, b], k) => {
              const [base, sat] = a.split(", ");
              return (
                <div className="rv" style={delay(k * 0.06)} key={a}>
                  <p className="sc">
                    <span>{base}</span>
                    <Icon name="plus" className="arrow" />
                    <span>{sat}</span>
                  </p>
                  <p className="out">{b}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <Statements n={53} mark="no" />
      <Rows n={54} />
      <Close n={55} href={ROUTES.test} />
    </SitePage>
  );
}
