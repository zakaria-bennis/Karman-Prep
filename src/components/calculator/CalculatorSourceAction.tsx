"use client";

import type { JSX } from "react";
import type { StemInput } from "@/lib/calculator-transfer/classify";
import { useCalculator } from "./CalculatorScope";
import { useTransferClassifier, type TransferClassifier } from "./transfer-classifier";

// AR-11 wrappers: each reads useCalculator once and renders the Transfer control while a
// calculator is mounted. The parts, the stem registry and which instances render a control
// included, come from the lazy transfer chunk (D4, transfer-items.tsx), so they render nothing
// until it has loaded.
function SourceTransfer(props: { part(t: TransferClassifier): JSX.Element }): JSX.Element | null {
  const t = useTransferClassifier(true);
  return t && props.part(t);
}

export function CalculatorSourceAction(props: {
  latex: string;
  segmentIndex?: number;
  stem?: StemInput;
}): JSX.Element | null {
  const bridge = useCalculator();
  if (!bridge) return null;
  return (
    <SourceTransfer
      part={(t) => <t.StemTransferAction {...props} questionKey={bridge.questionKey} />}
    />
  );
}

/** Choice actions are siblings of answer buttons, so a transfer never selects an answer. */
export function CalculatorChoiceAction(props: {
  text: string;
  letter: string;
  stem?: StemInput;
  slot?: "cluster";
}): JSX.Element | null {
  const bridge = useCalculator();
  if (!bridge) return null;
  return (
    <SourceTransfer
      part={(t) => <t.ChoiceTransferAction {...props} questionKey={bridge.questionKey} />}
    />
  );
}

/** A question table's control (TR-22), or a table choice's in its cluster (transfer-items). */
export function CalculatorTableAction(props: {
  rows: string[][];
  headers?: string[];
  layout?: "vertical" | "horizontal";
  itemId?: string;
  slot?: "cluster";
}): JSX.Element | null {
  const bridge = useCalculator();
  if (!bridge) return null;
  return <SourceTransfer part={(t) => <t.TableTransferAction {...props} />} />;
}
