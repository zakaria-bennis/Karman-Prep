# Vocabulary integration contract

The deployed `/learn/daily` route already mounts these two client components. This branch expands the answer pool and the long-word board within `DailyWordLab`; it makes no router, navigation, or deployment-setting changes. Main engineering owns integration, independent review, and release.

## Components

- `@/components/vocabulary/DailyWordLab`: unprompted daily letter guessing, positional feedback, and a meaning reveal after a win or loss.
- `@/components/vocabulary/WordPartFlashcards`: literal word-part front and meaning-only back, filtered to prefixes, suffixes, or roots. An optional disclosure after flipping contains notes and sources.

`src/app/learn/daily/page.tsx` already supplies both components to `DailyLearningHub`, within the existing `LearnLayout` auth guard and navigation shell. The components use current Tailwind theme tokens and typefaces. This expansion needs no new props, action, database table, grant, credential, or paid service. Main engineering should apply this branch on top of live commit `682bd288`, request the same independent QA, and release only after that review.

## State and content

The puzzle day is the UTC calendar date; it rolls over at 00:00 UTC. The component schedules the next UTC midnight and refreshes on window focus or visibility return. Existing nonempty `karman:vocabulary:daily:v1:YYYY-MM-DD` guesses keep that date's original 12-word answer and continue writing v1, including across the content upgrade or an already-started day after midnight. New games write `karman:vocabulary:daily:v2:YYYY-MM-DD` with a stable `wordId` and guesses so later pool reorderings do not change a saved answer. A storage event refreshes another open tab. The display explicitly says guesses stay on the current device. There is no account mastery or cross-device sync. The original schedule remains in force through 2026-10-08 UTC; the ID-derived 84-word cycle starts 2026-10-09 UTC. The exact answer is present in the client bundle, so the feature is practice rather than a secure competition.

`src/data/vocabulary/content.ts` exports `DailyWord { id, word, meaning, sourceUrl, partOfSpeech?, caution?, satSourceUrl?, observedForm?, evidenceLevel? }` and `WordPartCard { id, group, front, meaning, variants, caution, sameFrontCardIds, sourceUrls }`. The daily answers are 73 official-practice answer-choice records plus 11 distinct original starters. Full answer provenance and the generator are in `docs/vocabulary-source/` and `scripts/vocabulary/build-daily-deck.mjs`; the 415-card word-part source remains in `public/vocabulary/reviewed-word-parts.json`. Word guesses are checked against same-origin `/vocabulary/guesses-{length}.txt` for lengths 5–15, loaded only for the current answer length. A missing list blocks submission and offers retry; it never silently accepts a nonword. The answer set is separate from the much broader accepted-guess lists. Long boards use one horizontally scrollable, keyboard-focusable grid with 32-pixel tiles; the input and on-screen keyboard remain in view. See `docs/vocabulary-content.md` for coverage and limitations.

No grammar game is included in this slice.
