// AR-19: the only viewport breakpoints v2 calculator code may use. v1 keeps its own 1100 px dock
// rule in CalculatorScope (AR-8); breakpoints.test.ts scans the v2 files for any other query.

/** The narrowest viewport, in CSS px, that docks or floats the v2 window (L-5). */
export const CALCULATOR_DOCK_MIN_WIDTH = 1024;

/** Viewports narrower than the dock width, or 500 px tall or less: the window opens full screen. */
export const FULL_SCREEN_QUERY = "(max-width: 1023px), (max-height: 500px)";

/** Phone-sized viewports: 767 px wide or less, or 500 px tall or less. */
export const PHONE_QUERY = "(max-width: 767px), (max-height: 500px)";
