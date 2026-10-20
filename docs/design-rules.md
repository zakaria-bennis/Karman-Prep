# Design rules

Set by the founder on 2026-10-18. These are the things that make a website look
AI-generated, so none of them appear on Karman. They replace the "Explicitly
NOT" section and the palette, type and motion rules in `docs/brand.md`. The
espresso-and-gold look is no longer required. Agents have room to design a new
visual identity, as long as every rule here is respected.

The calculator is excluded until the founder has reviewed it.

## Never do these

1. Harsh gradients.
2. Lucide icons.
3. Pure white backgrounds.
4. Rainbow coloring.
5. Drop shadows.
6. Three feature cards in a row.
7. Emojis.
8. Liquid glass.
9. Em dashes, in any copy.
10. Inter, Geist or Space Grotesk fonts.
11. Colored vertical stripes on the left or right edge of a button or card.
12. Fake testimonials. A testimonial may only appear if it is real and approved.
13. Bento grids.
14. Terminal windows.
15. The "it's not X, it's Y" sentence pattern.
16. Checkmark bullets.
17. Three pricing tiers.
18. A page with no real product demo. Show the actual product, not icons.
19. Soft, heavily rounded corners.
20. Purple and black color schemes.
21. Radial orbs.
22. Dot grids.
23. Sparkle icons.
24. Animated arrows.
25. Hover animations on everything. Hover feedback is limited to what a user needs.
26. Neon colors.
27. Basic pastel colors.
28. Horizontal scrolling, on any screen size.

## Always do these

29. Loading states use skeleton loaders.
30. A Terms of Service page exists and is linked from the footer.
31. A Privacy Policy page exists and is linked from the footer.
32. A Cookie Policy page exists and is linked from the footer (founder, 2026-10-19).
    If the site sets any non-essential cookie (analytics, ads, embedded video
    tracking), a consent banner asks first and declining is as easy as accepting.
33. Every page works in both light and dark mode (founder, 2026-10-19). Dark is
    the default on every device (founder, 2026-10-20); a visible toggle switches
    to light, and the choice is remembered. All text meets WCAG AA contrast (4.5:1, or 3:1 for large text)
    in both modes, checked by calculation, not by eye.

## Copy rules

Set by the founder on 2026-10-19. Every word on the website follows these.

1. No em dashes.
2. No fabricated claims.
3. Keep copy scannable.
4. Write specific headlines.
5. Leave out unnecessary information.
6. One idea per section.
7. Break up blocks of text.
8. The body supports the headline.
9. Above the fold sells.
10. One to three key points per section.
11. Punchy, not padded.
12. Every CTA has a clear verb and outcome.
13. Lead with the benefit, then the feature.
14. No generic openers.
15. Write for someone skimming.
16. No two-beat antithesis ("Less X. More Y.").
17. No aphorism formulas.
18. Talk to one buyer, the parent, not everyone.
19. Handle the objection right before the CTA.
20. Put the proof next to the claim.

## SEO requirements

Set by the founder on 2026-10-19. Every public page is built with these from
the start.

- `sitemap.xml` and `robots.txt` generated from the real public routes.
- No `noindex` on public pages. Portals, admin and auth stay out of the index.
- A canonical tag, a unique meta title and a unique meta description on every page.
- Exactly one H1 per page, and headings in order (H2 under H1, H3 under H2).
- Alt text on every meaningful image. Decorative images use empty alt.
- Schema markup (JSON-LD): Organization, Course for each program, FAQPage, Event
  for the free practice test.
- Internal links between related pages. No broken links.
- Compressed, correctly sized images (`next/image`, WebP or AVIF).
- Core Web Vitals in the green on mobile. Video and heavy motion never block the LCP.
- Mobile responsive. HTTPS forced.
- Short, readable URL slugs (`/programs/march-sat`, not `/p?id=3`).
- An Open Graph image for every page.
- `llms.txt` at the site root describing Karman for AI assistants.
- Google Search Console verified (the founder does this with his Google account).

## Also required

- Every button, link and redirect works. A page ships only after its links and
  forms have been clicked through in a real browser.
- Mobile first. No horizontal overflow at 375px.
- Copy is plain and specific. Numbers come from `src/lib/marketing/offer.ts`.
- Design decisions are checked against screenshots, not only against code.
