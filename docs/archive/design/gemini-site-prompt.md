# Gemini prompt: the whole Karman site, except the logo

Paste everything inside the block into Gemini (Canvas works best for a page you
can see). Facts come from `src/lib/marketing/offer.ts` and the rules from
`docs/design-rules.md`, as of 2026-10-21.

```
You are the design director and front-end developer for Karman Prep. Design and build the website as working HTML, CSS and JavaScript in one file per page. Use a simple placeholder square where the logo goes; the logo is being designed separately.

THE COMPANY
Karman Prep is a premium SAT prep company for well-off families. The buyer is the parent; the user is a 16 or 17 year old student. Karman is a company, not a personal tutor's site: copy speaks as Karman, never in the first person, and never names the founder outside the About page.
The name comes from the Karman line, the boundary 100 km up where the sky ends and space begins: the line you rise past. Let that idea shape the mood (horizons, altitude, calm ascent) without literal rockets or space clichés.

WHAT IT SELLS (use these facts exactly; invent nothing)
1. The SAT Program: a live cohort that ends on one SAT test date.
   - Up to six students per cohort: five paid seats and one scholarship seat, free for a student whose family can't afford it.
   - Nine weeks, two live 90-minute classes a week on Zoom, Tuesdays and Thursdays 7:00 to 8:30 p.m. ET (18 classes).
   - Five full-length practice tests. The week-1 baseline and the dress rehearsal a week before the SAT are official Bluebook tests, proctored live.
   - A 60-minute one-on-one after every full-length test: the tutor goes through every mistake.
   - A weekly live session on test mechanics (pacing, Desmos, the adaptive second module) and skill workshops.
   - Daily 10: ten minutes a day; every missed question comes back after 2, 7 and 21 days.
   - 10,000+ original practice questions across all 39 SAT skills.
   - A cohort group chat answered by a Karman tutor every day.
   - Weekly updates for parents: practice time, attendance, test scores and what's next.
   - Cohorts: March 6, 2027 SAT (starts Monday, January 4; enrollment closes Wednesday, December 30, 2026); May 1, 2027 SAT (starts Monday, March 1); June 5, 2027 SAT (starts Monday, April 5).
   - Price: $995 for the founding March cohort, $1,295 after that. Admission is by application: apply, a 20-minute call, then a $100 refundable deposit.
   - Guarantee: if the official score isn't at least 50 points above the proctored baseline, the next cohort is free. The student must attend at least 80% of classes and every 1:1, complete all five practice tests and the weekly practice, sit the SAT on the program's date, and send the official score report within 30 days.
   - Honest intake note: if a student already scores 1500+ or the test is under four weeks away, Karman says a program probably isn't the best use of the money.
2. Private tutoring: weekly 60-minute one-on-one sessions with a Karman tutor on Zoom, planned backward from the student's test date, start any time. Private 10 is 10 hours for $1,450; Private 20 is 20 hours for $2,900. Includes everything on the platform, the weekly live session, and a note to parents after every session.
3. Free entry points:
   - A free proctored practice test, live on Zoom, monthly; next one Saturday, December 12, 2026 at 10:00 a.m. ET, about 75 minutes, 49 questions (one Reading and Writing module, one Math module). Includes an estimated score range, a domain-by-domain breakdown and a 20-minute results call with a Karman tutor.
   - A free Daily Question and a free word game.
Track record (show only with this exact label beside it): +285 points on average (1235 to 1520), 94% reached their target. Label: "Karman 1:1 tutoring, median 16 weeks". Never imply these came from the cohort.

PAGES TO BUILD
Public: Home, The SAT Program (with one page per test date), Private tutoring, Free practice test, Daily Question, Pricing, How it works (the method), About (the only page that introduces the founder), FAQ, Apply, Contact, Terms of Service, Privacy Policy, Cookie Policy.
Portals (signed-in): Student (today's Daily 10 and Daily Question, next class, practice tests, missed questions coming back, cohort chat), Parent (the weekly update, attendance, practice time, test scores, upcoming dates, messages), Tutor (today's sessions with each student's test date, the next student's recent missed questions, notes to parents). Each portal opens with a 3-second welcome built from the person's own data that ends on their first real action, and a short greeting line chosen by time of day (for example "Good morning, Ava" or "Class tonight at 7, Ava").

HOMEPAGE STORY (one idea per section)
1. Hero: a muted, full-screen film of one weekday across six students (bus at dawn, music wing at lunch, the bench at practice, an internship break, the live class at dusk, a 1:1 at night), each with a small caption like "Ava, 6:50 a.m., Daily 10". H1: "SAT prep with live classes, daily practice, 1:1 review". One button: Take the free practice test.
2. The 1:1 review after every full-length test, with the track record and its label.
3. The tools, all live, as a list with a real product screen for each (not icons).
4. What happens to a missed question (the 2, 7, 21 day return), shown as a real screen.
5. How the nine weeks run.
6. Two ways to work with Karman: the Program and Private tutoring, each linking to its page.
7. Try today's SAT question, free (a working question with real feedback).
8. Questions parents ask (prices first appear here).
9. Close: start with a free practice test.

LOOK AND FEEL
Calm, established, premium; a respected institution with a modern edge. Editorial and generous with space.
- Dark mode is the default on every device; a visible toggle switches to light and is remembered. Every text colour meets WCAG AA in both modes.
- Palette: night navy #15202e and bone #f1f1ee as the two grounds. Program green #1e5b4b, private-tutoring oxblood #7b2d35 and free ochre #85570c mark the three paths; use the lighter tints #7cc4a5, #e3959c and #e2b867 on dark.
- Type: Source Serif 4 for headings, Hanken Grotesk for text. Never Inter, Geist or Space Grotesk.
- Motion: calm and physical. Ease cubic-bezier(.22,1,.36,1), durations 200 to 900ms, springs that settle without bounce, everything off under reduced motion. A short logo loader under about one second, once per visit.
- Photography: real-looking students first, then parents and tutors, focused and in real places, on phones and laptops; screens always show real Karman screens.

RULES (break none of them)
- Never: harsh gradients, Lucide icons, pure white backgrounds, rainbow or neon or pastel colours, drop shadows, three feature cards in a row, emojis, liquid glass, em dashes, coloured stripes on the edge of a card or button, bento grids, terminal windows, checkmark bullets, three pricing tiers, soft heavily rounded corners, purple and black, radial orbs, dot grids, sparkle icons, animated arrows, hover animations on everything, horizontal scrolling at any size.
- Exactly one highlighted button on screen at any moment; every other action is a plain text link. A floating button only appears when no other button is visible.
- Text never overlaps text, and no fixed or sticky element ever sits over text being read, at any scroll position or screen size.
- No before-and-after sliders, no scroll-driven bars or squares that fill up, no visible play or pause button on background film, no difficulty levels or skill maps on marketing pages.
- Show the actual product on every page, not icons. Skeleton loaders for loading states.
- No testimonials (none exist yet). No fake urgency. Scores as one Karman predicted score, never called official. Never present any question as an official SAT or College Board question.
- Footer links to Terms, Privacy and Cookie Policy. A consent banner only if a non-essential cookie is set, with Decline as easy as Accept.
- Every button, link and redirect goes somewhere real.

COPY RULES
Talk to one buyer, the parent. Specific headlines, no generic openers, one idea per section, one to three points per section, scannable, punchy. Lead with the benefit, then the feature. Every button has a clear verb and outcome. Handle the objection right before the button. Put the proof next to the claim. No "it's not X, it's Y", no "Less X. More Y.", no aphorisms.

SEO
One H1 per page with headings in order, a unique title and meta description, a canonical tag, alt text on every meaningful image, and JSON-LD for Organization, Course (each program), FAQPage and Event (the free practice test).

Start with the homepage, desktop and phone. Then wait for my notes before building the next page.
```

Follow-ups that work well in the same chat:

- "Now build the SAT Program page with the same system."
- "Show me the phone version at 390px wide."
- "Switch to light mode and check every text colour for contrast."
- "List every rule above that this page breaks, then fix them."
