"use client";

// ============================================================
// ConstellationMap — SVG star-map renderer for the Learn portal
// Shows all 50 nodes as stars with status-based styling.
// Lines connect prerequisite pairs.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  type CurriculumNode,
  type NodeStatus,
  type Subject,
  TIER_LABELS,
  SUBJECT_COLORS,
  getEdges,
  recommendedNextNode,
} from "@/data/curriculum";
import { playSound } from "@/lib/sounds";
import { QuizProvider, useQuiz } from "@/contexts/QuizContext";
import { actionFetchNodeBundle } from "@/app/learn/quiz-actions";
import NodeCard from "./NodeCard";
import LessonOverlay from "./LessonOverlay";
import QuizEngine from "./QuizEngine";
import type { QuizAttempt, ConfidenceBand } from "@/types/quiz";

// ── SVG viewport ────────────────────────────────────────────
const W = 1000;
const H = 640;

// ── Background star field (deterministic via sin-based pseudo-random) ──
function pr(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}
const BG_STARS = Array.from({ length: 130 }, (_, i) => ({
  x: pr(i * 2.1) * W,
  y: pr(i * 2.1 + 1.3) * H,
  r: 0.4 + pr(i * 3.7) * 0.9,
  o: 0.12 + pr(i * 4.3) * 0.35,
}));

// ── Node style helpers ───────────────────────────────────────
const DIFF_RADIUS: Record<1 | 2 | 3, number> = { 1: 7, 2: 9, 3: 11 };

interface NodeStyle {
  fill: string;
  stroke: string;
  opacity: number;
  glowR: number;
  glowOpacity: number;
  pulseClass: string;
}

function nodeStyle(status: NodeStatus, subjectColor: string): NodeStyle {
  switch (status) {
    case "locked":
      return {
        fill: "#334155",
        stroke: "#475569",
        opacity: 0.5,
        glowR: 0,
        glowOpacity: 0,
        pulseClass: "",
      };
    case "available":
      return {
        fill: subjectColor + "55",
        stroke: subjectColor,
        opacity: 0.9,
        glowR: 8,
        glowOpacity: 0.35,
        pulseClass: "animate-pulse",
      };
    case "in_progress":
      return {
        fill: subjectColor + "88",
        stroke: subjectColor,
        opacity: 1,
        glowR: 14,
        glowOpacity: 0.45,
        pulseClass: "",
      };
    case "partially_complete":
      return {
        fill: subjectColor + "cc",
        stroke: subjectColor,
        opacity: 1,
        glowR: 16,
        glowOpacity: 0.50,
        pulseClass: "",
      };
    case "mastered":
      return {
        fill: subjectColor,
        stroke: "#ffffff55",
        opacity: 1,
        glowR: 20,
        glowOpacity: 0.60,
        pulseClass: "",
      };
  }
}

// ── Edge style helpers ───────────────────────────────────────
function edgeOpacity(fromStatus: NodeStatus, toStatus: NodeStatus): number {
  if (fromStatus === "mastered" && toStatus === "mastered") return 0.55;
  if (fromStatus === "mastered" && toStatus !== "locked") return 0.45;
  if (fromStatus === "mastered") return 0.25;
  return 0.08;
}

// ── Types ────────────────────────────────────────────────────
export interface MappedNode extends CurriculumNode {
  status: NodeStatus;
}

interface Props {
  subject: Subject;
  nodes: MappedNode[];
}

// ── Public wrapper — provides the QuizContext ────────────────
export default function ConstellationMap(props: Props) {
  return (
    <QuizProvider>
      <ConstellationMapInner {...props} />
    </QuizProvider>
  );
}

