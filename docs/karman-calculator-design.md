# Karman calculator — implementation and setup

## Overview

The calculator is implemented in this repository: React expression editor, Canvas graph renderer, numerical regression and root finding, sliders, settings, keypad, and quiz integration. It uses **no Desmos API, SDK, component, CDN, or key**. The previous remote calculator loader has been removed.

The arithmetic/parser dependency is **mathjs (Apache-2.0)**; mathematical display uses the app's existing **KaTeX (MIT)**. These are bundled locally and do not require licensing fees or a hosted calculation service. Original implementation does not mean every dependency was written by Karman. Notices are in `public/calculator-notices.txt`.

The layout follows the familiar SAT calculator structure. College Board's [Bluebook tools page](https://bluebook.collegeboard.org/students/tools) and the calculator illustration on page 37 of the [Spring 2026 coordinator workshop](https://www.michigan.gov/mde/-/media/Project/Websites/mde/OEAA/MME/SAT-Suite/FINAL-011426-MI-SAT-SSD-Full-Workshop.pdf) provide context. No exact reference screenshot was supplied with this request. This is an independently implemented approximation, not a claim of complete feature, accessibility, or pixel parity.

## Run locally

```sh
npm ci
npm run dev:calculator
# http://127.0.0.1:4317/?flow=practice
# http://127.0.0.1:4317/?flow=diagnostic
```

The preview uses the real calculator and quiz components with synthetic questions and stubbed persistence. It needs no credentials and does not submit student answers. Add `&subject=reading` to verify math-only access. Preview theme and retake buttons are development controls; they do not ship in the app.

For the real application, use the existing `.env.example` configuration and `npm run dev:next`. The calculator needs no additional environment variables. Open a math practice or diagnostic question, then select Calculator.

For a phone on the same Wi-Fi:

```sh
CALCULATOR_FIXTURE_HOST=0.0.0.0 npm run dev:calculator
# Open http://<Mac-LAN-IP>:4317/?flow=practice on the phone.
```

Clipboard reading requires HTTPS or localhost. On plain LAN HTTP, source paste buttons and the manual text-paste fallback remain available.

## Live site

The calculator is already wired into both quiz flows. Follow the repository's review/release workflow, then build and deploy together:

```sh
npm run cf:build
npm run cf:deploy
```

The build bundles the calculator and open-source math dependencies with the application. No external calculator script is fetched at runtime. A successful build does not itself publish the website.

## UI Mockups

```text
Desktop
┌ Karman Calculator          Graphing / Scientific  Paste  □  × ┐
│ +  ↶  ↷  clear  ?  ‹ │                                   ⚙ │
│ 1  y = x² − 3       │          graph                      + │
│ 2  a = 2            │                                     − │
│    ◁────●────▷      │                                     ⌂ │
│ 3  table / fit      │                                       │
├──────────────── optional keypad ────────────────────────────┤
│ Keypad toggle                       Paste points as …       │
└────────────────────────────────────────────────────────────┘

Phone portrait: title → graph → scrollable rows → optional keypad → footer.
Phone landscape: rows beside graph; controls and keypad remain in the overlay.
```

## Feature List

- Explicit functions and equations, implicit curves, inequalities with shading, visible scalar roots, polar and parametric curves, domain restrictions, piecewise expressions, coordinate points and paired lists.
- Basic/scientific arithmetic, powers, roots, trigonometry and inverse trig, logarithms, factorials, combinations, permutations, list statistics, and complex arithmetic.
- Degree mode by default; radians and complex mode are selectable.
- Real-time variable dependencies, one-argument user functions, adjustable/animated sliders, draggable literal coordinate points.
- Editable two-column tables; linear, quadratic, exponential, power and constant regression templates; custom `~` models with up to eight parameters. Fit coefficients, R², Pearson r, RMSE and residuals are shown where defined. Non-convergence is disclosed.
- Square, radial or hidden grid; axis visibility/numbers; numeric bounds; wheel/pinch/button zoom; pointer pan; origin-centered, proportionally scaled Home view.
- Click near a function intercept, turning point or intersection for coordinates.
- Add expression/table (SAT disables notes and folders), hide/recolor/reorder rows, collapse the list, undo/redo, clear with undo, independent graphing and scientific workspaces.
- Keypad hidden at graphing launch; source paste and manual/clipboard paste; imported tables use `x_1` and `y_1`. Images, figures, file drops, graph URLs and serialized graph state are rejected.

### Example expressions

