# Karman Prep — Roadmap

The complete list of mega-projects to execute before launch. Each project below is described in depth: what it is, what it includes, how it works, why it matters, what unlocks it, and what "framework set" looks like for it.

A few items (SEO, analytics, engagement, content) continue evolving after launch — but the **framework for each project is set pre-launch**. Post-launch work refines + scales what's already built, not invents it from scratch.

The list is ordered by **recommended start sequence**, not by category or finish order. Several projects run in parallel; the order is about which ones to kick off when.

---

## Recommended start order — at a glance

1. **Logo + design language** — the unified visual system everything else builds on
2. **Page connectivity / Information architecture** — the navigation graph + URL structure
3. **Mobile-first commitment** — a binding constraint baked into every design decision
4. **Compliance program** — FERPA, COPPA, state privacy laws, accessibility
5. **Analytics + telemetry pipeline** — behavioral event taxonomy + warehouse + dashboards
6. **Videos + textbook entries** — the actual teaching content for all 100 skill nodes
7. **UI / UX redesign** — apply the design language across all ~50 surfaces
8. **Website security + data security** — comprehensive hardening program
9. **Outcomes engine + score guarantee operationalization** — turn the 50-pt promise into machinery
10. **Full-length mock SAT** — top-of-funnel conversion tool, Bluebook-mirroring
11. **SEO** — technical foundation + content strategy + backlink program
12. **Growth / acquisition engine** — referrals, partnerships, lifecycle, social, paid
13. **Customer support tooling** — helpdesk + KB + ticket routing + SLAs
14. **Parent engagement layer** — digests, milestones, parent-tutor messaging, goals
15. **Engagement / retention system** — streaks, nudges, social proof, recovery campaigns
16. **ML question generation** — adaptive question creation with tutor-tunable difficulty
17. **Learn page 3D brain visualization** — the signature visual centerpiece
18. **Tutor operations program** — recruitment, vetting, training, quality measurement

---

## 1. Logo + design language

**What it is:** The unified visual + interaction system that every surface of Karman Prep is built from. Without this locked, every other visual project ends up subtly inconsistent.

**What's included:**

- Typography scale — display, h1-h3, body, small, mono — with sizes, weights, line-heights, letter-spacing for each
- Color palette — primary brand colors, secondary accents, semantic colors (success/warning/error), neutrals for backgrounds + text, full dark-mode variants
- Spacing scale — consistent rhythm (4/8/12/16/24/32/48/64/96 progression) baked into Tailwind
- Motion vocabulary — easing curves, duration tokens (instant/fast/normal/slow/cinematic), transition patterns for the most common state changes
- Icon system — a single icon family at consistent stroke weight + sizes (Lucide or custom)
- Component library:
  - Buttons (primary/secondary/ghost variants, sizes, loading states, disabled states)
  - Cards (info, action, status, hover affordances)
  - Forms (inputs, selects, checkboxes, radios, validation states, error messages)
  - Modals + dialogs (size variants, dismiss patterns)
  - Tables (sortable, paginated, mobile-card-fallback)
  - Navigation primitives (top nav, sidebar, breadcrumbs, tabs)
  - Banners + toasts (info, success, warning, error, with auto-dismiss + manual dismiss)
  - Empty states, loading states, error states for every collection-type page
- Logo system — master logo + simplified variants for header / footer / favicon / OG / loading states; dark + light background variants; monochrome treatment for limited-color contexts
- A working `tailwind.config.ts` that encodes all of the above as Tailwind tokens
- A `/storybook` route (or equivalent) where every component renders with every variant for visual inspection + documentation

**How it works:** The design language is the source of truth. Every new page is built by composing existing tokens + components, never by inventing new ones. When a page needs a new component, it gets added to the library — not duplicated locally. This is the discipline that stops the codebase from drifting back toward "AI slop" inconsistency.

**Why it matters:** Every other visual project depends on this. Skipping it means redoing every redesigned surface twice — once with the inconsistent visuals, once after the design language is finally locked. Also: a unified design language is the difference between "looks AI-generated" and "looks like a real company". Users feel cohesion even when they can't name what's different.

**Dependencies:** None. This is the foundation. Start first.

**Framework set when:** The design system exists as a Figma file. The Tailwind config encodes it. A component library renders every primitive at `/storybook`. A new page can be built by composing existing tokens + components instead of inventing them.

**Continues post-launch:** Iteration only — the system itself is set. New components join the library when needed; tokens rarely change.

### Status — 2026-05-16

The work is split into discrete chunks. Decisions are locked; the remaining work is split between **mechanical** (encoding, integration) and **artwork-blocked** (logo generation, which requires an external image-gen pass) so it's clear what's gated on what.

| Sub-step       | Description                                                                                     | Gate type                                                      | Status    |
| -------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------- |
| 1. Brand brief | `docs/brand.md` — palette, type, motion, logo system, anti-patterns                             | —                                                              | ✅ Done   |
| 1.5 Rename     | Strata → Karman across code + DB                                                                | Mechanical                                                     | ✅ Done   |
| 2.1 Fonts      | next/font wiring (Plex Serif / Sans / Mono + Atkinson)                                          | Mechanical                                                     | ✅ Done   |
| 2.2 Tokens     | Observatory palette + type scale + motion in `tailwind.config.ts` + `globals.css` + `motion.ts` | Mechanical                                                     | ✅ Done   |
| 2.3 Library    | Component library scaffold on the new tokens, at a `/storybook` route                           | Mechanical (deprioritized)                                     | ⏸ Paused  |
| M1 / M2 logo   | Master horizontal lockup + standalone symbol artwork                                            | **External artwork** — prompts in `docs/brand-logo-prompts.md` | ⏸ Pending |
| 2.4 Variants   | 18 logo derivatives from M1 / M2 + visual baseline reset                                        | Mechanical (downstream of M1/M2)                               | ⏸ Pending |

**Framework set when** — refined definition: the chunks above all complete _and_ a new surface can be built by composing existing tokens + components instead of inventing them. As of 2026-05-16, **chunks 1, 1.5, 2.1, 2.2 are shipped**; the rest is paused pending creative bandwidth or external artwork.

The placeholder Plex Serif wordmark is live on karmanprep.com — there's no public regression to worry about while the chain is paused.

---

## 2. Page connectivity / Information architecture

**What it is:** The navigation graph + cross-page linking system of the entire site. How a user gets from any page to any other relevant page without ever editing the URL.

**What's included:**

- Navigation graph audit — every existing page mapped, what it links TO, what links TO it, identifying dead-ends + orphans + broken paths
- Global navigation components:
  - Top nav (for public marketing surfaces)
  - Authenticated sidebar (student / tutor / parent / admin variants — context-aware)
  - Footer (public surfaces + sitemap-style links)
  - Breadcrumb system for deep pages
  - In-page tab navigation patterns where needed
- URL structure specification — clean, hierarchical, semantically meaningful (e.g. `/learn/math/algebra/linear-equations` not `/learn?id=ma-01`)
- Cross-page linking patterns — every page knows where it came from (breadcrumbs) and where to go next (contextual CTAs); related-link blocks on detail pages
- Site-wide search where appropriate (admin question search exists; consider extending to a unified search across nodes + lessons + tutors + cohorts)
- 404 + error page design with smart redirects (suggested pages, recently-viewed, search)
- Mobile navigation pattern (slide-out drawer, bottom tab bar, or hamburger — pick one + commit)
- A documented "site map" — the canonical structure of the app

**How it works:** Users move through the site via clearly-marked, well-placed links. Never URL hacking. The IA defines the conceptual structure (what relates to what); the components implement it consistently. New pages slot into the existing IA — they don't get bolted on with arbitrary URLs.

**Why it matters:** Currently users have to hand-edit URLs to navigate. That's a hard fail for any web product, doubly so for one targeting students who already find SAT prep intimidating. Navigation IS the product experience until they reach the actual content. Also: the IA constrains the visual redesign — visuals lock in whatever link structure exists when you start, so IA must come before UI redesign.

