# Karman Calculator

Original React controls, expression editor, Canvas graphing, numerical fitting and quiz integration. Arithmetic and parsing use bundled mathjs (Apache-2.0); typesetting uses KaTeX (MIT). **No Desmos API, SDK, remote calculator scripts, paid calculator license or API key.**

## Preview

From the repository root:

```sh
npm ci
npm run dev:calculator
```

Open `http://127.0.0.1:4317/?flow=practice` or `?flow=diagnostic`. The preview uses synthetic questions and does not save answers. Theme and retake buttons are preview-only. For a phone on the same Wi-Fi, start with `CALCULATOR_FIXTURE_HOST=0.0.0.0` and use the Mac's LAN address.

## Use in the app

Run `npm run dev:next`, then open a math question in either quiz flow. The shared `CalculatorScope` owns eligibility, themes and per-question state. `CalculatorShell` provides the window and controlled paste. `CalculatorEngine` is the independently implemented calculator.

Graphing starts in degrees with the keypad hidden. Try `y=x^2`, `a=2`, `y=a*x`, `(2,3)`, `x^2+y^2=25` or a table followed by `y_1~m*x_1+b`. Use `^` for powers and `sqrt(...)` for roots. Graphing and scientific workspaces preserve separate work within a question; both clear when the question changes.

## Verify and release

```sh
npx vitest run src/lib/calculator
npm run test:calculator -- --project=calculator-chrome --project=calculator-ios
npm run cf:build
# After the repository's release checks:
npm run cf:deploy
```

The production build bundles everything; no calculator configuration is needed. Clipboard reading requires HTTPS/localhost, with manual paste available otherwise.

See [implementation details and numerical limits](../../../docs/karman-calculator-design.md), [test results](../../../docs/karman-calculator-verification.md), and [third-party notices](../../../public/calculator-notices.txt). The core features are implemented, but this is not full feature-for-feature or pixel-identical parity with the reference product.
