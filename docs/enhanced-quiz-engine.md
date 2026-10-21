# Enhanced quiz engine: functional specification and implementation

## 1. Overview

The practice and diagnostic flows share a Blue Book-style workspace: passage/figure alongside the question, a main toolbar, a question guide, and question-scoped working tools. Existing answer scoring, hints, explanations, adaptive selection, diagnostic submission, and tutor flags remain intact.

The embedded calculator is original Karman code: its own parser and engine, MathQuill (vendored, MPL-2.0) for math entry and KaTeX for typesetting. Nothing depends on the Desmos API. No calculator license key, remote SDK, vendor iframe, or proprietary component is used.

Target platforms: current desktop browsers and mobile Safari/Chrome, with keyboard, mouse, touch, and stylus input. [FILL: approved Blue Book reference screenshot for exact visual comparison.] This is a familiar layout and interaction model, not a claim of pixel-for-pixel or complete mathematical equivalence.

## 2. UI Layout

- Reading & Writing: stimulus on the left; prompt, answer choices, and submission controls on the right. Paired passages remain separately labeled Text 1 / Text 2.
- Math with a table, chart, geometry figure, or image: figure left, prompt/answers right. Native tables retain selectable values and Transfer controls. Diagnostic records retain their existing passage and question content.
- No stimulus: collapse to one centered question column.
- Mobile: stack stimulus above question, with scroll access to all content. Working tools respect the viewport and safe areas.
- Practice explanations retain the existing side-by-side review layout.

## 3. Toolbar/Menu Bar components

The top toolbar provides Calculator (math only), Scratchpad, Highlight, Settings, and timer visibility. The bookmark control is at the top right. Diagnostic retains Exit and Questions; practice retains Close quiz and a footer Questions button. Tutor issue reporting remains a separate Flag action, not a bookmark.

The timer can be hidden with **Hide Timer** and restored with **Show Timer**. Hiding never pauses timing. Diagnostic keeps its section countdown and expiration behavior. Practice shows elapsed time for its current question. Visibility and animation preferences persist in browser storage, with a session-memory fallback if storage is blocked.

## 4. Transfer to Calculator

Eligible math in a question (equations, inequalities, functions, systems, coordinate pairs, tables and answer choices) gets a small icon-only **Transfer to Calculator** control. It appears on hover or keyboard focus; on touch, a tap selects the item and a second tap on the control transfers it, and answer choices show the icon in their tool cluster beside cross-out. A format chooser opens only when there is a choice (for example points or a table). Figures, images, graphs and other rich content never get a control. The rules are in `docs/superpowers/specs/calculator/c-transfer.md`.

## 5. Highlighting rules

Diagnostic passage selection creates a highlight automatically; practice uses the Highlight action after selecting. The toolbar **Highlight** action supports an existing selection, including mobile selection handles; Alt+H works with a keyboard selection in the passage. Each new highlight takes the next color from an eight-color cycle. Deletion does not reset the cycle.

Highlights support the existing annotation editor and removal. They do not change the answer or score. Passage text and annotation controls follow the current theme. Highlights reset with the practice question; diagnostic retains its existing per-question annotations during navigation.

## 6. Answer-choice interaction

A right-edge strike-through action appears on hover or keyboard focus and remains visible on touch devices. Its accessible label is **Cross out choice A** (or B/C/D), changing to **Restore choice A** when active. Crossing out never submits an answer. Restoring makes the option selectable again. Existing submitted-answer feedback remains visible.

Choice Transfer controls sit outside the answer button; a transfer never selects or submits that choice.

## 7. Scratch Pad specifications

**Scratchpad** is a floating nonmodal region with a draggable header, close control, and visible resize handle. It never exceeds 62% of viewport height, leaves screen margins, and has no dimming backdrop. The question stays accessible.

- **Typing**: editable text area. Enter adds a newline and never advances the quiz.
- **Drawing**: pointer/stylus strokes, theme-aware default ink, nine preset colors plus a full custom color picker.
- **Stroke eraser**: touching a stroke removes that complete stroke.
- **Precision eraser**: removes touched segments, splitting strokes; this is the partial-stroke alternative to the Notability-style whole-stroke eraser.
- **Undo stroke**: removes the last remaining stroke.
- **Clear All**: clears drawing and typed text.
- Closing and reopening on the same question preserves work. Every question change, including returning to a question, starts with an empty scratch pad.
- Resize and move work through pointer handles and arrow keys on the respective focused handles. Rotation clamps the panel back into the viewport.
- Switching Typing/Drawing preserves each mode's work. Nothing is stored remotely.

## 8. Calculator integration

