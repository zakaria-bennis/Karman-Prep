# Practice presentation and local tools

Owner correction, 2026-10-09: question ordinals and current/total question counters belong only in a genuine full-length exam. All current lesson practice (including the legacy `realistic` option), catalog sessions, pool previews and short diagnostics are unnumbered. Diagnostic navigator entries use the prompt and saved state; bookmarked results and student saved-response reviews omit the question ordinal. Measured result totals, accuracy, hint budgets, section time, content fractions, paired-passage labels and numbers inside source material remain intact.

There is no full-length exam route/caller in this checkout. The legacy `realistic` option does not implement an exam length, module sequence or exam timer. It does not qualify for numbered question presentation.

## Reading and source fidelity

Reading presentation follows passage, associated native figure/table, prompt, choices and explanation in one vertical reading flow on desktop and phone. Canonical, lesson and diagnostic presentation preserve their existing content renderer and source bytes. Reviewed attribution, italics, underlines and mathematical content are not question metadata and must remain. Source IDs, original question ordinals and private answer provenance are not student chrome. Authorized admin inspector provenance remains available outside the student presentation.

## Persistence and interaction

- Lesson and catalog passage marks are keyed by question ID plus exact rendered-source inputs. Highlight and underline are independent; each mark has a local note and removal control. CSS Custom Highlights paint ranges without rewriting MathText or source DOM. Where that API is unavailable, quoted markings and notes remain usable below the passage.
- Diagnostic markings remain in the existing controlled per-question state. Mouse selection creates the selected mark type; the keyboard phrase path and Mark selection control offer alternative input. Overlapping highlight and underline remain independent. Notes can be saved with Enter, dismissed with Escape, reopened, edited and removed; save/cancel returns focus to the marking, and removal returns focus to the selected tool. Existing choice highlights, crossouts, bookmarks and hints retain their stable question identities.
- Scratchpad bitmaps are held per question in memory. Closing/reopening, question A → B → A and viewport resizing retain drawing. Clear affects the current question. Opening a new lesson/catalog session remounts the local tool store; leaving or reloading the page discards local marks, notes and drawings. These are not saved to a server or restored after reload.
- The diagnostic navigator retains exact same-section jump indexes and locks the other section. It has a labeled dialog, keyboard focus containment, Escape dismissal and return focus. Native controls own Enter/Space so marking cannot also fire the global next-question shortcut.
- Calculator access remains the existing Math-only external Desmos link in a new tab. No equations or tables transfer automatically.

## Verification boundary

Local component tests use mocked actions. The isolated browser fixture imports the actual components, QuizProvider, diagnostic state hook, theme definitions and existing release font bytes. Router/auth/actions/sound are stubbed; HTTP is blocked. Reviewed passage captures bind the existing reviewed fixture; paired passages and figure tables are explicit synthetic fixtures. They do not constitute a new source-PDF approval or question publication review.

Browser verification covers desktop and emulated phone layouts, native mouse selection (including a separately checked wrapped span), keyboard controls, touch button activation, actual canvas pixels and per-question restoration. Native operating-system touch text selection and physical iOS Safari remain outside the available evidence. The final handoff records exact source/fixture hashes and limits; production build, authenticated integration and live verification belong to the main deployment task.
