# Karman Prep — Roadmap to Launch

**Last updated:** 2026-05-16
**Launch target:** November 2026
**Author pace assumption:** ~60 hrs/week (8 hrs weekdays + 10 hrs weekends), Claude Code aggressively used

> The post-2026-05-15 audit cleanup is essentially done. The 3 launch-blocking critical issues from the inventory are resolved (see [docs/feature-inventory.md](./feature-inventory.md)). This doc is where the next 6 months of work goes.

---

## TL;DR

- 18 mega-projects ahead. None is "one PR" — each is multi-week.
- At your actual pace + AI tooling, **all 18 are doable before Nov 2026 launch**, with months of polish + real-user iteration time left over.
- **Four items don't compress with hours**: content (#13), legal review for compliance (#15), SEO ranking (#18), and real-user iteration loops.
- **Biggest risk isn't the timeline — it's burnout.** 60 hrs/week for 6 straight months is a sustainability problem. Build a "every fourth weekend off" cadence now, not in month 5.

---

## Sequencing — 5 phases

Items are listed in suggested execution order within each phase. Most phases allow 2-3 items to run in parallel given your throughput.

| Phase                          | Weeks | What lands                                                                                                                                           | Goal                                                                            |
| ------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **0 — Foundation**             | 1-3   | #1 design language → #2 IA → #3 mobile constraint baked in; #4 compliance lawyer engaged; #5 analytics taxonomy locked; #6 content vendor identified | Everything downstream depends on these. Cheap to do now, expensive to retrofit. |
| **1 — Pre-launch existential** | 3-10  | #7 UI redesign (top-funnel surfaces) + #8 security audit + #9 outcomes engine + #10 mock SAT + #11 SEO foundation                                    | The conversion-critical path. Without these, launch is silent.                  |
| **2 — Growth + scale**         | 10-16 | #12 UI redesign (remaining surfaces) + #13 growth engine + #14 customer support + #15 parent layer + #16 engagement system                           | What turns first users into paying renewing users.                              |
| **3 — Pre-launch polish**      | 16-24 | #17 ML question gen v1 + #18 Learn 3D brain + tutor ops Phase 1 + real-user iteration                                                                | The differentiators. Polish window.                                             |
| **4 — Post-launch**            | 24+   | SEO big push, ML question gen v2, tutor ops scale, content fill-out, observability iteration                                                         | Compound returns from real-user data.                                           |

---

## Phase 0 — Foundation (weeks 1-3)

### 1. Design language

- **Scope:** Typography scale + color palette + spacing scale + motion vocabulary + icon system + component library (buttons, cards, forms, modals, tables) + Tailwind config updates. Logo variants for header / footer / favicon / OG / loading states.
- **Why first:** every other visual project depends on this. Skipping it means redoing every surface twice.
- **Estimate:** 1-2 weeks at your pace.
- **Dependencies:** none. Start immediately.
- **Done when:** the design language exists as a Figma file + a working `tailwind.config.ts` + a component library at `/storybook` or equivalent. A new page can be built by composing existing tokens, not inventing them.

### 2. Information architecture (page connectivity / navigation)

- **Scope:** Audit current navigation graph. Identify dead-ends + orphan pages. Redesign the global nav components (header, footer, in-app sidebar, breadcrumbs). Spec how every page links to every other page that matters.
- **Why second:** the IA decision constrains the visual redesign. New visuals lock in whatever link structure exists when you start.
- **Estimate:** 1-2 weeks.
- **Dependencies:** #1 (uses the new component library).
- **Done when:** the user can get from any page to any other relevant page in ≤2 clicks. No URL-bar-editing required.

### 3. Mobile-first commitment

- **Scope:** Not a standalone project — a _constraint_ on #1, #2, #7, #18. Bake "mobile first" into every design decision from this phase forward. Use the existing Pixel 7 + iPhone 14 viewport coverage in the visual harness as your measurement floor.
- **Why:** most students encounter the site on mobile first. Treating mobile as a retrofit after desktop is how products end up feeling like "shrunk-down web apps".
- **Estimate:** zero net hours if treated as a constraint; +4-6 weeks if treated as a retrofit project after #7.
- **Dependencies:** decision made before #1 starts.
- **Done when:** every screen in the design system has a 375px mobile spec, not just an 1440px desktop spec.