**Dependencies:** #1 (uses the new component library). Should land before #7 (UI redesign).

**Framework set when:** A user can get from any page to any other relevant page in ≤2 clicks. The site map is documented. Every page has clear breadcrumbs (where applicable) and a clear primary CTA. No URL-bar typing required for normal use.

**Continues post-launch:** When new sections launch (e.g. ACT), they extend the existing IA — the framework stays.

---

## 3. Mobile-first commitment

**What it is:** A binding design principle, not a separate buildable project. Every visual decision from this point forward is made for a 375px mobile viewport FIRST, then expanded for tablet + desktop.

**What's included:**

- 375px width as the primary design canvas in Figma — every screen + component designed for mobile first, desktop derived from there
- Touch targets ≥44×44px (Apple HIG) baked into the component library — buttons, inputs, links, interactive zones
- Mobile-specific interaction patterns:
  - Bottom-aligned primary actions (thumb-zone)
  - Full-width modal sheets instead of center-floating modals
  - Swipe gestures where natural (between tabs, between days, etc.)
  - No hover-dependent affordances — every hover state has a touch equivalent (long-press, explicit toggle, etc.)
- Responsive testing matrix — Playwright already has Pixel 7 + iPhone 14 viewport coverage; commitment is that those projects pass on every visual change
- Real-device validation in the merge process — the iPhone-tethering workflow documented in CLAUDE.md becomes the floor for any UI change before merge
- Network-aware design — every loading state, image weight, and perceived-performance choice assumes 3G mobile
- Reduced-motion + accessibility considerations baked in

**How it works:** This is a checklist, not a deliverable. Every design + implementation decision passes through "would this work great on a 375px iPhone in a coffee shop on 3G?" If the answer is no, the design is wrong, not the mobile experience.

**Why it matters:** Most prospective Karman students will first encounter the site on mobile. If that first impression is a shrunk-down web app, the conversion happens on a competitor's better-designed mobile page. Also: treating mobile as a retrofit after desktop is the standard way products end up feeling cheap on the device most people use.

**Dependencies:** Decision committed before #1 (design language) starts so it shapes the design from the ground up.

**Framework set when:** The design language has explicit 375px specs for every screen + component. Every PR touching visual UI runs the cross-engine visual harness. Real-device validation is part of the merge process.

**Continues post-launch:** The principle stays — new features designed under it, not retrofitted to it.

---

## 4. Compliance program

**What it is:** A comprehensive legal + regulatory compliance posture covering educational privacy (FERPA), child privacy (COPPA), state privacy laws, accessibility (WCAG), and payment regulations.

**What's included:**

