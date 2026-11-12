import SitePage from "@/components/site/SitePage";
import ResearchSections from "@/components/site/company/ResearchSections";
import { litFonts } from "@/components/site/home/fonts";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";

export const metadata = pageMeta(
  ROUTES.research,
  "Karman Prep: The research behind our design",
  "The seven ways Karman teaches an SAT skill, and the studies behind each one, with links to read every study."
);

/* In the home page's world (founder, 2026-11-11). Research flies the start of the route, from above the
   clouds at dawn down towards the first peaks. */
export default function ResearchPage() {
  return (
    <SitePage kind="lit" route={[0, 0.2]} className={litFonts}>
      <ResearchSections />
    </SitePage>
  );
}
