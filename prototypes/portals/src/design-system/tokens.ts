/**
 * The design tokens as data, for the kitchen sink and for anyone building a screen.
 * The CSS lives in tokens.css (generated from themes.json by scripts/tokens.mjs).
 * Colour tokens are "r g b" channels on html[data-theme=<id>], used as
 * rgb(var(--k-name) / alpha) and as Tailwind colours of the same name.
 */
export const COLOR_TOKENS = [
  ["canvas", "The page ground. The background world draws on it."],
  ["surface", "Cards and sheets. One tone step off the canvas."],
  ["raised", "A second step: hover rows, tracks, wells."],
  ["panel", "The Panel recipe: 92 percent surface over canvas, opaque."],
  ["line", "The hairline edge: border at 24 percent over surface, about 1.5:1 on a dark canvas."],
  ["text", "Primary ink. Running text is always this."],
  ["muted", "Secondary ink. 4.5:1 on canvas, surface, raised and panel."],
  ["border", "Control edges and dividers at full strength."],
  ["gold", "Gold text (token counts). The coin itself uses the fixed --k-coin-* gold."],
  ["math", "The Math subject colour in figures and charts."],
  ["reading", "The Reading and Writing subject colour."],
  ["accent", "The theme's accent: the one highlighted action and the main data series."],
  ["accent-ink", "Text on an accent fill."],
  ["positive", "Good change as text. Says good, not up."],
  ["positive-bg", "Pale positive pill fill."],
  ["positive-ink", "Text on the positive pill."],
  ["negative", "Bad change as text, and the one red mark per object."],
  ["negative-bg", "Pale negative pill fill."],
  ["negative-ink", "Text on the negative pill."],
  ["notice", "A quiet warning as text."],
  ["notice-bg", "Pale notice pill fill."],
  ["notice-ink", "Text on the notice pill."],
] as const;

export const TYPE_SCALE = [
  ["title", "24/28, 600, -0.01em", "The one h1 per screen."],
  ["section", "16/22, 600", "Section and card titles."],
  ["body", "15/22, 400", "Running text. Never smaller."],
  ["dense", "14/20, 400", "Table cells, row sublines, labels in dense views."],
  ["small", "12/16, 500", "Meta, axis ticks, pill text. Nothing under 11px."],
  ["kpi", "24/28, 500", "A headline figure. Tabular."],
  ["kpi-lg", "36/40, 500, -0.015em", "The one answer figure on a screen."],
] as const;

export const RADII = [
  ["chip", "4px", "Pills inside rows, chips."],
  ["control", "6px", "Inputs, segmented tracks, small buttons that are not glass."],
  ["card", "8px", "Cards and rows."],
  ["panel", "12px", "The Panel recipe."],
  ["pill", "999px", "Glass controls."],
] as const;

export const SPACING_BASE = 4;

export const Z_LAYERS = [
  ["rail", 10, "The desktop icon rail and the phone bottom bar."],
  ["sticky", 20, "The top bar."],
  ["scrim", 39, "The scrim under a sheet."],
  ["sheet", 40, "Sheets."],
  ["toast", 50, "Toasts and the notification stack."],
  ["confetti", 60, "The confetti canvas."],
] as const;

export const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
