import SitePage from "@/components/site/SitePage";
import AboutSections from "@/components/site/company/AboutSections";
import { litFonts } from "@/components/site/home/fonts";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";

export const metadata = pageMeta(
  ROUTES.about,
  "Karman Prep: About",
  "Karman prints every rule of its guarantee where you can read it, and shows parents and tutors every answer a student gives."
);

/* In the home page's world (founder, 2026-11-11): the landscape keeps travelling from page to page. About
   flies the stretch after the SAT Program's, from the last of the valleys into the late afternoon. */
export default function AboutPage() {
  return (
    <SitePage kind="lit" route={[0.56, 0.8]} className={litFonts}>
      <AboutSections />
    </SitePage>
  );
}
