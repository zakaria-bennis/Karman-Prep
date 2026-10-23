// OCR'd SAT sources often store an em dash as "---" or "----", sometimes with spaces around it.
// Display-only: a lone run of exactly 3 or 4 hyphens in prose becomes one "—" and the spaces or
// tabs beside it are dropped (SAT em dashes are unspaced). Callers pass prose only, never math.
// Single and double hyphens, runs of 5 or more, and runs touching "|" or ":" (Markdown table
// rules like "|---|" or ":---:") stay literal. Approved source text is never altered.
const DASH_RUN = /(?<![|:-][ \t]*)[ \t]*(?<!-)-{3,4}(?!-)[ \t]*(?![ \t]*[|:-])/g;

export function displayEmDashes(text: string): string {
  return text.includes("---") ? text.replace(DASH_RUN, "—") : text;
}
