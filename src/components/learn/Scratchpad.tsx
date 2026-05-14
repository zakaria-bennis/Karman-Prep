"use client";

// ============================================================
// Scratchpad — floating draggable canvas for freehand scratch work.
//
// Karman-themed: deep aubergine background (almost-black with a
// purple tint), white default pen, plus a 10-color palette that
// pops out of the pen button. Pointer events; no pressure.
// ============================================================

import { motion, useDragControls } from "framer-motion";
import { X, GripHorizontal, Eraser, Pen, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  constraintsRef: React.RefObject<HTMLDivElement | null>;
}

type Tool = "pen" | "eraser";

// 5-color palette — soft pastels tuned for the aubergine canvas.
// White anchors the set; the four pastels carry equal weight so
// the swatches read as a balanced row.
const PEN_COLORS: { hex: string; label: string }[] = [
  { hex: "#FFFFFF", label: "White" },
  { hex: "#C4B5FD", label: "Lavender" },
  { hex: "#86EFAC", label: "Pastel green" },
  { hex: "#93C5FD", label: "Pastel blue" },
  { hex: "#FDBA74", label: "Pastel orange" },
];

// Karman aubergine — almost black, slight purple. Tuned to read
// as a distinct surface against the navy diagnostic shell while
// still feeling part of the same family.
const SCRATCHPAD_BG = "#150C24";

export default function Scratchpad({ onClose, constraintsRef }: Props) {
  const controls = useDragControls();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [penColor, setPenColor] = useState<string>(PEN_COLORS[0].hex);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Sync the canvas bitmap to the layout size at HiDPI. Runs on
  // every layout change via ResizeObserver — the parent in
  // DiagnosticClient toggles display:none for persistence, so the
  // canvas may mount at 0x0 (clientWidth/Height are 0 while
  // hidden). A one-shot useEffect would lock in a 0x0 bitmap and
  // strokes would silently no-op. Existing drawing is preserved
  // across resizes by blitting through an offscreen canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sync = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW === 0 || cssH === 0) return;
      const targetW = Math.round(cssW * dpr);
      const targetH = Math.round(cssH * dpr);
      if (canvas.width === targetW && canvas.height === targetH) return;

      // Snapshot the current bitmap so resize doesn't wipe strokes.
      let snapshot: HTMLCanvasElement | null = null;
      if (canvas.width > 0 && canvas.height > 0) {
        snapshot = document.createElement("canvas");
        snapshot.width = canvas.width;
        snapshot.height = canvas.height;
        snapshot.getContext("2d")?.drawImage(canvas, 0, 0);
      }

      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      if (snapshot) ctx.drawImage(snapshot, 0, 0, cssW, cssH);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Click-outside to close the color palette.
  useEffect(() => {
    if (!paletteOpen) return;
    function onDocClick(e: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setPaletteOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [paletteOpen]);

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

    if (tool === "eraser") {
      ctx.lineWidth = 22;
      ctx.lineCap = "round";
      ctx.globalCompositeOperation = "destination-out";
      // strokeStyle is irrelevant under destination-out, but set
      // to avoid lingering values.
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = penColor;
    }

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
      className="absolute z-[70] rounded-2xl shadow-2xl border border-white/10 overflow-hidden resize"
      style={{
        width: 520,
        height: 400,
        minWidth: 320,
        minHeight: 240,
        background: SCRATCHPAD_BG,
      }}
    >
      {/* Title bar */}
      <div
        onPointerDown={(e) => controls.start(e)}
        className="flex items-center justify-between px-3 py-2 bg-white/[0.04] border-b border-white/10 backdrop-blur-md cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <GripHorizontal className="w-4 h-4 text-slate-500" />
          <Pen className="w-3.5 h-3.5" style={{ color: penColor }} />
          <span className="text-xs font-semibold text-slate-200">Scratchpad</span>
        </div>

        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          {/* Pen + color picker */}
          <div className="relative" ref={paletteRef}>
            <button
              type="button"
              onClick={() => {
                setTool("pen");
                setPaletteOpen((o) => !o);
              }}
              className={cn(
                "h-7 px-2 rounded-md flex items-center gap-1 transition-colors",
                tool === "pen"
                  ? "bg-white/[0.08] text-white"
                  : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
              )}
              aria-label="Pen color"
              title="Pen color"
            >
              <Pen className="w-3.5 h-3.5" />
              <span
                className="w-3 h-3 rounded-full border border-white/30"
                style={{ background: penColor }}
              />
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {paletteOpen && (
              <div className="absolute right-0 top-9 z-30 rounded-xl border border-white/10 bg-[#0B1026]/95 backdrop-blur-xl shadow-2xl px-3 py-2.5">
                <div className="flex items-center gap-3">
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => {
                        setPenColor(c.hex);
                        setPaletteOpen(false);
                      }}
                      title={c.label}
                      aria-label={`${c.label} pen`}
                      className={cn(
                        "w-7 h-7 rounded-full border transition-transform",
                        penColor === c.hex
                          ? "border-white scale-110 ring-2 ring-blue-400/50"
                          : "border-white/20 hover:scale-105"
                      )}
                      style={{ background: c.hex }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setTool("eraser")}
            className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
              tool === "eraser"
                ? "bg-white/[0.08] text-white"
                : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
            )}
            aria-label="Eraser"
            title="Eraser"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={clearCanvas}
            className="text-[11px] font-semibold text-slate-400 hover:text-white px-1.5 h-7"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white"
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
        style={{
          height: "calc(100% - 40px)",
          cursor: tool === "pen" ? "crosshair" : "cell",
          background: SCRATCHPAD_BG,
        }}
      />
    </motion.div>
  );
}
