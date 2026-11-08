# Fix round (round 4) judge results, 1 Nov 2026

## judge — verdict promising — scores {'design': 6, 'usability': 6.5, 'creativity': 8, 'content': 7.5, 'overall': 6}

### Parent would buy
A parent landing cold understands within one screen that Karman is SAT prep for their child with ten morning questions, tutors in live classes and a weekly update, and the real question in the real engine makes the product concrete in a way no competitor's page does; the free test with a date, a proctor and 'no card needed' is the obvious next step and sits under the headline at every size. They would take the test; what would make them hesitate is the long empty stretch after the Daily 10 screen and, on pricing, the ticket that will not go away when their test date is not one of the three.

### Five seconds
Two solid cards on a dawn kitchen: "Ten SAT questions before the bus." with one marigold button on the left, a real math question with four answer buttons on the right (judge-c-bluebook-honest-r4/index-1440x900-dark-fold.png, index-440x956-light-fold.png). What it is (SAT prep for a parent's student), who it is for (the parent, "your student") and what to do (take the free test, or answer the question) all read inside five seconds at every size and in both modes.

### Top problems left
- Pricing: choosing 'Another date' leaves the June ticket and its marigold 'Apply for a seat' button on screen under the note saying cohorts do not run to that date, because .ticket's display:grid beats the hidden attribute (pricing-date3-1440-dark.png). The page's one live thing is broken on one of its four states.
- Home: the Daily 10 render at full width (1360px at 1440, edge to edge at 440) has its question in the top half and ~350px of empty engine panel plus the inert bottom bar below it, followed by 250 to 450px of ground before 'What every Karman student gets.' One whole screen reads as empty at both sizes (scroll-1440-dark-02-y1800.png, scroll-440-light-02-y1912.png). Crop the render to the question or show the phone render at desktop width in a fixed-height frame.
- Home: the tutors photo is a teacher alone in an empty classroom while its alt text describes a tutor at home on a video call; the alt belongs to p-private, not p-teacher (scroll-1440-dark-03-y2700.png). Also a weak match for 'Karman tutors teach every live class' and rule 46 (tutoring on Zoom).
- Home at phone width: the campus trio's side clips are 107px wide, faces unreadable, captions wrapping to two lines against the fixer's 'one-line captions' claim (scroll-440-light-06-y5736.png). Stack or enlarge under 760px.
- Home: 'Karman 1:1 tutoring, median 16 weeks' is still on the page twice (hero proof line and under the trio); each sits by a result so the rule is met, but the fixer's 'once' is wrong, and the hero proof repeats the 285-point record that the campus section states in full.
- Phones: after tapping A or B in the first-screen question at 440 the 'Right./Not this one.' line lands at y=1103, below the 956 fold; the parent sees the tint but not the words until they scroll (tapB-440-light resultTop 1103).

### Rule breaches left
- Rule 2 (no Lucide icons): the Daily 10 renders show the app's Lucide calculator, pen, highlighter, bookmark, sun, settings and menu icons on the marketing page (scroll-1440-dark-01-y900.png, daily-tab2-440-dark.png); defended as the engine as it is, but it is still on the page.
- Design-principles 5 (faces read at every screen size, phones get their own portrait crops): at 440 the Ava and Priya clips are 107x178 and their captions wrap to two lines (scroll-440-light-06-y5736.png).
- SEO/alt rule (alt text on every meaningful image): the tutors feature uses alt 'A tutor at home, mid-explanation to a student on a video call, one hand raised' for p-teacher.webp, which shows a teacher typing at a laptop in an empty classroom (scroll-1440-dark-03-y2700.png, scroll-440-light-03-y2868.png). A wrong caption for screen readers.
- Principles 1 (a screen with only background is a bug): at 1440 y=1800 the screen is the empty lower third of the Daily 10 render, its bottom bar and 450px of ground before the next heading (scroll-1440-dark-02-y1800.png, scroll-1440-light-02-y1800.png); the same at 440 y=1912.
- Principles 7 (every control works): on the pricing page 'Another date' sets hidden on the ticket but .ticket{display:grid} overrides it, so the note appears and the June $1,295 ticket with 'Apply for a seat' stays on screen (pricing-date3-1440-dark.png; computed display grid, hidden true).
- Rule 45 is met only through diagnostic originals, and the day film's 4:4:4 encoding will not play on iPhones (ffprobe), both outside this round.

### Fixes verified
- [x] Stacking sheets slide over the paragraph being read (rule 34) — stack.css/stack.js absent from the folder; four flat split sections in scroll-1440-dark-03/04/05 and scroll-440-light-03/04/05; overlap scan with smooth scroll disabled: 0 text-on-text hits and 0 under-header hits at 1440, 440 and 375 on both pages.
- [x] Hero text over the film fails AA on real frames — index-1440x900-dark-fold.png and -light-fold.png: words and panel each on a solid card; my own contrast pass found 0 text nodes left over the film and 0 under AA (home 134 elements, pricing 187, both modes).
- [x] Light mode opens dark — index-1440x900-light-fold.png, index-440x956-light-fold.png: off-white header and two off-white cards, film only around them; intro-1440-light-700ms.png shows the opening ground in bone.
- [x] Engine toolbar on the first screen, 12 to 14 inert controls — Mounted fragment has 4 visible controls (A, B, C, D), 0 visible SVGs, 0 visible Lucide classes, bar one row at 375/440 (engine-375-dark, engine-440-light logs; index-375x812-dark-fold.png).
- [x] Skill label truncated to Linear e... — 'Linear equations (one variable)' reads in full at 1440, 834, 440 and 375 (index-834x1194-light-fold.png, index-375x812-dark-fold.png); 0 elements with text-overflow clipping.
- [x] Choice D clipped under the 540px panel — Panel 720x487 at 1440, auto height; D bottom 701 inside slot bottom 733 (engine-1440-dark); index-1440x900-dark-fold.png shows A to D whole.
- [x] Check the answer control removed, tap grades with engine classes — tap-B-1440-dark.png: B takes border-error/bg-error, C takes border-success/bg-success with a check, 'Not this one. 3x = 21, so x = 7.' under the panel; second tap changes nothing; tap-C-440-light-result.png shows 'Right.' Note: on a 440 phone the result lands at y=1103, below the 956 fold, when A or
- [x] Stem is an H2 reading the KaTeX three times — No h2 inside the mounted engine; outline is H1 then section H2s and H3s only (engine-1440-dark headings list).
- [x] Phone calculator side tab over choice C in the Daily 10 phone render (could not) — scroll-440-light-02-y1912.png: the 'Calculator' side tab still sits over choice C's right edge in the phone render, as stated.
- [ ] Campus trio as three equal cards — At 1440 it is one large (593x988) and two smaller (356x593) with one-line captions (scroll-1440-dark-06-y5400.png). At 440 the side clips are 107x178 and the captions 'Ava, 1520, UC Berkeley' and 'Priya, 1540, Stanford' wrap to two lines (scroll-440-light-06-y5736.png; capLines 2), so 'one-line capt
- [ ] Karman 1:1 tutoring, median 16 weeks printed twice — It is still printed twice on the home page: in the hero proof line ('...285 points on average. Karman 1:1 tutoring, median 16 weeks.', index-1440x900-dark-fold.png) and under the trio (scroll-1440-dark-07-y6300.png). Each sits beside a result as rule 47 requires, but the claim 'once' is not true.
- [x] Comparison checkmarks and 1px dot — pricing-compare-open-1440-dark.png: the words Included (51) and Not included (27), 0 SVGs in the table; pricing-compare-open-440-light.png: one block per bundle, no sideways scroll.
- [x] Empty footer link to map.html — footer-1440-light log: 13 named links, 0 empty; no 'students' or map route in shell.js; all local links 200.
- [x] Film switch has no accessible name — role=switch, aria-labelledby resolves to 'Background film'; a click sets aria-checked false, pauses day.mp4 and stores karman-motion=off (filmSwitch-1440-light).
- [x] Lede and Answer it both introduce the question — index-1440x900-dark-fold.png: lede ends at 'a weekly update to you.'; one label 'One of the ten, in the real Karman engine. Answer it the way your student would.' above the panel.
- [x] 100 km up line alone over a blurred frame — scroll-1440-dark-10-y9000.png: the line is the last line inside the bone close card.
- [x] Guarantee section's left half empty — scroll-1440-dark-07-y6300.png and -08: heading and lede side by side, the slip full width in two columns, the covers line inverted across both.
- [x] Pricing close huddled left, comparison bar on an empty screen, hole in the hero — pricing-close-1440-dark.png: words beside the parent-and-daughter photo; pricing-1440x900-light-full.png: comparison bar directly under the School row; pricing-1440x900-dark-fold.png: lede and date question share a row.
- [x] Pricing first screen has no price and no button at 1440 — $995 at y=448 and 'Apply for a seat' at y=608-664 at 1440x900; 412 and 562-618 at 440 and 375 (pricing-*-fold.png).
- [x] Price stub before the product on phones (defended) — pricing-440x956-light-fold.png: stub (price, button) on top directly under the date question, main part under it; reads acceptably.
- [x] Ticket's dotted perforation — No .perf element on either page; notches only (pricing-1440x900-light-fold.png, dates-1440-light).
- [x] No floating free-test button (defended) — Never more than one marigold button on screen at any scroll step on either page (mariMax 1); nothing fixed over text.
- [x] Footer film switch (defended) — footer-1440-light.png: the switch is in the footer, never over the film.
- [x] Opening holds a finished mark 300ms and runs 1.16s (could not) — intro logs 1150 to 1169 ms, landing 0 px off; FORM=600, HOLD=300, TRAVEL=250 in ../logo/intro.js line 20; mark bone on night (intro-1440-dark-300ms.png) and ink on bone (intro-1440-light-700ms.png).
- [x] Google Fonts IBM Plex Sans and engine.css in the head (defended) — requests-index: one Google CSS request carrying Hanken Grotesk and IBM Plex Sans, one Plex woff2; pricing loads Hanken only.
- [x] Lucide icons inside the engine (defended) — 0 visible Lucide elements in the mounted first-screen fragment; the Daily 10 renders still show calculator, pen, highlighter, bookmark, settings and menu icons (scroll-1440-dark-01-y900.png).
- [x] Day film is 4:4:4 (could not) — ffprobe: day.mp4 and day-p.mp4 are h264 High 4:4:4 Predictive, yuv444p; c9, c9-p and c8a-r are yuv420p. Chromium plays it (videoWidth 1440); iPhones will not.
- [x] Links lead to the October 31 mock's inner pages (could not) — ROUTES in shell.js point at /decision/film/*.html; all return 200 on this server.
- [x] Questions are diagnostic originals (could not) — engine/README.md: all eight from src/data/diagnostic-questions.ts; no live bank row is an original.
- [x] Plan rows as five identical cards (defended) — pricing-1440x900-light-full.png: five rows of one shape, photos on Private and School only; at 834 they restack with the link on one line (pricing-834x1194-light-full.png).

## judge — verdict promising — scores {'design': 6.5, 'usability': 7, 'creativity': 7, 'content': 8, 'overall': 7}

### Parent would buy
A parent landing cold at 1440 understands within one screen that Karman is SAT prep with a free, proctored practice test on December 12, and the real question under the headline makes it feel like software she can judge, not a brochure (screens-1440-dark-00.png, click-1440-dark-01-wrongA.png). On a 375 phone she gets the same headline and button, but the broken film sliver and two feature screens with no product shot weaken the 'try before you pay' promise; she would still tap the free test, because the button, date and 'No card needed' are clear and repeated at the close.

### Five seconds
At 1440 (screens-1440-dark-00.png): a flush-left "SAT prep you can try before you pay." over a real dark question screen with four answer buttons on a kitchen film, one marigold button. A parent reads: SAT prep, there is a free test, and the thing under it is the app. At 440 (screens-440-light-00.png) the same, but the film shows only as a 24 px blurry strip above the engine box, which reads as a rendering glitch rather than a window.

### Top problems left
- At 375 px the Daily 10 and Full-length tests screens have no picture (tests-375-dark.png, daily-375-dark.png): a product page whose idea is 'the real screen is the product shot' drops the product on the most common narrow phone. A tight crop of the phone capture (the question and four choices, 343 px wide at about 0.78x) would keep the screen on the page.
- The hero's film window at phone widths is a 24 px blurred strip above the engine and a 40 px strip under the note (screens-440-light-01.png, index-375x812-dark-fold.png). It reads as a broken image band, not as the film behind the page. Either give the window real height at phone widths or close it and let the engine sit on the ground.
- The Daily 10 and Tests pictures show the engine's full two-row toolbar, its own theme toggle, Settings, Menu and X, and the Calculator tab cutting across choice C and D's transfer buttons (screens-440-light-02.png, screens-440-light-05.png), while the live engine one screen above hides all of that. A parent sees two different product chromes for the same app. The honest fix is an engine capture of the phone state without the tab in the frame, or a crop that ends above the toolbar's second row.
- At 834 px the Tests desktop capture is shown at 0.664x (index-834x1194-dark-full.png), the choice text about 11 px. The phone capture (which the page already swaps in under 768 px) at 1x would be more readable on an iPad than the shrunken desktop one.
- Composition in the Results and Guarantee sections at 1440: the headline is flush-left, the 1235/1520 pair flush-left, but the proof sentence sits at x=448, the outcomes list at x=270 and the 'Covers' paragraph at x=398 (screens-1440-dark-06.png, screens-1440-dark-07.png, screens-1440-dark-08.png): three centred blocks of left-aligned text with three different left edges in one column. Pick one edge.
- The campus clips, once they play, end on frames that are not the posters: Priya's clip holds an extreme close-up with her eyes turned to the side (campus-1440-play-2s.png, screens-440-light-10.png), which reads as uneasy rather than 'locked in' (rule 42). The still is right; the moving frame is the film's, but it is what the parent sees for most of the dwell.

### Rule breaches left
- Rule 18 and principle 5 at 375 px: the Daily 10 and Full-length tests feature screens show no product at all (tests-375-dark.png, daily-375-dark.png: headline and sentence only, the captures are display:none under 396 px). On the brief's first phone size, two of the five feature screens are text.
- Rule 44 / principle 5 at 834 px: the Tests capture is the whole 1200 px engine at 0.664x (index-834x1194-dark-full.png), so the choices in the picture are about 11 px, below the 'readable at shown size' bar.
- Principle 11.19 and principle 1 (a screen carries a message): at 375 and 440 the hero 'window' onto the film is a 24 px strip above the engine and a 40 px strip below the note (screens-440-light-01.png, index-375x812-dark-fold.png), a sliver of a blurred face that reads as a glitch, not a window.
- Rule 44 in the data-4 question: the fourth 'Try another question' still shows a stem line beginning with a period at 1440 (click-1440-dark-05-data4.png). An engine fact, but it is on the first screen of the site.
- Principle 6 (motion has a job): when the reader reaches the footer, the close panel falls under 30% visibility and the orbit crossfades back to the dusk day film in the strip above the footer (screens-1440-dark-11.png top 90 px), undoing the 'day dissolves into orbit' ending.

### Fixes verified
- [x] Rule 47: campus captions under the wrong students — campus-1440-posters.png and campus-440-posters.png (motion off): Ava caption under the BERKELEY hoodie with Sather Tower, Mateo under HARVARD, Priya under STANFORD at the arcade; probe captions c8c-r/Ava, c8a-r/Mateo, c8b-r/Priya, matching film.js.
- [x] Rule 33: opening invisible in dark mode — intro-1440-dark-600ms.png shows the bone mark forming on night; intro-440-light-600ms.png ink on bone; probe fill rgb(243,243,240) dark, rgb(18,17,15) light; duration 1169 to 1188 ms, landing 0 px.
- [x] Rule 34: Back to top under the giant wordmark — screens-1440-dark-11.png and screens-440-light-12.png: Back to top sits above the credits-to-wordmark gap, clear of the word.
- [x] Rule 34: dock and returning header cover text — Probe at all 16 size/mode/page combinations lists zero fixed or sticky elements outside the stage and the closed menu; no dock in the DOM; header scrolls away in screens-1440-dark-01.png.
- [x] Rule 34 inside the engine: three-row bar, clipped Highlight, Settings off-screen — Bar measured 56 px at 375, 440, 834, 1440; index-375x812-dark-fold.png shows one row 'MATH / Linear equations (one variable)' and nothing else in it.
- [x] Engine chrome: 25 of 29 controls dead — Probe counts 4 visible engine buttons at every size; screens-1440-dark-00.png and click-440-light-01-wrongA.png show only the four choices.
- [x] Rule 44: pictures distorted, captures too small — Probe: Daily 10 phone capture 440x956 at scale 1.0 on 440, 834, 1440 (natural 880x1912); Tests desktop capture 1200x800 at 1.0 on 1440, 0.664 on 834; phone capture at 1.0 on 440; both display:none at 375. Proportions intact. The 0.664x at 834 (index-834x1194-dark-full.png) leaves the choice text in 
- [x] Rule 44: answered state was a page-side imitation — click-1440-dark-01-wrongA.png: A in error tint with bg-error badge, C in success tint with the check, B and D at opacity-50 border-bronze, all four disabled (probe classes match ActiveQuizScreen names). The page's own 'Try another question' link remains under the box.
- [x] Rule 44: Daily 10 phone capture shows the Calculator tab over a choice (defended) — screens-1440-dark-02.png and screens-440-dark-02.png: the tab sits at the right edge over choice C and D's transfer buttons at 1x, as the engine draws it. Accepted as an engine fact, but the picture also shows the two-row top bar, theme toggle, Settings, Menu and X that the live engine one screen ab
- [x] Rule 33: which-plan column 4.35:1 in light — Contrast walk of every text node outside the engine on both pages, both modes, at 1440: zero pairs under AA; pricing-375x812-light-full.png shows the phone list in grey ink, not marigold.
- [x] Rule 6: three outcome cards in a row; campus trio as three framed cards — screens-1440-dark-07.png: outcomes are three stacked rows in one list; screens-1440-dark-09.png: the trio is one edge-to-edge strip with 2 px seams, no frames; pricing-1440x900-dark-full.png same list on pricing.
- [x] Rule 16 / Von Restorff: marigold everywhere — Probe finds marigold only on a.btn (plus the off-screen skip link) at every size and mode; guarantee bullets are grey discs (screens-1440-dark-07.png), comparison marks are ink discs and dashes (pricing-1440x900-dark-full.png).
- [x] Rule 19: 14 and 44 px radii — Probe radii: btn 999px, panel/card/plan/outcomes 8px, engine-box/photo/shot/phone 0px.
- [x] Rule 37: count-up — grep finds no data-count in index.html, site.js or site.css; screens-1440-dark-06.png shows static 1235 and 1520; 21st.md lists 20068 as removed.
- [x] Rule 58: CSS phone frame without an island — screens-1440-dark-02.png: the phone capture stands as a bare 440 px rectangle, no drawn bezel.
- [x] Principle 7 / Fitts: targets under 44 px — Probe of every link and button outside the engine and menu returns an empty list of targets under 44x44 on both pages at four sizes; footer links, Back to top, the switch (52x44) and the segmented buttons all pass.
- [x] Principle 11.18: 1.2 s opening on first visit (defended) — Measured 1169 to 1188 ms at 1440 and 440; second load in the same session skips it. Accepted as the founder's ask.
- [x] Copy rules 4 and 9: headline names an action, no price on home — h1 'SAT prep you can try before you pay.' on all 8 home captures; 'Free. Saturday, December 12...' beside the button; each feature's lede ends with its plan and price (screens-1440-dark-01.png 'In Platform ($29 a month) and up').
- [x] Principle 11.7: 15.7 screens with duplicated spec table — Probe: home 10432 px = 11.6 screens at 1440, 13.4 at 375, 12.7 at 440; no platform table on home (index-1440x900-dark-full.png); pricing holds the table and the phone list.
- [x] Site principles section 2: header lacks the named sections — screens-1440-dark-00.png header: wordmark, theme, The SAT Program, Private tutoring, Pricing, Sign in; click-440-light-07-menu.png: seven-link sheet, focus lands on Close, Escape closes it (probe).
- [x] Lucide icons and 10 to 12 px labels inside the fragment (defended) — Live fragment shows only the eyebrow and section label at small sizes (screens-1440-dark-00.png). The Daily 10 and Tests pictures still carry the engine's Lucide toolbar and cross-out icons at 1x (screens-440-light-05.png), an engine fact.
- [x] data-4 stem breaking to a line starting with a period — Order is alg-1, adv-3, geo-5, data-4 (probe). click-1440-dark-05-data4.png still shows '. What is the probability' starting a line at 1440; at 440 (click-440-light-05-data4.png) it wraps cleanly. Last in order, but the fourth click still shows the break.
- [x] Speed: day.mp4 on pricing; 25 MB on home — Network probe: pricing requests c9.jpg and c9.mp4 only; home requests day.jpg, three c8 posters, two engine webps and day.mp4 within 2.5 s.
- [x] 21st.dev components invisible as such (defended) — 21st.md credits six ported components and names two removed; the segmented control (pricing-1440-dark-program-split.png, $345 three payments), the tiers list, the table, the switch and the giant wordmark are on screen.
- [x] Free test page shows the old mock's chrome (could not) — Both free-test links resolve to ../../decision/film/free-test.html (200), outside this folder; not changed, as stated.
- [x] Faint grey block beside the engine's theme icon at 375 — index-375x812-dark-fold.png: the toolbar group is gone, no block.

## judge — verdict promising — scores {'design': 6, 'usability': 6, 'creativity': 6, 'content': 7, 'overall': 6}

### Parent would buy
A parent landing cold understands within one screen that Karman is SAT prep with ten minutes of daily practice, tutors in live classes and a weekly update, and the free proctored test with its date and 'No card needed' is the obvious next step at every width (index-375-light-fold.png, index-1440-light-fold.png); answering the real question is the one moment that makes the product feel real. They would likely book the free test, but the Daily 10 screen looks like a broken app and the campus clips open on a head-top and a puddle, which costs trust right where the page asks for it.

### Five seconds
index-1440-light-fold.png / index-375-light-fold.png: "Ten minutes of SAT practice a day", one marigold "Take the free practice test" button, the date and "No card needed" under it, and a real SAT question you can answer on the right (choices A to D only, no dead controls). A parent gets "SAT prep, daily practice, free test first" in five seconds at every width; at 375 the question's stem is at 646 px with choice A on screen.

### Top problems left
- Daily 10 at desktop: screens-1440-light-02.png is mostly empty ground; the 956 px phone capture is taller than a 900 px viewport so the headline scrolls away and the left 60% of the screen is blank. The capture needs a desktop height or the words need to travel with it (sticky rail or a shorter crop).
- The pricing phone capture (pscreens-375-05.png) shows the engine's three-row bar sitting on the passage: 'Choose text with the keyboard' is half hidden and the passage starts under the bar. A parent reading 'the platform, as your student sees it' sees an app that overlaps its own text. Use a capture state where the bar is one row or crop below the bar.
- Campus clips open badly: Priya's clip starts on the crown of her head (campus-1440-2-frame.png, frames-c8b.png) and Ava's on a puddle and feet (campus-1440-0-frame.png) for about two seconds each; only Mateo's opens on a person. Start the videos at the second where the face is in frame (currentTime) or hold the poster until then.
- The home Daily 10 capture (screens-1440-light-01/02.png, screens-440-light-02/03.png) shows the engine's own three-row Lucide toolbar and choice D cut by the bottom bar. Real, but it is the weakest screen on the page; a capture at a width where the bar is one row, or the desktop capture, would read as a product.
- Pricing still lists four 'coming 2027' items in the comparison table (pscreens-1440-04.png); the home fix did not reach pricing.
- Pricing headings have no breathing room below them: 'What you get back, by score.' and its lede run straight into '+100 points or a 1450' (pscreens-1440-05.png), and 'The platform, as your student sees it' and 'The six plans' drop the full stop the other headlines carry (pscreens-1440-02.png).
- The tutors deep panel at 1440 (screens-1440-light-03.png) has two short text blocks floating in a large black field with ~200 px gaps; it reads as unfinished next to the dense sections around it.

### Rule breaches left
- Principles 5 (product screens never cut words mid-line) and rule 44: pscreens-375-05.png, the pricing phone capture's three-row engine bar covers 'Choose text with the keyboard' and the top of the passage; the same engine bug the README records at 440, shown to parents on the site.
- Principles 1 (a screen with only background is a bug): screens-1440-light-02.png, at 1440x900 the Daily 10 screen is a 956 px phone capture on the right and empty ground on the left two-thirds (text cover 3% of the screen, one lede at the top edge).
- Rule 47 spirit (the campus chapters stand for real students): the Priya clip plays its first two seconds on the top of her head with her face out of frame (frames-c8b.png, campus-1440-2-frame.png) and the Ava clip on a puddle and shoes (frames-c8c.png, campus-1440-0-frame.png); the captions are right, the opening frames are not a person.
- Copy rule 5 / judge 2's 'coming' finding, still on pricing: pscreens-1440-04.png carries 'Wordline ... comes spring 2027' and 'Score Plan, coming spring 2027; Test-Day Playbook, coming May 2027; Ask Karman, coming in 2027' in the comparison table (four coming items).
- Rule 2 (no Lucide) and rule 56: the two engine captures show the engine's Lucide toolbar (pen, highlight, bookmark, moon, settings, menu, X) wrapped to three rows, and the home Daily 10 capture ends with choice D hidden under the bottom bar (screens-1440-light-02.png, screens-440-light-03.png). The product's own, but a marketing page shows a screen that looks broken.

### Fixes verified
- [x] Campus clips crossed (rule 47) — campus-1440-0/1/2-frame.png and log.txt: Ava -> c8c (Berkeley hoodie, Sather Tower), Mateo -> c8a (HARVARD sweatshirt, gate), Priya -> c8b (STANFORD). r4-manifest.mjs run by me passes. Captions sit under the picture.
- [x] Portrait -r stills cover-cropped, headless torso — log.txt campus clicks: frame 691x388 (1.78), natural 1280x720 / 1440x808 landscape files; no crop. But see topProblems: c8b.mp4 opens on 2 s of the top of Priya's head and c8c.mp4 on 2 s of a puddle and feet (frames-c8b.png, frames-c8c.png, campus-1440-0-frame.png, campus-1440-2-frame.png).
- [x] Marigold button: 102 px arrow, three-line label, chamfered slab — log.txt: btn 273x52, one line, arrow 16x16, border-radius 0 at 375, 440, 834 and 1440; index-*-fold.png.
- [x] First screen is the engine toolbar, fourteen dead controls; stem below fold at 375 — log.txt visibleControls = [A,B,C,D] only, visibleSvgs = [], topbar 56 px one row; engine box 495 px at 440/834/1440, 526 at 375; at 375 the Algebra eyebrow is at 613 and choice A at 735-795 of 812 (index-375-light-fold.png).
- [x] Engine Algebra eyebrow under the three-row bar at 375 — index-375-light-fold.png: bar is one row (MATH / Linear equations), eyebrow clear below it; content top 64 px per ascent.css line 163.
- [x] Headline a slogan — h1 = 'Ten minutes of SAT practice a day.' two lines at 375/440/1440, one at 834; qlabel ends 'Try it.' (index-1440-light-fold.png).
- [x] Button talks to the student (defended) — Still 'Take the free practice test' on both pages and the close; founder's call, no change expected.
- [x] Daily 10 phone frame removed, capture at natural ratio — log.txt dailyshot: 440x956 at 440/834/1440 (1.0x of the 880x1912 capture), 396x860 at 375 (0.9x, x=-10). screens-440-light-02.png shows no drawn frame.
- [x] Pricing three desktop captures at 0.3x — log.txt pricing measures: one conv-2 wrong-state shot, desktop 1200x800 at 1440 (1.0x), 767x512 at 834 (0.64x), phone 440x956 at 440 (1.0x) and 396x860 at 375 (0.9x); src follows theme (dark at pscreens-375-05.png).
- [x] Orbit facts 3.99:1 over the frame; captions on scrims — screens-1440-light-08.png / screens-440-light-10.png: every word of the close sits on the solid #0e0d0c card; my contrast scan of 109/125 text runs per page finds 0 under AA in both modes.
- [x] Sticky header covers text — log.txt hdrPos = relative; no hide-on-scroll code remains in site.js; overlap scan at 1440 reports 0 (the 137 hits at 375 are KaTeX inline spans of one equation, visually fine in index-375-light-fold.png).
- [x] Verdict #94600a at 4.31:1 — log.txt verdictColor rgb(18,17,15) in light; click-1440-choiceA.png shows the verdict in ink.
- [x] Footer mark fills a screen — log.txt footmark h 120; screens-1440-light-08.png shows the mark 120 px tall above the columns.
- [x] 355 px empty ground above the headline at 1440 — log.txt: field y=104, h1 y=160, question fully inside 900 (choice D bottom 660); index-1440-light-fold.png.
- [x] Hairline spine and dashes — No spine or dash elements in any screens-1440-*.png; none in home.js or ascent.css.
- [x] Altitude numbers 10/20/5/7/100 — copy.js has no altitude markers; only the footer line '100 km up' remains (screens-440-light-10.png), which is the company name's origin, not a marker.
- [x] Guarantee as bento grid with marigold band — screens-1440-light-06.png: plain headed two-column text, no fills, no marigold.
- [x] Weekly update as four coloured tiles — screens-1440-light-05.png: one list of four lines with the mark bullet; 28381 noted as dropped in 21st.md.
- [x] Four 'Coming 2027' tool lines — Home tools list has four lines with none 'coming' (screens-1440-light-04.png). Pricing comparison still carries 'comes spring 2027' and three 'coming' items in Planning tools (pscreens-1440-04.png), see topProblems.
- [x] Ground window lede about the page itself — screens-1440-light-01.png: 'Ten questions at the kitchen table before school, and a weekly update to you.'
- [x] Phone comparison check and dash bullets — pricing-375-accordion.png: 'Included' list with the mark bullet, one 'Not included:' sentence; the desktop table keeps check and dash glyphs (pscreens-1440-03.png), a table not bullets.
- [x] No button on the pricing first screen — pricing-375-dark-fold.png / pricing-1440-light-fold.png: free line and the marigold button at y 430 (375) and 562 (1440), no black band.
- [x] Pricing close headline three lines at 375 — log.txt closeH2lines 2 at 375 and 440; pscreens-375-09.png; every h2 at most 2 lines at every width.
- [x] Two style attributes on the pricing lede — log.txt ledeStyle '--d:60ms' (one attribute).
- [x] Sheet Close and Dark mode in default grey chrome — menu-375.png; log.txt tbBg transparent, border none.
- [x] Honest note indented 120 to 176 px — log.txt: covers x=112 and honest x=112 at 1440; pscreens-1440-05.png.
- [x] Entrances late and grey — ascent.css 0.5 s, site.js rootMargin 150 px, max delay 120 ms; pricing-screens run reports notIn = [] at every screen step.
- [x] No floating free-test button (defended) — Overlap scan: at most one .btn on screen at every step on both pages; nothing fixed over text. Phone scroll between buttons is ~9,000 px (log.txt heights), founder decides.
- [x] Hero grades instantly (defended) — click-1440-choiceA.png: A in error tint, C in success tint, verdict text; click-375-choiceC.png: 'Right.' No Submit step.
- [x] Lucide icons and blur bar inside the engine (defended) — Hidden in the hero (visibleSvgs = []); still visible in the two engine captures (screens-1440-light-01.png toolbar, pscreens-1440-02.png), which are the product's own.
- [x] No JSON-LD, no server rendering (could not) — index-1440-nojs.png is blank; log.txt nojs text length 0. Static mock.
- [x] decision/serve.mjs cannot serve /redesign (could not) — The scratchpad serve-mocks.mjs rooted at mocks/ served everything (200 on index and the fragment).
- [x] Footer pause control (defended) — screens-440-light-10.png footer region: the control sits in the footer, not on the film.
- [x] 21st.dev credits half used (noted) — 21st.md lists nine ids with what changed; 18475 credited in home.js and pricing.js headers; 28381 recorded as dropped.
- [x] Opening mark visibility in dark mode (no bug) — intro-dark-450ms.png and intro-light-450ms.png: the mark is clearly visible on both grounds; __intro ran:true, landing delta 0 in both modes; page restored by 1500 ms (intro-light-1500ms.png).
