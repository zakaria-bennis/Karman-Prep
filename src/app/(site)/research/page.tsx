import Photo from "@/components/site/Photo";
import ResearchCurve from "@/components/site/ResearchCurve";
import SitePage from "@/components/site/SitePage";
import { Close, InnerHero } from "@/components/site/inner";
import { pageMeta } from "@/components/site/meta";
import { Arrow, delay, Kinetic } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { section } from "@/lib/marketing/site-copy";

export const metadata = pageMeta(
  ROUTES.research,
  "Karman Prep: The research behind our design",
  "The studies behind the Daily 10, mixed practice, full-length tests with one-on-one reviews, and small classes, with links to read each one."
);

/** Each finding's copy key in section 82, and the study it comes from (its DOI, checked 2026-10-26). */
const STUDIES = [
  ["retrieval", "https://doi.org/10.1111/j.1467-9280.2006.01693.x"],
  ["spacing", "https://doi.org/10.1111/j.1467-9280.2008.02209.x"],
  ["review", "https://doi.org/10.1177/1529100612453266"],
  ["mixed", "https://doi.org/10.1007/s11251-007-9015-8"],
  ["feedback", "https://doi.org/10.3102/003465430298487"],
  ["tutoring", "https://doi.org/10.3102/0013189X013006004"],
] as const;

export default function ResearchPage() {
  const f = section(82);
  return (
    <SitePage kind="inner">
      <InnerHero n={81} href={ROUTES.test} side={<ResearchCurve />} />
      <section className="i-sec" data-light id="s-82">
        <div className="in">
          <div className="i-split rs-top">
            <h2 className="rv kin">
              <Kinetic text={f.headline} />
            </h2>
            <Photo name="bus" className="ph-side rv" />
          </div>
          <ol className="rs-list">
            {STUDIES.map(([key, href], k) => (
              <li className="rv" style={delay((k % 2) * 0.08)} key={key}>
                <h3>{f[`${key} name`]}</h3>
                <p className="rs-found">{f[`${key} found`]}</p>
                <p className="rs-k">{f[`${key} karman`]}</p>
                <p className="rs-src">
                  <span>{f[`${key} source`]}</span>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lk"
                    aria-label={`${f["read link"]}: ${f[`${key} source`]}`}
                  >
                    {f["read link"]}
                    <Arrow />
                  </a>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <Close n={83} href={ROUTES.test} />
    </SitePage>
  );
}
