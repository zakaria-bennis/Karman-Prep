// Places a position: fixed element at viewport coordinates. A transformed ancestor (the quiz
// window) makes fixed relative to it instead, so the offset is measured once and corrected, as
// RowTip.tsx does. DOM only.

export function fixAt(el: HTMLElement, left: number, top: number): void {
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  const r = el.getBoundingClientRect();
  if (Math.abs(r.left - left) > 0.5) el.style.left = `${2 * left - r.left}px`;
  if (Math.abs(r.top - top) > 0.5) el.style.top = `${2 * top - r.top}px`;
}
