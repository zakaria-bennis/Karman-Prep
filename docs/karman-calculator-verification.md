# Karman calculator release verification

The release is built on the exact source of the previously active website:
`d01e4fdf3ba71db2074702dae39780dfc579ad9a`, Worker
`0977f3ad-ef5e-46ca-a6ca-38cfde302ec5`. It preserves the live homepage, catalog,
source-aware question rendering, account themes, server scoring and review contracts.
The earlier prototype on `fade5fe` is not the deployed baseline.

## Scope

- Original local graphing/scientific calculator; mathjs and KaTeX only. The old
  proprietary embed and its API-key configuration were removed.
- Math-only integration in adaptive practice, diagnostic, catalog skill practice
  and daily Math challenges. Reading/Writing never receives calculator controls.
- Theme-aware graph/editor, degree default, initially hidden keypad, paste actions,
  square/radial grid, regression with R² and signed Pearson r, sliders and points.
- Shared responsive scratchpad, typed/vector work, erasers and per-question clearing.
- Quiz toolbar, theme settings, timer visibility, highlights, bookmarks, navigation.
- Existing fixed diagnostic sections remain the module boundaries. Cross-section
  jumps stay locked. Sequential practice still delivers the next question after
  a saved response; available questions can be reviewed without resubmitting.

## Validation commands

```sh
npx tsc --noEmit
npm run lint
npm run format:check
npm test
npm run check:sizes
npm run sync:taxonomy
npm run test:calculator -- --project=calculator-chrome --project=calculator-ios
npm run cf:build:release
```

The browser suite uses real React question and calculator components with
synthetic questions; it stubs server actions, navigation, Clerk identity,
sound and telemetry. It does not submit real student answers. Cases cover
source transfer, rejected graph/image imports, keyboard isolation, touch
layout, regression, themes, late clipboard completion, retakes, scratchpad
clearing, saved-response review, highlights, guides and reduced motion.

Initial baseline integration: 2,238 unit/component tests passed. The final
release rerun and Worker activation are recorded below after verification.

Physical-phone approval is not required, as explicitly directed by the user.
WebKit iPhone emulation is not physical-iPhone testing. No approved Blue Book
screenshot was supplied; this is an original implementation with a familiar
layout, not a claim of pixel-identical or complete Desmos parity. Audio/Braille
and undocumented advanced inference panels are intentionally omitted.

## Release result

Pending final build and activation. Do not interpret a local test as a live deployment.
