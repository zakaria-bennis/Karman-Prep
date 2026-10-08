# Vocabulary integration contract

This branch adds two self-contained client components for KARMAN Prep. The router owner chooses placement and links; this branch does not change app routes or deployment settings.

## Components

- `@/components/vocabulary/DailyWordLab`: a daily context clue, six letter guesses, positional feedback, and a meaning reveal after a win or loss.
- `@/components/vocabulary/WordPartFlashcards`: literal word-part front and meaning back, filtered to prefixes, suffixes, or roots.

Both components fit inside the existing `LearnLayout` and use the current Tailwind theme tokens and typefaces. They need no props, action, database table, grant, credential, or paid service. They can be mounted together or separately. Example route body for the router owner:

```tsx
import DailyWordLab from "@/components/vocabulary/DailyWordLab";
import WordPartFlashcards from "@/components/vocabulary/WordPartFlashcards";

export default function VocabularyPage() {
  return (
    <main className="min-h-screen bg-night px-4 pb-10 pt-28 text-ivory sm:px-8 sm:pt-32">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
        <DailyWordLab />
        <WordPartFlashcards />
      </div>
    </main>
  );
}
```

If mounted under `/learn`, its existing layout supplies the auth guard and navigation shell. Main engineering owns the route and navigation entry.

## State and content

The puzzle day is the UTC calendar date; it rolls over at 00:00 UTC. The component schedules the next UTC midnight and refreshes on window focus or visibility return. Guesses are saved to `localStorage` under `karman:vocabulary:daily:v1:YYYY-MM-DD`. A storage event refreshes another open tab. The display explicitly says guesses stay on the current device. There is no account mastery or cross-device sync. The twelve reviewed starter answers rotate every twelve days until a larger reviewed collection is accepted. The exact answer is present in the client bundle, so the feature is practice rather than a secure competition.

`src/data/vocabulary/content.ts` exports `DailyWord { word, context, meaning, sourceUrl }` and `WordPartCard { id, group, front, meaning, example, sourceUrl }`. Answer words are uppercase English letters, five to eight characters. The context uses one `_____` blank. The corpus is a bounded starter collection; expansion can preserve these types. Word guesses are checked against same-origin `/public/vocabulary/guesses-{length}.txt`, loaded only for the current answer length. A missing list blocks submission and offers retry; it never silently accepts a nonword.

No grammar game is included in this slice.
