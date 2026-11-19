# Start and end screens: where this stands (2026-11-19)

For the next session. Branch `claude/project-handover-tasks-8500d3`, pull request 306, worktree
`.claude/worktrees/project-handover-tasks-8500d3`. Nothing here is merged or live.
Test server: launch entry `portal-phone` (port 3440). Skill set: `/learn/set/ma-skill-circles`.
Portal: `/dev/shell`. On his iPhone over the cable: `http://karman.local:3440/...`.

## The verdict so far: four tries, all rejected

1. Stack of glass cards (other session): "bland and boring".
2. A livelier version of the same: "still pretty trash".
3. A ring with a bead for each question: "I don't like the whole rotary idea ... kind of ugly"; he also
   disliked the coin as the level's marker.
4. An ending in stages with the fox on a burst of color (what is in the code now): "Okay, wow, I don't
   like it." He gave no reasons; he ran out of usage.

**Before building a fifth: ask him what he disliked about the fourth, with the pictures in front of
him** (`.impeccable/mocks/portal-2026-11-19/r7-*`). Do not guess and rebuild.

## What he has asked for, in his words

- "Liveliness, color, and their character appearing."
- Coins "go up into the corner with a little animation, like in 8-ball pool".
- No percent accuracy. Pacing should be noted.
- Level changes animate gradually: "It shouldn't just pop up on the screen."
- "There should be stages to this, and it all comes down into one full stage quiz engine ending."
- An animated transition the moment the last question is submitted; lots of information on both
  screens; a different layout for computer, iPad and iPhone; GSAP and three.js; Mobbin and REA for
  reference; a calm font (Hanken Grotesk), no serif titles; no white titles straight on the landscape.
- "Put all your effort into one idea. Don't try to do ten and then show them to me."
- Every activity needs both screens: skill set, Daily 10, strategy quiz, time trial, full-length exam,
  endless mode. Only the skill set has been attempted.

## Where the code is

- `src/components/quiz-flows/SetScreens.tsx` (SetStart, SetEnd), `ending.module.css`,
  `FlowStage.tsx`, `stage.module.css` (shared stage, back, Go button, veil), `stage-motion.ts`,
  `CoinBurst.tsx` (three.js coins that fly to a target), `shown-level.ts`.
- The character is `Fox` for everyone; the portal does not yet keep which character a student chose
  (`src/app/dev/shell/characters.tsx` has all sixteen faces).
- A level-up has not been watched in a browser: test runs answered wrongly, so the level never moved.

## Approved today, keep as is

- Settings: three sets of folders, new names, red Sign out, "Auto play"; inner pages headed by a round
  back button with the parent page in small words (`Where.tsx`).
- Phone quiz: one-row header with a proper Exit; answer box 20% shorter; the ORIGINAL number pad
  (three across, wide delete), now with no tray so its keys float on the landscape; the question card
  folds its header row away while the pad is up.
- Library on a phone: no placards; the book in the middle of the top half.
- Music pop-up lasts four seconds.

## Still on his list for the portal's design

Unlock animations for characters; a default profile picture unique to Karman, maybe random per
person; then the password lock on the site, retagging the bank into the 72 skills, wiring each screen
to real data, and the swap. Full detail: memory notes `project_decisions_nov18.md` and
`project_next_session_nov18.md`, and `prototypes/HANDOVER-next-session-2026-11-18.md`.