### 4. Compliance program — kickoff

- **Scope (kickoff only):** Engage a lawyer for FERPA + COPPA + state privacy law review. Draft policy v1 in parallel. The full compliance program ships throughout the next 6 weeks; kickoff is just "lawyer engaged, draft started" so the wall-clock for legal review doesn't bottleneck.
- **Why first:** legal review takes 1-2 weeks of wall-clock per pass. Starting late means scrambling at month 5.
- **Estimate:** 1 day to engage; legal turnaround drives the full program (~4-6 weeks calendar).
- **Dependencies:** none.
- **Done when (kickoff):** lawyer retained, policy draft v1 in their hands.

### 5. Analytics taxonomy

- **Scope (taxonomy only):** Define the canonical event set every feature emits. `quiz_completed`, `lesson_opened`, `video_watched`, `booking_made`, `message_sent`, `payment_succeeded`, etc. Document required properties per event. Pick the warehouse target (PostHog if you want cheap + opinionated; ClickHouse + a dashboarding layer if you want flexible).
- **Why first:** every new feature should emit telemetry from day one. Adding it later means rewriting feature code.
- **Estimate:** 3-5 days.
- **Dependencies:** none.
- **Done when:** `docs/analytics-events.md` exists, lists every event with properties + when it fires, and a thin `track(event, props)` helper is in `src/lib/analytics/` ready to be called.

### 6. Content production — vendor selection

- **Scope (vendor selection only):** This is your biggest wall-clock risk for launch. Get 1-2 SAT-knowledgeable content producers / video editors lined up _now_. They'll work in parallel with you throughout the next 5 months. Spec the format (5-min explainer videos, textbook entries 500-1000 words). Identify the first 10 highest-traffic nodes to start with.
- **Why first:** 100 video lessons + 100 textbook entries solo is months of wall-clock no matter your dev pace. Outsourcing turns wall-clock into money.
- **Estimate:** 1 week to identify + contract producers.
- **Dependencies:** none.
- **Done when:** contracted vendor(s) + spec'd first 10-node batch + delivery schedule.

---

## Phase 1 — Pre-launch existential (weeks 3-10)

### 7. UI redesign — top-funnel surfaces

- **Scope:** Landing, sign-up, onboarding flow, /learn entry, /diagnostic, /billing, /coming-soon. The conversion-critical path. Apply the design language from #1; respect the mobile-first constraint from #3.
- **Why critical:** if a visitor doesn't make it through the top funnel, nothing else matters.
- **Estimate:** 4-6 weeks. Heavier than other items because every surface here needs care.
- **Dependencies:** #1 (design language locked), #2 (IA locked), #3 (mobile constraint).
- **Done when:** all named surfaces above are rebuilt against the new design language and pass the visual regression suite + axe a11y scan with zero violations.

### 8. Security audit pass

- **Scope:** RLS coverage audit (every table has correct policies; service-role bypass paths documented). Rate limiting on auth-adjacent endpoints. Secret rotation playbook. Clerk session hardening (max session lifetime, refresh tokens). Input validation completeness sweep — every API route Zod-validates.
- **Why:** Karman handles student data + payment info. Pre-launch is when you bake security in.
- **Estimate:** 2-4 weeks.
- **Dependencies:** none — can run alongside #7.
- **Done when:** `docs/security-audit-2026-Q3.md` exists with each surface marked ✓ or with a remediation PR linked.

### 9. Outcomes engine + score guarantee operationalization

- **Scope:** Ingest pre/post SAT scores (official report upload + self-reported). Match to student accounts. Automate "does this student qualify for the 50-point refund" workflow. Build an outcomes dashboard for admins. Generate marketing-ready aggregated stats ("87% of students improved by 100+ points").
- **Why critical:** the 50-pt guarantee is a stated promise with no machinery underneath. Also: the outcomes data is the most credible marketing asset you'll ever have.
- **Estimate:** 2-4 weeks.
- **Dependencies:** #5 (analytics taxonomy — outcomes events flow through it).
- **Done when:** a tutor can ask "did Jane qualify for the guarantee" and see a deterministic yes/no with the math. Aggregate dashboards exist for admin review.

### 10. Mock full-length SAT

