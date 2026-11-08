/*
 * Clean line icons drawn for Karman (design rule 52: never a stock set). 24 by 24, stroked with
 * the current text color. Pass a name from PORTAL_ICONS to the shell's nav items.
 */

const PATHS = {
  today: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  homework: <path d="M6 4h12v16H6zM9 9h6M9 13h6M9 17h3" />,
  library: <path d="M5 4v16M10 4v16M15 5l4 15" />,
  calendar: (
    <>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M4 10h16M9 3v5M15 3v5" />
    </>
  ),
  progress: <path d="M4 18l5-6 4 3 7-9M15 6h5v5" />,
  students: (
    <>
      <circle cx="9" cy="9" r="3.2" />
      <path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5" />
      <circle cx="17" cy="8" r="2.4" />
      <path d="M16 13.2c2.4.2 4 1.8 4.6 4.6" />
    </>
  ),
  child: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20c.9-3.8 3.4-6 6.5-6s5.6 2.2 6.5 6" />
    </>
  ),
  messages: <path d="M4 6h16v10H9l-5 4z" />,
  money: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </>
  ),
  school: <path d="M3 9l9-5 9 5-9 5zM7 11.5V17c1.6 1.4 3.2 2 5 2s3.4-.6 5-2v-5.5M21 9v6" />,
  questions: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01" />
    </>
  ),
  review: <path d="M5 12l4 4 10-10M5 19h14" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
  code: <path d="M4 7h16M4 12h10M4 17h7M17 15l3 3-3 3" />,
  shield: <path d="M12 3l7 3v6c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6z" />,
  home: <path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" />,
  test: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 12l6-6M15.5 4.5L18 6l1.5 2.5" />
    </>
  ),
  invite: (
    <>
      <circle cx="10" cy="8" r="3.4" />
      <path d="M3.5 20c.9-3.8 3.4-6 6.5-6 1.6 0 3 .6 4.1 1.6M18 13v6M15 16h6" />
    </>
  ),
  sound: <path d="M4 9.5h4l5-4v13l-5-4H4zM16.5 9a4.5 4.5 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" />,
  profile: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="10" r="2.8" />
      <path d="M7 18c1.1-2.2 2.9-3.4 5-3.4s3.9 1.2 5 3.4" />
    </>
  ),
  signout: <path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" />,
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  link: (
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  ),
  history: <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4M12 8v4l3 2" />,
  site: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5z" />
    </>
  ),
} as const;

export type PortalIconName = keyof typeof PATHS;
export const PORTAL_ICONS = Object.keys(PATHS) as PortalIconName[];

export function PortalIcon({ name, size = 22 }: { name: PortalIconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/** The chevron every main button carries. */
export function Chevron({ size = 18 }: { size?: number }) {
  return (
    <svg className="kp-chev" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/** The streak flame, filled with the painting's accent. */
export function Flame() {
  return (
    <svg viewBox="0 0 24 30" width="15" height="19" aria-hidden="true">
      <path d="M12 1C14 8 21 11 21 19C21 25 17 29 12 29C7 29 3 25 3 19C3 13 8 11 9 5C11 9 11 11 12 13C13 9 12 5 12 1Z" />
    </svg>
  );
}

/** Karman's wordmark, as in the site header (src/components/site/SitePage.tsx: SITE.logo). */
export function KarmanWordmark() {
  return <span className="kp-wordmark">Karman</span>;
}
