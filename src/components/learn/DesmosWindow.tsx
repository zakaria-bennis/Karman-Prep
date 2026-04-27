"use client";

// ============================================================
// DesmosWindow — Karman Prep-skinned Desmos calculator embed.
//
// Switched from <iframe> to the Desmos JS API so we can:
//   · Run dark mode (`invertedColors: true`) — matches the
//     Karman Prep navy surface instead of the white desmos.com page.
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
  const [scriptReady, setScriptReady] = useState(
    typeof window !== "undefined" && !!window.Desmos
  );

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
      invertedColors: true,   // dark mode — matches Karman Prep
      border: false,          // we draw our own chrome
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
          className="absolute z-[70] bottom-4 right-4 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_8px_24px_rgba(59,130,246,0.45)] flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Open Desmos calculator"
          title="Desmos calculator"
        >
          <Calculator className="w-5 h-5" />
        </motion.button>
      </>
    );
  }

  return (
    <>
      <Script
        src={DESMOS_SCRIPT}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
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
        className="absolute z-[70] rounded-2xl shadow-2xl border border-white/10 overflow-hidden bg-[#0B1026] resize"
        style={{ width: 600, height: 460, minWidth: 360, minHeight: 280 }}
      >
        {/* Title bar — drag handle. Mirrors the chat shell aesthetic
            so the calculator reads as part of the same surface. */}
        <div
          onPointerDown={(e) => controls.start(e)}
          className="flex items-center justify-between px-3 py-2 bg-white/[0.04] border-b border-white/10 backdrop-blur-md cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <div className="flex items-center gap-2 pointer-events-none">
            <GripHorizontal className="w-4 h-4 text-slate-500" />
            <Calculator className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-slate-200">Desmos</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Mode toggle — Graphing / Scientific */}
            <div
              className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-black/30 border border-white/10"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {(Object.keys(MODE_LABEL) as CalcMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={[
                    "text-[10px] font-semibold px-2 py-0.5 rounded transition-colors",
                    mode === m
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.06]",
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
              className="w-6 h-6 rounded-full hover:bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="Minimize Desmos"
              title="Minimize"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-6 h-6 rounded-full hover:bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="Close Desmos"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Calculator mount — fills below the title bar.
            Desmos paints into this div via the JS API. */}
        <div
          ref={mountRef}
          className="w-full bg-[#0B1026]"
          style={{ height: "calc(100% - 36px)" }}
        />

        {/* Loading shim — only visible until the Desmos script
            has initialised the calculator into the mount div. */}
        {!scriptReady && (
          <div className="absolute inset-0 top-9 flex items-center justify-center text-xs text-slate-400 pointer-events-none">
            Loading calculator…
          </div>
        )}
      </motion.div>
    </>
  );
}