- **Scope:** 2h14m timed practice test mirroring Bluebook UI. Real adaptive section logic. Score prediction with confidence band. Results screen with weak-domain breakdown. Available to non-paying visitors as a lead magnet.
- **Why critical:** top conversion hook in the SAT prep market. Khan Academy's free mock drives huge volume to paid offerings.
- **Estimate:** 2-3 weeks at your pace.
- **Dependencies:** #1 (design language), #5 (telemetry on test completion).
- **Done when:** a visitor without an account can take a full SAT and get a predicted score with confidence band. The CTA to sign up post-test is compelling.

### 11. SEO foundation

- **Scope:** Meta descriptions per page. Sitemap. Robots.txt. Structured data (JSON-LD for courses + organization + reviews). OG images per route. Canonical URLs. Core Web Vitals (LCP, FID, CLS) under threshold.
- **Why:** the big SEO push waits till the end of the project, but the foundation is cheap and needed for any ranking to happen.
- **Estimate:** 1-2 weeks.
- **Dependencies:** #2 (IA — URL structure must be finalized).
- **Done when:** Google Search Console + Lighthouse SEO scores are 90+ across every public page.

---

## Phase 2 — Growth + scale (weeks 10-16)

### 12. UI redesign — remaining surfaces

- **Scope:** Admin console (8 pages), tutor portal (6 pages), parent portal (2 pages), deeper student surfaces (chat, progress, mastered, schedule), all error/empty/loading states. Less visible than top-funnel but still needs the design language treatment.
- **Estimate:** 4-6 weeks.
- **Dependencies:** #7 (top-funnel design patterns established + battle-tested).
- **Done when:** every page in the app uses the design language + components from #1.

### 13. Growth engine

- **Scope:** Referral program (student → student bonus, tracking infra, payout flow). Affiliate partnership infra (UTM-tagged links, attribution reporting, partner dashboards). Lifecycle email/SMS sequences (welcome, week-1 nudge, mid-prep check-in, pre-test pump-up). Content marketing blog v1 (5 cornerstone articles).
- **Estimate:** 4-6 weeks.
- **Dependencies:** #5 (analytics for attribution + funnel tracking), #11 (SEO foundation for blog).
- **Done when:** a current student can refer a friend with one click and both get a credit; lifecycle emails fire on schedule with measured open/click rates; blog has 5 SEO-quality articles indexed.

### 14. Customer support tooling

- **Scope:** Helpdesk integration (Intercom or Zendesk; or built-in for cost). In-app support widget on every authenticated page. FAQ knowledge base with search + auto-suggest. Ticket routing rules (parent → ops, tutor → admin, technical → eng). SLA tracking by tier (Elite gets <2hr response).
- **Why:** the moment you have paying users, support questions arrive. Going live without this means email-as-helpdesk, which scales to ~50 users before breaking.
- **Estimate:** 3-4 weeks.
- **Dependencies:** #1 (in-app widget needs design treatment).
- **Done when:** a student stuck on /billing can click "Get help" and either resolve via FAQ or open a ticket that lands in the right inbox with SLA tracking.

### 15. Parent engagement layer

- **Scope:** Weekly digest emails ("Mike practiced 3.5 hrs, mastered 2 concepts, here's the wall he's hitting"). Parent-tutor messaging (parents can DM tutors, not just see status). Milestone celebrations (completed first mock, mastered Algebra II, etc.) emailed + shareable. Parent-set goals visible to student.
- **Why:** parents pay; renewal correlates more with parent perceived value than student delight.
- **Estimate:** 3-4 weeks.
- **Dependencies:** #5 (telemetry source for the digest), #9 (outcomes for milestones).
- **Done when:** a parent receives a weekly digest with real practice/mastery stats and can message the tutor in two clicks.

### 16. Engagement / retention system

- **Scope:** Streaks (daily practice streak with shield/freeze mechanic). Daily nudges (push + email when streak at risk). Smart absence emails ("haven't seen you in 4 days — here's a 15-min mini-practice"). Cohort social proof ("Mike just hit a 1300!"). Milestone badges. Parent-visible progress reminders.
- **Why:** SAT prep dropoff between week 2 and week 8 is the industry-wide killer. This is the system that fights it.
- **Estimate:** 3-4 weeks for v1; expands iteratively after.
- **Dependencies:** #5 (events drive nudges), #15 (parent-visible component overlaps).
- **Done when:** a student who misses 2 days gets a contextual nudge, sees their streak status, and the dashboard surfaces "you're 3 days from a 30-day streak".

