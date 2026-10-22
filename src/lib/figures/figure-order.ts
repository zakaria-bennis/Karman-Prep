/**
 * Figure placement on every student surface (founder, 2026-10-21): a Reading and Writing
 * question shows its figure (table, graph, chart, image, any kind) first, then the passage,
 * then the question. Math keeps its existing order.
 */
export function figureLeadsText(subject: string | null | undefined): boolean {
  return subject === "reading";
}
