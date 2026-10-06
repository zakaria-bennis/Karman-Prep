"use client";

// ============================================================
// DesmosWindow — Karman-skinned Desmos calculator embed.
//
// Switched from <iframe> to the Desmos JS API so we can:
//   · Run dark mode (`invertedColors: true`) — matches the
//     Karman navy surface instead of the white desmos.com page.
//   · Toggle between Graphing  ↔  Scientific in-place without
//     a full iframe reload.
//   · Trim the chrome around the calculator so the floating
//     window itself reads as part of the dashboard.
//
// API key is the public demo key Desmos publishes for evaluation
// (https://www.desmos.com/api). Swap to a registered key when
// going to production for support + analytics.
//
// Features kept from prior version:
//   · Drag handle limited to title bar (calc stays interactive).
//   · Minimize-to-pill ("stuck" mode) collapses to a glowing
//     calculator icon at bottom-right of the parent constraint.
//   · Bottom-right resize grip (CSS-native).
// ============================================================

import { useTheme } from "@/components/shared/ThemeProvider";
import { motion, useDragControls } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { X, GripHorizontal, Minimize2, Calculator } from "lucide-react";
import type { StudentQuizQuestion } from "@/types/quiz";
import { getDesmosTransferReport, type DesmosExpression } from "@/lib/desmos-transfers";

interface Props {
  /** Fail closed when the current section is not Math. */
  subject?: string | null;
  onClose: () => void;
  constraintsRef: React.RefObject<HTMLDivElement | null>;
  question?: StudentQuizQuestion | null;
  transfersEnabled?: boolean;
}

type CalcMode = "graphing" | "scientific";

// Public demo key — fine for development. Replace with a registered
// key in production via NEXT_PUBLIC_DESMOS_API_KEY.
const DESMOS_API_KEY = process.env.NEXT_PUBLIC_DESMOS_API_KEY ?? "dcb31709b452b1cf9dc26972add0fda6";
const DESMOS_SCRIPT = `https://www.desmos.com/api/v1.10/calculator.js?apiKey=${DESMOS_API_KEY}`;

const MODE_LABEL: Record<CalcMode, string> = {
  graphing: "Graphing",
  scientific: "Scientific",
};

// Type-shim for the Desmos global so we can call it from TS.
// Keeps us off `any` everywhere.
interface DesmosCalculatorInstance {
  destroy(): void;
  getState?(): unknown;
  setState?(state: unknown): void;
  setExpressions?(expressions: DesmosExpression[]): void;
  getExpressions?(): { id: string; type?: string; latex?: string; columns?: { latex: string }[] }[];
  updateSettings?(settings: { invertedColors: boolean }): void;
}
interface DesmosOptions {
  invertedColors?: boolean;
  border?: boolean;
  expressions?: boolean;
  settingsMenu?: boolean;
  zoomButtons?: boolean;
  fontSize?: number;
}
interface DesmosGlobal {
  GraphingCalculator(elt: HTMLElement, opts?: DesmosOptions): DesmosCalculatorInstance;
  ScientificCalculator(elt: HTMLElement, opts?: DesmosOptions): DesmosCalculatorInstance;
}
declare global {
  interface Window {
    Desmos?: DesmosGlobal;
  }
}

export default function DesmosWindow(props: Props) {
  const subject = props.subject ?? props.question?.subject;
  if (subject !== "math" || (props.question && props.question.subject !== "math")) return null;
  return <MathDesmosWindow {...props} />;
}

