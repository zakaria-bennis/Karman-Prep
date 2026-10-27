// FN-59: an inference diagram's "View numerical outputs" button (⋮, as on live Desmos) and its
// table of values to 6 significant digits, each defined one with an "Export to the expression
// list" button that adds a row reading it (inference-commands.ts) and announces it. Desmos's
// Export Diagram is left out: on its College Board version it stalls without drawing.

import { useRef, useState, type JSX } from "react";
import {
  exportInferenceOutput,
  outputMember,
  type InferenceOutput,
} from "@/lib/calculator/core/api/inference-commands";
import type { InferenceSettings } from "@/lib/calculator/core/api/inference-state";
import { useAnnouncer } from "../../a11y/announcer";
import { useEngine } from "../../hooks/use-engine";
import { EDITOR_MESSAGES } from "../messages";
import { outputValue, shownText } from "./inference-format";
import { InferencePopover } from "./InferencePopover";

export interface OutputLine {
  output: InferenceOutput;
  label: string; // "Lower bound", "z-score"
  value: number;
}

function ExportGlyph(): JSX.Element {
  // our own drawing: a box with an arrow leaving it
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M3 3.5h6M3 3.5v9h9v-6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7.5 8.5 13 3M9.5 3H13v3.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function MoreGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 4 16" aria-hidden="true" focusable="false">
      <circle cx="2" cy="3" r="1.5" />
      <circle cx="2" cy="8" r="1.5" />
      <circle cx="2" cy="13" r="1.5" />
    </svg>
  );
}

export function InferenceOutputs(props: {
  rowId: string;
  stage: "object" | "test" | "interval";
  settings: InferenceSettings;
  lines: readonly OutputLine[];
  title: string; // "Confidence interval outputs"
}): JSX.Element {
  const engine = useEngine();
  const announcer = useAnnouncer();
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  const exportLine = (line: OutputLine) => {
    const member = outputMember(line.output, props.stage, props.settings);
    const id = exportInferenceOutput(engine, props.rowId, member);
    setOpen(false);
    if (id === null) return;
    const n = engine.getSnapshot().rows.findIndex((r) => r.id === id) + 1;
    announcer.announce(EDITOR_MESSAGES.added("Expression", n));
  };
  return (
    <>
      <button
        ref={button}
        type="button"
        className="kc-inf-more"
        aria-label="View numerical outputs"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreGlyph />
      </button>
      {open && (
        <InferencePopover anchor={button} label={props.title} onClose={close}>
          <table className="kc-inf-outputs">
            <tbody>
              {props.lines.map((line) => {
                const shown = shownText(outputValue(line.value));
                const defined = Number.isFinite(line.value);
                return (
                  <tr key={line.output}>
                    <th scope="row">{line.label}</th>
                    <td>
                      <span className="kc-inf-output-value">{shown}</span>
                      {defined && (
                        <button
                          type="button"
                          className="kc-inf-export"
                          aria-label={`Export ${line.label} to the expression list`}
                          title="Export to the expression list"
                          onClick={() => exportLine(line)}
                        >
                          <ExportGlyph />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </InferencePopover>
      )}
    </>
  );
}
