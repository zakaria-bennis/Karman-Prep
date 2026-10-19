// The calculator's Escape layers (KB-3; 01-interfaces-integration.md section 11). Every closable
// layer pushes itself while open. Escape closes one layer per press by rank, not push order: any
// menu, popover or picker first, then the Functions panel, the ABC page and the keypad; only when
// no layer is left does 10's App close the calculator itself.

import { createContext } from "react";

export interface EscapeLayer {
  id: string;
  close(): void;
}

export interface EscapeStack {
  push(layer: EscapeLayer): () => void;
  handleEscape(): boolean; // closes the top layer; true when one closed (KB-3)
}

/** Layer ranks; a higher rank closes first. Any other id (a menu, popover or picker) ranks 4. */
export const ESCAPE_RANK: Readonly<Record<string, number>> = Object.freeze({
  keypad: 1,
  letters: 2,
  functions: 3,
});

const OTHER_RANK = 4;

function rankOf(id: string): number {
  return Object.prototype.hasOwnProperty.call(ESCAPE_RANK, id) ? ESCAPE_RANK[id] : OTHER_RANK;
}

export function createEscapeStack(): EscapeStack {
  // One entry per push, in push order, so the same layer pushed twice is two entries.
  const entries: { layer: EscapeLayer }[] = [];
  return {
    push(layer) {
      const entry = { layer };
      entries.push(entry);
      return () => {
        const index = entries.indexOf(entry);
        if (index >= 0) entries.splice(index, 1);
      };
    },
    handleEscape() {
      let top = -1;
      for (let i = 0; i < entries.length; i++) {
        // >= so that the latest push wins a tie
        if (top < 0 || rankOf(entries[i].layer.id) >= rankOf(entries[top].layer.id)) top = i;
      }
      if (top < 0) return false;
      const [{ layer }] = entries.splice(top, 1);
      layer.close();
      return true;
    },
  };
}

export const EscapeContext = createContext<EscapeStack | null>(null);
