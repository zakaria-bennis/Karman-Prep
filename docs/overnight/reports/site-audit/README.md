# Site audit, 8 November 2026: what changed

Branch `claude/overnight-site-audit-e5cb0e`. The full report is
`docs/overnight/reports/site-audit.md`. This page lists the changes and where
to see them.

## The pictures

None of the 11 people photos showed a screen: every phone and laptop faces the
person holding it. So each photo now has a copy with one of Karman's own
code-drawn devices in the front of the picture, showing a real Karman screen.

- Phones: the site's own iPhone in Cosmic Orange. Laptops: a MacBook Pro in
  Space Black.
- Screens: the Daily 10, the parent view, the live class on Zoom and the
  one-on-one review, captured from the site at 3x.
- The parent view hides its two score boxes, because design rule 47 says no
  screen held by a person shows a score.
- The two moving clips (daily, call) carry the same device.
- The originals are still in `public/site/photos/`. To go back, set
  `DEVICE = ""` in `src/components/site/Photo.tsx`.
- To redo them after the screens change: `node scripts/site/device-photos.mjs`.

Before (left) and after (right), one sheet per photo:

| Photo     | Page                | Device and screen               | Sheet                  |
| --------- | ------------------- | ------------------------------- | ---------------------- |
| daily     | home                | iPhone, Daily 10                | `photos/daily.jpg`     |
| lin       | home                | MacBook, live class on Zoom     | `photos/lin.jpg`       |
| program   | /program            | MacBook, live class on Zoom     | `photos/program.jpg`   |
| call      | /program            | MacBook, live class on Zoom     | `photos/call.jpg`      |
| private   | /private-tutoring   | MacBook, one-on-one review      | `photos/private.jpg`   |
| test      | /free-practice-test | MacBook, one-on-one review      | `photos/test.jpg`      |
| start     | /guarantee, home    | MacBook, one-on-one review      | `photos/start.jpg`     |
| guarantee | /guarantee          | iPhone, parent view (no scores) | `photos/guarantee.jpg` |
| pricing   | /pricing            | MacBook, one-on-one review      | `photos/pricing.jpg`   |
| about     | /about              | iPhone, Daily 10                | `photos/about.jpg`     |
| bus       | /research           | iPhone, Daily 10                | `photos/bus.jpg`       |

## Bugs fixed

| What was wrong                                                                     | Where                                  | Fix                                                         |
| ---------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| The /program application form was cut off on phones: no date field, no send button | `program/page.tsx`, `inner.css`        | The card no longer shares the laptop pictures' `wide` class |
| On /program at 1100 px and wider, the steps scrolled over their own heading        | `inner.css`                            | Only headings in their own column stay pinned               |
| "+285" on /private-tutoring failed contrast in light mode (2.0:1)                  | `inner.css`                            | Darker marigold: 4.9:1                                      |
| Mistyped addresses showed Next's bare "404" page                                   | `src/app/not-found.tsx`                | A 404 page in the site's look, with links                   |
| A failing page showed Next's bare error                                            | `(site)/error.tsx`, `global-error.tsx` | Error pages in the site's look, with "Try again"            |
| Tab walked out of the open phone menu                                              | `ShellBehaviour.tsx`                   | The page behind the menu is inert while it's open           |
| The study-tools arrows did nothing on wide screens                                 | `ToolsCarousel.tsx`                    | Shown only when the cards overflow; rest at each end        |
| Legal-page links lost the visitor's light/dark choice                              | terms, privacy, refunds                | Plain links (full page loads)                               |
| "The guarantee, with worked examples" reloaded the same page                       | guarantee page                         | Jumps to the worked examples                                |
| Crawlers and link previews looped through Clerk's development sign-in              | `src/middleware.ts`                    | Marketing pages skip Clerk after launch                     |
| www.karmanprep.com served a second copy of the site                                | `src/middleware.ts`                    | Permanent redirect to karmanprep.com                        |
| /coming-soon still said "not ready" after launch                                   | `src/middleware.ts`                    | Sends visitors home                                         |
| The consent banner couldn't save a signed-out visitor's choice                     | `src/middleware.ts`                    | `/api/consent` is public                                    |
| No security headers; `x-powered-by: Next.js`                                       | `next.config.mjs`                      | HSTS, nosniff, framing, referrer, permissions, COOP         |
| Built files and photos re-downloaded on every visit                                | `public/_headers`                      | Built files cached for a year, photos and films a day       |
| Parents who signed up never got an account row                                     | `src/app/api/auth/schemas.ts`          | "parent" is accepted at sign-up                             |
| With email switched off, every lead form failed                                    | `resend/client.ts`                     | Sends return an error result and log instead                |
| The lead form crashed on a made-up form name; names could hide control characters  | `lead-actions.ts`                      | Both checked with Zod                                       |
| The home films used a format iPhones can't play (H.264 4:4:4), 31 MB in all        | `public/site/film/`                    | Standard H.264, 20 MB, same frames                          |
| The opening headline waited about 8 s for scripts on a slow phone                  | `film.css`                             | Rises from CSS at first paint                               |
| Photo clips downloaded with the page, far below the fold                           | `Photo.tsx`                            | Load and play only near the screen                          |

## Screenshots

Before (live site, taken during the audit) and after (local build, headless):

| What                              | Before                                                            | After                                                                                 |
| --------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| /program form on a phone (390 px) | `before/program-form-390.jpg`: no date field, no send button      | `after/program-form-390.jpg`: full form, send button reachable                        |
| Home opening on a slow phone      | `before/home-hero-slow-phone.jpg`: headline missing for about 8 s | `after/home-hero-no-scripts-390.jpg`: headline and buttons show even with scripts off |
| /program steps at 1440 px         | `before/program-steps-1440.jpg`: steps over the heading           | fixed in CSS (heading pinned only in its own column)                                  |
| Phone menu                        | `before/phone-menu-390.jpg`: Tab left the open menu               | the page behind is inert while the menu is open                                       |
| A missing page                    | Next's bare "404" text                                            | `after/not-found-1440.jpg`: 404 status, site look, six links, noindex                 |

Photo sheets (before left, after right): `photos/<name>.jpg`.
