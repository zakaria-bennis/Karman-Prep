// The expression list panel (01-interfaces-integration.md section 11 and 09's Row DOM): a region
// named "Expression list" holding the "Expressions" list, one numbered row per engine row. The list
// toolbar and the Edit list bar join the list body in Task 4, motion in Task 6.

import type { JSX } from "react";
import { useEngine, useEngineSnapshot } from "../hooks/use-engine";
import { ExpressionRow } from "./ExpressionRow";

export interface ExpressionPanelProps {
  layout: "desktop" | "stacked";
  pointer: "fine" | "coarse";
  keypadOpen: boolean;
  onToggleKeypad(): void; // L-2 toolbar Keypad toggle
  onTouchFocusRow(rowId: string): void; // K-2: the shell decides whether the keypad opens
}

export function ExpressionPanel(props: ExpressionPanelProps): JSX.Element {
  const { rows } = useEngineSnapshot(useEngine());
  return (
    <section
      className="kc-list-panel"
      aria-label="Expression list"
      data-layout={props.layout}
      data-pointer={props.pointer}
    >
      <div className="kc-list-body">
        {/* role="list" keeps list semantics in WebKit, which drops them under list-style: none */}
        <ol className="kc-list" role="list" aria-label="Expressions">
          {rows.map((row, i) => (
            <ExpressionRow
              key={row.id}
              row={row}
              number={i + 1}
              keypadOpen={props.keypadOpen}
              onTouchFocus={props.onTouchFocusRow}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}
