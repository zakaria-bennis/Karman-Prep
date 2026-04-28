"use client";

// ============================================================
// ConstellationMap — full-screen "brain constellation" star map.
//
//   • Left lobe = Reading & Writing (pink)
//   • Right lobe = Math (cyan)
//   • Active subject's nodes are fully lit + clickable
//   • The other subject's nodes remain visible but dimmed
//   • Background is a deep-space vertical gradient (lighter near
//     the Troposphere at the bottom, near-black at the Stratosphere top)
//   • Nodes are real stars: bright core + four diffraction rays + halo
//   • Prereq lines are the brain's "convolutions"
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
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
import ConstellationSidebar from "./ConstellationSidebar";
import type { QuizAttempt, ConfidenceBand } from "@/types/quiz";

// ── SVG viewport ────────────────────────────────────────────
const W = 1000;
const H = 640;

// ── Deterministic pseudo-random ─────────────────────────────
function pr(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// ── Background star field (larger + varied size/brightness) ──
const BG_STARS = Array.from({ length: 320 }, (_, i) => ({
  x: pr(i * 2.111) * W,
  y: pr(i * 2.111 + 1.3) * H,
  r: 0.35 + pr(i * 3.77) * 1.3,
  o: 0.18 + pr(i * 4.29) * 0.55,
  tw: pr(i * 5.71),   // twinkle phase offset
}));

// ── Nebula blobs — two very soft colored gradients as atmosphere ──
const NEBULAE = [
  { cx: 0.22 * W, cy: 0.62 * H, rx: 260, ry: 180, fill: "#ec489920" },
  { cx: 0.78 * W, cy: 0.62 * H, rx: 260, ry: 180, fill: "#38bdf820" },
];

// ── Node sizing by difficulty ───────────────────────────────
const DIFF_R: Record<1 | 2 | 3, number> = { 1: 3.5, 2: 4.5, 3: 5.5 };

// ── Status-driven visual config ─────────────────────────────
interface StarConfig {
  coreOpacity: number;
  haloOpacity: number;
  rayOpacity: number;
  rayLen: number;      // multiplier on base radius
  glow: number;        // halo radius multiplier
  pulse: boolean;
}

function starConfig(status: NodeStatus): StarConfig {
  switch (status) {
    case "locked":
      return { coreOpacity: 0.25, haloOpacity: 0.0,  rayOpacity: 0.0,  rayLen: 0,   glow: 0, pulse: false };
    case "available":
      return { coreOpacity: 0.95, haloOpacity: 0.40, rayOpacity: 0.70, rayLen: 2.4, glow: 3.0, pulse: true };
    case "in_progress":
      return { coreOpacity: 1.0,  haloOpacity: 0.55, rayOpacity: 0.90, rayLen: 2.8, glow: 3.6, pulse: false };
    case "partially_complete":
      return { coreOpacity: 1.0,  haloOpacity: 0.70, rayOpacity: 1.0,  rayLen: 3.0, glow: 4.0, pulse: false };
    case "mastered":
      return { coreOpacity: 1.0,  haloOpacity: 0.90, rayOpacity: 1.0,  rayLen: 3.6, glow: 4.6, pulse: false };
  }
}

// ── Edge brightness ──────────────────────────────────────────
function edgeOpacity(from: NodeStatus, to: NodeStatus, active: boolean): number {
  if (!active) return 0.06;                                    // inactive lobe — very faint
  if (from === "mastered" && to === "mastered")   return 0.65;
  if (from === "mastered")                        return 0.45;
  if (from === "in_progress" || to === "in_progress") return 0.28;
  if (from === "available" || to === "available") return 0.22;
  return 0.09;
}

// ── Types ────────────────────────────────────────────────────
export interface MappedNode extends CurriculumNode {
  status: NodeStatus;
}

interface Props {
  /** Which subject is currently focused — its nodes are fully lit. */
  activeSubject: Subject;
  /** All 50 Reading & Writing nodes with their status. */
  readingNodes: MappedNode[];
  /** All 50 Math nodes with their status. */
  mathNodes: MappedNode[];
}

// ── Public wrapper — provides QuizContext ───────────────────
export default function ConstellationMap(props: Props) {
  return (
    <QuizProvider>
      <ConstellationMapInner {...props} />
    </QuizProvider>
  );
}

// ── Inner component ──────────────────────────────────────────
function ConstellationMapInner({ activeSubject, readingNodes, mathNodes }: Props) {
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
  const quiz = useQuiz();

  // Mouse parallax — subtle "looking around in the sky" feel
  const parallaxMx = useMotionValue(0);
  const parallaxMy = useMotionValue(0);
  const parallaxTransformX = useTransform(parallaxMx, [-1, 1], [-12, 12]);
  const parallaxTransformY = useTransform(parallaxMy, [-1, 1], [-8, 8]);

  const allNodes: MappedNode[] = [...readingNodes, ...mathNodes];
  const activeNodes = activeSubject === "reading" ? readingNodes : mathNodes;
  const otherNodes  = activeSubject === "reading" ? mathNodes   : readingNodes;
  const otherSubject: Subject = activeSubject === "reading" ? "math" : "reading";

  const readingEdges = getEdges("reading");
  const mathEdges    = getEdges("math");

  const allNodeMap = new Map(allNodes.map((n) => [n.id, n]));
  const statusMap  = new Map(activeNodes.map((n) => [n.id, n.status]));

  const activeHex = SUBJECT_COLORS[activeSubject].hex;
  const otherHex  = SUBJECT_COLORS[otherSubject].hex;

  // SVG coords ↔ screen coords (respects preserveAspectRatio="xMidYMid meet")
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
      // Only allow interacting with the active subject's nodes.
      if (node.subject !== activeSubject) return;
      if (node.status === "locked") return;
      playSound("nodeClick");
      setCardOrigin(toScreen(node.x, node.y));
      setSelectedNode(node);
      setNodeBundle(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSubject]
  );

  // Load quiz history / watch% when a node is selected
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
    const next = recommendedNextNode(activeSubject, nodeId, statusMap);
    closeAll();
    if (next) {
      setTimeout(() => {
        setSelectedNode({ ...next, status: statusMap.get(next.id) ?? "available" });
        setCardOrigin(toScreen(next.x, next.y));
      }, 200);
    }
  }

  const hoveredNode = hovered ? allNodeMap.get(hovered) : null;
  const isOverlayOpen = lessonOpen || quizOpen;
  const mappedSelected = selectedNode
    ? { ...selectedNode, status: statusMap.get(selectedNode.id) ?? selectedNode.status }
    : null;

  return (
    <motion.div
      ref={mapRef}
      className="relative w-full"
      style={{ height: "100vh" }}
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        parallaxMx.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
        parallaxMy.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
      }}
    >
      <div
        className="w-full h-full transition-opacity duration-300"
        style={{
          opacity: isOverlayOpen ? 0.4 : 1,
          pointerEvents: isOverlayOpen ? "none" : "auto",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid slice"
          className="block"
          aria-label="Karman constellation map"
        >
          <defs>
            {/* Deep-space vertical gradient: lighter near Troposphere (bottom) */}
            <linearGradient id="space-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#02040a" />
              <stop offset="40%" stopColor="#050913" />
              <stop offset="75%" stopColor="#0a1426" />
              <stop offset="100%" stopColor="#142244" />
            </linearGradient>

            {/* Soft nebulae (extremely faint color washes) */}
            <radialGradient id="nebula-pink" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#ec4899" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="nebula-cyan" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#38bdf8" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>

            {/* Star halos per subject */}
            <radialGradient id="halo-reading" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#ec4899" stopOpacity="0.8" />
              <stop offset="40%"  stopColor="#ec4899" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="halo-math" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="40%"  stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>

            {/* Glow filter */}
            <filter id="star-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Space background ──────────────────────────────── */}
          <rect width={W} height={H} fill="url(#space-gradient)" />

          {/* Nebulae — one behind each lobe */}
          <ellipse cx={NEBULAE[0].cx} cy={NEBULAE[0].cy} rx={NEBULAE[0].rx} ry={NEBULAE[0].ry} fill="url(#nebula-pink)" />
          <ellipse cx={NEBULAE[1].cx} cy={NEBULAE[1].cy} rx={NEBULAE[1].rx} ry={NEBULAE[1].ry} fill="url(#nebula-cyan)" />

          {/* Background star field — parallaxes subtly with the cursor */}
          <motion.g style={{ x: parallaxTransformX, y: parallaxTransformY }}>
            {BG_STARS.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o} />
            ))}
          </motion.g>

          {/* ── Atmospheric tier labels on the right edge ──── */}
          {([
            { label: "TROPOSPHERE",   y: H * 0.88 },
            { label: "MESOSPHERE",    y: H * 0.54 },
            { label: "STRATOSPHERE",  y: H * 0.13 },
          ]).map(({ label, y }) => (
            <text
              key={label}
              x={W - 18}
              y={y}
              textAnchor="end"
              fill="#ffffff"
              fillOpacity={0.14}
              fontSize={10}
              fontWeight={700}
              letterSpacing={2.5}
              fontFamily="inherit"
            >
              {label}
            </text>
          ))}

          {/* Faint horizontal atmospheric bands */}
          {[0.33, 0.66].map((fy, i) => (
            <line
              key={i}
              x1={40}
              x2={W - 40}
              y1={H * fy}
              y2={H * fy}
              stroke="#ffffff"
              strokeOpacity={0.04}
              strokeDasharray="2 8"
            />
          ))}

          {/* ── Edges — ONLY active subject (inactive is hidden) ── */}
          <g>
            {(activeSubject === "reading" ? readingEdges : mathEdges).map(({ from, to }, i) => {
              const fn = allNodeMap.get(from);
              const tn = allNodeMap.get(to);
              if (!fn || !tn) return null;
              if (fn.subject !== activeSubject || tn.subject !== activeSubject) return null;
              const opacity = edgeOpacity(fn.status, tn.status, true);
              const highlight = hovered === from || hovered === to;
              return (
                <line
                  key={`e-${i}`}
                  x1={fn.x * W} y1={fn.y * H}
                  x2={tn.x * W} y2={tn.y * H}
                  stroke={activeHex}
                  strokeWidth={highlight ? 1.4 : 0.85}
                  strokeOpacity={highlight ? 0.85 : opacity}
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          {/* ── Nodes (stars) — ONLY active subject ──────────── */}
          <g>
            {allNodes.filter((n) => n.subject === activeSubject).map((node) => {
              const cx = node.x * W;
              const cy = node.y * H;
              const active = node.subject === activeSubject;
              const subjectHex = active ? activeHex : otherHex;
              const haloId = node.subject === "reading" ? "halo-reading" : "halo-math";
              const r = DIFF_R[node.difficulty];
              const cfg = starConfig(node.status);
              const isHovered = hovered === node.id;
              const isLocked = node.status === "locked";

              // Non-active lobe gets muted
              const dimFactor = active ? 1 : 0.25;
              const coreO = cfg.coreOpacity * dimFactor;
              const haloO = cfg.haloOpacity * dimFactor;
              const rayO  = cfg.rayOpacity  * dimFactor;

              return (
                <g
                  key={node.id}
                  transform={`translate(${cx}, ${cy})`}
                  style={{ cursor: !active || isLocked ? "default" : "pointer" }}
                  onClick={() => handleNodeClick(node)}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  role={active && !isLocked ? "button" : undefined}
                  aria-label={`${node.topic} — ${node.status}`}
                  tabIndex={active && !isLocked ? 0 : -1}
                  onKeyDown={(e) => e.key === "Enter" && handleNodeClick(node)}
                >
                  {/* Outer halo */}
                  {cfg.haloOpacity > 0 && (
                    <circle
                      r={r * cfg.glow}
                      fill={`url(#${haloId})`}
                      opacity={isHovered ? Math.min(1, haloO * 1.5) : haloO}
                      className={cfg.pulse && active ? "animate-pulse" : undefined}
                    />
                  )}

                  {/* Hover ring (only on active lobe) */}
                  {isHovered && active && !isLocked && (
                    <circle
                      r={r * cfg.glow + 4}
                      fill="none"
                      stroke={subjectHex}
                      strokeWidth={0.8}
                      strokeOpacity={0.55}
                      strokeDasharray="2 3"
                    />
                  )}

                  {/* Diffraction rays (the cross + diagonals) */}
                  {cfg.rayLen > 0 && (
                    <g opacity={rayO}>
                      {/* Vertical + horizontal rays */}
                      <line x1={0} y1={-r * cfg.rayLen} x2={0} y2={r * cfg.rayLen}
                        stroke={subjectHex} strokeWidth={0.7} strokeLinecap="round" />
                      <line x1={-r * cfg.rayLen} y1={0} x2={r * cfg.rayLen} y2={0}
                        stroke={subjectHex} strokeWidth={0.7} strokeLinecap="round" />
                      {/* Shorter diagonals — white for sparkle */}
                      <line x1={-r * cfg.rayLen * 0.55} y1={-r * cfg.rayLen * 0.55}
                            x2={ r * cfg.rayLen * 0.55} y2={ r * cfg.rayLen * 0.55}
                            stroke="#ffffff" strokeWidth={0.35} strokeOpacity={0.55} strokeLinecap="round" />
                      <line x1={-r * cfg.rayLen * 0.55} y1={ r * cfg.rayLen * 0.55}
                            x2={ r * cfg.rayLen * 0.55} y2={-r * cfg.rayLen * 0.55}
                            stroke="#ffffff" strokeWidth={0.35} strokeOpacity={0.55} strokeLinecap="round" />
                    </g>
                  )}

                  {/* Bright white core */}
                  <circle
                    r={r * 0.55}
                    fill="#ffffff"
                    opacity={coreO}
                    filter={node.status === "mastered" && active ? "url(#star-glow)" : undefined}
                  />

                  {/* Tiny colored inner dot on mastered stars */}
                  {node.status === "mastered" && active && (
                    <circle r={r * 0.25} fill={subjectHex} opacity={0.9} />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* ── Left-side "Star-Trek" command sidebar ──────────── */}
      {!isOverlayOpen && (
        <ConstellationSidebar
          subject={activeSubject}
          nodes={activeNodes}
          selectedNodeId={selectedNode?.id ?? null}
          onNodeClick={(n) => handleNodeClick(n)}
        />
      )}

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
            onClose={() => setQuizOpen(false)}
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
                hoveredNode.status === "locked" ? "#475569" :
                hoveredNode.subject === "reading" ? "#EC4899" : "#38BDF8",
            }}
          />
          <div className="min-w-0">
            <p className="font-semibold truncate">
              {hoveredNode.topic}{" "}
              {hoveredNode.subject !== activeSubject && (
                <span className="text-slate-500 text-xs">({hoveredNode.subject === "math" ? "Math" : "R&W"} — not active)</span>
              )}
            </p>
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
                {hoveredNode.status === "in_progress" ? "in progress" : hoveredNode.status.replace(/_/g, " ")}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ── Legend ───────────────────────────────────────────── */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 pointer-events-none z-10 bg-black/35 border border-white/10 backdrop-blur-md rounded-xl px-3 py-2">
        {(
          [
            { status: "mastered" as NodeStatus,           label: "Mastered",       color: activeHex },
            { status: "partially_complete" as NodeStatus, label: "Partial pass",   color: activeHex + "cc" },
            { status: "in_progress" as NodeStatus,        label: "In progress",    color: activeHex + "99" },
            { status: "available" as NodeStatus,          label: "Available",      color: activeHex + "66" },
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

    </motion.div>
  );
}
