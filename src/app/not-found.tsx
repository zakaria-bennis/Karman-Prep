// An address or a record that doesn't exist: one plain sentence and the pages people most often want.
// Next.js answers with a 404 status; robots keep it out of search results.
//
// Every route in the app carries this file, lessons included, so it is plain on purpose: a server
// component in the app's own theme colours and fonts, with no client code and none of the marketing site's
// styles, frame or fonts. Importing those here once added about 38 KB to every lesson page. The words are
// still the site copy's, read on the server.
import type { Metadata } from "next";
import { KarmanLogo } from "@/components/shared/KarmanLogo";
import { ROUTES } from "@/components/site/routes";
import { SITE } from "@/lib/marketing/site-copy";

export const metadata: Metadata = {
  title: { absolute: "Page not found | Karman Prep" },
  robots: { index: false, follow: true },
};

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
    <div className="flex min-h-[100svh] items-center justify-center bg-night px-6 py-16 text-ivory">
      <main className="w-full max-w-xl">
        <KarmanLogo size={36} />
        <h1 className="mt-10 text-balance text-3xl font-extrabold text-ivory sm:text-4xl">
          {SITE["not found title"]}
        </h1>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-taupe">
          {SITE["not found text"]}
        </p>
        <nav aria-label="Pages" className="mt-8 flex flex-col items-start">
          {LINKS.map(([href, k]) => (
            <a
              key={k}
              href={href}
              className="inline-flex min-h-11 items-center rounded-sm font-semibold text-ivory underline decoration-bronze decoration-2 underline-offset-4 transition-colors hover:decoration-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
            >
              {SITE[k]}
            </a>
          ))}
        </nav>
      </main>
    </div>
  );
}
