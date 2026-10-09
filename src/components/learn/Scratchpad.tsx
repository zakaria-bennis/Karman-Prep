"use client";

// ============================================================
// Scratchpad — floating draggable canvas for freehand scratch work.
//
// Karman-themed: deep aubergine background (almost-black with a
// purple tint), white default pen, plus a 10-color palette that
// pops out of the pen button. Pointer events; no pressure.
// ============================================================

import { motion, useDragControls, useMotionValue } from "framer-motion";
import { X, GripHorizontal, Eraser, Pen, ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
  open?: boolean;
  pageKey?: string;
  constraintsRef: React.RefObject<HTMLDivElement | null>;
}

type Tool = "pen" | "eraser";

// 5-color palette — soft pastels tuned for the aubergine canvas.
// White anchors the set; the four pastels carry equal weight so
// the swatches read as a balanced row.
const PEN_COLORS: { hex: string; label: string }[] = [
  { hex: "#FFFFFF", label: "White" },
  { hex: "#E4C86A", label: "Lavender" },
  { hex: "#A6C486", label: "Pastel green" },
  { hex: "#7FC4FF", label: "Pastel blue" },
  { hex: "#F0BE72", label: "Pastel orange" },
];

// Karman aubergine — almost black, slight purple. Tuned to read
// as a distinct surface against the navy diagnostic shell while
// still feeling part of the same family.
const SCRATCHPAD_BG = "#12110D";

export default function Scratchpad({ onClose, open = true, pageKey = "session" }: Props) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    x.set(0);
    y.set(0);
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, x, y]);
  const controls = useDragControls();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const savedPages = useRef(new Map<string, HTMLCanvasElement>());
  const initialized = useRef(false);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pages = savedPages.current;
    if (initialized.current) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const saved = pages.get(pageKey);
        if (saved) ctx.drawImage(saved, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }
    return () => {
      if (!initialized.current) return;
      const saved = document.createElement("canvas");
      saved.width = canvas.width;
      saved.height = canvas.height;
      saved.getContext("2d")?.drawImage(canvas, 0, 0);
      pages.set(pageKey, saved);
    };
  }, [pageKey]);
  useEffect(() => {
    const resetPosition = () => {
      x.set(0);
      y.set(0);
    };
    window.addEventListener("resize", resetPosition);
    return () => window.removeEventListener("resize", resetPosition);
  }, [x, y]);
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
      initialized.current = true;
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
    if (typeof ResizeObserver === "undefined") return;
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
    <div
      ref={viewportRef}
      className="pointer-events-none fixed inset-2 z-[80]"
      style={{ display: open ? undefined : "none" }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-label="Scratchpad"
        drag
        dragListener={false}
        dragControls={controls}
        dragConstraints={viewportRef}
        dragMomentum={false}
        dragElastic={0.05}
        initial={false}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="pointer-events-auto absolute left-0 top-0 flex resize flex-col overflow-hidden rounded-2xl border border-white/20 text-white shadow-2xl"
        style={{
          x,
          y,
          width: "min(520px, 100%)",
          height: "min(400px, 100%)",
          maxWidth: "100%",
          maxHeight: "100%",
          minWidth: "min(280px, 100%)",
          minHeight: "min(240px, 100%)",
          background: SCRATCHPAD_BG,
        }}
      >
        {/* Title bar */}
        <div
          onPointerDown={(e) => controls.start(e)}
          className="relative flex shrink-0 cursor-grab select-none flex-wrap items-center justify-between border-b border-white/10 bg-surface/[0.04] px-3 py-2 backdrop-blur-md active:cursor-grabbing"
        >
          <div className="pointer-events-none flex items-center gap-2">
            <GripHorizontal className="h-4 w-4 text-white/80" />
            <Pen className="h-3.5 w-3.5" style={{ color: penColor }} />
            <span className="text-xs font-semibold text-white">Scratchpad</span>
          </div>

          <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
            {/* Pen + color picker */}
            <div className="static" ref={paletteRef}>
              <button
                type="button"
                onClick={() => {
                  setTool("pen");
                  setPaletteOpen((o) => !o);
                }}
                className={cn(
                  "flex min-h-11 items-center gap-1 rounded-md px-2 transition-colors",
                  tool === "pen"
                    ? "bg-surface/[0.08] text-white"
                    : "text-white/80 hover:bg-surface/[0.05] hover:text-white"
                )}
                aria-label="Pen color"
                title="Pen color"
              >
                <Pen className="h-3.5 w-3.5" />
                <span
                  className="h-3 w-3 rounded-full border border-white/30"
                  style={{ background: penColor }}
                />
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>

              {paletteOpen && (
                <div className="absolute inset-x-2 top-full z-30 rounded-xl border border-white/10 bg-[#070605]/95 px-3 py-2.5 shadow-2xl backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-center gap-3">
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
                          "h-9 w-9 rounded-full border transition-transform",
                          penColor === c.hex
                            ? "scale-110 border-white ring-2 ring-info/50"
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
                "flex h-11 w-11 items-center justify-center rounded-md transition-colors",
                tool === "eraser"
                  ? "bg-surface/[0.08] text-white"
                  : "text-white/80 hover:bg-surface/[0.05] hover:text-white"
              )}
              aria-label="Eraser"
              title="Eraser"
            >
              <Eraser className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={clearCanvas}
              className="h-11 px-1.5 text-[11px] font-semibold text-white/80 hover:text-white"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-surface/[0.08] hover:text-white"
              aria-label="Close scratchpad"
            >
              <X className="h-3.5 w-3.5" />
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
          aria-label="Scratch work drawing canvas"
          className="min-h-0 w-full flex-1 touch-none"
          style={{
            cursor: tool === "pen" ? "crosshair" : "cell",
            background: SCRATCHPAD_BG,
          }}
        />
      </motion.div>
    </div>
  );
}
