// The frame around every marketing page: skip link, header, phone menu, footer and the page's behaviour
// (ShellBehaviour). Ported from the approved mock's site.js (2026-10-25). Links are plain <a> on purpose:
// each page is a full load, so the loaders follow the mock's rules exactly.
import type { ReactNode } from "react";
import { Hanken_Grotesk } from "next/font/google";
import { SITE } from "@/lib/marketing/site-copy";
import { Btn } from "./parts";
import { ROUTES } from "./routes";
import ShellBehaviour from "./ShellBehaviour";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-hanken",
  display: "swap",
});

/** Dark is the default (founder, 2026-10-26; design rule 33); the switch to light remembers the visitor's choice. */
const THEME_BOOT = `try{var m=localStorage.getItem("karman-site-theme");if(m==="dark"||m==="light")document.getElementById("ks").dataset.mode=m}catch(e){}`;

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
      [ROUTES.test, "free test link"],
      [ROUTES.calculator, "calculator link"],
    ],
  ],
  [
    "footer company",
    [
      [ROUTES.guarantee, "guarantee link"],
      [ROUTES.faq, "faq link"],
      [ROUTES.about, "about link"],
      [ROUTES.signIn, "sign in link"],
    ],
  ],
  [
    "footer legal",
    [
      [ROUTES.terms, "terms link"],
      [ROUTES.privacy, "privacy link"],
      [ROUTES.refunds, "refunds link"],
    ],
  ],
];

export type SiteKind = "home" | "inner" | "pricing";

export default function SitePage({
  kind,
  children,
  stage,
  dock,
}: {
  kind: SiteKind;
  children: ReactNode;
  /** The home page's film, drawn behind everything. */
  stage?: ReactNode;
  /** The phone dock's button: [label, href]. Default: the free practice test. */
  dock?: [string, string];
}) {
  return (
    <div
      id="ks"
      className={`ks ${hanken.variable}${kind === "home" ? "" : ` page-${kind}`}`}
      data-mode="dark"
      suppressHydrationWarning
    >
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
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
          <a className="nl" href={ROUTES.signIn}>
            {SITE["sign in link"]}
          </a>
          <ThemeButton />
          <a className="cta" href={ROUTES.test}>
            {SITE["free test link"]}
          </a>
          <button className="menu" type="button" aria-expanded="false" aria-controls="menu">
            {SITE.menu}
          </button>
        </nav>
      </header>
      <div
        className="sheet"
        id="menu"
        role="dialog"
        aria-modal="true"
        aria-label={SITE.menu}
        hidden
      >
        <div className="top">
          <span className="mark">{SITE.logo}</span>
          <button className="close" type="button">
            {SITE.close}
          </button>
        </div>
        <nav aria-label="Menu links">
          {MENU.map(([href, t]) => (
            <a key={t} href={href}>
              {SITE[t]}
            </a>
          ))}
        </nav>
        <ThemeButton labeled />
        <Btn label={SITE["free test link"]} href={ROUTES.test} />
      </div>
      {stage}
      <main id="main">{children}</main>
      {stage ? (
        <button
          className="motion"
          type="button"
          aria-label={SITE.pause}
          title={SITE.pause}
          aria-pressed="false"
        />
      ) : null}
      <footer className="ft">
        <div className="cols">
          <span className="mark">{SITE.logo}</span>
          <nav aria-label="Footer">
            {FOOTER.map(([h, links]) => (
              <div className="col" key={h}>
                <p className="h">{SITE[h]}</p>
                {links.map(([href, t]) => (
                  <a key={t} href={href}>
                    {SITE[t]}
                  </a>
                ))}
                {h === "footer legal" ? <a href={`mailto:${SITE.email}`}>{SITE.email}</a> : null}
              </div>
            ))}
          </nav>
        </div>
        {stage ? <p className="credit">{SITE.credits}</p> : null}
      </footer>
      <ShellBehaviour dock={dock ?? [SITE["free test link"], ROUTES.test]} />
    </div>
  );
}
