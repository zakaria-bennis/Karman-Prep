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

import { motion, useDragControls } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { X, GripHorizontal, Minimize2, Calculator } from "lucide-react";

interface Props {
  onClose: () => void;
  constraintsRef: React.RefObject<HTMLDivElement | null>;
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

export default function DesmosWindow({ onClose, constraintsRef }: Props) {
  const controls = useDragControls();
  const [mode, setMode] = useState<CalcMode>("graphing");
  const [minimized, setMinimized] = useState(false);
  const [scriptReady, setScriptReady] = useState(typeof window !== "undefined" && !!window.Desmos);

  const mountRef = useRef<HTMLDivElement>(null);
  const calcRef = useRef<DesmosCalculatorInstance | null>(null);

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
      invertedColors: true, // dark mode — matches Karman
      border: false, // we draw our own chrome
      fontSize: 14,
    };

    calcRef.current =
      mode === "graphing"
        ? Desmos.GraphingCalculator(elt, opts)
        : Desmos.ScientificCalculator(elt, opts);

    return () => {
      if (calcRef.current) {
        calcRef.current.destroy();
        calcRef.current = null;
      }
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
        initial={{ opacity: 0, scale: 0.9, x: 60, y: 80 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="absolute z-[70] resize overflow-hidden rounded-2xl border border-ivory/10 bg-[#070605] shadow-2xl"
        style={{ width: 600, height: 460, minWidth: 360, minHeight: 280 }}
      >
        {/* Title bar — drag handle. Mirrors the chat shell aesthetic
            so the calculator reads as part of the same surface. */}
        <div
          onPointerDown={(e) => controls.start(e)}
          className="flex cursor-grab touch-none select-none items-center justify-between border-b border-ivory/10 bg-surface/[0.04] px-3 py-2 backdrop-blur-md active:cursor-grabbing"
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

        {/* Calculator mount — fills below the title bar.
            Desmos paints into this div via the JS API. */}
        <div
          ref={mountRef}
          className="w-full bg-[#070605]"
          style={{ height: "calc(100% - 36px)" }}
        />

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
