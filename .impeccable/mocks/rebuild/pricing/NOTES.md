# Pricing: notes

Serve: `node .impeccable/mocks/serve-mocks.mjs 8874`, open
http://127.0.0.1:8874/rebuild/pricing/index.html (`?view=tutor` opens on the tutor plans).

The idea: the Paddle Billing starter kit's pricing page, close to the letter, in Karman's colours.
The founder allowed its design elements and three cards including Free on this page
(`docs/design/research/paddle-pricing-reference.md`, 2026-11-01).

## What is on the page

1. **Floating pill nav** (as `../numbers`): Plans, Compare, Guarantee, Questions, theme icon. No
   button in the nav, so the featured card's button is the one highlighted button on the first screen.
2. **Hero:** "From 100 free questions to 20 hours with a tutor." (two lines at 1440), one support
   line, then the control: **On your own** (Free, Platform, Plus) / **With a tutor** (March program,
   Private 10, Private 20).
3. **Three cards in a row** (stacked under 1040 px, max 520 px wide), the starter's anatomy: drawn
   icon and name, badge on the featured card, 80 px price (64 px on phones) with a small suffix,
   hairline, who it is for, the button, the features with a drawn mark per line. Frosted card
   (ground at 72 to 74 %, 6 px blur), the starter's fading gradient border, its featured-card light
   (line, hard blur, column, band) and a soft field behind the featured card, all marigold and pine.
   Subgrid lines up name, price, button and list across the row.
   - On your own: Plus is featured, badge **"Most complete"** (see questions).
   - With a tutor: the March program is featured, badge **"Founding price"** ($995 is the March
     founding price; the suffix says "then $1,295").
   - The guarantee line (with a seal) is only on the March program and Private 20.
   - School is one line under the cards: $10 per student a year, July to June, the free pilot, and
     "Ask about a school license" (email).
4. **Product moment:** a pine stage, the iPhone 17 Pro Max (`../../motion/device`) playing the 12 s
   tour clip cropped to its screen (night renders in dark mode, pine renders in light mode).
5. **Comparison table** that follows the control: 10 rows for the practice plans, 6 for the tutor
   plans; the featured column is tinted.
6. **Guarantee** on a clay stage: the three outcomes from `GUARANTEE.outcomes`, the Private 20
   remedy, the conditions in one paragraph, and "Read the full guarantee".
7. **FAQ accordion**, 6 questions, answers only from `offer.ts` and the plan ladder.
8. **Close:** the free practice test, the one marigold button on that screen.
9. **Footer card** with the cropped wordmark, Terms, Privacy, Cookies, email, theme switch, Pause motion.

## Motion (GSAP 3.12.5 from cdnjs, pinned with SRI)

- Load: headline, line and control rise 0.08 s apart; the three cards rise in order 0.1 s apart
  (0.8 s, `power3.out`); prices roll in.
- Switch: card text fades out 0.14 s and back in 0.3 s; each price rolls (old figure up and out,
  new one rolls up character by character, right to left, 0.03 s apart, 0.6 s); the pill slides
  0.25 s; the glow moves with the featured card.
- The featured glow breathes over 7 s each way (opacity 0.72 to 1, scale 0.96 to 1.04).
- The clip plays only while the phone is in view.
- Reduced motion or "Pause motion": nothing rises or rolls, prices are final at once, the glow is
  still, the phone shows the poster only.

## Sources for every figure

| Shown | Source |
| --- | --- |
| Free $0, 100 questions; Platform $29, 500; Plus $49, all | `PRACTICE_PLANS` |
| "a month, until you cancel" | plan ladder: "billed plain monthly, until the family cancels" |
| Feature lines per practice plan | plan ladder bundle table (calculator not in Free) |
| March program $995, then $1,295, 9 weeks, January 4, 18 classes, up to six, five tests with two proctored live, weekly session, cohort chat, weekly parent updates | `MARCH_PROGRAM` |
| Private 10 $1,495 / Private 20 $2,495, 60-minute sessions, no fixed slot, platform, weekly session, parent note | `PRIVATE_PACKAGES`, `PRIVATE_INCLUDES` |
| Guarantee +100 or 1450, outcomes, conditions, Private 20 remedy | `GUARANTEE` |
| School $10, July to June, pilot | `SCHOOL_PLAN` |
| Installments 3 x $345, $100 refundable deposit | `MARCH_PROGRAM.installments`, `depositAmount`, `ENROLL_LINKS` comment |
| Scholarship, intake note | `SCHOLARSHIP`, `INTAKE_NOTE` |
| Free test date, time, length, Zoom, predicted score, 20-minute call | `FREE_PRACTICE_TEST` |

## Checks (2026-11-02, Playwright 1.60 from the repo, shots in the scratchpad `r2-pricing/`)

- **Shots:** 375x812, 440x956, 834x1194, 1440x900, light and dark, both control states: 16 runs,
  a first-screen shot and a full-page shot each (32 PNGs). Looked at against the starter's `hero.png`.
- **Sideways scroll:** 0 px in all 16 runs. (The first run found 87 px at 375 and 104 px at 440:
  the glow behind the featured card spread past the edge. Fixed by clipping the plans section on x.)
- **Overlap:** text boxes (one per text line) checked against each other on the whole page: 0 hits
  in all 16 runs.
- **One highlighted button per screen:** at every 200 px step, at most 1 in all 16 runs.
- **Console errors and failed requests:** 0 in all runs.
- **Contrast, calculated from pixels:** text made transparent, the page shot, and every text line's
  colour compared with every third pixel under it (so frosted cards over the glow, the grid, grain
  and the field are all measured as rendered, glow at full strength). 2,200 text lines over 16
  runs, **0 below AA**. Lowest small text: the unselected control label, dark 4.99:1 (`#b4b0a8`
  on the pine field), light 4.78:1 (`#57554f` on the field). Card text on the frosted cards and the
  badges all measured higher. The first pass found the dark control label at 4.49:1; fixed by
  raising dark secondary ink from `#a8a49c` to `#b4b0a8` and light marigold ink to `#7a4f07`.
- **Clicks: 67 of 67 passed** (375 and 1440): both control tabs (prices, rolled numerals,
  featured card, guarantee lines only on the March program and Private 20, table headers, pill on
  the tab within 1.5 px), ArrowLeft, Home, End; the three card buttons with only Plus highlighted;
  theme icon (remembered after reload); footer Auto / Light / Dark; all 6 FAQ rows open one at a time
  and close; the 4 nav links (desktop) and the phone menu (open, each link, Escape); the clip plays
  in view and Pause motion stops it.
- **Reduced motion:** prices final at first paint, nothing hidden, the switch is instant, no video
  loaded (poster only), the glow is still.
- **Links:** program, private-tutoring, auth/sign-up, guarantee, free-practice-test, terms, privacy
  and the home page return 200. **`https://karmanprep.com/cookies` returns 404** (rule 32 needs it).
  The tour clip, poster and phone frame load from `../../motion/`.

## Not done

- Card buttons for Free, Platform and Plus go to `/auth/sign-up`; there is no plan-specific checkout
  link yet. The March button goes to `/program#apply`, Private to `/private-tutoring#call`.
- No skeleton loader (rule 29): prices are static in this mock. The live page should show
  numeral-sized skeletons if prices come from Stripe.
- The FAQPage JSON-LD is written by `pricing.js` from `copy.js`; the live page should render it on
  the server.
- The phone clip shows a cohort student's Home and Classes; there is no Platform-only clip yet.
