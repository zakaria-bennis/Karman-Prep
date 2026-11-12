import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import { Close, GuaranteeSection, InnerHero, Rows, Statements } from "@/components/site/inner";
import { pageMeta } from "@/components/site/meta";
import { delay, Icon } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { GUARANTEE as G, guaranteeMax } from "@/lib/marketing/offer";
import { pairs, section } from "@/lib/marketing/site-copy";

export const metadata = pageMeta(
  ROUTES.guarantee,
  "Karman Prep: The guarantee",
  `The Karman guarantee in full. The target depends on the starting score: up to +${guaranteeMax("private")} points on Private 20, up to +${guaranteeMax("cohort")} on the cohort and Private 10, and a rising score from ${G.noGuaranteeFrom}. On the cohort: half or all of your money back, or the next cohort free. On private tutoring: half back, or ${G.private.packages["private-10"].freeSessions} free sessions on Private 10 and ${G.private.packages["private-20"].freeSessions} on Private 20. Every rule is on the page.`
);

export default function GuaranteePage() {
  const ex = section(52);
  return (
    <SitePage kind="lit" route={[0.72, 0.88]} className={`${litFonts} relit rl-guarantee`}>
      <InnerHero n={51} href={ROUTES.test} />
      <GuaranteeSection linkHref="#s-52" />
      <Rows n={56} />
      <section className="i-sec" data-light id="s-52">
        <div className="in">
          <div className="i-split i-withphoto">
            <div className="i-head">
              <h2 className="rv">{ex.headline}</h2>
            </div>
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
