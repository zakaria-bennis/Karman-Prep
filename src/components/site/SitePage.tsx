// The frame around every marketing page: skip link, header, phone menu, footer and the page's behaviour
// (ShellBehaviour). Ported from the approved mock's site.js (2026-10-25). Links are plain <a> on purpose:
// each page is a full load, so the loaders follow the mock's rules exactly.
import type { CSSProperties, ReactNode } from "react";
import { Anton, Hanken_Grotesk } from "next/font/google";
import { SOCIALS } from "@/lib/marketing/offer";
import { SITE } from "@/lib/marketing/site-copy";
import { TEXT_SIZE_BOOT } from "./text-size";
import { Btn } from "./parts";
import { ROUTES } from "./routes";
import ShellBehaviour from "./ShellBehaviour";
import SiteFlight from "./SiteFlight";
import SiteTouches from "./SiteTouches";
import { litFonts } from "./home/fonts";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-hanken",
  display: "swap",
});

/** The Impact-style headline face, on trial: only pages opened with ?type=impact use it (film.css). */
const impact = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-impact",
  display: "swap",
  preload: false,
});

/** The theme follows the device (founder, 8 November, replacing the dark default); the switch remembers a
 *  visitor's own choice, which then wins. Runs before paint. Without scripts the page stays dark. */
const THEME_BOOT = `try{var m=localStorage.getItem("karman-site-theme");if(m!=="dark"&&m!=="light")m=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.getElementById("ks").dataset.mode=m}catch(e){}try{if(/[?&]type=impact(&|$)/.test(location.search))document.getElementById("ks").dataset.type="impact"}catch(e){}`;

const SUN = (
  <svg
    className="sun"
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
  >
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
  </svg>
);
const MOON = (
  <svg
    className="moon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinejoin="round"
  >
    <path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z" />
  </svg>
);

/** Each platform's own mark, drawn small. */
const SOCIAL_MARK: Record<keyof typeof SOCIALS, ReactNode> = {
  facebook: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M13.6 21v-7.2h2.4l.4-3h-2.800V8.900c0-.9.3-1.5 1.5-1.500h1.500V4.700c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.800v2.400H8.300v3h2.400V21z"
      />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="4" y="4" width="16" height="16" rx="4.6" />
      <circle cx="12" cy="12" r="3.7" />
      <circle cx="16.7" cy="7.3" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.2 3.500h2.700c.2 1.9 1.3 3.2 3.1 3.400v2.800c-1.2 0-2.2-.3-3.1-.9v6.100a5.3 5.3 0 1 1-5.3-5.300c.3 0 .6 0 .9.1v2.900a2.5 2.5 0 1 0 1.7 2.400z"
      />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.3 8a2.6 2.6 0 0 0-1.8-1.800C17.9 5.7 12 5.7 12 5.700s-5.9 0-7.5.5A2.6 2.6 0 0 0 2.7 8C2.3 9.6 2.3 12 2.3 12s0 2.4.4 4a2.6 2.6 0 0 0 1.8 1.800c1.6.5 7.5.5 7.5.5s5.9 0 7.5-.5a2.6 2.6 0 0 0 1.8-1.800c.4-1.6.4-4 .4-4s0-2.4-.4-4zM10.1 15V9l5.1 3z"
      />
    </svg>
  ),
};

function ThemeButton({ labeled = false }: { labeled?: boolean }) {
  return (
    <button
      className={`theme ${labeled ? "labeled" : ""}`}
      type="button"
      aria-label={SITE["dark mode"]}
      title={SITE["dark mode"]}
    >
      {MOON}
      {SUN}
      {labeled ? (
        <>
          <span className="to-dark">{SITE["dark mode"]}</span>
          <span className="to-light">{SITE["light mode"]}</span>
        </>
      ) : null}
    </button>
  );
}

const MENU: [string, string][] = [
  [ROUTES.program, "program link"],
  [ROUTES.private, "private link"],
  [ROUTES.pricing, "pricing link"],
  [ROUTES.guarantee, "guarantee link"],
  [ROUTES.about, "about link"],
  [ROUTES.faq, "faq link"],
  [ROUTES.signIn, "sign in link"],
];

