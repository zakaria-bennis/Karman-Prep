// R-5 click to copy (owner, 2026-10-22): the text a row's value copies, and the clipboard write
// itself. navigator.clipboard.writeText first; where it is missing or refused, a hidden textarea
// and document.execCommand("copy"), with focus put back where it was. Neither path throws: the
// result says whether the text reached the clipboard.

import { fractionText, type DisplayFraction } from "@/lib/calculator/core/eval/fraction";

/**
 * What a row's value copies: exactly the shown value without the T-10 thin spaces, so "12345" for
 * a box showing 12 345, "-1/8" for a row shown as a fraction, and the shown list boxes joined by
 * ", " for a list.
 */
export function copiedValueText(
  boxes: readonly string[],
  fraction: DisplayFraction | null
): string {
  return fraction !== null ? fractionText(fraction) : boxes.join(", ");
}

/** The focused element, looking inside open shadow roots (the calculator mounts in one). */
function deepActive(doc: Document): HTMLElement | null {
  let active: Element | null = doc.activeElement;
  while (active?.shadowRoot?.activeElement != null) active = active.shadowRoot.activeElement;
  return active instanceof HTMLElement ? active : null;
}

function legacyCopy(text: string, doc: Document): boolean {
  const restore = deepActive(doc);
  const area = doc.createElement("textarea");
  try {
    area.value = text;
    area.setAttribute("readonly", "");
    area.setAttribute("aria-hidden", "true");
    area.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0;";
    doc.body.append(area);
    area.select();
    return typeof doc.execCommand === "function" && doc.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
    restore?.focus({ preventScroll: true });
  }
}

/** Writes `text` to the clipboard; resolves true once it is there, false if every path failed. */
export async function copyText(text: string, doc: Document = document): Promise<boolean> {
  const clipboard = doc.defaultView?.navigator.clipboard;
  if (typeof clipboard?.writeText === "function") {
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      // refused (no permission, not focused): the fallback below may still work
    }
  }
  return legacyCopy(text, doc);
}
