// An address that doesn't exist: the site's own frame and look, one plain sentence, and the pages people
// most often want. Shown for a marketing page that calls notFound() and, through [...missing]/page.tsx, for
// any address that matches no page. It lives inside (site) so its styles load only with the marketing
// pages; the student app's missing pages use src/app/not-found.tsx.
import SitePage from "@/components/site/SitePage";
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
    <SitePage kind="inner">
      <section className="i-hero i-faqhero i-lost" data-light>
        <div className="in">
          <div className="i-words">
            <h1>{SITE["not found title"]}</h1>
            <p className="lede">{SITE["not found text"]}</p>
            <nav className="i-more i-lostlinks" aria-label="Pages">
              {LINKS.map(([href, k]) => (
                <TextLink key={k} label={SITE[k]} href={href} />
              ))}
            </nav>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