const FOOTER: [string, [string, string][]][] = [
  [
    "footer programs",
    [
      [ROUTES.program, "program link"],
      [ROUTES.private, "private link"],
      [ROUTES.pricing, "pricing link"],
      [ROUTES.schools, "schools link"],
      [ROUTES.tutors, "tutors link"],
    ],
  ],
  ["footer tools", [[ROUTES.test, "free test link"]]],
  [
    "footer company",
    [
      [ROUTES.guarantee, "guarantee link"],
      [ROUTES.about, "about link"],
      [ROUTES.research, "research link"],
      [ROUTES.faq, "faq link"],
      [ROUTES.signIn, "sign in link"],
    ],
  ],
  [
    "footer legal",
    [
      [ROUTES.terms, "terms link"],
      [ROUTES.privacy, "privacy link"],
      [ROUTES.refunds, "refunds link"],
      [ROUTES.cookies, "cookies link"],
    ],
  ],
];

/** "home" and "lit" are the live-landscape world (the home page and the pages rebuilt in its style); the
 *  others are the older pages, until each is rebuilt. */
export type SiteKind = "home" | "lit" | "inner" | "pricing";

export default function SitePage({
  kind,
  children,
  route,
  className = "",
}: {
  kind: SiteKind;
  children: ReactNode;
  /** In the landscape world: the stretch of the route this page flies, as [from, to] between 0 and 1. The
   *  home page flies all of it. */
  route?: [number, number];
  /** Extra classes for the page's root. */
  className?: string;
}) {
  const lit = kind === "home" || kind === "lit";
  return (
    <div
      id="ks"
      className={`ks ${hanken.variable} ${impact.variable} page-${kind} ${lit ? `lit ${litFonts}` : ""} ${className}`}
      data-mode="dark"
      suppressHydrationWarning
    >
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_BOOT }} />
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="hd">
        <a className="mark" href={ROUTES.home}>
          {SITE.logo}
        </a>
        <nav aria-label="Main">
          <a className="nl" href={ROUTES.program}>
            {SITE["program link"]}
          </a>
          <a className="nl" href={ROUTES.private}>
            {SITE["private link"]}
          </a>
          <a className="nl" href={ROUTES.pricing}>
            {SITE["pricing link"]}
          </a>
          <a className="nl si" href={ROUTES.signIn}>
            {SITE["sign in link"]}
          </a>
          <a className="cta" href={ROUTES.signUp}>
            {SITE["start free"]}
          </a>
          <ThemeButton />
          <button className="menu" type="button" aria-expanded="false" aria-controls="menu">
            <span>{SITE.menu}</span>
            <i aria-hidden="true" />
          </button>
        </nav>
      </header>
      <div className="sheet" id="menu" hidden>
        <nav aria-label="Menu links">
          {MENU.map(([href, t]) => (
            <a key={t} href={href}>
              {SITE[t]}
            </a>
          ))}
        </nav>
        <ThemeButton labeled />
        <Btn label={SITE["start free"]} href={ROUTES.signUp} />
      </div>
      {lit ? <SiteFlight route={route} /> : null}
      {lit ? <SiteTouches /> : null}
      <main id="main">{children}</main>
      <footer className="ft">
        <div className="ft-in">
          <div className="cols">
            <span className="mark rv" aria-label={SITE.logo}>
              {[...SITE.logo].map((ch, i) => (
                <span key={i} aria-hidden="true" style={{ "--i": i } as CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
            <nav aria-label="Footer">
              {FOOTER.map(([h, links]) => (
                <div className="col" key={h}>
                  <p className="h">{SITE[h]}</p>
                  {links.map(([href, t]) => (
                    <a key={t} href={href}>
                      {SITE[t]}
                    </a>
                  ))}
                </div>
              ))}
            </nav>
          </div>
          <div className="ft-base">
            <span className="ft-social">
              {(Object.keys(SOCIALS) as (keyof typeof SOCIALS)[]).map((k) => (
                <a key={k} href={SOCIALS[k]} rel="noopener" aria-label={SITE[`${k} link`]}>
                  {SOCIAL_MARK[k]}
                </a>
              ))}
            </span>
            {lit ? (
              <span className="credit">
                <button className="motion" type="button" aria-pressed="false">
                  {SITE.pause}
                </button>
              </span>
            ) : null}
          </div>
          <p className="ft-fine">{SITE["sat note"]}</p>
        </div>
      </footer>
      <ShellBehaviour />
    </div>
  );
}
