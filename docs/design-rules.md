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

## Also required

- Every button, link and redirect works. A page ships only after its links and
  forms have been clicked through in a real browser.
- Mobile first. No horizontal overflow at 375px.
- Copy is plain and specific. Numbers come from `src/lib/marketing/offer.ts`.
- Design decisions are checked against screenshots, not only against code.
