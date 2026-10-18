"use client";

import { useLayoutEffect, useMemo, useState, useSyncExternalStore, type JSX } from "react";
import { ClipboardPaste, ChevronDown, Table2, MapPin, Copy } from "lucide-react";
import { normalizeMath, parseText, tablePayload, type PastePayload } from "@/lib/calculator/paste";
import type { StemInput } from "@/lib/calculator-transfer/classify";
import { useCalculator, type V2Bridge } from "./CalculatorScope";
import { useTransferClassifier, type TransferClassifier } from "./transfer-classifier";
import type { TransferControlView } from "./transfer-items";
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
// or the v2 Transfer control (14). v2 controls come from the lazy classifier chunk (D4), so they
// render nothing until it has loaded.

// Stem registry (decision "AnswerChoiceButton"): the stem a question's own MathText renders,
// by question key, for choice wrappers whose caller passes no stem.
const stems = new Map<string, StemInput>();
const stemListeners = new Set<() => void>();
const notifyStems = () => stemListeners.forEach((listener) => listener());
const subscribeStems = (listener: () => void) => {
  stemListeners.add(listener);
  return () => void stemListeners.delete(listener);
};

function useRegisterStem(questionKey: string, stem: StemInput | undefined) {
  useLayoutEffect(() => {
    if (stem === undefined) return;
    stems.set(questionKey, stem);
    notifyStems();
    return () => {
      if (stems.get(questionKey) !== stem) return;
      stems.delete(questionKey);
      notifyStems();
    };
  }, [questionKey, stem]);
}

function useQuestionStem(questionKey: string): StemInput | null {
  return useSyncExternalStore(
    subscribeStems,
    () => stems.get(questionKey) ?? null,
    () => null
  );
}

function renderControl(t: TransferClassifier | null, view: TransferControlView | null) {
  if (t === null || view === null) return null;
  const { TransferControl } = t;
  return <TransferControl {...view} />;
}

function V2SourceAction(props: {
  latex: string;
  segmentIndex?: number;
  stem?: StemInput;
  bridge: V2Bridge;
}) {
  const { latex, segmentIndex, stem, bridge } = props;
  useRegisterStem(bridge.questionKey, stem);
  const t = useTransferClassifier(stem !== undefined && segmentIndex !== undefined);
  const view =
    t && stem !== undefined && segmentIndex !== undefined
      ? t.stemControl(stem, segmentIndex, latex)
      : null;
  return renderControl(t, view);
}

function V2ChoiceAction(props: {
  text: string;
  letter: string;
  stem?: StemInput;
  slot?: "cluster";
  bridge: V2Bridge;
}) {
  const { text, letter, stem, slot, bridge } = props;
  const registered = useQuestionStem(bridge.questionKey);
  const t = useTransferClassifier(slot === "cluster");
  return renderControl(t, t && t.choiceControl(letter, text, stem ?? registered));
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
    <V2SourceAction {...props} bridge={bridge} />
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
  if (bridge?.version === "v2") return <V2ChoiceAction {...props} bridge={bridge} />;
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

/** v2 renders no table control until Phase 3 (TR-77); headers, layout and itemId wait for it. */
export function CalculatorTableAction(props: {
  rows: string[][];
  headers?: string[];
  layout?: "vertical" | "horizontal";
  itemId?: string;
  slot?: "cluster";
}): JSX.Element | null {
  const bridge = useCalculator();
  if (bridge?.version === "v2" || props.slot === "cluster") return null;
  return <V1TableAction rows={props.rows} />;
}
