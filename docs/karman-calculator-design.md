# Karman calculator implementation

The quiz calculator now uses the original self-contained distribution documented
in [karman-calculator/README.md](../karman-calculator/README.md). The three runtime
files are generated/copied into `public/karman-calculator/` and loaded by the
shared `CalculatorSurface` in Math practice and diagnostics, including catalog
and daily Math flows. The old React calculator UI has been removed.

The standalone source covers explicit/implicit graphs, editable tables,
least-squares regression and fit metrics, parameter sliders, numeric subscripts,
degree/radian processing, basic complex arithmetic, theme inheritance, pointer
and keyboard controls, and per-question cleanup. No hosted calculator API,
proprietary component, licensing fee or runtime library is required.

The existing theme palette structure, quiz routing, scoring, source approvals,
Reading/Writing restrictions and question persistence contracts remain intact.
See the standalone README for numerical bounds and limitations, and
[karman-calculator-verification.md](karman-calculator-verification.md) for release
verification. No exhaustive or pixel-identical equivalence is claimed.