- **FERPA (Family Educational Rights and Privacy Act):** Karman handles educational records of K-12 students; operates as a "school official" under direct educational control. Document data practices that meet FERPA requirements. Parent + student access rights respected via data-portability + correction flows.
- **COPPA (Children's Online Privacy Protection Act):** Any user under 13 requires verifiable parental consent. Most SAT users are 14-17 but the legal floor is 13. Build the age gate + parent consent flow. Don't collect more data than necessary from minors.
- **State privacy laws:** California (CCPA/CPRA — partly handled by the consent banner from PR #88), Virginia (VCDPA), New York (SHIELD Act), Texas (TDPSA), and others as they enact. Unified privacy controls page that satisfies all.
- **Accessibility (WCAG 2.1 AA at minimum, ideally AAA):** keyboard navigation, screen reader support, sufficient color contrast (PR #92 partially addressed), focus management, ARIA correctness, captioned video content, no flashing content. The axe-core scan is the floor.
- **Payment compliance:** PCI-DSS scope minimized by Stripe handling card data; document that Karman never touches card numbers; tokenization audit
- **Data Processing Agreements (DPAs):** every vendor that processes student data (Supabase, Clerk, Stripe, Resend, OpenAI, Cal, Zoom, Fireflies, Slack) has a signed DPA on file
- **Privacy policy + Terms of Service:** lawyer-reviewed, plain-language summary in addition to the legal version, version history with change notifications
- **Data subject rights flow:** a user can request their data (export), request deletion (with retention exceptions documented), request correction. Process documented + tested with synthetic users.
- **Breach response plan:** documented procedure for detection → notification timeline → who's notified → communications templates
- **Annual review cycle:** privacy practices reviewed yearly; updates published with notification

**How it works:** Compliance is a program, not a feature. Each item above is a workstream producing documented artifacts (policies) + code changes (consent flows, deletion endpoints, age gates) + operational procedures (breach response). External legal counsel reviews and signs off on the legal artifacts.

**Why it matters:** Operating without compliance is not optional for an education product handling minors' data. It's both legal liability AND brand trust — parents will not enroll their child in a service that doesn't visibly take privacy seriously. The score-guarantee marketing also requires accurate, fairly-collected outcomes data, which intersects with compliance.

**Dependencies:** External lawyer engagement is the wall-clock-limiting factor — engage early. Coordinates with #5 (analytics — what gets tracked must be lawful) and #8 (security — compliance + security are interlinked).

**Framework set when:** Privacy policy + ToS published + lawyer-reviewed. FERPA, COPPA, state law obligations met + documented. WCAG 2.1 AA accessibility verified by external audit. Data subject rights flow built + tested. DPAs in place with every vendor. Breach response plan documented.

**Continues post-launch:** Quarterly compliance reviews, annual external audit, response to new state laws as they're enacted.

---

## 5. Analytics + telemetry pipeline

**What it is:** A complete behavioral data infrastructure that captures every meaningful user action and surfaces it through dashboards for product + business decisions.

**What's included:**

- **Event taxonomy:** the canonical list of events the app emits. Examples: `page_view`, `signup_completed`, `onboarding_completed`, `diagnostic_started`, `diagnostic_completed`, `quiz_started`, `quiz_completed`, `question_answered`, `lesson_opened`, `video_played`, `video_completed`, `booking_created`, `booking_cancelled`, `message_sent`, `payment_succeeded`, `subscription_renewed`, `subscription_cancelled`. Each event has required properties documented.
- **Instrumentation library:** a thin `track(event, props)` helper in `src/lib/analytics/` that every feature calls. Type-safe via TypeScript discriminated union — invalid event names + missing properties fail at compile time.
- **Warehouse choice:** PostHog (opinionated, cheap, includes dashboards + session replay + feature flags out of the box) or ClickHouse + a separate dashboarding tool (Metabase or Grafana — more flexible but more setup). Recommendation: PostHog for time-to-value; migrate if outgrown.
- **Backend events:** critical mutations (subscription created/cancelled, payout requested, refund issued) emit events from the server too, not just client — closes the loop on user-initiated actions that may not fire from the browser.
- **User identification + cohort tracking:** events tied to user ID; cohort attribution preserved (which marketing channel acquired them, signup date, tier, which tutor)
- **Dashboards:**
  - Funnel (visitor → signup → first practice → first paid month → renewed)
  - Retention (D1, D7, D30, D90)
  - Engagement (DAU/WAU/MAU per cohort)
  - Feature usage (which pages get traffic, which features get clicks)
  - Tutor performance (per-tutor student outcomes, NPS, completion rates)
  - Revenue (MRR by tier, churn, LTV by acquisition channel)
- **A/B testing infrastructure:** feature flags + experiment assignment + outcome measurement. Statistical significance computed properly.
- **Privacy + consent:** analytics respect the existing consent banner from PR #88. EU/CA visitors who decline don't get tracked.
- **Performance:** instrumentation overhead under 5ms per event (batching + non-blocking dispatch)

**How it works:** Every meaningful user action emits an event the moment it happens. Events stream to the warehouse. Dashboards answer business questions. New features always emit telemetry from day one — there's a `track()` call right alongside the action. This makes every product + business decision data-informed instead of guess-driven.

**Why it matters:** Karman currently has Sentry for errors but nothing for behavior. Can't tell which lesson is the dropoff point, which feature drives renewal, which marketing channel produces the highest-LTV students. Without this, every product decision is a guess.

**Dependencies:** None. Start early so new features emit events from inception (retrofitting analytics is painful).

**Framework set when:** Event taxonomy documented. Tracking library implemented + called in every existing feature. Warehouse + dashboards live. Funnel + retention + engagement + revenue dashboards exist + are checked weekly.

**Continues post-launch:** Yes — every new feature adds events; dashboards evolve; A/B tests run continuously. The post-launch refinement is the system maturing, not getting built.

---

## 6. Videos + textbook entries per skill node

**What it is:** A complete library of teaching content — 5-minute explainer video + 500-1000 word textbook entry — for every one of the ~100 skill nodes (50 Reading & Writing + 50 Math).

**What's included:**

- **Format specification:**
  - Video: 5-minute target length, 7-minute max. 16:9 aspect ratio (adapts to mobile rotation). Captioning: burned-in + WebVTT track for accessibility + searchability. Production quality bar: clear audio, professional but warm tone, visual aids that work on mobile screens.
  - Textbook entry: 500-1000 words. Structure: concept summary → key formulas/rules → worked example → common pitfall → "you've got this when..." takeaway. Reading level calibrated to high-school junior.
- **Production pipeline:** scriptwriting → recording → editing → review → publishing. Each stage has an owner + handoff process documented.
- **Hosting + delivery:**
  - Videos on Supabase Storage or a dedicated CDN (Bunny or Mux — Mux for advanced analytics, Bunny for raw cost efficiency)
  - Textbook entries as MDX in the repo (versioned with code) OR as DB rows for live editing without redeploy (recommendation: start in repo, move to DB if editing velocity demands)
- **Player integration:** video player in the lesson UI with playback speed control (0.75x / 1x / 1.25x / 1.5x / 2x), captions toggle, "watched %" tracking (already partially exists), chapter markers
- **Quality review process:** each piece reviewed by a subject-matter expert before publication. Existing flagged-question + review queues are the model.
- **Order of operations within the project:** identify the 10-20 highest-traffic nodes first (foundational entry points like `rw-00` and `ma-00`, plus commonly-stuck nodes from existing student data once #5 analytics is live). Produce those first. Less-trafficked nodes batch later.
- **Content vendor relationship:** 1-2 contracted SAT-knowledgeable producers + 1 video editor work in parallel with the dev work. Their throughput is what compresses content production wall-clock.
- **Versioning:** when SAT format changes or pedagogical understanding improves, content is revisable. Version history tracked.

**How it works:** Each skill node has both a video (the teaching moment) and a textbook entry (the searchable reference). Student opens a node → can choose video, text, or both. Together they replace the current placeholder content with actual teaching material. Tutors can also point students to specific timestamps or text sections.

**Why it matters:** This is the actual product. Everything else — the cohorts, the practice questions, the diagnostics, the chat — is in service of teaching content. Without it, Karman is a beautiful UI shell with no substance.

**Dependencies:** #1 (player UI uses design language). Otherwise independent. The longest-lead-time item — outsourcing content production is the only realistic path.

**Framework set when:** The production pipeline exists + is producing content on schedule. The player + textbook surfaces are built + responsive. The first 20 highest-traffic nodes have shipped. Clear path to all 100 by launch.

**Continues post-launch:** Yes — refining existing content based on student feedback, adding deeper material, expanding to advanced topics, eventually localizing to other languages.

---

## 7. UI / UX redesign

**What it is:** The complete visual + interaction overhaul of every Karman Prep surface, executing on the design language from #1 across the full ~50 pages of the app.

**What's included:**

- **Phased rollout strategy:**
  - Phase A: top-funnel surfaces (landing, sign-up, onboarding flow, /learn entry, /diagnostic, /billing, /coming-soon, all marketing pages)
  - Phase B: student depth (chat, progress, mastered, schedule, predicted-SAT, dashboard)
  - Phase C: tutor portal (schedule, earnings, payouts, cohorts, settings, student detail)
  - Phase D: admin console (users, cohorts, curriculum, revenue, moderation, questions, jobs)
  - Phase E: parent surfaces (dashboard, student detail)
- **For each surface:** applies design language from #1, respects IA from #2, mobile-first per #3. Replaces existing AI-generated visuals with intentional, brand-coherent design.
- **Inspiration sources:** Figma + Figma Make for ideation. Curated reference set of competitor + adjacent ed-tech sites — Duolingo (gamification + motion), Khan Academy (information density + clarity), Brilliant (visual hierarchy + animation), Quizlet (study UX), Chess.com (community + progression). Extract design patterns, motion vocabulary, hierarchy choices — never raw HTML/CSS (legal + brand risk).
- **AI-generated assets:** illustrations, hero imagery, abstract backgrounds. Curated heavily — generic AI visuals are exactly the "AI slop" feel to avoid. Each asset reviewed for brand consistency before shipping.
- **Motion + animation:** micro-interactions on every interactive element (button presses, hover states, focus rings, state transitions). Scroll-triggered reveals on long pages. Page transitions where they feel right. The hemisphere-merge in #17 (3D brain) is the marquee animation; smaller ones throughout reinforce the brand.
- **Accessibility throughout:** every surface passes axe-core's WCAG 2.1 AA scan. Color contrast verified (the slate-400 floor from PR #92 is the baseline; expand where appropriate). Keyboard navigation works on every interactive element. Screen reader support functional. Focus visible always.
- **Visual regression baselines:** every redesigned surface adds its baseline to the regression suite (the infra from PR #89). Future changes can't silently drift the visuals.
- **Storybook updates:** as new components emerge during redesign, they're added to the design system library (#1) — never built as one-offs in the page where they first appear.
- **Content review:** copy reviewed alongside visual redesign. Tone of voice unified. CTA language tested. Reading levels appropriate to audience (parents vs students vs tutors).

**How it works:** Phased rollout — each phase rebuilds a set of related surfaces using the design language. As patterns emerge (e.g. a specific kind of data table, a specific dialog flow), they're codified into reusable components and added to the design system. By the end of the project, the design system library is significantly expanded and every surface in the app feels native to a unified design.

**Why it matters:** This is THE perception layer. Users (especially first-time students + parents on mobile) judge Karman in the first 5 seconds based entirely on visual feel. The current "AI slop" feel is the single biggest conversion-killer. Fixing it is the highest-leverage perception change available.

**Dependencies:** #1 (must be locked first — design language is the input), #2 (IA must be locked first — visuals lock in navigation), #3 (mobile-first applies throughout), partially #6 (some surfaces need real content to be designed correctly — e.g. lesson pages need real video + textbook).

**Framework set when:** Every surface in the app has been redesigned against the design language. Visual regression suite covers all redesigned surfaces. Accessibility passes WCAG 2.1 AA across the catalog. Mobile + desktop both shine.

**Continues post-launch:** Visual refinements based on user feedback, new surfaces added when adjacents launch (ACT, college counseling), seasonal/event-based UI moments.

---

## 8. Website security + data security

**What it is:** A comprehensive hardening program covering authentication, authorization, data protection, network surface, secret management, audit logging, and operational practices.

**What's included:**

- **RLS coverage audit:** every Supabase table reviewed for correct row-level security policies. Service-role bypass paths (where the app uses `createAdminClient`) documented + justified, never used as a shortcut around proper authz.
- **Authentication hardening:**
  - Clerk session lifetime caps + refresh token rotation policy
  - Suspicious-activity detection (geographic anomalies, rapid sign-in attempts)
  - Password requirements at minimum or passwordless flow
  - 2FA support for tutor + admin accounts (mandatory for admin, optional but encouraged for tutor)
- **Authorization model:** explicit role-based access checks on every server action + API route. Currently uses ad-hoc role string comparisons in many places; harden into a centralized `requireRole(allowed[])` pattern that's used everywhere.
- **Rate limiting:** per-IP + per-user limits on:
  - Auth-adjacent endpoints (sign-in, password-reset, sign-up — abuse prevention)
  - Message-send routes (spam prevention)
  - AI-call routes (cost protection — uncapped AI calls = unbounded liability)
  - Webhook endpoints (DOS protection beyond signature verification)
- **Input validation completeness:** every API route Zod-validates its body via the `<route>/schemas.ts` pattern. Every server action validates inputs. No `req.json()` consumed without a schema parse anywhere.
- **Secret rotation playbook:** documented procedure for rotating each secret (Stripe, Stripe Connect, Clerk, OpenAI, Resend, Cal, Zoom, Slack, Fireflies, Supabase service-role key, cron secret). Includes operational steps + impact mitigation per secret.
- **Webhook signature verification:** every external webhook (Stripe x2, Cal, Zoom, Fireflies, Slack, Supabase DB webhook) verifies signature before any side-effect. Most done; audit completeness.
- **Audit logging:** critical actions (role changes, refund issuance, impersonation events, account deletion, tutor compensation adjustments) write to an immutable audit log. Partial coverage exists; standardize across all sensitive actions.
- **Dependency security:** `npm audit` clean by default (already partially done via PR #65). Renovate-bot or equivalent for ongoing security updates.
- **Backup + recovery:** Supabase point-in-time recovery enabled + tested with a real restore drill (don't trust untested backups). Documented restore procedure.
- **Penetration testing:** third-party pen test before launch + annually after.
- **Operational security:** access control to production secrets (least privilege), audit log retention policy, employee/contractor offboarding checklist (revoke all access immediately).

**How it works:** Security is a continuous program, not a feature. Each surface above gets a dedicated audit pass + remediation PRs + documentation. Together they form a defense-in-depth posture: even if one layer fails (e.g. a Zod schema missed a field), the next layer (RLS) catches it.

**Why it matters:** Karman handles minor students' personal data, payment information, and educational records. A breach isn't just embarrassing — it's a regulated incident with reporting obligations + legal liability + brand-killing trust damage. Doing security right pre-launch is much cheaper than recovering from an incident post-launch.

**Dependencies:** Independent — runs in parallel with everything. Coordinates with #4 (compliance — the legal framework intersects with security controls).

**Framework set when:** `docs/security-audit-2026.md` exists with every surface above ticked off + remediation PRs linked. Third-party pen test completed + findings addressed. Secret rotation procedure has been _tested_, not just documented. Audit log captures all critical actions.

**Continues post-launch:** Quarterly internal audits, annual external pen test, dependency updates on schedule, secret rotation per cadence.

---

## 9. Outcomes engine + score guarantee operationalization

**What it is:** The data + workflow infrastructure that turns the "50-point score improvement guarantee" from a marketing claim into a verifiable operational program — AND generates the outcomes data that becomes the most credible marketing asset Karman has.

**What's included:**

- **Score ingestion:** students upload their official College Board SAT score report (PDF upload + parsing, with manual entry as fallback). Pre-prep baseline score captured at enrollment. Post-prep score captured after each test administration.
- **Score parsing:** extract structured data from College Board score reports — total score, section scores (RW + Math), sub-domain scores, percentile rankings. OCR pipeline if needed for non-machine-readable formats.
- **Guarantee qualification logic:** deterministic — "did this student improve by ≥50 points from baseline to post-prep, given they completed the program in good faith?" The "good faith" definition is operationalized: attended ≥X% of scheduled sessions, completed ≥Y practice questions, took the official test within the eligible window after starting prep. All thresholds documented + defensible.
- **Refund workflow:** students who don't qualify (failed to improve despite good-faith effort) are automatically eligible for refund. Refund-issuance UI for admins. Communications templates for the various outcomes (improved/didn't improve/insufficient effort).
- **Outcomes dashboard (admin-facing):** aggregate stats across all students who completed prep — average improvement, median improvement, distribution histogram, by tier, by tutor, by cohort, by acquisition channel.
- **Outcomes data as marketing fuel:** deterministically-generated stats refreshed monthly. Examples: "87% of students who completed the program improved by 100+ points", "Average improvement: 142 points", "Top quartile improvement: 280+ points". Surfaced on landing page, in sales emails, on review pages. Structured data (JSON-LD review schema) for rich snippet eligibility.
- **Per-student progress tracking:** the existing predicted-SAT chart extended to show goal-vs-trajectory. Tutor + parent + student all see the same chart with confidence interval. Visual cue when on/off track for the goal.
- **Outcomes API:** internal endpoint for the marketing site to fetch live aggregate numbers. Public outcomes page showing class-of-2026 results, refreshed as the data accumulates.

**How it works:** Every enrolled student has a baseline score on file from enrollment. Throughout prep, predicted score is computed from practice performance (existing infra). After the official test, the student uploads their score report; the system parses it; qualification logic runs automatically. Refund-eligible students get a notification + a one-click refund-request button. Aggregate data feeds the marketing flywheel.

**Why it matters:** Two reasons. (1) The guarantee is currently a marketing promise with no operational machinery underneath — it's a liability waiting to happen and a credibility risk if students discover there's no fair process. (2) Aggregated outcomes data is the most credible marketing asset a tutoring company can have. "87% improved by 100+ points based on official College Board score reports" is more powerful than any feature description or testimonial.

**Dependencies:** #5 (analytics — outcomes events flow through it), #4 (compliance — student score data has FERPA implications).

**Framework set when:** A student can upload their score report and have it processed. The qualification logic runs deterministically against documented thresholds. Admin can see aggregate outcomes. Marketing surfaces show live, real numbers (not placeholders). Refund workflow operational.

**Continues post-launch:** Heavily — every cohort that finishes generates more data. The marketing power compounds. Predicted score model refines as actual outcomes correlate back.

---

## 10. Full-length mock SAT

**What it is:** A complete proctored 2-hour-14-minute SAT practice test, mirroring the Bluebook (official) testing experience, available to non-paying visitors as the highest-converting top-of-funnel tool in SAT prep.

**What's included:**

- **Test structure:** matches the Digital SAT format — 2 sections (Reading & Writing + Math), 2 modules each, adaptive difficulty between modules within a section.
- **Timing:** real timer with the actual SAT time limits (RW: 32 min × 2 modules, Math: 35 min × 2 modules, plus a 10-minute break). Can't pause within a module. Strict.
- **Question selection:** pulled from a dedicated vetted bank of mock-test questions. NEVER live practice questions (content security — students shouldn't memorize practice content from the mock). A separate pool curated to mirror real SAT difficulty + format + topic distribution.
- **UI mirroring Bluebook:** question display style, navigation panel, mark-for-review, eliminate-answer-choice (cross out wrong options), highlight/annotate passages. All the affordances the real test has. Make the practice feel like the real thing.
- **Adaptive logic:** the difficulty of the second module within a section depends on performance on the first, matching the real test's adaptive mechanics. Routing tables documented + tunable.
- **Score prediction:** at completion, present a predicted SAT score with confidence band based on performance. Domain breakdown showing strongest + weakest areas. Comparison to last year's national averages.
- **Lead capture:** results gated by email for non-signed-in visitors (the value exchange is real — they get a real predicted score, you get their email + qualified lead signal).
- **Conversion CTA:** the results page is the conversion moment — clear path to sign up for prep targeted at the student's weakest domains (e.g. "Your weakest area is Coordinate Geometry — our Math tutors can fix that").
- **Available to existing students too:** retake-able as benchmarking throughout prep (uses a separate question pool to avoid memorization across attempts).
- **Anti-cheat (light):** prevent obvious copy-paste of questions, tab-switching warnings (with grace), strict time enforcement.

**How it works:** A prospective student lands on `/mock-sat` (linked from marketing pages, ads, content articles, partner sites). Enters email. Takes a real timed SAT-format test. Gets a predicted score with detailed breakdown. The breakdown surfaces the gaps; the gaps motivate signup. Existing students can take it as a benchmark; the system uses a separate question pool for each attempt.

**Why it matters:** This is THE conversion tool in SAT prep marketing. Free, valuable, sticky. Every major SAT prep company has one — Khan Academy's free mock drives huge volume to their paid offerings. Karman not having one is a missed funnel that no amount of other marketing makes up for.

**Dependencies:** #1 (design language — the Bluebook-mirroring UI uses the components), #9 (outcomes engine — predicted score uses the same prediction model), question content (a dedicated curated pool of mock-test questions, separate from the practice bank — coordinate with #6 vendor + existing question infra).

**Framework set when:** A visitor without an account can take a full SAT, get a predicted score with confidence band, and see the conversion path to sign up for prep targeted at their weak areas. The flow works on mobile + desktop. The question pool exists + is large enough to support multiple attempts without repetition.

**Continues post-launch:** Question pool expansion (new attempts need fresh questions), score prediction model refinement based on real outcomes correlation, A/B testing different post-test conversion approaches, eventually extending to ACT mock.

---

## 11. SEO

**What it is:** A program to rank Karman Prep on the first page of Google for high-intent SAT prep search terms.

**What's included:**

- **Technical foundation:**
  - Clean URL structure (matches IA from #2 — semantic, hierarchical)
  - Proper canonical tags per page
  - Sitemap.xml auto-generated + submitted
  - Robots.txt with sensible defaults
  - Hreflang tags if international content lands
  - Mobile-friendly (table stakes — covered by mobile-first commitment from #3)
  - Core Web Vitals (LCP, FID/INP, CLS) all in Google's "good" range
- **Structured data (JSON-LD):**
  - `Organization` schema for the site
  - `Course` schema for each cohort + tier offering
  - `Person` schema for tutor profiles
  - `Review` schema once student reviews accumulate (from #9 outcomes feeding into testimonials)
  - `FAQPage` schema for the FAQ content
  - `BreadcrumbList` on every deep page
- **On-page SEO:**
  - Unique meta title + description per page (auto-generated for dynamic pages with patterns; hand-tuned for marketing surfaces)
  - Semantic HTML (h1-h6 hierarchy correct, semantic elements like `<nav>`, `<main>`, `<article>` used properly)
  - Descriptive alt text on every image (also serves accessibility per #4)
  - OG + Twitter card metadata
  - OG images that are share-worthy (designed alongside the UI redesign — branded, on-message)
- **Content strategy:**
  - Cornerstone articles (the "ultimate guide to..." pieces) on the 10-20 highest-volume SAT search terms
  - Build the blog into a real content moat over time — not SEO bait, actual useful content that students and parents save + share
  - Editorial calendar with weekly publishing cadence
- **Keyword research:**
  - Identify queries with high commercial intent + addressable difficulty (e.g. "best SAT prep online" is high-intent but very competitive; "SAT geometry practice" is more attainable + still high-intent)
  - Map each target keyword to a target page or article
  - Track ranking + traffic per keyword in Google Search Console
- **Internal linking strategy:** every blog post links to the relevant product pages; every product page links to relevant blog content; deep linking between related concepts/nodes
- **Backlink building:**
  - Outreach to education blogs, college-prep counselors, parenting publications
  - Guest posts on authoritative ed sites
  - Resource page placements (high-school counselor resource pages, parent organizations)
  - Earned media via the outcomes data from #9
- **Performance optimization:**
  - Image lazy loading + modern formats (WebP / AVIF)
  - Code splitting (Next.js handles much of this automatically; verify per page)
  - Edge caching for marketing surfaces
  - Font loading optimization (font-display: swap; subset fonts)
  - Prefetching of likely-next pages
- **Monitoring:** weekly review of Google Search Console (indexing, click-through rates, ranking changes) + GA4 (or PostHog) for traffic patterns. Weekly review of Lighthouse scores per surface.

**How it works:** SEO is a flywheel, not a feature. The technical foundation gets shipped early — every new page automatically has correct meta + structured data + clean URLs. The content + backlinks + reviews accumulate over months. The framework being "set" pre-launch means: the foundation is rock-solid, the first cornerstone articles are published, the monitoring is in place. The big push (content scale-up + outreach) accelerates after launch when there are real outcomes to share.

**Why it matters:** SEO is the cheapest customer acquisition channel by far when it works. For an SAT prep company, queries like "best SAT prep" or "SAT tutoring online" are worth $200+ per click on paid ads — winning them organically is a transformational moat. Even mid-tail queries ("SAT geometry tutor", "SAT math review online") have meaningful commercial value.

**Dependencies:** #2 (URL structure must be finalized — changing URLs after launch is expensive in SEO terms), #1 (design language drives the share-worthy OG images), #9 (outcomes data feeds review schema + content credibility), #7 (UI redesign coordinates with on-page SEO improvements).

**Framework set when:** Every public page has correct meta + structured data + clean URL. Sitemap + robots + Search Console submitted. Core Web Vitals in green across all pages. The first 5-10 cornerstone articles are published + indexed. Monitoring + reporting in place.

**Continues post-launch:** Heavily — this is where most of the SEO work actually happens. Content cadence, backlink outreach, keyword expansion, technical refinement based on search performance, ranking optimization for specific target queries.

---

## 12. Growth / acquisition engine

**What it is:** The complete funnel of user acquisition channels — referrals, partnerships, content, paid, lifecycle — built as a coherent system rather than a collection of one-off tactics.

**What's included:**

- **Referral program:** existing students can refer friends with a custom link. Both referrer + referee get credit (free month, free 1:1 session, discount on next month — tunable). Tracking infrastructure: who referred whom, conversion rate per referrer, payout/credit issuance workflow.
- **Affiliate program:** third parties (independent college counselors, tutoring chains, prep school admissions counselors, parenting bloggers) earn commission for referrals. UTM-tagged links + cookie-based attribution + partner-facing dashboard showing their conversions + earnings + payout workflow.
- **Content marketing:** a real blog (not SEO bait) with a content calendar — cornerstone articles, tactical SAT-prep posts, opinion pieces on test-prep philosophy, parent-targeted guides. Backed by editorial standards + a publishing cadence.
- **Free-tool lead magnets:**
  - "What's your predicted SAT?" 35-question diagnostic (already built — extend the email-capture)
  - "SAT prep timeline planner" — interactive tool that takes a student's test date + current score + goal score and outputs a study plan (captures email)
  - The mock SAT from #10 — the killer lead magnet
- **Lifecycle email/SMS sequences:**
  - Welcome series (3-5 emails over the first week — what to expect, how to get the most out of Karman, intro to your tutor if applicable)
  - Engagement series (week-2 nudge if inactive, mid-prep check-in, pre-test pump-up email)
  - Retention series (renewal reminders, lapsed-user reactivation, post-graduation alumni outreach)
- **Social media presence:**
  - TikTok + Instagram are where teens live — short-form video presence with student testimonials, study tips, SAT myth-busting, behind-the-scenes
  - Probably outsourced or co-produced with a content partner who specializes in ed-tech social
  - Cross-promotion with tutors' own social presence
- **Partnerships outreach:**
  - High schools (offer free school-wide diagnostic access in exchange for branded co-marketing)
  - Prep academies + private tutoring chains (referral partnerships)
  - College counselors (commission-based referrals)
  - Parent organizations + PTAs (educational content sharing)
- **Paid acquisition framework:**
  - Not necessarily the biggest channel, but have the infra ready — Google Ads landing pages with proper UTM tracking, attribution + LTV measurement (via #5), budget controls + spend efficiency dashboards
  - Facebook/Instagram parent-targeted campaigns
  - YouTube ads on test-prep + study-skills content
- **Marketing analytics:** every channel attributed via UTMs flowing into #5 analytics. LTV by channel computed. CAC by channel computed. Spend efficiency dashboard.

**How it works:** Each channel runs as its own ongoing operation; the framework is the orchestration. The referral program lives in-app; content marketing in the blog; lifecycle in email/SMS; partnerships in BD outreach; paid in ad platforms. Each emits events to #5 for unified attribution. Underlying premise: organic + earned + referred always beats paid in unit economics for an ed product targeting high-intent searchers.

**Why it matters:** A perfect product launching into silence is still a failed launch. Acquisition is the difference between Karman becoming a real business and Karman being an excellent piece of software that 50 people use. The growth engine is what bridges product-readiness and market-presence.

**Dependencies:** #5 (analytics for attribution), #1 (design language for landing pages + email templates), #9 (outcomes data for credibility marketing), #10 (mock SAT as a lead magnet), #11 (SEO foundation for content marketing).

**Framework set when:** Referral program live + tracking conversions. At least one affiliate partnership signed. Blog has 5-10 cornerstone articles published. Welcome + engagement + retention email sequences live + measured for open/click rates. Social channels active with a content cadence. Paid acquisition ready to spin up with proper tracking.

**Continues post-launch:** Yes — this is where most marketing work happens after launch. Every channel iterates continuously based on performance data.

---

## 13. Customer support tooling

**What it is:** A complete support infrastructure — helpdesk integration, in-app support widget, knowledge base, ticket routing, SLA tracking — for handling student, parent, tutor, and admin inquiries at scale.

**What's included:**

- **Helpdesk platform choice:** Intercom (best in-app integration, expensive), Zendesk (most full-featured, expensive), Help Scout (cost-effective + simple), or built-in (cheapest, most control, most build time). Recommendation: Help Scout for the cost/functionality balance pre-revenue-scale; Intercom if budget allows.
- **In-app support widget:** persistent "Get help" button on every authenticated page. Opens to: search knowledge base first → if no answer found, open a ticket. Context-aware — knows what page the user is on, what tier they are, recent activity.
- **Knowledge base / FAQ:** searchable articles covering common questions (billing, scheduling, technical, account management, study tips). Auto-suggest as user types ("typing 'cancel...' → shows articles about cancellation policy, pausing subscription, etc."). Article ratings (was this helpful?) + view counts. Maintained as a real content surface, not an afterthought.
- **Ticket routing:** rules-based. Parent questions → ops team. Tutor questions → admin. Technical bugs → engineering. Billing → finance/ops. Legal/privacy → compliance. Each ticket lands in the right inbox automatically based on user role + page + keyword detection.
- **SLA tracking by tier:**
  - Elite students: <2 hour first response, <8 hour resolution target
  - Private: <4 hour first response, <24 hour resolution
  - Small Group: <12 hour first response, <48 hour resolution
  - Seminar: <24 hour first response, <72 hour resolution
  - Tutor inquiries: <4 hour first response (tutors are partners)
- **Tutor support tier:** tutors are partners, not customers — they have a separate channel + faster SLA + a tutor-specific FAQ
- **Internal Slack integration:** new tickets ping the appropriate Slack channel (`#support-ops`, `#support-eng`, etc.) so the team sees them immediately
- **Support analytics:** top issue categories surface to product team weekly (feedback loop into roadmap — if 30% of tickets are about scheduling confusion, that's a product fix, not a support fix). Customer satisfaction tracking (CSAT) post-resolution.
- **Macros + saved responses:** common questions have prepared (but personalizable) responses for fast turnaround
- **Escalation paths:**
  - Technical issues → engineering on-call
  - Billing escalations → finance lead
  - Legal/privacy → compliance counsel
  - Refund issuance → admin with refund authority
- **Hours of operation policy:** documented — when is support staffed, what happens overnight, weekend coverage

**How it works:** User clicks "Get help" → searches KB → if found, problem solved without a ticket. If not, opens ticket with auto-attached context (current page, tier, recent activity). Routes to appropriate inbox. Owner responds within SLA. Resolution + CSAT survey. Analytics surface patterns → product fixes recurring issues.

**Why it matters:** The moment Karman has paying users, support questions arrive. Operating without proper tooling means email-as-helpdesk, which scales to ~50 users before breaking. Quality support is also retention — students + parents who feel cared for renew at much higher rates than those who feel ignored.

**Dependencies:** #1 (in-app widget needs design treatment), #5 (analytics for context on tickets + support metrics dashboard).

**Framework set when:** Helpdesk platform live + integrated in-app. Knowledge base seeded with 30-50 articles covering the top issue categories. Ticket routing rules in place + tested. SLA tracking + escalation paths defined + the team is trained on the workflow.

**Continues post-launch:** Yes — KB articles added continuously based on incoming questions, ticket patterns drive product roadmap, support quality evolves with team size + volume.

---

## 14. Parent engagement layer

**What it is:** A complete product surface for parents — weekly digests, milestone celebrations, parent-tutor messaging, parent-set goals. Built on the premise that parents pay and renewal depends on parents perceiving value.

**What's included:**

- **Weekly digest email:** every Sunday, parents receive a digest with:
  - Practice time this week + comparison to previous weeks
  - Mastery progress (concepts learned this week, total mastered)
  - Upcoming sessions (tutor name + topic + time)
  - Predicted SAT score trend (the chart from existing infra)
  - "Where Mike is stuck" — specific concepts the student is struggling with
  - Tutor recommendations (what to focus on this week)
  - Quick links to parent dashboard + parent-tutor messaging
- **Real-time milestone notifications:** opt-in alerts for major milestones — first mock SAT taken, 50/100/250 questions answered, first concept mastered, prerequisites unlocked, target score reached. Sent as push + email.
- **Parent-tutor messaging:** parents can DM tutors directly (with student visibility — no behind-the-back communications; the student can see the thread). Moderation pipeline applies (same as student-tutor DMs).
- **Parent-set goals:** parents can set goals for their child (target SAT score, weekly practice time, weekly session attendance) visible to the student in their dashboard. The goal becomes a shared point of accountability.
- **Multi-student support:** parents with multiple Karman students see a unified dashboard with all kids, separately or aggregated
- **Tutor-introduction email:** when a student is assigned a tutor, parents receive an intro email about the tutor's background, teaching philosophy, scheduled first session
- **Monthly progress reports:** PDF report parents can print, share, or send to their child's school counselor — showing the month's progress + recommendations + concrete data
- **Privacy controls:** parents can see student's quizzes, sessions, chat history with tutors. Cannot see student's personal cohort chats with non-tutors (student social-life privacy preserved per family law in most states).
- **Onboarding video for parents:** a 3-minute video explaining what Karman does + how the parent dashboard works, sent on signup + linked in welcome email
- **Renewal touchpoints:** 30 days before renewal, parent gets a "here's what your child accomplished this period" recap email with clear renewal CTA + comparison vs goals

**How it works:** Parents have their own product surface that's substantively different from the student's. The student uses Karman to practice; the parent uses Karman to be confident their kid is using Karman well. The two views complement each other — student sees their work; parent sees the outcomes + the human relationships (tutor + cohort) + the value being delivered.

**Why it matters:** Parents pay. Renewal correlates more with parent perceived value than student delight. A student can love Karman and still not renew if their parent doesn't see what they're getting. The current parent surface is essentially a status check; this is a full product designed for parents as primary users.

**Dependencies:** #1 (design language for parent UI), #5 (analytics drives the digest content), #9 (outcomes data drives milestone celebrations + progress reports), existing parent-student-link infrastructure (already built).

**Framework set when:** Parents receive weekly digests with real practice/mastery data. Parent-tutor messaging works (with moderation). Parent-set goals visible to students. Milestone notifications fire. Progress reports generate as PDFs.

**Continues post-launch:** Yes — content of digests refines based on what parents engage with, new milestones added based on student lifecycle insights, parent-facing features evolve.

---

## 15. Engagement / retention system

**What it is:** The complete system of behavioral nudges, gamification mechanics, and lifecycle communications that fights the notorious 6-week SAT-prep dropoff curve.

**What's included:**

- **Streaks:** daily practice streak with a shield/freeze mechanic (one missed day is forgiven each week; consecutive misses break the streak). Visible on student dashboard, prominently.
- **Streak milestone celebrations:** at 7, 14, 30, 60, 100, 365 days — visual celebration in-app + notification to parent (via #14) + small reward (badge, discount on next session, fancy badge variant)
- **Daily nudges:** push notifications + emails when streak is at risk ("Don't break your 12-day streak! 10 minutes of practice keeps it alive.") + smart timing (not at 3am, respect quiet hours per user timezone)
- **Smart absence emails:** detects when a student has been inactive for 4-7 days. Sends a personalized re-engagement email — "Hi Mike, you haven't been here in 5 days. Here's a 15-min mini-practice on Algebra (your last weak area)." Personalization driven by #5 analytics.
- **Cohort social proof:** subtle in-app surfacing of cohort-mates' activity — "Mike just hit a 1300 on a mock test" appears in the cohort chat. Opt-out available per student. Not creepy, not competitive — celebratory.
- **Milestone badges:** earned for accomplishments (first mastered concept, 100 questions answered, mock SAT improved by 50 points, 10 sessions attended, etc.). Visible on student profile. Shareable.
- **Progress visualization:** the predicted-SAT chart (already built) extended to show goal-vs-trajectory. Visual cue when the student is on/off track for their goal. Color-coded.
- **Parent-visible engagement:** parent dashboard (#14) surfaces engagement metrics — practice time per week, days active, longest streak. Parent gets gentle nudge from Karman if their child's engagement drops significantly.
- **Recovery campaigns:** students who lapse (no activity for 14+ days) get a structured re-engagement sequence — discounted session offer, "you can do this" email from their tutor, account check-in
- **Anti-burnout signals:** if a student is over-practicing (>3 hours/day, every day, for 14+ consecutive days) the system suggests a break. Healthy engagement, not extractive engagement.
- **Surprise + delight:** occasional unexpected positive moments — bonus session credits on a tough week, congratulatory animation on a milestone, handwritten-feeling thank-you email after 3 months

**How it works:** Many small mechanics compose into a system that makes practicing feel rewarding, abandoning feel costly, and returning easy. Streaks create habit; nudges restart broken habits; cohort signals create social pressure (the good kind); milestones reward progress. The system never feels manipulative because the underlying activity (SAT prep) is what the student genuinely wants to do.

**Why it matters:** Industry-wide, SAT prep has notorious dropoff between week 2 and week 8 of any prep program. Most students start motivated in September and quit by Halloween. The engagement system is what turns a 50% completion rate into an 85% completion rate — which directly drives the outcomes data (#9), which drives marketing (#12), which drives growth.

**Dependencies:** #5 (analytics — events drive nudges + streaks + recovery), #14 (parent visibility component overlaps), #9 (progress tracking integration).

**Framework set when:** Streaks track + display correctly. Daily nudges fire based on streak state. Smart absence emails trigger after inactivity threshold. Cohort social proof surfaces in chat. Milestone badges earnable + visible. Recovery campaigns active for lapsed users.

**Continues post-launch:** Yes — heavy iteration. A/B test nudge timing, copy, frequency. Add new milestones. Refine streak mechanics based on actual student behavior. The engagement system never stops evolving.

---

## 16. ML question generation

**What it is:** A system that generates SAT-quality questions on demand, tunable by difficulty + topic + question type + style, with per-student personalization controllable by tutors.

**What's included:**

- **Generation engine:**
  - v1: prompt-engineered frontier model (Claude, GPT, etc.) with carefully crafted system prompts incorporating SAT format specs + Karman's pedagogical voice
  - v2 (post-launch, after data accumulates): fine-tuned custom model trained on the bank of approved Karman questions + outcomes data
- **Difficulty calibration:** explicit features tracked + tunable independently:
  - Vocabulary level (lexile-style measurement)
  - Computational steps required (for math)
  - Distractor type (common-mistake distractors vs random distractors)
  - Time pressure (expected solving time)
  - Multi-step reasoning depth
- **Topic taxonomy alignment:** questions tagged with the same node IDs the existing curriculum uses (rw-XX, ma-XX). Generation accepts node ID as input + produces correctly-tagged output.
- **Quality gate workflow:** generated questions land in the existing admin review queue (the `/admin/questions/review` infra extends naturally). Tutor + admin can approve, edit, reject. Nothing goes live without review. Edits feed back as training signal for v2.
- **Tutor-facing UI:** embedded in the tutor portal. "Generate 5 medium-difficulty Algebra II questions for Mike" produces them with one click. Tutor can refine by clicking on a question and editing inline. Tutor can request variations of a question they like ("more like this but harder").
- **Per-student personalization:** generation prompts incorporate the student's recent performance signal: "This student missed 4 of the last 5 Coordinate Geometry questions; emphasize coordinate plane geometry; use simpler vocabulary; include a worked-example-style hint."
- **Bank vs live distinction preserved:** generated questions enter the question bank; promotion to live still requires the existing admin routing flow (no AI-generated content reaches students without human review).
- **Cost controls:** per-tutor rate limits to prevent runaway generation costs; cost dashboard for admin
- **Outcomes loop:** student performance on AI-generated questions feeds back into the difficulty calibration; questions that students get right too easily or too rarely get reclassified or removed.
- **Variant generation:** given an existing question, the system can generate similar questions with different specifics (different numbers, different scenarios, but same skill tested) for drill practice.

**How it works:** A tutor identifies a student's gap. They request question generation via the tutor portal with parameters (topic, difficulty, count, style notes). The engine generates candidates; they land in the review queue. The tutor approves the ones they like, edits the ones close, rejects the bad. Approved questions are assigned to the student as homework. Performance signals feed back to improve future generation.

**Why it matters:** The biggest pain point in SAT tutoring is "I need a few more medium-hard questions on slope-intercept form for this specific student". Currently that means searching the existing bank or hand-writing one. ML generation makes it instant and personalized — a real differentiator from generic prep platforms. It also scales tutor productivity: a tutor can prep personalized homework for 10 students in the time it currently takes to prep for 2.

**Dependencies:** #1 (tutor UI uses design language), the existing question bank as reference + training data, #9 (outcomes engine — performance loop closes through it).

**Framework set when:** A tutor can generate, review, approve, and assign personalized questions in under a minute. The system has cost controls. Generated questions are tagged correctly + go through the quality gate before reaching students. The tutor UI is intuitive.

**Continues post-launch:** Heavy iteration — accumulating real outcomes data enables v2 with a fine-tuned model that outperforms v1's prompt-engineered baseline. Difficulty calibration refines based on real performance. New question types added (e.g. for AP test prep when that adjacent launches).

---

## 17. Learn page 3D brain visualization

**What it is:** A 3D interactive brain model where the constellation of skill nodes forms two hemispheres (Reading & Writing on the left, Math on the right) that visually merge as the student progresses across both subjects. Designed to be visually stunning AND functionally efficient — the signature visual moment of the product.

**What's included:**

- **3D engine choice:** Three.js or react-three-fiber (r3f). Recommendation: r3f for cleaner React integration + declarative API + good performance with React's reconciliation.
- **Performance budget:** 60fps on Pixel 7 + iPhone 14 (the floor — not the aspiration). Carefully budgeted polygon count, texture resolution, draw calls. Profiled per-device.
- **Hemisphere visualization:**
  - Each subject (RW + Math) rendered as a hemisphere of clustered "stars" (the skill nodes)
  - Connected by faint lines representing prerequisites
  - Each hemisphere has its own color tint (subtle — not garish) to reinforce subject identity
- **Merge animation:** as the student masters nodes in both subjects, the two hemispheres slowly rotate toward each other, eventually fusing into a complete brain shape — visualizing the literal merging of left + right brain. The animation is a long-running cinematic experience, not a one-time event — early on, the hemispheres are far apart; late in the prep journey they're fully merged.
- **Star states:** nodes render as stars whose brightness, size, and "twinkle" reflect status:
  - Locked: dim + still
  - Available: brighter + slow pulse
  - In-progress: brighter still + active pulse
  - Mastered: bright + steady glow + small constellation marker overlaid
- **Camera controls:**
  - Smooth rotation (orbit), zoom, pan via mouse + touch gestures
  - Auto-centered on the recommended next node when idle for >5 seconds
  - Subtle parallax response to mouse movement (already partly in existing 2D version)
- **Functional sidebar (critical):** a left or bottom sidebar that lists skill nodes by category, with quick-access search and direct click-to-open. This makes the 3D the _feature_, not the cost — students who want efficiency use the sidebar, students who want immersion use the 3D. The sidebar is always 1-click away from any node.
- **Reduced-motion fallback:** respects `prefers-reduced-motion` (browser setting). Replaces 3D with a static 2D constellation view + the sidebar. Same data, less animation. Accessible by default.
- **Click interaction:** clicking a star opens the existing node detail card. Clicking empty space rotates the camera. Touch-friendly gestures on mobile (drag to rotate, pinch to zoom, tap to select).
- **Onboarding overlay:** first-time visitors get a 5-second guided tour of the controls — "drag to look around, click a star to start learning, use the sidebar if you want to skip the journey".
- **Mobile-specific affordances:** simplified rendering on mobile (fewer stars visible at once, less polygon density), prominent sidebar trigger (the 3D is for fun but the sidebar is for productivity on a phone)

**How it works:** The 3D brain is the visual centerpiece — the most-shared moment of the product, the screenshot that ends up in marketing material, the visual that people remember. But it never blocks productivity: the sidebar gives 2-click access to any node, the search finds nodes by name, the recommended-next-node always has a clear path. The 3D is for delight; the sidebar is for work.

**Why it matters:** The current /learn is the single most-cited "AI slop" surface in the app. The 3D brain is the differentiator that turns the Learn page from "another grid of cards" into a signature visual moment. AND — by keeping the sidebar functional — avoids the trap of "pretty but unusable" that kills most ambitious visualizations.

**Dependencies:** #1 (design language sets the visual treatment for the 3D — color palette, motion vocabulary), #3 (mobile performance target), #7 (UI redesign coordinates with the 3D entry point), all the existing curriculum data + status logic (already built).

**Framework set when:** /learn opens to a 3D brain rendering at 60fps on mobile. Sidebar provides ≤2-click access to any node. Reduced-motion users see the 2D fallback. Click interaction works on touch + mouse. The hemisphere-merge animation triggers correctly based on student progress across both subjects.

**Continues post-launch:** Visual refinements, performance optimization as the user base grows, potentially adding new "constellations" if curriculum expands (e.g. ACT, AP).

---

## 18. Tutor operations program

**What it is:** The complete supply-side infrastructure of a tutoring marketplace — recruitment, vetting, onboarding, training, quality measurement, and compensation. Currently runs on "Zakaria knows a few people"; this scales it to a real tutor workforce.

**What's included:**

- **Public tutor application page:** clean career-page-style surface at `/careers/tutor`. Application form covers credentials, SAT score history, teaching experience, availability, expected compensation, why they want to tutor.
- **Vetting workflow (sequential gates):**
  1. Application review (resume + cover letter quality check)
  2. Background check (via Checkr or similar — important for working with minors)
  3. SAT verification (official score report required — must be 1500+ to demonstrate subject mastery)
  4. Subject matter assessment (sample questions to verify they can solve + explain at high accuracy)
  5. Mock teaching session (recorded — evaluated on explanation clarity, warmth, pedagogical approach by an experienced tutor or admin)
  6. Final interview (culture fit, expectations, logistics)
- **Onboarding sequence:** for accepted tutors —
  - Cal account creation + integration
  - Stripe Connect onboarding
  - Profile setup (photo, bio, teaching philosophy)
  - Training curriculum completion (see below)
  - First cohort assignment + first 1:1 student match
  - Buddy/mentor pairing with an experienced tutor for the first 30 days
- **Training curriculum:** a structured tutor training program covering:
  - Karman's pedagogical philosophy (concept mastery before practice, learn-do-review loop)
  - The platform mechanics (every tool a tutor uses, including the new ML question gen from #16)
  - Common student challenges + responses (typical stuck points + how to unstick)
  - Escalation procedures (when to involve admin, when to flag for moderation, when to recommend a tier change)
  - Code of conduct (boundaries, communication standards, FERPA compliance)
  - Completion certified before first paid session
- **Quality metrics dashboard (tutor-facing):** each tutor sees their own metrics:
  - Average student SAT improvement (their cohort vs platform average)
  - Student NPS (post-session survey)
  - Attendance rate (their attendance + their students' attendance)
  - Response time (to student messages)
  - Rebook rate (how often students request another session with them)
  - Transparency drives self-improvement
- **Quality metrics dashboard (admin-facing):** aggregate tutor performance:
  - Identifies top performers (for spotlight, raises, lead tutor opportunities)
  - Identifies struggling tutors (for support, additional training, or off-boarding)
  - Tracks tutor retention + replacement rate
  - Tutor capacity utilization
- **Compensation modeling tool:** prospective tutors can input their availability + tier preferences and see expected monthly earnings. Helps with recruitment; sets realistic expectations.
- **Tutor community:** private Slack or Discord channel for tutors. Best practices sharing. Peer support. Karman-hosted monthly tutor town halls.
- **Performance review cycle:** quarterly tutor reviews — feedback (both directions), goal-setting, compensation adjustments, career path discussion (lead tutor track, content contributor track, etc.)
- **Tutor offboarding playbook:** when a tutor leaves (voluntarily or otherwise), students are smoothly transitioned — handoff calls, transition notes, continuity for the student's prep plan

**How it works:** Karman becomes a real two-sided marketplace. Tutors apply → are vetted → trained → matched → measured → developed. The supply side has its own product experience. Quality is measurable, not vibes-based. Compensation is transparent. The tutor workforce grows or contracts based on demand without breaking the experience for either side.

**Why it matters:** Karman is fundamentally a marketplace. Without a real supply side, the cap is "however many tutors Zakaria knows personally." With it, the platform can scale linearly with demand. Plus: tutor quality is what drives student outcomes (#9), which drives marketing (#12), which drives growth. A tutor program isn't ancillary — it's core to the product working.

**Dependencies:** #1 (tutor UI design language), #9 (outcomes feed quality metrics), #13 (tutor support tier), #16 (tutor uses ML question gen), existing tutor portal infrastructure (already partially built).

**Framework set when:** Public application page live. Vetting workflow operational + tested with mock applications. Training curriculum exists + new tutors complete it before first paid session. Quality dashboards live for both tutor + admin views. Compensation model documented + transparent. Off-boarding playbook tested.

**Continues post-launch:** Yes — recruitment ongoing, training refined based on tutor outcomes + student feedback, performance reviews scheduled quarterly, marketplace dynamics tuned as supply/demand evolves.

---

## How this document is meant to be used

- Read top-to-bottom once for the full picture
- Reference individual project sections when starting that project
- Update "Framework set when" criteria as you ship — these are the concrete completion bars
- Don't treat the start order as locked — if you learn something that re-orders priorities, change it. The dependencies between projects are the only rigid constraints (e.g. #1 must precede #7).
- Several projects continue evolving after launch. That's by design — "framework set" doesn't mean "done forever", it means "the foundation is in place + iteration is now the mode".

## Related documents

- [docs/feature-inventory.md](./feature-inventory.md) — current state of what's built (post-2026-05-16 audit cleanup)
- [docs/audit-2026-05-15.md](./audit-2026-05-15.md) — the audit that triggered the cleanup batch
- [docs/architecture.md](./architecture.md) — system map + data flows
- [docs/adr/](./adr/) — architecture decisions per item should land here as they're made
- [CLAUDE.md](../CLAUDE.md) — repo defaults, testing layers, dev commands
