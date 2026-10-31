# Prototypes

Design prototypes the founder has reviewed. They're references, not product
code: nothing in `src/` imports them, they're never deployed, and they're
left out of lint, type checks and formatting.

- `daily10-end/`: the approved Daily 10 end screen ("Box first", 2026-10-30).
  It covers the new-companion moment, one mystery box (open or save), the
  prize previewed on the fox, gold tokens with the payout sound, confetti, and
  a one-screen results layout. Open `daily10-end/index.html` in a browser
  (from disk, or any static server). The pickers along the top switch device,
  tokens, companion, the student's choice and the 21st.dev layer. Add `?app=1`
  for the phone app view.
  - It shows only score, answer path, section split, streak, skills that
    moved, next steps and tokens.
  - The other stats it collects (pace, hardest question right, slowest
    question, changed answers, set difficulty, cohort average and rank, misses
    reviewed, skills by level, skills covered, personal bests, days to the SAT)
    belong on the student dashboard.
  - Skill levels are four bars: Learning, Developing, Proficient, Mastered. Not
    started is four empty bars.
  - There's never a score estimate after a Daily 10.
  - The 21st.dev components it ports are credited by id in `kit.js`.
  - `daily10/bank.js` holds ten questions exported read-only from the question
    bank for the demo.
