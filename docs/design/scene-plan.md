# Landing page film: script and production plan

Status: in discussion with the founder. Nothing has been generated. The script
in `scripts/generate-assets.mjs` refuses to run a shot until it is marked
approved in `assets/manifest.json`.

## Decisions so far (2026-10-21)

- One weekday in California winter (the cohort runs January to March), rising
  from the ground to the edge of space. Ava is the thread: kitchen, bus, test
  morning, college.
- Each scene opens on the sky reflected in glass, the camera passes through
  the reflection to the person, and ends by lifting off into a higher, darker
  sky. The reflection opening is tested on one scene first; if the models
  can't do it cleanly, the reflection becomes a code transition.
- Cast: Ava, Clara (the only Chinese-American student), Mateo (tennis), Priya,
  Ava's mother, David the tutor (Korean-American).
- No text is generated in any video. Every word on the page is HTML, and every
  word is editable by the founder in plain-text copy files. The founder writes
  the Daily 10, guarantee and test-date copy himself; the card text below is
  placeholder.
- The ending is in orbit. The words "Kármán line" do not appear on the landing
  page; tapping the line shows "100 km up, where the sky ends and space
  begins." No sky-layer names anywhere.
- Real results: Ava 1520 UC Berkeley, Mateo 1570 Harvard, Priya 1540 Stanford,
  shown with "Karman 1:1 tutoring, median 16 weeks." Cleared by the founder's
  lawyer.
- Chat and workshops stay as the offer describes them (cohort group chat
  answered daily by a tutor; weekly live session with skill workshops).

## California winter, applied

- Houses: Spanish revival and modern craftsman on oak-lined streets, as in Palo
  Alto or Los Altos. Green winter hills behind.
- The prep school: stucco and red-tile roofs, an oak-shaded quad, a circular
  drive, clipped hedges. Students 15 to 18 in quarter-zips, fleece vests and
  polos (California prep wears fewer blazers). No crests or names.
- Light: sunrise about 6:55 a.m. and sunset about 5:45 p.m. in February, so the
  clock times match real light: dawn on the bus, golden hour at tennis, full
  dark for Priya and David. Test morning is flat grey marine layer.
- Tennis is outdoors on hard courts.

## What the research says about timing

1. **The first 10 seconds decide the visit.** People are most likely to leave
   in the first 10 seconds, still at risk for the next 20, and only settle after
   about 30 seconds (Nielsen Norman Group, from Microsoft Research's study of
   2 billion page visits).
2. **Most attention stays near the top.** In NN/g's 2018 eyetracking study,
   57% of viewing time was above the fold and 74% in the first two screens.
   Chartbeat found about half of readers see 1,500 pixels down a page, and
   that close to half leave within 15 seconds.
3. **Brand first.** Google and Kantar's study of 11,000 video ads (the ABCDs)
   found that showing the brand in the first 5 seconds is linked to stronger
   results; Google's bumper research shows 6-second spots can lift recall,
   best as reinforcement rather than introduction.
4. **Reading pace.** Adults read silently at about 238 words a minute
   (Brysbaert, 2019), so a headline plus a 20-word card needs about 6 seconds.

What that means for the page:

- The first screen does all the selling on its own: what Karman is, the test
  date, the button, and something moving within a second. The opening clip
  plays its first 4 seconds by itself (the kitchen light comes on, Ava pours
  coffee), then scroll takes over.
- The opening and the bus scene are seen by the most people, so they get the
  most care and the most seconds.
- Visitors who pass 30 seconds are the committed ones; they get the full story,
  and the ending is their payoff.
- Each scene gets at least enough scroll to read its words (about 6 seconds of
  reading), never less.
- Because scroll drives each clip, a clip's length sets how smooth it feels,
  not how long anyone watches. About 8 seconds of footage stays smooth over a
  screen and a half of scrolling.

## Scenes, lengths and priority

| #   | Scene                                          | Clip length | Priority | Card beside it (placeholder text)                     |
| --- | ---------------------------------------------- | ----------- | -------- | ----------------------------------------------------- |
| 1   | 6:10 a.m. kitchen, rise to the clouds          | 12 s (Wan)  | Highest  | Headline, what Karman is, the button                  |
| 2   | 6:50 a.m. Ava on the bus                       | 10 s        | High     | Your Daily 10 (founder's copy)                        |
| 3   | 3:15 p.m. pickup line, Ava's mother in the SUV | 8 s         | High     | The weekly update                                     |
| 4   | 4:30 p.m. Mateo at tennis                      | 8 s         | Medium   | Cohort chat with a tutor; Wordline                    |
| 5   | 8:00 p.m. Priya speaking on Zoom               | 8 s         | Medium   | Two live classes a week; weekly session and workshops |
| 6   | 9:00 p.m. David                                | 8 s         | Medium   | 1:1 after every full-length; five full-length tests   |
| —   | Night stretch, drawn in code                   | free        | —        | Every SAT skill tracked as stars; 10,000+ questions   |
| 7   | 7:40 a.m. Saturday, March 6, test morning      | 8 s         | Medium   | Test date and guarantee (founder's copy)              |
| 8   | Next fall: Mateo, Priya, then Ava              | 6 s each    | High     | Name, score, college; the 1:1 label                   |
| 9   | Orbit and the line, NASA footage               | free        | High     | The free practice test                                |

## How credits are kept low

1. Key frames as stills first (2 to 5 cents each), approved by the founder.
2. 480p video drafts from approved stills, judged for motion only.
3. Approved drafts finished at 1080p from the same take.
4. Sky, stars, constellations, the line, grading and grain done in code or
   locally for free; orbit from NASA.
5. One change per retake; failed prompts recorded so nothing is paid twice.

Estimate: stills about $2; 68 seconds of Seedance 2.5 drafts about $9.50;
retakes about $4; 1080p finishes about $18 (rate confirmed on the first);
opening on Wan 3.0 about $2. **About $35 for desktop.**

## Sources

- Nielsen Norman Group, "How Long Do Users Stay on Web Pages?":
  https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/
- Liu, White and Dumais, Microsoft Research, dwell-time Weibull analysis:
  https://www.microsoft.com/en-us/research/wp-content/uploads/2010/10/dwelltime.pdf
- Nielsen Norman Group, "Scrolling and Attention" (2018), as summarized by
  UXmatters: https://uxmatters.com/mt/archives/2020/11/debunking-the-myth-of-the-fold.php
- Chartbeat, scroll behavior research:
  https://chartbeat.com/resources/research/scroll-behavior-across-the-web/
- Nieman Lab on Chartbeat's 15-second exits:
  https://niemanlab.org/reading/engagement-isnt-keeping-pace-with-pageviews-a-new-report-says-thats-bad-news-for-publishers-trying-to-turn-visitors-into-loyal-readers
- Google, the ABCDs of effective video ads:
  https://business.google.com/us/resources/articles/abcds-of-effective-video-ads/
- Brysbaert (2019), "How many words do we read per minute?":
  https://doi.org/10.1016/j.jml.2019.104047
- Google, bumper ads: https://thinkwithgoogle.com/intl/en-gb/marketing-strategies/video/youtube-bumper-ads-making-big-impact-small-stories