function MathDesmosWindow({
  onClose,
  constraintsRef,
  question = null,
  transfersEnabled = false,
}: Props) {
  const { palette } = useTheme();
  const darkRef = useRef(palette.dark);
  darkRef.current = palette.dark;
  const controls = useDragControls();
  const [mode, setMode] = useState<CalcMode>("graphing");
  const [minimized, setMinimized] = useState(false);
  const [scriptReady, setScriptReady] = useState(typeof window !== "undefined" && !!window.Desmos);

  const mountRef = useRef<HTMLDivElement>(null);
  const calcRef = useRef<DesmosCalculatorInstance | null>(null);
  const savedStates = useRef<Partial<Record<CalcMode, unknown>>>({});
  const [transferNotice, setTransferNotice] = useState("");
  const { transfers, notices } = transfersEnabled
    ? getDesmosTransferReport(question)
    : { transfers: [], notices: [] };
  useEffect(() => setTransferNotice(""), [question?.id]);

  useEffect(() => {
    calcRef.current?.updateSettings?.({ invertedColors: palette.dark });
  }, [palette.dark]);

  // (Re)create the calculator any time the mode flips, the
  // script becomes available, or we restore from minimized.
  useEffect(() => {
    if (minimized || !scriptReady) return;
    const elt = mountRef.current;
    const Desmos = typeof window !== "undefined" ? window.Desmos : undefined;
    if (!elt || !Desmos) return;

    // Tear down any prior instance so we can swap modes cleanly.
    if (calcRef.current) {
      calcRef.current.destroy();
      calcRef.current = null;
    }

    const opts: DesmosOptions = {
      invertedColors: darkRef.current, // dark mode — matches Karman
      border: false, // we draw our own chrome
      fontSize: 14,
    };

    calcRef.current =
      mode === "graphing"
        ? Desmos.GraphingCalculator(elt, opts)
        : Desmos.ScientificCalculator(elt, opts);
    const calculator = calcRef.current;
    const states = savedStates.current;
    if (states[mode] !== undefined) calculator.setState?.(states[mode]);
    calculator.updateSettings?.({ invertedColors: darkRef.current });

    return () => {
      if (calculator.getState) states[mode] = calculator.getState();
      calculator.destroy();
      if (calcRef.current === calculator) calcRef.current = null;
    };
  }, [mode, scriptReady, minimized]);

  if (minimized) {
    return (
      <>
        <Script
          src={DESMOS_SCRIPT}
          strategy="afterInteractive"
          onLoad={() => setScriptReady(true)}
        />
        <motion.button
          type="button"
          onClick={() => setMinimized(false)}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
          className="absolute bottom-4 right-4 z-[70] flex h-12 w-12 items-center justify-center rounded-full bg-math text-night shadow-[0_8px_24px_rgba(47,168,255,0.35)] transition-opacity hover:opacity-90"
          aria-label="Open Desmos calculator"
          title="Desmos calculator"
        >
          <Calculator className="h-5 w-5" />
        </motion.button>
      </>
    );
  }

  return (
    <>
      <Script src={DESMOS_SCRIPT} strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
      <motion.div
        drag
        dragListener={false}
        dragControls={controls}
        dragConstraints={constraintsRef}
        dragMomentum={false}
        dragElastic={0.05}
        initial={{ opacity: 0, scale: 0.9, x: 0, y: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="absolute left-3 top-16 z-[70] flex resize flex-col overflow-hidden rounded-2xl border border-ivory/10 bg-night shadow-2xl"
        style={{
          width: "min(600px, calc(100vw - 24px))",
          height: "min(560px, calc(100dvh - 104px))",
          minWidth: 280,
          minHeight: 280,
          maxWidth: "calc(100vw - 24px)",
          maxHeight: "calc(100dvh - 104px)",
        }}
      >
        {/* Title bar — drag handle. Mirrors the chat shell aesthetic
            so the calculator reads as part of the same surface. */}
        <div
          onPointerDown={(e) => controls.start(e)}
          className="flex shrink-0 cursor-grab touch-none select-none items-center justify-between gap-1 border-b border-ivory/10 bg-surface/[0.04] px-2 py-2 backdrop-blur-md active:cursor-grabbing"
        >
          <div className="pointer-events-none flex items-center gap-2">
            <GripHorizontal className="h-4 w-4 text-taupe" />
            <Calculator className="h-3.5 w-3.5 text-info" />
            <span className="text-xs font-semibold text-ivory/90">Desmos</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Mode toggle — Graphing / Scientific */}
            <div
              className="inline-flex items-center gap-0.5 rounded-md border border-ivory/10 bg-night/30 p-0.5"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {(Object.keys(MODE_LABEL) as CalcMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={[
                    "rounded px-2 py-0.5 text-[10px] font-semibold transition-colors",
                    mode === m
                      ? "bg-math text-night"
                      : "text-taupe hover:bg-surface/[0.06] hover:text-ivory",
                  ].join(" ")}
                >
                  {MODE_LABEL[m]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setMinimized(true)}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex h-6 w-6 items-center justify-center rounded-full text-taupe transition-colors hover:bg-surface/[0.08] hover:text-ivory"
              aria-label="Minimize Desmos"
              title="Minimize"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex h-6 w-6 items-center justify-center rounded-full text-taupe transition-colors hover:bg-surface/[0.08] hover:text-ivory"
              aria-label="Close Desmos"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {(transfers.length > 0 || notices.length > 0) && (
          <div className="max-h-32 shrink-0 overflow-y-auto border-b border-bronze bg-night px-3 py-2">
            <p className="mb-2 text-xs text-taupe">Given in this question</p>
            <div className="flex flex-wrap gap-2">
              {transfers.map((transfer) => (
                <button
                  key={transfer.id}
                  type="button"
                  disabled={!scriptReady || mode !== "graphing"}
                  className="rounded-md border border-bronze px-2 py-1 text-xs text-ivory hover:border-info disabled:opacity-50"
                  onClick={() => {
                    if (!calcRef.current?.setExpressions) return;
                    const existing = calcRef.current.getExpressions?.() ?? [];
                    if (
                      "type" in transfer.expression &&
                      transfer.expression.type === "table" &&
                      existing.some(
                        (item) =>
                          item.id !== transfer.id &&
                          (item.type === "table"
                            ? (item.columns ?? []).some((column) =>
                                /^[xy]_(?:1|\{1\})$/.test(column.latex)
                              )
                            : /^\s*[xy]_\{?1\}?\s*=/.test(item.latex ?? ""))
                      )
                    ) {
                      setTransferNotice(
                        "x₁ or y₁ is already in use. Keep your work and enter this table manually, or rename the existing variables first."
                      );
                      return;
                    }
                    calcRef.current.setExpressions([transfer.expression]);
                    setTransferNotice("Added to Desmos.");
                  }}
                >
                  {transfer.label}
                </button>
              ))}
            </div>
            {notices.map((notice) => (
              <p key={notice} className="mt-1 text-xs text-taupe">
                {notice}
              </p>
            ))}
            <p aria-live="polite" className="mt-1 text-xs text-taupe">
              {mode === "scientific" ? "Choose Graphing to transfer these givens." : transferNotice}
            </p>
          </div>
        )}

        {/* Calculator mount — fills below the title bar.
            Desmos paints into this div via the JS API. */}
        <div ref={mountRef} className="min-h-0 w-full flex-1 bg-night" />

        {/* Loading shim — only visible until the Desmos script
            has initialised the calculator into the mount div. */}
        {!scriptReady && (
          <div className="pointer-events-none absolute inset-0 top-9 flex items-center justify-center text-xs text-taupe">
            Loading calculator…
          </div>
        )}
      </motion.div>
    </>
  );
}
