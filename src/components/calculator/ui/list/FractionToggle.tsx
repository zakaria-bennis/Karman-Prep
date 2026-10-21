// R-5: the decimal/fraction toggle in a row's gutter, where the colour icon would be. It
// is a 29 px outlined circle with the fraction glyph at 0.5 opacity (0.7 hovered, 0.9 pressed);
// switched on, the circle fills with the ink and the glyph turns to the list colour. On a focused
// or selected row it turns white on the blue tab. Its name says what the row shows and what Enter
// does; Enter, Space, a click or a tap switches the row's value between decimal and fraction as one
// undo step, and a click leaves focus where it was, as the reference's does.

import type { JSX } from "react";
import { toggleRowFraction } from "@/lib/calculator/core/api/row-commands";
import { FractionGlyph } from "../../icons/list";
import { useEngine } from "../hooks/use-engine";
import { FRACTION_LABELS } from "./fraction-toggle";

export function FractionToggle(props: { rowId: string; asFraction: boolean }): JSX.Element {
  const engine = useEngine();
  return (
    <button
      type="button"
      className="kc-row-fraction"
      data-on={props.asFraction ? "true" : undefined}
      aria-label={FRACTION_LABELS[props.asFraction ? "fraction" : "decimal"]}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => void toggleRowFraction(engine, props.rowId)}
    >
      <FractionGlyph />
    </button>
  );
}