// ── Component ────────────────────────────────────────────────
function ConstellationMapInner({ subject, nodes }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<MappedNode | null>(null);
  const [cardOrigin, setCardOrigin] = useState<{ x: number; y: number } | null>(null);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [nodeBundle, setNodeBundle] = useState<{
    attempts: QuizAttempt[];
    watch_percentage: number | null;
    best_quiz_score: number | null;
    confidence_band: ConfidenceBand | null;
  } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const quiz = useQuiz();

  const subjectHex = SUBJECT_COLORS[subject].hex;
  const edges = getEdges(subject);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const statusMap = new Map(nodes.map((n) => [n.id, n.status]));

  // Convert normalized SVG coords → screen coords (respects viewBox letterboxing)
  function toScreen(nx: number, ny: number): { x: number; y: number } {
    if (!mapRef.current) return { x: 0, y: 0 };
    const rect = mapRef.current.getBoundingClientRect();
    const svgAspect = W / H;
    const boxAspect = rect.width / rect.height;
    let renderW = rect.width, renderH = rect.height, ox = 0, oy = 0;
    if (boxAspect > svgAspect) {
      renderW = rect.height * svgAspect;
      ox = (rect.width - renderW) / 2;
    } else {
      renderH = rect.width / svgAspect;
      oy = (rect.height - renderH) / 2;
    }
    return {
      x: rect.left + ox + nx * renderW,
      y: rect.top  + oy + ny * renderH,
    };
  }

  const handleNodeClick = useCallback(
    (node: MappedNode) => {
      if (node.status === "locked") return;
      playSound("nodeClick");
      setCardOrigin(toScreen(node.x, node.y));
      setSelectedNode(node);
      setNodeBundle(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Load quiz history / watch percentage when a node is selected
  useEffect(() => {
    if (!selectedNode) return;
    let cancelled = false;
    actionFetchNodeBundle(selectedNode.id)
      .then((data) => {
        if (cancelled) return;
        setNodeBundle({
          attempts: data.attempts,
          watch_percentage: data.watch_percentage,
          best_quiz_score: data.best_quiz_score,
          confidence_band: data.confidence_band,
        });
      })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [selectedNode]);

  function closeAll() {
    setQuizOpen(false);
    setLessonOpen(false);
    setSelectedNode(null);
    setCardOrigin(null);
    quiz.reset();
  }

  function goToNextNode(nodeId: string) {
    const next = recommendedNextNode(subject, nodeId, statusMap);
    closeAll();
    if (next) {
      setTimeout(() => {
        setSelectedNode({ ...next, status: statusMap.get(next.id) ?? "available" });
        setCardOrigin(toScreen(next.x, next.y));
      }, 200);
    }
  }

  const hoveredNode = hovered ? nodeMap.get(hovered) : null;
  const isOverlayOpen = lessonOpen || quizOpen;
  const mappedSelected = selectedNode
    ? { ...selectedNode, status: statusMap.get(selectedNode.id) ?? selectedNode.status }
    : null;

  return (
    <div ref={mapRef} className="relative w-full" style={{ height: "calc(100vh - 56px)" }}>
      {/* SVG map — dims when overlay/quiz is open */}
      <div
        className="w-full h-full transition-opacity duration-300"
        style={{
          opacity: isOverlayOpen ? 0.4 : 1,
          pointerEvents: isOverlayOpen ? "none" : "auto",
        }}
      >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="block"
        aria-label={`${subject === "reading" ? "Reading & Writing" : "Math"} constellation map`}
      >
        <defs>
          {/* Glow filter — soft */}
          <filter id="glow-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Glow filter — strong */}
          <filter id="glow-strong" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Radial gradient for node halos */}
          <radialGradient id="halo-rw" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FB7185" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FB7185" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="halo-math" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── Background ────────────────────────────────────── */}
        <rect width={W} height={H} fill="#060b16" />

        {/* Background star field */}
        {BG_STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o} />
        ))}

        {/* ── Tier zone labels ──────────────────────────────── */}
        {([
          { tier: 1, label: "Foundations", y: H * 0.88 },
          { tier: 2, label: "Core",         y: H * 0.55 },
          { tier: 3, label: "Advanced",     y: H * 0.12 },
        ] as { tier: number; label: string; y: number }[]).map(({ tier, label, y }) => (
          <text
            key={tier}
            x={W - 16}
            y={y}
            textAnchor="end"
            fill={subjectHex}
            fillOpacity={0.2}
            fontSize={11}
            fontWeight={700}
            letterSpacing={2}
            fontFamily="inherit"
          >
            TIER {tier} · {label.toUpperCase()}
          </text>
        ))}

        {/* ── Edges (prerequisite connections) ─────────────── */}
        <g>
          {edges.map(({ from, to }, i) => {
            const fNode = nodeMap.get(from);
            const tNode = nodeMap.get(to);
            if (!fNode || !tNode) return null;
            const opacity = edgeOpacity(fNode.status, tNode.status);
            const isHighlighted =
              hovered === from || hovered === to;
            return (
              <line
                key={i}
                x1={fNode.x * W}
                y1={fNode.y * H}
                x2={tNode.x * W}
                y2={tNode.y * H}
                stroke={subjectHex}
                strokeWidth={isHighlighted ? 1.5 : 0.8}
                strokeOpacity={isHighlighted ? 0.8 : opacity}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* ── Nodes ─────────────────────────────────────────── */}
        <g>
          {nodes.map((node) => {
            const cx = node.x * W;
            const cy = node.y * H;
            const r  = DIFF_RADIUS[node.difficulty];
            const style = nodeStyle(node.status, subjectHex);
            const isHovered = hovered === node.id;
            const isMastered = node.status === "mastered";
            const isLocked   = node.status === "locked";
            const haloGradId = subject === "reading" ? "halo-rw" : "halo-math";

            return (
              <g
                key={node.id}
                transform={`translate(${cx}, ${cy})`}
                style={{ cursor: isLocked ? "default" : "pointer" }}
                onClick={() => handleNodeClick(node)}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                role="button"
                aria-label={`${node.topic} — ${node.status}`}
                tabIndex={isLocked ? -1 : 0}
                onKeyDown={(e) => e.key === "Enter" && handleNodeClick(node)}
              >
                {/* Outer glow halo */}
                {style.glowR > 0 && (
                  <circle
                    r={r + style.glowR}
                    fill={`url(#${haloGradId})`}
                    opacity={isHovered ? style.glowOpacity * 1.6 : style.glowOpacity}
                    className={style.pulseClass}
                  />
                )}

                {/* Hover ring */}
                {isHovered && !isLocked && (
                  <circle
                    r={r + 5}
                    fill="none"
                    stroke={subjectHex}
                    strokeWidth={1}
                    strokeOpacity={0.6}
                    strokeDasharray="3 3"
                  />
                )}

                {/* Main node circle */}
                <circle
                  r={isHovered && !isLocked ? r + 2 : r}
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth={1.2}
                  opacity={style.opacity}
                  filter={isMastered ? "url(#glow-soft)" : isHovered ? "url(#glow-soft)" : undefined}
                  style={{ transition: "r 0.15s ease" }}
                />

                {/* Mastered checkmark / inner dot */}
                {isMastered && (
                  <circle r={2.5} fill="#ffffff" opacity={0.9} />
                )}

                {/* Available indicator dot */}
                {node.status === "available" && (
                  <circle r={2} fill={subjectHex} opacity={1} />
                )}
              </g>
            );
          })}
        </g>
      </svg>
      </div>

      {/* ── Node card popup ──────────────────────────────────── */}
      <AnimatePresence>
        {mappedSelected && cardOrigin && !lessonOpen && !quizOpen && (
          <NodeCard
            node={mappedSelected}
            origin={cardOrigin}
            onWatchLesson={() => setLessonOpen(true)}
            onStartQuiz={() => setQuizOpen(true)}
            onClose={() => { setSelectedNode(null); setCardOrigin(null); }}
          />
        )}
      </AnimatePresence>

      {/* ── Lesson overlay ───────────────────────────────────── */}
      <AnimatePresence>
        {mappedSelected && lessonOpen && !quizOpen && nodeBundle && (
          <LessonOverlay
            node={mappedSelected}
            attempts={nodeBundle.attempts}
            watchPercentage={nodeBundle.watch_percentage}
            bestScore={nodeBundle.best_quiz_score}
            band={nodeBundle.confidence_band}
            onClose={() => setLessonOpen(false)}
            onStartQuiz={() => setQuizOpen(true)}
            onGoToNext={() => goToNextNode(mappedSelected.id)}
          />
        )}
      </AnimatePresence>

      {/* ── Quiz engine ──────────────────────────────────────── */}
      <AnimatePresence>
        {mappedSelected && quizOpen && (
          <QuizEngine
            node={mappedSelected}
            videoUrl={mappedSelected.video_url ?? null}
            onClose={() => { setQuizOpen(false); }}
            onGoToNext={() => goToNextNode(mappedSelected.id)}
          />
        )}
      </AnimatePresence>

      {/* ── Tooltip overlay ──────────────────────────────────── */}
      {hoveredNode && !selectedNode && (
        <div
          className={cn(
            "pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-6",
            "flex items-center gap-3 px-4 py-2.5 rounded-xl",
            "bg-slate-900/95 border border-white/10 backdrop-blur-sm shadow-2xl",
            "text-sm text-white max-w-xs z-30"
          )}
        >
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              backgroundColor:
                hoveredNode.status === "locked" ? "#475569" : subjectHex,
            }}
          />
          <div className="min-w-0">
            <p className="font-semibold truncate">{hoveredNode.topic}</p>
            <p className="text-xs text-slate-400 capitalize">
              {TIER_LABELS[hoveredNode.tier]} · Difficulty {hoveredNode.difficulty} ·{" "}
              <span
                className={cn(
                  hoveredNode.status === "locked"             ? "text-slate-500" :
                  hoveredNode.status === "mastered"           ? "text-emerald-400" :
                  hoveredNode.status === "partially_complete" ? "text-teal-400" :
                  hoveredNode.status === "available"          ? "text-amber-400" :
                  "text-blue-400"
                )}
              >
                {hoveredNode.status === "in_progress" ? "in progress" : hoveredNode.status}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ── Legend ───────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5 pointer-events-none">
        {(
          [
            { status: "mastered" as NodeStatus,           label: "Mastered",       color: subjectHex },
            { status: "partially_complete" as NodeStatus, label: "Partial pass",   color: subjectHex + "cc" },
            { status: "in_progress" as NodeStatus,        label: "In progress",    color: subjectHex + "99" },
            { status: "available" as NodeStatus,          label: "Available",      color: subjectHex + "66" },
            { status: "locked" as NodeStatus,             label: "Locked",         color: "#475569" },
          ]
        ).map(({ status, label, color }) => (
          <div key={status} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full border border-white/10"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
