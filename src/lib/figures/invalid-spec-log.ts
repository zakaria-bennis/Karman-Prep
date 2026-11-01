/**
 * One console error per invalid figure_spec. Student surfaces pick a figure
 * (drawnFigure) and draw it (FigureFrame) on every render; both report an
 * invalid spec here, and each distinct error is logged only once per page.
 */
const logged = new Set<string>();

export function logInvalidSpec(error: string, fallback: boolean): void {
  if (logged.has(error)) return;
  logged.add(error);
  const shown = fallback ? "the stored older figure is drawn instead" : "nothing drawn";
  console.error(`FigureFrame: invalid figure_spec, ${shown}: ${error}`);
}
