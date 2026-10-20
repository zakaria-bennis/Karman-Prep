// The table regression's ⋮ menu (RT-32, REG-MODELS-23): "REGRESSION MODEL STRUCTURE" with the
// typeset template, then "Export as custom regression" or, when export is impossible, the reason in
// its place, then "Delete regression" (red). Escape (one KB-3 layer) or a press outside closes it.

import { useContext, useEffect, useRef, useState, type JSX } from "react";
import type { StoredRow } from "@/lib/calculator/core/api/document";
import {
  EXPORT_BLOCK_TEXT,
  exportBlock,
  deleteTableRegression,
  exportCustomRegression,
} from "@/lib/calculator/core/api/table-regression-commands";
import { TABLE_MODEL_SPECS } from "@/lib/calculator/regression/table-models";
import { latexToSpeech } from "../../math-field/speech";
import { EscapeContext } from "../focus/escape-stack";
import { FocusContext } from "../focus/focus-controller";
import { useEngine } from "../hooks/use-engine";
import { usePopupDismiss } from "./menu-trigger";
import { StaticMath } from "./StaticMath";

export function RegressionOptionsMenu(props: {
  tableId: string;
  stored: Pick<StoredRow, "columns" | "regression">;
  onDeleted(): void;
}): JSX.Element | null {
  const engine = useEngine();
  const focus = useContext(FocusContext);
  const escape = useContext(EscapeContext);
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  usePopupDismiss(
    open,
    `regression-options-${props.tableId}`,
    { popup: panel, trigger: button },
    escape,
    close
  );
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>("button")?.focus();
  }, [open]);
  const r = props.stored.regression;
  if (r === undefined) return null;
  const spec = TABLE_MODEL_SPECS[r.type];
  const block = exportBlock(props.stored);
  return (
    <div className="kc-tr-more-wrap">
      <button
        ref={button}
        type="button"
        className="kc-tr-more"
        aria-label="Regression options"
        title="Regression options"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
          <circle cx="9" cy="3.5" r="1.8" fill="currentColor" />
          <circle cx="9" cy="9" r="1.8" fill="currentColor" />
          <circle cx="9" cy="14.5" r="1.8" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div ref={panel} className="kc-tr-options" role="dialog" aria-label="Regression options">
          <div className="kc-tr-options-section">
            <div className="kc-tr-title">Regression Model Structure</div>
            <StaticMath
              latex={spec.structure}
              label={`Regression model structure: ${spec.structureSpeech}`}
              className="kc-tr-structure"
            />
          </div>
          <div className="kc-tr-options-section kc-tr-options-actions">
            {block === null ? (
              <button
                type="button"
                className="kc-tr-options-button"
                onClick={() => {
                  setOpen(false);
                  const made = exportCustomRegression(engine, props.tableId);
                  if (made !== null && typeof made !== "string") focus?.focusRow(made.id, "end");
                }}
              >
                Export as custom regression
              </button>
            ) : (
              <p className="kc-tr-options-note">
                {block.kind === "coordinates" && EXPORT_BLOCK_TEXT.coordinates}
                {block.kind === "column" && EXPORT_BLOCK_TEXT.column(block.name)}
                {block.kind === "computed" && (
                  <>
                    {EXPORT_BLOCK_TEXT.computedBefore}
                    <StaticMath latex={block.latex} label={latexToSpeech(block.latex)} />
                    {EXPORT_BLOCK_TEXT.computedAfter}
                  </>
                )}
              </p>
            )}
            <button
              type="button"
              className="kc-tr-options-button"
              data-danger="true"
              onClick={() => {
                setOpen(false);
                deleteTableRegression(engine, props.tableId);
                props.onDeleted();
              }}
            >
              Delete regression
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
