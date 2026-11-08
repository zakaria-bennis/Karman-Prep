"use client";

/*
 * The painted shell every signed-in portal uses: student, parent, tutor, school and admin.
 * The day's Karman painting fills the screen; a rail (desktop) or tab bar (phone) holds the
 * portal's own nav items; the streak and fox sit top right; the page heading types itself in
 * with the painting; the page's content goes in a tinted, squared box (<Panel>).
 * Ported from prototypes/today-directions/ (founder approved, 2026-11-08).
 */
import "./portal.css";
import "./portal-content.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { choosePainting, type PaintingChoice } from "@/lib/painting/schedule";
import AccountMenu, { type AccountMenuItem } from "./AccountMenu";
import { portalFontVars } from "./fonts";
import Greeting from "./Greeting";
import { pickGreeting } from "./greetings";
import { Flame, KarmanMark, PortalIcon, type PortalIconName } from "./icons";
import PaintedBackdrop, { COLORS_KEY, PAINTED_IN_KEY } from "./PaintedBackdrop";

export interface PortalNavItem {
  href: string;
  label: string;
  icon: PortalIconName;
  /** A small count on the icon, for example open homework. */
  badge?: number;
}

export interface PortalShellProps {
  /** Who the shell is for, read by screen readers on the nav ("Student", "Parent"...). */
  portal: string;
  nav: PortalNavItem[];
  children: ReactNode;
  /** The page heading. Without it, a rotating greeting for the hour is typed in. */
  title?: string;
  /** First name, for the greeting and the account menu. */
  name?: string | null;
  /** A second line in the account menu, usually the email. */
  accountDetail?: string | null;
  /** The SAT date (ISO), for the milestone greetings at 100, 60, 30, 14 and 7 days. */
  satDate?: string | null;
  /** Days in a row, shown with a flame beside the fox. Leave out to hide it. */
  streak?: { days: number; href: string } | null;
  /** Account menu items. "Profile and security" and "Sign out" are always added last. */
  menu?: AccountMenuItem[];
  /** Where the Karman mark at the top of the rail leads. */
  home?: string;
}

/*
 * Runs while the HTML is parsed, before the first paint: if the opening will play, the box waits
 * for it; and the last colors of today's painting apply at once. If the opening never starts,
 * the box shows anyway after six seconds.
 */
