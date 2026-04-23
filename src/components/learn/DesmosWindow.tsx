"use client";

// ============================================================
// DesmosWindow — floating draggable iframe to desmos.com/calculator
// Uses Framer Motion useDragControls so the drag handle is only
// the title bar, leaving the iframe interactive.
// ============================================================

import { motion, useDragControls } from "framer-motion";
import { X, GripHorizontal } from "lucide-react";

interface Props {
  onClose: () => void;
  constraintsRef: React.RefObject<HTMLDivElement | null>;
}

export default function DesmosWindow({ onClose, constraintsRef }: Props) {
  const controls = useDragControls();

  return (
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
      className="absolute z-[70] rounded-xl shadow-2xl border border-slate-700 overflow-hidden bg-slate-900"
      style={{ width: 560, height: 420 }}
    >
      {/* Title bar — only this element starts the drag */}
      <div
        onPointerDown={(e) => controls.start(e)}
        className="flex items-center justify-between px-3 py-2 bg-slate-800 cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <GripHorizontal className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-300">Desmos Calculator</span>
        </div>
        <button
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-6 h-6 rounded-full hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          aria-label="Close Desmos"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Iframe */}
      <iframe
        title="Desmos Calculator"
        src="https://www.desmos.com/calculator"
        className="w-full border-0 bg-white"
        style={{ height: "calc(100% - 36px)" }}
        allow="fullscreen; clipboard-read; clipboard-write"
      />
    </motion.div>
  );
}
