# Quiz calculator integration

`CalculatorScope` gates Math eligibility and question lifetime.
`CalculatorShell` owns the desktop/mobile window and validated source paste.
`CalculatorSurface` loads the versioned, original standalone calculator from
`public/karman-calculator/` into a shadow root. Its parser, renderer, regression,
sliders and controls have no runtime library or hosted API dependency.

Source and build instructions: [standalone README](../../../karman-calculator/README.md).
The prior React calculator UI has been removed. The older math helpers in
`src/lib/calculator/` remain for their existing unit tests; they are not imported
by the new runtime. Paste, eligibility and type contracts remain shared.
