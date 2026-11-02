# Launch checklist

Set by the founder on 2026-10-19. The website is not complete until every item
here is done or marked "handled by" with the evidence. Design and copy rules are
in `docs/design-rules.md`; SEO requirements are there too.

Status key: `[ ]` to do, `[x]` done (with date and how it was checked).

## Security

- [ ] Admin routes protected (server-side role check on every `/admin` page and `/api/admin` route).
- [ ] Permissions enforced server-side, never only in the UI.
- [ ] Row Level Security enabled on every Supabase table, with policies reviewed.
- [ ] Email addresses verified at sign-up (Clerk setting).
- [ ] Passwords hashed securely. Handled by Clerk: Karman never stores passwords. Confirm no custom password storage exists.
- [ ] Auth tokens kept out of localStorage (Clerk uses httpOnly cookies; confirm no code copies tokens).
- [ ] API secrets server-side only. No secret in a `NEXT_PUBLIC_*` variable or client bundle.
- [x] Environment files out of GitHub. 2026-10-19: only `.env.example` is tracked and it holds placeholders; `.env*.local` is ignored.
- [ ] Sensitive data kept out of logs (no emails, tokens, payment data or student answers in `console.*` or Sentry breadcrumbs).
- [ ] Parameterized SQL only (Supabase client and RPCs; no string-built SQL).
- [ ] Every form input validated with Zod on the server.
- [ ] Cross-site scripting blocked (no unsanitized `dangerouslySetInnerHTML`; a Content Security Policy header).
- [ ] File uploads validated (type, size, scanning where relevant).
- [ ] Webhook signatures verified (Stripe, Clerk, Cal.com, Zoom, Slack, Fireflies).
- [ ] Rate limiting on all requests, stricter on auth, forms and AI routes.
- [ ] CORS tightened to Karman's own origins.
- [ ] Production debugging disabled (no source maps served publicly, no debug flags, no dev auth bypass).
- [ ] Vulnerable dependencies updated (`npm audit` clean or each exception justified).
- [ ] Claude Code security review run (`/security-review`) and findings resolved.

## Claims

- [ ] Question count gate: the release preflight queries the live question count and refuses to publish while it is below `QUESTION_BANK.claimedMinimum` (10,000). Founder decision 2026-10-20: the site claims 10,000+ original questions; 2,588 were live on 2026-10-19.
- [ ] Every cohort date shown on the site is a real upcoming SAT date from `SAT_DATES`, never a past one.

## Legal and accessibility

- [ ] Terms of Service, Privacy Policy and Cookie Policy pages live and linked from the footer.
- [ ] Cookie consent banner, only if any non-essential cookie is set; declining is one click.
- [ ] Light and dark mode on every page, with AA contrast checked by calculation in both.

## Performance

- [ ] All images compressed and served as WebP or AVIF at the right size.
- [ ] Lazy loading for below-the-fold images, video and heavy components.
- [ ] Code split into route and component chunks.
- [ ] API responses cached where safe.
- [ ] CDN. Handled by Cloudflare Workers: static assets are served from Cloudflare's edge. Confirm cache headers.
- [ ] JS and CSS minified (Next.js production build; confirm in the built output).
- [ ] Database indexes on every column used for filtering, joining or sorting.
- [ ] Unnecessary React re-renders removed on the heavy screens (question bank, quiz, dashboards).
- [ ] Input handlers debounced (search, filters, autosave).
- [ ] Large lists paginated (question bank, admin tables, chat history).
- [ ] Unused dependencies removed.
- [ ] Non-critical scripts deferred (analytics, chat widgets, video).
- [ ] Skeleton loaders on every loading state (also design rule 29).
- [ ] Load balancer. Handled by Cloudflare Workers: requests are spread across Cloudflare's network automatically, so no separate load balancer is needed.
- [ ] API payloads compressed (gzip or brotli; Cloudflare does this by default, confirm).
- [ ] Database connection pooling. Handled by Supabase (PostgREST over HTTP and the Supavisor pooler); confirm any direct Postgres connection uses the pooler URL.
- [ ] Expensive computed results cached (score predictions, skill catalogs, dashboards).
- [ ] N+1 database queries fixed.
- [ ] Server-side caching enabled for public pages.
- [ ] Lighthouse audit run on mobile for every public page, with results recorded here.

## Marketing site rebuild (2026-10-26, branch `claude/musing-kare-59cd6e`)

What the Next.js port of the approved mock covers. Site-wide items above stay open.

- Forms: the program application, strategy call and free test seat post to one server action (`src/app/(site)/lead-actions.ts`) that checks every field with Zod, drops a hidden bot-trap field, records the lead in `marketing_leads` (new `details` column) and emails `ADMIN_NOTIFICATION_EMAIL`. Tested in `lead-actions.test.ts` and clicked through on phone and desktop. No rate limit yet beyond the trap: add a Cloudflare rate-limit rule on `POST` to the three form pages.
- Images: six people photos as WebP in two sizes (800 and 1400 px), lazy below the fold. Films: `preload="none"` except the home film, which starts only while a film window is on screen and never blocks the first paint (its poster is preloaded).
- Light and dark on every marketing page, with a switch in the header and the phone menu, remembered per visitor. Dark is the default (founder, 2026-10-26), light is one tap away. AA contrast in both modes still needs the calculated check.
- Every link, redirect and form on the 11 pages clicked through in a browser at 1440 px and 375 px, light and dark; no sideways scroll at 375 px; one H1, a canonical tag, a title and a description per page; JSON-LD for the organisation, the program (Course), the FAQ and the free test (Event).
- Not done here: a Content Security Policy header, server-side caching (the root layout reads cookies, so every page renders per request), a Cookie Policy page, Lighthouse runs.