```text
sin(30)                        → 0.5 in degree mode
f(x)=x^2-3                     → function plot
a=2                            → adjustable slider
y=a*x+1                        → updates with a
x^2+y^2=25                     → implicit circle
x^2=4                          → x = −2, 2 in the visible range
y<=x+2                         → shaded inequality
y=x^2{x>0}                     → domain restriction
y={x<0:-x,x^2}                 → piecewise
r=2sin(theta)                  → polar curve
(cos(t),sin(t))                 → parametric curve, 0 ≤ t ≤ 1
(2,3)                          → draggable point
mean([1,2,6])                  → 3
y_1 ~ m*x_1+b                  → regression on a table
```

Use `^` for powers, `sqrt(...)` for square roots and `*` for explicit multiplication. Common pasted LaTeX, including fractions, roots and subscripts, is normalized. Unknown commands display errors rather than silently returning an answer.

### Scope and numerical limits

This implementation covers the listed core features. It does not implement every feature of the reference product: statistical inference panels, audio trace/Braille editing, symbolic algebra/calculus, 3D/geometry, distribution objects, or all proprietary shortcuts. Parametric input currently uses a fixed `t` range of 0–1. Only literal coordinate points are draggable. Scientific mode uses the shared expression/history editor and scientific keypad.

Graphs, visible roots, turning points, intersections and regressions are numerical approximations. Very narrow implicit features, discontinuities and off-screen roots can be missed; the UI does not present numerical scanning as a proof of all roots. A poor or underdetermined fit can fail. R² is undefined for constant response data; Pearson r is undefined without paired varying data.

Bounds: 250 rows, 4,096 source characters per expression, 1,000 values in a generated range, 10,000 imported table rows (paged in the editor), 2,000 observations per regression, eight regression parameters and 80 undo snapshots. Exceeding an import/fit limit produces a message. No imported table is silently truncated.

## Component Architecture

| File / directory                                             | Responsibility                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `src/components/calculator/CalculatorScope.tsx`              | Math eligibility, per-question lifetime, theme source, focus and phone launcher |
| `CalculatorShell.tsx`, `CalculatorSurface.tsx`               | Window, lazy loading, paste bridge, graphing/scientific lifetime                |
| `CalculatorEngine.tsx`, `ExpressionRow.tsx`                  | Row editor, commands, tables, sliders, fit results                              |
| `GraphView.tsx`, `GraphSettings.tsx`, `CalculatorKeypad.tsx` | Pointer/keyboard controls, settings and keypad                                  |
| `useCalculatorModel.ts`                                      | Local row state, grouped editing and bounded undo/redo                          |
| `src/lib/calculator/syntax.ts`, `math.ts`                    | Math normalization, parser allowlist and scalar/list/complex evaluation         |
| `scene.ts`, `regression.ts`, `numerics.ts`, `plot.ts`        | Dependencies, fitting, numerical roots and Canvas rendering                     |
| `paste.ts`, `eligibility.ts`, `types.ts`                     | Validated input, access rules and the Karman data model                         |

No code is evaluated through JavaScript `eval` or `Function`. The math AST excludes assignments, arbitrary object access, range allocation and unapproved function calls. Calculator state stays in component memory, not local storage, the database or analytics.

## Integration Steps

1. Both adaptive practice and diagnostics mount the same scope, keyed by attempt/question identity.
2. The scope is available only while the active section **and** question are math.
3. Changing a question or retaking destroys row data, slider animation, undo history, settings and pending clipboard imports. Closing/reopening within the same question preserves work.
4. Quiz keyboard handlers ignore calculator events. Mobile focus is contained; closing restores focus.
5. Source math and two-column tables use the scope's validated paste action. Figures have no paste action.

## Mobile Adaptation

Below 768px width or 500px height, the calculator becomes a full-height overlay with a side launcher. Phone portrait puts the graph above the rows. Pointer Events implement pan, point drag and two-pointer pinch; the graph uses device pixel ratio for clarity. Safe-area padding and dynamic viewport height keep controls reachable. Browser emulation does not establish physical touch latency; physical-device review is optional and is not a release requirement.

## Theming

The existing Karman theme context controls the entire calculator. All locally implemented menus, inputs, graph paper and results use scoped light/dark colors. Arial controls and locally bundled KaTeX math keep the familiar academic calculator appearance. Theme changes do not erase work. Transitions are short and respect reduced motion.

## Testing Checklist

```sh
npx vitest run src/lib/calculator
npm run test:calculator -- --project=calculator-chrome --project=calculator-ios
npx tsc --noEmit
npm run lint
npm run format:check
npm run cf:build
```

Browser tests cover both real quiz components with fixture persistence. They assert that the calculator works while all non-local requests are blocked, then exercise imports, keyboard editing, undo/redo, regressions, settings, layout, themes and lifecycle. See [the verification report](karman-calculator-verification.md) for current observed results rather than interpreting this checklist as a passing run.