Calculator is available only when both the section and question are math and the quiz is active. Reading & Writing exposes no calculator or Transfer controls. Each question owns a fresh calculator scope; navigation destroys expressions, tables, sliders, the graph view, undo history and pending clipboard operations, while the student's calculator settings (angle mode, grid, display size, contrast and the like) carry to the next question for the page session, and the window's mode, place and size are remembered across reloads (calculator spec S-9, AR-25, AR-58).

The calculator opens in a window. On a viewport at least 1024 px wide and more than 500 px tall it docks on the left on first open (and on every transfer) and shifts the question workspace to the right; the student can undock it into a floating window, maximize, minimize or close it. Any other viewport opens it full screen. A mobile side button opens it; closing restores focus. The main toolbar also has a Calculator button. The calculator code loads lazily, on first open or when a Transfer control is hovered, focused or used.

The keypad starts hidden and is toggleable. Angles are in radians by default (degrees in settings). Today it has expression rows, tables, graph pan/zoom/home, regressions with a Log mode option for exponential, power and logarithmic fits, complex arithmetic, points of interest and trace, all in original local code. Sliders, draggable points and paste are not built yet; the design doc's phase map (§7.1) schedules them. SAT-ineligible notes, folders, image import, and saved-graph import are absent. The calculator's specification is [the design doc](superpowers/specs/2026-10-16-calculator-design.md) and its appendices in [`superpowers/specs/calculator/`](superpowers/specs/calculator/), which define the mathematical scope, numerical limits and regression statistics.

## 9. Navigation controls

**Previous** and **Next** provide a 150 ms directional pan. **Settings → Question animations** disables it; system reduced-motion settings take priority. First-question Previous is disabled. Diagnostic keeps its existing Skip this question and See My Results submission actions. Practice retains Submit Answer, explanations, and Finish.

Diagnostic navigation restores already-recorded selections and never permits re-scoring a submitted answer. Practice allows review of every selected question; its next unseen question is still chosen adaptively after an answer, preserving the core engine. The current answer draft survives reviewing a prior practice question. Reviewing prior answers does not trigger automatic advancement.

## 10. Question guide pop-up behavior

**Questions** opens a theme-aware dialog. Practice uses numbered tiles; diagnostic retains its prompt-based guide. Both distinguish the current question, answered questions and bookmarks without relying on color alone. Disabled tiles explain locks. Selecting an available tile navigates and closes the guide. Escape, the close button, and backdrop click dismiss it. Keyboard focus stays inside and returns to the opener after dismissal.

## 11. Module navigation restrictions

The user clarified: **free navigation within the current module; other modules locked**. Diagnostic's existing Math and Reading & Writing sections act as its modules. The guide and navigation handler both reject cross-module jumps. Only sequential completion or timer expiration advances the active section; the previous section is then locked.

Practice is one adaptive topic module. Selected questions are reviewable; future adaptive questions cannot be opened before selection. Retaking begins a new attempt. [FILL: numbered SAT module metadata if full-length two-module sections are introduced later.] This change does not invent new exam modules or alter question-selection/scoring contracts.

## 12. Theming considerations

All new workspace surfaces, controls, guide, menus, scratch pad, and default ink consume Karman's existing semantic surface/text/border tokens. Light/dark updates are immediate. User-selected ink colors stay as chosen; switching themes does not alter a drawing's meaning. Calculator UI uses system Arial and KaTeX math typography without downloading proprietary fonts.

## 13. Accessibility & performance notes

- Labeled controls, button states, non-color-only status, 44 px touch targets for working controls, keyboard navigation, Escape dismissal, and focus return.
- No physical-phone approval requirement: explicitly overridden by the user. Automated mobile WebKit and desktop checks remain part of verification.
- Local arithmetic, lazy-loaded calculator engine, bounded expressions/regression observations/iterations, and deferred graph computation.
- Vector scratch strokes survive resizing; limits of 500 strokes and 5000 samples/stroke bound memory.
- No changes to authentication, student database schema, payments, or released-exam ingestion.

## Required-feature checklist

- [x] Blue Book-style responsive stimulus/question layout; single column without stimulus.
- [x] Icon-only Transfer to Calculator controls with hover, focus and touch flows.
- [x] Coordinate/table transfer formats; no figure/graph import.
- [x] Hide/show timer, Highlight color cycling, right-edge strike-through.
- [x] Scratchpad typing/drawing, full color picker, Clear All, whole/partial stroke erasers.
- [x] Movable/resizable nonmodal scratchpad; reset per question.
- [x] Original Karman calculator in every math flow, mobile toggle, wide-screen docking.
- [x] Next/Previous, directional pan, animation setting, reduced-motion override.
- [x] Bookmark and accessible question guide; cross-module locks in UI and handler.
- [x] Active theme applied across all new components.
- [x] Regression statistics and SAT log mode as the calculator spec defines them.
- [x] Optional audio/Braille and undocumented inference panels omitted.
- [ ] Pixel-exact comparison pending the requested reference asset; not a release gate.
