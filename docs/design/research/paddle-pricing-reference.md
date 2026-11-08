# Pricing page reference: Paddle Billing starter kit

The founder sent `paddle-billing-starter-v1.zip` on 2026-11-01 and asked for it to be
used as heavy inspiration for Karman's pricing page. It is Paddle's Next.js starter
(Apache-2.0, so code may be ported with attribution). Unpacked for reading only;
nothing from it was installed or run.

What it shows: a dark pricing page ("Simple pricing. Easy setup."), a Monthly / Annual
segmented control, price cards, a checkout page with line items, tax and totals, and a
signed-in subscription page (next payment, payment method, payment history, line items).

## Founder decision (2026-11-01, later the same day)

"You can put three tier cards (including free) and use the design elements in the page
ignoring the strict rules." So the pricing page follows the starter closely:

1. **Three tier cards in a row: Free, Platform, Plus**, with the segmented control above
   them. A second view of the control shows the tutor plans (the cohort and Private) in
   the same card design; School stays a line under the cards.
2. **The starter's design elements are allowed here:** the soft glow behind the
   featured card, the faint grid background, grain, frosted cards, the fading gradient
   card border, a "most popular" badge, and an icon per feature line. Use Karman's
   palette (marigold and pine, not Paddle's yellow-green) and Karman's own drawn icons,
   not Lucide.
3. **Still required:** AA contrast in light and dark (the starter is dark only; build
   the light version too), no overlap, no sideways scroll, prices and claims only from
   `offer.ts`, copy rules (so not the two-beat "Simple pricing. Easy setup."), and one
   clearly highlighted button per screen, on the featured card.

The original analysis follows; where it says "change these", the decision above wins.

## Take these

1. **A short, big headline and almost nothing else above the cards.** Two lines at
   about 64 px, one supporting line. (Karman's copy rules ban the two-beat
   "Simple X. Easy Y." pattern, so write one specific line instead.)
2. **One segmented control above the cards that changes every price at once.** For
   Karman it switches audience, not billing period: **On your own** (Platform, Plus) and
   **With a tutor** (the cohort, Private). Free practice and School stay as plain lines
   under the cards (the free test is never a pricing card). This keeps each view at two
   cards, never three (rules 6 and 17).
3. **Huge price numerals.** 80 px figures with a 12 px suffix ("a month", "for the
   cohort"). When the control changes, the numbers roll to the new values (one short
   roll, about 400 ms) so the eye lands on the price.
4. **The card's anatomy, in this order:** plan name (with Karman's own drawn icon),
   price, suffix, a hairline, one sentence on who it is for, the button, then what is
   included. Every price and line comes from `src/lib/marketing/offer.ts`.
5. **A "most popular" style marker on one card**, rule-safe: the featured card sits on a
   solid colour block (marigold or pine) instead of a glow, so it stands out by colour
   (Von Restorff) and holds the one highlighted button on screen (rule 35). The other
   card's button is a plain or outline link.
6. **Skeletons while prices load** (rule 29), at the exact size of the numerals.
7. **The checkout and subscription screens** are a model for Karman's own checkout and
   the portals' billing pages later: line items, tax, total, next payment with its date,
   payment method, payment history with a state per row.

## Change these to fit Karman's rules

| In the starter | Karman version | Rule |
|---|---|---|
| Three cards in a row | Two cards per view, switched by the control | 6, 17 |
| Radial glow behind the featured card, blur and grain layers | A solid colour block for the featured card | 1, 21 |
| Grid-line background | Plain bone or ink ground | 22 |
| Frosted cards (`backdrop-blur`) | Solid surfaces | 8 |
| Lucide circle-check icons on every feature | Plain rows with hairlines, or Karman's own drawn marks | 2, 16 |
| "Get started" on every card | One highlighted button per screen, the rest text links | 35 |
| Dark only | Light and dark following the device | 33 |
| Fading gradient card border | A plain hairline | 1 |

## Not taken

Paddle.js, Supabase, the auth flow and the webhook code: Karman's checkout runs on
Stripe and Clerk. Only the page design and its structure are used.
