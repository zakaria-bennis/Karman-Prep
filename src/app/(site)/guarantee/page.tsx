import SitePage from "@/components/site/SitePage";
import GuaranteeOpeners from "@/components/site/deal/GuaranteeOpeners";
import GuaranteeSections from "@/components/site/deal/GuaranteeSections";
import { litFonts } from "@/components/site/home/fonts";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import { GUARANTEE as G, guaranteeMax } from "@/lib/marketing/offer";

export const metadata = pageMeta(
  ROUTES.guarantee,
  "Karman Prep: The guarantee",
  `The Karman guarantee in full. The target depends on the starting score: up to +${guaranteeMax("private")} points on Private 20, up to +${guaranteeMax("cohort")} on the cohort and Private 10, and a rising score from ${G.noGuaranteeFrom}. On the cohort: half or all of your money back, or the next cohort free. On private tutoring: half back, or ${G.private.packages["private-10"].freeSessions} free sessions on Private 10 and ${G.private.packages["private-20"].freeSessions} on Private 20. Every rule is on the page.`
);

/* In the home page's world, on the SAT Program page's frame (founder, 2026-11-12). */
export default function GuaranteePage() {
  return (
    <SitePage kind="lit" route={[0.72, 0.88]} className={litFonts}>
      <GuaranteeOpeners />
      <GuaranteeSections opening={false} />
    </SitePage>
  );
}
