import { useRef, useState, type PointerEvent } from "react";
import { cn } from "@/design-system/cn";
import type { ReactNode } from "react";
import { Sheet } from "@/design-system/components/Sheet";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Panel } from "@/design-system/glass/Panel";
import { usePlan } from "@/plans/PlanProvider";
import { PlanLocked } from "./PlanSheet";
import { TextLink } from "./Shell";

/*
 * The tools a student expects on a question (rule 56): highlight, scratch pad,
 * the calculator on math, and help. Each is a glass icon button over the panel.
 * The scratch pad is ported from Signature Pad (21st.dev 43176, sean0205): a
 * canvas-less SVG pad whose strokes are filled outlines sized by speed, with
 * undo and clear; its history, form fields and export were not needed. The
 * calculator opens a panel that says the real one lives in the app; nothing
 * is drawn or loaded here.
 */
type Point = [number, number, number];
type Stroke = Point[];

const r2 = (n: number) => Math.round(n * 100) / 100;
function outline(points: Point[]): string {
  if (!points.length) return "";
  if (points.length === 1) {
    const [x, y, s] = points[0];
    const r = Math.max(s / 2, 0.5);
    return `M${r2(x - r)} ${r2(y)}a${r} ${r} 0 1 0 ${r2(r * 2)} 0a${r} ${r} 0 1 0 ${r2(-r * 2)} 0Z`;
  }
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  let nx = 0;
  let ny = 1;
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[Math.max(i - 1, 0)];
    const [bx, by] = points[Math.min(i + 1, points.length - 1)];
    const len = Math.hypot(bx - ax, by - ay);
    if (len > 1e-6) {
      nx = -(by - ay) / len;
      ny = (bx - ax) / len;
    }
    const [x, y, s] = points[i];
    left.push([x + (nx * s) / 2, y + (ny * s) / 2]);
    right.push([x - (nx * s) / 2, y - (ny * s) / 2]);
  }
  const pt = (p: [number, number]) => `${r2(p[0])} ${r2(p[1])}`;
  const endR = r2(points[points.length - 1][2] / 2);
  const startR = r2(points[0][2] / 2);
  let d = `M${pt(left[0])}`;
  for (let i = 1; i < left.length; i++) d += `L${pt(left[i])}`;
  d += `A${endR} ${endR} 0 0 0 ${pt(right[right.length - 1])}`;
  for (let i = right.length - 2; i >= 0; i--) d += `L${pt(right[i])}`;
  return `${d}A${startR} ${startR} 0 0 0 ${pt(left[0])}Z`;
}

export function ScratchPad({ open, onClose }: { open: boolean; onClose(): void }) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const live = useRef<{ id: number; pts: Point[]; t: number; v: number; size: number } | null>(
    null
  );
  const path = useRef<SVGPathElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const local = (e: PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.target !== area.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = local(e);
    live.current = { id: e.pointerId, pts: [[x, y, 2.6]], t: e.timeStamp, v: 0, size: 2.6 };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const s = live.current;
    if (!s || s.id !== e.pointerId) return;
    const [x, y] = local(e);
    const [px, py] = s.pts[s.pts.length - 1];
    const dist = Math.hypot(x - px, y - py);
    if (dist < 0.75) return;
    const speed = dist / Math.max(e.timeStamp - s.t, 1);
    s.v = s.v * 0.3 + speed * 0.7;
    s.t = e.timeStamp;
    s.size += (Math.max(3.2 / (s.v + 1), 1.1) - s.size) * 0.35;
    s.pts.push([x, y, s.size]);
    path.current?.setAttribute("d", outline(s.pts));
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const s = live.current;
    if (!s || s.id !== e.pointerId) return;
    live.current = null;
    path.current?.setAttribute("d", "");
    setStrokes((all) => [...all, s.pts]);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Scratch pad" done="Done">
      <div
        ref={area}
        role="application"
        aria-label="Scratch pad, draw with a finger, a pen or the mouse"
        className="k-pad relative h-[52vh] min-h-[280px] w-full overflow-hidden rounded-card border border-line bg-raised/50 text-text"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          {strokes.map((s, i) => (
            <path key={i} d={outline(s)} fill="currentColor" />
          ))}
          <path ref={path} fill="currentColor" />
        </svg>
        {!strokes.length ? (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-dense text-muted">
            Work it out here. Nothing is saved.
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-4 pt-3">
        <TextLink onClick={() => setStrokes((s) => s.slice(0, -1))}>Undo</TextLink>
        <TextLink onClick={() => setStrokes([])}>Clear</TextLink>
      </div>
    </Sheet>
  );
}

export function CalculatorPanel({ open, onClose }: { open: boolean; onClose(): void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Calculator">
      <PlanLocked bundle="calculator">
        <Panel className="grid gap-3 p-4">
          <p className="text-body">
            The calculator here is the real one in the app: the graphing calculator the digital SAT
            uses, open beside every math question.
          </p>
          <p className="text-dense text-muted">
            This prototype does not load it. Opening it is recorded with the answer.
          </p>
        </Panel>
      </PlanLocked>
    </Sheet>
  );
}

export function HelpSheet({
  open,
  onClose,
  skill,
  section,
  tutor,
}: {
  open: boolean;
  onClose(): void;
  skill: string;
  section: string;
  tutor: string | null;
}) {
  const [flagged, setFlagged] = useState(false);
  const how =
    section === "Math"
      ? "Write down what the question gives you and what it asks for, then pick the one step that connects them."
      : "Read the question first, then go back to the passage for the one thing it asks about.";
  return (
    <Sheet open={open} onClose={onClose} title="Help">
      <div className="grid gap-4">
        <p className="text-dense text-muted">{skill}</p>
        <p className="text-body">{how}</p>
        <p className="text-dense text-muted">
          Opening help is saved with your answer, so a right answer after a hint counts differently.
        </p>
        {tutor ? (
          flagged ? (
            <p className="text-body text-positive">
              Flagged for {tutor}. It comes up in your next session.
            </p>
          ) : (
            <GlassButton onClick={() => setFlagged(true)}>
              Flag this question for {tutor}
            </GlassButton>
          )
        ) : null}
      </div>
    </Sheet>
  );
}

/** The tool bar: glass icon buttons over the panel, each with a pressed state. */
export function ToolBar({
  tools,
  className,
}: {
  tools: {
    id: string;
    label: string;
    icon: ReactNode;
    on?: boolean;
    onPress(): void;
    hidden?: boolean;
  }[];
  className?: string;
}) {
  const { has } = usePlan();
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="toolbar"
      aria-label="Question tools"
    >
      {tools
        .filter((t) => !t.hidden)
        .map((t) => (
          <GlassButton
            key={t.id}
            size="icon"
            aria-label={t.label}
            aria-pressed={t.on || undefined}
            onClick={t.onPress}
            icon={t.icon}
            className={cn(
              t.on && "text-accent",
              t.id === "calculator" && !has("calculator") && "text-muted"
            )}
          >
            {t.label}
          </GlassButton>
        ))}
    </div>
  );
}
