// Names for new tables and residual lists (D-4, TR-25, D-33): the lowest index whose names are all
// unused, so the first two-column table is x₁, y₁ and naming never fails. Names are row LaTeX
// (`x_{1}`), as analysis reads them. Pure TypeScript: no DOM.

/** D-4: x_n and y_n … y_{n+k-1} for the lowest n ≥ 1 with every one of them unused. */
export function nextTableNames(used: ReadonlySet<string>, ys: number): { x: string; ys: string[] } {
  for (let n = 1; ; n++) {
    const names = { x: `x_{${n}}`, ys: Array.from({ length: ys }, (_, k) => `y_{${n + k}}`) };
    if (!used.has(names.x) && names.ys.every((y) => !used.has(y))) return names;
  }
}

/** D-33: the lowest free e_k. */
export function residualName(used: ReadonlySet<string>): string {
  for (let k = 1; ; k++) if (!used.has(`e_{${k}}`)) return `e_{${k}}`;
}
