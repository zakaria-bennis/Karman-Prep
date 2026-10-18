"use client";

import { useMemo, useState, type JSX } from "react";
import { ClipboardPaste, ChevronDown, Table2, MapPin, Copy } from "lucide-react";
import { normalizeMath, parseText, tablePayload, type PastePayload } from "@/lib/calculator/paste";
import type { StemInput } from "@/lib/calculator-transfer/classify";
import { useCalculator } from "./CalculatorScope";
import { useTransferClassifier, type TransferClassifier } from "./transfer-classifier";
import styles from "./calculator.module.css";

function PasteAction({ payload, label }: { payload: PastePayload | null; label: string }) {
  const calculator = useCalculator();
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  if (calculator?.version !== "v1" || !payload) return null;
  const pairs =
    payload.kind === "points" ? payload.pairs : payload.kind === "table" ? payload.rows : null;
  async function copy() {
    if (!payload) return;
    const text =
      payload.kind === "math"
        ? payload.latex.join("\n")
        : "x_1\ty_1\n" +
          (payload.kind === "points" ? payload.pairs : payload.rows)
            .map((row) => row.join("\t"))
            .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied. Paste into Desmos or another calculator.");
    } catch {
      setMessage("Clipboard unavailable. Select and copy the original math.");
    }
  }
  return (
    <span className={styles.exportWrap}>
      <span className={styles.exportButtons}>
        <button
          type="button"
          className={styles.source}
          aria-label={label}
          onClick={(event) => {
            event.stopPropagation();
            calculator.paste(payload);
          }}
        >
          <ClipboardPaste size={22} aria-hidden="true" /> Export to Karman
        </button>
        <button
          type="button"
          aria-label="Export options"
          aria-expanded={expanded}
          className={styles.exportToggle}
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronDown size={22} />
        </button>
      </span>
      <span
        className={styles.exportMenu}
        data-open={expanded}
        role="group"
        aria-label="Export options"
      >
        <button
          type="button"
          onClick={() => {
            calculator.paste(payload);
            setExpanded(false);
          }}
        >
          <ClipboardPaste size={18} />{" "}
          {payload.kind === "table"
            ? "Paste as x₁, y₁ table"
            : payload.kind === "points"
              ? "Paste coordinate points"
              : "Paste expression"}
        </button>
        {pairs && (
          <>
            <button
              type="button"
              onClick={() => {
                calculator.paste({ kind: "table", rows: pairs });
                setExpanded(false);
              }}
            >
              <Table2 size={18} /> x₁, y₁ table
            </button>
            {payload.kind === "points" && (
              <button
                type="button"
                onClick={() => {
                  calculator.paste({ kind: "math", latex: pairs.map(([x, y]) => `(${x},${y})`) });
                  setExpanded(false);
                }}
              >
                <MapPin size={18} /> Coordinate points
              </button>
            )}
          </>
        )}
        <button type="button" onClick={copy}>
          <Copy size={18} /> Copy for Desmos
        </button>
        {message && <span role="status">{message}</span>}
      </span>
    </span>
  );
}

// AR-11 wrappers: each reads useCalculator() once and renders the v1 PasteAction path unchanged
// or the v2 Transfer control (14). The v2 parts, the stem registry and which instances render a
// control included, come from the lazy transfer chunk (D4, transfer-items.tsx), so they render
// nothing until it has loaded.
function V2Transfer(props: { part(t: TransferClassifier): JSX.Element }): JSX.Element | null {
  const t = useTransferClassifier(true);
  return t && props.part(t);
}

function V1SourceAction({ latex }: { latex: string }) {
  const payload = useMemo(() => {
    try {
      return parseText(normalizeMath(latex));
    } catch {
      return null;
    }
  }, [latex]);
  return <PasteAction payload={payload} label={`Paste ${latex} into calculator`} />;
}

export function CalculatorSourceAction(props: {
  latex: string;
  segmentIndex?: number;
  stem?: StemInput;
}): JSX.Element | null {
  const bridge = useCalculator();
  return bridge?.version === "v2" ? (
    <V2Transfer
      part={(t) => <t.StemTransferAction {...props} questionKey={bridge.questionKey} />}
    />
  ) : (
    <V1SourceAction latex={props.latex} />
  );
}
function choicePayload(text: string): PastePayload | null {
  try {
    const math = [...text.matchAll(/\${1,2}((?:\\\$|[^$])+)\${1,2}/g)].map((m) =>
      normalizeMath(m[1])
    );
    if (math.length) {
      const parsed = math.map(parseText);
      if (parsed.every((p) => p.kind === "points"))
        return { kind: "points", pairs: parsed.flatMap((p) => p.pairs) };
      return { kind: "math", latex: math };
    }
    if (/^[\d\sxyzab().,+*/^=<>−-]+$/.test(text)) return parseText(text);
  } catch {
    /* Unsupported content has no import control. */
  }
  return null;
}

function V1ChoiceAction({ text, letter }: { text: string; letter: string }) {
  const payload = useMemo(() => choicePayload(text), [text]);
  return <PasteAction payload={payload} label={`Paste choice ${letter} into calculator`} />;
}

/** Choice actions are siblings of answer buttons, so pasting never selects an answer. */
export function CalculatorChoiceAction(props: {
  text: string;
  letter: string;
  stem?: StemInput;
  slot?: "cluster";
}): JSX.Element | null {
  const bridge = useCalculator();
  if (bridge?.version === "v2")
    return (
      <V2Transfer
        part={(t) => <t.ChoiceTransferAction {...props} questionKey={bridge.questionKey} />}
      />
    );
  // v1 keeps its own instance below the choice; the v2-only cluster instance renders nothing.
  return props.slot === "cluster" ? null : (
    <V1ChoiceAction text={props.text} letter={props.letter} />
  );
}

function V1TableAction({ rows }: { rows: string[][] }) {
  const payload = useMemo(() => {
    try {
      return tablePayload(rows);
    } catch {
      return null;
    }
  }, [rows]);
  return <PasteAction payload={payload} label="Paste table into calculator as x₁, y₁" />;
}

/** v2: a question table's control (TR-22), or a table choice's in its cluster (transfer-items). */
export function CalculatorTableAction(props: {
  rows: string[][];
  headers?: string[];
  layout?: "vertical" | "horizontal";
  itemId?: string;
  slot?: "cluster";
}): JSX.Element | null {
  const bridge = useCalculator();
  if (bridge?.version === "v2")
    return <V2Transfer part={(t) => <t.TableTransferAction {...props} />} />;
  return props.slot === "cluster" ? null : <V1TableAction rows={props.rows} />;
}
