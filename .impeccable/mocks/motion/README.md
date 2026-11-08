# Karman motion lab

Two families of short looping clips for the site:

- **Feature clips** (new, 2026-11-01): the platform's dashboard, calendar, Daily 10 ending,
  progress and rewards, the parent's weekly update and a tour, each inside a hand-drawn
  iPhone 17 Pro Max (`device/`), cut from real captures of the portals prototype (`shots/`).
- **Quiz-engine clips**: the question screen, described further down.

## Feature clips in the iPhone 17 Pro Max

Every picture is a real capture from `shots/` (see `shots/README.md` for each screen, what
was hidden for rule 47 and the numbers to check). The code only places the captures,
scrolls the long ones, cross-dissolves between real states, slides a captured sheet in
from its own edge and draws the fingertip ripple (22 to 56 pt). No UI or text is drawn.

Same encoding as below: 30 fps H.264 MP4 (yuv420p, CRF 23, faststart, no audio), a WebP
poster of frame 0, and each clip ends on its first frame so it loops with no jump.

`<ratio>`: `9x16` (1080 x 1920, the phone alone at 1.62x) or `16x9` (1920 x 1080, the phone
at 0.92x beside the desktop capture of the same screen at 1100 px wide, 12 px corners, no
shadow). `<ground>`: `marigold` (#EBA21F) and `night` (#141413) carry the dark-mode
screens, `pine` (#1F4D45) the light-mode screens. The phone is Cosmic orange in all of them
(`FINISH` in `src/features/Feature.tsx`).

| File | Length | What happens |
| --- | --- | --- |
| `out/dashboard-<ratio>-<ground>.mp4` | 8.0 s | Student Home (March cohort). Holds on the next thing to do, Your Daily 10 and the two due items, scrolls down through Today's set to Skills by level, then on to Personal bests, and dissolves back to the top. Desktop: Home, still. |
| `out/calendar-<ratio>-<ground>.mp4` | 8.0 s | The cohort's Classes: this week's schedule scrolls into view with the homework. Dissolves to a Private student's Sessions, a tap on Book your next session, the booking sheet slides up (on desktop, the side sheet slides in), a tap on 6:00 pm and the button reads "Book Nov 2, 6:00 pm". Dissolves back to Classes. |
| `out/d10-finish-<ratio>-<ground>.mp4` | 8.0 s | The Daily 10 ending: "Enough for a mystery box", tap Open, the box, tap the box, it bursts, "You found headphones", the headphones on the fox, then the calm results screen. Back to the box moment. **Shows "7 of 10" on the results screen**; see shots/README.md. |
| `out/progress-rewards-<ratio>-<ground>.mp4` | 8.0 s | Progress scrolls from Skills by level through the skill list; dissolves to Rewards, which scrolls from tokens and the fox to companions and the streak. Back to Progress. |
| `out/parent-update-<ratio>-<ground>.mp4` | 8.0 s | The parent's Progress page scrolls through skills and the week, a tap on Read the latest update, the weekly update (skills that moved, practice, test, live classes, what's next) scrolls. Back to the parent's page. |
| `out/tour-<ratio>-<ground>.mp4` | 12.0 s | Four features, about 2.8 s each: Home (short scroll), Classes (schedule scroll), the Daily 10 prize on the fox, Rewards (scroll). Back to Home. |

How the long screens scroll: the top bar and bottom bar come from the normal capture, and
the scroll area between them from the tall `-scroll-` capture, moved up. Scroll positions,
taps and sheet edges are in `src/features/clips.ts`, in CSS px measured on the live
prototype. To change a clip, edit that file and render again.

Honest notes:

- The fox moves between moments in the real end screen, so the short dissolves between
  Daily 10 states show it in two places for a few frames.
- When the booking sheet slides up, the page above it fades to the captured dimmed page;
  the strip the sheet has not covered yet shows the page undimmed for a few frames.
- The faint contour background scrolls with the content (see shots/README.md).

## Render the feature clips again

```bash
node scripts/capture-screens.mjs            # recapture (the prototype must be running on 5174)
node device/build.mjs                        # rewrite the three frame SVGs
node render-all.mjs dashboard,calendar,d10-finish,progress-rewards,parent-update,tour
```

`public/shots` and `public/device` are links to `shots/` and `device/`.

## Quiz-engine clips

Short looping clips for the site, cut from real screens of the real quiz engine. Every picture
in every frame is a capture from `../redesign/engine/renders/` (question `alg-1`, "If 3x + 5 = 26,
what is the value of x?", dark theme). The clips only scale them, crop them between UI rows, move
them and cross-dissolve between them. The only thing drawn by the code is a soft, finger-sized tap
ripple (22 to 56 CSS px).

All are 30 fps H.264 MP4 (yuv420p, CRF 23, faststart, no audio), each with a WebP poster of
frame 0. Each clip ends on its first frame, so it loops with no jump. Pages show the poster to
visitors who ask for reduced motion.

`<ratio>` is `16x9` (1920 x 1080, desktop capture at 1.2x) or `9x16` (1080 x 1920, phone capture
at 1.8x; in the handoff the phone is 1x in 16x9 and the desktop 0.88x in 9x16). `<ground>` is `marigold` (#EBA21F), `pine` (#1F4D45) or `night` (#141413). The capture
sits on the plain ground with 12 px corners, no device frame and no shadow.

| File | Length | What happens |
| --- | --- | --- |
| `out/d10-right-<ratio>-<ground>.mp4` | 6.0 s | Question. Gentle push-in toward the choices. Tap on C, the selected state dissolves in. Tap on Submit Answer: C is marked right and the explanation slides up. Holds, then dissolves back to the question as the camera eases out. |
| `out/d10-wrong-<ratio>-<ground>.mp4` | 7.0 s | Question. Push-in. Tap on B, the engine marks B wrong and checks C. Tap on Show explanations: the explanation slides up. Back to the question. |
| `out/handoff-<ratio>-<ground>.mp4` | 6.0 s | The same moment (C selected, Submit Answer showing) on the phone. The screen's frame widens from the phone shape to the desktop shape, the phone capture fades out and the desktop capture fades in inside it, holds, then hands back to the phone. The widening frame is filled with the engine's own page colour (rgb 16 28 24, sampled from the captures) so no capture is ever seen half-transparent over the ground. |

Captures used (copied into `public/caps/`): `alg-1-{phone,desktop}-dark-{question,selected,wrong,correct-explain}.webp`.
Only dark captures are used, because `selected` exists only in dark.

### How the states are joined (honest notes)

- **No "B selected" capture exists.** In the wrong clip the tap on B goes straight to the graded
  screen; the real engine would show B selected with Submit Answer first.
- **No "wrong + explanation" capture exists.**
  - Phone (9x16): the top rows (choices with B marked wrong, C checked) stay from the `wrong`
    capture, and the rows below them (rows 526 to 891 CSS px: the explanation rule, the explanation
    and the Hide explanations / Next question buttons) come from `correct-explain`. Rows were
    matched by pixel diff: the two captures differ only in row B, the button row and the
    explanation rows.
  - Desktop (16x9): the explanation opens as a second column and the question column moves left,
    so rows cannot be joined. The clip dissolves to the `correct-explain` capture, which shows
    choice B without its wrong tint. A `wrong-explain` capture from the engine harness would fix
    this.
- On desktop the explanation column slides up 40 px as it fades in; on phone the explanation rows
  slide up 56 px inside their own band, so they never cover the bottom bar.

## Render again

```bash
cd .impeccable/mocks/motion
npm install                       # remotion, @remotion/cli, react, react-dom (pinned)
npm run studio                    # preview in Remotion Studio
node render-all.mjs               # all 18 clips + posters into out/
node render-all.mjs d10-wrong     # only ids containing "d10-wrong"
```

`render-all.mjs` bundles once into `.cache/bundle`, renders each composition with
`--codec=h264 --crf=23 --pixel-format=yuv420p --muted`, remuxes with `-movflags +faststart`, and
writes the poster with `remotion still --frame=0 --image-format=webp`.

`node_modules/` and `.cache/` are gitignored.

## Files

- `src/Clip.tsx`: the clip component, measured geometry of the captures, timings.
- `src/Root.tsx`: registers the 18 quiz-engine compositions and the 36 feature compositions (6 clips x 2 ratios x 3 grounds).
- `src/features/Feature.tsx`: the feature clip component (phone frame, scroll, sheet, ripple, desktop).
- `src/features/clips.ts`: each feature clip as data.
- `src/features/geometry.ts`: reads `shots/geometry.json`.
- `scripts/capture-screens.mjs`: the screen captures.
- `shots/`, `device/`: captures and the iPhone frame, each with its own README.
- `render-all.mjs`: the batch render.
- `public/caps/`: the eight captures used.
