"use client";

// ============================================================
// Scratchpad — floating draggable canvas for freehand scratch work
// during the quiz. Pointer events; no pressure sensitivity.
// ============================================================

import { motion, useDragControls } from "framer-motion";
import { X, GripHorizontal, Eraser, Pen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  constraintsRef: React.RefObject<HTMLDivElement | null>;
}

type Tool = "pen" | "eraser";

export default function Scratchpad({ onClose, constraintsRef }: Props) {
  const controls = useDragControls();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<Tool>("pen");

  // Handle HiDPI rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  function getCtx() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    drawingRef.current = true;
    lastPointRef.current = { x, y };
    const ctx = getCtx();
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = tool === "eraser" ? 18 : 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = tool === "eraser" ? "rgba(0,0,0,1)" : "#1e293b";
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";

    ctx.lineTo(x, y);
    ctx.stroke();
    lastPointRef.current = { x, y };
  }

  function handlePointerUp() {
    drawingRef.current = false;
    lastPointRef.current = null;
    const ctx = getCtx();
    if (ctx) ctx.globalCompositeOperation = "source-over";
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return (
    <motion.div
      drag
      dragListener={false}
      dragControls={controls}
      dragConstraints={constraintsRef}
      dragMomentum={false}
      dragElastic={0.05}
      initial={{ opacity: 0, scale: 0.9, x: 60, y: 120 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="absolute z-[70] rounded-xl shadow-2xl border border-slate-300 bg-white overflow-hidden"
      style={{ width: 480, height: 380 }}
    >
      {/* Title bar */}
      <div
        onPointerDown={(e) => controls.start(e)}
        className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-200 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <GripHorizontal className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Scratchpad</span>
        </div>
        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <button
            onClick={() => setTool("pen")}
            className={cn("w-6 h-6 rounded flex items-center justify-center transition-colors",
              tool === "pen" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-200"
            )}
            aria-label="Pen"
            title="Pen"
          >
            <Pen className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={cn("w-6 h-6 rounded flex items-center justify-center transition-colors",
              tool === "eraser" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-200"
            )}
            aria-label="Eraser"
            title="Eraser"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clearCanvas}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-1.5"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900"
            aria-label="Close scratchpad"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full touch-none"
        style={{ height: "calc(100% - 40px)", cursor: tool === "pen" ? "crosshair" : "cell", background: "#ffffff" }}
      />
    </motion.div>
  );
}
