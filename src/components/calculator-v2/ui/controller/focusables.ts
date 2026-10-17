// KB-13 tab order helpers: the shell's tabbable elements in DOM order, never inside a hidden
// keypad or collapsed list, and the AR-28 sentinels' jump to the first or last of them.

const CANDIDATES = "button, input, select, textarea, [href], [tabindex]";
const HIDDEN_ANCESTOR = '[hidden], [inert], [aria-hidden="true"]';

function isTabbable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false;
  if (element.matches(':disabled, input[type="hidden"]')) return false;
  if (element.closest(HIDDEN_ANCESTOR) !== null) return false;
  const { visibility } = getComputedStyle(element);
  return visibility !== "hidden" && visibility !== "collapse";
}

/**
 * Buttons, inputs, selects, textareas, `[href]` and `[tabindex]` elements with tabIndex >= 0, in
 * DOM order, skipping disabled ones, those inside `[hidden]`, `[inert]` or `[aria-hidden="true"]`,
 * and those whose computed visibility is hidden.
 */
export function tabbables(root: ShadowRoot | HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(CANDIDATES)].filter(isTabbable);
}

/**
 * Focuses the first or last tabbable element of `root`. When one cannot take focus (for example,
 * a CSS rule hides it), the next one inward gets it.
 */
export function focusBoundary(root: ShadowRoot, edge: "first" | "last"): void {
  const ordered = tabbables(root);
  if (edge === "last") ordered.reverse();
  for (const element of ordered) {
    element.focus();
    if (root.activeElement === element) return;
  }
}
