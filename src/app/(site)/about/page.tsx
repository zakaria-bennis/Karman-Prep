import ArtDrawing from "@/components/site/ArtDrawing";
import Photo from "@/components/site/Photo";
import SitePage from "@/components/site/SitePage";
import { Close, InnerHero, Statements, TextCard } from "@/components/site/inner";
import { pageMeta } from "@/components/site/meta";
import { delay, Icon } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import type { IconName } from "@/components/site/live/icons";
import { pairs, section } from "@/lib/marketing/site-copy";

export const metadata = pageMeta(
  ROUTES.about,
  "Karman Prep: About",
  "Karman sells SAT programs that end on one official test date, prints every rule of its guarantee, and tells parents every week whether the work got done."
);

const ICONS: IconName[] = ["hours", "eye", "parent"];

export default function AboutPage() {
  const f = section(62);
  return (
    <SitePage kind="inner">
      <InnerHero
        n={61}
        href={ROUTES.program}
        side={<ArtDrawing name="line" style={delay(0.2)} />}
      />
      <section className="i-sec" data-light id="s-62">
        <div className="in">
          <div className="i-split i-withphoto">
            <div className="i-head">
              <h2 className="rv">{f.headline}</h2>
            </div>
            <Photo name="about" className="ph-side" />
          </div>
          <div className="i-refuse">
            {pairs(f.rows).map(([a, b], k) => (
              <article className="rv" style={delay(k * 0.08)} key={a}>
                <Icon name={ICONS[k] ?? "check"} />
                <h3>{a}</h3>
                <p>{b}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <TextCard n={63} />
      <Statements n={64} />
      <Close n={65} href={ROUTES.test} />
    </SitePage>
  );
}
