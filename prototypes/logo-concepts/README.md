# Logo concepts (12 Nov 2026)

For review only. Nothing in `src/` uses these files, and the live logo (`src/components/shared/KarmanLogo.tsx`) is unchanged.

Open `index.html` in a browser. It shows:

- **16 logos** that write themselves (tap to replay, or switch to the still).
- **9 intro screens**, each shown beside the logo it suits best: the first two or three seconds of a first visit, where the logo signs in and flies up to the top left while the home page arrives. Every intro can be skipped, and with reduced motion on it is skipped entirely.

`previews/all-light.png` and `previews/all-dark.png` show every logo at rest.

## Files

- `svg/NN-name.svg`: the animated logo. Colours come from `--logo-ink` and `--logo-acc` (cream and soft gold in dark mode by default).
- `svg/NN-name-still.svg`: the same logo at rest, for places where motion doesn't belong.
- `tools/`: the Python that builds them. It shapes each word from a script font, traces the letters into pen strokes in writing order, and draws the word through a mask so it appears to be written. Needs `uharfbuzz fonttools scikit-image scipy numpy` and the fonts below in `tools/fonts/` (or `KARMAN_FONT_DIR`).

## Lettering

Concepts 1 to 10 and 12 to 16 start from free script typefaces under the SIL Open Font Licence (Great Vibes, Pinyon Script, Parisienne, Allura, Sacramento, Alex Brush, Mrs Saint Delafield, Monsieur La Doulaise, Italianno, Meow Script), with Hanken Grotesk for small caps. The licence allows a logo, but once a direction is chosen the letters should be redrawn so the mark is unique. Concept 11 already is: it reuses the founder's signature from the guarantee section.