---

## Phase 3 — Pre-launch polish (weeks 16-24)

### 17. ML question generation (v1)

- **Scope (v1):** Prompt-engineered frontier model that generates SAT questions with tunable difficulty. Tutor-facing UI to tweak generated questions per student. Difficulty calibration loop (tutor rates → adjust prompt). Quality gate: generated questions go to admin review queue before being assigned.
- **Why pre-launch:** unlocks personalized homework. Every tutor can give every student questions tuned to their actual gap.
- **Estimate:** 2-3 weeks for v1.
- **Dependencies:** #1 + #12 (tutor UI needs design language), the existing question bank as training/reference data.
- **Done when:** a tutor can request "5 medium-difficulty Algebra II questions for Mike" and get them generated, reviewed, and assigned in under a minute. v2 (custom model training) is a post-launch project.

### 18. Learn page 3D brain

- **Scope:** Three.js / react-three-fiber rebuild of the constellation. Reading + math hemispheres that visually merge as the student progresses across both subjects. Functional sidebar for direct node access (don't force the 3D for navigation). Performance budget: 60fps on Pixel 7 + iPhone 14. Reduced-motion fallback.
- **Why:** the current /learn is the single most-cited "AI slop" surface. This is the signature visual.
- **Estimate:** 4-6 weeks.
- **Dependencies:** #1 (design language sets the visual language for the 3D), #3 (mobile performance target).
- **Done when:** /learn opens to a 3D brain rendering at 60fps on mobile, sidebar provides ≤2-click access to any node, reduced-motion users see a non-3D fallback.

---

## Phase 4 — Post-launch (week 24+)

### Post-launch streams (run after Nov 2026, ongoing)

- **Tutor operations program** — public application page, vetting workflow, training curriculum, quality metrics dashboard, compensation modeler. Becomes urgent when you cross ~10 tutors. 3-4 weeks of focused work at the right moment.
- **ML question gen v2** — train a custom model on your accumulated question + outcomes data. 1-2 months once you have 6+ months of real student/tutor data.
- **SEO big push** — content marketing scale-up, technical SEO refinement, backlink campaigns, schema markup expansion. 6+ months of wall-clock regardless of dev hours.
- **Outcomes data marketing flywheel** — every cohort that finishes generates score-improvement data. After 2-3 cohort cycles, the aggregate is your most powerful marketing asset.
- **Adjacent product expansion** — ACT, PSAT, college counseling. Year 2 conversations.

---

## What doesn't compress with hours

Even at 60 hrs/week, these have wall-clock floors:

1. **Content production (#6 vendor selection / Phase 4 fill-out)** — recording, editing, scripting. Outsource it.
2. **Legal review (#4 compliance)** — lawyer turnaround is 1-2 weeks per pass.
3. **SEO ranking** — Google needs months to crawl, index, build authority. You can ship the foundation in a week; ranking takes 6+ months wall-clock.
4. **Real-user iteration loops** — #9 outcomes, #16 engagement, #17 ML questions only get _good_ after watching real students/tutors. That feedback is gated by user volume.

---

## Sustainability

60 hrs/week × 26 weeks = 1,560 hours of focused work. That's a real toll.

- **Build a "every fourth weekend off" cadence now.** Not in month 5. The marginal day at month 5 is going to feel very different than today.
- **Outsource the things that aren't you-shaped.** Content production (#6). Legal review (#4). Logo polish work (#1). Customer support handling once tickets arrive (#14).
- **Watch for "while I'm here" scope creep on the design chain.** Most common timeline killer. Hard scope lock at the design language step.

---

## Where this lives

- This doc is the canonical roadmap. Update it as items ship.
- The 30+ smaller audit items already done are in [docs/audit-2026-05-15.md](./audit-2026-05-15.md).
- The current feature inventory (what's already built) is in [docs/feature-inventory.md](./feature-inventory.md).
- Architecture decisions per item should land in [docs/adr/](./adr/) as they're made.
