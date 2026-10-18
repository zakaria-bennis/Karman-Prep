# Karman calculator

An original graphing and scientific calculator with no runtime dependencies,
remote calculator API, proprietary component, API key or licensing fee.

## Run and edit

Open `src/index.html`, or from the repository root run:

```sh
npm run calculator:build
python3 -m http.server 4320 --directory karman-calculator/src
# http://localhost:4320
```

Edit the separate, bounded modules in `lib/`, plus `src/index.html` and
`src/style.css`. `build.mjs` generates the self-contained `src/calculator.js`,
copies the three distribution files to `public/karman-calculator/`, and generates
a content-based version for the quiz loader. The generated bundle is the only
large file. Prettier is a build-time dependency, not a calculator dependency.
The same three distribution files also work on any static host without a build.

## Working with math

- Enter `a=2` for an adjustable parameter, then `y=a*x^2`. Every constant slider
  has editable minimum, maximum and step values.
- Enter `x^2+y^2=25` for an implicit circle or `x*y=6` for a hyperbola. Inequality
  regions such as `x^2+y^2<=25` are shaded. Explicit curves, vertical lines,
  coordinate points and one-argument functions also work.
- **Add table** creates editable x₁/y₁ columns. Choose a linear, quadratic,
  exponential or constant model and press **Add regression**. Custom models can
  use `y1~m*x1+b` notation. Constant regression uses `y1~b`.
- Regression displays fitted coefficients, R², signed Pearson r and RMSE. R² is
  `1 - sum(residual²)/sum((y-mean(y))²)`; it is undefined for constant target data.
  Pearson r describes the observed x/y association and is undefined without
  a varying independent column. It is not signed square-root R² for nonlinear
  models. Moving a fit slider labels the result **Adjusted model**, updates the
  metrics, and **Refit data** restores the least-squares solution.
- Numeric suffixes render as subscripts while retaining their variable identity:
  `x1`, `x_1` and `x_{1}` become x₁; `a12` becomes a₁₂. Scientific notation such
  as `1e3` remains scientific notation.
- Angles start in degrees. Radians and complex arithmetic can be selected.
  Table coordinates and plotted curves require real numbers.

The parser constructs an allowlisted mathematical syntax tree before using
`new Function()`. Raw input is never executed. A matching interpreter handles
Content Security Policies that forbid function compilation. All computation
stays local. Figures, image files and saved graph documents cannot be imported.

Work is bounded to 32 expression rows, 2,048 characters/512 tokens per expression,
1,000 data pairs and eight regression parameters. Regression is numerical and
may report approximate convergence or reject non-identifiable models. Implicit
plots use a finite sampling grid: very small components, isolated points, sharp
features or high-frequency curves can be missed. Symbolic algebra, unrestricted
function languages and exact general equation solving are not implemented.

## Theme and quiz integration

Light mode blends the selected theme's canvas toward white; dark mode blends it
slightly toward black. The existing theme IDs and palette structure are unchanged.
All configured site palettes are tested for at least 4.5:1 curve contrast, 3:1
grid contrast and 7:1 axis contrast. Standard `.karman-theme-light` and
`.karman-theme-dark` hooks and the host's CSS tokens are supported.

`CalculatorSurface` mounts the exact standalone DOM, CSS and engine inside an
open shadow root. This isolates layout styles while inheriting theme tokens.
Practice, diagnostic, catalog practice and daily Math flows share this surface.
Reading/Writing cannot mount calculator controls. The existing shell keeps
window movement, mobile toggling, source export, paste validation and focus rules.
Question changes destroy the old instance; closing/reopening the window within
one question preserves work.

```js
const engine = window.KarmanEngineInstance;
engine.addExpression("a=2");
engine.addExpression("x^2+y^2=25");
engine.addTable([
  ["0", "1"],
  ["1", "3"],
  ["2", "5"],
]);
engine.addExpression("y1~m*x1+b");
engine.setTheme("dark");
engine.clearGraphExpressionsData(); // every question transition
```

The lifecycle hook removes data, parameters, fits, undo/redo, pointer gestures,
pending clipboard work and viewport changes, and restores degrees and a hidden
keypad. `destroy()` additionally removes listeners and observers. The quiz shell
uses `getExpressions()`, id-based `setExpressions()` upserts and `subscribe()`.

## Verification and deployment

```sh
npm run calculator:build
npx vitest run tests/unit/calculator/standalone.test.ts
npm run test:calculator -- --project=calculator-chrome --project=calculator-ios
node karman-calculator/tests/smoke.mjs
npx tsc --noEmit
npm run lint
npm run format:check
npm test
npm run check:sizes
npm run sync:taxonomy
# Load the existing production NEXT_PUBLIC_* build inputs without printing them.
npm run cf:build:release
npm run cf:deploy
```

Always build from the current live-source baseline before deploying; deployment
uploads `.open-next` and does not rebuild it. Verify the built artifact, retain
the preceding Worker version for rollback, and check the live Math flow and
`/karman-calculator/index.html` after release. Do not enable the development auth
bypass in production. See `docs/karman-calculator-verification.md` for release
results. Mobile tests use WebKit/iPhone emulation; a physical phone is optional.

## REA layout reference, October 16, 2026

REA ran isolated Chromium traces on the public homepage, graphing calculator,
assessment index and [College Board graphing version](https://www.desmos.com/testing/collegeboard/graphing).
Only observed structure and design values informed the independently written
implementation. No reference script, stylesheet, asset, icon font or API is
included in the three application files.

| Observed reference                                                | Karman design                                                     |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1280px desktop: 416px expressions, 864px graph                    | 32.5% sidebar, capped at 416px                                    |
| 390px mobile: graph above rows, about 42% graph height            | Vertical stack with 42% graph / 58% rows                          |
| Expression toolbar 48px; restrained neutral surfaces              | Compact toolbar, neutral light palette, native dark theme         |
| Keypad initially hidden; four main key rows and function controls | Hidden sliding tray, four main rows and scientific function strip |
| Grid settings float beside the wrench; Cartesian/polar choices    | Original square/radial settings panel                             |
| Reference angle default is radians                                | Degrees, as explicitly requested                                  |

Evidence identifiers: desktop `ev_38e87e3ff957ee3a826a6b08ed3caad9a3e50b5eeb9cdb1a6c6868d89d5e4817`;
assessment `ev_be50d8cae9d0840a89780d85d6415a75b6e444fa47f020b0a181e218fbbf4337`;
keypad `ev_f8cc390f73f263ecf3e709a95b352bf1f9d7380fb725e4f65fd267b2273c286b`;
settings `ev_256583a24563ca62769526c7a687a25fd1fa490e9f1ff3bd0f8602db1094c354`;
mobile `ev_6882330e9608c111cbb4f019e3b0da7af9b612a24dc4461b2da4466e2bbffd5c`.

These are bounded DOM/accessibility and network-event captures, not an inspection
of the Bluebook application's own window. Network response bodies were not
retained. Layout dimensions came from captured inline geometry; CSS values
came from captured style declarations, not a complete computed-style audit.
No pixel-identical or exhaustive behavior equivalence is claimed.
