# Accepted-guess corpus replacement: handoff for independent QA

Reviewed 2026-10-08 in an isolated clone. This change replaces every public 5–15-letter guess file that previously came from macOS `/usr/share/dict/words`. The 84-answer rotation, v1/v2 saved-game keys, six-guess scoring, and flashcard content are unchanged.

## Word-data rights and reproducibility

- Input: [SCOWLv2 `en_US-large.txt`](https://github.com/en-wl/wordlist-diff/blob/71d7dd07676edb60ade43552e10b41314b7e9287/en_US-large.txt), release `rel-2026.02.25`, commit `71d7dd07676edb60ade43552e10b41314b7e9287`, SHA-256 `fa1f9a1382df724be887d3a5d2d743095e6f33fc0949ebb22415c1554bb42fa7`.
- [The word-data copyright file at that commit](https://github.com/en-wl/wordlist-diff/blob/71d7dd07676edb60ade43552e10b41314b7e9287/Copyright) explicitly permits using, copying, modifying, distributing and selling SCOWLv2-derived word lists, subject to notices. Its SHA-256 is `090575a131b4260926c7a6b30a90aca0f5db5fbb5c46778e0c5855227bf6ebc3`. The exact upstream notice is embedded in [`public/vocabulary/NOTICE.txt`](../public/vocabulary/NOTICE.txt), linked from the game. Each distributed guess file starts with `# Copyright 2000-2026 by Kevin Atkinson` and points to that notice.
- Regeneration: download the input at the pinned commit and run `node scripts/vocabulary/build-guess-lists.mjs <downloaded-file>`. The script checks the input SHA-256 and combines the filtered source with both reviewed-answer datasets. It excludes uppercase, non-ASCII, punctuation, digits and lengths outside 5–15, then deduplicates and sorts each file.
- An independent set comparison against the downloaded input found **120,327 accepted spellings**, zero entries outside the pinned source, zero malformed or duplicate entries, and all 84 game answers present. Counts by length 5–15: `6982, 11728, 16982, 19568, 19015, 16113, 12018, 8202, 5145, 2907, 1667`. `STRAIGHTFORWARD`, the ordinary 15-letter guess used in the earlier browser review, remains accepted.

## Checks completed

- Focused component and logic tests: 12 passed. Full Vitest suite: **1,821 passed in 167 files**.
- `tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm run check:sizes`, and `git diff --check` passed.
- Local browser preview could not render `/learn/daily` in this clean isolated clone because it has no Clerk keys. The webpack dev server returned HTTP 500 at Clerk initialization; no production keys were copied. The previous [browser screenshots and behavior report](vocabulary-expansion-qa.md) validate the unchanged board and saved-game flow on the prior corpus. Independent QA should recheck a valid submitted guess and the notice link on this replacement commit in its configured preview.

## Integration

Cherry-pick the replacement commit on top of the previously supplied `79676a6f3dab27229c912759e8f7293a95700a47`, or cherry-pick both commits in order if the expansion is not integrated yet. The integration owner retains router and deployment control. Do not publish until independent QA has checked the replacement commit.
