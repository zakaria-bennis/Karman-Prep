// An address that doesn't exist: the home page's world (the open sea at the end of the route), one plain
// sentence, and the pages people most often want. Shown for a marketing page that calls notFound() and, through [...missing]/page.tsx, for
// any address that matches no page. It lives inside (site) so its styles load only with the marketing
// pages; the student app's missing pages use src/app/not-found.tsx.
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import { TextLink } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { SITE } from "@/lib/marketing/site-copy";

const LINKS: [string, string][] = [
  [ROUTES.home, "not found home"],
  [ROUTES.program, "program link"],
  [ROUTES.private, "private link"],
  [ROUTES.pricing, "pricing link"],
  [ROUTES.test, "free test link"],
  [ROUTES.faq, "faq link"],
];

export default function NotFound() {
  return (
    <SitePage kind="lit" route={[0.9, 1]} className={`${litFonts} relit rl-lost`}>
      <section className="lost">
        <div className="lost-in">
          <h1>{SITE["not found title"]}</h1>
          <p className="lede">{SITE["not found text"]}</p>
          <nav className="lost-links" aria-label="Pages">
            {LINKS.map(([href, k]) => (
              <TextLink key={k} label={SITE[k]} href={href} />
            ))}
          </nav>
        </div>
      </section>
    </SitePage>
  );
}
