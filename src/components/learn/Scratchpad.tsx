"use client";

import { useEffect, useRef, useState } from "react";
import { GripHorizontal, X } from "lucide-react";
import { eraseInk, type InkPoint, type InkStroke } from "@/lib/quiz/ink";
import styles from "./quiz/scratchpad.module.css";

interface Props {
  onClose(): void;
  open?: boolean;
  pageKey?: string;
  constraintsRef?: React.RefObject<HTMLDivElement | null>;
}
type Tool = "pen" | "stroke" | "precision";
const colors = [
  "#d94645",
  "#e57b29",
  "#c29b17",
  "#278044",
  "#2574d9",
  "#8355cd",
  "#c73b8d",
  "#333333",
  "#ffffff",
];

function constrain(next: { x: number; y: number; width: number; height: number }) {
  const vw = window.innerWidth,
    vh = window.visualViewport?.height ?? window.innerHeight;
  const width = Math.min(Math.max(260, next.width), vw - 24);
  // Always leave at least 38% of the screen available for the question.
  const height = Math.min(Math.max(200, next.height), vh * 0.62);
  return {
    width,
    height,
    x: Math.max(12, Math.min(next.x, vw - width - 12)),
    y: Math.max(12, Math.min(next.y, vh - height - 12)),
  };
}

export default function Scratchpad({ onClose, open = true, pageKey = "session" }: Props) {
  const [mode, setMode] = useState<"drawing" | "typing">("drawing");
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("currentColor");
  const [text, setText] = useState("");
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [box, setBox] = useState({ x: 16, y: 120, width: 470, height: 350 });
  const nextId = useRef(0);
  const ink = useRef(false);
  const move = useRef<{ x: number; y: number; start: typeof box; resize: boolean } | null>(null);

  useEffect(() => {
    const update = () => setBox((b) => constrain(b));
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);
  useEffect(() => {
    setText("");
    setStrokes([]);
  }, [pageKey]);
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  function startMove(e: React.PointerEvent, resize = false) {
    e.currentTarget.setPointerCapture(e.pointerId);
    move.current = { x: e.clientX, y: e.clientY, start: box, resize };
  }
  function moving(e: React.PointerEvent) {
    const m = move.current;
    if (!m) return;
    const dx = e.clientX - m.x,
      dy = e.clientY - m.y;
    setBox(
      constrain(
        m.resize
          ? { ...m.start, width: m.start.width + dx, height: m.start.height + dy }
          : { ...m.start, x: m.start.x + dx, y: m.start.y + dy }
      )
    );
  }
  function point(e: React.PointerEvent<SVGSVGElement>): InkPoint {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 1000,
      y: ((e.clientY - rect.top) / rect.height) * 600,
    };
  }
  function draw(e: React.PointerEvent<SVGSVGElement>, start = false) {
    const p = point(e);
    if (tool !== "pen") {
      setStrokes((old) => eraseInk(old, p, 28, tool === "stroke"));
    } else if (start) {
      nextId.current++;
      setStrokes((old) =>
        [...old, { id: nextId.current, color, points: [p, { x: p.x + 0.1, y: p.y }] }].slice(-500)
      );
    } else {
      setStrokes((old) =>
        old.map((s, i) =>
          i === old.length - 1 && s.points.length < 5000 ? { ...s, points: [...s.points, p] } : s
        )
      );
    }
  }
  if (!open) return null;
  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      role="region"
      aria-label="Scratchpad"
      className={styles.pad}
      style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header>
        <button
          type="button"
          aria-label="Move scratchpad"
          className={styles.drag}
          onPointerDown={(e) => startMove(e)}
          onPointerMove={moving}
          onPointerUp={() => {
            move.current = null;
          }}
          onPointerCancel={() => {
            move.current = null;
          }}
          onKeyDown={(e) => {
            const d = (
              {
                ArrowLeft: [-12, 0],
                ArrowRight: [12, 0],
                ArrowUp: [0, -12],
                ArrowDown: [0, 12],
              } as Record<string, number[]>
            )[e.key];
            if (d) {
              e.preventDefault();
              setBox(constrain({ ...box, x: box.x + d[0], y: box.y + d[1] }));
            }
          }}
        >
          <GripHorizontal size={16} /> Scratchpad
        </button>
        <button type="button" aria-label="Close scratchpad" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <div className={styles.toolbar}>
        <button type="button" aria-pressed={mode === "typing"} onClick={() => setMode("typing")}>
          Typing
        </button>
        <button type="button" aria-pressed={mode === "drawing"} onClick={() => setMode("drawing")}>
          Drawing
        </button>
        {mode === "drawing" && (
          <>
            <select
              aria-label="Drawing tool"
              value={tool}
              onChange={(e) => setTool(e.target.value as Tool)}
            >
              <option value="pen">Pen</option>
              <option value="stroke">Stroke eraser</option>
              <option value="precision">Precision eraser</option>
            </select>
            <details className={styles.palette}>
              <summary>Color</summary>
              <div>
                <button type="button" onClick={() => setColor("currentColor")}>
                  Theme ink
                </button>
                {colors.map((c) => (
                  <button
                    type="button"
                    key={c}
                    aria-label={`Ink ${c}`}
                    style={{ background: c }}
                    onClick={() => {
                      setColor(c);
                      setTool("pen");
                    }}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Custom ink color"
                  value={color === "currentColor" ? "#2574d9" : color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
            </details>
            <button
              type="button"
              disabled={!strokes.length}
              onClick={() => setStrokes((s) => s.slice(0, -1))}
            >
              Undo stroke
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setStrokes([]);
            setText("");
          }}
        >
          Clear All
        </button>
      </div>
      <div className={styles.paper}>
        {mode === "typing" ? (
          <textarea
            aria-label="Scratchpad notes"
            placeholder="Type your working here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        ) : (
          <svg
            viewBox="0 0 1000 600"
            preserveAspectRatio="none"
            role="img"
            aria-label="Scratchpad drawing"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              ink.current = true;
              draw(e, true);
            }}
            onPointerMove={(e) => {
              if (ink.current) draw(e);
            }}
            onPointerUp={() => {
              ink.current = false;
            }}
            onPointerCancel={() => {
              ink.current = false;
            }}
          >
            {strokes.map((s, i) => (
              <path
                key={`${s.id}-${i}`}
                d={s.points.map((p, index) => `${index ? "L" : "M"}${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
        )}
      </div>
      <button
        type="button"
        className={styles.resize}
        aria-label="Resize scratchpad"
        onPointerDown={(e) => startMove(e, true)}
        onPointerMove={moving}
        onPointerUp={() => {
          move.current = null;
        }}
        onPointerCancel={() => {
          move.current = null;
        }}
        onKeyDown={(e) => {
          if (e.key.startsWith("Arrow")) {
            e.preventDefault();
            setBox(
              constrain({
                ...box,
                width: box.width + (e.key === "ArrowRight" ? 20 : e.key === "ArrowLeft" ? -20 : 0),
                height: box.height + (e.key === "ArrowDown" ? 20 : e.key === "ArrowUp" ? -20 : 0),
              })
            );
          }
        }}
      >
        ↘
      </button>
    </section>
  );
}
