# Vocabulary reflow QA

Checked 2026-10-08 in the same `max-w-6xl grid gap-6 px-5 sm:px-8 lg:grid-cols-2` wrapper used by the integration branch's Daily Learning hub. A 320 CSS-pixel viewport represents a 640-pixel viewport at 200% browser zoom. Both vocabulary sections now allow their grid tracks to shrink with `min-w-0`, including the daily game's loading state.

Chromium and WebKit checks at 320 pixels covered the Observatory and Ivory themes, five- and eight-letter puzzles, playing and completed states, a loss with the meaning revealed, and flipped flashcard notes. In each case `document.documentElement.scrollWidth` was 320 pixels and each section's right edge was 300 pixels. The five-, seven-, and eight-letter playing and win states were also checked in Chromium with valid wrong guesses and answer submission. The daily answer is not disclosed before play.

The vocabulary sections had zero axe WCAG 2 A/AA and 2.1 A/AA violations in both themes at 320 pixels. A page-wide scan reported one color-contrast violation in the existing site feedback cookie banner's Allow button, outside these sections; this is an integration follow-up for the shared shell.

Screenshots: [dark playing at 320 px](vocabulary-screenshots/observatory-zoom200-playing.png), [dark eight-letter win at 320 px](vocabulary-screenshots/observatory-zoom200-eight-complete.png), [light five-letter loss at 320 px](vocabulary-screenshots/ivory-zoom200-loss.png). Additional desktop and 375-pixel screenshots are in `docs/vocabulary-screenshots/`.
