# Landing page scenes and ideas (for approval before any spend)

Nothing in this file has been generated. The script that makes the clips
refuses to run a scene until it is marked approved in `assets/manifest.json`.

## The through-line

**One weekday, from the ground to the Kármán line.** The reader's scroll is
the climb. Each scene is one hour of a real school day, filmed as a single
15-second shot that the scroll plays forward and backward. The sky between
scenes is drawn in code and gets darker and starrier as the day gets later, so
the time of day and the altitude rise together.

**Every shot ends by lifting off.** The last 4 to 5 seconds of each clip leave
the person and crane up into that hour's sky: through a bus window, over a car
roof, past the floodlights. The final frame is almost all sky, in the colour
the drawn sky has at that point on the page, so the clip melts into the page
instead of cutting. This is what removes the "slides" feeling: the reader
never sees a cut, they keep rising out of one moment and into the next.

## The eight scenes

| #   | Time                    | Scene                                                                                                                                                                                                                                                         | Lift-off at the end                                                                         | Shown beside it, in code            |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | 6:12 a.m.               | A quiet town before light. One kitchen window is lit. The camera starts outside that window and rises slowly over the rooftops to the underside of the clouds, and stops there. (The current opener flies all the way to space, which gives away the ending.) | Into low cloud, deep blue                                                                   | Headline and the one button         |
| 2   | 6:50 a.m.               | Ava on the school bus, one AirPod in, working on her phone held low so the screen is never seen. Low sun strobes through the windows. She finishes, breathes out, looks up.                                                                                   | Camera drifts to the window and tilts up to the dawn sky over the trees                     | Your Daily 10                       |
| 3   | 3:15 p.m.               | The pickup line. Ava's mother reads the weekly update on her phone in the driver's seat, seen through the windshield with trees sliding across the glass. A small smile, she sits back.                                                                       | Rises over the car roof into a bright afternoon sky                                         | The weekly update                   |
| 4   | 4:30 p.m.               | Mateo on the team bench at a water break, towel on his shoulder, phone in hand; two teammates sit further along, talking. He drinks, then gets up and jogs back out.                                                                                          | Tilts up past the floodlight mast into golden-hour sky                                      | Wordline and the Challenge question |
| 5   | 8:00 p.m.               | Priya in her bedroom in a live class. The camera stays behind the laptop lid so we see her face lit by the screen, never the screen. She listens, then types an answer.                                                                                       | Slides past her to the window: blue hour, first two stars                                   | The class calendar                  |
| 6   | 9:00 p.m.               | David, the tutor, at a desk mic on a boom arm, explaining with his hands to a student we never see. Warm lamp, bookshelf.                                                                                                                                     | Arcs to the dark window, stars                                                              | The 1:1 review after each test      |
| —   | 32 days                 | No footage. The drawn stars wheel into star trails to show weeks passing, and the two constellations draw themselves: a heart for Reading, a brain for Math.                                                                                                  | —                                                                                           | A plain counter: 32 days, then 0    |
| 7   | 7:40 a.m., Sat. March 6 | Test morning. Ava and Clara walk side by side toward the doors of a brick high school in flat grey light, no headphones. The doors open and bright light spills over them.                                                                                    | The light from the doors fills the frame (white-gold), which becomes the sunrise in scene 8 | The test-date card and guarantee    |
| 8   | Sunrise at the line     | Real footage from the International Space Station: the edge of the Earth, the thin green band of airglow, the sun coming up. The Kármán line draws across as one hairline and the closing button sits on it.                                                  | —                                                                                           | The free practice test              |

### Why scene 8 should be real footage

NASA publishes its own footage from the space station for free, and it is
not covered by copyright (it can't suggest NASA endorses Karman, and the NASA
logo can't appear). Two candidates in NASA's library:
"ISS Airglow" (Goddard, 2018) and the "4K Earth Views Extended Cut" (Johnson,
2021). Real orbit footage looks better than any generator and costs nothing.
It is also the one shot where "real" matters most, because it is the promise.

## Ideas for the rest of the page

1. **One live thing: pick your SAT date.** Three buttons (March 6, May 1,
   June 5). Choosing one redraws a strip calendar: first class, the five
   full-length tests with the one-on-one review after each, the last class, the
   test day. All from `src/lib/marketing/offer.ts`, nothing invented. Needs the
   May and June cohort dates, which are still open.
2. **An altitude rail.** A hairline down the right edge with the sky layers
   marked (Ground, Troposphere, Stratosphere, Mesosphere, Kármán line) and a
   small marker that rises as you scroll. It names layers of the sky, never a
   student's level (rule 39).
3. **Each kinetic headline does one thing tied to its scene**, not a generic
   effect:
   - Scene 2: the clock "6:50" ticks forward a minute as the shot plays.
   - Scene 3: the words arrive like a notification sliding in, once.
   - Scene 4: "Wordline" letters flip in like tiles.
   - Scene 5: words appear as if typed, matching her typing.
   - Scene 6: "every missed question" breaks apart, then reassembles in order.
   - Scene 7: the date stamps in place.
4. **Star trails for the passing weeks**, drawn in code, as in the table.
5. **The closing button sits on the Kármán line.** Hovering it draws the line
   the rest of the way across the screen.
6. **Subpages continue the climb.** The program page opens in stratosphere
   colours, the private page in the mesosphere, About at the line. Same sky
   code, different starting height, so the whole site feels like one place.
7. **Phones get the same story.** Clips are cropped to a vertical frame
   first; only scenes that crop badly get a separate vertical version.
   A still frame shows within a second; the video loads after.
8. **No sound.** Muted throughout; nothing autoplays audio.

## What it costs (checked live on Atlas Cloud, 2026-10-21)

Prices from Atlas's own quote endpoint, which charges nothing. Seedance 2.5
is cheapest when each scene is drafted at 480p, judged, and only the approved
draft is finished at 1080p.

| Scene             | Model and route                      | Cost                                                    |
| ----------------- | ------------------------------------ | ------------------------------------------------------- |
| 1 Town            | Wan 3.0 on Atlas, 1080p, 15 s        | $2.40                                                   |
| 2 to 7 People     | Seedance 2.5 on Atlas, 480p draft    | $2.10 each, $12.61 for all six                          |
| Retakes           | About three more drafts              | about $6.30                                             |
| 2 to 7 finished   | Seedance 2.5 draft finished at 1080p | about $3.95 each, about $23.70 (confirmed on the first) |
| 8 Orbit           | NASA footage                         | $0                                                      |
| **Desktop total** |                                      | **about $45**                                           |
| Phone versions    | Only where cropping fails            | about $6 per scene                                      |

For comparison: Seedance 2.5 at 720p straight away is $4.52 per scene, at
1080p $8.90. Seedance 2.0 Mini, which made the current film, is $1.46 per
15 seconds at 720p if the budget needs to come down.

Your Atlas balance is $25.00, enough for every draft and the first finishes.

## Decisions for you

1. Approve, change or drop each scene (1 to 8).
2. Scene 8: real NASA footage, or generated?
3. Phones: crop first (recommended), or buy vertical versions of every scene?
4. Which ideas from the list above to build.