const BOOT = `(function(){try{var r=document.documentElement,m=matchMedia("(prefers-reduced-motion: reduce)").matches,s=sessionStorage.getItem("${PAINTED_IN_KEY}");if(!m&&(!s||/[?&]paint-in=1/.test(location.search))){r.setAttribute("data-paint-opening","");setTimeout(function(){r.removeAttribute("data-paint-opening")},6000)}var d=new Date(),h=d.getHours(),b=h>=22||h<5?"night":h<11?"morning":h<17?"day":"evening",c=JSON.parse(localStorage.getItem("${COLORS_KEY}")||"null");if(c&&c.k===d.toDateString()+":"+b){r.style.setProperty("--hue",c.hue);r.style.setProperty("--hs",c.sat+"%");r.style.setProperty("--accent",c.accent)}}catch(e){}})();`;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function activeHref(pathname: string, nav: PortalNavItem[]) {
  return nav
    .filter((n) => pathname === n.href || pathname.startsWith(n.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export default function PortalShell({
  portal,
  nav,
  children,
  title,
  name,
  accountDetail,
  satDate,
  streak,
  menu = [],
  home = "/",
}: PortalShellProps) {
  const pathname = usePathname() ?? "";
  const clerk = useClerk();
  const [choice, setChoice] = useState<PaintingChoice | null>(null);
  const [heading, setHeading] = useState<string | null>(null);
  const [typeMs, setTypeMs] = useState<number | null>(null);
  const [tone, setTone] = useState<"light" | "dark" | null>(null);
  const [opening, setOpening] = useState(false);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Decide the painting, and whether the opening plays, before the first client paint. */
  useIsoLayoutEffect(() => {
    const dev = process.env.NODE_ENV !== "production";
    const picked = choosePainting(new Date(), window.location.search, dev);
    const root = document.documentElement;
    let willOpen = root.hasAttribute("data-paint-opening");
    if (!willOpen && picked.replay) {
      root.setAttribute("data-paint-opening", "");
      willOpen = true;
    }
    if (!willOpen) {
      try {
        const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduce && !sessionStorage.getItem(PAINTED_IN_KEY)) {
          root.setAttribute("data-paint-opening", "");
          willOpen = true;
        }
      } catch {
        /* storage blocked: no opening */
      }
    }
    setOpening(willOpen);
    setChoice(picked);
    if (!willOpen)
      setHeading(title ?? pickGreeting(new Date(), name, satDate ? new Date(satDate) : null));
    /* If the painting never starts, show the page anyway. */
    if (willOpen) safety.current = setTimeout(() => finishOpening(false), 4000);
    return () => {
      if (safety.current) clearTimeout(safety.current);
    };
    // The painting is chosen once per mount; the heading follows `title` below.
  }, []);

  /* A new page title types in again. */
  useEffect(() => {
    if (title && choice && !opening) setHeading(title);
  }, [title, choice, opening]);

  function finishOpening(slide: boolean) {
    const root = document.documentElement;
    if (!root.hasAttribute("data-paint-opening")) return;
    root.removeAttribute("data-paint-opening");
    if (slide && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(".kp-panel").forEach((el) => el.setAttribute("data-arrive", ""));
    }
    setOpening(false);
    setHeading(
      (h) => h ?? title ?? pickGreeting(new Date(), name, satDate ? new Date(satDate) : null)
    );
  }

  const events = useMemo(
    () => ({
      onPaintStart: (ms: number) => {
        /* The painting started: wait for it, with a second of grace. */
        if (safety.current) clearTimeout(safety.current);
        safety.current = setTimeout(() => finishOpening(false), ms + 1000);
        setTypeMs(ms);
        setHeading(title ?? pickGreeting(new Date(), name, satDate ? new Date(satDate) : null));
      },
      onReady: () => finishOpening(true),
      onTone: setTone,
    }),
    // finishOpening only reads stable values and the DOM.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [title, name, satDate]
  );

  const active = activeHref(pathname, nav);
  const items: AccountMenuItem[] = [
    ...menu,
    { label: "Profile and security", onSelect: () => clerk.openUserProfile() },
    { label: "Sign out", onSelect: () => void clerk.signOut({ redirectUrl: "/" }) },
  ];

  return (
    <div className={`kp-shell ${portalFontVars}`} data-picture={tone ?? undefined}>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      <a className="kp-skip" href="#portal-main">
        Skip to content
      </a>
      {choice ? (
        <PaintedBackdrop choice={choice} events={events} />
      ) : (
        <div className="kp-backdrop" aria-hidden="true" />
      )}
      <nav className="kp-nav" aria-label={`${portal} portal`} data-paint-keepout="">
        <Link className="kp-brand" href={home} aria-label="Karman home">
          <KarmanMark />
        </Link>
        {nav.map((n) => (
          <Link key={n.href} href={n.href} aria-current={active === n.href ? "page" : undefined}>
            <PortalIcon name={n.icon} />
            <span>{n.label}</span>
            {!!n.badge && (
              <b className="kp-badge" aria-label={`${n.badge} open`}>
                {n.badge > 99 ? "99+" : n.badge}
              </b>
            )}
          </Link>
        ))}
      </nav>
      <div className="kp-appbar" data-paint-keepout="">
        {streak && (
          <Link
            className="kp-streak"
            href={streak.href}
            aria-label={`${streak.days} ${streak.days === 1 ? "day" : "days"} in a row`}
          >
            <Flame />
            {streak.days}
          </Link>
        )}
        <AccountMenu name={name} detail={accountDetail} items={items} />
      </div>
      <main className="kp-main" id="portal-main" tabIndex={-1}>
        <div className="kp-col">
          <header className="kp-top" data-paint-keepout="">
            <Greeting text={heading} totalMs={opening ? typeMs : null} />
          </header>
          {children}
        </div>
      </main>
      {choice && (
        <p className="kp-credit" aria-hidden="true">
          {choice.title} · Painted by Karman
        </p>
      )}
    </div>
  );
}
