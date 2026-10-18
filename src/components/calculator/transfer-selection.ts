// Transfer tap rules (TR-54 to TR-58, AR-10) and the one-item selection store. Eager: no React and
// no DOM globals, so it is cheap on quiz routes and testable in node.
import type { TransferTrigger } from "@/lib/calculator-transfer/payload";

export const TAP_MAX_MOVE_PX = 10; // TR-55
export const TAP_MAX_MS = 500; // TR-55, TR-58

export interface PointerSample {
  pointerType: string;
  x: number;
  y: number;
  t: number; // event.timeStamp
}

const contact = (type: string) => type === "touch" || type === "pen";

/** A mouse, or a pen hovering with no button pressed; never touch (TR-54). */
export function isHoverPointer(event: { pointerType: string; buttons: number }): boolean {
  return event.pointerType === "mouse" || (event.pointerType === "pen" && event.buttons === 0);
}

/** A touch or pen contact that moved at most 10 px, lifted within 500 ms and left no selection. */
export function isTap(
  down: PointerSample,
  up: PointerSample,
  maxMovePx: number,
  selectionCollapsed: boolean
): boolean {
  if (!contact(down.pointerType) || !contact(up.pointerType)) return false;
  const moved = Math.max(maxMovePx, Math.hypot(up.x - down.x, up.y - down.y));
  return moved <= TAP_MAX_MOVE_PX && up.t - down.t < TAP_MAX_MS && selectionCollapsed;
}

/** The trigger of an activation: keyboard with no pointer, a hovering pen's click is mouse (AR-10). */
export function triggerFor(
  lastPointerDown: { pointerType: string } | null,
  revealedByHoverPen: boolean
): TransferTrigger {
  if (lastPointerDown === null) return "keyboard";
  if (lastPointerDown.pointerType === "touch") return "touch";
  if (lastPointerDown.pointerType === "pen") return revealedByHoverPen ? "mouse" : "touch";
  return "mouse";
}

export interface TransferSelection {
  questionKey: string;
  sourceId: string;
}

let current: TransferSelection | null = null;
const listeners = new Set<() => void>();

function set(next: TransferSelection | null) {
  current = next;
  for (const listener of [...listeners]) listener();
}

/** One tap-selected item at a time (TR-56); no timers, so it never times out (TR-57). */
export const transferSelection = {
  get(): TransferSelection | null {
    return current;
  },
  toggle(selection: TransferSelection): void {
    const same =
      current !== null &&
      current.questionKey === selection.questionKey &&
      current.sourceId === selection.sourceId;
    set(same ? null : { questionKey: selection.questionKey, sourceId: selection.sourceId });
  },
  clear(): void {
    if (current !== null) set(null);
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  resetForTests(): void {
    current = null;
    listeners.clear();
  },
};
