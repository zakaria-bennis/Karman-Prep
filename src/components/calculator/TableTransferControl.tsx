"use client";

// The small copy-to-calculator button every Math table carries (TR-91 to TR-97, founder
// 2026-11-01). Lazy with the classifier (D4): only transfer-items.tsx imports it. Unlike the stem
// controls (TransferControl.tsx) it is always visible, so a mouse, a touch or a keyboard click
// transfers at once, with no hover reveal and no tap-select step. Its table glyph morphs into an
// arrow pointing up and to the left (toward the calculator) after a transfer, then morphs back.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { TransferItem } from "@/lib/calculator-transfer/classify";
import { useCalculator } from "./bridge-context"; // not CalculatorScope (AR-33)
import type { CalculatorBridge } from "./CalculatorScope";
import { isCoreRejection, reportTransferRejection } from "./transfer-report";
import { isHoverPointer, transferSelection, triggerFor } from "./transfer-selection";
import "./transfer-control.css";

export const TABLE_TOOLTIP = "Copy table to calculator"; // TR-92
export const TABLE_SENT_MS = 1800; // TR-94: the arrow holds for 1.5 to 2 s
const TOOLTIP_DELAY_MS = 300; // TR-51

/** TR-92: the button's name, made distinct by the table's label ("table 2", a title, "choice B"). */
export function tableControlName(label?: string): string {
  return label ? `${TABLE_TOOLTIP}: ${label}` : TABLE_TOOLTIP;
}

export interface TableTransferControlProps {
  item: TransferItem;
  accessibleName: string;
  /** corner: set into the table frame's top-right corner; cluster: a table choice's tool cluster */
  placement: "corner" | "cluster";
}

export function TableTransferControl(props: TableTransferControlProps): JSX.Element | null {
  const bridge = useCalculator();
  return bridge ? <Body {...props} bridge={bridge} /> : null;
}

/** Idle: a table with a header row and a first column. Sent: an arrow up and to the left. */
function TableGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <g data-transfer-morph="table">
        <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
        <path d="M2 6.5h12M2 10h12M6.5 6.5v7" />
      </g>
      <g data-transfer-morph="arrow">
        <path d="M12 12 4.5 4.5M4.5 10.5v-6h6" />
      </g>
    </svg>
  );
}

function Body({
  item,
  accessibleName,
  placement,
  bridge,
}: TableTransferControlProps & {
  bridge: CalculatorBridge;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const current = useRef({ bridge, item });
  current.current = { bridge, item };
  const lastDown = useRef<{ pointerType: string } | null>(null);
  const focusing = useRef(false);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tooltip, setTooltip] = useState(false);
  const [sent, setSent] = useState(false);

  const hideTip = useCallback(() => {
    if (tipTimer.current !== null) clearTimeout(tipTimer.current);
    tipTimer.current = null;
    setTooltip(false);
  }, []);
  useEffect(
    () => () => {
      if (tipTimer.current !== null) clearTimeout(tipTimer.current);
      if (sentTimer.current !== null) clearTimeout(sentTimer.current);
    },
    []
  );
  // TR-49: Escape hides the tooltip, without moving focus, and is consumed only when it did.
  useEffect(() => {
    if (!tooltip) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      hideTip();
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [tooltip, hideTip]);

  /** TR-94: the glyph shows the arrow for TABLE_SENT_MS after each transfer the calculator took. */
  const confirm = () => {
    if (sentTimer.current !== null) clearTimeout(sentTimer.current);
    setSent(true);
    sentTimer.current = setTimeout(() => {
      sentTimer.current = null;
      setSent(false);
    }, TABLE_SENT_MS);
  };

  async function activate(event: ReactMouseEvent) {
    event.stopPropagation(); // TR-41: never an answer handler's click
    const trigger = triggerFor(lastDown.current, false);
    lastDown.current = null;
    // TR-68: the control has focus before the window opens, so it is the opener on every engine.
    focusing.current = true;
    button.current?.focus({ preventScroll: true });
    focusing.current = false;
    hideTip();
    transferSelection.clear();
    const { bridge: now, item: target } = current.current;
    const result = await now.transfer({ ...target.payload, questionKey: now.questionKey }, trigger);
    if (
      result.status === "added" ||
      result.status === "renamed" ||
      result.status === "already-present"
    )
      confirm();
    else if (result.status === "rejected" && isCoreRejection(result))
      reportTransferRejection(
        now.questionKey.slice(now.questionKey.indexOf(":") + 1), // TR-73, as TransferControl
        target.ruleId
      );
  }

  return (
    <span
      data-transfer-control=""
      data-kind="table"
      data-source-id={item.sourceId}
      data-placement={placement}
      data-sent={String(sent)}
      onPointerLeave={hideTip}
    >
      <button
        ref={button}
        type="button"
        aria-label={accessibleName}
        onPointerDown={(e) => {
          lastDown.current = { pointerType: e.pointerType };
          e.stopPropagation();
        }}
        onPointerEnter={(e) => {
          if (!isHoverPointer(e)) return;
          current.current.bridge.prefetch();
          if (tipTimer.current === null)
            tipTimer.current = setTimeout(() => {
              tipTimer.current = null;
              setTooltip(true);
            }, TOOLTIP_DELAY_MS);
        }}
        onPointerCancel={() => (lastDown.current = null)}
        onKeyDown={(e) => {
          lastDown.current = null;
          if (e.key === "Enter" || e.key === " ") e.stopPropagation();
        }}
        onFocus={() => {
          bridge.prefetch();
          // TR-51: at once on keyboard focus; a pointer's own focus shows none.
          if (lastDown.current === null && !focusing.current) setTooltip(true);
        }}
        onBlur={() => {
          lastDown.current = null;
          hideTip();
        }}
        onClick={activate}
      >
        <TableGlyph />
      </button>
      <span data-transfer-tooltip="" aria-hidden="true" hidden={!tooltip}>
        {TABLE_TOOLTIP}
      </span>
    </span>
  );
}
